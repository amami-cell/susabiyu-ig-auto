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
// 動画バッチ更新(run#16)：OP/CLOSEをゆっくりクロスフェード／No.1・3ロゴ拡大／No.2ロゴ常時表示／
// No.4説明文大／No.5・7を引き(ぼかし+contain)／No.6を左右2分割スライド／No.8タッチパネル風／
// No.9は6品＆明転改善／No.10のMEAT BAR削除。
// フィード画像A〜H3(run#9)：Gを明るく／H系を切り抜き風3案(パーチメント角丸・丸皿・角丸ステッカー)に刷新。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d4651bcbce592c9c747fd64c7f669626a5bcf902/preview/20260907180527_2346.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c6e47af3e2db164a691b10200d7fbec91c720b21/preview/20260907180536_7593.jpg", "label": "No.1 洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@33be381637ff8bc59bf4fb2413d8379b0bcee6a1/preview/20260907180636_3841.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d197faf15ef091002f094dacb823248df0f6526e/preview/20260907180645_0934.jpg", "label": "No.2 洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@31ecc4cb8eb7a691b112c44b4d1a47e55b3563e4/preview/20260907180809_5953.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3131b700fda688df40a3d9c9e94b874036442234/preview/20260907180819_5167.jpg", "label": "No.3 洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1024a15ba991aff815fd171c0d48b8592b805948/preview/20260907180929_0206.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@207062505110684eb40d0610c6d2c8b12c16c99e/preview/20260907180938_1957.jpg", "label": "No.4 洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a25d040ee1ea8fd788ed66ab41ab7022136ec5c4/preview/20260907181144_6592.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d39afdffd8dfa9c2811ee669547d290ec4f289bd/preview/20260907181154_5318.jpg", "label": "No.5 洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2cf4fd30a197b0493e2c6fe8aea6ede1b08056ec/preview/20260907181236_4882.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@aff46b95498443a02f7c25a5d4ceed0a6259adc0/preview/20260907181245_3609.jpg", "label": "No.6 洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4f06aaab40d29c1396fc3e4d0c36af9566b66002/preview/20260907181417_2931.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c59949fe694419d27f9a237ba41abe8b39862403/preview/20260907181427_0450.jpg", "label": "No.7 洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9961d816cdae4cc0c372d1ac576efca07decec18/preview/20260907181505_1210.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4a031bd6963bc76a2f00990f8490ecd98c21197a/preview/20260907181514_3198.jpg", "label": "No.8 洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@badd5ac2a7ee334059f48854e3f5e9269abd85ab/preview/20260907181629_7410.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@df72f70fec65f1c244ec7983d6cdc1e88ca58bd8/preview/20260907181639_7468.jpg", "label": "No.9 洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d5e4bf3c5325c8009fd66076c042865d3bf9e812/preview/20260907181723_7911.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b57b31a6b7da22b6cc92b7de9418b8b89806bd63/preview/20260907181732_7484.jpg", "label": "No.10 洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1},
  {"pattern": "yoshokufeeda", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@56ab779984a1f1a1bce6ea2bb91ba5a2c631c5ab/preview/20260908193818_8598.jpg", "label": "フィード案A・フルブリード×ボトム暗幕(定番)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedb", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7fed689e2a973bfa8a52b6f51ddc2a6ec8390d4a/preview/20260908193826_8035.jpg", "label": "フィード案B・ボトムバンド・エディトリアル", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedc", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@caac82a26ee80aed2964690db24c312f56edb0c7/preview/20260908193836_5646.jpg", "label": "フィード案C・カラースラブ分割(テラコッタ面)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedd", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8af547aab940e44bae302eb5391e6ad3da831ea4/preview/20260908193844_8955.jpg", "label": "フィード案D・縦組み特大明朝", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@157849ffdac4466a8a2f099c6e2d9d7ca29b1d8f/preview/20260908193853_8532.jpg", "label": "フィード案E・サイドレール(テラコッタ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e009848d6346f9c6ea5d21eb8906114fac649cd9/preview/20260908193902_6339.jpg", "label": "フィード案E2・サイドレール(オリーブ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0823a18c4cd95ed048cea281bc47db548c467e04/preview/20260908193911_9609.jpg", "label": "フィード案E3・サイドレール(ゴールド帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedf", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@594bbef7f9106485f45153c3f82f5214de7329c8/preview/20260908193920_9365.jpg", "label": "フィード案F・テラコッタ帯(本日のおすすめ)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedg", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@134c05be40a117cc4e4eb756de7d604205b9f43c/preview/20260908193929_0960.jpg", "label": "フィード案G・マガジン・エディトリアル", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@094e4f68ce0d6820e762e9398db420ff8075e2e3/preview/20260908193937_6981.jpg", "label": "フィード案H・パーチメント×角丸カード(切り抜き風)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c447c0efa5ab57c55af45d39f5f285999063a04e/preview/20260908193946_8184.jpg", "label": "フィード案H2・丸皿カット(正円・テラコッタ地)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3e63e9fe3846febf2d1f79e026d0e98cbb648606/preview/20260908193954_2482.jpg", "label": "フィード案H3・角丸ステッカー×ハーフ地", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1}
];
