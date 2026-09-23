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

// 見本ギャラリー（和モダン意匠でストーリーテンプレを焼いたもの・第1弾11本）。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokutatewa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6a62b768013ae37595c14b18ef5e761533be6209/preview/20260923195038_7651.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d91e206adfba3224c1463f44c1ec191394d432fb/preview/20260923195041_5414.jpg", "label": "和① 縦書き大明朝", "caption": "町家で、静かに一献。", "music": "あじさい茶屋", "enabled": 1},
  {"pattern": "yoshokumagwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3e7e029d1ff0497baceccf82e7439c636812b8e3/preview/20260923181242_3786.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6c4a20f2b2b979d903760156c22f550f7b0ba66e/preview/20260923181245_3721.jpg", "label": "和② スタイリッシュ雑誌", "caption": "旬を、ひと貫。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokuhitowa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c398c08175555126a581352df2b78112c367ce76/preview/20260923195212_8640.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5c541bed14dca3ac1e1c44ff85a0a4ea336ce43f/preview/20260923195214_4250.jpg", "label": "和③ 本日の一皿・落款", "caption": "京の粋を、ひと皿に。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b3f88563b788effd0d55ffddf5096981ba90adb9/preview/20260923181733_5902.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@00ed7c35ec88f6ce83374dc3826994790f37b656/preview/20260923181735_6904.jpg", "label": "④ 本日の一皿", "caption": "今宵は、鮨と。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3a6ece656d481b290944847889bc8681ff0fe393/preview/20260923182029_8315.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5f4a6fa4b8a48b8f71cd4bbf39b12a1975ca337d/preview/20260923182034_9048.jpg", "label": "⑤ 炙りシズル", "caption": "町家で、静かに一献。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d5c8143b78ef2f9775eca3e2512fb03fe6fa67a2/preview/20260923182239_0912.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bf70ad7b774017eb3829664364aa930cc3d6c736/preview/20260923182242_6019.jpg", "label": "⑥ シネマ", "caption": "握りたてを、どうぞ。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e581cd4007097744a714784e195ff7a87339e52a/preview/20260923195433_8268.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@58f8662f0abafabecb440ee8c1aed4f5fbfd637e/preview/20260923195436_0993.jpg", "label": "⑦ 一献と共に", "caption": "上質を、気軽に。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3e8f0c2c5081decf949c85da1f31ca80123658f2/preview/20260923195628_9195.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f0d952006ee89f4b4d6d57b183db39af0b3f80e1/preview/20260923195631_1032.jpg", "label": "⑧ おすすめ3品", "caption": "日常に、ひと皿の贅沢。", "music": "津軽三味線独奏貝殻節 (1)", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@03201c1d8a682f60f26fe34953fcf9ff7f7781d6/preview/20260923182742_0045.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@eaa18d5e53031a7a957a96882261fd76d8fccdda/preview/20260923182745_8966.jpg", "label": "⑨ ポラロイド重ね", "caption": "職人の、手しごと。", "music": "祭りビート", "enabled": 1}
];
