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
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@303c66f903ae1ad0b6e6a1b6384aa3f5376e48ee/preview/20260902215622_1966.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ab8fd98363d9d04d220ed9a7818d9c050e762f81/preview/20260902215631_1533.jpg", "label": "洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@84068d1dd34edc7d451f93a39e7713aecbaf1776/preview/20260902215721_8304.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0ad5732580cbdeedb2105248b46fd2eff01c123d/preview/20260902215729_1252.jpg", "label": "洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@99c184cd5fe667c967101fbf5f3c260e4ecc1f78/preview/20260902215855_3069.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@fef921b73e34166b9df1bcbbb1eb3e3495d71e86/preview/20260902215905_9351.jpg", "label": "洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@656c0ed7fd6d00fa69f101d5abba08b315a5d1d0/preview/20260902220006_1395.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5dbf616329f959cec7793c7dfc4d79e610b172bb/preview/20260902220015_2722.jpg", "label": "洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3bf9df09791598c83c22c28a72c9b42b17136ece/preview/20260902220130_8490.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ccd205dc81ede4a79ba2026d782b1b138b0da4d3/preview/20260902220139_2050.jpg", "label": "洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0902141ca746f1100e7eb87ac0d9378de6e8e6ff/preview/20260902220225_4912.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c834ad6f8ab19e35c81b1e7fe73143eefb78fc77/preview/20260902220235_1335.jpg", "label": "洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8604285170f9d42ae77eea1cde7b560982506d9f/preview/20260902220335_1520.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9938b8fe2d029469c3f64f3215739d15a42fcf00/preview/20260902220344_8057.jpg", "label": "洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@712ef6201584eceba1921912553bc595e78a08c5/preview/20260902220438_0025.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a66395a0bcef6871a5c21d907e6f45eeb1008a4a/preview/20260902220446_8252.jpg", "label": "洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@19db77423ea7a341adf889aed7624273d9f70653/preview/20260902220612_6160.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8f3a17968ff9aaac2088ba78939cd85a7a71a456/preview/20260902220621_8552.jpg", "label": "洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bba74ff383dd3e148991621e1d3f0ecb48157625/preview/20260902220715_5023.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7d3b080cad377c6781c2931c7463838a2116d239/preview/20260902220723_1172.jpg", "label": "洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1}
];
