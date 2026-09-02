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
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d5ca0e660611809752ef2666f1e3a9672f59c2a0/preview/20260902201538_7719.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c3b863cfe251637866802177431b4b6738c9b920/preview/20260902201547_6971.jpg", "label": "洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@05e136b3e81c4bcbc11da0fef871fb5b145068ea/preview/20260902201636_5686.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@782e226ff7b59180b78b9615c010958f3760d129/preview/20260902201644_3830.jpg", "label": "洋食おしゃれ・黒板トラットリア", "caption": "この一皿に 乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@764b401e36b2bb12e06409e8aa7795e00ced686b/preview/20260902201806_4445.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e51c80ad8c61ede03dbc32f2ac140731af3b485c/preview/20260902201815_3177.jpg", "label": "洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、 いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@942684813e9c76a723c6492bc0a824498fc5fc44/preview/20260902201918_9927.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1b7dd3cf4af1d0854ee4b25fc7279d815e69f123/preview/20260902201927_1315.jpg", "label": "洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@fdb4e6550de5e224edcaeaa28d171e8aad879893/preview/20260902202042_6284.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0f15443cc7ca5f16943b9cc2ad88ed94d961982d/preview/20260902202051_8677.jpg", "label": "洋食おしゃれ・シネマ", "caption": "腹ペコ、 集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@480c64948c89fcf939befe0699ab6398f96a73a9/preview/20260902202139_8955.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ddc64f1f0bc276aeefd68669384ae1f4a2b6485a/preview/20260902202147_3415.jpg", "label": "洋食おしゃれ・ワインと共に", "caption": "日常に、 ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@51d88a74e554f3017133336bdce18bfe3eb6226f/preview/20260902202246_2457.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@070dc93d5391399ab07bde548e2f5850ed1e0011/preview/20260902202254_9601.jpg", "label": "洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7636437fb6f8c833a2fbb4b82281c055e3634d4f/preview/20260902202343_7381.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0a392c13012d090c77203bd94f19699ee6f07bb9/preview/20260902202351_7452.jpg", "label": "洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5ee20b62b3e382a849dba0e0ae770e98e32fb2ac/preview/20260902202511_9952.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f5ef6eee2f493ce4a2b074fc6fab54e7b2afc4a8/preview/20260902202520_5104.jpg", "label": "洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、 はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@658d31c5dcaa2d01e14fd44d658db9787d63e313/preview/20260902202610_4736.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@20b15e3c881747ad2d7901f6d774ea875ba5a8f1/preview/20260902202619_2678.jpg", "label": "洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く 日常に贅沢を〜", "music": "paving_walkway", "enabled": 1}
];
