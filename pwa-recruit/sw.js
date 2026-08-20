/* Initiateエンポケ求人 PWA — Service Worker
   ・アプリのガワ(shell)を軽くキャッシュ（2回目以降すぐ起動）
   ・Web Push を受信して通知を表示（タップでアプリを開く）
   ・GAS(script.google) のデータ通信はキャッシュしない（常に最新） */
var VER = "empoke-recruit-v3";
var SHELL = VER + "-shell";
var SHELL_FILES = [
  "./", "./index.html", "./config.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) {
    return c.addAll(SHELL_FILES).catch(function () {});
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k.indexOf(VER) !== 0) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // GAS等のデータは素通し（キャッシュしない）
  if (url.hostname.indexOf("script.google") >= 0 || url.hostname.indexOf("googleusercontent") >= 0) return;
  // 自オリジンのガワは「ネット優先」で（更新をすぐ反映。失敗時のみキャッシュ）
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.status === 200) { var cp = res.clone(); caches.open(SHELL).then(function (c) { c.put(req, cp); }); }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match("./index.html"); });
    }));
  }
});

/* ---- Web Push 受信 ---- */
self.addEventListener("push", function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (x) {}
  var title = data.title || "🆕 新規応募";
  var body = data.body || "";
  e.waitUntil(self.registration.showNotification(title, {
    body: body, icon: "./icons/icon-192.png", badge: "./icons/icon-192.png",
    vibrate: [120, 60, 120], tag: data.tag || "recruit", renotify: true,
    data: { url: data.url || "./" }
  }));
});

/* ---- 通知タップでアプリを開く（既に開いていればフォーカス） ---- */
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cl) {
    for (var i = 0; i < cl.length; i++) {
      if (cl[i].url.indexOf(self.location.origin) === 0 && "focus" in cl[i]) return cl[i].focus();
    }
    if (clients.openWindow) return clients.openWindow(target);
  }));
});
