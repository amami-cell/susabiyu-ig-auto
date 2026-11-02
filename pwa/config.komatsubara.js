// 大衆食堂 こまつ原（大阪・梅田小松原／居酒屋・食堂・大衆酒場）確認アプリ 設定
// ------------------------------------------------------------------
// 共有アプリ(app.js)が参照するグローバル名は window.GIFUYA（＝汎用の店舗設定スロット）。
// 本ファイルはこまつ原用の値を入れる。komatsubara.html / komatsubara_reels.html のみが読み込む。
// GAS_URL は多店舗共有GAS(/exec)。予約は ACCOUNT="komatsubara" でJ列に書かれ、
//   予約投稿エンジンがこまつ原のIGへ振り分ける。
// MEDIA_BASE は deploy_pwa.yml が R2_PUBLIC_BASE を注入（未注入なら見本枠は空）。
// 見本ギャラリー(SAMPLES)はオープン後にDrive写真からレンダリングして充填する（現在は未投入＝空）。
// ------------------------------------------------------------------
window.GIFUYA = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbxKn_MUfPgJ0nA8LJPp6YGb2Jehp9G8CpckV5bOAhe3M53eBC3Kle3O3Bf7mFzUJ2TMQw/exec",
  MEDIA_BASE: "PASTE_MEDIA_BASE_HERE",
  STORE_NAME: "大衆食堂 こまつ原",
  HANDLE: "@taisyuusyokudo.komatsubara",
  ACCOUNT: "komatsubara",                       // 予約投稿タブ J列/AcctTokens と一致させる内部ID
  POLL_MS: 4000,
  // Web Push 公開鍵（三条と同じ鍵を共用。専用鍵ができたら差し替え）
  VAPID_PUBLIC: "BFDIPEHslhSqZlE4QooHXikxgv-25YJEDmESsYVxLXFnrmPWLO8aQGoVFYTUWO5nn_QpkUAiCtb1QZprcMCNIuc"
};
// 実データ連携が有効か（GAS_URL が実物URLか）を判定するフラグ。
window.GIFUYA_LIVE = /^https:\/\//.test((window.GIFUYA.GAS_URL || "").trim());

// 見本ギャラリー（こまつ原・和の大衆テンプレ）。
// ※オープン前は料理写真が未投入のため空。画像が入ったら yoshoku_samples / list-cats 等で
//   和の大衆テンプレ（taishu系）を店写真からレンダリングし、ここに {pattern,url,poster,label,caption,music} を並べる。
window.GIFUYA.SAMPLES = [
];
