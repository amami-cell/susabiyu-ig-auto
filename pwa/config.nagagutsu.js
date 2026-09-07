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
// 動画バッチ更新：No.1〜4にオープニング＋エンドロール／No.6中央をブーツ丸ロゴ＋重なり解消／
// No.8ポラロイドの商品名重なり解消／全テンプレ料理名を大型化＋承認済み改行＋イタリア語サブ（run#13/#14）。
// フィード画像A〜Hを全面刷新（プロ3視点監査反映：極太明朝＋料理フルブリード＋テラコッタのベタ面1焦点＋
// 欧文サブ＋グリッド安全帯／list-cats run#7）。“スクロールが止まる”1枚絵を狙った新デザイン一式。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@41e3ce4a7e89752abcbe6c2d33f71f5d7754bdde/preview/20260906205250_8196.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@977799c3b2fc109e0c3ad39e8f936fea1566a8d9/preview/20260906205259_1924.jpg", "label": "No.1 洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@103315b84fb9b09b2a83a2428f7277c854c26962/preview/20260906205355_1813.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9b4096cc20087d72beac822d6022afd54e47359c/preview/20260906205404_0321.jpg", "label": "No.2 洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bf2fadfa11da72b8aa9e28dc556ca23bca8acef5/preview/20260906205523_8828.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b480335fab7616bae99db5bd18b491bb53683da9/preview/20260906205532_6223.jpg", "label": "No.3 洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8c899b00469c1d2e8ce75b0bf78489faf4e80821/preview/20260906205637_4375.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9bc007ea73d6f97a5115caf3b30cf042d5e367d3/preview/20260906205646_0049.jpg", "label": "No.4 洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4aa4edb5981b79289fedc411dc0c3e8242abee5c/preview/20260906202720_8904.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0cf4c61507fd9b45290b268736eb487ccca37b72/preview/20260906202727_9781.jpg", "label": "No.5 洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c53de4d12fd99fd1506cb531b884dd821c25bd18/preview/20260906202759_5038.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e05f9deb379a35ff9ad93a0b4640fc6062edab43/preview/20260906202807_6802.jpg", "label": "No.6 洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@63d35d49c3f10eff7041469f5123b0a63ea658b1/preview/20260906202848_8058.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@aafe5707c2e1cae4559b92f277a6b6b007ff2565/preview/20260906202856_5477.jpg", "label": "No.7 洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6c171e90b5508c26548d769e3a1e0a69e7bb585d/preview/20260906202932_0712.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1695cce45b9fdc3f580b67a90fef20334be510c2/preview/20260906202939_0264.jpg", "label": "No.8 洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1514b812bcdc3d276df12a15624f76cbbe3e9762/preview/20260906203034_3708.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e0fc694688477dd6514687817a945058ff4a8019/preview/20260906203041_3030.jpg", "label": "No.9 洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4265d5b24f2fc9f7e2620f319cb1f833540e027b/preview/20260906203115_5287.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3d5b5ec93cb0b3a714dadd4ce21984eff2f156f3/preview/20260906203122_3524.jpg", "label": "No.10 洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1},
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
