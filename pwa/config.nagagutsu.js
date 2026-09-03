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
// 各動画の右上に「No.N」を焼き込み済み（修正指示を「No.○の動画」で出せるように）。label先頭にも番号を付与。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@72064626687b9a4eaf8c76dafd9dbe7aca0aa67a/preview/20260903214557_2329.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7cc23a4d83917ced3ebe5fce1a4f89cd2c8daeb3/preview/20260903214605_3195.jpg", "label": "No.1 洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f3f609632b31937fd1113216dedd3b8d891e4e70/preview/20260903214653_0600.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7efd8ce4eb1b247683043bce80d7ad04fbe72fee/preview/20260903214702_1292.jpg", "label": "No.2 洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2bf1d50a019a9deeaf2e76502acffc34169a38a1/preview/20260903214813_8794.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@22a44ed2c4aad9312696132a5aa48931cc3709d4/preview/20260903214822_0755.jpg", "label": "No.3 洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@02f53c84b45e1d14cf96851c87e514ee0b5fab09/preview/20260903214919_9958.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@670da1c3ae8d632bd0ec8b1ae4b7ecd63667df79/preview/20260903214927_6800.jpg", "label": "No.4 洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@dfb9a9b2bd37c90e12f656080ba76a5cf3214ef5/preview/20260903215031_1827.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c8edaddadb6e8b7395cbe7f1d21a0579a91325f4/preview/20260903215040_9375.jpg", "label": "No.5 洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a03d7dbc591ca47ccd59ddb711b4db1114c480f1/preview/20260903215121_7707.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9c8236221ffe7de37bcde48773b162cbc38979fc/preview/20260903215129_9468.jpg", "label": "No.6 洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d57daf4b0530dcd0cad03aecc0138b062206ccc7/preview/20260903215219_7348.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bbe44de7c46ad31dbb09edd1c2ec1dbe5fa0feb0/preview/20260903215227_3866.jpg", "label": "No.7 洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@eff44ea32f4969556f958184bfdc2bb543594043/preview/20260903215310_9858.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3a34878e479526e2f9710781350ff1c21b2bc15f/preview/20260903215319_7782.jpg", "label": "No.8 洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6e1d683ac3fad5fd756fe82768984717766c5024/preview/20260903215427_8914.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@98674d17fe4c6b2b009fbcf1d42f367efe0d4cf9/preview/20260903215436_7663.jpg", "label": "No.9 洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@318051d06fd322b59a86cb65a1e9e48d033a0d88/preview/20260903215518_7978.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5ebc2bc4f2a2512129c9f35be5e5c7ab829c6655/preview/20260903215527_4411.jpg", "label": "No.10 洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1}
];
