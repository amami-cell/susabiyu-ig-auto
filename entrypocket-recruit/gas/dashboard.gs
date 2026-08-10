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
        media: cv(row, '媒体'), appliedAt: String(cv(row, '応募日時') || ''),
        age: cv(row, '年齢'), gender: String(cv(row, '性別') || ''),
        occupation: String(cv(row, '現在の職業') || ''),
        history: String(cv(row, '変更履歴', '変更履歴1') || ''), memo: String(cv(row, 'メモ') || ''),
        dup: String(cv(row, '重複')) === '重複'
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
