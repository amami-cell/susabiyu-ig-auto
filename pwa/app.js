/* すさび湯 確認PWA — フロントロジック
   データ/操作は GAS を JSONP で呼ぶ（CORS回避）。メディアは jsDelivr CDN。 */
(function () {
  "use strict";
  var CFG = window.SUSABIYU || {};
  var GAS = (CFG.GAS_URL || "").trim();
  var POLL = CFG.POLL_MS || 7000;
  var KEY = localStorage.getItem("sb_key") || "";
  var ADMIN = localStorage.getItem("sb_admin") || "";   // 管理者コード（採用/無しの変更に必要。空＝閲覧のみ）
  var NOTIF = loadNotif();                                // 通知カテゴリの個別ON/OFF
  function loadNotif() {
    try { var o = JSON.parse(localStorage.getItem("sb_notif") || "{}"); return o && typeof o === "object" ? o : {}; }
    catch (e) { return {}; }
  }
  function notifOn(k) { return String(NOTIF[k] !== undefined ? NOTIF[k] : 1) !== "0"; }
  function saveNotifLocal() { try { localStorage.setItem("sb_notif", JSON.stringify(NOTIF)); } catch (e) {} }

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
      if (ADMIN && params.owner === undefined) params.owner = ADMIN;
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
          if (sub && Notification.permission === "granted") {
            btn.textContent = "🔔 通知ON"; btn.classList.add("on");
            btn.onclick = function () { openNotifSettings(sub); };  // ON中はタップで個別設定
          } else {
            btn.textContent = "🔔 通知を受け取る"; btn.classList.remove("on"); btn.onclick = enablePush;
          }
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
        return jsonp({ api: "subscribe", sub: b64(JSON.stringify(sub)), prefs: JSON.stringify(NOTIF), ep: sub.endpoint }).then(function (res) {
          if (res && res.error === "auth") { askKey("確認コードを入力してください"); return; }
          toast("通知をオンにしました 🔔"); refreshPushBtn(); openNotifSettings(sub);
        });
      }).catch(function (e) { toast("通知の登録に失敗: " + ((e && e.message) || e)); });
    });
  }

  /* ---------- モーダル（汎用） ---------- */
  function modal(title, fill) {
    var ov = document.createElement("div"); ov.className = "modalOv";
    var sheet = document.createElement("div"); sheet.className = "modal";
    sheet.innerHTML = '<div class="mhead"><span>' + esc(title) + '</span><button class="mx">✕</button></div><div class="mbody"></div>';
    ov.appendChild(sheet); document.body.appendChild(ov);
    sheet.querySelector(".mx").onclick = function () { closeModal(ov); };
    ov.onclick = function (e) { if (e.target === ov) closeModal(ov); };
    fill(sheet.querySelector(".mbody"), ov);
    requestAnimationFrame(function () { ov.classList.add("show"); });
    return ov;
  }
  function closeModal(ov) {
    ov.classList.remove("show");
    setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 220);
  }

  /* ---------- 通知の個別ON/OFF設定 ---------- */
  var NOTIF_CATS = [
    { key: "ig", label: "Instagram投稿完了", desc: "実際にInstagramへ投稿された時" },
    { key: "confirm", label: "確認用の作成完了", desc: "確認用の動画・画像ができた時" },
    { key: "redo", label: "作り直しの作成完了", desc: "作り直した動画・画像ができた時" }
  ];
  function openNotifSettings(sub) {
    modal("通知の設定", function (body, ov) {
      var lead = document.createElement("div"); lead.className = "mlead";
      lead.textContent = "受け取りたい通知だけをオンにできます（この端末ごとの設定）。";
      body.appendChild(lead);
      NOTIF_CATS.forEach(function (c) {
        var row = document.createElement("label"); row.className = "swrow";
        row.innerHTML = '<div class="swtxt"><b>' + esc(c.label) + '</b><small>' + esc(c.desc) + '</small></div>' +
          '<span class="sw"><input type="checkbox"' + (notifOn(c.key) ? " checked" : "") + '><i></i></span>';
        var cb = row.querySelector("input");
        cb.onchange = function () {
          NOTIF[c.key] = cb.checked ? 1 : 0; saveNotifLocal();
          if (sub) jsonp({ api: "notifprefs", ep: sub.endpoint, prefs: JSON.stringify(NOTIF) }).then(function (res) {
            if (res && res.error === "auth") askKey("確認コードを入力してください");
          });
          toast((cb.checked ? "ON：" : "OFF：") + c.label);
        };
        body.appendChild(row);
      });
      var stop = document.createElement("button"); stop.className = "mbtn off"; stop.textContent = "通知をすべてオフにする";
      stop.onclick = function () {
        if (sub) { try { sub.unsubscribe(); } catch (e) {} }
        toast("通知をオフにしました"); closeModal(ov); refreshPushBtn();
      };
      body.appendChild(stop);
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

  /* ---------- 見本ギャラリー（採用/無しの判断用） ---------- */
  var galleryEl = document.getElementById("gallery");
  var tabFeed = document.getElementById("tabFeed");
  var tabGallery = document.getElementById("tabGallery");
  var galleryLoaded = false;

  function galleryCard(it) {
    var card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-pattern", it.pattern);
    var on = String(it.enabled) !== "0" && String(it.enabled).toLowerCase() !== "false";
    var p = it.poster ? ' poster="' + esc(it.poster) + '"' : "";
    var media = it.url
      ? '<div class="mediaWrap"><video class="media" style="' + bg(it.blur) + '" src="' + esc(it.url) + '"' + p +
        ' controls playsinline preload="none"></video><div class="badge">▶ タップで再生（音が出ます）</div></div>'
      : '<div class="mediaWrap"><div class="media" style="height:180px;display:flex;align-items:center;justify-content:center;color:#9aa3b2">見本を生成中…</div></div>';
    // 採用ボタンと注意書きは両方DOMに入れ、表示は #gallery.admin クラスでCSS切替（再描画なし＝カクつかない）
    card.innerHTML =
      '<div class="head"><span class="pat">' + esc(it.label || it.pattern) + '</span>' +
      '<span class="gstate ' + (on ? "on" : "off") + '">' + (on ? "採用中" : "無し") + '</span></div>' +
      media +
      '<div class="seg"><button class="seg-on">採用する</button><button class="seg-off">無しにする</button></div>' +
      '<div class="ghintline">「採用する」を選んだパターンだけが投稿に使われます</div>' +
      '<div class="gnote">採用／無しの変更は管理者のみです。再生して確認できます。</div>';
    var sOn = card.querySelector(".seg-on"), sOff = card.querySelector(".seg-off");
    sOn.onclick = function () { if (card.dataset.on !== "1") setPattern(card, it.pattern, true); };
    sOff.onclick = function () { if (card.dataset.on !== "0") setPattern(card, it.pattern, false); };
    paintToggle(card, on);  // 初期状態を反映
    return card;
  }
  // 2択スイッチ：選んでいる方を色付き＋「✓」で明示。両方いつでも押せる
  function paintToggle(card, on) {
    card.dataset.on = on ? "1" : "0";
    var st = card.querySelector(".gstate");
    if (st) { st.className = "gstate " + (on ? "on" : "off"); st.textContent = on ? "採用中" : "無し"; }
    var sOn = card.querySelector(".seg-on"), sOff = card.querySelector(".seg-off");
    if (sOn && sOff) {
      sOn.classList.toggle("sel", on);   sOn.textContent = on ? "✓ 採用する" : "採用する";
      sOff.classList.toggle("sel", !on); sOff.textContent = !on ? "✓ 無しにする" : "無しにする";
    }
  }
  function setPattern(card, key, on) {
    paintToggle(card, on);  // 楽観反映
    toast(on ? "採用にしました" : "無しにしました");
    jsonp({ api: "pattern", pattern: key, on: on ? 1 : 0 }).then(function (res) {
      if (res && res.error === "owner") { toast("管理者コードが必要です"); paintToggle(card, !on); lockAdmin(); return; }
      if (res && res.error) { toast("反映できませんでした"); paintToggle(card, !on); }
    }).catch(function () { toast("通信エラー。元に戻します"); paintToggle(card, !on); });
  }
  function applyAdminClass() {
    if (galleryEl) galleryEl.classList.toggle("admin", !!ADMIN);
    refreshAdminBar();
  }
  function refreshAdminBar() {
    var bar = document.getElementById("adminBar"); if (!bar) return;
    if (ADMIN) {
      bar.innerHTML = '<span class="abadge">🔓 管理者モード</span><button class="alink" id="adminLock">解除する</button>';
      var lk = bar.querySelector("#adminLock"); if (lk) lk.onclick = lockAdmin;
    } else {
      bar.innerHTML = '<button class="alink" id="adminUnlock">🔑 管理者モード（採用／無しを変更）</button>';
      var ul = bar.querySelector("#adminUnlock"); if (ul) ul.onclick = unlockAdmin;
    }
  }
  function unlockAdmin() {
    var code = window.prompt("管理者コードを入力（採用／無しを変更できます）", "");
    if (code == null) return;
    code = String(code).trim(); if (!code) return;
    jsonp({ api: "owner", owner: code }).then(function (res) {
      if (res && res.error === "auth") { askKey("確認コードを入力してください"); return; }
      if (res && res.owner) { ADMIN = code; localStorage.setItem("sb_admin", code); toast("管理者モードON"); applyAdminClass(); }
      else { toast("管理者コードが違います"); }
    }).catch(function () { toast("通信エラー"); });
  }
  function lockAdmin() { ADMIN = ""; localStorage.removeItem("sb_admin"); applyAdminClass(); }
  var lastGallerySig = "";
  function patternsCacheGet() { try { return JSON.parse(localStorage.getItem("sb_patterns") || "null"); } catch (e) { return null; } }
  function patternsCacheSet(items) { try { localStorage.setItem("sb_patterns", JSON.stringify(items)); } catch (e) {} }
  function hasCards() { return !!galleryEl.querySelector(".card"); }
  function renderGallery(items) {
    // 内容が前回と同じなら作り直さない（動画の再読込＝カクつきを防ぐ）
    var sig = JSON.stringify(items.map(function (it) { return [it.pattern, it.url, it.enabled, it.label, it.poster ? 1 : 0]; }));
    if (sig === lastGallerySig && hasCards()) { applyAdminClass(); return; }
    lastGallerySig = sig;
    galleryEl.innerHTML = "";
    var hint = document.createElement("div"); hint.className = "ghint";
    hint.innerHTML = "各動画パターンの見本です。<b style='color:#7fd1a0'>採用する</b>を選ぶと、その型だけが日々の投稿ローテーションに使われます。<br>（店舗ごとの好みに合わせて選べます）";
    galleryEl.appendChild(hint);
    var bar = document.createElement("div"); bar.className = "adminbar"; bar.id = "adminBar"; galleryEl.appendChild(bar);
    if (!items.length) {
      var e = document.createElement("div"); e.className = "empty";
      e.innerHTML = "見本がまだありません。<br>サンプル生成（samples）を実行すると、ここに各パターンの動画が並びます。";
      galleryEl.appendChild(e); applyAdminClass(); return;
    }
    items.forEach(function (it) { galleryEl.appendChild(galleryCard(it)); });
    applyAdminClass();
  }
  function loadPatterns() {
    var cached = patternsCacheGet();
    if (cached && !hasCards()) renderGallery(cached);                 // 前回内容を即表示（待たせない）
    else if (!cached && !hasCards()) galleryEl.innerHTML = '<div class="ghint">見本を読み込んでいます…</div>';
    jsonp({ api: "patterns" }).then(function (data) {
      if (data && data.error === "auth") { askKey("確認コードを入力してください"); return loadPatterns(); }
      var items = (data && data.items) || [];
      patternsCacheSet(items);
      renderGallery(items);                                            // 変化が無ければ作り直さない
    }).catch(function (e) {
      if (!hasCards()) galleryEl.innerHTML = '<div class="empty">見本を取得できませんでした。<br><small>' + esc(e.message) + '</small></div>';
    });
  }
  function switchTab(toGallery) {
    tabFeed.classList.toggle("on", !toGallery);
    tabGallery.classList.toggle("on", toGallery);
    feed.style.display = toGallery ? "none" : "";
    galleryEl.style.display = toGallery ? "" : "none";
    if (toGallery && !galleryLoaded) { galleryLoaded = true; loadPatterns(); }
  }
  if (tabFeed) tabFeed.onclick = function () { switchTab(false); };
  if (tabGallery) tabGallery.onclick = function () { switchTab(true); };

  /* ---------- 店舗屋号をタイトルに ---------- */
  (function setStoreName() {
    var el = document.getElementById("storeName");
    var name = (CFG.STORE_NAME || "").trim();
    if (el && name) { el.textContent = name; }
    if (name) { document.title = name; }
  })();

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
