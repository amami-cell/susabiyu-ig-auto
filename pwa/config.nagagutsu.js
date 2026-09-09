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
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f0ea8290056afd5ad212883816bd84022272a7bf/preview/20260909181650_5370.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@73969b06e056b04bf54b11583ca38e125f359b48/preview/20260909181659_6894.jpg", "label": "No.2 洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c322dcebb48726f0ebc260b9dbaa83c273a713c7/preview/20260909152420_8248.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ac5e4477e5d36d612e09b38153d7149dcef2750e/preview/20260909152429_6033.jpg", "label": "No.3 洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7ab9ef654dc7a3362c2936093180f271c12ade99/preview/20260909164249_7834.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4da6b070e1eb3b3b0d0bb77ab3c52b9c17264f74/preview/20260909164258_5526.jpg", "label": "No.4 洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@eccf35086b634e8fe1ba9db2c27121869b0e08af/preview/20260909152749_7800.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@da7b8255795ff6df5d1f0c21fad8cb650a1afe26/preview/20260909152759_7667.jpg", "label": "No.5 洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@dee5b4364935abdb13bf36f2430d1d2e98482882/preview/20260909182130_1579.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@47566dc949b69cc5eae185483cc4b66d4cd7a234/preview/20260909182140_7178.jpg", "label": "No.6 洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e90c7d5b4938cf8d48ead7432618a28a4db483db/preview/20260909153108_6010.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1bb6e67f31c1fdb564c48ab4cb585a085188e184/preview/20260909153117_8536.jpg", "label": "No.7 洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ebaee1b7c5f9befe2439778e53ac56e9e36a22b1/preview/20260909173809_5120.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b9f27ccf8994f14065a10e6052f0fdfa0910928a/preview/20260909173816_2817.jpg", "label": "No.8 洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b889586e780fd0c08d384f7ffecde05e32581710/preview/20260909153315_3018.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c9a88fae465e6005a899a7e4d227d30d3f7de651/preview/20260909153324_2067.jpg", "label": "No.9 洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@28c6850a9882ebdaab05218ac18e97f43321496c/preview/20260909153407_0971.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a47d97e7496ed44647e5ebfd503f939c7c071d9f/preview/20260909153415_5799.jpg", "label": "No.10 洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1},
  {"pattern": "yoshokuopblur", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bbaf6eafd645079f1e969527bad49e8352595c50/preview/20260909184629_1084.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@dd308bdc38b76cd84f9bb5f90d9d27453ed66cd4/preview/20260909184631_6710.jpg", "label": "OP/CLOSE案1・ぼかし写真（約8秒）", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokuopmortar", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@74771dd20fb2c90a28bcd103be0cf26d1a227ba0/preview/20260909184710_2417.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@45a71d9af443c9dbd000282380643584ddb3c4f0/preview/20260909184711_9240.jpg", "label": "OP/CLOSE案2・モルタル壁（約8秒）", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokuopwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8926b96e1429a3f627cf263203562568cb5bffcb/preview/20260909184746_9601.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@091840cfc840efde467cbbad818a9d8d3e728f68/preview/20260909184747_8301.jpg", "label": "OP/CLOSE案3・ボルドー（約8秒）", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuop4", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@74861a128f3ac6cd85733d0f5408249484d539b5/preview/20260909184827_5295.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b9a7e4dec043f994688732335f23fc014ed1638c/preview/20260909184828_1142.jpg", "label": "OP/CLOSE案4・シネマの幕（約8秒）", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuop5", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f3545b05d15321947d5273fe65a96874d6ef9972/preview/20260909184922_8908.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@42552b61922f7510b4389d48362e1b2dbad136ee/preview/20260909184923_8330.jpg", "label": "OP/CLOSE案5・一皿から引く（約8秒）", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokuop6", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@69180a1e81d72db1116f8257e7a4c40f2c91eb68/preview/20260909185011_1981.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@00c2f4c3695c31593dec74c2a305a421f3a321cb/preview/20260909185012_0355.jpg", "label": "OP/CLOSE案6・ネオンが灯る（約8秒）", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokuop7", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@43b8aedfab7c8cc28dff87cac81a7a7f9c386a57/preview/20260909185047_7776.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ebdcc5b5366ab5386f3ad7472c68043c9fa99986/preview/20260909185048_2484.jpg", "label": "OP/CLOSE案7・金の円環（約8秒）", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokuop8", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@06f33df618bbfbd3928ca3286266bbb5e14ad4c4/preview/20260909185126_1266.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5fdddc7c8bfbe3a9e2ec7c3a2e514d2761828c55/preview/20260909185128_3916.jpg", "label": "OP/CLOSE案8・タイポが集まる（約8秒）", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuop9", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@60609adc9b93331d15967ba3313964e844867616/preview/20260909185202_2858.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ba32c7da8ab69f96e5a8f5279fc8e97139a84f7a/preview/20260909185203_9270.jpg", "label": "OP/CLOSE案9・雑誌の表紙/裏表紙（約8秒）", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokufeeda", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e7ebdecfcd18318489a23dbcba13c54502aa4dc2/preview/20260909175247_9699.jpg", "label": "フィード案A・フルブリード×ボトム暗幕(定番)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedb", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d6a616e406e4dde988f6e6ef61cdd14cd32d952a/preview/20260909175256_0206.jpg", "label": "フィード案B・ボトムバンド・エディトリアル", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedc", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f6959f22e86b122fa6287aaee763897c90a4087b/preview/20260909175304_4037.jpg", "label": "フィード案C・雑誌エディトリアル(下地なし)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c048418015f85e572b169eada6d7499b93e14945/preview/20260909175312_7126.jpg", "label": "フィード案E・サイドレール(テラコッタ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@01e9257aa3787d15f6dddaeda436e1658f748fb4/preview/20260909175320_2573.jpg", "label": "フィード案E2・サイドレール(オリーブ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ad95c082fc53df56b7e049c40e239b484210ee2f/preview/20260909175329_9063.jpg", "label": "フィード案E3・サイドレール(ゴールド帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
];
