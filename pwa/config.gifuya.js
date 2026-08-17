// ぎふや福岡天神 確認アプリ 設定（実稼働化の受け皿）
// ------------------------------------------------------------------
// GAS_URL: ぎふや専用GASウェブアプリの /exec URL。
//   実稼働化の際に GitHub Secrets「GIFUYA_GAS_EXEC_URL」を設定すると、
//   deploy_pwa.yml が下の PLACEHOLDER を実物URLへ自動置換する。
//   未設定のうちは PLACEHOLDER のまま＝アプリは「見本モード」で動作する。
// STORE_NAME / HANDLE: 画面表示用（実稼働後もそのまま）。
// ------------------------------------------------------------------
window.GIFUYA = {
  // 多店舗共有GAS（三条と同じ /exec）。予約は account="gifuyatenjin" でJ列に書かれ、
  // 予約投稿エンジン(post_reservations)がぎふやのIGへ振り分ける。地域タグは region で分離。
  // ※専用GASに切り替えたい場合はこのURLを差し替えるだけ。
  GAS_URL: "https://script.google.com/macros/s/AKfycbxKn_MUfPgJ0nA8LJPp6YGb2Jehp9G8CpckV5bOAhe3M53eBC3Kle3O3Bf7mFzUJ2TMQw/exec",
  MEDIA_BASE: "PASTE_MEDIA_BASE_HERE",
  STORE_NAME: "ぎふや 福岡天神店",
  HANDLE: "@gifuya_fukuokatenjin",
  ACCOUNT: "gifuyatenjin",                     // 予約投稿タブ J列/AcctTokens と一致させる内部ID
  POLL_MS: 4000,
  // Web Push 公開鍵。ぎふや専用の鍵を用意したらここへ（未設定なら三条と同じ鍵で可・通知は連携後）
  VAPID_PUBLIC: "BFDIPEHslhSqZlE4QooHXikxgv-25YJEDmESsYVxLXFnrmPWLO8aQGoVFYTUWO5nn_QpkUAiCtb1QZprcMCNIuc"
};
// 実データ連携が有効か（GAS_URL が実物URLに置換済みか）を判定するフラグ。
// 画面側はこのフラグが false の間は見本モードのまま安全に表示する。
window.GIFUYA_LIVE = /^https:\/\//.test((window.GIFUYA.GAS_URL || "").trim());

// 見本ギャラリー（ぎふや専用の動画/画像。共有app.jsが CFG.SAMPLES を静的表示＝端末内で採用/無しを選択）。
window.GIFUYA.SAMPLES = [
  {"pattern": "dv01", "url": "gifuya/dv_01.mp4?v=126", "poster": "gifuya/dv_01_poster.jpg?v=126", "label": "D1 本日の一皿", "enabled": 1},
  {"pattern": "dv03", "url": "gifuya/dv_03.mp4?v=126", "poster": "gifuya/dv_03_poster.jpg?v=126", "label": "D3 旬のおすすめ", "enabled": 1},
  {"pattern": "dv04", "url": "gifuya/dv_04.mp4?v=126", "poster": "gifuya/dv_04_poster.jpg?v=126", "label": "D4 赤暖簾くぐり", "enabled": 1},
  {"pattern": "dv05", "url": "gifuya/dv_05.mp4?v=126", "poster": "gifuya/dv_05_poster.jpg?v=126", "label": "D5 短冊・お品書き", "enabled": 1},
  {"pattern": "dv07", "url": "gifuya/dv_07.mp4?v=126", "poster": "gifuya/dv_07_poster.jpg?v=126", "label": "D7 暖簾くぐり", "enabled": 1},
  {"pattern": "dv08", "url": "gifuya/dv_08.mp4?v=126", "poster": "gifuya/dv_08_poster.jpg?v=126", "label": "D8 シンプル紹介", "enabled": 1},
  {"pattern": "dv09", "url": "gifuya/dv_09.mp4?v=126", "poster": "gifuya/dv_09_poster.jpg?v=126", "label": "D9 本日の一皿", "enabled": 1},
  {"pattern": "dv12", "url": "gifuya/dv_12.mp4?v=126", "poster": "gifuya/dv_12_poster.jpg?v=126", "label": "D12 旬のおすすめ", "enabled": 1},
  {"pattern": "dv14", "url": "gifuya/dv_14.mp4?v=126", "poster": "gifuya/dv_14_poster.jpg?v=126", "label": "D14 暖簾くぐり", "enabled": 1},
  {"pattern": "dv15", "url": "gifuya/dv_15.mp4?v=126", "poster": "gifuya/dv_15_poster.jpg?v=126", "label": "D15 お品書き（縦）", "enabled": 1},
  {"pattern": "sv01", "url": "gifuya/sv_01.mp4?v=126", "poster": "gifuya/sv_01_poster.jpg?v=126", "label": "S1 統一", "enabled": 0},
  {"pattern": "sv02", "url": "gifuya/sv_02.mp4?v=126", "poster": "gifuya/sv_02_poster.jpg?v=126", "label": "S2 巨大縦書き", "enabled": 0},
  {"pattern": "sv04", "url": "gifuya/sv_04.mp4?v=126", "poster": "gifuya/sv_04_poster.jpg?v=126", "label": "S4 にぎやか価格", "enabled": 0},
  {"pattern": "sv11", "url": "gifuya/sv_11.mp4?v=126", "poster": "gifuya/sv_11_poster.jpg?v=126", "label": "S11 雑誌風", "enabled": 0},
  {"pattern": "sv12", "url": "gifuya/sv_12.mp4?v=126", "poster": "gifuya/sv_12_poster.jpg?v=126", "label": "S12 本日のおすすめ", "enabled": 0},
  {"pattern": "fade", "url": "gifuya/fade.mp4?v=126", "poster": "gifuya/fade_poster.jpg?v=126", "label": "フェード見本", "enabled": 1},
  {"pattern": "feed01", "url": "gifuya/feed_01.jpg", "label": "1 元祖どぶ漬けどてかつ", "enabled": 1},
  {"pattern": "feed02", "url": "gifuya/feed_02.jpg", "label": "2 ぎふや厳選 串かつ10種盛り", "enabled": 1},
  {"pattern": "feed04", "url": "gifuya/feed_04.jpg", "label": "4 ぎふやの明太出汁巻き", "enabled": 1},
  {"pattern": "feed06", "url": "gifuya/feed_06.jpg", "label": "6 ぎふやの炊き餃子", "enabled": 1},
  {"pattern": "feed07", "url": "gifuya/feed_07.jpg", "label": "7 本家 牛串かつ", "enabled": 1},
  {"pattern": "feed08", "url": "gifuya/feed_08.jpg", "label": "8 自家製 鶏唐揚げ", "enabled": 1},
  {"pattern": "feed09", "url": "gifuya/feed_09.jpg", "label": "9 馬刺し", "enabled": 1},
  {"pattern": "feed10", "url": "gifuya/feed_10.jpg", "label": "10 和牛マルシンのたたき", "enabled": 1},
  {"pattern": "feed11", "url": "gifuya/feed_11.jpg", "label": "11 〆のラーメン", "enabled": 1},
  {"pattern": "feed12", "url": "gifuya/feed_12.jpg", "label": "12 生ハムポテト", "enabled": 1},
  {"pattern": "pattern_tanzaku", "url": "gifuya/pattern_tanzaku.jpg", "label": "短冊（メイン）", "enabled": 1},
  {"pattern": "pattern_bigname", "url": "gifuya/pattern_bigname.jpg", "label": "H 巨大縦書き", "enabled": 1},
];
