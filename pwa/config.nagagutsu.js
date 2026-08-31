// ナガグツ（イタリアン・肉バル）確認アプリ 設定
// ------------------------------------------------------------------
// 共有アプリ(app.js)が参照するグローバル名は window.GIFUYA（＝汎用の店舗設定スロット）。
// 本ファイルはナガグツ用の値を入れる。nagagutsu.html / nagagutsu_reels.html のみが読み込む。
// GAS_URL は多店舗共有GAS(/exec)。予約は ACCOUNT="nagagutsu" でJ列に書かれ、
//   予約投稿エンジン(post_reservations)がナガグツのIGへ振り分ける。
// MEDIA_BASE は deploy_pwa.yml が R2_PUBLIC_BASE を注入（未注入なら見本枠は空）。
// ------------------------------------------------------------------
window.GIFUYA = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbxKn_MUfPgJ0nA8LJPp6YGb2Jehp9G8CpckV5bOAhe3M53eBC3Kle3O3Bf7mFzUJ2TMQw/exec",
  MEDIA_BASE: "PASTE_MEDIA_BASE_HERE",
  STORE_NAME: "ナガグツ",
  HANDLE: "@nagagutsu0427",
  ACCOUNT: "nagagutsu",                        // 予約投稿タブ J列/AcctTokens と一致させる内部ID
  POLL_MS: 4000,
  // Web Push 公開鍵（三条と同じ鍵を共用。専用鍵ができたら差し替え）
  VAPID_PUBLIC: "BFDIPEHslhSqZlE4QooHXikxgv-25YJEDmESsYVxLXFnrmPWLO8aQGoVFYTUWO5nn_QpkUAiCtb1QZprcMCNIuc"
};
// 実データ連携が有効か（GAS_URL が実物URLか）を判定するフラグ。
window.GIFUYA_LIVE = /^https:\/\//.test((window.GIFUYA.GAS_URL || "").trim());

// 見本ギャラリー（洋食おしゃれテンプレ10種・イタリアン配色でナガグツの実写真からレンダリング。投稿は未実装＝確認専用）。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1cdf8750561275e038058459d62fc149e32f91e4/preview/20260831204454_0608.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a3033c31486a7751848582ab2e138ddb9a312d71/preview/20260831204502_6765.jpg", "label": "洋食おしゃれ・本日の一皿", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@90c6871542d9e502851d6779017be54e6f0d36d2/preview/20260831204532_6123.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@fc01b196a14f5f0a3710b74c1ab1a266819af431/preview/20260831204541_5631.jpg", "label": "洋食おしゃれ・黒板トラットリア", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@348e4cba5eff891ee520298e194ae4db392075cb/preview/20260831204619_0554.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@cebccb01f1ff9ce6b24a74de265f0d9fba26df06/preview/20260831204628_6503.jpg", "label": "洋食おしゃれ・鉄板ジュ〜っと", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0b408885c2a2598cf1c9921399ee218f923a566b/preview/20260831204655_6446.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@64e82a808aa7125d6504949fdedd60e101ae932f/preview/20260831204703_7327.jpg", "label": "洋食おしゃれ・雑誌エディトリアル", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@52ab78d718bbeb7e2a54adfb850d30b2638ba286/preview/20260831204741_2800.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@437bf1be450090a4812fd29c936f99c2d120e64f/preview/20260831204749_9593.jpg", "label": "洋食おしゃれ・シネマ", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9f94c9d4c36aff83707c3dba70c5382f8eff3221/preview/20260831204819_1832.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b3625d62e7735ec9310702aa3d0b704d8bde33dc/preview/20260831204828_3713.jpg", "label": "洋食おしゃれ・ワインと共に", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e4b1ebce6d288f89a61a75c922802f0e66fb9740/preview/20260831204859_5529.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2a3d8f434d6738f2bea5f77a0a9138857c766bf3/preview/20260831204907_3302.jpg", "label": "洋食おしゃれ・おすすめ3品", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c371802ee9d03def6cc104a6c3735e9bbaa7839f/preview/20260831204939_6526.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b0584a8eba76ee6dc4a006a3010fc7969e62e375/preview/20260831204947_1505.jpg", "label": "洋食おしゃれ・ポラロイド重ね", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@dedee12452267c6eaa061c875575528ed753ec14/preview/20260831205022_6514.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f0f901f18129eaaef33838d7e957bf970f28a86d/preview/20260831205031_7823.jpg", "label": "洋食おしゃれ・大見出しタイポ", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5c5e6d50072fee9e56fbb92818b909393fd254b5/preview/20260831205106_7284.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@132077eab0a4ed92593fcc26b356764f7c111b57/preview/20260831205115_7508.jpg", "label": "洋食おしゃれ・本日OPEN案内", "enabled": 1}
];
