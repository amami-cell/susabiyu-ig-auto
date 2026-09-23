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
  {"pattern": "yoshokutatewa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@712a4ebf29f6411621aafefc53d06b9cced9b332/preview/20260923181123_8731.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f713d596d2470c230c199c25049878ba6167924a/preview/20260923181126_7751.jpg", "label": "和① 縦書き大明朝", "caption": "町家で、静かに一献。", "music": "あじさい茶屋", "enabled": 1},
  {"pattern": "yoshokumagwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3e7e029d1ff0497baceccf82e7439c636812b8e3/preview/20260923181242_3786.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6c4a20f2b2b979d903760156c22f550f7b0ba66e/preview/20260923181245_3721.jpg", "label": "和② スタイリッシュ雑誌", "caption": "旬を、ひと貫。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokuhitowa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6ea517ee866f34183f06e391b5878ccf478c44bb/preview/20260923181415_0161.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0f6531e014b154faa7a72e1ff9409737461b818a/preview/20260923181418_4717.jpg", "label": "和③ 本日の一皿・落款", "caption": "京の粋を、ひと皿に。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b3f88563b788effd0d55ffddf5096981ba90adb9/preview/20260923181733_5902.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@00ed7c35ec88f6ce83374dc3826994790f37b656/preview/20260923181735_6904.jpg", "label": "④ 本日の一皿", "caption": "今宵は、鮨と。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@3a6ece656d481b290944847889bc8681ff0fe393/preview/20260923182029_8315.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5f4a6fa4b8a48b8f71cd4bbf39b12a1975ca337d/preview/20260923182034_9048.jpg", "label": "⑤ 炙りシズル", "caption": "町家で、静かに一献。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d5c8143b78ef2f9775eca3e2512fb03fe6fa67a2/preview/20260923182239_0912.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bf70ad7b774017eb3829664364aa930cc3d6c736/preview/20260923182242_6019.jpg", "label": "⑥ シネマ", "caption": "握りたてを、どうぞ。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@430ef21d95a92e6576a6037f630fd21a7d94516d/preview/20260923182501_9082.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d4474befb5aed7ccfe94d4b87b2625d7e4464f76/preview/20260923182503_2453.jpg", "label": "⑦ 一献と共に", "caption": "上質を、気軽に。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@57f97dd2671bcc4a362d5db01b845d01a66c2f2a/preview/20260923182655_8689.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@51abfca857b8cc627d555ef1ae9af0b2d7b0a1ae/preview/20260923182658_6738.jpg", "label": "⑧ おすすめ3品", "caption": "日常に、ひと皿の贅沢。", "music": "津軽三味線独奏貝殻節 (1)", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@03201c1d8a682f60f26fe34953fcf9ff7f7781d6/preview/20260923182742_0045.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@eaa18d5e53031a7a957a96882261fd76d8fccdda/preview/20260923182745_8966.jpg", "label": "⑨ ポラロイド重ね", "caption": "職人の、手しごと。", "music": "祭りビート", "enabled": 1}
];
