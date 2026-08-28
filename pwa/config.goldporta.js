// GOLD京都ポルタ（フレンチ酒場）確認アプリ 設定
// ------------------------------------------------------------------
// 共有アプリ(app.js)が参照するグローバル名は window.GIFUYA（＝汎用の店舗設定スロット）。
// 本ファイルはGOLD京都ポルタ用の値を入れる。goldporta.html / goldporta_reels.html のみが読み込む。
// GAS_URL は多店舗共有GAS(/exec)。予約は ACCOUNT="goldporta" でJ列に書かれ、
//   予約投稿エンジン(post_reservations)がGOLD京都ポルタのIGへ振り分ける。
// MEDIA_BASE は deploy_pwa.yml が R2_PUBLIC_BASE を注入（未注入なら見本枠は空）。
// ------------------------------------------------------------------
window.GIFUYA = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbxKn_MUfPgJ0nA8LJPp6YGb2Jehp9G8CpckV5bOAhe3M53eBC3Kle3O3Bf7mFzUJ2TMQw/exec",
  MEDIA_BASE: "PASTE_MEDIA_BASE_HERE",
  STORE_NAME: "GOLD京都ポルタ",
  HANDLE: "@gold_kyotovolta",
  ACCOUNT: "goldporta",                        // 予約投稿タブ J列/AcctTokens と一致させる内部ID
  POLL_MS: 4000,
  // Web Push 公開鍵（三条と同じ鍵を共用。専用鍵ができたら差し替え）
  VAPID_PUBLIC: "BFDIPEHslhSqZlE4QooHXikxgv-25YJEDmESsYVxLXFnrmPWLO8aQGoVFYTUWO5nn_QpkUAiCtb1QZprcMCNIuc"
};
// 実データ連携が有効か（GAS_URL が実物URLか）を判定するフラグ。
window.GIFUYA_LIVE = /^https:\/\//.test((window.GIFUYA.GAS_URL || "").trim());

// 見本ギャラリー（洋食おしゃれテンプレ YoshokuDish の試作。投稿は未実装＝確認専用）。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshoku_fr_1", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f3e74a354406336a2706d1c358bba47a44b5a6db/preview/20260828211134_9100.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d407126bf906d7b76c725f5435ba2e81bf7f41bd/preview/20260828211133_0338.jpg", "label": "洋食おしゃれ・本日の一皿（試作/フレンチ）", "enabled": 1}
];
