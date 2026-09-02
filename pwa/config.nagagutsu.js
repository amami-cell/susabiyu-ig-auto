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
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9e69cd680d476f775eba261cedf5f16130b394fe/preview/20260902194508_8589.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4c8221c13900cf9562197c1a54409ecb84be4698/preview/20260902194515_9710.jpg", "label": "洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d9bc2ef5d9042f9a0cd766f588c2678eaf9a1d24/preview/20260902194557_5703.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f8575d61e68801f1cd8fcaa7148a338ff3c07105/preview/20260902194604_4348.jpg", "label": "洋食おしゃれ・黒板トラットリア", "caption": "この一皿に 乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2b221b0ce09ceade1fa287f34a9e51a9f17b81fe/preview/20260902194712_3273.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@014a4ecd4558277b1a765ee46ef91a5ea313322a/preview/20260902194720_5641.jpg", "label": "洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、 いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@94a2393271388e565d7bee7b7cd30fd2be87562c/preview/20260902194812_6994.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@fe46556f1db4427d8d2cd4bc730d02ebe611fdab/preview/20260902194820_3560.jpg", "label": "洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a720eaa241163395a138acfbbbbfbb918c6199b5/preview/20260902194921_2077.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c34731928e7c0d93e63e83bc389686fe4ba63088/preview/20260902194928_7893.jpg", "label": "洋食おしゃれ・シネマ", "caption": "腹ペコ、 集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6edde163481f089c1f82c0afe968b2b5efcc83c0/preview/20260902195006_3198.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5d159b48e1dc402ec5cdc04717cdf422998841e4/preview/20260902195013_6329.jpg", "label": "洋食おしゃれ・ワインと共に", "caption": "日常に、 ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@043ac8b13b78a6617324f82c9b4462f7d8170b0e/preview/20260902195102_8454.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b74d9d211854e0586f8f6636d257ba672c75c746/preview/20260902195110_4856.jpg", "label": "洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c5984a920684b2d09ea4c568e3ea210b2aa2a44a/preview/20260902195153_2317.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@afff51fa330d04956eb456f23084b4e48bf28786/preview/20260902195200_2318.jpg", "label": "洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c55b6eae90ca43462106e769934da4e2fc910819/preview/20260902195307_0410.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2721558e3f3f0228a1f5560d8b16c31f1c3f2cf3/preview/20260902195315_4064.jpg", "label": "洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、 はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8f88e77ee03b1544748d7af275f606bda577acde/preview/20260902195356_7636.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@112c1e6b45bac08c2f37e3d9368446bc0368c5bf/preview/20260902195402_4074.jpg", "label": "洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く 日常に贅沢を〜", "music": "paving_walkway", "enabled": 1}
];
