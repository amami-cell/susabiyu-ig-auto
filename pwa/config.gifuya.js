// ぎふや福岡天神 確認アプリ 設定（実稼働化の受け皿）
// ------------------------------------------------------------------
// GAS_URL: ぎふや専用GASウェブアプリの /exec URL。
//   実稼働化の際に GitHub Secrets「GIFUYA_GAS_EXEC_URL」を設定すると、
//   deploy_pwa.yml が下の PLACEHOLDER を実物URLへ自動置換する。
//   未設定のうちは PLACEHOLDER のまま＝アプリは「見本モード」で動作する。
// STORE_NAME / HANDLE: 画面表示用（実稼働後もそのまま）。
// ------------------------------------------------------------------
window.GIFUYA = {
  // 多店舗共有GAS（三条と同じ /exec）。予約は account="gifuyatenjin" でJ列に書かれ、
  // 予約投稿エンジン(post_reservations)がぎふやのIGへ振り分ける。地域タグは region で分離。
  // ※専用GASに切り替えたい場合はこのURLを差し替えるだけ。
  GAS_URL: "https://script.google.com/macros/s/AKfycbxKn_MUfPgJ0nA8LJPp6YGb2Jehp9G8CpckV5bOAhe3M53eBC3Kle3O3Bf7mFzUJ2TMQw/exec",
  MEDIA_BASE: "PASTE_MEDIA_BASE_HERE",
  STORE_NAME: "ぎふや 福岡天神店",
  HANDLE: "@gifuya_fukuokatenjin",
  ACCOUNT: "gifuyatenjin",                     // 予約投稿タブ J列/AcctTokens と一致させる内部ID
  POLL_MS: 4000,
  // Web Push 公開鍵。ぎふや専用の鍵を用意したらここへ（未設定なら三条と同じ鍵で可・通知は連携後）
  VAPID_PUBLIC: "BFDIPEHslhSqZlE4QooHXikxgv-25YJEDmESsYVxLXFnrmPWLO8aQGoVFYTUWO5nn_QpkUAiCtb1QZprcMCNIuc"
};
// 実データ連携が有効か（GAS_URL が実物URLに置換済みか）を判定するフラグ。
// 画面側はこのフラグが false の間は見本モードのまま安全に表示する。
window.GIFUYA_LIVE = /^https:\/\//.test((window.GIFUYA.GAS_URL || "").trim());
