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
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7c11528b18aeabaf6bea4c5043c9c9966c4cc4f1/preview/20260909194153_3490.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c9f19e15d30d98e6de8f8e15e3c94a26cc49e354/preview/20260909194156_5619.jpg", "label": "No.1 洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ce93b797a0e52412245847d521dcb2ede00571f0/preview/20260909194259_0659.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f4cb5452437cef3b5a77a2cb522d160189c29840/preview/20260909194301_4921.jpg", "label": "No.2 洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@58ba44b283b7b00bb8fc0b8a3cd63a7f4dc45de7/preview/20260909194530_8330.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@aa2ff94bcda750d2f5b1bf162318e1bef980e0d2/preview/20260909194532_7020.jpg", "label": "No.3 洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@121f89231ef3aad6ecfee99f18e8150c1aa0cee0/preview/20260909194648_0802.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a371a3aa14f52f33b20e7cc3f72750313f2820a4/preview/20260909194650_2692.jpg", "label": "No.4 洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@eccf35086b634e8fe1ba9db2c27121869b0e08af/preview/20260909152749_7800.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@da7b8255795ff6df5d1f0c21fad8cb650a1afe26/preview/20260909152759_7667.jpg", "label": "No.5 洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@311f5e18aeeb80bf000a2c82b9025c9364b477bd/preview/20260909194908_3686.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@da70929a1c7f969d948e1fddc79de4ea1c49b9fa/preview/20260909194911_0405.jpg", "label": "No.6 洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e90c7d5b4938cf8d48ead7432618a28a4db483db/preview/20260909153108_6010.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1bb6e67f31c1fdb564c48ab4cb585a085188e184/preview/20260909153117_8536.jpg", "label": "No.7 洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ebaee1b7c5f9befe2439778e53ac56e9e36a22b1/preview/20260909173809_5120.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b9f27ccf8994f14065a10e6052f0fdfa0910928a/preview/20260909173816_2817.jpg", "label": "No.8 洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b889586e780fd0c08d384f7ffecde05e32581710/preview/20260909153315_3018.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c9a88fae465e6005a899a7e4d227d30d3f7de651/preview/20260909153324_2067.jpg", "label": "No.9 洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@28c6850a9882ebdaab05218ac18e97f43321496c/preview/20260909153407_0971.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a47d97e7496ed44647e5ebfd503f939c7c071d9f/preview/20260909153415_5799.jpg", "label": "No.10 洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1},
  {"pattern": "yoshokuopblur", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bbaf6eafd645079f1e969527bad49e8352595c50/preview/20260909184629_1084.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@dd308bdc38b76cd84f9bb5f90d9d27453ed66cd4/preview/20260909184631_6710.jpg", "label": "OP/CLOSE案1・ぼかし写真（約8秒）", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokuopmortar", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@74771dd20fb2c90a28bcd103be0cf26d1a227ba0/preview/20260909184710_2417.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@45a71d9af443c9dbd000282380643584ddb3c4f0/preview/20260909184711_9240.jpg", "label": "OP/CLOSE案2・モルタル壁（約8秒）", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokuopwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8926b96e1429a3f627cf263203562568cb5bffcb/preview/20260909184746_9601.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@091840cfc840efde467cbbad818a9d8d3e728f68/preview/20260909184747_8301.jpg", "label": "OP/CLOSE案3・ボルドー（約8秒）", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuop4", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@41bf990aa607c599190d6a113538b7af0ab5a366/preview/20260909194950_9346.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@02c2b35a231c407df8843d29af08d00b47896f3a/preview/20260909194952_9885.jpg", "label": "OP/CLOSE案4・シネマの幕（約8秒）", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuop5", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@921f8abb2b19c2c7bb673065e3ab07d659245137/preview/20260909195047_0888.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ba6f2faa9afbba6e23aafa55e620d45b2ae4ff5f/preview/20260909195048_9509.jpg", "label": "OP/CLOSE案5・一皿から引く（約8秒）", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokuop6", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@69180a1e81d72db1116f8257e7a4c40f2c91eb68/preview/20260909185011_1981.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@00c2f4c3695c31593dec74c2a305a421f3a321cb/preview/20260909185012_0355.jpg", "label": "OP/CLOSE案6・ネオンが灯る（約8秒）", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokuop7", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@43b8aedfab7c8cc28dff87cac81a7a7f9c386a57/preview/20260909185047_7776.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ebdcc5b5366ab5386f3ad7472c68043c9fa99986/preview/20260909185048_2484.jpg", "label": "OP/CLOSE案7・金の円環（約8秒）", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokuop8", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@06f33df618bbfbd3928ca3286266bbb5e14ad4c4/preview/20260909185126_1266.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5fdddc7c8bfbe3a9e2ec7c3a2e514d2761828c55/preview/20260909185128_3916.jpg", "label": "OP/CLOSE案8・タイポが集まる（約8秒）", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuop9", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@42ff370738d3f748de695585a518cad5a9ca2711/preview/20260909195122_0530.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8518acc7444ce79f4f8c6f081dceae09b72d025c/preview/20260909195124_6842.jpg", "label": "OP/CLOSE案9・雑誌の表紙/裏表紙（約8秒）", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokufeeda", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4082143b2ea46f7f9eeb9dca7af1e74e176d6219/preview/20260909195404_0168.jpg", "label": "フィード案A・フルブリード×ボトム暗幕(定番)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedb", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@507f3ed358f6a05558cba9d8561d0b4750ca3889/preview/20260909195411_5437.jpg", "label": "フィード案B・ボトムバンド・エディトリアル", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedc", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bbaad0c38809fe0d96a874e8c5bef81a7d5edb67/preview/20260909195417_8832.jpg", "label": "フィード案C・雑誌エディトリアル(下地なし)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3820a3e34c888632d266ab37a557e0957420c9f4/preview/20260909195424_7326.jpg", "label": "フィード案E・サイドレール(テラコッタ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@03341b5addde1029accae86e6d1302146426396c/preview/20260909195431_0658.jpg", "label": "フィード案E2・サイドレール(オリーブ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@95327f8e68a706e08c8385c40d34ec0d011c535b/preview/20260909195437_7729.jpg", "label": "フィード案E3・サイドレール(ゴールド帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
];
