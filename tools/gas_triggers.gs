/**
 * susabiyu — GAS から GitHub Actions を確実に起動する（PC非依存トリガ）
 * =====================================================================
 * なぜ必要か:
 *   GitHub Actions の schedule(cron) は best-effort で、このリポジトリでは
 *   実際にはまともに発火しない（検証済み）:
 *     - prepare.yml の cron は履歴上ほぼ一度も発火していない
 *     - post.yml は発火しても時刻が大きくズレ、post_approved が枠を
 *       「HH:MM 完全一致」で探すため、投稿されずスキップされていた
 *   => GitHubスケジュール任せだと「PCオフだと動かない」状態。
 *   そこで Google Apps Script の時間主導型トリガ（Google側で動く）から
 *   GitHub の workflow_dispatch API を叩いて確実に起動する。
 *
 * 安全性（重複しない）:
 *   - prepare.py は冪等化済み（同じ対象日は再生成せず、LINEも送らない）
 *   - post_approved は投稿済み(posted)枠をスキップする
 *   => GASトリガと（万一発火する）GitHubスケジュール／承認アプリが
 *      重なっても、二重生成・二重投稿にならない。
 *
 * 共通セットアップ:
 *   1) GitHub Personal Access Token を作成
 *      - Fine-grained 推奨: Repository = amami-cell/susabiyu-ig-auto,
 *        Permissions → Actions: Read and write
 *      - classic の場合は scope: workflow
 *   2) GASプロジェクト「susabiyu承認」を開く
 *      → プロジェクトの設定 → タイムゾーンが Asia/Tokyo であることを確認
 *      → スクリプト プロパティ → GITHUB_TOKEN = 上記トークン を追加
 *   3) このファイルの関数を貼り付け、まず手動実行して
 *      実行ログが status=204 になることを確認
 */

var GITHUB_OWNER = 'amami-cell';
var GITHUB_REPO  = 'susabiyu-ig-auto';
var TARGET_REF   = 'main';
var TZ           = 'Asia/Tokyo';

/** 共通: workflow_dispatch を投げる */
function _dispatch(workflowFile, inputs) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('スクリプトプロパティ GITHUB_TOKEN が未設定です。');
  var url = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO +
            '/actions/workflows/' + workflowFile + '/dispatches';
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({ ref: TARGET_REF, inputs: inputs || {} }),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  Logger.log(workflowFile + ' dispatch status=' + code + ' ' + res.getContentText());
  if (code !== 204) throw new Error('dispatch失敗 ' + code + ': ' + res.getContentText());
}

/* =====================================================================
 * 1) prepare（確認の生成）— 毎朝1回
 * ---------------------------------------------------------------------
 * トリガ設定: 時間主導型 → 日タイマー → 午前8〜9時（JST）に triggerPrepare
 * date を空にすると prepare.py 側で「実行日+2日」を対象にする。
 * ===================================================================== */
function triggerPrepare() {
  _dispatch('prepare.yml', { date: '' });
}

/* =====================================================================
 * 2) post（投稿）— 各投稿枠で起動
 * ---------------------------------------------------------------------
 * 枠の時刻: 平日 16/18/20時、土日祝 11/18/20時（JST）。
 * triggerPost は「今が近い枠時刻」を自動判定し、その slot の datetime を
 * 明示的に渡す。発火が多少ズレても正しい枠を投稿でき、存在しない枠
 * （その日にない時刻）は post_approved 側で自動スキップされる。
 *
 * トリガ設定（推奨）: 時間主導型の「特定の時刻」トリガを枠ごとに用意し、
 *   各枠の "数分後" に triggerPost が動くようにする（早すぎる発火＝
 *   編集締切前の投稿を避けるため）。例: 11:05 / 16:05 / 18:05 / 20:05。
 *   ※ GASの時刻トリガは±15分程度ぶれるため、SLOT_HOURS への丸め込みで
 *     近い枠（±40分以内）に寄せている。
 * ===================================================================== */
var SLOT_HOURS = [11, 16, 18, 20];

function triggerPost() {
  var now = new Date();
  var ymd = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  var minutesNow = parseInt(Utilities.formatDate(now, TZ, 'HH'), 10) * 60 +
                   parseInt(Utilities.formatDate(now, TZ, 'mm'), 10);
  var best = null, bestDiff = 1e9;
  for (var i = 0; i < SLOT_HOURS.length; i++) {
    var diff = Math.abs(minutesNow - SLOT_HOURS[i] * 60);
    if (diff < bestDiff) { bestDiff = diff; best = SLOT_HOURS[i]; }
  }
  if (bestDiff > 40) { Logger.log('近い投稿枠なし(' + minutesNow + '分) → 何もしない'); return; }
  var datetime = ymd + ' ' + ('0' + best).slice(-2) + ':00'; // 例 "2026-06-26 16:00"
  _dispatch('post.yml', { datetime: datetime, dry: '0' });
}
