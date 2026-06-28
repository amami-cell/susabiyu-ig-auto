/* すさび湯 確認PWA — フロントロジック
   データ/操作は GAS を JSONP で呼ぶ（CORS回避）。メディアは jsDelivr CDN。 */
(function () {
  "use strict";
  var CFG = window.SUSABIYU || {};
  var GAS = (CFG.GAS_URL || "").trim();
  var POLL = CFG.POLL_MS || 7000;
  var KEY = localStorage.getItem("sb_key") || "";

  function askKey(msg) {
    var k = window.prompt(msg || "確認コードを入力してください", "");
    if (k != null) { KEY = k.trim(); localStorage.setItem("sb_key", KEY); }
    return KEY;
  }

  var feed = document.getElementById("feed");
  var live = document.getElementById("live");
  var liveTxt = document.getElementById("liveTxt");
  var toastEl = document.getElementById("toast");
  var cardEls = {};      // token -> card element
  var pendingActs = {};  // token -> 楽観状態（サーバ反映までポーリングで巻き戻さない）
  var firstLoad = true;
  var lastSig = null;
  var timer = null;

  /* ---------- JSONP ---------- */
  var jcount = 0;
  function jsonp(params) {
    return new Promise(function (resolve, reject) {
      if (!GAS || GAS.indexOf("PASTE_") === 0) { reject(new Error("GAS_URL未設定")); return; }
      var cb = "__sb_cb" + (++jcount) + "_" + Date.now();
      var s = document.createElement("script");
      var to = setTimeout(function () { cleanup(); reject(new Error("timeout")); }, 15000);
      function cleanup() { clearTimeout(to); delete window[cb]; if (s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function (data) { cleanup(); resolve(data); };
      if (KEY) params.key = KEY;
      var q = Object.keys(params).map(function (k) { return k + "=" + encodeURIComponent(params[k]); }).join("&");
      s.src = GAS + (GAS.indexOf("?") >= 0 ? "&" : "?") + q + "&cb=" + cb;
      s.onerror = function () { cleanup(); reject(new Error("network")); };
      document.head.appendChild(s);
    });
  }

  /* ---------- helpers ---------- */
  function toast(t) {
    toastEl.textContent = t; toastEl.classList.add("show");
    clearTimeout(window._tt); window._tt = setTimeout(function () { toastEl.classList.remove("show"); }, 1700);
  }
  function isVideo(it) {
    var u = (it.url || "").toLowerCase();
    if (u.indexOf(".mp4") >= 0 || u.indexOf(".mov") >= 0 || u.indexOf(".webm") >= 0) return true;
    return it.kind === "video";
  }
  function bg(blur) {
    return blur ? 'background:#000 url(' + blur + ') center/cover no-repeat' : 'background:#000';
  }
  function mediaHtml(it) {
    if (isVideo(it)) {
      var p = it.poster ? ' poster="' + it.poster + '"' : '';
      return '<div class="mediaWrap"><video class="media" style="' + bg(it.blur) + '" src="' + it.url + '"' + p +
             ' controls playsinline preload="metadata"></video><div class="badge">▶ タップで再生（音が出ます）</div></div>';
    }
    if (it.url) {
      return '<div class="mediaWrap"><img class="media" style="' + bg(it.blur) + '" src="' + it.url +
             '" alt="preview" decoding="async" loading="eager" fetchpriority="high"></div>';
    }
    return '<div class="mediaWrap"><div class="media" style="height:180px"></div></div>';
  }
  // "2026-07-01 16:00"(JST) -> msエポック
  function parseJst(s) {
    var m = String(s || "").match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (!m) return 0;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5], 0);
  }
  function remainText(it) {
    var t = parseJst(it.when); if (!t) return "";
    var ms = t - Date.now();
    if (ms <= 0) return "まもなく投稿";
    var min = Math.floor(ms / 60000), h = Math.floor(min / 60), mn = min % 60;
    return h > 0 ? "あと" + h + "時間" + mn + "分" : "あと" + mn + "分";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  /* ---------- card body by status ---------- */
  function slotHtml(it) {
    if (it.status === "redo")
      return '<div class="redoing"><span class="spin"></span>作り直しています…（完成したら自動更新）</div>';
    if (it.status === "approved")
      return '<div class="banner okb">✓ 承認済み（予定時刻に投稿されます）</div>';
    if (it.status === "rejected")
      return '<div class="banner ngb">— 取りやめました</div>';
    if (it.status === "gone")
      return '<div class="banner ngb">— この枠は削除されました</div>';
    return '<div class="btns">' +
      '<button class="ok">投稿OK</button>' +
      '<button class="rd">作り直す</button>' +
      '<button class="ng">やめる</button></div>';
  }
  function wireButtons(card, it) {
    var b = card.querySelectorAll(".btns button");
    if (!b.length) return;
    b[0].onclick = function () { act(card, it.token, "ok"); };
    b[1].onclick = function () { act(card, it.token, "redo"); };
    b[2].onclick = function () { act(card, it.token, "cancel"); };
  }
  function applyStatus(card, it) {
    card.setAttribute("data-status", it.status);
    var slot = card.querySelector(".slot");
    if (slot) { slot.innerHTML = slotHtml(it); wireButtons(card, it); }
    card.classList.toggle("done", it.status === "approved" || it.status === "rejected" || it.status === "gone");
  }
  function buildCard(it) {
    var card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-token", it.token);
    card.dataset.url = it.url || "";
    var rem = remainText(it);
    card.innerHTML =
      '<div class="head"><span class="time">' + esc(it.when) + '</span>' +
      '<span class="pat">' + esc(it.patternJa || it.pattern || "") + '</span>' +
      (rem ? '<span class="remain">' + rem + '</span>' : '') + '</div>' +
      mediaHtml(it) +
      '<div class="cap">' + esc(it.caption || "（動画）") + '</div>' +
      '<div class="slot"></div>';
    applyStatus(card, it);
    return card;
  }

  /* ---------- actions ---------- */
  function act(card, token, action) {
    var bs = card.querySelectorAll(".btns button");
    for (var i = 0; i < bs.length; i++) bs[i].disabled = true;
    var optimistic = action === "ok" ? "approved" : action === "redo" ? "redo" : "rejected";
    pendingActs[token] = optimistic;   // サーバ反映までポーリングで巻き戻さない
    applyStatus(card, { token: token, status: optimistic });
    toast(action === "ok" ? "承認しました" : action === "redo" ? "作り直しを開始しました" : "取りやめました");
    jsonp({ api: "act", token: token, action: action }).then(function (res) {
      var r = (res && res.result) || "";
      if (r.indexOf("locked:") === 0) {
        var cur = r.split(":")[1];
        toast("他の方が「" + (cur === "approved" ? "投稿OK" : cur === "rejected" ? "やめる" : "作り直し") + "」済みです");
        pendingActs[token] = cur; applyStatus(card, { token: token, status: cur });
      } else if (r === "busy") { delete pendingActs[token]; toast("混雑中。再取得します"); load(); }
      else if (r === "notfound") { delete pendingActs[token]; applyStatus(card, { token: token, status: "gone" }); }
      else { pendingActs[token] = optimistic; if (action === "redo") fast(); }
    }).catch(function () {
      delete pendingActs[token];
      toast("通信エラー。元に戻します");
      applyStatus(card, { token: token, status: "pending" });
    });
  }

  /* ---------- render / diff ---------- */
  function render(items) {
    if (firstLoad) { feed.innerHTML = ""; firstLoad = false; }
    var seen = {};
    var anyRedo = false;
    items.forEach(function (it) {
      seen[it.token] = true;
      if (it.status === "redo") anyRedo = true;
      var card = cardEls[it.token];
      if (!card) {
        card = buildCard(it);
        cardEls[it.token] = card;
        feed.appendChild(card);
      } else {
        // 残り時間は常に更新
        var rem = card.querySelector(".remain");
        if (rem) rem.textContent = remainText(it);
        // 操作直後はサーバ反映まで楽観状態を維持（ポーリングで巻き戻さない）
        if (pendingActs[it.token]) {
          if (it.status === pendingActs[it.token]) { delete pendingActs[it.token]; }
          else { return; }  // まだ反映前 → 状態/メディアは触らない（returnでこの枠だけスキップ）
        }
        // メディアが変わった（作り直し完了など）ら差し替え。それ以外は触らずチラつき防止
        if ((card.dataset.url || "") !== (it.url || "")) {
          card.dataset.url = it.url || "";
          var mw = card.querySelector(".mediaWrap");
          if (mw) mw.outerHTML = mediaHtml(it);
          var cp = card.querySelector(".cap");
          if (cp) cp.textContent = it.caption || "（動画）";
        }
        var prev = card.getAttribute("data-status");
        if (prev !== it.status) applyStatus(card, it);
      }
    });
    // 消えた枠（=投稿済みなど）はフェードして除去
    Object.keys(cardEls).forEach(function (tk) {
      if (!seen[tk]) {
        var c = cardEls[tk]; delete cardEls[tk];
        c.style.opacity = "0"; c.style.transform = "scale(.98)";
        setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 280);
      }
    });
    if (!feed.children.length) {
      feed.innerHTML = '<div class="empty">確認待ちの投稿はありません。<br>新しい投稿ができると、ここに表示されます。</div>';
    }
    setRate(anyRedo ? 3000 : POLL);
  }

  /* ---------- load / poll ---------- */
  function setLive(ok) {
    live.classList.toggle("live", ok);
    liveTxt.textContent = ok ? "最新" : "接続中…";
  }
  function load() {
    return jsonp({ api: "list" }).then(function (data) {
      if (data && data.error === "auth") {
        setLive(false);
        askKey("確認コードが違います。もう一度入力してください");
        return load();
      }
      setLive(true);
      var items = (data && data.items) || [];
      lastSig = data && data.sig;
      render(items);
    }).catch(function (e) {
      setLive(false);
      if (firstLoad) {
        feed.innerHTML = '<div class="empty">接続できませんでした。<br>設定(GAS_URL)をご確認ください。<br><small>' + esc(e.message) + '</small></div>';
        firstLoad = false;
      }
    });
  }
  function poll() { if (!document.hidden) load(); }
  function setRate(ms) { if (timer) clearInterval(timer); timer = setInterval(poll, ms); }
  function fast() { setRate(3000); poll(); }

  /* ---------- iOS add-to-home hint ---------- */
  function maybeIosHint() {
    var ua = navigator.userAgent;
    var isIos = /iphone|ipad|ipod/i.test(ua);
    var standalone = ("standalone" in navigator) && navigator.standalone;
    if (isIos && !standalone && !localStorage.getItem("ios_hint_off")) {
      var el = document.getElementById("ios");
      if (el) {
        el.style.display = "block";
        el.querySelector(".x").addEventListener("click", function () { localStorage.setItem("ios_hint_off", "1"); });
      }
    }
  }

  /* ---------- Web Push 購読 ---------- */
  function urlB64ToU8(s) {
    var pad = "=".repeat((4 - (s.length % 4)) % 4);
    var b = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(b), arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function pushSupported() {
    return ("serviceWorker" in navigator) && ("PushManager" in window) && ("Notification" in window);
  }
  function refreshPushBtn() {
    var btn = document.getElementById("pushBtn"); if (!btn) return;
    btn.onclick = enablePush;
    var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var standalone = ("standalone" in navigator) && navigator.standalone;
    if (pushSupported()) {
      navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); })
        .then(function (sub) {
          btn.style.display = "inline-block";
          if (sub && Notification.permission === "granted") { btn.textContent = "🔔 通知ON"; btn.classList.add("on"); }
          else { btn.textContent = "🔔 通知を受け取る"; btn.classList.remove("on"); }
        }).catch(function () { btn.style.display = "inline-block"; });
    } else if (isIos && !standalone) {
      btn.style.display = "inline-block"; btn.textContent = "🔔 通知"; btn.classList.remove("on");
    } else { btn.style.display = "none"; }
  }
  function enablePush() {
    var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var standalone = ("standalone" in navigator) && navigator.standalone;
    if (isIos && !standalone) {
      var el = document.getElementById("ios"); if (el) el.style.display = "block";
      toast("iPhoneは『ホーム画面に追加』してから通知をオンにできます"); return;
    }
    if (!pushSupported()) { toast("この端末/ブラウザは通知に未対応です"); return; }
    if (!CFG.VAPID_PUBLIC) { toast("通知の設定(VAPID)が未設定です"); return; }
    Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") { toast("通知が許可されませんでした"); return; }
      navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToU8(CFG.VAPID_PUBLIC) });
      }).then(function (sub) {
        return jsonp({ api: "subscribe", sub: b64(JSON.stringify(sub)) });
      }).then(function (res) {
        if (res && res.error === "auth") { askKey("確認コードを入力してください"); return; }
        toast("通知をオンにしました 🔔"); refreshPushBtn();
      }).catch(function (e) { toast("通知の登録に失敗: " + ((e && e.message) || e)); });
    });
  }

  /* ---------- 通知タップで該当投稿へジャンプ ---------- */
  function getParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]+)").exec(location.search || "");
    return m ? decodeURIComponent(m[1]) : "";
  }
  function focusCard(token) {
    if (!token) return;
    var tries = 0, done = 0;
    (function step() {
      var c = cardEls[token];
      if (c) {
        // 即時で上揃え（上からスクロールせず、その投稿が開いた状態にする）
        c.scrollIntoView({ behavior: "auto", block: "start" });
        if (done === 0) { c.classList.add("flash"); setTimeout(function () { c.classList.remove("flash"); }, 2200); }
        done++;
        if (done < 5) setTimeout(step, 250);  // 画像読込などのズレを数回補正（手前で止まる対策）
        return;
      }
      if (++tries < 25) setTimeout(step, 250);  // データ到着を待つ
    })();
  }

  /* ---------- boot ---------- */
  load().then(function () { setRate(POLL); focusCard(getParam("focus")); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(); });
  if ("serviceWorker" in navigator && navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("message", function (ev) {
      if (ev.data && ev.data.type === "focus") { poll(); focusCard(ev.data.token); }
    });
  }
  maybeIosHint();
  refreshPushBtn();
})();
