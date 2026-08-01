// ぎふや福岡天神 確認アプリ 設定（実稼働化の受け皿）
// ------------------------------------------------------------------
// GAS_URL: ぎふや専用GASウェブアプリの /exec URL。
//   実稼働化の際に GitHub Secrets「GIFUYA_GAS_EXEC_URL」を設定すると、
//   deploy_pwa.yml が下の PLACEHOLDER を実物URLへ自動置換する。
//   未設定のうちは PLACEHOLDER のまま＝アプリは「見本モード」で動作する。
// STORE_NAME / HANDLE: 画面表示用（実稼働後もそのまま）。
// ------------------------------------------------------------------
window.GIFUYA = {
  GAS_URL: "PASTE_GIFUYA_GAS_EXEC_URL_HERE",   // ←実稼働時に自動注入。未設定なら見本モード
  MEDIA_BASE: "PASTE_MEDIA_BASE_HERE",
  STORE_NAME: "ぎふや 福岡天神店",
  HANDLE: "@gifuya_fukuokatenjin",
  ACCOUNT: "gifuyatenjin",                     // 予約投稿タブ J列/AcctTokens と一致させる内部ID
  POLL_MS: 4000,
  // Web Push 公開鍵。ぎふや専用の鍵を用意したらここへ（未設定なら三条と同じ鍵で可・通知は連携後）
  VAPID_PUBLIC: ""
};
// 実データ連携が有効か（GAS_URL が実物URLに置換済みか）を判定するフラグ。
// 画面側はこのフラグが false の間は見本モードのまま安全に表示する。
window.GIFUYA_LIVE = /^https:\/\//.test((window.GIFUYA.GAS_URL || "").trim());
