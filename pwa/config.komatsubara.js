// 大衆食堂 こまつ原（大阪・梅田小松原／居酒屋・食堂・大衆酒場）確認アプリ 設定
// ------------------------------------------------------------------
// 共有アプリ(app.js)が参照するグローバル名は window.GIFUYA（＝汎用の店舗設定スロット）。
// 本ファイルはこまつ原用の値を入れる。komatsubara.html / komatsubara_reels.html のみが読み込む。
// GAS_URL は多店舗共有GAS(/exec)。予約は ACCOUNT="komatsubara" でJ列に書かれ、
//   予約投稿エンジンがこまつ原のIGへ振り分ける。
// MEDIA_BASE は deploy_pwa.yml が R2_PUBLIC_BASE を注入（未注入なら見本枠は空）。
// 見本ギャラリー(SAMPLES)はオープン後にDrive写真からレンダリングして充填する（現在は未投入＝空）。
// ------------------------------------------------------------------
window.GIFUYA = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbxKn_MUfPgJ0nA8LJPp6YGb2Jehp9G8CpckV5bOAhe3M53eBC3Kle3O3Bf7mFzUJ2TMQw/exec",
  MEDIA_BASE: "PASTE_MEDIA_BASE_HERE",
  STORE_NAME: "大衆食堂 こまつ原",
  HANDLE: "@taisyuusyokudo.komatsubara",
  ACCOUNT: "komatsubara",                       // 予約投稿タブ J列/AcctTokens と一致させる内部ID
  POLL_MS: 4000,
  // Web Push 公開鍵（三条と同じ鍵を共用。専用鍵ができたら差し替え）
  VAPID_PUBLIC: "BFDIPEHslhSqZlE4QooHXikxgv-25YJEDmESsYVxLXFnrmPWLO8aQGoVFYTUWO5nn_QpkUAiCtb1QZprcMCNIuc"
};
// 実データ連携が有効か（GAS_URL が実物URLか）を判定するフラグ。
window.GIFUYA_LIVE = /^https:\/\//.test((window.GIFUYA.GAS_URL || "").trim());

// 見本ギャラリー（こまつ原・和の大衆テンプレ）。
// ★暫定★：本番の料理写真が未投入のため、見た目確認用に「ぎふや天神の写真/BGMを仮で借りて」
//   和の大衆テンプレ(taishu系)を焼いたもの。文言・ラベルも仮。
//   こまつ原の実写真が入ったら yoshoku_samples で本番素材を焼き直し、ここを差し替える。
//   （stores.py の komatsubara のDriveフォルダを本来のID 1HyHZs6V… に戻すのも同時に行う）
window.GIFUYA.SAMPLES = [
  {"pattern": "taishuhito", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@192ac05de3a13e9f554747376c47f8c94d51c08a/preview/20261102173446_2125.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d9e6c65af5502a72c18820c319254c21593f8468/preview/20261102173451_3802.jpg", "label": "大衆・本日の一皿", "caption": "今夜は、肉。", "music": "1990", "enabled": 1},
  {"pattern": "taishushun", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0da92a56a2f0252b6335a6d0c70fb5e0a39a5977/preview/20261102173536_0794.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@060f315315a8e708b39715da358a1c9bbd2cc1b9/preview/20261102173540_8402.jpg", "label": "大衆・季節の旬", "caption": "この一皿に乾杯を。", "music": "BGM火祭り　39秒～", "enabled": 1},
  {"pattern": "taishunoren", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bc83c087356bb6423b9caf42b6b62b6ad4b5bc79/preview/20261102173625_5238.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@88681dcace5982aed1e28d26ddd48ce46785a096/preview/20261102173629_2216.jpg", "label": "大衆・暖簾くぐり", "caption": "肉と、赤と、いい夜と。", "music": "Festival!", "enabled": 1},
  {"pattern": "taishutanzaku", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3a737f9b3bfcb3e1c5ff036637ad0bd1daafc9fa/preview/20261102173853_3046.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bb5279ae4e3b91b9c6e8a19a46b9fb762fd4ecd7/preview/20261102173858_6760.jpg", "label": "大衆・壁の短冊", "caption": "旨いを、遠慮なく。", "music": "Melody_of_the_Festival", "enabled": 1},
  {"pattern": "oshinatate", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@70bca82ea311a455e301fbb686a4453735525ca0/preview/20261102173940_0214.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5bef166aa2759e223728c51c0de0031df6a2bccf/preview/20261102173944_9034.jpg", "label": "お品書き(縦書き)", "caption": "腹ペコ、集合。", "music": "Prosit!", "enabled": 1},
  {"pattern": "noren", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3f1f9e943072e71b2347e1f7ea934b2d610b6b69/preview/20261102174025_0308.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@295af67499c65860adf844106b53138e641da15e/preview/20261102174029_9353.jpg", "label": "暖簾くぐり", "caption": "日常に、ひと皿の贅沢。", "music": "_美味しい！和食_", "enabled": 1}
];
