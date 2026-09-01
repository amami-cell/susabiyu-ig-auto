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
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@622a4e1abc89b5c76215195d18f4a3707ae455e9/preview/20260901200637_0682.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@79eebe7b07d231e41bb08a1459fd53bd7b67597e/preview/20260901200645_3211.jpg", "label": "洋食おしゃれ・本日の一皿", "caption": "本日のおすすめ、あります！", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7ac61185c3ee92ace6c4758d760f6d5cea8bb1ff/preview/20260901200715_4391.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@464a3a04977eff2655b19dd0d7da051fcccdf595/preview/20260901200722_2234.jpg", "label": "洋食おしゃれ・黒板トラットリア", "caption": "できたて、熱々でお出しします！", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3cd14e2b43d2780df97b48dea9631f98836e68af/preview/20260901200801_1216.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@88539757da6dc0f2c4ecdbe63963a7606f946478/preview/20260901200809_2143.jpg", "label": "洋食おしゃれ・鉄板ジュ〜っと", "caption": "自慢の一皿、揃ってます！", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@81a6587b62e250c698836d263ce81c1207321b57/preview/20260901200835_6922.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d52bb9d01238deabe97624b60b1b9522d9913270/preview/20260901200843_1628.jpg", "label": "洋食おしゃれ・雑誌エディトリアル", "caption": "今日も元気に営業中！", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a91cf6324230f6be2901fdb6edf66e5d18c8eee6/preview/20260901200920_7627.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c9e3180687c1ab6ce8f5019c3ae4621800e7b9bc/preview/20260901200928_3434.jpg", "label": "洋食おしゃれ・シネマ", "caption": "肉とワイン、進みます！", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@10250fb8bfbd4df6abcbbf4fb0d751ebf654e148/preview/20260901200957_5179.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@631195fbd541d95d9251d47637acaaba9165aa65/preview/20260901201006_8953.jpg", "label": "洋食おしゃれ・ワインと共に", "caption": "気軽にイタリアン、どうぞ！", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@81955eef595c959b6cf3c3aa52cc0c8d63e90160/preview/20260901201036_4121.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d5fd48f25a461e2035c1d79a567b0fe66d2a71ca/preview/20260901201044_5647.jpg", "label": "洋食おしゃれ・おすすめ3品", "caption": "シェフの自信作、召し上がれ！", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@913acf4e9b55c2324028e5d17bfbc225923b5481/preview/20260901201116_8620.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a22ada66e7ff62e5517d0650cd1d69ef19260d9d/preview/20260901201123_1076.jpg", "label": "洋食おしゃれ・ポラロイド重ね", "caption": "カジュアルに、本格イタリアンを！", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c23a74917f411b0afa8adc1e7bac48dc078aa560/preview/20260901201159_0996.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bf2ad832defd684e42b198a01646d91576fe49ee/preview/20260901201206_2489.jpg", "label": "洋食おしゃれ・大見出しタイポ", "caption": "お腹も心も満たす一皿を！", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@71894927e2e21d137c4b18547ebbbb3cc1479cb6/preview/20260901201243_1287.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@20ecbd0645ba0714343543719a63701cbde38c8b/preview/20260901201251_7420.jpg", "label": "洋食おしゃれ・本日OPEN案内", "caption": "仕事帰りに、ふらっとどうぞ！", "music": "paving_walkway", "enabled": 1}
];
