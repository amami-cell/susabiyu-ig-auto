/* すさび湯 確認PWA — Service Worker
   ・アプリのガワ(shell)を precache → 2回目以降は“開いた瞬間”に表示
   ・jsDelivr のメディアは stale-while-revalidate でランタイムキャッシュ
   ・GAS(JSONP)などデータ通信はキャッシュしない（常に最新を取りに行く） */
var VER = "susabiyu-v2";
var SHELL = VER + "-shell";
var MEDIA = VER + "-media";
var SHELL_FILES = [
  "./", "./index.html", "./app.js", "./config.js",
  "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"
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

  // 画像のみ stale-while-revalidate でキャッシュ
  if (url.hostname.indexOf("jsdelivr.net") >= 0 || /\.(jpg|jpeg|png|webp)$/i.test(url.pathname)) {
    e.respondWith(caches.open(MEDIA).then(function (cache) {
      return cache.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && (res.status === 200 || res.type === "opaque")) cache.put(req, res.clone());
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }

  // 同一オリジンのガワ: cache-first（無ければネット→キャッシュ）
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(SHELL).then(function (c) { c.put(req, copy); }).catch(function(){});
        return res;
      }).catch(function () { return caches.match("./index.html"); });
    }));
  }
});

/* ---- Web Push 受信（フェーズ3で本格運用。今は受け口だけ用意） ---- */
self.addEventListener("push", function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (x) {}
  var title = data.title || "すさび湯 確認";
  var body = data.body || "新しい投稿の確認待ちがあります";
  e.waitUntil(self.registration.showNotification(title, {
    body: body, icon: "./icons/icon-192.png", badge: "./icons/icon-192.png",
    vibrate: [80, 40, 80], tag: data.tag || "susabiyu", renotify: true,
    data: { url: data.url || "./" }
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cl) {
    for (var i = 0; i < cl.length; i++) { if ("focus" in cl[i]) return cl[i].focus(); }
    if (clients.openWindow) return clients.openWindow(target);
  }));
});
