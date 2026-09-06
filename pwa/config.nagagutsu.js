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
// 6/7/8にも料理のストーリー短句を追加、9の大見出しの2行崩れを修正した版（run#12）。
// フィード画像A〜Hを全面刷新（プロ3視点監査反映：極太明朝＋料理フルブリード＋テラコッタのベタ面1焦点＋
// 欧文サブ＋グリッド安全帯／list-cats run#7）。“スクロールが止まる”1枚絵を狙った新デザイン一式。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@11cfa9018505e23a5109075b8de7061ee712495d/preview/20260904161107_8076.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@95f7f15a51f440c56bcb71ec10e263e5c0ed2ee9/preview/20260904161115_4476.jpg", "label": "No.1 洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@64cede036bde49556baf3890c02e0197e7edf48f/preview/20260904161153_4918.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e1025b44dd4739a6482af4863f0b1bafcef7e3c4/preview/20260904161201_7862.jpg", "label": "No.2 洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b3e3f9d015c50ccbc77ffcec5a29e62d24c8b059/preview/20260904161258_2591.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ec35a3d346ddc7d795fd97fd84c9d0cd559885ba/preview/20260904161307_4671.jpg", "label": "No.3 洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@963abb91c489c9c5720c11a4925ab7039a4224c6/preview/20260904161353_7723.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@06f251c26bfb906718988e9fbd55e68bcf0a4b3a/preview/20260904161401_9486.jpg", "label": "No.4 洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0850e46ae4c9fc4b5b060e822e5d44bf7ab0885b/preview/20260904161452_8486.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5424002a8a82ac5012963c80bafdada2d5cc68b6/preview/20260904161500_2258.jpg", "label": "No.5 洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ee8f795cb0ee49c5bce3d80724acc25148b69367/preview/20260904161532_4676.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6a777aa09181bc5faad8f42b2ee89848b0397c15/preview/20260904161540_7232.jpg", "label": "No.6 洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7ae56fa03572c2b70dd586ddfe56b36bf3182d04/preview/20260904161621_6038.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@57e13f6e29ae50b543701f2c2bc5834dc14f7510/preview/20260904161629_3618.jpg", "label": "No.7 洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@427ec597aa379fa20b14813b655e03460406b09c/preview/20260904161705_6091.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7fe98f80805b3a54e12ef57a0258788af9b863c4/preview/20260904161712_9036.jpg", "label": "No.8 洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ad21964b47def762bd091770b485378efadb72c7/preview/20260904161808_7729.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e0287bedd2222c2bd233386f8dc389ba6f85cecf/preview/20260904161815_2338.jpg", "label": "No.9 洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2e8478dd0283175bbcce95105fc5c1340582dd28/preview/20260904161849_4057.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@216115d059fe52ad15b8647821e71e832076f07b/preview/20260904161856_8828.jpg", "label": "No.10 洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1},
  {"pattern": "yoshokufeeda", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6f5179f1891326b202f81505e5904ab1a3eb9936/preview/20260906171355_7500.jpg", "label": "フィード案A・フルブリード×ボトム暗幕(定番)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedb", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@134773d1feaf9aafe957f5de6f65186d9f4c0743/preview/20260906171404_5029.jpg", "label": "フィード案B・ボトムバンド・エディトリアル", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedc", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2adeea16b557943b68e00f3fcfa334a00e44024b/preview/20260906171412_2983.jpg", "label": "フィード案C・カラースラブ分割(テラコッタ面)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedd", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5901ae04f86690cb35089b191bd9d1068dde069b/preview/20260906171420_8210.jpg", "label": "フィード案D・縦組み特大明朝", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@844515084c367849b2ec8b27cf1b29caf62d86c6/preview/20260906171428_9917.jpg", "label": "フィード案E・サイドレール(テラコッタ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@469b3fcfd18b471de8146841d756318cd8a11948/preview/20260906171437_3349.jpg", "label": "フィード案E2・サイドレール(オリーブ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8a17d0f67e22e4a8e48dad73bd60c3708a2486a9/preview/20260906171445_1360.jpg", "label": "フィード案E3・サイドレール(ゴールド帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedf", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1fbded03460a44e528bec6f9eeaab42ab2820a59/preview/20260906171453_3187.jpg", "label": "フィード案F・テラコッタ帯(本日のおすすめ)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedg", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5bc5b8a92e983446325a9df9c6d5db250432f17e/preview/20260906171501_5542.jpg", "label": "フィード案G・マガジン・エディトリアル", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d6fdd1d89598ddcefe56805520e8cf57ca3ddf6a/preview/20260906171509_7982.jpg", "label": "フィード案H・大タイポ・カバー", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1}
];
