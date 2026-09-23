// 鮨処すさび湯（京都・四条烏丸／寿司・日本料理）確認アプリ 設定
// ------------------------------------------------------------------
// 共有アプリ(app.js)が参照するグローバル名は window.GIFUYA（＝汎用の店舗設定スロット）。
// 本ファイルは鮨処すさび湯用の値を入れる。karasuma.html / karasuma_reels.html のみが読み込む。
// GAS_URL は多店舗共有GAS(/exec)。予約は ACCOUNT="karasuma" でJ列に書かれ、
//   予約投稿エンジンが鮨処すさび湯のIGへ振り分ける。
// MEDIA_BASE は deploy_pwa.yml が R2_PUBLIC_BASE を注入（未注入なら見本枠は空）。
// 見本は wamodan（和モダン）テーマ＋店ロゴで焼いた洋食おしゃれテンプレ（BGMは店の和BGM）。
// ------------------------------------------------------------------
window.GIFUYA = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbxKn_MUfPgJ0nA8LJPp6YGb2Jehp9G8CpckV5bOAhe3M53eBC3Kle3O3Bf7mFzUJ2TMQw/exec",
  MEDIA_BASE: "PASTE_MEDIA_BASE_HERE",
  STORE_NAME: "鮨処すさび湯",
  HANDLE: "@susabiyu_kyoto",
  ACCOUNT: "karasuma",                          // 予約投稿タブ J列/AcctTokens と一致させる内部ID
  POLL_MS: 4000,
  // Web Push 公開鍵（三条と同じ鍵を共用。専用鍵ができたら差し替え）
  VAPID_PUBLIC: "BFDIPEHslhSqZlE4QooHXikxgv-25YJEDmESsYVxLXFnrmPWLO8aQGoVFYTUWO5nn_QpkUAiCtb1QZprcMCNIuc"
};
// 実データ連携が有効か（GAS_URL が実物URLか）を判定するフラグ。
window.GIFUYA_LIVE = /^https:\/\//.test((window.GIFUYA.GAS_URL || "").trim());

// 見本ギャラリー（和モダン意匠でストーリーテンプレを焼いたもの・第1弾11本）。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3a2ffc99a70f335688767fe8e6180518087a5c67/preview/20260923170629_3459.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7661db6a5123664aa1239ed775cdb22589adefc7/preview/20260923170632_7275.jpg", "label": "No.1 和モダン・本日の一皿", "caption": "今宵は、鮨と。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0c62fe37f5e8f62433d84aac3fe4992cdf42dc21/preview/20260923170744_6472.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d161a07dc7f333b5b87f03fb84142d72af467990/preview/20260923170747_3870.jpg", "label": "No.2 和モダン・黒板メニュー", "caption": "旬を、ひと貫。", "music": "あじさい茶屋", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7f5c621930908ca26c1f406c6c7f487d8fbaa14f/preview/20260923171042_3641.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4a16e7e003ef7fc9e4d20d42dcd4a13375841b14/preview/20260923171045_5409.jpg", "label": "No.3 和モダン・炙りシズル", "caption": "町家で、静かに一献。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0007d5eb7611f65b8ff6cddc7b34e21275b0fbd6/preview/20260923171205_2268.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e951bed313a9cdefe7a412923be4ded53a2f7493/preview/20260923171207_8395.jpg", "label": "No.4 和モダン・雑誌エディトリアル", "caption": "京の粋を、ひと皿に。", "music": "宵風灯路", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@021877834153d53f921711e49cd394db619500cd/preview/20260923171412_5018.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@53d2f322804fffdc0cfc41a4b46ca402f41114ff/preview/20260923171416_6884.jpg", "label": "No.5 和モダン・シネマ", "caption": "握りたてを、どうぞ。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@072e8e4b092917be3aa045aa3b0edc15e6c75ed8/preview/20260923171631_7056.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d2c1094b127dd2d1cec007b253b8f03b001e6398/preview/20260923171635_0843.jpg", "label": "No.6 和モダン・一献と共に", "caption": "上質を、気軽に。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@cff889257a170aa70e06151c0426a2cce0255dd9/preview/20260923171825_7024.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@85ff181b8df1b0de47dabcb1ba9bce8f51deec63/preview/20260923171828_1422.jpg", "label": "No.7 和モダン・おすすめ3品", "caption": "日常に、ひと皿の贅沢。", "music": "津軽三味線独奏貝殻節 (1)", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f269d4adb070fa8ab1eb750172323bb5643e9459/preview/20260923171911_3862.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@86e6da251ea4f062430778eefb378790dc17edcd/preview/20260923171912_3417.jpg", "label": "No.8 和モダン・ポラロイド重ね", "caption": "職人の、手しごと。", "music": "祭りビート", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@71c65c72306ac6c18ac47a74753f2e4ba4161b8b/preview/20260923172022_6160.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@39beafbbd00b8647791df1c24775da240414900c/preview/20260923172026_5089.jpg", "label": "No.9 和モダン・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "祭りヤグラ", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f64f9a75d06a385825cbe2bc8adbf85dfcebc30a/preview/20260923172110_3826.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9a943cca1306d2e9bf58e8883073c378a558f4b3/preview/20260923172112_7220.jpg", "label": "No.10 和モダン・本日OPEN案内", "caption": "〜京町家で、旬の鮨と和食を〜", "music": "花笠音頭 (1)", "enabled": 1},
  {"pattern": "yoshokumagazine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@866abc800855192d100d1b0d929eaa68bedd805d/preview/20260923172242_4618.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@880b6b0f50a970fe3af37213b5a8e6838772ee5c/preview/20260923172245_6946.jpg", "label": "No.11 和モダン・雑誌ストーリー", "caption": "今宵は、鮨と。", "music": "銭湯に行こう (1)", "enabled": 1}
];
