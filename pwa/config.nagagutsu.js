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
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@60a4ae0fdeee0473fe75249f7d45c405817612a5/preview/20260902211429_4998.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5ef02769d22b1f060500479cd35c58e2b99118c8/preview/20260902211438_0536.jpg", "label": "洋食おしゃれ・本日の一皿", "caption": "今夜は、肉。", "music": "1分23秒～　愛の傘下", "enabled": 1},
  {"pattern": "yoshokuchalk", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@da2dcaaf083776d445077a9e24cdcfa7429dc6d5/preview/20260902211525_9539.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@baef1a3a3df9d8f0cf561afa80ba4dd8f8e4133d/preview/20260902211533_6776.jpg", "label": "洋食おしゃれ・黒板トラットリア", "caption": "この一皿に乾杯を。", "music": "1分3秒～　Funky_droll_street", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@aeadcb282f09663b9e3e055f93362b0415cbd5d5/preview/20260902211651_6787.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a30251dbdd47f10bb425464865861152e5d8264b/preview/20260902211659_9800.jpg", "label": "洋食おしゃれ・鉄板ジュ〜っと", "caption": "肉と、赤と、いい夜と。", "music": "1分51秒～　Good_Evening_Sunset", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9ebe0830993003445adef1b20b0756fa5c16d4a4/preview/20260902211758_5697.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@baad10b75d86574abc85ed46ab473b7694af1c44/preview/20260902211806_5688.jpg", "label": "洋食おしゃれ・雑誌エディトリアル", "caption": "旨いを、遠慮なく。", "music": "20秒～　Cocktail_Glass", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c907dd1f301cfc8d975ca39211aae72253dac2ad/preview/20260902211915_6740.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9d9637ae744d936d723fc3abd2cfada11cd36e26/preview/20260902211923_0761.jpg", "label": "洋食おしゃれ・シネマ", "caption": "腹ペコ、集合。", "music": "26秒～　Just_the_Record", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@49b6bea182455580caa32a5c757a3f57442d1e85/preview/20260902212007_1677.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8bd3db3636aa55494faad61484c6145dc94d499b/preview/20260902212017_3048.jpg", "label": "洋食おしゃれ・ワインと共に", "caption": "日常に、ひと皿の贅沢。", "music": "49秒～　Somebody_(Prod._Khaim)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d2394bfbc3eb6178af45aa98ed3e922feebaa469/preview/20260902212113_0406.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c6eb559efa95f6e1535541866ccd6197ddee52d5/preview/20260902212121_0551.jpg", "label": "洋食おしゃれ・おすすめ3品", "caption": "〆まで、旨い。", "music": "49秒～　Take_Me_To_The_Top", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8555dff09a478334dfb321949896907b2a417464/preview/20260902212210_2684.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@cb62e50684130b2bc9500e16d1e5f1715a6bc619/preview/20260902212218_2100.jpg", "label": "洋食おしゃれ・ポラロイド重ね", "caption": "肉バルの、実力。", "music": "4秒～月の降る街", "enabled": 1},
  {"pattern": "yoshokutype", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e03c4ac438b5d1b288e096030e5b599898be21cf/preview/20260902212334_9800.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8b2ac36a5b0b443bbbacba21159b8502ad745405/preview/20260902212343_3445.jpg", "label": "洋食おしゃれ・大見出しタイポ", "caption": "いい夜の、はじまり。", "music": "French_Toast", "enabled": 1},
  {"pattern": "yoshokuopen", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8c6cb0c856b56128f3283da6405fc308c512d6a6/preview/20260902212431_6717.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1c09ab2017185acf57a3385bf0d1f0fcba3d4c84/preview/20260902212438_0075.jpg", "label": "洋食おしゃれ・本日OPEN案内", "caption": "〜コスパ良く日常に贅沢を〜", "music": "paving_walkway", "enabled": 1}
];
