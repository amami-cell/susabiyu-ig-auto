/* すさび湯 確認PWA — Service Worker
   ・アプリのガワ(shell)を precache → 2回目以降は“開いた瞬間”に表示
   ・jsDelivr のメディアは stale-while-revalidate でランタイムキャッシュ
   ・GAS(JSONP)などデータ通信はキャッシュしない（常に最新を取りに行く） */
var VER = "susabiyu-v91";
var SHELL = VER + "-shell";
var MEDIA = VER + "-media";
var SHELL_FILES = [
  "./", "./index.html", "./app.js", "./config.js",
  "./home.html", "./stores.js", "./store.html", "./reels.html", "./gifuyatenjin.html", "./gifuya_reels.html",
  "./config.gifuya.js",
  "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/storelogo_white.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) {
    return c.addAll(SHELL_FILES).catch(function () {});
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      if (k.indexOf(VER) !== 0) return caches.delete(k);
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // データ通信(GAS等)は素通し（キャッシュしない）
  if (url.hostname.indexOf("script.google") >= 0 || url.hostname.indexOf("googleusercontent") >= 0) return;

  // 動画はSWを通さず素通し（Range通信をブラウザに任せる＝ホーム保存(standalone)でも再生できる）
  if (/\.(mp4|mov|webm)$/i.test(url.pathname)) return;

  // 画像(＝ポスター含む)はキャッシュ優先で“開いた瞬間”に鮮明表示する。
  // かつて stale-while-revalidate で opaque(中身不明)応答まで保存し、CDNのコールドキャッシュで
  // 失敗した空/404を掴んで“直らないぼやけ”になっていた。今回は画像/動画に crossorigin=anonymous を
  // 付けて応答を cors(中身の読める)状態にしたので、status200 かつ非opaque の確認できた成功だけ保存する。
  // URLは全てコミットSHA固定＝中身が変わらないので、キャッシュは常に正しい＝古い物を掴む心配がない。
  if (url.hostname.indexOf("jsdelivr.net") >= 0 || /\.(jpg|jpeg|png|webp)$/i.test(url.pathname)) {
    e.respondWith(caches.open(MEDIA).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.status === 200 && res.type !== "opaque") c.put(req, res.clone());
          return res;
        });
        if (hit) { net.catch(function () {}); return hit; } // 即キャッシュ返却＋裏で更新（失敗は無視）
        return net;                                          // 未キャッシュのみネットワーク待ち（失敗はimgのonerrorへ）
      });
    }));
    return;
  }

  // 店舗ホーム関連は常に最新を取りに行く（更新をすぐ反映・オフライン時のみキャッシュ）
  if (url.origin === self.location.origin && /\/(home\.html|stores\.js|store\.html|reels\.html|gifuyatenjin\.html|gifuya_reels\.html)$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var cl = res.clone();
        caches.open(SHELL).then(function (c) { c.put(req, cl); });
      }
      return res;
    }).catch(function () {
      return caches.open(SHELL).then(function (c) { return c.match(req); });
    }));
    return;
  }

  // 同一オリジンのガワ: stale-while-revalidate
  // （キャッシュを即返して起動を速くし、裏で最新を取得→次回起動に反映。
  //   オフラインでもそのまま開ける。初回だけネットワーク待ち）
  if (url.origin === self.location.origin) {
    e.respondWith(caches.open(SHELL).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.status === 200) c.put(req, res.clone());
          return res;
        }).catch(function () { return hit; });
        return hit || net.catch(function () { return caches.match("./index.html"); });
      });
    }));
  }
});

/* ---- アプリアイコンのバッジ（LINEのような未読件数） ---- */
var BADGE_CACHE = "susabiyu-badge";
function badgeGet() {
  return caches.open(BADGE_CACHE).then(function (c) { return c.match("/n"); })
    .then(function (r) { return r ? r.text() : "0"; })
    .then(function (t) { return parseInt(t, 10) || 0; }).catch(function () { return 0; });
}
function badgeStore(n) {
  return caches.open(BADGE_CACHE).then(function (c) { return c.put("/n", new Response(String(n))); }).catch(function () {});
}
function badgeShow(n) {
  try {
    if (n > 0 && self.navigator && self.navigator.setAppBadge) return self.navigator.setAppBadge(n);
    if (self.navigator && self.navigator.clearAppBadge) return self.navigator.clearAppBadge();
  } catch (e) {}
}

/* ---- Web Push 受信（通知 + アイコンバッジ＋1） ---- */
self.addEventListener("push", function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (x) {}
  var title = data.title || "すさび湯 確認";
  var body = data.body || "新しい投稿の確認待ちがあります";
  e.waitUntil((function () {
    return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cl) {
      var visible = cl.some(function (c) { return c.visibilityState === "visible" || c.focused; });
      // アプリを見ている時はバッジを増やさない（見たら未読ではない）
      return (visible ? Promise.resolve(0) : badgeGet().then(function (n) { return n + 1; }));
    }).then(function (n) {
      return badgeStore(n).then(function () { return badgeShow(n); });
    }).then(function () {
      return self.registration.showNotification(title, {
        body: body, icon: "./icons/icon-192.png", badge: "./icons/icon-192.png",
        vibrate: [120, 60, 120], tag: data.tag || "susabiyu", renotify: true,
        silent: false, requireInteraction: false,
        data: { url: data.url || "./", focus: data.focus || "" }
      });
    });
  })());
});

/* ---- 画面からの指示でバッジをクリア ---- */
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "clearBadge") {
    e.waitUntil(badgeStore(0).then(function () { return badgeShow(0); }));
  }
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var d = e.notification.data || {};
  var focus = d.focus || "";
  var base = d.url || "./";
  var target = base + (focus ? (base.indexOf("?") >= 0 ? "&" : "?") + "focus=" + encodeURIComponent(focus) : "");
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cl) {
    for (var i = 0; i < cl.length; i++) {
      if ("focus" in cl[i]) { try { cl[i].postMessage({ type: "focus", token: focus }); } catch (x) {} return cl[i].focus(); }
    }
    if (clients.openWindow) return clients.openWindow(target);
  }));
});
