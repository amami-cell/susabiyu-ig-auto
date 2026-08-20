/**
 * 求人進捗ダッシュボード（GASウェブアプリのサーバ側）
 *
 * ep_fetch.gs と同じ Apps Script プロジェクトに置く。
 * 取得本体 epRun() をそのまま呼べるので、更新ボタンはGitHub不要でその場実行。
 *
 * デプロイ: push すると GitHub Actions（deploy-gas）が clasp で自動反映する（手貼り不要）。
 *   実行ユーザー: デプロイ元 / アクセス: 全員（現行設定を維持）
 */

// 求人専用PWA(GitHub Pages)のアイコン公開ベース。差し替えは pwa-recruit/icons/ を置換してpush。
var EP_ICONS_BASE = 'https://amami-cell.github.io/susabiyu-media/recruit/icons';

function doGet(e) {
  if (e && e.parameter) {
    // アプリ通知(Webプッシュ)の送信待ち取り出し/テスト投入API
    if (e.parameter.push) {
      var out;
      try {
        if (e.parameter.push === 'test') out = epEnqueueTest_(e.parameter.key);   // テスト通知を積む
        else out = epDrainPush_(e.parameter.key);                                 // 送信役が取り出す
      } catch (err) { out = { ok: false, error: String(err) }; }
      return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
    }
    // 求人PWAの購読者リスト（送信役が読む）/ 失効掃除
    if (e.parameter.subs) {
      var so;
      try {
        if (e.parameter.subs === 'prune') so = epSubPrune_(String(e.parameter.eps || '').split(',').filter(String));
        else so = epSubList_(e.parameter.key);
      } catch (err2) { so = { ok: false, error: String(err2) }; }
      return ContentService.createTextOutput(JSON.stringify(so)).setMimeType(ContentService.MimeType.JSON);
    }
  }
  // ダッシュボード本体。PC/スマホのタブ用favicon＋iframe許可（求人PWAが中に表示するため）。
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Initiateエンポケ求人')
    .setFaviconUrl(EP_ICONS_BASE + '/favicon-32.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** 求人PWAからの購読登録/解除を受ける（no-cors POST・本文はJSON文字列）。 */
function doPost(e) {
  var out = { ok: false };
  try {
    var body = (e && e.postData && e.postData.contents) || '';
    var o = {}; try { o = JSON.parse(body); } catch (x) { o = {}; }
    if (o.api === 'subscribe') out = epSubRegister_(o);
    else if (o.api === 'unsubscribe') out = epSubUnregister_(o.ep);
    else out = { ok: false, error: 'unknown api' };
  } catch (err) { out = { ok: false, error: String(err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** セルの日付値を正しく文字列化する（Date型を "yyyy/MM/dd (HH:mm)" に。文字列はそのまま）。
 *  Sheetsが日付文字列をDate型に自動変換し、String()すると "Mon May 25 2026 GMT..." になって
 *  アプリ側の日付解析が誤読するのを防ぐ。 */
function fmtDateCell_(v, withTime) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Tokyo', withTime ? 'yyyy/MM/dd HH:mm' : 'yyyy/MM/dd');
  return String(v == null ? '' : v);
}

/** 年齢セルを数値に。日付書式に化けた年齢（シリアル値＝年齢）も復元する。 */
function ageNum_(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    var n = Math.round((v.getTime() - new Date(1899, 11, 30).getTime()) / 86400000); // シリアル値＝年齢
    return (n >= 1 && n <= 120) ? n : '';
  }
  var m = parseInt(String(v).replace(/[^\d]/g, ''), 10);
  return isNaN(m) ? '' : m;
}

/**
 * ダッシュボードに出す一式を返す。
 * ★高速化：取得時に作っておいた完成データ(app_cache)があれば、それをそのまま返す（毎回組み立てない）。
 *   無ければその場で組み立てる（初回や旧データ用のフォールバック）。
 */
function dashData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('app_cache');
  if (sh && sh.getLastRow() > 0) {
    var parts = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
    var json = parts.map(function (r) { return r[0]; }).join('');
    try { var o = JSON.parse(json); if (o && o.apps) return o; } catch (e) { }
  }
  return dashBuild_();  // キャッシュが無い/壊れている時だけ、その場で作る
}

/** 表示用データを実際に組み立てる本体。取得時(epRun)にも呼ばれ、結果は app_cache に保存される。 */
function dashBuild_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 集計（dashboard_cache の json 行）
  var dash = {};
  var dc = ss.getSheetByName('dashboard_cache');
  if (dc) {
    var v = dc.getDataRange().getValues();
    for (var i = 0; i < v.length; i++) if (v[i][0] === 'json') { try { dash = JSON.parse(v[i][1]); } catch (e) { } break; }
  }

  // 店舗ID→表示名 ＆ 表示名→募集手動フラグ（F列。募集中/終了 と書けば自動判定を上書き）
  // 表示名は【アルバイト】等の【…】を外してから使う。
  var stores = {}, storeManual = {};
  var ms = ss.getSheetByName('master_店舗');
  if (ms) {
    var sv = ms.getDataRange().getValues();
    for (var i = 1; i < sv.length; i++) {
      if (sv[i][0] === '') continue;
      var disp = epCleanStore_(sv[i][1] || String(sv[i][0]));
      stores[String(sv[i][0])] = disp;
      var man = sv[i].length > 5 ? String(sv[i][5] || '').trim() : '';
      if (man) storeManual[disp] = man;
    }
  }

  // ステータスコード→ファネル段階
  var funnel = {};
  var mst = ss.getSheetByName('master_ステータス');
  if (mst) { var fv = mst.getDataRange().getValues(); for (var i = 1; i < fv.length; i++) if (fv[i][0] !== '') funnel[String(fv[i][0])] = fv[i][2] || ''; }

  // 応募者一覧（消失は除く）
  var apps = [];
  var raw = ss.getSheetByName('raw_応募者');
  if (raw) {
    var rv = raw.getDataRange().getValues(), h = rv[0], col = {};
    h.forEach(function (x, i) { col[x] = i; });
    var cv = function (row, name, alt) {
      var i = col[name]; if (i == null && alt) i = col[alt];
      return i == null ? '' : row[i];
    };
    for (var r = 1; r < rv.length; r++) {
      var row = rv[r];
      if (!cv(row, '応募者コード')) continue;
      if (String(cv(row, '消失')) === 'TRUE') continue;
      var sc = String(cv(row, 'ステータスコード'));
      var sid = String(cv(row, '店舗ID'));
      // 店舗名の決定：CSVの店舗名(W列)を最優先。master表示名は名前が入っている時だけ使う。
      //   （表示名が空 or 数字だけ＝店舗IDのまま、なら使わず番号表示を防ぐ）
      var rawName = epCleanStore_(cv(row, '店舗名'));
      var mName = stores[sid];
      var store = rawName || (mName && !/^\d+$/.test(String(mName)) ? mName : '') || String(mName || '') || sid || '不明';
      // 1回で必要な分をまとめて渡す（タップのたびに取りに行かない）。
      apps.push({
        code: String(cv(row, '応募者コード')), name: cv(row, '氏名'), status: cv(row, 'ステータス'),
        statusCode: sc, funnel: funnel[sc] || '',
        store: store,
        tel: String(cv(row, '電話番号_数字') || ''), telLink: cv(row, 'tel_link'),
        telRaw: String(cv(row, '電話番号') || ''), email: String(cv(row, 'メール') || ''),
        media: cv(row, '媒体'), appliedAt: fmtDateCell_(cv(row, '応募日時'), true),
        interviewAt: fmtDateCell_(cv(row, '面接日時'), true),
        age: ageNum_(cv(row, '年齢')), gender: String(cv(row, '性別') || ''),
        occupation: String(cv(row, '現在の職業') || ''),
        history: String(cv(row, '変更履歴', '変更履歴1') || ''), memo: String(cv(row, 'メモ') || ''),
        dup: String(cv(row, '重複')) === '重複'
      });
    }
  }

  // 求人打ち出し履歴（実データ）→ 店舗ごとの募集状況＆履歴一覧
  var storePosting = {}, postings = [];
  var pp = ss.getSheetByName('求人打ち出し');
  if (pp) {
    var pv = pp.getDataRange().getValues(), ph = pv[0], pc = {};
    ph.forEach(function (x, i) { pc[x] = i; });
    var gp = function (row, name) { var i = pc[name]; return i == null ? '' : row[i]; };
    for (var i = 1; i < pv.length; i++) {
      var prow = pv[i];
      var pstore = epCleanStore_(String(gp(prow, '店舗名') || '').trim());
      if (!pstore) continue;
      var startS = fmtDateCell_(gp(prow, '掲載開始'), false), endS = fmtDateCell_(gp(prow, '掲載終了'), false);
      var active = String(gp(prow, '状態') || '') === '募集中';
      var key = epNormStore_(pstore);
      var rec = storePosting[key] || { name: pstore, active: false, lastEnd: '', latestStart: '', latestEnd: '', media: '', apps: 0, hires: 0, count: 0 };
      if (active) rec.active = true;
      if (endS > rec.lastEnd) rec.lastEnd = endS;
      if (startS >= rec.latestStart) { rec.latestStart = startS; rec.latestEnd = endS; rec.media = String(gp(prow, '媒体') || ''); }
      rec.apps += (+gp(prow, '応募総数') || 0);
      rec.hires += (+gp(prow, '採用人数') || 0);
      rec.count++;
      storePosting[key] = rec;
      postings.push({
        store: pstore, reporter: String(gp(prow, '報告者') || ''), media: String(gp(prow, '媒体') || ''),
        plan: String(gp(prow, '商品名') || ''),
        area1: String(gp(prow, 'エリア1') || ''), area2: String(gp(prow, 'エリア2') || ''),
        line1: String(gp(prow, '路線1') || ''), line2: String(gp(prow, '路線2') || ''),
        cost: gp(prow, '求人費'), start: startS, end: endS, apps: gp(prow, '応募総数'),
        hires: gp(prow, '採用人数'), unit: gp(prow, '採用単価'), hireRate: String(gp(prow, '採用率') || ''),
        quit: gp(prow, '退職人数'), quitRate: String(gp(prow, '退職率') || ''),
        state: String(gp(prow, '状態') || ''), note: String(gp(prow, '備考') || ''),
        srcSheet: String(gp(prow, '元シート') || ''), srcRow: gp(prow, '元行')
      });
    }
  }

  // 最終実行
  var last = null, run = ss.getSheetByName('_実行ログ');
  if (run && run.getLastRow() > 1) { var lr = run.getRange(run.getLastRow(), 1, 1, 6).getValues()[0]; last = { at: String(lr[0]), result: String(lr[2]), n: lr[3] }; }

  // 結果報告を打ち込むスプレッドシートのURL（未提出アラートの飛び先）
  var reportUrl = 'https://docs.google.com/spreadsheets/d/' + NOTION_POSTINGS_SHEET_ID + '/edit';

  // ステータス変更（書き戻し）用の情報
  var statusMap = (typeof EP_STATUS_MAP !== 'undefined') ? EP_STATUS_MAP : {};
  var statusOrder = (typeof EP_STATUS_ORDER !== 'undefined') ? EP_STATUS_ORDER : [];
  var writeEnabled = (typeof epWriteEnabled_ === 'function') ? epWriteEnabled_() : false;

  // EntryPocketで「掲載中の求人原稿がある店舗」（募集中タブに出す）
  var liveShops = (typeof epLiveShops_ === 'function') ? epLiveShops_(ss) : [];

  return { dash: dash, apps: apps, last: last, storeManual: storeManual, storePosting: storePosting, postings: postings, reportUrl: reportUrl,
    statusMap: statusMap, statusOrder: statusOrder, writeEnabled: writeEnabled, liveShops: liveShops };
}

/**
 * 表示用データを1個作って app_cache シートへ保存する（取得直後に呼ぶ）。
 * これにより「アプリを開く」は保存済みデータを読むだけになり、ほぼ一瞬になる。
 * 長いJSONはセル上限を避けて分割保存する。
 */
function dashStoreCache_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var json = JSON.stringify(dashBuild_());
  var sh = ss.getSheetByName('app_cache');
  if (!sh) { sh = ss.insertSheet('app_cache'); }
  sh.clearContents();
  var CH = 45000, rows = [];
  for (var i = 0; i < json.length; i += CH) rows.push([json.substr(i, CH)]);
  if (!rows.length) rows = [['{}']];
  sh.getRange(1, 1, rows.length, 1).setValues(rows);
  try { sh.hideSheet(); } catch (e) { }
}

/** 更新ボタン: その場で取得を実行して結果を返す。診断用に件数も返す。 */
function dashRefresh() {
  try {
    var ok = epRun();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var pp = ss.getSheetByName('求人打ち出し'), raw = ss.getSheetByName('raw_応募者');
    var postings = pp ? Math.max(0, pp.getLastRow() - 1) : 0;
    var apps = raw ? Math.max(0, raw.getLastRow() - 1) : 0;
    // 募集中（状態列＝募集中）の件数も数える
    var active = 0;
    if (pp && postings > 0) {
      var v = pp.getDataRange().getValues(), h = v[0], si = h.indexOf('状態');
      if (si >= 0) for (var i = 1; i < v.length; i++) if (String(v[i][si]) === '募集中') active++;
    }
    var live = (typeof epLiveShops_ === 'function') ? epLiveShops_(ss).length : 0;
    return { ok: ok, postings: postings, active: active, apps: apps, live: live };
  } catch (e) { return { ok: false, error: String(e) }; }
}

/** 診断: 取り込み元(求人打ち出しの元スプシ)に何件あるかを返す（更新は走らせない）。 */
function dashDiagPostings() {
  try {
    var rows = (typeof epFetchNotionRows_ === 'function') ? epFetchNotionRows_() : null, src = 'Notion';
    if (!rows || !rows.length) { rows = (typeof epFetchPostingSheetRows_ === 'function') ? epFetchPostingSheetRows_() : null; src = 'スプレッドシート'; }
    var n = rows ? rows.length : -1;
    var sample = (rows && rows.length) ? rows.slice(0, 3).map(function (r) { return { store: r.store, start: r.start, end: r.end, apps: r.apps, hired: r.hired }; }) : [];
    return { source: src, rows: n, sample: sample };
  } catch (e) { return { error: String(e) }; }
}
