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
// こまつ原の実写真＋こまつ原ロゴで焼いた本番見本（samples.yml account=komatsubara で生成、
//   パターン_komatsubara タブ由来）。文言(label/caption/music)は既存を流用。
//   焼き直す時は samples.yml を account=komatsubara で再実行し、ここのurl/posterを差し替える。
window.GIFUYA.SAMPLES = [
  {"pattern": "taishuhito", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0a74fdd9958643fb0b3c48ee3f60ef120da370a3/preview/20261126210512_7028.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c5ac25df206f9840f181302e5c994b7971b57eef/preview/20261126210510_9962.jpg", "label": "大衆・本日の一皿", "caption": "今夜は、肉。", "music": "1990", "enabled": 1},
  {"pattern": "taishushun", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a881c52b39f040c3fa05423aa7ac5b87eecff389/preview/20261126210330_5101.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3461eacf640093e10f602c989ec759af1329d61a/preview/20261126210325_7507.jpg", "label": "大衆・季節の旬", "caption": "この一皿に乾杯を。", "music": "BGM火祭り　39秒～", "enabled": 1},
  {"pattern": "taishunoren", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8faddf86b6c1a057b648fab2c4aaf053f58de4c4/preview/20261126210146_2253.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7c2d1ae7f665a42c0441b8767541ff9e99b30393/preview/20261126210144_4449.jpg", "label": "大衆・暖簾くぐり", "caption": "肉と、赤と、いい夜と。", "music": "Festival!", "enabled": 1},
  {"pattern": "taishutanzaku", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7d08df73bce1ae90bb64831290ea1f820ba09e3d/preview/20261126210002_4462.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4fc7277cd2fb241161a41fb2f0afa614994459bc/preview/20261126210000_8480.jpg", "label": "大衆・壁の短冊", "caption": "旨いを、遠慮なく。", "music": "Melody_of_the_Festival", "enabled": 1},
  {"pattern": "oshinatate", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@cce4730420c07ea5bfd6e493f2517431eda40fee/preview/20261126205633_0314.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e597a5a83757f26e7b58fd7519a81d29fc939c18/preview/20261126205631_4832.jpg", "label": "お品書き(縦書き)", "caption": "腹ペコ、集合。", "music": "Prosit!", "enabled": 1},
  {"pattern": "noren", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b7879e625fc5fb5c27648e1ac5198ecf76d6e87b/preview/20261126205809_1732.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@adab1ce69a5bc7514e8fc9f3c230ae50f5507e3e/preview/20261126205807_2051.jpg", "label": "暖簾くぐり", "caption": "日常に、ひと皿の贅沢。", "music": "_美味しい！和食_", "enabled": 1}
];
