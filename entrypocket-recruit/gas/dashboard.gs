/**
 * 求人進捗ダッシュボード（GASウェブアプリのサーバ側）
 *
 * ep_fetch.gs と同じ Apps Script プロジェクトに置く。
 * 取得本体 epRun() をそのまま呼べるので、更新ボタンはGitHub不要でその場実行。
 *
 * デプロイ: デプロイ → 新しいデプロイ → ウェブアプリ
 *   実行ユーザー: 自分 / アクセス: 自分のみ（社外に出さない）
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('求人進捗')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

/** ダッシュボードに出す一式（集計＋応募者一覧＋最終実行）を返す。 */
function dashData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 集計（dashboard_cache の json 行）
  var dash = {};
  var dc = ss.getSheetByName('dashboard_cache');
  if (dc) {
    var v = dc.getDataRange().getValues();
    for (var i = 0; i < v.length; i++) if (v[i][0] === 'json') { try { dash = JSON.parse(v[i][1]); } catch (e) { } break; }
  }

  // 店舗ID→表示名 ＆ 表示名→募集手動フラグ（F列。募集中/終了 と書けば自動判定を上書き）
  var stores = {}, storeManual = {};
  var ms = ss.getSheetByName('master_店舗');
  if (ms) {
    var sv = ms.getDataRange().getValues();
    for (var i = 1; i < sv.length; i++) {
      if (sv[i][0] === '') continue;
      var disp = sv[i][1] || String(sv[i][0]);
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
    for (var r = 1; r < rv.length; r++) {
      var row = rv[r];
      if (!row[col['応募者コード']]) continue;
      if (String(row[col['消失']]) === 'TRUE') continue;
      var sc = String(row[col['ステータスコード']]);
      apps.push({
        code: String(row[col['応募者コード']]), name: row[col['氏名']], status: row[col['ステータス']],
        statusCode: sc, funnel: funnel[sc] || '', store: stores[String(row[col['店舗ID']])] || row[col['店舗ID']] || '',
        tel: String(row[col['電話番号_数字']] || ''), telLink: row[col['tel_link']], media: row[col['媒体']],
        appliedAt: String(row[col['応募日時']] || ''), dup: String(row[col['重複']]) === '重複'
      });
    }
  }

  // 最終実行
  var last = null, run = ss.getSheetByName('_実行ログ');
  if (run && run.getLastRow() > 1) { var lr = run.getRange(run.getLastRow(), 1, 1, 6).getValues()[0]; last = { at: String(lr[0]), result: String(lr[2]), n: lr[3] }; }

  return { dash: dash, apps: apps, last: last, storeManual: storeManual };
}

/** 更新ボタン: その場で取得を実行して結果を返す。 */
function dashRefresh() {
  try { var ok = epRun(); return { ok: ok }; }
  catch (e) { return { ok: false, error: String(e) }; }
}
