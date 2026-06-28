// すさび湯 確認アプリ 設定
// GAS_URL: GASウェブアプリの /exec URL（スプレッドシート Config!B14 の「承認URL」と同じ）
//          末尾は「.../exec」。デプロイ時に必ず実物に差し替える。
window.SUSABIYU = {
  GAS_URL: "PASTE_YOUR_GAS_EXEC_URL_HERE",
  STORE_NAME: "すさび湯三条",
  POLL_MS: 7000   // 最新チェックの間隔（ミリ秒）
};
