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
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c7c2e8ceb6dc2eda345953c850945801082f263d/preview/20260909173051_8847.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@643640158ef69b6f7f5d16a90c5b0825687ed94c/preview/20260909173101_7477.jpg", "label": "No.2 洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c322dcebb48726f0ebc260b9dbaa83c273a713c7/preview/20260909152420_8248.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ac5e4477e5d36d612e09b38153d7149dcef2750e/preview/20260909152429_6033.jpg", "label": "No.3 洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7ab9ef654dc7a3362c2936093180f271c12ade99/preview/20260909164249_7834.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4da6b070e1eb3b3b0d0bb77ab3c52b9c17264f74/preview/20260909164258_5526.jpg", "label": "No.4 洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@eccf35086b634e8fe1ba9db2c27121869b0e08af/preview/20260909152749_7800.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@da7b8255795ff6df5d1f0c21fad8cb650a1afe26/preview/20260909152759_7667.jpg", "label": "No.5 洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@36d59ef34883e90d5826f1ea32958c1def6b19b8/preview/20260909173524_0684.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2984a2022087b94ec1c730625c812a6e3a0a9963/preview/20260909173534_2878.jpg", "label": "No.6 洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e90c7d5b4938cf8d48ead7432618a28a4db483db/preview/20260909153108_6010.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1bb6e67f31c1fdb564c48ab4cb585a085188e184/preview/20260909153117_8536.jpg", "label": "No.7 洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ebaee1b7c5f9befe2439778e53ac56e9e36a22b1/preview/20260909173809_5120.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b9f27ccf8994f14065a10e6052f0fdfa0910928a/preview/20260909173816_2817.jpg", "label": "No.8 洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b889586e780fd0c08d384f7ffecde05e32581710/preview/20260909153315_3018.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c9a88fae465e6005a899a7e4d227d30d3f7de651/preview/20260909153324_2067.jpg", "label": "No.9 洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@28c6850a9882ebdaab05218ac18e97f43321496c/preview/20260909153407_0971.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a47d97e7496ed44647e5ebfd503f939c7c071d9f/preview/20260909153415_5799.jpg", "label": "No.10 洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1},
  {"pattern": "yoshokuopblur", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@41c2809c32828a096495d1834822f57e51c6e1ee/preview/20260909164352_8493.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ba2bd290284a2a43b87b4800731803cfa45a335c/preview/20260909164400_0480.jpg", "label": "OP/CLOSE案1・ぼかし写真（約5秒）", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokuopmortar", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4d32d6c38a408eaca7519f90a5ac7d51c07d7cf5/preview/20260909164429_3124.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b80291cba0c46b96f113761b0f90756cd1264479/preview/20260909164437_4805.jpg", "label": "OP/CLOSE案2・モルタル壁（約5秒）", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokuopwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@358aeb433796b98c2531bb24a3d9c2f98b503efc/preview/20260909164503_6871.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4c321e9e455b9edafacb232a0acdac7ec96a5f47/preview/20260909164510_7279.jpg", "label": "OP/CLOSE案3・ボルドー（約5秒）", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuop4", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@cf78d6746e835c030347be076a0c360c3f0def5b/preview/20260909174037_4326.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@cd916915fec78b8f10be684dbac462ef0a8946e4/preview/20260909174045_5128.jpg", "label": "OP/CLOSE案4・シネマの幕（約5秒）", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuop5", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b7fab2d3c897ef81380ca7dd032994dd68fc04d8/preview/20260909174123_5746.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@42803f04a7372b513e9257bb177f4d2bceab49e6/preview/20260909174132_3015.jpg", "label": "OP/CLOSE案5・一皿から引く（約5秒）", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokuop6", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5606ccbf4f51a045f4ebef1dc909a4b966f0342e/preview/20260909174206_6394.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e32197d4290ecd9939ba26f19ecc43c4d6672796/preview/20260909174215_9419.jpg", "label": "OP/CLOSE案6・ネオンが灯る（約5秒）", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokuop7", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@913270f11a92b2789efab9d050b7bafe4bb52df8/preview/20260909174241_7526.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@06a349ddeef1ce01534479b8b5f9e043b070a75b/preview/20260909174249_0683.jpg", "label": "OP/CLOSE案7・金の円環（約5秒）", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokuop8", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@536b7a12cb247e8156c022894fc6db319708f677/preview/20260909174318_1807.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@38ec78bdd75dbd1be94f9d6af04c64c16c396c46/preview/20260909174326_2163.jpg", "label": "OP/CLOSE案8・タイポが集まる（約5秒）", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokufeeda", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f2a9f7949980890185c6eb1c98a92daab830526f/preview/20260909165718_7441.jpg", "label": "フィード案A・フルブリード×ボトム暗幕(定番)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedb", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@be748ecd97b809d8abc0fac1e70a7b4589847cdc/preview/20260909165727_1651.jpg", "label": "フィード案B・ボトムバンド・エディトリアル", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedc", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ef13962552368717b593461997584c69dbaa5163/preview/20260909165736_3202.jpg", "label": "フィード案C・雑誌エディトリアル(下地なし)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4c425deaf3593337ee97737797e2c17e51485a39/preview/20260909165745_4033.jpg", "label": "フィード案E・サイドレール(テラコッタ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7be2ecf8e2da86035961bfbe2e6ee02759121278/preview/20260909165754_8611.jpg", "label": "フィード案E2・サイドレール(オリーブ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b68a23d2fadadc117fd98140c55ac237cf00ff74/preview/20260909165802_1527.jpg", "label": "フィード案E3・サイドレール(ゴールド帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@052c8cde7a0648045b6454de35bcdf10eb1b7300/preview/20260909165811_1781.jpg", "label": "フィード案H・切り抜き3品のイメージポスター", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@97355e499a14e26dbd5fab69367ad393274bbc53/preview/20260909165820_6929.jpg", "label": "フィード案H2・丸皿カット(正円・テラコッタ地)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@aed3e85ac15c3cccc5cca13629e6aa26176f4609/preview/20260909165829_4167.jpg", "label": "フィード案H3・角丸ステッカー×ハーフ地", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1}
];
