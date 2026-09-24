// 鮨処すさび湯（京都・四条烏丸／寿司・日本料理）確認アプリ 設定
// ------------------------------------------------------------------
// 共有アプリ(app.js)が参照するグローバル名は window.GIFUYA（＝汎用の店舗設定スロット）。
// 本ファイルは鮨処すさび湯用の値を入れる。karasuma.html / karasuma_reels.html のみが読み込む。
// GAS_URL は多店舗共有GAS(/exec)。予約は ACCOUNT="karasuma" でJ列に書かれ、
//   予約投稿エンジンが鮨処すさび湯のIGへ振り分ける。
// MEDIA_BASE は deploy_pwa.yml が R2_PUBLIC_BASE を注入（未注入なら見本枠は空）。
// 見本は wamodan（和モダン）テーマ＋店ロゴで焼いた洋食おしゃれテンプレ（BGMは店の和BGM）。
// ------------------------------------------------------------------
window.GIFUYA = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbxKn_MUfPgJ0nA8LJPp6YGb2Jehp9G8CpckV5bOAhe3M53eBC3Kle3O3Bf7mFzUJ2TMQw/exec",
  MEDIA_BASE: "PASTE_MEDIA_BASE_HERE",
  STORE_NAME: "鮨処すさび湯",
  HANDLE: "@susabiyu_kyoto",
  ACCOUNT: "karasuma",                          // 予約投稿タブ J列/AcctTokens と一致させる内部ID
  POLL_MS: 4000,
  // Web Push 公開鍵（三条と同じ鍵を共用。専用鍵ができたら差し替え）
  VAPID_PUBLIC: "BFDIPEHslhSqZlE4QooHXikxgv-25YJEDmESsYVxLXFnrmPWLO8aQGoVFYTUWO5nn_QpkUAiCtb1QZprcMCNIuc"
};
// 実データ連携が有効か（GAS_URL が実物URLか）を判定するフラグ。
window.GIFUYA_LIVE = /^https:\/\//.test((window.GIFUYA.GAS_URL || "").trim());

// 見本ギャラリー（鮨処すさび湯 専用）。和モダン7種（OPは各テンプレ別々・暗い地OPは屋号ハローで
// ロゴをくっきり）＋ 定番7種の和モダン版。全て写真主役・文字だけ無し。※洋食/他店には影響しない設計。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokutatewa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a7f88a02d22d8d354b882b7d5517fb49d27bb5f9/preview/20260924221724_6793.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@764c7d8741195437ecd4329a2a5577a8aa1e75bf/preview/20260924221727_9592.jpg", "label": "和① 縦書き大明朝", "caption": "町家で、静かに一献。", "music": "あじさい茶屋", "enabled": 1},
  {"pattern": "yoshokumagwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@cc7fa4aa037174271be9ba014248ae31778f81c3/preview/20260924203018_1850.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f0a4c96cd41c1568115324e5307419a5de61578b/preview/20260924203020_2877.jpg", "label": "和② スタイリッシュ雑誌", "caption": "旬を、ひと貫。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokuhitowa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@fa070952756b9e7147865e76b2bb1ce6fdfa658c/preview/20260924203205_7587.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@75e2c773e921a672ab5f554dd55f5e36a2e33d1c/preview/20260924203207_6111.jpg", "label": "和③ 本日の一皿", "caption": "京の粋を、ひと皿に。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokusumiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6cdf8d878f1197df816dd545dae93fc46f678ceb/preview/20260924221851_0365.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@23cc9dd6fc2b5af30bf0c680cbdad4e08d85ce75/preview/20260924221854_3555.jpg", "label": "和④ 水墨", "caption": "いい夜の、はじまり。", "music": "祭りビート", "enabled": 1},
  {"pattern": "yoshokukinsujiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@50f69a012dd576185b5d64c1cb43ffa9fd6240b4/preview/20260924203554_8510.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@29603a8a367b0132ef68cda10eced0a8ea3d755e/preview/20260924203557_4097.jpg", "label": "和⑤ 金箔ひとすじ", "caption": "〜京町家で、旬の鮨と和食を〜", "music": "祭りヤグラ", "enabled": 1},
  {"pattern": "yoshokuhakuwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7e705317553b5adb372005e05b90835069a79836/preview/20260924203735_7877.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@89e1bcd470e580170fc9d50e71ee9218b053eeb9/preview/20260924203737_9479.jpg", "label": "和⑥ 箔押し", "caption": "四条烏丸、京の夜。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuichiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0eb62266fd1a16f237ed85b4dde083a54641ece8/preview/20260924221955_8311.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bfa60e2a8b4297a8cf31c4f8c2248e4753b71746/preview/20260924221959_3380.jpg", "label": "和⑦ 一行", "caption": "職人の、手しごと。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@19a8f0dfa837fef8bb5997b31f029653d0458ab9/preview/20260924204233_7417.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ac99031d39c152bea1e25761af85ec5eff2aee74/preview/20260924204236_0713.jpg", "label": "定番⑧ 本日の一皿", "caption": "今宵は、鮨と。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bdf0f7725a3e5009a6d435b5b9679dae1e84b57a/preview/20260924204532_1476.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6b12aec4388c252b3655c84046fcdb929758c6e4/preview/20260924204536_9451.jpg", "label": "定番⑨ 鉄板シズル", "caption": "町家で、静かに一献。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8074913205f6d5e943e624808958e75524e20805/preview/20260924204742_6316.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@681354620d8fba824e7b6cd3c187424790f31622/preview/20260924204745_9890.jpg", "label": "定番⑩ シネマ", "caption": "握りたてを、どうぞ。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0c3d9a59c53a475b25ef75d51c696fda4200a560/preview/20260924222117_1393.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bfefa4408b0865c0abbe7ad31cd03ecd6d14cb6d/preview/20260924222120_8544.jpg", "label": "定番⑪ ワインと共に", "caption": "上質を、気軽に。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8f98bf5a27f52f4daf5b9e95163ea2c69a248386/preview/20260924205154_8332.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a2587256042375b5a0b85ccf1a2f8e9fb3abbe23/preview/20260924205156_1626.jpg", "label": "定番⑫ おすすめ3品", "caption": "日常に、ひと皿の贅沢。", "music": "津軽三味線独奏貝殻節 (1)", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ad30f7cbf8a3d82a724fb4fb596dc71bb354fd4e/preview/20260924205239_1824.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@eb313f4819a279b2431db7dae4d142e1c58c50bd/preview/20260924205241_0107.jpg", "label": "定番⑬ ポラロイド重ね", "caption": "職人の、手しごと。", "music": "祭りビート", "enabled": 1},
  {"pattern": "yoshokumagazine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ee5eedb1d7cb385400b2525f3d2e58c7501d280f/preview/20260924205535_0972.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@fab59e125b23e74944ba926d8a7b0060a0e122c8/preview/20260924205538_9204.jpg", "label": "定番⑮ 雑誌ストーリー", "caption": "旬を、ひと貫。", "music": "銭湯に行こう (1)", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0a4baf23ce7965e9ec0f16e3a169b0774805cb8f/preview/20260924205400_1128.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a932dde020261f5c92f6a6e24ad77902e96e1c54/preview/20260924205403_4814.jpg", "label": "定番⑭ 雑誌エディトリアル", "caption": "京の粋を、ひと皿に。", "music": "宵風灯路", "enabled": 1}
];
