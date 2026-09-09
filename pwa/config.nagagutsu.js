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
// 動画バッチ更新(第4バッチ)：料理名は必ず1行に自動縮小／No.2は20秒尺／No.5は上に大ロゴ+料理大きく+下に名前/伊語/説明／
// No.6は横割り(上下2分割)でぼかし背景+全体表示／No.7は下に名前/伊語/説明+最下部に大ロゴ／No.8はタップ後を大きく＋説明拡大／
// No.1〜4はOP/CLOSEにも音楽＋ゆっくりクロスフェード。
// フィード画像(第4バッチ・10案)：Aに説明追加／Bは下帯をモルタル色+説明／Cは料理を大きく情報整理／
// GはBと重複しないセンターバンドへ／Hは額装マット+キーライン+説明。D・Fは廃止。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d9ec343bea0b735141b22ea4bdbdb5feaebaa172/preview/20260909135338_8869.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e3cef7431a6a61ba05a6640b94b289307f6f59e4/preview/20260909135346_0317.jpg", "label": "No.1 洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@703e9dddec5ebb3a0f3299bcac10eb22e4a55a43/preview/20260909135430_5310.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@67082391a6d30636d1ded24aacb27a92a143ad2f/preview/20260909135437_7556.jpg", "label": "No.2 洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@979496f61566a15224b2c40346bdc776e33707e6/preview/20260909141432_0924.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ff9f0408ca46cedac2d0ac8f92641015351e01fe/preview/20260909141441_5127.jpg", "label": "No.3 洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c70c0bda13e8c864529703a79762ee77ff471b77/preview/20260909135636_3541.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@aacebcc763d054f7841989f256d94b2bf9d21d5d/preview/20260909135644_5638.jpg", "label": "No.4 洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a9e0e74eb4d8eed59e5bbba3579d6b75a84d3603/preview/20260909135815_0586.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6f508101cb67146305f759b608109e602a03940c/preview/20260909135822_3069.jpg", "label": "No.5 洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0b82e8a8c3121b5c6a7ab0215b08352b86d9c504/preview/20260909135922_1782.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7e0af3ddb9e25680e9505e5b8295f7e7e97d1a88/preview/20260909135930_2286.jpg", "label": "No.6 洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@864173313a254e1fb7ab83ded932f40256ab08e8/preview/20260909140035_1707.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2070530602dbf64396d593b621536e091ddbe0c5/preview/20260909140043_6732.jpg", "label": "No.7 洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@cde70fdf7647ae430b137ffb5d96fc36095e142e/preview/20260909140110_8629.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@32268f886eb9859f6b3abb315ac22183cf26a8e0/preview/20260909140117_3325.jpg", "label": "No.8 洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3f1c574a891e855936a572a0fef2950fbd1c9191/preview/20260909140211_2040.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5f3671ca6ac274e835cd6682b9b350ce6cc42f13/preview/20260909140221_2317.jpg", "label": "No.9 洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9cf89945d5d2e77e3a27601711d5ad498b0fa101/preview/20260909140252_3321.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7cc3a78f153fb3134d960c12b4956324144b02cf/preview/20260909140258_4492.jpg", "label": "No.10 洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1},
  {"pattern": "yoshokufeeda", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f1629ce42d63041be97d692a60e746b95c44ec4e/preview/20260909143431_5384.jpg", "label": "フィード案A・フルブリード×ボトム暗幕(定番)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedb", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a766cd517d7d2f1f79440640c61334098459d6dc/preview/20260909143440_4777.jpg", "label": "フィード案B・ボトムバンド・エディトリアル", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedc", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f39f0976512c2dc00b66ac3fcc3c07f05b428f3f/preview/20260909143449_2661.jpg", "label": "フィード案C・カラースラブ分割(テラコッタ面)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a8632f9a96f0806b9970f3974492388b9aa343b4/preview/20260909143458_6343.jpg", "label": "フィード案E・サイドレール(テラコッタ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9d368b23c7d0c29b958bf1bd1d72010cf1da9174/preview/20260909143507_6130.jpg", "label": "フィード案E2・サイドレール(オリーブ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@80bd2976b06c6cf6f3b0c19a72198fe1c6395d4f/preview/20260909143516_5662.jpg", "label": "フィード案E3・サイドレール(ゴールド帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedg", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f8f0bd38781d0f9481b27be932f24fb09e6a31c3/preview/20260909143525_9575.jpg", "label": "フィード案G・センターバンド", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@51792ee8c4219def2d2f534969f956f7451dbe42/preview/20260909143533_8483.jpg", "label": "フィード案H・パーチメント×角丸カード(切り抜き風)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@24eec28d4fcd8c5aa6f3aaeca84fb888b25b57eb/preview/20260909143542_8807.jpg", "label": "フィード案H2・丸皿カット(正円・テラコッタ地)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d3238ba62240f5a760a4fe14ed072c8fa2674026/preview/20260909143550_5328.jpg", "label": "フィード案H3・角丸ステッカー×ハーフ地", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1}
];
