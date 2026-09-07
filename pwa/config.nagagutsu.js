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
  {"pattern": "yoshokufeeda", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bb578ea05f041368c497752886e3e88aae4694b3/preview/20260907173915_8807.jpg", "label": "フィード案A・フルブリード×ボトム暗幕(定番)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedb", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d6f4bd36bf0e493b1780b9d9fde4f8e84c352b14/preview/20260907173921_6545.jpg", "label": "フィード案B・ボトムバンド・エディトリアル", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedc", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f4f527aae921869ff6b6320a11bd98e986891351/preview/20260907173928_6744.jpg", "label": "フィード案C・カラースラブ分割(テラコッタ面)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedd", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2c2626f816001097c7a0647e722fe92e147a87f1/preview/20260907173934_8686.jpg", "label": "フィード案D・縦組み特大明朝", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ded07767cadb3c90e0db503af11b903ecbf55807/preview/20260907173941_3729.jpg", "label": "フィード案E・サイドレール(テラコッタ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b364c37f6fa9f483f5faf6a25170246a2383f896/preview/20260907173947_0988.jpg", "label": "フィード案E2・サイドレール(オリーブ帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeede3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c9b152ba2134a6682e6c0a42b8dcf6d7201f2fba/preview/20260907173954_2071.jpg", "label": "フィード案E3・サイドレール(ゴールド帯)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedf", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a77e10c397fe5cd0d45bfd674887bb8db70ec249/preview/20260907174000_0074.jpg", "label": "フィード案F・テラコッタ帯(本日のおすすめ)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedg", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7994ee4f15fdc01b948f97f66e1b1abb42a4b741/preview/20260907174007_8511.jpg", "label": "フィード案G・マガジン・エディトリアル", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@93d0a159d3cd28e7ec580e0bdde66942dcc210a2/preview/20260907174014_9196.jpg", "label": "フィード案H・パーチメント×角丸カード(切り抜き風)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh2", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@56b968ba3ca517c748dfcfadf14721c0572c1b50/preview/20260907174021_6596.jpg", "label": "フィード案H2・丸皿カット(正円・テラコッタ地)", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1},
  {"pattern": "yoshokufeedh3", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9c3b8989d303a68a94fd699f3801f0218bea4b5d/preview/20260907174031_5978.jpg", "label": "フィード案H3・角丸ステッカー×ハーフ地", "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1}
];
