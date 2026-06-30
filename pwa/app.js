/* すさび湯 確認PWA — フロントロジック
   データ/操作は GAS を JSONP で呼ぶ（CORS回避）。メディアは jsDelivr CDN。 */
(function () {
  "use strict";
  var CFG = window.SUSABIYU || {};
  var GAS = (CFG.GAS_URL || "").trim();
  var POLL = CFG.POLL_MS || 4000;
  var KEY = localStorage.getItem("sb_key") || "";
  var ADMIN = localStorage.getItem("sb_admin") || "";   // 管理者コード（採用/無しの変更に必要。空＝閲覧のみ）
  var NOTIF = loadNotif();                                // 通知カテゴリの個別ON/OFF
  function loadNotif() {
    try { var o = JSON.parse(localStorage.getItem("sb_notif") || "{}"); return o && typeof o === "object" ? o : {}; }
    catch (e) { return {}; }
  }
  function notifOn(k) { return String(NOTIF[k] !== undefined ? NOTIF[k] : 1) !== "0"; }
  function saveNotifLocal() { try { localStorage.setItem("sb_notif", JSON.stringify(NOTIF)); } catch (e) {} }

  var keyGen = 0;   // キー入力ごとに+1。送信後に別要求でキーが入った場合の“二重入力”を防ぐ
  function askKey(msg, genAtSend) {
    // この要求を投げた後に、別の要求でキーが入力済みなら聞かない（＝1回で済む）
    if (genAtSend !== undefined && genAtSend !== keyGen) return KEY;
    var k = window.prompt(msg || "確認コードを入力してください", "");
    if (k != null) { KEY = k.trim(); localStorage.setItem("sb_key", KEY); keyGen++; }
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
      var genAtSend = keyGen;   // この要求を投げた時点のキー世代
      window[cb] = function (data) { cleanup(); if (data && typeof data === "object") { try { data._gen = genAtSend; } catch (e) {} } resolve(data); };
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
  // 端末バイブ（対応端末のみ。iOSのWebは非対応なので視覚で補う）
  function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 15); } catch (e) {} }
  // 更新中トースト（スピナー付き・自動で消さない＝完了時にtoast()で置き換える）
  function toastBusy(t) {
    toastEl.innerHTML = '<span class="tspin"></span>' + (t || "更新中…");
    toastEl.classList.add("show"); clearTimeout(window._tt);
  }
  function isVideo(it) {
    var u = (it.url || "").toLowerCase();
    if (u.indexOf(".mp4") >= 0 || u.indexOf(".mov") >= 0 || u.indexOf(".webm") >= 0) return true;
    return it.kind === "video";
  }
  function bg(blur) {
    return blur ? 'background:#000 url(' + blur + ') center/cover no-repeat' : 'background:#000';
  }
  window.__mediaErr = function (el) { var w = el && el.closest && el.closest(".mediaWrap"); if (w) w.classList.add("mediaerr"); };
  function mediaHtml(it) {
    if (isVideo(it)) {
      var p = it.poster ? ' poster="' + it.poster + '"' : '';
      return '<div class="mediaWrap"><video class="media" style="' + bg(it.blur) + '" src="' + it.url + '"' + p +
             ' controls playsinline preload="metadata" onerror="window.__mediaErr&&window.__mediaErr(this)"></video><div class="badge">▶ タップで再生（音が出ます）</div></div>';
    }
    if (it.url) {
      return '<div class="mediaWrap"><img class="media" style="' + bg(it.blur) + '" src="' + it.url +
             '" alt="preview" decoding="async" loading="eager" fetchpriority="high" onerror="window.__mediaErr&&window.__mediaErr(this)"></div>';
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
      return '<div class="redoing"><span class="spin"></span>作り直しています…（1〜3分・完成したら自動更新）</div>';
    if (it.status === "approved")
      return '<div class="banner okb" data-unapprove="1">✓ 承認済み（予定時刻に投稿されます）<small>タップで承認取消（管理者）</small></div>';
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
    // 承認済みバナーをタップ→管理者コードで承認取消
    var ub = card.querySelector('.banner.okb[data-unapprove]');
    if (ub) ub.onclick = function () { unapprove(card, it.token); };
    // 作り直しが長引いた時の逃げ道（5分でフォールバックを表示）
    if (card._redoTimer) { clearTimeout(card._redoTimer); card._redoTimer = null; }
    if (it.status === "redo") {
      card._redoTimer = setTimeout(function () {
        var sl = card.querySelector(".slot");
        if (sl && card.getAttribute("data-status") === "redo") {
          var ex = document.createElement("div"); ex.className = "redoslow";
          ex.innerHTML = "時間がかかっています。<button class=\"mlink\" data-r=\"again\">もう一度</button>・<button class=\"mlink\" data-r=\"stop\">やめる</button>";
          sl.appendChild(ex);
          var ag = ex.querySelector('[data-r="again"]'), sp = ex.querySelector('[data-r="stop"]');
          if (ag) ag.onclick = function () { act(card, card.dataset.token, "redo"); };
          if (sp) sp.onclick = function () { act(card, card.dataset.token, "cancel"); };
        }
      }, 5 * 60 * 1000);
    }
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

  // 承認の取り消し（管理者コード必須）。取り消すと未承認(pending)に戻るが、
  // 「やめる」を押さない限り予定どおり自動投稿される。
  function unapprove(card, token) {
    function go() {
      pendingActs[token] = "pending";
      applyStatus(card, { token: token, status: "pending" });
      toast("承認を取り消しました（やめない限り自動投稿します）");
      jsonp({ api: "act", token: token, action: "unapprove" }).then(function (res) {
        if (res && res.error === "owner") {
          toast("管理者コードが必要です"); delete pendingActs[token];
          applyStatus(card, { token: token, status: "approved" }); lockAdmin(); return;
        }
        var r = (res && res.result) || "";
        if (r === "pending") { pendingActs[token] = "pending"; }
        else if (r.indexOf("locked:") === 0) {
          var cur = r.split(":")[1]; delete pendingActs[token];
          applyStatus(card, { token: token, status: cur }); toast("取り消せませんでした");
        } else { delete pendingActs[token]; load(); }
      }).catch(function () {
        delete pendingActs[token]; toast("通信エラー");
        applyStatus(card, { token: token, status: "approved" });
      });
    }
    if (ADMIN) { go(); return; }
    var code = window.prompt("承認を取り消すには管理者コードを入力してください", "");
    if (code == null) return; code = String(code).trim(); if (!code) return;
    jsonp({ api: "owner", owner: code }).then(function (res) {
      if (res && res.error === "auth") { askKey("確認コードを入力してください", res._gen); return; }
      if (res && res.owner) { ADMIN = code; localStorage.setItem("sb_admin", code); go(); }
      else { toast("管理者コードが違います"); }
    }).catch(function () { toast("通信エラー"); });
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
        askKey("確認コードが違います。もう一度入力してください", data._gen);
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
          if (res && res.error === "auth") { askKey("確認コードを入力してください", res._gen); return; }
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
            if (res && res.error === "auth") askKey("確認コードを入力してください", res._gen);
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
  var galleryTimer = null;
  var pendingPat = {};  // pattern -> 望む状態 "1"/"0"（楽観。サーバ反映までポーリングで戻さない）
  function normOn(v) { return (String(v) !== "0" && String(v).toLowerCase() !== "false") ? "1" : "0"; }

  function galleryCard(it) {
    var card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-pattern", it.pattern);
    var on = String(it.enabled) !== "0" && String(it.enabled).toLowerCase() !== "false";
    var p = it.poster ? ' poster="' + esc(it.poster) + '"' : "";
    var media = it.url
      ? '<div class="mediaWrap"><video class="media" style="' + bg(it.blur) + '" src="' + esc(it.url) + '"' + p +
        ' controls playsinline preload="metadata" onerror="window.__mediaErr&&window.__mediaErr(this)"></video><div class="badge">▶ タップで再生（音が出ます）</div></div>'
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
    pendingPat[key] = on ? "1" : "0";  // ポーリングで戻されないよう保持
    toast(on ? "採用にしました" : "無しにしました");
    jsonp({ api: "pattern", pattern: key, on: on ? 1 : 0 }).then(function (res) {
      if (res && res.error === "owner") { toast("管理者コードが必要です"); delete pendingPat[key]; paintToggle(card, !on); lockAdmin(); return; }
      if (res && res.error) { toast("反映できませんでした"); delete pendingPat[key]; paintToggle(card, !on); }
    }).catch(function () { toast("通信エラー。元に戻します"); delete pendingPat[key]; paintToggle(card, !on); });
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
      if (res && res.error === "auth") { askKey("確認コードを入力してください", res._gen); return; }
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
    // 自分が今押した採用/無し（楽観）はサーバ反映までキープ。追いついたら解除。
    items = items.map(function (it) {
      var want = pendingPat[it.pattern];
      if (want === undefined) return it;
      if (normOn(it.enabled) === want) { delete pendingPat[it.pattern]; return it; }
      var c = {}; for (var k in it) c[k] = it[k]; c.enabled = want; return c;
    });
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
    return jsonp({ api: "patterns" }).then(function (data) {
      if (data && data.error === "auth") { askKey("確認コードを入力してください", data._gen); return loadPatterns(); }
      var items = (data && data.items) || [];
      patternsCacheSet(items);
      renderGallery(items);                                            // 変化が無ければ作り直さない
    }).catch(function (e) {
      if (!hasCards()) galleryEl.innerHTML = '<div class="empty">見本を取得できませんでした。<br><small>' + esc(e.message) + '</small></div>';
    });
  }
  var reportEl = document.getElementById("report");
  var tabReport = document.getElementById("tabReport");
  function startGalleryPoll() { stopGalleryPoll(); galleryTimer = setInterval(loadPatterns, 5000); }
  function stopGalleryPoll() { if (galleryTimer) { clearInterval(galleryTimer); galleryTimer = null; } }
  var currentTab = "feed";
  function loaderFor(name) { return name === "gallery" ? loadPatterns : (name === "report" ? loadReport : load); }
  function switchTo(name) {
    currentTab = name;
    tabFeed.classList.toggle("on", name === "feed");
    tabGallery.classList.toggle("on", name === "gallery");
    if (tabReport) tabReport.classList.toggle("on", name === "report");
    feed.style.display = name === "feed" ? "" : "none";
    galleryEl.style.display = name === "gallery" ? "" : "none";
    if (reportEl) reportEl.style.display = name === "report" ? "" : "none";
    var rmb = document.getElementById("repmodeBar");
    if (rmb) rmb.style.display = name === "report" ? "" : "none";   // レポート時だけ上部固定バー表示
    if (name === "report") updateRepModeBar();
    if (name === "gallery") { galleryLoaded = true; startGalleryPoll(); }
    else { stopGalleryPoll(); }
  }
  // そのタブに表示内容がもうあるか（＝切替時に再読込しなくてよいか）
  function tabHasContent(name) {
    if (name === "gallery") return galleryLoaded;
    if (name === "report") return !!reportData;
    return true;   // 確認は常時ポーリングで最新
  }
  // タブの動き：
  //  ・別のタブ（カテゴリ切替）＝静かに表示するだけ（更新の演出は出さない）。初回だけ読み込む。
  //  ・今開いているのと同じタブを再タップ＝その場で更新（振動＋更新中→✓）
  function selectTab(tab, name, loader) {
    if (tab) { tab.classList.remove("tapped"); void tab.offsetWidth; tab.classList.add("tapped"); }  // 押せた感（1回）
    if (currentTab === name) {
      haptic(18);
      toastBusy("更新中…");
      var done = function () { haptic(8); toast("✓ 最新にしました"); };
      Promise.resolve(loader()).then(done, done);
    } else {
      var had = tabHasContent(name);
      switchTo(name);
      if (!had) loader();   // 初回表示のときだけ読み込む（カテゴリ切替で毎回“更新”しない）
    }
  }
  if (tabFeed) tabFeed.onclick = function () { selectTab(tabFeed, "feed", load); };
  if (tabGallery) tabGallery.onclick = function () { selectTab(tabGallery, "gallery", loadPatterns); };
  if (tabReport) tabReport.onclick = function () { selectTab(tabReport, "report", loadReport); };
  // 上部固定の前日/週間/月間バー（レポート時のみ表示）
  (function () {
    var bar = document.getElementById("repmodeBar");
    if (!bar) return;
    var bs = bar.querySelectorAll(".rm");
    for (var i = 0; i < bs.length; i++) {
      bs[i].onclick = function () {
        var m = this.getAttribute("data-m");
        if (m && m !== repMode) { repMode = m; haptic(10); updateRepModeBar(); if (reportData) renderReport(reportData); }
      };
    }
  })();

  /* ---------- 引っ張って更新（pull-to-refresh）：最上部で下スワイプ→振動→更新 ---------- */
  (function () {
    var ptr = document.getElementById("ptr");
    var appEl = document.getElementById("app");
    if (!ptr || !appEl) return;
    var arrow = ptr.querySelector("i");
    var startY = null, ready = false, busy = false;
    var TRIGGER = 70;   // この距離まで引いたら発動
    function atTop() { return (window.scrollY || document.documentElement.scrollTop || 0) <= 0; }
    function setPull(dy) {
      var y = Math.min(dy * 0.5, 120);        // 抵抗感を出す
      appEl.style.transition = "none";
      appEl.style.transform = "translateY(" + y + "px)";   // 画面の中身も一緒に下がる
      ptr.style.transition = "none";
      ptr.style.opacity = String(Math.min(y / 32, 1));
      ptr.style.transform = "translateY(" + (Math.min(y, 92) - 46) + "px)";   // 開いた隙間にスピナー
      arrow.style.transform = "rotate(" + Math.min(y * 3, 270) + "deg)";
      var nowReady = dy >= TRIGGER;
      if (nowReady && !ready) haptic(12);      // 発動ラインを越えた瞬間に軽く振動
      ready = nowReady;
    }
    function springBack() {
      appEl.style.transition = "transform .3s cubic-bezier(.2,.8,.3,1)";
      appEl.style.transform = "translateY(0)";
      ptr.style.transition = "transform .25s ease, opacity .25s ease";
      ptr.style.opacity = "0"; ptr.style.transform = "translateY(-54px)";
      arrow.style.transform = "";
    }
    function refreshing() {
      busy = true; ptr.classList.add("spin"); arrow.style.transform = "";
      appEl.style.transition = "transform .2s ease";
      appEl.style.transform = "translateY(54px)";          // 更新中は少し開けたまま
      ptr.style.transition = "transform .2s ease, opacity .2s ease";
      ptr.style.opacity = "1"; ptr.style.transform = "translateY(10px)";
    }
    document.addEventListener("touchstart", function (e) {
      if (busy || e.touches.length !== 1 || document.querySelector(".modalOv")) { startY = null; return; }
      startY = atTop() ? e.touches[0].clientY : null;
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (busy || startY == null) return;
      var dy = e.touches[0].clientY - startY;
      if (dy > 0 && atTop()) { e.preventDefault(); setPull(dy); }
      else { startY = null; ready = false; springBack(); }
    }, { passive: false });
    document.addEventListener("touchend", function () {
      if (busy || startY == null) return;
      var go = ready; startY = null; ready = false;
      if (!go) { springBack(); return; }
      haptic(25);                              // 更新確定で“しっかり”振動
      refreshing();
      toastBusy("更新中…");
      var done = function () {
        busy = false; ptr.classList.remove("spin"); springBack();
        haptic(8); toast("✓ 最新にしました");
      };
      Promise.resolve(loaderFor(currentTab)()).then(done, done);
    });
  })();

  /* ---------- レポート（インサイト・全員閲覧可・操作なし） ---------- */
  var reportData = null;
  var repMode = "month";   // 比較期間: week(7日) / biweek(14日) / month(30日)
  var repMetric = "reach"; // 推移グラフの指標: reach / views / pviews / followers
  var REP_METRICS = { reach: "リーチ", views: "閲覧数", pviews: "プロフィール表示", followers: "フォロワー" };
  var repTopPosts = [];    // ベスト投稿（拡大表示用）
  function repDateMs(s) { var t = Date.parse(String(s)); return isNaN(t) ? 0 : t; }
  // 選択期間（win日）でベスト投稿・ストーリーズ平均を集計（週間→7日／14日間→14日／月間→30日）
  function computePostsWindow(pd, win) {
    if (!pd) return { top: [], storyAvg: {}, storyN: 0, feedN: 0 };
    var all = (pd.all && pd.all.length) ? pd.all : (pd.top || []);
    if (!all.length) return { top: pd.top || [], storyAvg: pd.storyAvg || {}, storyN: pd.storyN || 0, feedN: pd.feedN || 0 };
    var cutoff = Date.now() - win * 86400000;
    var inWin = all.filter(function (p) { return repDateMs(p.date) >= cutoff; });
    if (!inWin.length) inWin = all;
    var stories = inWin.filter(function (p) { return p.kind === "story"; });
    var feeds = inWin.filter(function (p) { return p.kind !== "story"; });
    function avg(list, k) { if (!list.length) return 0; var s = 0; for (var i = 0; i < list.length; i++) s += Number(list[i][k]) || 0; return Math.round(s / list.length); }
    function sum(list, k) { var s = 0; for (var i = 0; i < list.length; i++) s += Number(list[i][k]) || 0; return s; }
    function rate(n, d, dp) { return d > 0 ? Math.round(n / d * (dp ? 1000 : 100)) / (dp ? 10 : 1) : null; }
    var top = inWin.slice().sort(function (a, b) { return (Number(b.reach) || 0) - (Number(a.reach) || 0); }).slice(0, 5);
    var stReach = sum(stories, "reach"), feedReach = sum(feeds, "reach");
    var navExit = sum(stories, "navExit");
    var hasNav = (navExit + sum(stories, "navFwd") + sum(stories, "navBack") + sum(stories, "navAuto")) > 0;
    return {
      top: top, storyN: stories.length, feedN: feeds.length,
      storyAvg: { reach: avg(stories, "reach"), views: avg(stories, "views"), navigation: avg(stories, "navigation"), replies: avg(stories, "replies") },
      exitRate: hasNav ? rate(navExit, stReach, false) : null,                                  // 離脱率
      compRate: hasNav ? rate(sum(stories, "navFwd") + sum(stories, "navAuto"), stReach, false) : null,  // 完了率(近似)
      stShareRate: rate(sum(stories, "shares"), stReach, true),
      saveRate: rate(sum(feeds, "saved"), feedReach, true),
      shareRate: rate(sum(feeds, "shares"), feedReach, true)
    };
  }
  // 上部固定の前日/週間/月間バーの表示・選択状態を同期
  function updateRepModeBar() {
    var bar = document.getElementById("repmodeBar");
    if (!bar) return;
    var bs = bar.querySelectorAll(".rm");
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle("on", bs[i].getAttribute("data-m") === repMode);
  }
  // ベスト投稿の拡大表示（画像はそのまま／動画は再生）。タップで閉じる。
  function openPostLightbox(p) {
    if (!p) return;
    haptic(10);
    var ov = document.createElement("div"); ov.className = "lbov";
    var inner;
    if (p.mtype === "video" && p.full) {
      inner = '<video class="lbm" src="' + esc(p.full) + '" controls autoplay playsinline webkit-playsinline loop></video>';
    } else if (p.full || p.thumb) {
      // 一覧で読み込み済みのサムネを即表示→裏で高解像度に差し替え（体感を速く）
      inner = '<img class="lbm" src="' + esc(p.thumb || p.full) + '" alt="" decoding="async">';
    } else {
      inner = '<div class="lbnone">画像を準備中です</div>';
    }
    var link = p.link ? '<a class="lblink" href="' + esc(p.link) + '" target="_blank" rel="noopener">Instagramで開く ↗</a>' : '';
    var meta = '<div class="lbmeta"><b>リーチ ' + fmtN(p.reach) + '</b>　閲覧 ' + fmtN(p.views) +
      (p.kind === "story" ? '　タップ ' + fmtN(p.navigation) + '　返信 ' + fmtN(p.replies)
        : '　いいね ' + fmtN(p.likes) + '　保存 ' + fmtN(p.saved)) + '</div>';
    ov.innerHTML = '<div class="lbbox" onclick="event.stopPropagation()"><button class="lbx">✕</button>' + inner + meta + link + '</div>';
    ov.onclick = function () { close(); };
    function close() { var v = ov.querySelector("video"); if (v) { try { v.pause(); } catch (e) {} } ov.classList.remove("show"); setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 200); }
    ov.querySelector(".lbx").onclick = function (e) { e.stopPropagation(); close(); };
    document.body.appendChild(ov);
    // 画像は高解像度を裏で読み込み、完了したら差し替え（最初はサムネが一瞬で出る）
    if (p.mtype !== "video" && p.full && p.thumb && p.full !== p.thumb) {
      var hi = new Image();
      hi.onload = function () { var im = ov.querySelector("img.lbm"); if (im) im.src = p.full; };
      hi.src = p.full;
    }
    requestAnimationFrame(function () { ov.classList.add("show"); });
  }
  function repAgg(list) {
    if (!list || !list.length) return null;
    var s = { reach: 0, views: 0, pviews: 0, links: 0, eng: 0 };
    var fs = null, fe = null;
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      s.reach += Number(r.reach) || 0; s.views += Number(r.views) || 0;
      s.pviews += Number(r.pviews) || 0; s.links += Number(r.links) || 0; s.eng += Number(r.eng) || 0;
      var f = Number(r.followers) || 0;       // 0/空は「未取得」とみなす（実フォロワーは0にならない）
      if (f > 0) { if (fs === null) fs = f; fe = f; }
    }
    s.followersStart = fs === null ? 0 : fs;
    s.followersEnd = fe === null ? 0 : fe;
    s.n = list.length;
    return s;
  }
  function loadReport() {
    if (!reportEl) return;
    if (!reportData) reportEl.innerHTML = '<div class="rephint">レポートを読み込んでいます…</div>';
    return jsonp({ api: "report" }).then(function (data) {
      if (data && data.error === "auth") { askKey("確認コードを入力してください", data._gen); return; }
      reportData = data || {};
      renderReport(reportData);
    }).catch(function (e) {
      if (!reportData) reportEl.innerHTML = '<div class="rephint">レポートを取得できませんでした。<br>' + esc((e && e.message) || e) + '</div>';
    });
  }
  function fmtN(n) { n = Math.round(Number(n) || 0); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function deltaHtml(cur, prev) {
    if (prev == null || prev === 0) return '<span class="d flat">—</span>';
    var pct = Math.round((cur - prev) / prev * 1000) / 10;
    var cls = pct > 0 ? "up" : (pct < 0 ? "down" : "flat");
    var ar = pct > 0 ? "▲ +" : (pct < 0 ? "▼ " : "± ");
    return '<span class="d ' + cls + '">' + ar + Math.abs(pct) + '%</span>';
  }
  function renderReport(d) {
    var store = CFG.STORE_NAME || "すさび湯三条";
    var head = '<div class="rephd"><div class="t">Instagram インサイトレポート</div><div class="s">' + esc(store) + '　@susabiyu_sanjyo</div>';
    if (!d || !d.days || !d.cur) {
      reportEl.innerHTML = '<div class="repbar"><button id="repReload">↻ 更新</button></div>' +
        '<div class="repdoc">' + head + '</div></div>' +
        '<div class="rephint">データを集計中です。毎日自動で蓄積され、数日たつとレポートが表示されます。<br>30日たつと「直近30日 vs 前30日」の比較が満額になります。</div>';
      var rb0 = document.getElementById("repReload"); if (rb0) rb0.onclick = loadReport;
      return;
    }
    // 比較期間（週間/14日間/月間）を日次データから計算。daily が無い旧GASなら従来値。
    var WIN = repMode === "week" ? 7 : (repMode === "biweek" ? 14 : 30);
    var modeLbl = WIN === 7 ? "週間" : (WIN === 14 ? "14日間" : "月間");
    var perWord = WIN === 7 ? "週" : (WIN + "日");   // 「前週」「前14日」などの語幹
    var cur, prev, series, days, latestDate;
    if (d.daily && d.daily.length) {
      var dly = d.daily;
      var curList = dly.slice(Math.max(0, dly.length - WIN));
      var prevList = dly.slice(Math.max(0, dly.length - 2 * WIN), Math.max(0, dly.length - WIN));
      cur = repAgg(curList) || d.cur; prev = repAgg(prevList);
      series = curList.map(function (r) { return { date: String(r.date), val: Number(r[repMetric]) || 0 }; });
      days = curList.length;
      latestDate = curList.length ? String(curList[curList.length - 1].date) : (d.latestDate || "");
    } else {
      cur = d.cur; prev = d.prev || {}; series = (d.series || []).map(function (s) { return { date: String(s.date), val: Number(s.reach) || 0 }; }); days = d.days; latestDate = d.latestDate;
    }
    prev = prev || {};
    var fNet = cur.followersEnd - cur.followersStart;
    var pNet = (prev && prev.followersEnd != null) ? (prev.followersEnd - prev.followersStart) : null;
    function p_(k) { return (prev && prev[k] != null) ? prev[k] : null; }
    function kpi(label, c, p, metric, opts) {
      opts = opts || {};
      var vs = (opts.plus && c > 0 ? "+" : "") + fmtN(c);
      var ps = p == null ? null : ((opts.plus && p > 0 ? "+" : "") + fmtN(p));
      var on = metric === repMetric ? " on" : "";
      return '<div class="repkpi tap' + on + '" data-metric="' + metric + '"><div class="l">' + esc(label) + '</div><div class="v">' + vs +
        (opts.sub ? ' <small>' + esc(opts.sub) + '</small>' : '') + '</div>' + deltaHtml(c, p) +
        (ps != null ? '<div class="prev">前期間 ' + ps + '</div>' : '') + '</div>';
    }
    var kpis = kpi("リーチ", cur.reach, p_("reach"), "reach") + kpi("閲覧数", cur.views, p_("views"), "views") +
      kpi("プロフィール表示", cur.pviews, p_("pviews"), "pviews") +
      kpi("フォロワー純増", fNet, pNet, "followers", { plus: true, sub: "計 " + fmtN(cur.followersEnd) });
    var vals = (series || []).map(function (s) { return Number(s.val) || 0; });
    var mx = Math.max.apply(null, vals.concat([1]));
    var bars = series.map(function (s) {
      var v = Number(s.val) || 0;
      return '<i style="height:' + Math.max(2, Math.round(v / mx * 100)) + '%" data-d="' + esc(String(s.date)) + '" data-v="' + v + '"></i>';
    }).join("");
    var trendLbl = (REP_METRICS[repMetric] || "リーチ") + "の推移（日別）";
    var firstD = vals.length ? series[0].date.slice(5) : "", lastD = vals.length ? series[series.length - 1].date.slice(5) : "";
    function pctOf(c, p) { return (p == null || p === 0) ? null : Math.round((c - p) / p * 1000) / 10; }
    var reachPct = pctOf(cur.reach, p_("reach"));
    var linkRate = cur.pviews ? Math.round(cur.links / cur.pviews * 1000) / 10 : null;
    // 投稿（ストーリーズ/フィード）を選択期間に連動（週間→直近7日／14日間→直近14日／月間→直近30日）
    var pd = d.posts;
    var bestWin = WIN;
    var bestLbl = "直近" + WIN + "日";
    var pwin = computePostsWindow(pd, bestWin);
    repTopPosts = pwin.top;
    function fmtPost(p, i) {
      var badge = p.kind === "story" ? "ストーリーズ" : (p.kind === "reel" ? "リール" : "フィード");
      var cap = p.caption ? esc(String(p.caption).slice(0, 38)) : "（キャプションなし）";
      var sub = p.kind === "story"
        ? ("閲覧 " + fmtN(p.views) + "・タップ " + fmtN(p.navigation) + "・返信 " + fmtN(p.replies))
        : ("閲覧 " + fmtN(p.views) + "・いいね " + fmtN(p.likes) + "・保存 " + fmtN(p.saved));
      var img = p.thumb || p.full || "";
      var thumb = img ? '<img class="rt" src="' + esc(img) + '" alt="" loading="lazy" crossorigin="anonymous" onerror="this.style.display=\'none\'">' : '<div class="rt none">🍶</div>';
      var play = (p.mtype === "video") ? '<span class="rtplay">▶</span>' : '';
      return '<div class="reppost tap" data-pi="' + i + '"><div class="rtwrap">' + thumb + play + '</div><div class="ri">' +
        '<div class="rl"><span class="rb ' + esc(p.kind) + '">' + badge + '</span>' +
        '<span class="rd">' + esc(p.date) + '</span></div>' +
        '<div class="rc">' + cap + '</div>' +
        '<div class="rr"><b>リーチ ' + fmtN(p.reach) + '</b><small>' + sub + '</small></div>' +
        '</div></div>';
    }
    var postsHtml = "";
    if (pwin.top && pwin.top.length) {
      var sa = pwin.storyAvg || {};
      var storyKpis = pwin.storyN ? ('<div class="repkpis">' +
        '<div class="repkpi"><div class="l">平均リーチ</div><div class="v">' + fmtN(sa.reach) + '</div></div>' +
        '<div class="repkpi"><div class="l">平均閲覧</div><div class="v">' + fmtN(sa.views) + '</div></div>' +
        '<div class="repkpi"><div class="l">平均タップ</div><div class="v">' + fmtN(sa.navigation) + '</div></div>' +
        '<div class="repkpi"><div class="l">平均返信</div><div class="v">' + fmtN(sa.replies) + '</div></div>' +
        '</div>') : "";
      // 離脱率/完了率・保存率/シェア率（データが揃った分だけ表示）
      var rateChips = [];
      if (pwin.compRate != null) rateChips.push('<span class="rchip good">完了率 ' + pwin.compRate + '%</span>');
      if (pwin.exitRate != null) rateChips.push('<span class="rchip warn">離脱率 ' + pwin.exitRate + '%</span>');
      if (pwin.saveRate != null) rateChips.push('<span class="rchip">投稿 保存率 ' + pwin.saveRate + '%</span>');
      if (pwin.shareRate != null) rateChips.push('<span class="rchip">投稿 シェア率 ' + pwin.shareRate + '%</span>');
      var rateBox = rateChips.length ? ('<div class="repsec"><h3>反応の質（' + bestLbl + '）</h3><div class="rchips">' + rateChips.join("") +
        '</div><div class="repnote"><b>完了率</b>＝ストーリーズを離脱せず最後（次へ送り・自動送り含む）まで見られた割合の目安。<b>離脱率</b>＝途中で閉じられた割合。完了率が高く・離脱率が低いほど良い。保存率／シェア率＝投稿が保存・拡散された割合（口コミの起点）。</div></div>') : "";
      postsHtml =
        (pwin.storyN ? '<div class="repsec"><h3>ストーリーズの反応（' + bestLbl + '・1本あたり平均）</h3>' + storyKpis +
          '<div class="repnote">' + pwin.storyN + '本の平均。タップ＝次へ/前へ/外部リンク等の操作数。</div></div>' : "") +
        rateBox +
        '<div class="repsec"><h3>ベスト投稿 TOP' + pwin.top.length + '（' + bestLbl + '・リーチ順）</h3><div class="repposts">' +
        pwin.top.map(fmtPost).join("") + '</div></div>';
    }

    // ---- 分析・まとめ（期間ごとの実数値で具体化）----
    var good = [], warn = [], act = [];
    var cmpWord = "前" + perWord + "比";
    var viewsPct = pctOf(cur.views, p_("views"));
    var pviewsPct = pctOf(cur.pviews, p_("pviews"));
    var bestDay = "", bestDayV = -1;
    for (var bi = 0; bi < series.length; bi++) { if ((Number(series[bi].val) || 0) > bestDayV) { bestDayV = Number(series[bi].val) || 0; bestDay = series[bi].date; } }
    var metricLbl = REP_METRICS[repMetric] || "リーチ";
    // リーチの増減
    if (reachPct != null) {
      if (reachPct > 0) good.push(modeLbl + "のリーチは <b>" + fmtN(cur.reach) + "</b>（" + cmpWord + " <b>+" + reachPct + "%</b>）。露出が伸びています。");
      else if (reachPct < 0) warn.push(modeLbl + "のリーチは <b>" + fmtN(cur.reach) + "</b>（" + cmpWord + " <b>" + reachPct + "%</b>）。投稿の時間帯・内容を見直し。");
      else good.push(modeLbl + "のリーチは <b>" + fmtN(cur.reach) + "</b>（" + cmpWord + " 横ばい）。");
    } else {
      good.push(modeLbl + "のリーチは <b>" + fmtN(cur.reach) + "</b>。比較は前期間のデータが揃うと表示されます。");
    }
    if (bestDay) good.push("最も伸びた日は <b>" + esc(bestDay.slice(5)) + "</b>（" + metricLbl + " <b>" + fmtN(bestDayV) + "</b>）。この日の内容・時間を再現したい。");
    if (cur.reach) { var vr = Math.round(cur.views / cur.reach * 10) / 10; if (vr >= 1.5) good.push("1人あたり約 <b>" + vr + "回</b>見られています（リピート視聴が良好）。"); }
    // プロフィール表示・誘導率
    if (pviewsPct != null && pviewsPct < 0) warn.push("プロフィール表示が " + cmpWord + " <b>" + pviewsPct + "%</b>。1枚目の訴求と固定リンクを強化。");
    if (linkRate != null) { if (linkRate < 4) warn.push("誘導率（リンク÷プロフ表示）が <b>" + linkRate + "%</b> と低め。予約リンクを毎回明示。"); else good.push("誘導率 <b>" + linkRate + "%</b>。プロフィールから行動につながっています。"); }
    // フォロワー
    if (fNet > 0) good.push("フォロワー <b>+" + fNet + "</b>（計 " + fmtN(cur.followersEnd) + "）。");
    else if (pNet != null) warn.push("フォロワー純増 <b>" + fNet + "</b>。投稿頻度・導線を確認。");
    // ストーリーズのタップ率
    var tapRate = (pwin.storyN && pwin.storyAvg && pwin.storyAvg.reach) ? Math.round(pwin.storyAvg.navigation / pwin.storyAvg.reach * 100) : null;
    if (tapRate != null) {
      good.push("ストーリーズ平均リーチ <b>" + fmtN(pwin.storyAvg.reach) + "</b>／タップ率 <b>" + tapRate + "%</b>（" + bestLbl + "・" + pwin.storyN + "本）。");
      if (tapRate < 30) warn.push("ストーリーズのタップ率が <b>" + tapRate + "%</b> と低め。1枚目を強い引き＋リンク明確に。");
    }
    // 離脱率/完了率（データが揃った分だけ）
    if (pwin.exitRate != null) {
      if (pwin.compRate != null) good.push("ストーリーズ完了率 <b>" + pwin.compRate + "%</b>／離脱率 <b>" + pwin.exitRate + "%</b>。");
      if (pwin.exitRate >= 40) { warn.push("離脱率が <b>" + pwin.exitRate + "%</b> と高め。冒頭2秒で内容が伝わる構成に。"); act.push("ストーリーズ1枚目を<b>結論ファースト</b>（何の告知か一目で）にして離脱を減らす。"); }
    }
    // 保存率/シェア率
    if (pwin.saveRate != null && pwin.saveRate >= 1) good.push("投稿の保存率 <b>" + pwin.saveRate + "%</b>。保存される＝後で来店検討の良い兆候。");
    if ((pwin.saveRate != null && pwin.saveRate < 0.5) && (pwin.shareRate != null && pwin.shareRate < 0.5)) act.push("<b>保存版（メニュー一覧・コース内容）</b>を増やし、保存・シェアを促す。");
    if (pwin.top && pwin.top.length) {
      var bp = pwin.top[0];
      good.push("ベストは" + (bp.kind === "story" ? "ストーリーズ" : "投稿") + "（" + esc(String(bp.date).slice(5)) + "・リーチ <b>" + fmtN(bp.reach) + "</b>）。");
    }
    // 今後の施策（データ連動・期間別）
    if (linkRate != null && linkRate < 4) act.push("各投稿に<b>予約リンク</b>を必ず明示し、誘導率 " + linkRate + "% の底上げを狙う。");
    if (tapRate != null && tapRate < 30) act.push("ストーリーズ1枚目を<b>料理ドアップ＋一言</b>にしてタップ率UP。");
    if (reachPct != null && reachPct < 0) act.push("反応が落ちた" + modeLbl + "。<b>投稿時間</b>を反応の良い曜日・時間に寄せる。");
    if (bestDay) act.push("伸びた <b>" + esc(bestDay.slice(5)) + "</b> の型（内容・時間帯）を<b>再現</b>する。");
    if (fNet <= 0 && pNet != null) act.push("保存・シェアされやすい<b>保存版（まとめ）投稿</b>を増やしてフォロー転換を狙う。");
    if (!act.length) act.push("好調を維持。伸びた投稿の型を<b>横展開</b>し、頻度を保つ。");
    if (!good.length) good.push(modeLbl + "のデータを蓄積中。日数が増えるほど精度が上がります。");
    if (!warn.length) warn.push(modeLbl + "では大きな課題は見当たりません。継続して様子を見ましょう。");
    function lis(a) { return a.map(function (x) { return "<li>" + x + "</li>"; }).join(""); }
    var cmpLbl = "前" + perWord + "と比較";
    var period = '<div class="p">' + modeLbl + '（直近' + days + '日' + (latestDate ? '〜' + esc(latestDate) : '') + '）' +
      '<small>' + ((pNet != null || p_("reach") != null) ? cmpLbl : 'データ蓄積中（30日で比較が満額に）') + '</small></div>';
    updateRepModeBar();   // 上部固定の前日/週間/月間バーの表示を同期
    reportEl.innerHTML =
      '<div class="repbar"><button id="repReload">↻ 更新</button><button id="repPdf" class="pdf">📄 PDFで保存（A4）</button></div>' +
      '<div class="rephint">この画面は誰でも閲覧できます（操作はありません）。PDFはA4資料として保存できます。</div>' +
      '<div class="repdoc">' + head + period + '</div>' +
      '<div class="repsec"><h3>アカウント全体</h3><div class="repkpis">' + kpis + '</div></div>' +
      '<div class="repsec"><h3>' + esc(trendLbl) + '</h3><div class="repchart"><div class="repbars">' + bars + '</div><div class="reptip"></div></div><div class="repax"><span>' + firstD + '</span><span>' + lastD + '</span></div><div class="repnote">KPIをタップで指標を切替／グラフを指でなぞると日付と数値が出ます。</div></div>' +
      postsHtml +
      '<div class="repsec repbreak"><h3>分析・まとめ（' + esc(modeLbl) + '）</h3><div class="repanal">' +
        '<div class="repcard good"><h4>強み・良かった点</h4><ul>' + lis(good) + '</ul></div>' +
        '<div class="repcard warn"><h4>反省点・課題</h4><ul>' + lis(warn) + '</ul></div>' +
        '<div class="repcard act"><h4>今後の施策</h4><ul>' + lis(act) + '</ul></div>' +
      '</div></div>' +
      '<div class="repfoot">データ元：Instagram Graph API（毎日自動収集）／分析は数値から自動生成</div></div>';
    var rb = document.getElementById("repReload"); if (rb) rb.onclick = loadReport;
    var pb = document.getElementById("repPdf"); if (pb) pb.onclick = downloadReportPdf;
    // KPIタップ＝推移グラフの指標を切替
    var kps = reportEl.querySelectorAll(".repkpi.tap");
    for (var ik = 0; ik < kps.length; ik++) {
      kps[ik].onclick = function () {
        var mt = this.getAttribute("data-metric");
        if (mt && mt !== repMetric) { repMetric = mt; haptic(10); if (reportData) renderReport(reportData); }
      };
    }
    // ベスト投稿タップ＝拡大表示（画像/動画）
    var posts = reportEl.querySelectorAll(".reppost.tap");
    for (var ip = 0; ip < posts.length; ip++) {
      posts[ip].onclick = function () {
        var pi = parseInt(this.getAttribute("data-pi"), 10);
        if (!isNaN(pi) && repTopPosts[pi]) openPostLightbox(repTopPosts[pi]);
      };
    }
    wireChartScrub();
  }
  // リーチ推移グラフ：指でなぞると、その日の「日付＋リーチ数」を吹き出し表示（ドラッグでスクラブ）
  function wireChartScrub() {
    var chart = reportEl.querySelector(".repchart");
    if (!chart) return;
    var barsEl = chart.querySelector(".repbars");
    var tip = chart.querySelector(".reptip");
    var lastIdx = -1;
    function showAt(clientX) {
      var bs = barsEl.querySelectorAll("i");
      if (!bs.length) return;
      var rect = barsEl.getBoundingClientRect();
      var idx = Math.floor((clientX - rect.left) / rect.width * bs.length);
      idx = Math.max(0, Math.min(bs.length - 1, idx));
      if (idx !== lastIdx) { haptic(6); lastIdx = idx; }   // 隣の日に移るたび軽く振動
      for (var i = 0; i < bs.length; i++) { if (i === idx) bs[i].classList.add("hot"); else bs[i].classList.remove("hot"); }
      var b = bs[idx], br = b.getBoundingClientRect();
      tip.innerHTML = '<b>' + fmtN(Number(b.getAttribute("data-v"))) + '</b><span>' + esc(b.getAttribute("data-d")) + '</span>';
      tip.style.display = "block";
      var cx = br.left + br.width / 2 - rect.left;
      tip.style.left = Math.max(34, Math.min(rect.width - 34, cx)) + "px";
    }
    function hide() {
      tip.style.display = "none"; lastIdx = -1;
      var hot = barsEl.querySelectorAll("i.hot");
      for (var i = 0; i < hot.length; i++) hot[i].classList.remove("hot");
    }
    chart.addEventListener("touchstart", function (e) { e.stopPropagation(); e.preventDefault(); showAt(e.touches[0].clientX); }, { passive: false });
    chart.addEventListener("touchmove", function (e) { e.stopPropagation(); e.preventDefault(); showAt(e.touches[0].clientX); }, { passive: false });
    chart.addEventListener("touchend", hide);
    chart.addEventListener("touchcancel", hide);
    chart.addEventListener("mousedown", function (e) { showAt(e.clientX); });
    chart.addEventListener("mousemove", function (e) { if (e.buttons) showAt(e.clientX); });
    chart.addEventListener("mouseup", hide);
    chart.addEventListener("mouseleave", hide);
  }
  function loadScriptOnce(src, cb) {
    var s = document.createElement("script"); s.src = src;
    s.onload = cb; s.onerror = function () { toast("PDFライブラリの読込に失敗"); };
    document.head.appendChild(s);
  }
  function downloadReportPdf() {
    var src = reportEl.querySelector(".repdoc");
    if (!src) { toast("レポートがありません"); return; }
    function go() {
      if (!window.html2pdf) { toast("PDF生成に失敗"); return; }
      toast("PDFを作成中…");
      var holder = document.createElement("div");
      holder.style.cssText = "position:fixed;left:-99999px;top:0;width:794px;background:#fff";
      var clone = src.cloneNode(true); clone.classList.add("a4");
      holder.appendChild(clone); document.body.appendChild(holder);
      window.html2pdf().set({
        // 左右マージンは0（幅794px=A4 210mmぴったり）。これで右端がページ外に切れない。
        // 上下のみ6mm。左右の余白は .repdoc.a4 のセクションpaddingで内側に確保している。
        margin: [6, 0, 6, 0],
        filename: "susabiyu_insight_" + ((reportData && reportData.latestDate) || "report") + ".pdf",
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true, width: 794, windowWidth: 794, x: 0, scrollX: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        // 1枚目＝ダッシュボード、2枚目＝分析・まとめ（.repbreak で改ページ）。カード途中での分断は避ける。
        pagebreak: { mode: ["css", "legacy"], before: ".repbreak", avoid: [".repsec", ".reppost", ".repkpi", ".repcard"] }
      }).from(clone).save().then(function () { holder.remove(); }).catch(function () { holder.remove(); toast("PDF作成に失敗"); });
    }
    if (window.html2pdf) go();
    else loadScriptOnce("https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.3/dist/html2pdf.bundle.min.js", go);
  }
  // 画像/動画が読み込めなかった枠をタップ → その場で再取得
  if (feed) feed.addEventListener("click", function (e) {
    var w = e.target && e.target.closest && e.target.closest(".mediaWrap.mediaerr");
    if (w) { toast("再読み込みします"); load(); }
  });
  if (galleryEl) galleryEl.addEventListener("click", function (e) {
    var w = e.target && e.target.closest && e.target.closest(".mediaWrap.mediaerr");
    if (w) { toast("再読み込みします"); loadPatterns(); }
  });

  /* ---------- 店舗屋号をタイトルに ---------- */
  (function setStoreName() {
    var el = document.getElementById("storeName");
    var name = (CFG.STORE_NAME || "").trim();
    if (el && name) { el.textContent = name; }
    if (name) { document.title = name; }
  })();

  /* ---------- アイコンのバッジをクリア（開いた＝未読を見た） ---------- */
  function clearBadge() {
    try { if (navigator.clearAppBadge) navigator.clearAppBadge(); } catch (e) {}
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (reg) {
        var sw = reg.active || (navigator.serviceWorker && navigator.serviceWorker.controller);
        if (sw) sw.postMessage({ type: "clearBadge" });
      }).catch(function () {});
    }
  }

  /* ---------- boot ---------- */
  load().then(function () { setRate(POLL); focusCard(getParam("focus")); });
  clearBadge();
  window.addEventListener("focus", clearBadge);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      poll();  // 復帰したら即同期
      clearBadge();
      if (galleryEl && galleryEl.style.display !== "none") { loadPatterns(); startGalleryPoll(); }
    } else { stopGalleryPoll(); }
  });
  if ("serviceWorker" in navigator && navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("message", function (ev) {
      if (ev.data && ev.data.type === "focus") { poll(); focusCard(ev.data.token); }
    });
  }
  maybeIosHint();
  refreshPushBtn();
  // 見本を起動後すぐ裏で先読み（隠れたまま組み立て）→ 初回タップでも即表示。フィード表示を優先して遅延。
  setTimeout(function () { if (KEY && !galleryLoaded) { galleryLoaded = true; loadPatterns(); } }, 1200);
})();
