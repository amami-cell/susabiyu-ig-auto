// kobito 協力プレイの中継（部屋ハブ）＝Cloudflare Worker。
//
// なぜ要るのか:
//   携帯(ブラウザ)は WebSocketの「待ち受け(サーバ)」を作れないので、携帯2台“だけ”
//   では直接つながれない。そこで両方の携帯がこの中継へ client 接続し、中継が
//   相手へ橋渡しする。中継へは外向きの接続なので、モバイル回線(CGNAT)でもつながる。
//
// つなぎ先: wss://<このWorker>/r?room=<あいことば>&role=host|join
//   role=host … その部屋の主。Godot上の peer id=1（＝進行の正）。
//   role=join … 参加者。id=2..MAX。
//
// 部屋ごとに Durable Object を1つ立て、その中で全員のWebSocketを保持して配る。
//
// ワイヤ仕様（Godot側 autoload/relay_peer.gd・relay_test_hub.gd と必ず一致させる）:
//   制御(テキストJSON、中継→ピア):
//     {"t":"welcome","id":N,"peers":[...]}  自分のid＋今いる相手一覧
//     {"t":"join","id":N} / {"t":"leave","id":N}
//     {"t":"error","code":"taken"|"full"}
//   ゲーム(バイナリ、双方向): [int32 peer(LE)][u8 channel][u8 mode] + 本体
//     送信時 peer=宛先(0=全員 / 正=個別 / 負=そのidを除く全員)。
//     受信時 peer=送信元（中継が書き換える）。
//
// 無料枠のまま運用する方針（このリポジトリの原則）。Durable Object は SQLite 版
// （new_sqlite_classes）＝Workers 無料プランで使える。ストレージは使わず、
// 生きている接続をメモリに持つだけなので費用はかからない。

const MAX_PLAYERS = 4;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("kobito relay ok", { status: 200 });
    }
    if (url.pathname !== "/r") {
      return new Response("not found", { status: 404 });
    }
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const room = (url.searchParams.get("room") || "").toUpperCase().slice(0, 16);
    if (!room) return new Response("no room", { status: 400 });
    const id = env.ROOM.idFromName(room);
    const stub = env.ROOM.get(id);
    return stub.fetch(request);
  },
};

export class Room {
  constructor(state, env) {
    this.state = state;
    this.peers = new Map(); // id -> WebSocket
    this.hostTaken = false;
  }

  nextClientId() {
    for (let c = 2; c <= MAX_PLAYERS; c++) {
      if (!this.peers.has(c)) return c;
    }
    return 0;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const role = url.searchParams.get("role") === "host" ? "host" : "join";

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    let newId = 0;
    if (role === "host") {
      if (this.hostTaken) {
        server.send(JSON.stringify({ t: "error", code: "taken" }));
        server.close(4001, "host taken");
        return new Response(null, { status: 101, webSocket: client });
      }
      newId = 1;
      this.hostTaken = true;
    } else {
      newId = this.nextClientId();
      if (newId === 0) {
        server.send(JSON.stringify({ t: "error", code: "full" }));
        server.close(4002, "full");
        return new Response(null, { status: 101, webSocket: client });
      }
    }

    const existing = [...this.peers.keys()];
    this.peers.set(newId, server);
    server.send(JSON.stringify({ t: "welcome", id: newId, peers: existing }));
    for (const pid of existing) {
      try {
        this.peers.get(pid).send(JSON.stringify({ t: "join", id: newId }));
      } catch (e) {}
    }

    server.addEventListener("message", (ev) => {
      const data = ev.data;
      // 制御(テキスト)はサーバ発のみ。クライアント発テキストは無視。
      if (typeof data === "string") return;
      const buf = new Uint8Array(data);
      if (buf.length < 6) return;
      const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      const target = dv.getInt32(0, true);
      // 宛先を送信元(newId)に書き換えてから配る。
      dv.setInt32(0, newId, true);
      for (const [pid, ws] of this.peers) {
        if (pid === newId) continue;
        if (target > 0 && pid !== target) continue;
        if (target < 0 && pid === -target) continue;
        try {
          ws.send(buf);
        } catch (e) {}
      }
    });

    const bye = () => {
      if (!this.peers.has(newId)) return;
      this.peers.delete(newId);
      if (newId === 1) this.hostTaken = false;
      for (const [, ws] of this.peers) {
        try {
          ws.send(JSON.stringify({ t: "leave", id: newId }));
        } catch (e) {}
      }
    };
    server.addEventListener("close", bye);
    server.addEventListener("error", bye);

    return new Response(null, { status: 101, webSocket: client });
  }
}
