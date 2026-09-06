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
    // 表示スナップショット(app_cache)を今すぐ作り直す。名寄せ等コード反映を次の自動取得を待たず即反映させる用。
    // ※ refresh は「パラメータが在るか」で判定（値が空でも作動）。認証は key（EP_PUSH_KEY未設定なら不要）。
    if (e.parameter.refresh != null) {
      var ro;
      try {
        var needR = PropertiesService.getScriptProperties().getProperty('EP_PUSH_KEY') || '';
        if (needR && String(e.parameter.key || '') !== needR) { ro = { ok: false, error: 'forbidden' }; }
        else {
          var ss0 = SpreadsheetApp.getActiveSpreadsheet();
          try { epImportPostings_(ss0); } catch (ri) { }   // 元スプシ→求人打ち出し を取り込み直し
          dashStoreCache_();                                 // 表示用スナップショットを作り直す
          ro = { ok: true, refreshed: true };
        }
      } catch (err4) { ro = { ok: false, error: String(err4) }; }
      return ContentService.createTextOutput(JSON.stringify(ro)).setMimeType(ContentService.MimeType.JSON);
    }
    // 【取得を今すぐ実行】更新ボタンと同じ epRun を走らせて結果と件数を返す。?run=1（key保護）
    if (e.parameter.run != null) {
      var rno;
      try {
        var needRun = PropertiesService.getScriptProperties().getProperty('EP_PUSH_KEY') || '';
        if (needRun && String(e.parameter.key || '') !== needRun) { rno = { ok: false, error: 'forbidden' }; }
        else rno = dashRefresh();   // epRun() を実行 → 取得＆キャッシュ更新、件数を返す
      } catch (errrun) { rno = { ok: false, error: String(errrun) }; }
      return ContentService.createTextOutput(JSON.stringify(rno)).setMimeType(ContentService.MimeType.JSON);
    }
    // 【診断・読み取りのみ】リスティング列の実データを確認する（分析設計用）。
    if (e.parameter.probe === 'listing') {
      var po; try { po = epProbeListing_(); } catch (err5) { po = { ok: false, error: String(err5) }; }
      return ContentService.createTextOutput(JSON.stringify(po)).setMimeType(ContentService.MimeType.JSON);
    }
    // 【診断・読み取りのみ】集計の内訳（全体/年/地域/媒体/店舗の 求人費・採用・採用単価）を返す。
    if (e.parameter.diag === 'agg') {
      var da; try { da = { ok: true, text: epAIContext_() }; } catch (errd) { da = { ok: false, error: String(errd) }; }
      return ContentService.createTextOutput(JSON.stringify(da)).setMimeType(ContentService.MimeType.JSON);
    }
    // 【診断・読み取りのみ】複数ブラウザ(UA)でログイン画面にアクセスし、どれが通るかを返す。
    if (e.parameter.diag === 'ua') {
      var du; try { du = { ok: true, ua: (typeof epDiagUA_ === 'function') ? epDiagUA_() : 'n/a' }; } catch (erru) { du = { ok: false, error: String(erru) }; }
      return ContentService.createTextOutput(JSON.stringify(du)).setMimeType(ContentService.MimeType.JSON);
    }
    // 【診断・読み取りのみ】ログインの各段階をステータスコード付きで返す＝どこで403になるか。
    if (e.parameter.diag === 'login') {
      var dl; try { dl = { ok: true, login: (typeof epDiagLogin_ === 'function') ? epDiagLogin_() : 'n/a' }; } catch (errl) { dl = { ok: false, error: String(errl) }; }
      return ContentService.createTextOutput(JSON.stringify(dl)).setMimeType(ContentService.MimeType.JSON);
    }
    // 【診断・読み取りのみ】取得(epRun)の実行ログ（_実行ログ の直近行）を返す＝取得が止まった原因の切り分け用。
    if (e.parameter.diag === 'run') {
      var dr;
      try {
        var rss = SpreadsheetApp.getActiveSpreadsheet(), rsh = rss.getSheetByName('_実行ログ'), rows = [];
        if (rsh && rsh.getLastRow() > 1) {
          var hh2 = rsh.getRange(1, 1, 1, rsh.getLastColumn()).getValues()[0];
          var start = Math.max(2, rsh.getLastRow() - 9);
          var rv = rsh.getRange(start, 1, rsh.getLastRow() - start + 1, rsh.getLastColumn()).getValues();
          rows = rv.map(function (r) { var o = {}; hh2.forEach(function (h, i) { o[String(h) || ('col' + i)] = String(r[i]); }); return o; }).reverse();
        }
        dr = { ok: true, header: rsh ? rsh.getRange(1, 1, 1, rsh.getLastColumn()).getValues()[0] : [], rows: rows };
      } catch (errr) { dr = { ok: false, error: String(errr) }; }
      return ContentService.createTextOutput(JSON.stringify(dr)).setMimeType(ContentService.MimeType.JSON);
    }
    // 週次/月次サマリーを組み立てて通知キューに積む（送信役=Actionsが即ドレインして配信）。
    if (e.parameter.summary) {
      var su;
      try {
        var needS = PropertiesService.getScriptProperties().getProperty('EP_PUSH_KEY') || '';
        if (needS && String(e.parameter.key || '') !== needS) { su = { ok: false, error: 'forbidden' }; }
        else {
          var t = epBuildSummaryText_(e.parameter.summary === 'monthly' ? 'monthly' : 'weekly');
          if (!e.parameter.dry && typeof epEnqueuePush_ === 'function') epEnqueuePush_(t.title, t.body, 'recruit');  // dry=プレビュー(送らない)
          su = { ok: true, dry: !!e.parameter.dry, title: t.title, body: t.body };
        }
      } catch (err7) { su = { ok: false, error: String(err7) }; }
      return ContentService.createTextOutput(JSON.stringify(su)).setMimeType(ContentService.MimeType.JSON);
    }
    // 取得の健全性チェック（最終取得が古い/失敗ならアラートを積む）。?health=時間
    if (e.parameter.health) {
      var ho;
      try {
        var needH = PropertiesService.getScriptProperties().getProperty('EP_PUSH_KEY') || '';
        if (needH && String(e.parameter.key || '') !== needH) { ho = { ok: false, error: 'forbidden' }; }
        else { var mh = parseInt(e.parameter.health, 10); if (!(mh > 0)) mh = 12; ho = epHealthCheck_(mh, !!e.parameter.dry); }
      } catch (e9) { ho = { ok: false, error: String(e9) }; }
      return ContentService.createTextOutput(JSON.stringify(ho)).setMimeType(ContentService.MimeType.JSON);
    }
    // 面接リマインド＋結果未提出リマインド（1日1回）。?remind=1
    if (e.parameter.remind) {
      var rmo;
      try {
        var needRm = PropertiesService.getScriptProperties().getProperty('EP_PUSH_KEY') || '';
        if (needRm && String(e.parameter.key || '') !== needRm) { rmo = { ok: false, error: 'forbidden' }; }
        else rmo = epRemind_(!!e.parameter.dry);
      } catch (e10) { rmo = { ok: false, error: String(e10) }; }
      return ContentService.createTextOutput(JSON.stringify(rmo)).setMimeType(ContentService.MimeType.JSON);
    }
    // 未対応（新規/未対応のまま）の応募が指定時間以上あれば通知キューに積む。?untreated=時間
    if (e.parameter.untreated) {
      var uo;
      try {
        var needU = PropertiesService.getScriptProperties().getProperty('EP_PUSH_KEY') || '';
        if (needU && String(e.parameter.key || '') !== needU) { uo = { ok: false, error: 'forbidden' }; }
        else { var hh = parseInt(e.parameter.untreated, 10); if (!(hh > 0)) hh = 6; uo = epNotifyUntreated_(hh, !!e.parameter.dry); }
      } catch (err8) { uo = { ok: false, error: String(err8) }; }
      return ContentService.createTextOutput(JSON.stringify(uo)).setMimeType(ContentService.MimeType.JSON);
    }
    // 店舗別スコアカードを1店1通ずつ通知キューへ（送信役が店舗prefsで各店長へ振り分け）。?scorecard=1（dryでプレビュー）
    if (e.parameter.scorecard) {
      var sco;
      try {
        var needSc = PropertiesService.getScriptProperties().getProperty('EP_PUSH_KEY') || '';
        if (needSc && String(e.parameter.key || '') !== needSc) { sco = { ok: false, error: 'forbidden' }; }
        else sco = epScorecard_(!!e.parameter.dry);
      } catch (err9b) { sco = { ok: false, error: String(err9b) }; }
      return ContentService.createTextOutput(JSON.stringify(sco)).setMimeType(ContentService.MimeType.JSON);
    }
    // master_店舗/地域や目標シートの用意（setup=regions / setup=goals）。
    if (e.parameter.setup) {
      var so2;
      try {
        var needK = PropertiesService.getScriptProperties().getProperty('EP_PUSH_KEY') || '';
        if (needK && String(e.parameter.key || '') !== needK) { so2 = { ok: false, error: 'forbidden' }; }
        else if (e.parameter.setup === 'goals') { so2 = epSetupGoals_(); try { dashStoreCache_(); } catch (e6b) { } }
        else if (e.parameter.setup === 'media') { so2 = epSetupMedia_(); try { dashStoreCache_(); } catch (e6c) { } }
        else { so2 = epSetupRegionColumn(); try { dashStoreCache_(); } catch (e6) { } }
      } catch (err6) { so2 = { ok: false, error: String(err6) }; }
      return ContentService.createTextOutput(JSON.stringify(so2)).setMimeType(ContentService.MimeType.JSON);
    }
    // 他媒体（飲食店ドットコム/グルメキャリー）の応募者一覧（JSON）
    if (e.parameter.media === 'list') {
      var ml; try { ml = mediaListData_(); } catch (e2m) { ml = { ok: false, error: String(e2m), items: [] }; }
      return ContentService.createTextOutput(JSON.stringify(ml)).setMimeType(ContentService.MimeType.JSON);
    }
    // 他媒体の応募者一覧ページ（別ページ）
    if (e.parameter.page === 'media') {
      var mdata; try { mdata = mediaListData_(); } catch (errm) { mdata = { ok: false, error: String(errm), items: [] }; }
      var mt = HtmlService.createTemplateFromFile('media');
      mt.MEDIA = jsonForScript_(mdata);
      return mt.evaluate().setTitle('他媒体の応募者')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    // 結果入力だけの共有ページ（他の人に入力を依頼するURL）
    if (e.parameter.entry) {
      var eo = {}; try { eo = JSON.parse(e.parameter.d || '{}'); } catch (x) { eo = {}; }
      var data; try { data = epEntryData_(eo); } catch (err3) { data = { ok: false, error: String(err3) }; }
      var t = HtmlService.createTemplateFromFile('entry');
      t.ENTRY = jsonForScript_(data);
      return t.evaluate().setTitle('求人結果 入力').addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
    }
  }
  // ダッシュボード本体。?store=… は店長用ビュー（その店舗だけ・閲覧専用）。SCOPEをページに注入。
  var scope = (e && e.parameter && e.parameter.store) ? String(e.parameter.store) : '';
  var tpl = HtmlService.createTemplateFromFile('index');
  tpl.SCOPE = jsonForScript_(scope);
  return tpl.evaluate()
    .setTitle(scope ? (scope + ' 求人ビュー') : 'Initiateエンポケ求人')
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
    else if (o.api === 'importcsv') out = (typeof epImportCsvB64 === 'function') ? epImportCsvB64(o.b64 || '') : { ok: false, error: 'import未対応' };
    else if (o.api === 'media_importcsv') out = (typeof mediaImportCsvB64 === 'function') ? mediaImportCsvB64(o.media || '', o.b64 || '') : { ok: false, error: 'media import未対応' };
    else if (o.api === 'pc_alert') out = epPcAlert_(o);
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
function dashData(scope) {
  scope = scope ? String(scope) : '';
  var o = null, ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('app_cache');
  if (sh && sh.getLastRow() > 0) {
    var parts = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
    var json = parts.map(function (r) { return r[0]; }).join('');
    try { var p = JSON.parse(json); if (p && p.apps) o = p; } catch (e) { }
  }
  if (!o) o = dashBuild_();  // キャッシュが無い/壊れている時だけ、その場で作る
  return scope ? dashScope_(o, scope) : o;
}

/** 店長用ビュー：指定店舗のデータだけに絞り、書き込みを無効化して返す（閲覧専用）。 */
function dashScope_(o, scope) {
  var k = epNormStore_(epCleanStore_(scope));
  var mt = function (s) { return epNormStore_(epCleanStore_(String(s || ''))) === k; };
  var out = {}; for (var key in o) out[key] = o[key];   // 浅いコピー
  out.apps = (o.apps || []).filter(function (a) { return mt(a.store); });
  out.postings = (o.postings || []).filter(function (p) { return mt(p.store); });
  var sp = {}, spo = o.storePosting || {}; for (var kk in spo) { if (mt(spo[kk].name)) sp[kk] = spo[kk]; } out.storePosting = sp;
  out.writeEnabled = false;   // 店長ビューは閲覧専用
  out.scoped = scope;
  out.scopedName = (out.postings[0] && out.postings[0].store) || (out.apps[0] && out.apps[0].store) || scope;
  out.dash = {};              // 全体集計は店長ビューでは出さない
  return out;
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
  var stores = {}, storeManual = {}, storeRegion = [];
  var ms = ss.getSheetByName('master_店舗');
  if (ms) {
    var sv = ms.getDataRange().getValues();
    var hdr0 = (sv[0] || []).map(function (x) { return String(x || '').replace(/　/g, '').trim(); });
    var regCol = hdr0.indexOf('地域'); if (regCol < 0) regCol = hdr0.indexOf('エリア地域');
    for (var i = 1; i < sv.length; i++) {
      if (sv[i][0] === '') continue;
      var disp = epCleanStore_(sv[i][1] || String(sv[i][0]));
      stores[String(sv[i][0])] = disp;
      var man = sv[i].length > 5 ? String(sv[i][5] || '').trim() : '';
      if (man) storeManual[disp] = man;
      if (regCol >= 0) { var rg = String(sv[i][regCol] || '').trim(); if (rg) storeRegion.push({ name: disp, region: rg }); }
    }
  }
  // 専用シート master_地域（店舗名｜地域）を後勝ちで反映（こちらが店舗→地域の正）
  var rms = ss.getSheetByName('master_地域');
  if (rms && rms.getLastRow() > 1) {
    var rvv = rms.getRange(1, 1, rms.getLastRow(), 2).getValues();
    for (var ri = 1; ri < rvv.length; ri++) { var rn = epCleanStore_(String(rvv[ri][0] || '')), rr = String(rvv[ri][1] || '').trim(); if (rn && rr) storeRegion.push({ name: rn, region: rr }); }
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

  // 採用/応募の月間目標（master_目標：地域｜月間応募目標｜月間採用目標）
  var goals = [];
  var gs = ss.getSheetByName('master_目標');
  if (gs && gs.getLastRow() > 1) {
    var gv = gs.getDataRange().getValues();
    for (var gi = 1; gi < gv.length; gi++) {
      var grg = String(gv[gi][0] || '').trim();
      var ag = parseInt(String(gv[gi][1] || '').replace(/[^\d]/g, ''), 10);
      var hg = parseInt(String(gv[gi][2] || '').replace(/[^\d]/g, ''), 10);
      var cb = parseInt(String(gv[gi][3] || '').replace(/[^\d]/g, ''), 10);
      if (grg && (!isNaN(ag) || !isNaN(hg) || !isNaN(cb))) goals.push({ region: grg, appGoal: isNaN(ag) ? 0 : ag, hireGoal: isNaN(hg) ? 0 : hg, costBudget: isNaN(cb) ? 0 : cb });
    }
  }

  // 媒体ごとの標準打ち出し週数（master_媒体：媒体｜標準週数）→ 連載終了日の自動セットに使う
  var mediaWeeks = epMediaWeeks_(ss);

  return { dash: dash, apps: apps, last: last, storeManual: storeManual, storePosting: storePosting, postings: postings, reportUrl: reportUrl,
    statusMap: statusMap, statusOrder: statusOrder, writeEnabled: writeEnabled, liveShops: liveShops, storeRegion: storeRegion, goals: goals, mediaWeeks: mediaWeeks };
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

// 店舗名だけでは自動判定できない店の地域を明示指定（正規化キー＝空白除去。ユーザー確認済み）。
var EP_STORE_REGION_FIX = { "ひよこ飯店": "大阪", "すさび湯歌舞伎町店": "東京", "大衆酒場ぎふや天神イナチカ店": "福岡" };

/** 未対応（新規/未対応）の応募が hours 時間以上あれば通知を積む。dry=積まずに件数だけ返す。 */
function epNotifyUntreated_(hours, dry) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), raw = ss.getSheetByName('raw_応募者');
  if (!raw || raw.getLastRow() < 2) return { ok: true, count: 0 };
  var v = raw.getDataRange().getValues(), h = v[0], ci = {}; h.forEach(function (x, i) { ci[String(x)] = i; });
  var cA = ci['応募日時'], cS = ci['ステータス'], cSt = ci['店舗名'], cG = ci['消失'];
  var now = new Date(), thr = hours * 3600000, cnt = 0, oldest = 0, byStore = {};
  for (var i = 1; i < v.length; i++) {
    if (cG != null && String(v[i][cG]) === 'TRUE') continue;
    var st = String(cS != null ? v[i][cS] : ''); if (!/未対応|新規/.test(st)) continue;
    var d = cA != null ? epDate_(v[i][cA]) : null, ageMs = d ? (now.getTime() - d.getTime()) : 0;
    if (ageMs < thr) continue;
    if (ageMs > 10 * 86400000) continue;   // 直近10日より古い未対応はアラート対象外
    cnt++; if (ageMs > oldest) oldest = ageMs;
    var s = epCleanStore_(String(cSt != null ? v[i][cSt] : '')) || '不明'; byStore[s] = (byStore[s] || 0) + 1;
  }
  if (!cnt) return { ok: true, count: 0 };
  var oh = Math.floor(oldest / 3600000), ageTxt = oh >= 24 ? (Math.floor(oh / 24) + '日') : (oh + '時間');
  var top = Object.keys(byStore).sort(function (a, b) { return byStore[b] - byStore[a]; }).slice(0, 5).map(function (s) { return '・' + s + ' ' + byStore[s] + '件'; });
  var title = '🔴 未対応の応募 ' + cnt + '件';
  var body = '最長 ' + ageTxt + '放置。早めの初回連絡を。\n' + top.join('\n');
  if (!dry && typeof epEnqueuePush_ === 'function') epEnqueuePush_(title, body, 'recruit');
  return { ok: true, count: cnt, oldestHours: oh, dry: !!dry, title: title, body: body };
}

/** master_媒体（媒体｜標準週数）を配列 [{media,weeks}] で読む。 */
function epMediaWeeks_(ss) {
  var out = [], mw = ss.getSheetByName('master_媒体');
  if (mw && mw.getLastRow() > 1) {
    var mv = mw.getDataRange().getValues();
    for (var i = 1; i < mv.length; i++) {
      var m = String(mv[i][0] || '').trim();
      var wk = parseFloat(String(mv[i][1] || '').replace(/[^\d.]/g, ''));
      if (m && !isNaN(wk) && wk > 0) out.push({ media: m, weeks: wk });
    }
  }
  return out;
}

/** master_媒体（媒体｜標準週数）を用意。標準週数は空欄なら過去実績の平均週数で仮入力（既存値は保護）。 */
function epSetupMedia_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mw = ss.getSheetByName('master_媒体'), existing = {};
  if (mw && mw.getLastRow() > 0) { var mv = mw.getDataRange().getValues(); for (var i = 1; i < mv.length; i++) { var m = String(mv[i][0] || '').trim(); if (m) existing[m] = mv[i][1]; } }
  else { mw = ss.insertSheet('master_媒体'); }
  var pp = ss.getSheetByName('求人打ち出し'), weeksBy = {}, medias = {};
  if (pp && pp.getLastRow() > 1) {
    var pv = pp.getDataRange().getValues(), ph = pv[0], pc = {}; ph.forEach(function (x, i) { pc[String(x)] = i; });
    var cM = pc['媒体'], cS = pc['掲載開始'], cE = pc['掲載終了'];
    for (var j = 1; j < pv.length; j++) {
      var m2 = String(cM != null ? pv[j][cM] : '').trim(); if (!m2) continue; medias[m2] = 1;
      var s = epDate_(pv[j][cS]), e = epDate_(pv[j][cE]); if (s && e) { var d = Math.round((e.getTime() - s.getTime()) / 86400000); if (d > 0) (weeksBy[m2] = weeksBy[m2] || []).push(d / 7); }
    }
  }
  var order = Object.keys(medias).sort(), list = [];
  var out = [['媒体', '標準週数']];
  order.forEach(function (m) {
    var val = existing[m];
    if (val == null || String(val).trim() === '') { var wl = weeksBy[m] || []; if (wl.length) { var avg = wl.reduce(function (a, b) { return a + b; }, 0) / wl.length; val = Math.round(avg * 2) / 2; } else val = ''; }
    out.push([m, val]); list.push({ media: m, weeks: val });
  });
  mw.clearContents(); mw.getRange(1, 1, out.length, 2).setValues(out);
  return { ok: true, sheet: 'master_媒体', rows: order.length, list: list };
}

/** master_目標（地域｜月間応募目標｜月間採用目標）を用意する。既存の目標値は保護。 */
function epSetupGoals_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var gs = ss.getSheetByName('master_目標'), existing = {};
  if (gs && gs.getLastRow() > 0) { var gv = gs.getDataRange().getValues(); for (var i = 1; i < gv.length; i++) { var r = String(gv[i][0] || '').trim(); if (r) existing[r] = [gv[i][1], gv[i][2], gv[i][3]]; } }
  else { gs = ss.insertSheet('master_目標'); }
  var regs = { '全体': 1 }, rms = ss.getSheetByName('master_地域');
  if (rms && rms.getLastRow() > 1) { var rv = rms.getRange(1, 1, rms.getLastRow(), 2).getValues(); for (var j = 1; j < rv.length; j++) { var rr = String(rv[j][1] || '').trim(); if (rr) regs[rr] = 1; } }
  var order = ['全体', '大阪', '京都', '兵庫', '東京', '福岡'];
  var keys = order.filter(function (r) { return regs[r]; }).concat(Object.keys(regs).filter(function (r) { return order.indexOf(r) < 0; }));
  var sug = epGoalSuggest_(ss);
  function pick(ex, sg) { return (ex !== '' && ex != null) ? ex : (sg != null ? sg : ''); }
  var out = [['地域', '月間応募目標', '月間採用目標', '月間求人費予算']];
  keys.forEach(function (r) { var e = existing[r] || ['', '', ''], s = sug[r] || ['', '', '']; out.push([r, pick(e[0], s[0]), pick(e[1], s[1]), pick(e[2], s[2])]); });
  gs.clearContents(); gs.getRange(1, 1, out.length, 4).setValues(out);
  return { ok: true, sheet: 'master_目標', rows: keys.length, suggested: Object.keys(sug).length };
}

/** 目標・予算のたたき台：直近約3か月の実績から 地域別・全体の 月平均 応募/採用/求人費 を出す。 */
function epGoalSuggest_(ss) {
  var out = {}, pp = ss.getSheetByName('求人打ち出し');
  if (!pp || pp.getLastRow() < 2) return out;
  var v = pp.getDataRange().getValues(), h = v[0], c = {}; h.forEach(function (x, i) { c[String(x)] = i; });
  var g = function (r, n) { var i = c[n]; return i == null ? '' : r[i]; };
  var iv = function (x) { return parseInt(String(x || '').replace(/[^\d]/g, ''), 10) || 0; };
  var fv = function (x) { return parseFloat(String(x || '').replace(/[^\d.]/g, '')) || 0; };
  var reg = {}, rms = ss.getSheetByName('master_地域');
  if (rms && rms.getLastRow() > 1) { var rv = rms.getRange(1, 1, rms.getLastRow(), 2).getValues(); for (var j = 1; j < rv.length; j++) { var nm = epNormStore_(epCleanStore_(String(rv[j][0] || ''))), rr = String(rv[j][1] || '').trim(); if (nm && rr) reg[nm] = rr; } }
  var from = new Date().getTime() - 92 * 86400000, acc = {};
  function ent(k) { if (!acc[k]) acc[k] = { app: 0, hire: 0, cost: 0, mon: {} }; return acc[k]; }
  for (var i = 1; i < v.length; i++) {
    var st = epCleanStore_(String(g(v[i], '店舗名') || '')); if (!st) continue;
    var d = epDate_(g(v[i], '掲載開始')) || epDate_(g(v[i], '掲載終了')); if (!d || d.getTime() < from) continue;
    var region = reg[epNormStore_(st)] || '未設定', mkey = d.getFullYear() + '-' + d.getMonth();
    [region, '全体'].forEach(function (rk) { var o = ent(rk); o.app += iv(g(v[i], '応募総数')); o.hire += iv(g(v[i], '採用人数')); o.cost += fv(g(v[i], '求人費')); o.mon[mkey] = 1; });
  }
  Object.keys(acc).forEach(function (k) { var o = acc[k], m = Math.max(1, Object.keys(o.mon).length); out[k] = [Math.round(o.app / m), Math.round(o.hire / m), Math.round(o.cost / m)]; });
  return out;
}

/** 【AI】求人データの要約テキストを作る（Claudeへ渡す根拠データ）。 */
function epAIContext_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), L = [];
  var pp = ss.getSheetByName('求人打ち出し');
  if (pp && pp.getLastRow() > 1) {
    var v = pp.getDataRange().getValues(), h = v[0], c = {}; h.forEach(function (x, i) { c[String(x)] = i; });
    var g = function (r, n) { var i = c[n]; return i == null ? '' : r[i]; };
    var iv = function (x) { return parseInt(String(x || '').replace(/[^\d]/g, ''), 10) || 0; };
    var fv = function (x) { return parseFloat(String(x || '').replace(/[^\d.]/g, '')) || 0; };
    var rows = [];
    for (var i = 1; i < v.length; i++) { var st = epCleanStore_(String(g(v[i], '店舗名') || '')); if (!st) continue;
      rows.push({ store: st, media: String(g(v[i], '媒体') || '').trim(), apps: iv(g(v[i], '応募総数')), hires: iv(g(v[i], '採用人数')), cost: fv(g(v[i], '求人費')), quit: iv(g(v[i], '退職人数')), start: g(v[i], '掲載開始'), end: g(v[i], '掲載終了') }); }
    var reg = {}, rms = ss.getSheetByName('master_地域');
    if (rms && rms.getLastRow() > 1) { var rv = rms.getRange(1, 1, rms.getLastRow(), 2).getValues(); for (var j = 1; j < rv.length; j++) { var nm = epNormStore_(epCleanStore_(String(rv[j][0] || ''))), rr = String(rv[j][1] || '').trim(); if (nm && rr) reg[nm] = rr; } }
    var yearOf = function (r) { var d = epDate_(r.start) || epDate_(r.end); return d ? d.getFullYear() : '不明'; };
    var sum = function (list) { var a = 0, hh = 0, co = 0, q = 0; list.forEach(function (r) { a += r.apps; hh += r.hires; co += r.cost; q += r.quit; }); return { n: list.length, apps: a, hires: hh, cost: co, quit: q, cph: hh ? Math.round(co / hh) : 0, rate: a ? (hh / a * 100).toFixed(1) : '0' }; };
    var line = function (label, s) { return label + ': 打ち出し' + s.n + '件 応募' + s.apps + ' 採用' + s.hires + ' 求人費' + s.cost + '円 採用単価' + s.cph + '円 採用率' + s.rate + '% 退職' + s.quit; };
    L.push(line('■全体', sum(rows)));
    var group = function (keyFn, prefix) { var by = {}; rows.forEach(function (r) { var k = keyFn(r); (by[k] = by[k] || []).push(r); }); Object.keys(by).sort().forEach(function (k) { L.push(line(prefix + k, sum(by[k]))); }); };
    L.push('― 年別 ―'); group(yearOf, '年');
    L.push('― 地域別 ―'); group(function (r) { return reg[epNormStore_(r.store)] || '未設定'; }, '地域:');
    L.push('― 媒体別 ―'); group(function (r) { return r.media || '(媒体なし)'; }, '媒体:');
    L.push('― 店舗別 ―'); group(function (r) { return r.store; }, '店舗:');
    // 【診断】求人費が未入力(0/空)なのに採用>0の打ち出し＝加重平均の採用単価を押し下げる主因
    var noCost = rows.filter(function (r) { return r.cost <= 0; });
    var noCostHired = noCost.filter(function (r) { return r.hires > 0; });
    var ncHires = noCostHired.reduce(function (s, r) { return s + r.hires; }, 0);
    var withCost = rows.filter(function (r) { return r.cost > 0; });
    var wcCost = withCost.reduce(function (s, r) { return s + r.cost; }, 0);
    var wcHires = withCost.reduce(function (s, r) { return s + r.hires; }, 0);
    L.push('― 費用未入力チェック ―');
    L.push('求人費0/空の打ち出し: ' + noCost.length + '件（うち採用>0: ' + noCostHired.length + '件・採用' + ncHires + '人）');
    L.push('求人費入力済みのみで再計算 → 求人費' + wcCost + '円 ÷ 採用' + wcHires + '人 = 採用単価' + (wcHires ? Math.round(wcCost / wcHires) : 0) + '円');
    if (noCostHired.length) L.push('費用未入力で採用ありの店: ' + noCostHired.slice(0, 20).map(function (r) { return r.store + '(' + r.hires + ')'; }).join('、'));
  }
  var raw = ss.getSheetByName('raw_応募者');
  if (raw && raw.getLastRow() > 1) {
    var rv2 = raw.getDataRange().getValues(), h2 = rv2[0], ci = {}; h2.forEach(function (x, i) { ci[String(x)] = i; });
    var cSt = ci['ステータス'], cG = ci['消失'], cA = ci['応募日時']; var now = new Date(), un = 0, l7 = 0, tot = 0;
    for (var k2 = 1; k2 < rv2.length; k2++) { if (cG != null && String(rv2[k2][cG]) === 'TRUE') continue; tot++; var s2 = String(cSt != null ? rv2[k2][cSt] : ''); if (/未対応|新規/.test(s2)) un++; var d2 = cA != null ? epDate_(rv2[k2][cA]) : null; if (d2 && (now - d2) / 86400000 < 7) l7++; }
    L.push('■現在の応募者 合計' + tot + '名: 未対応/新規' + un + '件、直近7日の応募' + l7 + '件');
  }
  return L.join('\n');
}

/** 【AI】質問にデータ根拠で答える（Claude API・要ANTHROPIC_API_KEY）。クライアントから google.script.run で呼ぶ。 */
function epAskAI(q) {
  q = String(q || '').trim(); if (!q) return { ok: false, error: '質問が空です' };
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('ANTHROPIC_API_KEY') || '';
  if (!key) return { ok: false, error: 'AIキーが未設定です（Apps Scriptのスクリプトプロパティ ANTHROPIC_API_KEY を登録してください）' };
  var model = props.getProperty('EP_AI_MODEL') || 'claude-haiku-4-5-20251001';
  var ctx; try { ctx = epAIContext_(); } catch (e) { ctx = '(データ取得エラー)'; }
  var sys = 'あなたは求人採用データの分析アシスタントです。以下の【データ】だけを根拠に、日本語で簡潔・具体的に答えてください。数値は与えられた範囲で示し、根拠の店舗名・媒体・地域も添える。データに無いことは「データにありません」と述べる。箇条書きを活用。';
  try {
    var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({ model: model, max_tokens: 800, system: sys, messages: [{ role: 'user', content: '【データ】\n' + ctx + '\n\n【質問】' + q }] }),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode(), body = res.getContentText();
    if (code < 200 || code >= 300) return { ok: false, error: 'API ' + code + '：' + body.slice(0, 300) };
    var jj = JSON.parse(body); var txt = (jj.content && jj.content[0] && jj.content[0].text) || '';
    return { ok: true, answer: txt };
  } catch (e2) { return { ok: false, error: String(e2) }; }
}

/** 日時文字列 "yyyy-MM-dd HH:mm(:ss)" → Date（時刻あり）。読めなければ null。 */
function epParseDT_(s) {
  var m = String(s || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+(\d{1,2}):(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
}

/** 取得の健全性：最終取得が maxHours 以上前／直近が失敗ならアラートを積む。dry=積まず状態のみ。 */
function epHealthCheck_(maxHours, dry) {
  maxHours = maxHours || 12;
  var ss = SpreadsheetApp.getActiveSpreadsheet(), run = ss.getSheetByName('_実行ログ');
  if (!run || run.getLastRow() < 2) return { ok: true, alerted: false, note: '実行ログなし' };
  var lr = run.getRange(run.getLastRow(), 1, 1, 6).getValues()[0];
  var at = epParseDT_(lr[0]) || epDate_(lr[0]), result = String(lr[2] || ''), now = new Date();
  var hrs = at ? Math.floor((now.getTime() - at.getTime()) / 3600000) : 9999;
  var failed = result && result !== 'success';
  var stale = hrs >= maxHours;
  if (!failed && !stale) return { ok: true, alerted: false, lastAt: String(lr[0]), result: result, hrsAgo: hrs };
  var body = (stale ? '最後の取得から約' + hrs + '時間、更新がありません。' : '') + (failed ? '直近の取得が失敗しています（' + result + '）。' : '')
    + '\nエントリーポケットのログインや自動実行の状態をご確認ください。';
  if (!dry) epEnqueuePush_('⚠️ 求人データ取得の異常', body, 'recruit');
  return { ok: true, alerted: !dry, lastAt: String(lr[0]), result: result, hrsAgo: hrs };
}

/** 面接リマインド（本日/明日）＋結果未提出リマインド。1日1回だけ積む。 */
function epRemind_(dry) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), props = PropertiesService.getScriptProperties();
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  if (!dry && props.getProperty('EP_REMIND_DATE') === today) return { ok: true, skipped: true };
  var now = new Date(), d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var d1 = new Date(d0.getTime() + 86400000);
  var todayIv = [], tomoIv = [], raw = ss.getSheetByName('raw_応募者');
  if (raw && raw.getLastRow() > 1) {
    var v = raw.getDataRange().getValues(), h = v[0], ci = {}; h.forEach(function (x, i) { ci[String(x)] = i; });
    var cIV = ci['面接日時'], cN = ci['氏名'], cS = ci['店舗名'], cG = ci['消失'];
    for (var i = 1; i < v.length; i++) {
      if (cG != null && String(v[i][cG]) === 'TRUE') continue;
      var t = epParseDT_(cIV != null ? v[i][cIV] : '') || (cIV != null ? epDate_(v[i][cIV]) : null); if (!t) continue;
      var day = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
      var tm = Utilities.formatDate(t, 'Asia/Tokyo', 'HH:mm');
      var line = '・' + tm + ' ' + String(v[i][cN] || '') + '（' + epCleanStore_(String(v[i][cS] || '')) + '）';
      if (day === d0.getTime()) todayIv.push(line); else if (day === d1.getTime()) tomoIv.push(line);
    }
  }
  var unsub = 0, pp = ss.getSheetByName('求人打ち出し');
  if (pp && pp.getLastRow() > 1) {
    var pv = pp.getDataRange().getValues(), ph = pv[0], pc = {}; ph.forEach(function (x, i) { pc[String(x)] = i; });
    var cSt = pc['状態'], cAp = pc['応募総数'], cHi = pc['採用人数'];
    for (var j = 1; j < pv.length; j++) { if (String(pv[j][cSt] || '') !== '募集中' && String(pv[j][cAp] || '') === '' && String(pv[j][cHi] || '') === '') unsub++; }
  }
  var parts = [];
  if (todayIv.length) parts.push('【本日の面接 ' + todayIv.length + '件】\n' + todayIv.join('\n'));
  if (tomoIv.length) parts.push('【明日の面接 ' + tomoIv.length + '件】\n' + tomoIv.join('\n'));
  if (unsub) parts.push('【結果報告 未提出 ' + unsub + '件】入力をお願いします');
  if (!parts.length) return { ok: true, nothing: true };
  if (!dry) { epEnqueuePush_('📅 本日のリマインド', parts.join('\n\n'), 'recruit'); props.setProperty('EP_REMIND_DATE', today); }
  return { ok: true, today: todayIv.length, tomorrow: tomoIv.length, unsub: unsub };
}

/**
 * 店舗別スコアカードを1店1通ずつ通知キューへ積む（送信役が購読prefsの店舗で各店長に振り分け）。
 * data に {store} を入れておくと、その店舗を通知ONにしている購読者だけに届く。dry=プレビュー。
 */
function epScorecard_(dry) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var raw = ss.getSheetByName('raw_応募者');
  if (!raw || raw.getLastRow() < 2) return { ok: true, nothing: true };
  var v = raw.getDataRange().getValues(), h = v[0], ci = {}; h.forEach(function (x, i) { ci[String(x)] = i; });
  var cS = ci['店舗名'], cA = ci['応募日時'], cSt = ci['ステータス'], cIV = ci['面接日時'], cG = ci['消失'];
  var now = new Date(), d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var wk = now.getTime() - 7 * 86400000, by = {};
  function ent(s) { if (!by[s]) by[s] = { store: s, total: 0, last7: 0, unt: 0, ivToday: 0 }; return by[s]; }
  for (var i = 1; i < v.length; i++) {
    if (cG != null && String(v[i][cG]) === 'TRUE') continue;
    var s = epCleanStore_(String(cS != null ? v[i][cS] : '')); if (!s) continue;
    var o = ent(s); o.total++;
    var d = cA != null ? (epParseDT_(v[i][cA]) || epDate_(v[i][cA])) : null;
    if (d && d.getTime() >= wk) o.last7++;
    if (/未対応|新規/.test(String(cSt != null ? v[i][cSt] : ''))) o.unt++;
    var iv = cIV != null ? (epParseDT_(v[i][cIV]) || epDate_(v[i][cIV])) : null;
    if (iv) { var day = new Date(iv.getFullYear(), iv.getMonth(), iv.getDate()).getTime(); if (day === d0.getTime()) o.ivToday++; }
  }
  var cards = [];
  Object.keys(by).forEach(function (s) {
    var o = by[s]; if (!(o.last7 > 0 || o.unt > 0)) return;   // 動きのある店だけ
    var body = '直近7日の応募 ' + o.last7 + '件 ／ 未対応 ' + o.unt + '件 ／ 本日の面接 ' + o.ivToday + '件 ／ 現在の応募者 ' + o.total + '名';
    cards.push({ store: s, title: '📊 ' + s + ' 今週の状況', body: body });
    if (!dry) epEnqueuePush_('📊 ' + s + ' 今週の状況', body, 'recruit', JSON.stringify({ store: s }));
  });
  return { ok: true, count: cards.length, cards: cards };
}

/** 【AI】キー設定状態を返す（鍵そのものは返さない）。 */
function epAIStatus() {
  var p = PropertiesService.getScriptProperties();
  return { ok: true, hasKey: !!(p.getProperty('ANTHROPIC_API_KEY') || ''), model: p.getProperty('EP_AI_MODEL') || 'claude-haiku-4-5-20251001' };
}

/** 【AI】アプリからAPIキーを保存（Apps Scriptを開かずに設定できる）。管理キー必須。
 *  公開Webアプリ(匿名アクセス)のため、ハードコード合言葉は廃止。
 *  Script Property 'EP_ADMIN_KEY' が未設定なら常に拒否（fail-closed）＝匿名での鍵設定・課金濫用を封じる。 */
function epSetAIKey(key, pass) {
  var admin = PropertiesService.getScriptProperties().getProperty('EP_ADMIN_KEY') || '';
  if (!admin || String(pass || '') !== admin) return { ok: false, error: '管理キーが違います（未設定なら無効）' };
  key = String(key || '').trim();
  if (!/^sk-ant-/.test(key)) return { ok: false, error: 'APIキーの形式が不正です（sk-ant- で始まる鍵を貼り付けてください）' };
  PropertiesService.getScriptProperties().setProperty('ANTHROPIC_API_KEY', key);
  return { ok: true };
}

/** 週次/月次サマリーの本文を組み立てる（応募・面接・募集中・未提出・応募上位）。 */
function epBuildSummaryText_(period) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var days = (period === 'monthly') ? 30 : 7;
  var label = (period === 'monthly') ? '今月（直近30日）' : '今週（直近7日）';
  var now = new Date(), from = new Date(now.getTime() - days * 86400000), ivTo = new Date(now.getTime() + days * 86400000);
  // 応募・面接（raw_応募者）
  var newApps = 0, ivCount = 0, byStore = {};
  var raw = ss.getSheetByName('raw_応募者');
  if (raw && raw.getLastRow() > 1) {
    var v = raw.getDataRange().getValues(), h = v[0], ci = {}; h.forEach(function (x, i) { ci[String(x)] = i; });
    var cA = ci['応募日時'], cS = ci['店舗名'], cG = ci['消失'], cIV = ci['面接日時'];
    for (var i = 1; i < v.length; i++) {
      if (cG != null && String(v[i][cG]) === 'TRUE') continue;
      var d = cA != null ? epDate_(v[i][cA]) : null;
      if (d && d >= from && d <= now) { newApps++; var s = epCleanStore_(String(v[i][cS] || '')) || '不明'; byStore[s] = (byStore[s] || 0) + 1; }
      var di = cIV != null ? epDate_(v[i][cIV]) : null;
      if (di && di >= now && di <= ivTo) ivCount++;
    }
  }
  // 募集中・結果未提出（求人打ち出し）
  var active = 0, unsub = 0;
  var pp = ss.getSheetByName('求人打ち出し');
  if (pp && pp.getLastRow() > 1) {
    var pv = pp.getDataRange().getValues(), ph = pv[0], pc = {}; ph.forEach(function (x, i) { pc[String(x)] = i; });
    var cSt = pc['状態'], cAp = pc['応募総数'], cHi = pc['採用人数'];
    for (var j = 1; j < pv.length; j++) {
      var st = String(pv[j][cSt] || '');
      if (st === '募集中') active++;
      else if (String(pv[j][cAp] || '') === '' && String(pv[j][cHi] || '') === '') unsub++;
    }
  }
  var top = Object.keys(byStore).sort(function (a, b) { return byStore[b] - byStore[a]; }).slice(0, 3)
    .map(function (s) { return '・' + s + ' ' + byStore[s] + '件'; });
  var title = '📊 求人サマリー ' + label;
  var body = '新規応募 ' + newApps + '件／募集中 ' + active + '店舗'
    + (ivCount ? '／今後の面接 ' + ivCount + '件' : '')
    + (unsub ? '／結果未提出 ' + unsub + '件' : '')
    + (top.length ? ('\n応募が多い店舗:\n' + top.join('\n')) : '');
  return { title: title, body: body };
}

/** 地域名の推定（エリア名・店舗名などの文字列 → 大阪/京都/兵庫/東京/福岡 のいずれか。該当なしは''）。 */
function epRegionFromText_(t) {
  t = String(t || ''); try { t = t.normalize('NFKC'); } catch (e) { }
  var map = [['東京', '東京'], ['都内', '東京'], ['歌舞伎町', '東京'], ['福岡', '福岡'], ['博多', '福岡'], ['イナチカ', '福岡'], ['京都', '京都'],
  ['神戸', '兵庫'], ['兵庫', '兵庫'], ['三宮', '兵庫'], ['阪神', '兵庫'],
  ['大阪', '大阪'], ['茨木', '大阪'], ['茨城', '大阪'], ['高槻', '大阪'], ['吹田', '大阪'], ['枚方', '大阪'],
  ['梅田', '大阪'], ['難波', '大阪'], ['天満', '大阪'], ['堺', '大阪'], ['谷町', '大阪'], ['御堂筋', '大阪'], ['鶴見緑地', '大阪']];
  for (var i = 0; i < map.length; i++) { if (t.indexOf(map[i][0]) >= 0) return map[i][1]; }
  return '';
}

/**
 * 専用シート「master_地域」（店舗名｜地域）を用意し、全店舗（求人打ち出し＋master_店舗）を並べて
 * 空欄だけをエリアリスティングからの推定で自動入力する（既存の地域は保護＝手入力を消さない）。
 * ?setup=regions で呼ばれる。運用では店舗ごとに手で正すのが正（推定はたたき台）。
 */
function epSetupRegionColumn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // 店舗ごとの最頻エリア（求人打ち出しのエリア1/2）から地域を推定するための集計＋全店舗名収集
  var pp = ss.getSheetByName('求人打ち出し'), areaByStore = {}, dispByKey = {};
  if (pp && pp.getLastRow() > 1) {
    var pv = pp.getDataRange().getValues(), ph = pv[0], pc = {}; ph.forEach(function (x, i) { pc[String(x)] = i; });
    var cS = pc['店舗名'], cA1 = pc['エリア1'], cA2 = pc['エリア2'];
    for (var i = 1; i < pv.length; i++) {
      var disp0 = epCleanStore_(String(pv[i][cS] || '')); if (!disp0) continue;
      var k = epNormStore_(disp0); dispByKey[k] = disp0;
      var reg = epRegionFromText_(String(pv[i][cA1] || '')) || epRegionFromText_(String(pv[i][cA2] || ''));
      if (reg) { areaByStore[k] = areaByStore[k] || {}; areaByStore[k][reg] = (areaByStore[k][reg] || 0) + 1; }
    }
  }
  // master_店舗 の店舗名も対象に含める（応募はあるが打ち出し履歴が無い店舗も拾う）
  var mss = ss.getSheetByName('master_店舗');
  if (mss) { var mv = mss.getDataRange().getValues(); for (var r0 = 1; r0 < mv.length; r0++) { if (mv[r0][0] === '') continue; var d = epCleanStore_(mv[r0][1] || String(mv[r0][0])); if (d) dispByKey[epNormStore_(d)] = d; } }

  // 既存の master_地域（手入力の地域を保護）
  var rs = ss.getSheetByName('master_地域'), existing = {};
  if (!rs) { rs = ss.insertSheet('master_地域'); rs.getRange(1, 1, 1, 2).setValues([['店舗名', '地域']]); }
  else {
    var rv = rs.getDataRange().getValues();
    for (var j = 1; j < rv.length; j++) { var nm = epCleanStore_(String(rv[j][0] || '')); if (nm) existing[epNormStore_(nm)] = String(rv[j][1] || '').trim(); }
  }
  // 全店舗を並べ替えて、地域（既存優先→推定）を決める
  var keys = Object.keys(dispByKey).sort(function (a, b) { return dispByKey[a] < dispByKey[b] ? -1 : 1; });
  var out = [['店舗名', '地域']], filled = 0, list = [];
  keys.forEach(function (k) {
    var disp = dispByKey[k], cur = existing[k] || '';
    if (!cur) {
      var guess = EP_STORE_REGION_FIX[epNormStore_(disp)] || '';   // ①明示指定（確認済み）
      if (!guess) { var m = areaByStore[k]; if (m) { var best = 0; for (var g in m) { if (m[g] > best) { best = m[g]; guess = g; } } } }  // ②最頻エリア
      if (!guess) guess = epRegionFromText_(disp);                 // ③店舗名から推定
      if (guess) { cur = guess; filled++; }
    }
    out.push([disp, cur]);
    list.push({ store: disp, region: cur || '(未設定)' });
  });
  // 書き出し（全面更新：店舗名＋地域の2列だけ）
  rs.clearContents();
  rs.getRange(1, 1, out.length, 2).setValues(out);
  return { ok: true, sheet: 'master_地域', total: keys.length, filled: filled, list: list };
}

/** 【診断・読み取りのみ】リスティング列の実データ（頻出値・サンプル行）を返す。分析設計用。 */
function epProbeListing_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pp = ss.getSheetByName('求人打ち出し');
  if (!pp || pp.getLastRow() < 2) return { ok: false, error: '求人打ち出しが空' };
  var v = pp.getDataRange().getValues(), h = v[0], c = {};
  h.forEach(function (x, i) { c[String(x)] = i; });
  var col = { area1: 'エリア1', area2: 'エリア2', line1: '路線1', line2: '路線2', cost: '求人費', apps: '応募総数', hires: '採用人数', store: '店舗名', start: '掲載開始', end: '掲載終了' };
  var g = function (row, k) { var i = c[col[k]]; return i == null ? '' : row[i]; };
  var keys = ['area1', 'area2', 'line1', 'line2'];
  var dist = {}; keys.forEach(function (k) { dist[k] = {}; });
  var samples = [], costDist = {};
  for (var i = 1; i < v.length; i++) {
    keys.forEach(function (k) { var val = String(g(v[i], k)); dist[k][val] = (dist[k][val] || 0) + 1; });
    var cv = String(g(v[i], 'cost')); costDist[cv] = (costDist[cv] || 0) + 1;
    if (samples.length < 20) samples.push({
      store: String(g(v[i], 'store')), a1: g(v[i], 'area1'), a2: g(v[i], 'area2'),
      l1: g(v[i], 'line1'), l2: g(v[i], 'line2'), cost: g(v[i], 'cost'),
      apps: g(v[i], 'apps'), hires: g(v[i], 'hires'), start: String(g(v[i], 'start')), end: String(g(v[i], 'end'))
    });
  }
  var top = function (o) { return Object.keys(o).map(function (val) { return { v: val, n: o[val] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 25); };
  var topDist = {}; keys.forEach(function (k) { topDist[k] = top(dist[k]); });
  return { ok: true, rows: v.length - 1, headers: h, dist: topDist, costTop: top(costDist), samples: samples };
}

// =============================================================================
// アプリ内「今すぐ取得」：グルメキャリーの取得を GitHub Actions に即時依頼する。
// グルメキャリーはデータセンターIPを拒否しないため、クラウド(Actions)で実行できる。
// EntryPocket / 飲食店ドットコムは403で拒否されるため、この方式は使えない（PC/ブラウザ担当）。
// トークンは Script Properties(GH_DISPATCH_TOKEN) に保存。読み出しては返さない（書き込み専用API）。
// =============================================================================
var EP_GH_OWNER = 'amami-cell';
var EP_GH_REPO = 'susabiyu-ig-auto';
var EP_GH_WORKFLOW = 'gourmet_fetch.yml';

// トークンが登録済みか（値は返さない）
function epHasGhToken() {
  try {
    var t = PropertiesService.getScriptProperties().getProperty('GH_DISPATCH_TOKEN');
    return { ok: true, has: !!(t && String(t).trim()) };
  } catch (e) { return { ok: false, error: String(e) }; }
}

// トークンを保存（アプリの設定から1回だけ貼り付け）。値は保存のみ・返さない。
// 匿名アクセスの公開Webアプリのため、既に登録済みなら上書き拒否（write-once）＝匿名者による
// 破壊/すり替えを防ぐ。差し替えが必要な時は epClearGhToken(管理キー) で消してから登録する。
function epSetGhToken(token) {
  try {
    var props = PropertiesService.getScriptProperties();
    var cur = props.getProperty('GH_DISPATCH_TOKEN');
    if (cur && String(cur).trim()) return { ok: false, error: 'already_set' };
    var t = (token == null ? '' : String(token)).trim();
    if (!t) return { ok: false, error: 'empty' };
    props.setProperty('GH_DISPATCH_TOKEN', t);
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e) }; }
}

// トークンを消す（差し替え用）。管理キー必須・未設定なら無効（fail-closed）。
function epClearGhToken(pass) {
  try {
    var props = PropertiesService.getScriptProperties();
    var admin = props.getProperty('EP_ADMIN_KEY') || '';
    if (!admin || String(pass || '') !== admin) return { ok: false, error: '管理キーが違います（未設定なら無効）' };
    props.deleteProperty('GH_DISPATCH_TOKEN');
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e) }; }
}

// グルメキャリー取得ワークフローを即時起動（workflow_dispatch, ref=main）
// 匿名アクセスのためレート制限（既定120秒に1回）＝匿名連打によるActions濫用・グルメキャリーBANを防ぐ。
function epGourmetDispatch() {
  try {
    var props = PropertiesService.getScriptProperties();
    var MIN_INTERVAL = 120000; // ms
    var last = parseInt(props.getProperty('GH_DISPATCH_LAST') || '0', 10) || 0;
    var now = Date.now();
    if (now - last < MIN_INTERVAL) {
      return { ok: false, error: 'rate_limited', wait: Math.ceil((MIN_INTERVAL - (now - last)) / 1000) };
    }
    var tok = props.getProperty('GH_DISPATCH_TOKEN');
    if (!tok || !String(tok).trim()) return { ok: false, error: 'no_token' };
    var url = 'https://api.github.com/repos/' + EP_GH_OWNER + '/' + EP_GH_REPO +
      '/actions/workflows/' + EP_GH_WORKFLOW + '/dispatches';
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + String(tok).trim(),
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'susabiyu-recruit-app'
      },
      payload: JSON.stringify({ ref: 'main' }),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    if (code === 204 || code === 201 || code === 200) {
      try { props.setProperty('GH_DISPATCH_LAST', String(now)); } catch (e2) { }
      return { ok: true };
    }
    if (code === 401 || code === 403) return { ok: false, error: 'token_invalid', code: code, body: res.getContentText().slice(0, 160) };
    if (code === 404) return { ok: false, error: 'workflow_not_found', code: code, body: res.getContentText().slice(0, 160) };
    return { ok: false, error: 'github_' + code, body: res.getContentText().slice(0, 200) };
  } catch (e) { return { ok: false, error: String(e) }; }
}

// =============================================================================
// 共通ヘルパ（セキュリティ）
// =============================================================================

// CSV/表計算 数式インジェクション対策：先頭が = + - @ (やタブ/CR)の文字列セルは ' を前置して
// 「テキスト強制」にする。=IMPORTXML等でオーナーがシートを開いた瞬間にPIIが外部送信されるのを防ぐ。
// 数値・日付・非文字列はそのまま返す（表示や計算に影響しない）。
function csvGuard_(v) {
  if (typeof v !== 'string' || v === '') return v;
  return /^[=+\-@\t\r]/.test(v) ? ("'" + v) : v;
}

// <script>内に JSON を素で埋め込む(<?!= ?>)際の安全化。
// 応募者の自由記述に </script> や U+2028/2029 が含まれてもページが壊れない/注入されないようにする。
function jsonForScript_(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

// PC取得スクリプトからの「取得失敗」通知を受けて責任者へプッシュ（媒体別に1時間1回まで＝スパム防止）。
function epPcAlert_(o) {
  try {
    var media = String((o && o.media) || '').slice(0, 24);
    var msg = String((o && o.msg) || '').slice(0, 200);
    var props = PropertiesService.getScriptProperties();
    var lkey = 'PC_ALERT_LAST_' + (media || 'x');
    var last = parseInt(props.getProperty(lkey) || '0', 10) || 0;
    var now = Date.now();
    if (now - last < 3600000) return { ok: true, skipped: 'rate_limited' }; // 1時間に1回まで
    props.setProperty(lkey, String(now));
    var label = { ep: 'エントリーポケット', inshoku: '飲食店ドットコム', gourmet: 'グルメキャリー' }[media] || media || 'PC取得';
    if (typeof epEnqueuePush_ === 'function') {
      epEnqueuePush_('⚠️ PC取得に失敗（' + label + '）', (msg || 'PCでの自動取得に失敗しました。PCの電源・ログイン・ネットをご確認ください。'), 'recruit');
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e) }; }
}
