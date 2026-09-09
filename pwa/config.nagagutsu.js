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
// 動画(第5バッチ)：全テンプレの料理名を1行に統一／No.2は20秒尺／No.3は引き（ぼかし+contain）／
// No.5は上に大ロゴ+下に名前/伊語/説明／No.6は横割り+名前を中央から離し丸ロゴ拡大／No.7にOP・CLOSE追加＋下部情報+大ロゴ／
// No.8はタップ後を大きく／No.9は左上に色付きロゴ(140px)／No.1〜4・7はOP/CLOSEにも音楽。
// フィード画像(第5バッチ・9案)：A/Bに商品説明、Bはモルタル帯、Cは雑誌エディトリアル(キャプション枠)、
// Hは縁をぼかして紙に溶かす切り抜き風。D・F・Gは廃止。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0ad5a05955c5fe061c398a8e5ade258a7c373fe6/preview/20260909152039_6693.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d1f7c68ffa160fff6061e7b5ad09817333784a13/preview/20260909152048_6398.jpg", "label": "No.1 洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f1d10e4fc6b0069fad1abff7eaf4cea86381cd13/preview/20260909152149_1680.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a08f5a4604b55a27a50207ea4ccde810a44fb400/preview/20260909152157_4567.jpg", "label": "No.2 洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c322dcebb48726f0ebc260b9dbaa83c273a713c7/preview/20260909152420_8248.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ac5e4477e5d36d612e09b38153d7149dcef2750e/preview/20260909152429_6033.jpg", "label": "No.3 洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0f893a4b892586bc9f2ddc7cbc02fe37cee78494/preview/20260909152536_5860.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@56d8eabb9ef38aea0328b7353f9fc1dabde41dfa/preview/20260909152545_3970.jpg", "label": "No.4 洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@eccf35086b634e8fe1ba9db2c27121869b0e08af/preview/20260909152749_7800.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@da7b8255795ff6df5d1f0c21fad8cb650a1afe26/preview/20260909152759_7667.jpg", "label": "No.5 洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@34c46ac4220a7ce3aee931a74506bc6e5d5ebeb7/preview/20260909152918_2414.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b4fcc7565f1265932c246c249099c9b250ab85f8/preview/20260909152928_8130.jpg", "label": "No.6 洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e90c7d5b4938cf8d48ead7432618a28a4db483db/preview/20260909153108_6010.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1bb6e67f31c1fdb564c48ab4cb585a085188e184/preview/20260909153117_8536.jpg", "label": "No.7 洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f9938c77c713f982f0aed4ef7cb0bc9fbb498a02/preview/20260909153154_2912.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a77e44bfb69dbafa2d6741ee36e5d1c5f523e6fc/preview/20260909153203_6198.jpg", "label": "No.8 洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b889586e780fd0c08d384f7ffecde05e32581710/preview/20260909153315_3018.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c9a88fae465e6005a899a7e4d227d30d3f7de651/preview/20260909153324_2067.jpg", "label": "No.9 洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@28c6850a9882ebdaab05218ac18e97f43321496c/preview/20260909153407_0971.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a47d97e7496ed44647e5ebfd503f939c7c071d9f/preview/20260909153415_5799.jpg", "label": "No.10 洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1},
  {"pattern": "yoshokufeeda", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1784272166df3ae117fb5a6e3cb61697f4daecf8/preview/20260909160111_3729.jpg", "label": "フィード案A・フルブリード×ボトム暗幕(定番)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedb", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7644de8c6704caff21a3d6022cdce3748d16b93d/preview/20260909160120_6946.jpg", "label": "フィード案B・ボトムバンド・エディトリアル", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedc", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0469293fdb50daa25efe7e853e387feb8573fa79/preview/20260909160129_1727.jpg", "label": "フィード案C・雑誌エディトリアル(キャプション枠)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e0be31938b6ee6246c7b2e821758aa6ec86f2473/preview/20260909160138_9068.jpg", "label": "フィード案E・サイドレール(テラコッタ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@72f0ca638d48898208e58616a0dd2a6eb0e41b54/preview/20260909160147_9587.jpg", "label": "フィード案E2・サイドレール(オリーブ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0a948d751739022406bbcb04db2f145ae5520635/preview/20260909160156_9220.jpg", "label": "フィード案E3・サイドレール(ゴールド帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f3ae3e8f4c5ada5a0d087f2cf78c336df9b3b556/preview/20260909160205_0462.jpg", "label": "フィード案H・パーチメント×ぼかし切り抜き", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1fe6feff308e5b9f63dc69860c5b5091c3e2ff07/preview/20260909160213_0403.jpg", "label": "フィード案H2・丸皿カット(正円・テラコッタ地)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6fd59547aa66cb8821edb095d27a81848161d927/preview/20260909160222_9245.jpg", "label": "フィード案H3・角丸ステッカー×ハーフ地", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1}
];
