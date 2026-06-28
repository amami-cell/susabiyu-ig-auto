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
             ' controls playsinline preload="none"></video><div class="badge">▶ タップで再生（音が出ます）</div></div>';
    }
    if (it.url) {
      return '<div class="mediaWrap"><img class="media" style="' + bg(it.blur) + '" src="' + it.url +
             '" alt="preview" decoding="async"></div>';
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
    applyStatus(card, { token: token, status: optimistic });
    toast(action === "ok" ? "承認しました" : action === "redo" ? "作り直しを開始しました" : "取りやめました");
    jsonp({ api: "act", token: token, action: action }).then(function (res) {
      var r = (res && res.result) || "";
      if (r.indexOf("locked:") === 0) {
        var cur = r.split(":")[1];
        toast("他の方が「" + (cur === "approved" ? "投稿OK" : cur === "rejected" ? "やめる" : "作り直し") + "」済みです");
        applyStatus(card, { token: token, status: cur });
      } else if (r === "busy") { toast("混雑中。再取得します"); load(); }
      else if (r === "notfound") { applyStatus(card, { token: token, status: "gone" }); }
      else if (action === "redo") { fast(); }
    }).catch(function () {
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
        // メディアは触らず、状態と残り時間だけ更新（チラつき防止）
        var prev = card.getAttribute("data-status");
        if (prev !== it.status) applyStatus(card, it);
        var rem = card.querySelector(".remain");
        var rt = remainText(it);
        if (rem) rem.textContent = rt;
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

  /* ---------- boot ---------- */
  load().then(function () { setRate(POLL); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(); });
  maybeIosHint();
})();
