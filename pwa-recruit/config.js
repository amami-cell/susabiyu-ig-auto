// Initiateエンポケ求人 PWA 設定
// GAS_EXEC_URL: 募集ダッシュボードGASの /exec URL（このアプリが中に表示する画面）。
//   デプロイ時に GAS_EXEC_URL シークレットがあれば差し替える（無ければ下の既定値を使う）。
// VAPID_PUBLIC: Web Push の公開鍵（applicationServerKey）。公開情報。インスタPWAと同じ鍵を再利用
//   （送信側の VAPID_PRIVATE_KEY も同じものが使われる）。
window.EMPOKE = {
  GAS_EXEC_URL: "https://script.google.com/macros/s/AKfycbz6i36c7UjbM3S44kl1kEcsI0CSjYo9jL-W-T4BJUAr9jmBlVXj-vnQTUwQbGoxcHYT/exec",
  VAPID_PUBLIC: "BFDIPEHslhSqZlE4QooHXikxgv-25YJEDmESsYVxLXFnrmPWLO8aQGoVFYTUWO5nn_QpkUAiCtb1QZprcMCNIuc"
};
