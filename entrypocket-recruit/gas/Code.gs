/**
 * エントリーポケット 求人進捗 ダッシュボード（GASウェブアプリ）。
 *
 * スクリプトプロパティに次の4件を登録しておくこと:
 *   SPREADSHEET_ID … スプレッドシートID
 *   GITHUB_OWNER   … GitHubオーナー名（例 amami-cell）
 *   GITHUB_REPO    … リポジトリ名（例 entrypocket-recruit）
 *   GITHUB_PAT     … Contents: Read and write 権限の Fine-grained token
 *
 * 「更新」ボタンは GitHub の repository_dispatch(ep-refresh) を叩いて Actions を起動する。
 * 完了判定は _実行ログ シートの最終行を見る。
 */

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function ss_() {
  return SpreadsheetApp.openById(prop_('SPREADSHEET_ID'));
}

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('求人進捗 - エントリーポケット')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** ダッシュボードの集計値を返す（dashboard_cache の json 行を読む）。 */
function getDashboard() {
  var sheet = ss_().getSheetByName('dashboard_cache');
  var out = { generated_at: '', total: 0, duplicate_rate: 0, funnel: {}, by_store: {}, by_status: {} };
  if (!sheet) return out;
  var values = sheet.getDataRange().getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === 'json') {
      try { out = JSON.parse(values[i][1]); } catch (e) {}
      break;
    }
  }
  out.stores = readStoreMaster_();
  return out;
}

/** 応募者一覧（raw_応募者）を返す。消失した応募者は除外。 */
function getApplicants() {
  var sheet = ss_().getSheetByName('raw_応募者');
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var header = values[0];
  var col = {};
  header.forEach(function (h, i) { col[h] = i; });

  var funnelByCode = readStatusFunnel_();
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (!row[col['応募者コード']]) continue;
    if (String(row[col['消失']]) === 'TRUE') continue;
    var code = row[col['ステータスコード']];
    rows.push({
      code: row[col['応募者コード']],
      name: row[col['氏名']],
      statusCode: code,
      status: row[col['ステータス']],
      funnel: funnelByCode[code] || '',
      storeId: row[col['店舗ID']],
      tel: row[col['電話番号_数字']],
      telLink: row[col['tel_link']],
      media: row[col['媒体']],
      appliedAt: row[col['応募日時']],
      interviewAt: row[col['面接日時']],
      duplicate: String(row[col['重複']]) === '重複'
    });
  }
  return rows;
}

/** master_ステータス から コード→ファネル段階 を作る。 */
function readStatusFunnel_() {
  var sheet = ss_().getSheetByName('master_ステータス');
  var map = {};
  if (!sheet) return map;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] !== '') map[String(values[i][0])] = values[i][2] || '';
  }
  return map;
}

/** master_店舗 から 店舗ID→表示名 を作る。 */
function readStoreMaster_() {
  var sheet = ss_().getSheetByName('master_店舗');
  var map = {};
  if (!sheet) return map;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var id = values[i][0];
    if (id === '') continue;
    map[String(id)] = values[i][1] || String(id);
  }
  return map;
}

/** _実行ログ の最終行を返す（完了判定・最終更新表示に使う）。 */
function getLatestRun() {
  var sheet = ss_().getSheetByName('_実行ログ');
  if (!sheet || sheet.getLastRow() < 2) return null;
  var last = sheet.getRange(sheet.getLastRow(), 1, 1, 9).getValues()[0];
  return {
    at: String(last[0]),
    trigger: last[1],
    result: last[2],
    applicants: last[3],
    changes: last[5],
    note: last[8]
  };
}

/** 更新ボタン: GitHub Actions を repository_dispatch で起動する。 */
function triggerRefresh() {
  var owner = prop_('GITHUB_OWNER');
  var repo = prop_('GITHUB_REPO');
  var pat = prop_('GITHUB_PAT');
  if (!owner || !repo || !pat) {
    return { ok: false, error: 'GITHUB_OWNER / GITHUB_REPO / GITHUB_PAT が未設定です。' };
  }
  var url = 'https://api.github.com/repos/' + owner + '/' + repo + '/dispatches';
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'Authorization': 'Bearer ' + pat,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({ event_type: 'ep-refresh' })
  });
  var code = res.getResponseCode();
  if (code === 204) {
    var latest = getLatestRun();
    return { ok: true, since: latest ? latest.at : '' };
  }
  return { ok: false, error: 'GitHub API ' + code + ': ' + res.getContentText() };
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
