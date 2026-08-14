// ===== すさび湯 投稿事前承認 GAS Web App =====
// 列: A=token B=日時 C=slot D=pattern E=プレビューURL F=caption G=種別 H=status I=更新 J=picked K=redo回数
// このファイルで コード.gs を「全選択して丸ごと」置き換えてください（重複なしの完全版）。

const SHEET_ID = '13zKaUblOwmgZ-lgCfxylCLlW2Fqutqct5h5TvMRWv30';
const TAB = '承認待ち';

// PWAのパスコード（お好みで変更可。PWA初回に1度入力。空欄なら認証なし）
const APP_KEY = '8888';

// 管理者コード（見本の「採用/無し」を変更できる人だけが知るコード）。
// APP_KEY(確認コード)とは別物。空にすると誰でも変更可。必ず自分だけが知る値に変更してください。
const OWNER_KEY = '88888';

// Web Push購読の保存先タブ
const PUSH_TAB = '購読';

// 見本ギャラリー（採用/無し）の保存先タブ
const PATTERN_TAB = 'パターン';

// ===== GitHub（作り直しdispatch用）=====
// GH_TOKEN はGASの「プロジェクトの設定→スクリプト プロパティ」に GH_TOKEN として登録（コードに置かない）。
const GH_TOKEN = PropertiesService.getScriptProperties().getProperty('GH_TOKEN') || '';
const GH_OWNER = 'amami-cell';
const GH_REPO  = 'susabiyu-ig-auto';
const GH_WORKFLOW = 'redo.yml';
const GH_REF   = 'main';

// 承認待ちタブ名（account 空＝三条＝「承認待ち」、店舗別＝「承認待ち_<account>」）。
function _tabName_(account) { return TAB + (account ? '_' + account : ''); }
function _sheet_(account) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const name = _tabName_(account || '');
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(['token','日時','スロット','パターン','プレビュー','キャプション','種別','ステータス','更新時刻','picked','redo']);
  }
  return sh;
}

// "2026-06-26 18:00" → Date（JST想定）
function _parseJst_(s) {
  s = String(s).trim();
  const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4]-9, +m[5], 0));
}

function getPending_(account) {
  const sh = _sheet_(account || '');
  const data = sh.getDataRange().getValues();
  const now = new Date();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const st = String(r[7]);
    // 待ち(pending/redo)に加え、承認済み(approved)も表示してキープ。投稿済み(posted)/取りやめ(rejected)は出さない
    if (st !== 'pending' && st !== 'redo' && st !== 'approved') continue;
    const dt = _parseJst_(r[1]);
    // 過去すぎるものは隠す。承認済みも、予定時刻を大きく過ぎたら隠す（投稿済み/失敗の残骸を確認画面から消す）
    if (dt) {
      const _ago = now.getTime() - dt.getTime();
      if (st === 'approved') { if (_ago > 2 * 3600 * 1000) continue; }
      else { if (_ago > 60 * 1000) continue; }
    }
    out.push({
      token: String(r[0]),
      timeRaw: String(r[1]),
      dt: dt,
      slot: r[2],
      pattern: String(r[3]),
      url: String(r[4] || ''),
      caption: String(r[5] || ''),
      kind: String(r[6] || ''),
      poster: String(r[11] || ''),
      blur: String(r[12] || ''),
      status: st
    });
  }
  out.sort(function(a,b){
    const ta = a.dt ? a.dt.getTime() : 0, tb = b.dt ? b.dt.getTime() : 0;
    return ta - tb;
  });
  return out;
}

// ===== 楽観ロック付き setStatus =====
function setStatus(token, action, account) {
  account = account || '';
  const map = { ok: 'approved', redo: 'redo', cancel: 'rejected' };
  const st = map[action] || 'rejected';
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(8000); // 同時押下を直列化（最大8秒待つ）
  } catch (e) {
    return 'busy';
  }
  try {
    const sh = _sheet_(account);
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(token)) {
        const cur = String(data[i][7]);
        if (action === 'unapprove') {
          if (cur !== 'approved') return 'locked:' + cur;  // 承認済みのときだけ取消可
          sh.getRange(i + 1, 8).setValue('pending');        // 未承認に戻す（やめない限り自動投稿は継続）
          sh.getRange(i + 1, 9).setValue(new Date());
          _cacheBust_(account);
          return 'pending';
        }
        if (cur !== 'pending' && cur !== 'redo') {
          return 'locked:' + cur;
        }
        if (cur === 'redo' && action === 'redo') {
          return 'locked:redo';
        }
        const when = String(data[i][1]);
        sh.getRange(i + 1, 8).setValue(st);
        sh.getRange(i + 1, 9).setValue(new Date());
        _cacheBust_(account);
        if (action === 'redo' && when) {
          try { _dispatchRedo_(when, account); } catch (e) {}
        }
        return st;
      }
    }
    return 'notfound';
  } finally {
    lock.releaseLock();
  }
}

// ===== キャッシュ層 =====
const _CACHE_KEY_ = 'susabiyu_states_v6';
const _CACHE_SEC_  = 25;

function _buildSnapshot_(account) {
  const sh = _sheet_(account || '');
  const data = sh.getDataRange().getValues();
  const states = {};
  let sig = '';
  for (let i = 1; i < data.length; i++) {
    const tk = String(data[i][0]);
    if (!tk) continue;
    const st = String(data[i][7]);
    const url = String(data[i][4] || '');
    states[tk] = {
      status: st,
      url: url,
      kind: String(data[i][6] || ''),
      caption: String(data[i][5] || ''),
      pattern: String(data[i][3] || ''),
      poster: String(data[i][11] || ''),
      blur: String(data[i][12] || '')
    };
    sig += tk + ':' + st + ':' + url.slice(0, 24) + '|';
  }
  return { sig: sig, states: states };
}

function _cacheKey_(account) { return _CACHE_KEY_ + (account ? '_' + account : ''); }
function _snapshot_(account) {
  account = account || '';
  const key = _cacheKey_(account);
  const cache = CacheService.getScriptCache();
  const hit = cache.get(key);
  if (hit) {
    try { return JSON.parse(hit); } catch (e) {}
  }
  const snap = _buildSnapshot_(account);
  try { cache.put(key, JSON.stringify(snap), _CACHE_SEC_); } catch (e) {}
  return snap;
}

function _cacheBust_(account) {
  try { CacheService.getScriptCache().remove(_cacheKey_(account || '')); } catch (e) {}
}

function getSig(account) {
  return _snapshot_(account || '').sig;
}

function getStates(tokensJson, account) {
  let tokens;
  try { tokens = JSON.parse(tokensJson); } catch (e) { tokens = []; }
  const want = {};
  tokens.forEach(function(t){ want[String(t)] = true; });
  const snap = _snapshot_(account || '');
  const res = {};
  for (const tk in snap.states) {
    if (want[tk]) res[tk] = snap.states[tk];
  }
  return JSON.stringify({ sig: snap.sig, states: res });
}

// 作り直しdispatch。account 空＝三条 redo.yml。店舗別は該当ワークフローへ（ぎふや=gifuya_post.yml、
// datetime を渡すと post_approved が redo枠を再生成する）。未登録店舗は redo_scan の定期処理に委ねる。
const _REDO_WORKFLOW_BY_ACCOUNT = { 'gifuyatenjin': 'gifuya_post.yml' };
function _dispatchRedo_(datetimeStr, account) {
  if (!GH_TOKEN || GH_TOKEN === 'ここにPATを貼る') return;
  const wf = account ? (_REDO_WORKFLOW_BY_ACCOUNT[account] || '') : GH_WORKFLOW;
  if (!wf) return;   // 店舗にdispatch先が無ければ定期 redo_scan に任せる
  const url = 'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO +
              '/actions/workflows/' + wf + '/dispatches';
  const payload = JSON.stringify({ ref: GH_REF, inputs: { datetime: datetimeStr } });
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + GH_TOKEN,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: payload,
    muteHttpExceptions: true
  });
}

function saveUrl() {
  const url = ScriptApp.getService().getUrl();
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let cf = ss.getSheetByName('Config');
  if (!cf) { cf = ss.insertSheet('Config'); }
  cf.getRange('A14').setValue('承認URL');
  cf.getRange('B14').setValue(url);
  return url;
}

function _isVideo_(url, kind) {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.indexOf('.mp4') >= 0 || u.indexOf('.mov') >= 0 || u.indexOf('.webm') >= 0) return true;
  if (kind === 'video') return true;
  return false;
}

function _patJa_(p) {
  const m = { sushi:'王道', tempo:'賑やか', typo:'雑誌風', photo:'全画面', simple:'額装', caption:'写真キャプション' };
  return m[p] || p;
}

function _remain_(dt) {
  if (!dt) return '';
  const now = new Date();
  let ms = dt.getTime() - now.getTime();
  if (ms <= 0) return 'まもなく投稿';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const mn = totalMin % 60;
  if (h > 0) return 'あと' + h + '時間' + mn + '分で投稿';
  return 'あと' + mn + '分で投稿';
}

// メディアHTML（体感速度を最大化）:
//  ・blur(極小ぼかし)を背景に即時表示 → ネット待ちゼロで中身が見える
//  ・本体のフル解像度は裏で読み込み、載ったら自動で差し替わる（鮮明度は落ちない）
//  ・先頭カードだけ eager + 高優先で取得、残りは遅延
//  ・動画はタップまで本体を読み込まない（ポスター＋ぼかしで先出し）
function _bg_(blur) {
  return blur ? ' style="background:#000 url(\'' + blur + '\') center center / cover no-repeat"' : ' style="background:#000"';
}
function _mediaHtml_(url, kind, poster, blur, eager) {
  if (_isVideo_(url, kind)) {
    var p = poster ? ' poster="' + poster + '"' : '';
    return '<video class="media"' + _bg_(blur) + ' src="' + url + '"' + p + ' controls playsinline preload="none"></video>' +
           '<div class="badge">▶ タップで再生（音が鳴ります）</div>';
  } else if (url) {
    var ld = eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"';
    return '<img class="media"' + _bg_(blur) + ' src="' + url + '" alt="preview"' + ld + ' decoding="async">';
  }
  return '<div class="noimg">プレビューなし</div>';
}

// ===== PWA(別ホスト)用 JSONP API =====
// PWAは別オリジンなので fetch だとCORSで弾かれる。<script>経由のJSONPで回避する。
// GASのデプロイは「アクセスできるユーザー: 全員（匿名含む）」にすること。
function _jsonp_(cb, obj) {
  var body = JSON.stringify(obj);
  if (cb) body = cb + "(" + body + ")";
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
function _apiList_(account) {
  var items = getPending_(account || '').map(function (it) {
    return {
      token: it.token, when: it.timeRaw,
      pattern: it.pattern, patternJa: _patJa_(it.pattern),
      kind: _isVideo_(it.url, it.kind) ? "video" : "still",
      url: it.url, poster: it.poster, blur: it.blur,
      caption: it.caption, status: it.status,
      remain: _remain_(it.dt)
    };
  });
  return { sig: getSig(account || ''), items: items };
}
function _saveSub_(subB64, prefs, ep, account) {
  if (!subB64) return "no-sub";
  var json;
  // \u7aef\u672b\u304b\u3089\u306f JSON\u6587\u5b57\u5217 or base64 \u306e\u3069\u3061\u3089\u3067\u3082\u53d7\u3051\u308b\uff08\u304e\u3075\u3084\u30a2\u30d7\u30ea\u306fJSON\u6587\u5b57\u5217\u3067\u9001\u308b\uff09\u3002
  try {
    if (subB64.charAt(0) === "{") json = subB64;
    else json = Utilities.newBlob(Utilities.base64Decode(subB64)).getDataAsString("UTF-8");
  } catch (e) { return "decode-error"; }
  var endpoint = ep || "";
  try { endpoint = (JSON.parse(json).endpoint) || endpoint; } catch (e) {}
  if (!endpoint) return "bad-sub";
  var pf = _normPrefs_(prefs);
  if (pf === null) pf = "";
  var tab = PUSH_TAB + (account ? ("_" + String(account).trim()) : "");
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(tab);
  if (!sh) { sh = ss.insertSheet(tab); sh.appendRow(["endpoint", "subscription", "\u767b\u9332\u6642\u523b", "\u901a\u77e5\u8a2d\u5b9a"]); }
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === endpoint) {
      sh.getRange(i + 1, 2).setValue(json);
      sh.getRange(i + 1, 3).setValue(new Date());
      if (pf) sh.getRange(i + 1, 4).setValue(pf);
      return "updated";
    }
  }
  sh.appendRow([endpoint, json, new Date(), pf || '{"ig":1,"confirm":1,"redo":1}']);
  return "added";
}

// notif prefs (subscription tab col D). prefs = JSON {ig,confirm,redo}
function _setNotifPrefs_(ep, prefs, account) {
  if (!ep) return "no-ep";
  var pf = _normPrefs_(prefs);
  if (!pf) return "bad-prefs";
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(PUSH_TAB + (account ? ("_" + String(account).trim()) : ""));
  if (!sh) return "no-tab";
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(ep)) { sh.getRange(i + 1, 4).setValue(pf); return "updated"; }
  }
  return "notfound";
}

// prefs -> {ig,confirm,redo} 0/1 (missing = ON=1; invalid = null)
function _normPrefs_(prefs) {
  if (!prefs) return "";
  var o;
  try { o = JSON.parse(prefs); } catch (e) { return null; }
  if (!o || typeof o !== "object") return null;
  function b(v) { return (String(v) === "0" || v === false) ? 0 : 1; }
  var r = {
    ig: b(o.ig === undefined ? 1 : o.ig),
    confirm: b(o.confirm === undefined ? 1 : o.confirm),
    redo: b(o.redo === undefined ? 1 : o.redo)
  };
  return JSON.stringify(r);
}

// ===== 見本ギャラリー：パターン一覧／採用トグル =====
function _apiPatterns_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(PATTERN_TAB);
  if (!sh) return { items: [] };
  var data = sh.getDataRange().getValues();
  // 列: A=pattern B=label C=url D=poster E=blur F=enabled G=updated
  var items = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var key = String(r[0] || '').trim();
    if (!key) continue;
    var en = (r.length > 5 && String(r[5]).trim() !== '') ? String(r[5]).trim().toLowerCase() : '1';
    items.push({
      pattern: key,
      label: String(r[1] || key),
      url: String(r[2] || ''),
      poster: String(r[3] || ''),
      blur: String(r[4] || ''),
      enabled: (en === '0' || en === 'false' || en === 'no' || en === 'off') ? 0 : 1
    });
  }
  return { items: items };
}

function _setPattern_(key, on) {
  if (!key) return 'no-key';
  var val = (String(on) === '0' || String(on).toLowerCase() === 'false') ? 0 : 1;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(8000); } catch (e) { return 'busy'; }
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName(PATTERN_TAB);
    if (!sh) return 'no-tab';
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(key).trim()) {
        sh.getRange(i + 1, 6).setValue(val);        // F列=enabled
        sh.getRange(i + 1, 7).setValue(new Date());  // G列=updated
        return String(val);
      }
    }
    return 'notfound';
  } finally { lock.releaseLock(); }
}

// インサイト投稿タブから「ベスト投稿」と種別ごとの平均を作る（全員閲覧可）。
function _apiReportPosts_(account) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var suf = account ? ("_" + String(account).trim()) : "";
  var sh = ss.getSheetByName("インサイト投稿" + suf);
  if (!sh) return null;
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return null;
  var posts = [];
  var now = new Date();
  var WINDOW = 30 * 864e5;
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[1]) continue;
    var nav = 0, ti = 0, navx = 0, navf = 0, navb = 0, nava = 0;
    try { var raw = JSON.parse(r[12] || "{}"); nav = Number(raw.navigation) || 0; ti = Number(raw.total_interactions) || 0; navx = Number(raw.nav_exit) || 0; navf = Number(raw.nav_forward) || 0; navb = Number(raw.nav_back) || 0; nava = Number(raw.nav_auto) || 0; } catch (e) {}
    var postedStr = String(r[3] || "");
    var t = postedStr ? (new Date(postedStr)).getTime() : 0;
    posts.push({
      kind: String(r[2] || ""),
      date: postedStr ? postedStr.slice(0, 10) : String(r[0]).slice(0, 10),
      caption: String(r[4] || ""),
      reach: Number(r[5]) || 0, views: Number(r[6]) || 0,
      likes: Number(r[7]) || 0, saved: Number(r[8]) || 0, shares: Number(r[9]) || 0,
      comments: Number(r[10]) || 0, replies: Number(r[11]) || 0,
      navigation: nav, interactions: ti, navExit: navx, navFwd: navf, navBack: navb, navAuto: nava, _t: t,
      thumb: String(r[13] || ""), full: String(r[14] || ""),
      mtype: String(r[15] || ""), link: String(r[16] || "")
    });
  }
  var recent = posts.filter(function (p) { return p._t >= now.getTime() - WINDOW; });
  if (!recent.length) recent = posts;
  var stories = recent.filter(function (p) { return p.kind === "story"; });
  var feeds = recent.filter(function (p) { return p.kind !== "story"; });
  function avg(list, k) { if (!list.length) return 0; var s = 0; for (var j = 0; j < list.length; j++) s += list[j][k]; return Math.round(s / list.length); }
  var top = recent.slice().sort(function (a, b) { return b.reach - a.reach; }).slice(0, 5).map(function (p) {
    return { kind: p.kind, date: p.date, caption: p.caption, reach: p.reach, views: p.views,
             likes: p.likes, saved: p.saved, shares: p.shares, comments: p.comments,
             replies: p.replies, navigation: p.navigation, interactions: p.interactions,
             navExit: p.navExit, navFwd: p.navFwd, navBack: p.navBack, navAuto: p.navAuto,
             thumb: p.thumb, full: p.full, mtype: p.mtype, link: p.link };
  });
  var all = recent.slice().sort(function (a, b) { return b._t - a._t; }).map(function (p) {
    return { kind: p.kind, date: p.date, caption: p.caption, reach: p.reach, views: p.views,
             likes: p.likes, saved: p.saved, shares: p.shares, comments: p.comments,
             replies: p.replies, navigation: p.navigation, interactions: p.interactions,
             navExit: p.navExit, navFwd: p.navFwd, navBack: p.navBack, navAuto: p.navAuto,
             thumb: p.thumb, full: p.full, mtype: p.mtype, link: p.link };
  });
  return {
    n: recent.length, storyN: stories.length, feedN: feeds.length,
    storyAvg: { reach: avg(stories, "reach"), views: avg(stories, "views"), navigation: avg(stories, "navigation"), replies: avg(stories, "replies") },
    feedAvg: { reach: avg(feeds, "reach"), views: avg(feeds, "views"), likes: avg(feeds, "likes"), saved: avg(feeds, "saved") },
    top: top, all: all
  };
}

// インサイト日次タブを集計して、直近30日 vs 前30日 のレポート用データを返す（全員閲覧可）。
function _apiReport_(account) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var suf = account ? ("_" + String(account).trim()) : "";
  var sh = ss.getSheetByName("インサイト日次" + suf);
  if (!sh) return { days: 0, cur: null, prev: null, series: [], posts: _apiReportPosts_(account) };
  var data = sh.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    rows.push({
      date: String(r[0]).slice(0, 10),
      followers: Number(r[1]) || 0, reach: Number(r[2]) || 0, views: Number(r[3]) || 0,
      pviews: Number(r[4]) || 0, links: Number(r[5]) || 0, eng: Number(r[6]) || 0
    });
  }
  rows.sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  var cur = rows.slice(-30);
  var prev = rows.slice(-60, -30);
  function agg(list) {
    if (!list.length) return null;
    var s = { reach: 0, views: 0, pviews: 0, links: 0, eng: 0 };
    for (var j = 0; j < list.length; j++) {
      s.reach += list[j].reach; s.views += list[j].views; s.pviews += list[j].pviews;
      s.links += list[j].links; s.eng += list[j].eng;
    }
    s.followersStart = list[0].followers;
    s.followersEnd = list[list.length - 1].followers;
    s.n = list.length;
    return s;
  }
  return {
    days: cur.length,
    latestDate: cur.length ? cur[cur.length - 1].date : "",
    cur: agg(cur), prev: agg(prev),
    series: cur.map(function (d) { return { date: d.date, reach: d.reach }; }),
    daily: rows,
    posts: _apiReportPosts_()
  };
}

function _api_(p) {
  var cb = p.cb || p.callback || "";
  try {
    if (APP_KEY && String(p.key || "") !== APP_KEY) return _jsonp_(cb, { error: "auth" });
    if (p.api === "list") return _jsonp_(cb, _apiList_(p.account || ""));
    if (p.api === "act") {
      if (String(p.action) === "unapprove" && OWNER_KEY && String(p.owner || "") !== OWNER_KEY) return _jsonp_(cb, { error: "owner" });
      return _jsonp_(cb, { result: setStatus(p.token, p.action, p.account || "") });
    }
    if (p.api === "sig") return _jsonp_(cb, { sig: getSig(p.account || "") });
    if (p.api === "states") return _jsonp_(cb, JSON.parse(getStates(p.tokens || "[]", p.account || "")));
    if (p.api === "subscribe") return _jsonp_(cb, { result: _saveSub_(p.sub, p.prefs, p.ep, p.account || "") });
    if (p.api === "notifprefs") return _jsonp_(cb, { result: _setNotifPrefs_(p.ep, p.prefs, p.account || "") });
    if (p.api === "patterns") return _jsonp_(cb, _apiPatterns_());
    if (p.api === "owner") return _jsonp_(cb, { owner: (!OWNER_KEY || String(p.owner || "") === OWNER_KEY) });
    if (p.api === "report") return _jsonp_(cb, _apiReport_(p.account || ""));
    if (p.api === "pattern") {
      if (OWNER_KEY && String(p.owner || "") !== OWNER_KEY) return _jsonp_(cb, { error: "owner" });
      return _jsonp_(cb, { result: _setPattern_(p.pattern, p.on) });
    }
    if (p.api === "schedule")     return _jsonp_(cb, schedCreate_(p));
    if (p.api === "schedlist")    return _jsonp_(cb, schedList_(p.account || ""));
    if (p.api === "schedcancel")  return _jsonp_(cb, schedCancel_(p.token));
    if (p.api === "regionaltags") return _jsonp_(cb, regionalTags_(p.region || "", p.peek === "1"));
    if (p.api === "cands")        return _jsonp_(cb, cands_());
    if (p.api === "storyset")     return _jsonp_(cb, storySet_(p.account || "", p.slot || "", p.action || "", p.file || ""));
    if (p.api === "storyplan")    return _jsonp_(cb, storyPlan_(p.account || ""));
    if (p.api === "mentions")     return _jsonp_(cb, _apiMentions_(p.account || ""));
    if (p.api === "mentionact")   return _jsonp_(cb, { result: _mentionAct_(p.mid || "", p.action || "", p.text || "", p.account || "") });
    return _jsonp_(cb, { error: "unknown api" });
  } catch (err) {
    return _jsonp_(cb, { error: String(err) });
  }
}

function doGet(e) {
  var _p = (e && e.parameter) || {};
  if (_p['hub.mode']) return _verifyWebhook_(_p);   // Instagram Webhook 検証（GET handshake）
  if (_p.api) return _api_(_p);
  const items = getPending_();
  let cards = '';
  if (items.length === 0) {
    cards = '<p class="empty">確認待ちの投稿はありません。</p>';
  } else {
    items.forEach(function (it, idx) {
      const media = _mediaHtml_(it.url, it.kind, it.poster, it.blur, idx === 0);
      const remain = _remain_(it.dt);
      // 承認済みはボタンを出さず「承認済み」表示でキープ。投稿されるまで消えない
      var body, doneCls = '';
      if (it.status === 'redo') {
        body = '<div class="redoing"><span class="spin"></span>作り直しています…（完成したら自動で更新されます）</div>';
      } else if (it.status === 'approved') {
        body = '<div class="banner okb">✓ 承認済み（予定時刻に投稿されます）</div>';
        doneCls = ' done';
      } else {
        body = '<div class="btns">' +
            '<button class="ok" onclick="act(this,\'' + it.token + '\',\'ok\')">投稿OK</button>' +
            '<button class="rd" onclick="act(this,\'' + it.token + '\',\'redo\')">作り直す</button>' +
            '<button class="ng" onclick="act(this,\'' + it.token + '\',\'cancel\')">やめる</button>' +
          '</div>';
      }
      cards +=
        '<div class="card' + doneCls + '" data-token="' + it.token + '" data-status="' + it.status + '">' +
          '<div class="head">' +
            '<span class="time">' + it.timeRaw + '</span>' +
            '<b class="pat">' + _patJa_(it.pattern) + '</b>' +
            (remain ? '<span class="remain">' + remain + '</span>' : '') +
          '</div>' +
          '<div class="mediaWrap">' + media + '</div>' +
          '<div class="cap">' + (it.caption || '（動画）') + '</div>' +
          '<div class="slot">' + body + '</div>' +
        '</div>';
    });
  }

  // メディアのホストへ事前接続（DNS+TCP+TLSを先に温め、最初の画像表示を高速化）
  var _hosts = {};
  items.forEach(function (it) {
    [it.url, it.poster].forEach(function (u) {
      var m = /^https?:\/\/([^\/]+)/i.exec(u || '');
      if (m) _hosts[m[1]] = true;
    });
  });
  var preconnect = '';
  for (var h in _hosts) {
    preconnect += '<link rel="preconnect" href="https://' + h + '" crossorigin>' +
                  '<link rel="dns-prefetch" href="https://' + h + '">';
  }

  const html =
'<!DOCTYPE html><html><head><meta charset="utf-8">' +
preconnect +
'<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">' +
'<title>投稿事前確認</title><style>' +
'*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}' +
'body{margin:0;font-family:-apple-system,"Hiragino Kaku Gothic ProN",sans-serif;background:#0f1115;color:#eaeef2;padding:14px}' +
'h1{font-size:18px;margin:6px 2px 14px}' +
'.empty{opacity:.7;text-align:center;margin-top:40px}' +
'.card{background:#181c23;border:1px solid #262c36;border-radius:16px;padding:12px;margin-bottom:16px;transition:opacity .2s}' +
'.card.done{opacity:.55}' +
'.head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}' +
'.time{font-size:13px;opacity:.85}' +
'.pat{font-size:15px;color:#fff}' +
'.remain{margin-left:auto;font-size:12px;font-weight:700;color:#7fd1a0;background:#10301f;padding:3px 9px;border-radius:999px}' +
'.media{width:100%;border-radius:12px;background:#000;display:block;max-height:70vh;object-fit:contain}' +
'.badge{font-size:12px;opacity:.8;margin-top:6px}' +
'.noimg{padding:40px;text-align:center;background:#0c0e12;border-radius:12px;opacity:.6}' +
'.cap{font-size:14px;margin:10px 2px;line-height:1.5}' +
'.btns{display:flex;gap:8px;margin-top:8px}' +
'.btns button{flex:1;border:0;border-radius:12px;padding:13px 0;font-size:15px;font-weight:700;color:#fff;transition:transform .06s,opacity .15s}' +
'.ok{background:#1f9d55}.rd{background:#3b6fd6}.ng{background:#444b57}' +
'.btns button:active{transform:scale(.96);opacity:.9}' +
'.btns button:disabled{opacity:.4;filter:grayscale(.4)}' +
'.banner{margin-top:8px;text-align:center;font-size:15px;font-weight:700;padding:12px 0;border-radius:12px;animation:fadein .2s}' +
'@keyframes fadein{from{opacity:0}to{opacity:1}}' +
'.banner.okb{background:#10301f;color:#7fd1a0}' +
'.banner.ngb{background:#2a2f37;color:#aeb6c2}' +
'.redoing{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px;font-size:14px;color:#ffcf66;background:#241d10;padding:14px 0;border-radius:12px}' +
'.spin{width:16px;height:16px;border:3px solid #ffcf66;border-top-color:transparent;border-radius:50%;display:inline-block;animation:sp .8s linear infinite}' +
'@keyframes sp{to{transform:rotate(360deg)}}' +
'#toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#000;color:#fff;padding:10px 18px;border-radius:24px;font-size:14px;opacity:0;transition:.2s;pointer-events:none;z-index:9}' +
'#toast.show{opacity:.95}' +
'</style></head><body>' +
'<h1>投稿の事前確認</h1><div id="list">' + cards + '</div>' +
'<div id="toast"></div>' +
'<script>' +
'function toast(t){var e=document.getElementById("toast");e.textContent=t;e.classList.add("show");clearTimeout(window._tt);window._tt=setTimeout(function(){e.classList.remove("show")},1600)}' +
'function isVideo(u,k){if(!u)return false;u=u.toLowerCase();if(u.indexOf(".mp4")>=0||u.indexOf(".mov")>=0||u.indexOf(".webm")>=0)return true;return k==="video"}' +
'function bg(b){return b?\' style="background:#000 url(\'+b+\') center center / cover no-repeat"\':\' style="background:#000"\'}' +
'function mediaHtml(u,k,b,po){if(isVideo(u,k)){var p=po?\' poster="\'+po+\'"\':\'\';return \'<video class="media"\'+bg(b)+\' src="\'+u+\'"\'+p+\' controls playsinline preload="none"></video><div class="badge">\\u25b6 \\u30bf\\u30c3\\u30d7\\u3067\\u518d\\u751f\\uff08\\u97f3\\u304c\\u9cf4\\u308a\\u307e\\u3059\\uff09</div>\'}if(u){return \'<img class="media"\'+bg(b)+\' src="\'+u+\'" alt="preview" loading="lazy" decoding="async">\'}return \'<div class="noimg">\\u30d7\\u30ec\\u30d3\\u30e5\\u30fc\\u306a\\u3057</div>\'}' +
'function act(btn,token,action){' +
'  var card=btn.closest(".card");' +
'  var bs=card.querySelectorAll(".btns button");for(var i=0;i<bs.length;i++){bs[i].disabled=true}' +
'  var optimistic=(action==="ok")?"approved":(action==="redo")?"redo":"rejected";' +
'  applyState(card,token,optimistic,null);' +
'  var labels={ok:"\\u627f\\u8a8d\\u3057\\u307e\\u3057\\u305f",redo:"\\u4f5c\\u308a\\u76f4\\u3057\\u3092\\u958b\\u59cb\\u3057\\u307e\\u3057\\u305f",cancel:"\\u53d6\\u308a\\u3084\\u3081\\u307e\\u3057\\u305f"};' +
'  toast(labels[action]||"\\u5b8c\\u4e86");' +
'  google.script.run.withSuccessHandler(function(res){' +
'    if(res && res.indexOf("locked:")===0){' +
'      var cur=res.split(":")[1];' +
'      var msg=(cur==="approved")?"\\u4ed6\\u306e\\u65b9\\u304c\\u300c\\u6295\\u7a3f\\uff2f\\uff2b\\u300d\\u6e08\\u307f\\u3067\\u3059":(cur==="rejected")?"\\u4ed6\\u306e\\u65b9\\u304c\\u300c\\u3084\\u3081\\u308b\\u300d\\u6e08\\u307f\\u3067\\u3059":(cur==="redo")?"\\u4ed6\\u306e\\u65b9\\u304c\\u4f5c\\u308a\\u76f4\\u3057\\u4e2d\\u3067\\u3059":"\\u4ed6\\u306e\\u65b9\\u304c\\u51e6\\u7406\\u6e08\\u307f\\u3067\\u3059";' +
'      toast(msg);applyState(card,token,cur,null);' +
'    }else if(res==="busy"){toast("\\u6df7\\u96d1\\u3057\\u3066\\u3044\\u307e\\u3059\\u3002\\u518d\\u53d6\\u5f97\\u3057\\u307e\\u3059");kick()}' +
'    else if(res==="notfound"){applyState(card,token,"gone",null)}' +
'    else if(action==="redo"){fast()}' +
'  }).withFailureHandler(function(err){' +
'    toast("\\u30a8\\u30e9\\u30fc: "+err.message);applyState(card,token,"pending",null)' +
'  }).setStatus(token,action);' +
'}' +
'function applyState(card,token,st,info){' +
'  card.setAttribute("data-status",st);' +
'  var slot=card.querySelector(".slot");if(!slot)return;' +
'  if(st==="approved"){slot.innerHTML=\'<div class="banner okb">\\u2713 \\u627f\\u8a8d\\u6e08\\u307f\\uff08\\u4e88\\u5b9a\\u6642\\u523b\\u306b\\u6295\\u7a3f\\u3055\\u308c\\u307e\\u3059\\uff09</div>\';card.classList.add("done");return}' +
// 投稿完了したらカードを消す（フェードアウト→削除）
'  if(st==="posted"){card.style.transition="opacity .4s";card.style.opacity="0";setTimeout(function(){card.remove()},420);return}' +
'  if(st==="rejected"){slot.innerHTML=\'<div class="banner ngb">\\u2014 \\u53d6\\u308a\\u3084\\u3081\\u307e\\u3057\\u305f</div>\';card.classList.add("done");return}' +
'  if(st==="redo"){slot.innerHTML=\'<div class="redoing"><span class="spin"></span>\\u4f5c\\u308a\\u76f4\\u3057\\u3066\\u3044\\u307e\\u3059\\u2026\\uff08\\u5b8c\\u6210\\u3057\\u305f\\u3089\\u81ea\\u52d5\\u3067\\u66f4\\u65b0\\u3055\\u308c\\u307e\\u3059\\uff09</div>\';card.classList.remove("done");return}' +
'  if(st==="gone"){slot.innerHTML=\'<div class="banner ngb">\\u2014 \\u3053\\u306e\\u67a0\\u306f\\u524a\\u9664\\u3055\\u308c\\u307e\\u3057\\u305f</div>\';card.classList.add("done");return}' +
'  if(st==="pending"){' +
'    if(info){var mw=card.querySelector(".mediaWrap");if(mw)mw.innerHTML=mediaHtml(info.url,info.kind,info.blur,info.poster);var cp=card.querySelector(".cap");if(cp)cp.textContent=info.caption||"\\uff08\\u52d5\\u753b\\uff09"}' +
'    slot.innerHTML=\'<div class="btns">\'+' +
'      \'<button class="ok" onclick="act(this,\\\'\'+token+\'\\\',\\\'ok\\\')">\\u6295\\u7a3f\\uff2f\\uff2b</button>\'+' +
'      \'<button class="rd" onclick="act(this,\\\'\'+token+\'\\\',\\\'redo\\\')">\\u4f5c\\u308a\\u76f4\\u3059</button>\'+' +
'      \'<button class="ng" onclick="act(this,\\\'\'+token+\'\\\',\\\'cancel\\\')">\\u3084\\u3081\\u308b</button>\'+' +
'    \'</div>\';card.classList.remove("done");return' +
'  }' +
'}' +
'var lastSig=null,timer=null,interval=8000;' +
'function poll(){' +
'  if(document.hidden)return;' +
'  google.script.run.withSuccessHandler(function(sig){' +
'    if(sig===lastSig)return;' +
'    pullDetails(sig)' +
'  }).withFailureHandler(function(e){}).getSig()' +
'}' +
'function pullDetails(sig){' +
'  var cards=document.querySelectorAll(".card[data-token]");if(!cards.length){lastSig=sig;return}' +
'  var tokens=[];for(var i=0;i<cards.length;i++){tokens.push(cards[i].getAttribute("data-token"))}' +
'  google.script.run.withSuccessHandler(function(json){' +
'    var d;try{d=JSON.parse(json)}catch(e){return}' +
'    lastSig=d.sig;var states=d.states||{};var anyRedo=false;' +
'    for(var i=0;i<cards.length;i++){' +
'      var c=cards[i];var tk=c.getAttribute("data-token");var prev=c.getAttribute("data-status");' +
'      var s=states[tk];' +
'      if(!s){if(prev!=="gone")applyState(c,tk,"gone",null);continue}' +
'      if(s.status==="redo")anyRedo=true;' +
'      if(s.status!==prev)applyState(c,tk,s.status,s)' +
'    }' +
'    setRate(anyRedo?3000:8000)' +
'  }).withFailureHandler(function(e){}).getStates(JSON.stringify(tokens))' +
'}' +
'function setRate(ms){if(ms===interval)return;interval=ms;if(timer)clearInterval(timer);timer=setInterval(poll,interval)}' +
'function kick(){poll()}' +
'function fast(){setRate(3000);poll()}' +
'timer=setInterval(poll,interval);' +
'document.addEventListener("visibilitychange",function(){if(!document.hidden){poll()}});' +
'</script></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('投稿事前確認')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


// ===== 自動起動（PCオフでも動く）: GASの時間トリガから GitHub を起動 =====
function triggerPrepare() {
  _ghDispatch_('prepare.yml', { date: '' });  // 実行日+2日分の確認を生成
}

var _SLOT_HOURS_ = [11, 16, 18, 20];
function triggerPost() {
  var tz = 'Asia/Tokyo';
  var now = new Date();
  var ymd = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var mins = parseInt(Utilities.formatDate(now, tz, 'HH'), 10) * 60 +
             parseInt(Utilities.formatDate(now, tz, 'mm'), 10);
  // 直近で過ぎた投稿枠（その時刻〜20分以内）だけ投稿。冪等なので二重投稿しない
  var target = null;
  for (var i = 0; i < _SLOT_HOURS_.length; i++) {
    var sm = _SLOT_HOURS_[i] * 60;
    if (mins >= sm && mins - sm <= 20) { target = _SLOT_HOURS_[i]; break; }
  }
  if (target === null) return;
  var datetime = ymd + ' ' + ('0' + target).slice(-2) + ':00';
  _ghDispatch_('post.yml', { datetime: datetime, dry: '0' });
}

function _ghDispatch_(workflow, inputs) {
  var url = 'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO +
            '/actions/workflows/' + workflow + '/dispatches';
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + GH_TOKEN,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({ ref: GH_REF, inputs: inputs || {} }),
    muteHttpExceptions: true
  });
  Logger.log(workflow + ' -> ' + res.getResponseCode() + ' ' + res.getContentText());
}

// ===== 予約投稿 / 地域タグ共有 / 投稿候補（PWA確認画面用・Claude追加） =====
var RESV_TAB = "予約投稿";
function schedSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID), sh = ss.getSheetByName(RESV_TAB);
  if (!sh) { sh = ss.insertSheet(RESV_TAB); sh.appendRow(["token", "when", "kind", "media_url", "caption", "hashtags", "status", "created_at", "note", "account"]); }
  return sh;
}
function schedCreate_(p) {
  var sh = schedSheet_();
  var token = "R" + Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMddHHmmss") + "_" + Math.floor(Math.random() * 1000);
  var kind = (p.kind === "reel") ? "reel" : "feed";
  var account = String(p.account || "").trim();   // J列: 空=三条 / "gifuyatenjin"=ぎふや（post_reservations が振り分け）
  // K/L列: リールの切取位置(秒)。投稿エンジンが ffmpeg で切り出す。空=切らずにそのまま。
  var ts = (p.trimStart === undefined || p.trimStart === "") ? "" : Number(p.trimStart);
  var te = (p.trimEnd === undefined || p.trimEnd === "") ? "" : Number(p.trimEnd);
  sh.appendRow([token, String(p.when || "").slice(0, 16), kind, p.media || "", p.caption || "", p.hashtags || "",
    "scheduled", Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm"), "", account, ts, te]);
  return { ok: true, token: token };
}
function schedList_(account) {
  var want = String(account || "").trim();          // 店舗別に分離（空=三条・従来どおり）
  var sh = schedSheet_(), v = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][6]).trim() !== "scheduled") continue;
    if (String(v[i][9] || "").trim() !== want) continue;
    out.push({ token: v[i][0], when: v[i][1], kind: v[i][2], media: v[i][3], name: (v[i][4] || "").split("\n")[0].slice(0, 24), copy: "" });
  }
  out.sort(function (a, b) { return String(a.when) < String(b.when) ? -1 : 1; });
  return { ok: true, items: out };
}
function schedCancel_(token) {
  var sh = schedSheet_(), v = sh.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) { if (v[i][0] === token) { sh.getRange(i + 1, 7).setValue("canceled"); return { ok: true }; } }
  return { ok: false, error: "not found" };
}
// ストーリー自動投稿の「回ごとの指示」を保存/取得（三条と同じオプトアウト方式）。
// StoryPlan タブ: account / slot(YYYY-MM-DD-H) / action(skip|set|ok) / file / updated。
// poster(post_gifuya_story.py) が投稿前にこの表を見て skip/差し替えを反映する。
function storyPlanSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID), sh = ss.getSheetByName("StoryPlan");
  if (!sh) { sh = ss.insertSheet("StoryPlan"); sh.appendRow(["account", "slot", "action", "file", "updated"]); }
  return sh;
}
function storySet_(account, slot, action, file) {
  var acc = String(account || "").trim(), sk = String(slot || "").trim(), ac = String(action || "").trim();
  if (!acc || !sk) return { ok: false, error: "missing account/slot" };
  var sh = storyPlanSheet_(), v = sh.getDataRange().getValues(), row = -1;
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim() === acc && String(v[i][1]).trim() === sk) { row = i + 1; break; }
  }
  var now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm");
  if (ac === "clear" || ac === "ok") {
    // ok=承認（やめない限り投稿）＝既定と同じ挙動。clear=指示消去。どちらも行を消して既定ローテーションへ戻す。
    if (row > 0) sh.deleteRow(row);
    return { ok: true, cleared: true };
  }
  var rowVals = [acc, sk, ac, String(file || ""), now];
  if (row > 0) sh.getRange(row, 1, 1, 5).setValues([rowVals]);
  else sh.appendRow(rowVals);
  return { ok: true };
}
function storyPlan_(account) {
  var acc = String(account || "").trim();
  var sh = storyPlanSheet_(), v = sh.getDataRange().getValues(), plan = {};
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim() !== acc) continue;
    plan[String(v[i][1]).trim()] = { action: String(v[i][2]).trim(), file: String(v[i][3] || "").trim() };
  }
  return { ok: true, plan: plan };
}
function cands_() {
  var ss = SpreadsheetApp.openById(SHEET_ID), sh = ss.getSheetByName("投稿候補");
  if (!sh) return { ok: true, feed: [], reel: [] };
  var v = sh.getDataRange().getValues(), feed = [], reel = [];
  for (var i = 1; i < v.length; i++) {
    var kind = String(v[i][0] || "").trim(), media = v[i][3] || "";
    if (!media) continue;
    (kind === "reel" ? reel : feed).push({ name: v[i][1] || "", copy: v[i][2] || "", media: media, reco: String(v[i][4] || "") === "1" });
  }
  return { ok: true, feed: feed, reel: reel };
}
function regionalTags_(region, peek) {
  var COOLDOWN_MS = 7 * 24 * 3600 * 1000, LIMIT = 10;
  var props = PropertiesService.getScriptProperties(), SK = "regstore_" + (region || "default");
  var saved = null; try { saved = JSON.parse(props.getProperty(SK) || "null"); } catch (e) {}
  if (peek) {
    return saved ? { ok: true, tags: saved.tags, updatedAt: saved.updatedAt, nextAt: saved.nextAt, live: saved.live, cooldown: Date.now() < saved.nextAt }
                 : { ok: true, tags: [], updatedAt: 0, nextAt: 0, live: false, cooldown: false };
  }
  if (saved && Date.now() < saved.nextAt) {
    return { ok: true, tags: saved.tags, updatedAt: saved.updatedAt, nextAt: saved.nextAt, live: saved.live, cooldown: true };
  }
  var POOL_KYOTO = [
    { t: "京都ディナー", r: 3 }, { t: "河原町グルメ", r: 3 }, { t: "京都飲み", r: 2 }, { t: "京都食べ歩き", r: 2 },
    { t: "河原町ディナー", r: 2 }, { t: "京都寿司", r: 2 }, { t: "京都ランチ", r: 2 }, { t: "三条河原町", r: 1 },
    { t: "先斗町", r: 1 }, { t: "木屋町グルメ", r: 1 }, { t: "河原町居酒屋", r: 1 }, { t: "京都晩ごはん", r: 1 },
    { t: "kyotojapan", r: 3, inb: 1 }, { t: "kyotofood", r: 3, inb: 1 }, { t: "kyotogourmet", r: 2, inb: 1 },
    { t: "japanesefood", r: 2, inb: 1 }, { t: "izakaya", r: 2, inb: 1 }, { t: "kyotorestaurant", r: 1, inb: 1 },
    { t: "kyotonight", r: 1, inb: 1 }, { t: "visitkyoto", r: 1, inb: 1 }, { t: "kawaramachi", r: 1, inb: 1 }
  ];
  var POOL_FUKUOKA = [
    { t: "天神ディナー", r: 3 }, { t: "福岡飲み", r: 3 }, { t: "天神ランチ", r: 2 }, { t: "福岡食べ歩き", r: 2 },
    { t: "天神居酒屋", r: 2 }, { t: "博多グルメ", r: 2 }, { t: "中洲グルメ", r: 1 }, { t: "大名グルメ", r: 1 },
    { t: "今泉グルメ", r: 1 }, { t: "天神晩ごはん", r: 1 }, { t: "博多飲み", r: 1 }, { t: "福岡ディナー", r: 2 },
    { t: "fukuokajapan", r: 3, inb: 1 }, { t: "fukuokafood", r: 3, inb: 1 }, { t: "fukuokagourmet", r: 2, inb: 1 },
    { t: "japanesefood", r: 2, inb: 1 }, { t: "izakaya", r: 2, inb: 1 }, { t: "tenjin", r: 1, inb: 1 },
    { t: "hakata", r: 1, inb: 1 }, { t: "visitfukuoka", r: 1, inb: 1 }, { t: "fukuoka", r: 3, inb: 1 }
  ];
  var POOL = (/福岡|天神|博多|fukuoka|tenjin|hakata/i.test(String(region || ""))) ? POOL_FUKUOKA : POOL_KYOTO;
  var TOKEN = props.getProperty("IG_ACCESS_TOKEN"), IGUSER = props.getProperty("IG_USER_ID");
  var live = false, scored = [];
  for (var i = 0; i < POOL.length; i++) {
    var tag = POOL[i], score = 0;
    if (TOKEN && IGUSER && i < LIMIT) {
      try {
        var idKey = "hid_" + tag.t, hid = props.getProperty(idKey);
        if (!hid) {
          var sr = UrlFetchApp.fetch("https://graph.facebook.com/v21.0/ig_hashtag_search?user_id=" + IGUSER + "&q=" + encodeURIComponent(tag.t) + "&access_token=" + TOKEN, { muteHttpExceptions: true });
          var sd = JSON.parse(sr.getContentText()); if (sd.data && sd.data[0]) { hid = sd.data[0].id; props.setProperty(idKey, hid); }
        }
        if (hid) {
          var rr = UrlFetchApp.fetch("https://graph.facebook.com/v21.0/" + hid + "/recent_media?user_id=" + IGUSER + "&fields=timestamp&limit=5&access_token=" + TOKEN, { muteHttpExceptions: true });
          var rd = JSON.parse(rr.getContentText());
          if (rd.data && rd.data.length) { live = true; var h = (Date.now() - new Date(rd.data[0].timestamp).getTime()) / 3600000; score = (h < 24 ? 30 : h < 72 ? 20 : 10) + rd.data.length; }
        }
      } catch (e) {}
    }
    scored.push({ tag: tag, score: score, base: tag.r, idx: i });
  }
  scored.sort(function (a, b) { return (b.score - a.score) || (b.base - a.base) || (a.idx - b.idx); });
  var tags = scored.map(function (s, n) { var r = live ? (n < 6 ? 3 : n < 13 ? 2 : 1) : s.base; return { t: s.tag.t, r: r, inb: s.tag.inb ? 1 : 0 }; });
  var now = Date.now(), out = { ok: true, tags: tags, updatedAt: now, nextAt: now + COOLDOWN_MS, live: live };
  props.setProperty(SK, JSON.stringify(out)); out.cooldown = false; return out;
}

/* ===================================================================== */
/* Instagram ストーリーメンション：Webhook受信 → 確認キュー（シート）      */
/*   ・doPost で story_mention を受け、タブ「メンション_<account>」へ記録   */
/*   ・リアクション等は無視（story_mention のみ取り込む）                  */
/*   ・確認アプリは api=mentions で一覧、api=mentionact で採否＋文面を保存   */
/*   ・実投稿/DM返信は Python(GitHub Actions) が status を見て実行する      */
/* ===================================================================== */
const IG_MENTION_TAB = 'メンション';

function _verifyToken_() {
  return PropertiesService.getScriptProperties().getProperty('IG_VERIFY_TOKEN') || 'gifuya_ig_2026';
}
// 自動リポストの方式：hold=保留付き自動（既定）/ off=確認式（手動）/ full=即自動。
function _autoMode_() {
  var m = (PropertiesService.getScriptProperties().getProperty('IG_AUTO_MODE') || 'hold').toLowerCase();
  return (m === 'off' || m === 'full') ? m : 'hold';
}
// 自動時に既定で入れるシェアコメント（アプリで上書き可）。
function _autoComment_() {
  return PropertiesService.getScriptProperties().getProperty('IG_AUTO_COMMENT') || 'ご来店ありがとうございます\n素敵な投稿に感謝です！\n#ぎふや福岡天神';
}
// 受信先IGユーザーID → 店舗account。スクリプトプロパティ IG_ACCOUNT_MAP({"<igid>":"gifuyatenjin"}) 未設定なら既定。
function _acctFromIgId_(igid) {
  try {
    var m = JSON.parse(PropertiesService.getScriptProperties().getProperty('IG_ACCOUNT_MAP') || '{}');
    if (m && m[igid]) return m[igid];
  } catch (e) {}
  return 'gifuyatenjin';
}
function _verifyWebhook_(p) {
  var ok = String(p['hub.verify_token'] || '') === _verifyToken_();
  return ContentService.createTextOutput(ok ? (p['hub.challenge'] || '') : 'forbidden');
}
function _mentionSheet_(account) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var name = IG_MENTION_TAB + (account ? '_' + account : '');
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(['mid','日時','account','senderId','senderName','mediaUrl','mediaType','status','文面','更新']); }
  return sh;
}
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var n = _ingestMentions_(body);
    return ContentService.createTextOutput('EVENT_RECEIVED:' + n);
  } catch (err) {
    return ContentService.createTextOutput('ERR:' + err);
  }
}
function _ingestMentions_(body) {
  var count = 0;
  var entries = (body && body.entry) || [];
  for (var i = 0; i < entries.length; i++) {
    var msgs = entries[i].messaging || [];
    for (var j = 0; j < msgs.length; j++) {
      var ev = msgs[j] || {};
      var atts = (ev.message && ev.message.attachments) || [];
      for (var k = 0; k < atts.length; k++) {
        if (String(atts[k].type) !== 'story_mention') continue;   // リアクション等は無視
        var url = (atts[k].payload && atts[k].payload.url) || '';
        if (!url) continue;
        var recip = String((ev.recipient && ev.recipient.id) || '');
        var account = _acctFromIgId_(recip);
        var mid = String((ev.message && ev.message.mid) || ((ev.timestamp || Date.now()) + '_' + ((ev.sender && ev.sender.id) || '')));
        if (_mentionExists_(account, mid)) continue;              // 重複防止
        var mode = _autoMode_();
        var status = (mode === 'full') ? 'approved' : (mode === 'off') ? 'pending' : 'auto';  // hold=保留付き自動
        var comment = (mode === 'off') ? '' : _autoComment_();
        var nowIso = new Date().toISOString();   // Pythonが保留時間を計算できるようISOで保存
        _mentionSheet_(account).appendRow([mid, nowIso, account, String((ev.sender && ev.sender.id) || ''), '', url, 'image', status, comment, nowIso]);
        count++;
      }
    }
  }
  return count;
}
function _mentionExists_(account, mid) {
  var sh = _mentionSheet_(account);
  var last = sh.getLastRow();
  if (last < 2) return false;
  var col = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) { if (String(col[i][0]) === String(mid)) return true; }
  return false;
}
function _apiMentions_(account) {
  var sh = _mentionSheet_(account);
  var last = sh.getLastRow();
  if (last < 2) return { items: [] };
  var rows = sh.getRange(2, 1, last - 1, 10).getValues();
  var items = [];
  for (var i = 0; i < rows.length; i++) {
    var st = String(rows[i][7] || 'pending');
    if (st === 'ignored' || st === 'done') continue;             // 済み/無視は出さない
    items.push({ mid: String(rows[i][0]), dt: rows[i][1], senderId: String(rows[i][3]),
                 url: String(rows[i][5]), mediaType: String(rows[i][6] || 'story'),
                 status: st, text: String(rows[i][8] || '') });
  }
  items.reverse();   // 新しい順
  return { items: items };
}
function _mentionAct_(mid, action, text, account) {
  var sh = _mentionSheet_(account);
  var last = sh.getLastRow();
  if (last < 2) return 'no-rows';
  var rng = sh.getRange(2, 1, last - 1, 10);
  var rows = rng.getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) !== String(mid)) continue;
    if (action === 'ignore')      rows[i][7] = 'ignored';        // 無視
    else if (action === 'reply')  rows[i][7] = 'reply';          // DM返信のみ（Python送信）
    else if (action === 'story')  rows[i][7] = 'approved';       // 店ストーリーに追加（Python投稿）
    else return 'bad-action';
    if (text) rows[i][8] = String(text);
    rows[i][9] = new Date();
    rng.setValues(rows);
    return 'ok';
  }
  return 'not-found';
}
