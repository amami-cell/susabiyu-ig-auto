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
// 動画バッチ更新(run#17)：OP/CLOSEをゆっくりクロスフェード＋OP/CLOSEにも音楽／No.1・3ロゴ拡大／
// No.2ロゴを1品目から常時表示／No.4説明文大／No.5・7をさらに引き(ぼかし+contain縮小、Cineは細レターボックス)／
// No.6を左右2分割スライド／No.8タッチパネル風／No.9は6品＆明転改善／No.10のMEAT BAR削除。
// フィード画像A〜H3(run#10)：左上ロゴを角ぎりぎり＋拡大／Cは余白解消・料理名1行／Dは右寄せ半分割＋暖色パネル／
// Gを明るく／H系は切り抜き風3案(パーチメント角丸・丸皿・角丸ステッカー)。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bc74d20ace6a439176e048a37aa801142aca398e/preview/20260908194023_9304.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bf51ffd616fe9328a261f944e24c60d1d3e91a97/preview/20260908194035_4376.jpg", "label": "No.1 洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@feebadcc2cccba6335a7367d4b5441fc237033b0/preview/20260908194133_4006.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0375a94e0cefd7690d682ca62d430eb0d8e39708/preview/20260908194141_9957.jpg", "label": "No.2 洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4a1c7f2ffaf2c0b42d0adf421ba5ae52367b5740/preview/20260908194303_2095.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f606235d5290461be818ddeecf2ace77f3fbed75/preview/20260908194312_5999.jpg", "label": "No.3 洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ca655136e93713c072e9300add67adfc7938a410/preview/20260908194420_1686.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0b7e327566301e3fbb51e6c65ea3d050143483b6/preview/20260908194428_4931.jpg", "label": "No.4 洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b4e7a2a337f629e26aaab68cd6ef1d5db18dff99/preview/20260908194629_3427.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9f4d52075983da8db85e0d20939e2670c5d2b59f/preview/20260908194637_2017.jpg", "label": "No.5 洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4281f52f9c58a3c922b442b5cb7703f2e3e0571b/preview/20260908194719_0667.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@56ccee1315e7b3f9434a2ca9fb7a859dbae93551/preview/20260908194728_2929.jpg", "label": "No.6 洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b99544fce804e844bdcf9796a25ffe193a920c58/preview/20260908194857_3528.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0a0dc35e084cd025fe77e1e633159af91f5f67fc/preview/20260908194906_8991.jpg", "label": "No.7 洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b97415ab8f2260b52e3ff660746dd87055a41c1e/preview/20260908194942_6749.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bdf1ef017036657cd27b79cf0e1e9795f834ca30/preview/20260908194951_1118.jpg", "label": "No.8 洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e2931d99274784f4deb60c7bfe307d6fbe651e5c/preview/20260908195103_8267.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@509f6b4cdf2c32af278e7486f09f9d4da56537ec/preview/20260908195114_6743.jpg", "label": "No.9 洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f3e90a79bfb53cf6ac246ebd8dc53fbe19958677/preview/20260908195156_2653.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1a66fcd4bbb591ef2451e3d9430b9d6bd545c95a/preview/20260908195205_9455.jpg", "label": "No.10 洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1},
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
