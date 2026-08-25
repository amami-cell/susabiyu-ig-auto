// すさび湯 確認アプリ 設定
// GAS_URL: GASウェブアプリの /exec URL（スプレッドシート Config!B14 の「承認URL」と同じ）
//          末尾は「.../exec」。デプロイ時に必ず実物に差し替える。
window.SUSABIYU = {
  GAS_URL: "PASTE_YOUR_GAS_EXEC_URL_HERE",
  MEDIA_BASE: "PASTE_MEDIA_BASE_HERE",
  // 素材ギャラリー（gallery.html）が clips/index.json を読む公開メディアリポ "owner/repo"。
  // deploy時に GH_MEDIA_REPO を注入。未置換(PASTE_)ならギャラリーは「準備中」表示。
  MEDIA_REPO: "PASTE_MEDIA_REPO_HERE",
  STORE_NAME: "すさび湯三条",
  POLL_MS: 4000,  // 最新チェックの間隔（ミリ秒）。短いほど他端末の反映が速い
  // Web Push の公開鍵（applicationServerKey）。公開情報なのでここに置いてOK。
  VAPID_PUBLIC: "BFDIPEHslhSqZlE4QooHXikxgv-25YJEDmESsYVxLXFnrmPWLO8aQGoVFYTUWO5nn_QpkUAiCtb1QZprcMCNIuc"
};
