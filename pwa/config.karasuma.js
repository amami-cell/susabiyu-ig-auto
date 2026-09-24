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
  {"pattern": "yoshokutatewa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2604431b0b5ac9710d58558550a54fb1b9c59ecd/preview/20260924195318_2390.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6c740287f92d11474e913253d45d73a93d00c518/preview/20260924195321_0289.jpg", "label": "和① 縦書き大明朝", "caption": "町家で、静かに一献。", "music": "あじさい茶屋", "enabled": 1},
  {"pattern": "yoshokumagwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@db3d02ac3713d4c62f5e1bfad4b3b7ec460caa69/preview/20260924160051_4164.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@35e1ea8e67e5af9bebe83f0568c912158e7e8acb/preview/20260924160053_8777.jpg", "label": "和② スタイリッシュ雑誌", "caption": "旬を、ひと貫。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokuhitowa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5043a9bd02eefb298768b655d800782281c1ba92/preview/20260924192601_0279.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5574486314996770cbc5d6090028bdf2f8c8c74f/preview/20260924192604_4586.jpg", "label": "和③ 本日の一皿", "caption": "京の粋を、ひと皿に。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokusumiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bff73f80d8e864afbd46bd8a5a65ddaf1a40e352/preview/20260924181502_3770.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@aff951964c4cd7b0bfc6213664b85a3755fe3850/preview/20260924181504_0990.jpg", "label": "和④ 水墨", "caption": "いい夜の、はじまり。", "music": "祭りビート", "enabled": 1},
  {"pattern": "yoshokukinsujiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d9e1109982577d95c0c642a13775f6cff55eb01a/preview/20260924192736_7453.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@90928adbcd85a102129401a11b0655056fb3fa19/preview/20260924192738_1234.jpg", "label": "和⑤ 金箔ひとすじ", "caption": "〜京町家で、旬の鮨と和食を〜", "music": "祭りヤグラ", "enabled": 1},
  {"pattern": "yoshokuhakuwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bf71530703c91a73493d9218f8a9937e43098d5b/preview/20260924192915_5089.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e4a7de5da82e562acc26dda4d7b34877d2b75559/preview/20260924192919_1321.jpg", "label": "和⑥ 箔押し", "caption": "四条烏丸、京の夜。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuichiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@49fee9c97a068b02de6bf9961ddea3fccfbec3ed/preview/20260924193054_1356.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4a8e5c4f9cfb1ea1b326dbe041d6a4896ef72938/preview/20260924193057_8587.jpg", "label": "和⑦ 一行", "caption": "職人の、手しごと。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@220d7cbf06f1cced5b93b9a94604b6234163538e/preview/20260924182313_9951.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1154637dfc36bd6b055391238f48caaf15b2027f/preview/20260924182316_2904.jpg", "label": "定番⑧ 本日の一皿", "caption": "今宵は、鮨と。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9ced84379c551d446ebcbc5aa907bf42ceb97392/preview/20260924182613_0917.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7776c561254cd33f7356f21b9ff29129043374de/preview/20260924182616_4822.jpg", "label": "定番⑨ 鉄板シズル", "caption": "町家で、静かに一献。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7467b0c6e137e41f846f0f3c3f7636b6746a40de/preview/20260924182820_1881.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e38b184fcd7378eea7d6af0d55a7273fa5e75a4a/preview/20260924182822_2279.jpg", "label": "定番⑩ シネマ", "caption": "握りたてを、どうぞ。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2be405395363c062212c7096179ba5988abc732e/preview/20260924193304_9881.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f4f43e2d74257f613a796d4ac570a5261d7426f5/preview/20260924193309_3417.jpg", "label": "定番⑪ ワインと共に", "caption": "上質を、気軽に。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2ea7190a528907a07772fe9776c716b28e6a2158/preview/20260924183232_4275.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@dbf14d5d427ddbe0d25229421b22740ae760e112/preview/20260924183234_3600.jpg", "label": "定番⑫ おすすめ3品", "caption": "日常に、ひと皿の贅沢。", "music": "津軽三味線独奏貝殻節 (1)", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b6f7bc29482cf97002603902d5e8781260be1726/preview/20260924183317_2804.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5c4b69edd016d6148130ed9ad0386c0e9aebf841/preview/20260924183319_0699.jpg", "label": "定番⑬ ポラロイド重ね", "caption": "職人の、手しごと。", "music": "祭りビート", "enabled": 1},
  {"pattern": "yoshokumagazine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c0b6f17547ddc4e71a9fc1c79e732eb01ca4ced6/preview/20260924193434_4756.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@30a357a45e2c24f3e52650237d159dee823c362a/preview/20260924193436_4092.jpg", "label": "定番⑮ 雑誌ストーリー", "caption": "旬を、ひと貫。", "music": "銭湯に行こう (1)", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ae419dc0831c91bc204cb3041308d089145aa623/preview/20260924183438_1064.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a64ed25c4d2dab09b0744e14c87cb25723353517/preview/20260924183441_2962.jpg", "label": "定番⑭ 雑誌エディトリアル", "caption": "京の粋を、ひと皿に。", "music": "宵風灯路", "enabled": 1}
];
