class_name RelayMultiplayerPeer
extends MultiplayerPeerExtension
## 中継(Cloudflare Worker)経由の協力プレイ用ピア。
##
## なぜ要るのか:
##   ブラウザ(iPhoneのSafari)は WebSocketの「待ち受け(サーバ)」を作れない。
##   だから携帯2台“だけ”では、どちらもホストになれず、直接はつながれない。
##   そこで「両方の携帯が“中継”へ client として出ていって、中継が橋渡しする」。
##   中継へは外向きの接続なので、モバイル回線(CGNAT)でも・どの回線同士でもつながる。
##
## 役割(role):
##   "host" … 部屋の主。Godot上の peer id は必ず 1（＝サーバ＝進行の正）。
##   "join" … 参加者。id は 2..MAX。
##
## つなぎ先: wss://<中継>/r?room=<合言葉>&role=host|join
##
## 中継との約束(ワイヤ仕様):
##   制御(テキストJSON、中継→ピア):
##     {"t":"welcome","id":N,"peers":[...]}  自分のidが決まった＋今いる相手の一覧
##     {"t":"join","id":N}                    参加者が増えた
##     {"t":"leave","id":N}                   誰かが抜けた
##     {"t":"error","code":"taken"|"full"}    hostが既に居る / 満室
##   ゲーム(バイナリ、双方向): [int32 peer][uint8 channel][uint8 mode] + 本体
##     送信時 peer=宛先(0=全員/負=除外)。受信時 peer=送信元(中継が書き換える)。
##
## このゲームは「各自の小人の位置を全員へ配る」フルメッシュなので、中継は
## 誰から誰へでも運べる（スター限定ではない）。全員が全員を知る必要があるため、
## welcome では今いる相手を全部渡し、join/leave で増減を伝える。

const MAX_PLAYERS := 4

var _link: RefCounted = null       # poll/send_bin/pop_all/status/close を持つ橋
var _role := "host"
var _uid := 0
var _status := CONNECTION_DISCONNECTED
var _refusing := false
var _welcomed := false
var _target := 0                   # TARGET_PEER_BROADCAST
var _t_mode := TRANSFER_MODE_RELIABLE
var _t_channel := 0
var _in: Array = []                # 受信キュー: {from,channel,mode,data}


## Net から使う入口。実ソケット(WebSocket)版のピアを作る。
static func over_url(url: String, role: String) -> RelayMultiplayerPeer:
	var p := RelayMultiplayerPeer.new()
	p._role = role
	p._link = WsLink.new(url)
	p._begin()
	return p


## テスト用: 実ソケットを使わず、メモリ内の中継(InProcHub)へつなぐ。
static func over_link(link: RefCounted, role: String) -> RelayMultiplayerPeer:
	var p := RelayMultiplayerPeer.new()
	p._role = role
	p._link = link
	p._begin()
	return p


func _begin() -> void:
	# host は role で id=1 が確定するので、最初から「つながっている」扱いにして
	# サーバとして即動けるようにする（相手はまだ居ないので送信も起きない）。
	# 満室/二重hostなら中継が閉じてくる＝そのとき DISCONNECTED になる。
	if _role == "host":
		_uid = 1
		_status = CONNECTION_CONNECTED
	else:
		_status = CONNECTION_CONNECTING


# ----------------------------------------------------------- MultiplayerPeer 実装

func _poll() -> void:
	if _link == null:
		return
	_link.poll()
	var st: int = _link.status()
	if st == CONNECTION_DISCONNECTED:
		# 橋が切れた＝終了。CONNECTING中なら API が connection_failed を、
		# CONNECTED後なら server_disconnected を出す（＝状態を落とすだけでよい）。
		if _status != CONNECTION_DISCONNECTED:
			_status = CONNECTION_DISCONNECTED
		return
	for msg in _link.pop_all():
		if msg["is_text"]:
			_handle_control(msg["data"])
		else:
			_handle_packet(msg["data"])


func _handle_control(raw) -> void:
	var text := (raw as PackedByteArray).get_string_from_utf8() if raw is PackedByteArray else str(raw)
	var data = JSON.parse_string(text)
	if typeof(data) != TYPE_DICTIONARY:
		return
	match data.get("t", ""):
		"welcome":
			_uid = int(data.get("id", _uid))
			_status = CONNECTION_CONNECTED
			_welcomed = true
			var peers: Array = data.get("peers", [])
			for pid in peers:
				var ip := int(pid)
				if ip != _uid:
					peer_connected.emit(ip)
		"join":
			var jid := int(data.get("id", 0))
			if jid != 0 and jid != _uid:
				peer_connected.emit(jid)
		"leave":
			var lid := int(data.get("id", 0))
			if lid != 0:
				peer_disconnected.emit(lid)
		"error":
			# 部屋が使えない（二重host/満室）。橋を閉じて失敗にする。
			_status = CONNECTION_DISCONNECTED
			if _link != null:
				_link.close()


func _handle_packet(data: PackedByteArray) -> void:
	if data.size() < 6:
		return
	var sp := StreamPeerBuffer.new()
	sp.data_array = data
	sp.big_endian = false
	var from := sp.get_32()
	var channel := sp.get_u8()
	var mode := sp.get_u8()
	var payload := data.slice(6)
	_in.push_back({"from": from, "channel": channel, "mode": mode, "data": payload})


func _put_packet_script(buffer: PackedByteArray) -> Error:
	if _link == null or _status != CONNECTION_CONNECTED:
		return ERR_UNCONFIGURED
	var sp := StreamPeerBuffer.new()
	sp.big_endian = false
	sp.put_32(_target)                 # 宛先(0=全員 / 正=個別 / 負=そのidを除く全員)
	sp.put_u8(_t_channel)
	sp.put_u8(_t_mode)
	sp.put_data(buffer)
	_link.send_bin(sp.data_array)
	return OK


func _get_packet_script() -> PackedByteArray:
	if _in.is_empty():
		return PackedByteArray()
	var e = _in.pop_front()
	return e["data"]


func _get_available_packet_count() -> int:
	return _in.size()


func _get_max_packet_size() -> int:
	return 1 << 24


# 次に取り出す1個の素性（get_packet の前に呼ばれる）。
func _get_packet_peer() -> int:
	return int(_in[0]["from"]) if not _in.is_empty() else 1


func _get_packet_channel() -> int:
	return int(_in[0]["channel"]) if not _in.is_empty() else 0


func _get_packet_mode() -> int:
	return int(_in[0]["mode"]) if not _in.is_empty() else TRANSFER_MODE_RELIABLE


func _set_target_peer(peer: int) -> void:
	_target = peer


func _set_transfer_channel(channel: int) -> void:
	_t_channel = channel


func _get_transfer_channel() -> int:
	return _t_channel


func _set_transfer_mode(mode: TransferMode) -> void:
	_t_mode = mode


func _get_transfer_mode() -> TransferMode:
	return _t_mode as TransferMode


func _is_server() -> bool:
	return _uid == 1


func _get_unique_id() -> int:
	return _uid


func _get_connection_status() -> ConnectionStatus:
	return _status as ConnectionStatus


func _set_refuse_new_connections(enable: bool) -> void:
	_refusing = enable


func _is_refusing_new_connections() -> bool:
	return _refusing


# 中継が全員をつなぐハブ＝誰から誰へでも直接運べる。サーバ中継は使わない。
func _is_server_relay_supported() -> bool:
	return false


func _disconnect_peer(_peer: int, _force: bool) -> void:
	pass


func _close() -> void:
	_status = CONNECTION_DISCONNECTED
	_in.clear()
	if _link != null:
		_link.close()
		_link = null


# =====================================================================
# 橋(link)の実装: 実WebSocket版と、テスト用メモリ内版。
# 共通IF: poll() / send_bin(PackedByteArray) / pop_all()->Array / status()->int / close()
# pop_all() の各要素は {"is_text": bool, "data": <String|PackedByteArray>}。
# =====================================================================

class WsLink extends RefCounted:
	var _ws := WebSocketPeer.new()

	func _init(url: String) -> void:
		_ws.connect_to_url(url)

	func poll() -> void:
		_ws.poll()

	func status() -> int:
		match _ws.get_ready_state():
			WebSocketPeer.STATE_CONNECTING:
				return MultiplayerPeer.CONNECTION_CONNECTING
			WebSocketPeer.STATE_OPEN:
				return MultiplayerPeer.CONNECTION_CONNECTED
			_:
				return MultiplayerPeer.CONNECTION_DISCONNECTED

	func send_bin(bytes: PackedByteArray) -> void:
		_ws.put_packet(bytes)

	func pop_all() -> Array:
		var out: Array = []
		while _ws.get_available_packet_count() > 0:
			var is_text := _ws.was_string_packet()
			var pkt := _ws.get_packet()
			out.append({"is_text": is_text, "data": pkt})
		return out

	func close() -> void:
		_ws.close()


# =====================================================================
# セルフテスト: ソケットなしで「id割り当て・入退室通知・ルーティング・枠組み」を検証。
# SceneMultiplayer の握手そのものは Godot 側の仕事なので、ここでは中継ピアの
# 契約（idと信号と配送）が正しいことを確かめる。実機2台の確認は別途。
# 中継のふるまいは RelayTestHub（= relay/worker.js と同じルーティング）で代役する。
# =====================================================================

static func run_selftest() -> bool:
	var hub := RelayTestHub.new()
	var host := RelayMultiplayerPeer.over_link(hub.attach("host"), "host")
	var guest := RelayMultiplayerPeer.over_link(hub.attach("join"), "join")

	# 信号を拾う
	var host_saw: Array = []
	var guest_saw: Array = []
	host.peer_connected.connect(func(id): host_saw.append(id))
	guest.peer_connected.connect(func(id): guest_saw.append(id))

	host._poll()
	guest._poll()

	if host.get_unique_id() != 1:
		push_error("[relay] host id != 1"); return false
	if guest.get_unique_id() != 2:
		push_error("[relay] guest id != 2"); return false
	if host.get_connection_status() != CONNECTION_CONNECTED:
		push_error("[relay] host not connected"); return false
	if guest.get_connection_status() != CONNECTION_CONNECTED:
		push_error("[relay] guest not connected"); return false
	if not host_saw.has(2):
		push_error("[relay] host didn't see guest(2)"); return false
	if not guest_saw.has(1):
		push_error("[relay] guest didn't see host(1)"); return false

	# 参加者→サーバ(1) のユニキャスト
	var payload := PackedByteArray([10, 20, 30, 40])
	guest.set_target_peer(1)
	guest.put_packet(payload)
	host._poll()
	if host.get_available_packet_count() != 1:
		push_error("[relay] host got no packet"); return false
	if host.get_packet_peer() != 2:
		push_error("[relay] wrong sender id"); return false
	if host.get_packet() != payload:
		push_error("[relay] payload mismatch"); return false

	# サーバ→全員(0) のブロードキャスト
	var b := PackedByteArray([1, 2, 3])
	host.set_target_peer(0)
	host.put_packet(b)
	guest._poll()
	if guest.get_available_packet_count() != 1:
		push_error("[relay] guest got no broadcast"); return false
	if guest.get_packet_peer() != 1:
		push_error("[relay] broadcast wrong sender"); return false
	if guest.get_packet() != b:
		push_error("[relay] broadcast payload mismatch"); return false

	# 退室通知
	var host_left: Array = []
	host.peer_disconnected.connect(func(id): host_left.append(id))
	guest._close()
	host._poll()
	if not host_left.has(2):
		push_error("[relay] host didn't see guest leave"); return false

	return true
