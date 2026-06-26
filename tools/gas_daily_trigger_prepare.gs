/**
 * susabiyu — 毎日 prepare を自動起動するGAS（PC非依存・確実な代替トリガ）
 * =====================================================================
 * 背景:
 *   GitHub Actions の schedule(cron) は best-effort で、このリポジトリでは
 *   prepare.yml のスケジュールが実際にはほぼ発火しなかった（検証済み）。
 *   そこで Google Apps Script の「時間主導型トリガ」から GitHub の
 *   workflow_dispatch API を毎朝叩いて prepare.yml を確実に起動する。
 *   prepare.py は冪等化済みなので、GitHubスケジュールと二重に動いても
 *   生成は1回だけ（重複しない）。
 *
 * セットアップ手順:
 *   1) GitHub Personal Access Token を作成
 *      - Fine-grained token 推奨:
 *          Resource owner: amami-cell
 *          Repository access: Only select repositories → susabiyu-ig-auto
 *          Permissions → Repository permissions → Actions: Read and write
 *      - (classic の場合は scope: workflow)
 *   2) GASプロジェクト「susabiyu承認」を開く
 *      → プロジェクトの設定 → スクリプト プロパティ →
 *         プロパティ名: GITHUB_TOKEN  値: 上記トークン  を追加
 *   3) このファイルの triggerPrepare 関数を GAS に貼り付け
 *   4) 一度 triggerPrepare を手動実行 → 実行ログが status=204 ならOK
 *      （GitHub の Actions に prepare 実行が出る。冪等なので既存日ならスキップ）
 *   5) トリガー → トリガーを追加:
 *          関数: triggerPrepare
 *          イベントのソース: 時間主導型
 *          時間ベースのタイマー: 日タイマー → 午前8時〜9時
 *      ※ GASのタイムゾーンが Asia/Tokyo であることを確認
 *         （プロジェクトの設定 → タイムゾーン）
 *
 * これで PC をシャットダウンしていても、毎朝 Google 側から prepare が起動し、
 * その日の +2日分の確認がLINEに届く。
 */

var GITHUB_OWNER = 'amami-cell';
var GITHUB_REPO  = 'susabiyu-ig-auto';
var WORKFLOW_FILE = 'prepare.yml';
var TARGET_REF = 'main';

function triggerPrepare() {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    throw new Error('スクリプトプロパティ GITHUB_TOKEN が未設定です。');
  }
  var url = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO +
            '/actions/workflows/' + WORKFLOW_FILE + '/dispatches';
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    // date を空にすると prepare.py 側で「実行日+2日」を対象にする
    payload: JSON.stringify({ ref: TARGET_REF, inputs: { date: '' } }),
    muteHttpExceptions: true
  };
  var res = UrlFetchApp.fetch(url, options);
  var code = res.getResponseCode();
  Logger.log('workflow_dispatch status=' + code + ' body=' + res.getContentText());
  if (code !== 204) {
    throw new Error('GitHub dispatch 失敗: ' + code + ' / ' + res.getContentText());
  }
}
