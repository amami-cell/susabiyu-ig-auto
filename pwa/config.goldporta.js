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

// 見本ギャラリー（ナガグツと同じ動画テンプレを french テーマ＋GOLDの色付きロゴで焼いたもの）。
// まずロゴ・テーマ確認用の代表4本。OKなら残り全テンプレ（料理/音ハメ/OP）を追加する。
// ※音ハメ(battere)はGOLD音楽フォルダに曲が無く、現状は音が付いていない（曲追加後に焼き直す）。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokuopwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b12b8ba8511ed90bf86c078e2b26027ef9837f89/preview/20260916022937_0296.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2c8d95c26fb8a4268686109571748e748b138be6/preview/20260916022940_7795.jpg", "label": "OP・ボルドー（フレンチ酒場／色ロゴ大）", "caption": "本物を、気軽に。", "enabled": 1},
  {"pattern": "yoshokumagazine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f8ea7fbde44ae5846de84ae3f4986dd2cd98b9db/preview/20260916023055_5308.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ac7c2b3572e254b073b3f0e6a94b3ffb0665a72a/preview/20260916023058_7044.jpg", "label": "雑誌ストーリー（丸ロゴ＋横ロゴ）", "caption": "今宵は、贅沢に。", "enabled": 1},
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9efdae43f148c98052d8f25ad930f2cf2655d5ef/preview/20260916023337_7550.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f63c9ab90c0ab792af44c806f3547864806a51f2/preview/20260916023340_1512.jpg", "label": "本日の一皿（左上に色ロゴ）", "caption": "今宵は、贅沢に。", "enabled": 1},
  {"pattern": "yoshokubattere", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@57745634e11fc0ef598e1101db9e0a494df9d7f7/preview/20260916023621_1359.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9192c731e41b165e693849baaaf371cc11d06478/preview/20260916023624_7153.jpg", "label": "音ハメ（※音源は追加後に焼き直し）", "caption": "今宵は、贅沢に。", "enabled": 1}
];
