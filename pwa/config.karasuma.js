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

// 見本ギャラリー（鮨処すさび湯 専用）。
//  和モダン7種（OPは各テンプレ別々）＋ 定番の写真主役6種の和モダン版。全て写真主役・文字だけ無し。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokutatewa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5d37ef523029e62cdf5ff9b1163f4239a1ff7d63/preview/20260924155933_2013.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@248e9f1e5dfc7496697987630b016e905df42aa1/preview/20260924155936_7600.jpg", "label": "和① 縦書き大明朝", "caption": "町家で、静かに一献。", "music": "あじさい茶屋", "enabled": 1},
  {"pattern": "yoshokumagwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@db3d02ac3713d4c62f5e1bfad4b3b7ec460caa69/preview/20260924160051_4164.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@35e1ea8e67e5af9bebe83f0568c912158e7e8acb/preview/20260924160053_8777.jpg", "label": "和② スタイリッシュ雑誌", "caption": "旬を、ひと貫。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokuhitowa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@42fba52c4848aa167317e15bbd32f8e7d2b93b07/preview/20260924160236_8194.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@87750d1c12d00c1c37fbc78ca6b6644660c04662/preview/20260924160239_5721.jpg", "label": "和③ 本日の一皿", "caption": "京の粋を、ひと皿に。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokusumiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2d4308d79eb9cc040f8163c9b3d258526001a67a/preview/20260924160448_4568.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@962611ff07359273207de6f36046c270eddd8125/preview/20260924160451_9036.jpg", "label": "和④ 水墨", "caption": "いい夜の、はじまり。", "music": "祭りビート", "enabled": 1},
  {"pattern": "yoshokukinsujiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d8e78738acbe3925ced7166c1507fae49e700236/preview/20260924160622_8201.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0dd4b59f55289cc124365023a883d7c95b755bb6/preview/20260924160625_4679.jpg", "label": "和⑤ 金箔ひとすじ", "caption": "〜京町家で、旬の鮨と和食を〜", "music": "祭りヤグラ", "enabled": 1},
  {"pattern": "yoshokuhakuwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@f84b846bf4cfc1e9f2423cfd8ee5e48d55dc076f/preview/20260924160802_6066.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a13ece63f759e28196e82ac0fbdf0858a00a5e2b/preview/20260924160805_3972.jpg", "label": "和⑥ 箔押し", "caption": "四条烏丸、京の夜。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuichiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9fadff90ec6fcbc99c850da0c308a510d8c479c9/preview/20260924160941_8384.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@503857ecb323cfd1245820948f2c6c4d260544e9/preview/20260924160945_6118.jpg", "label": "和⑦ 一行", "caption": "職人の、手しごと。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9ffb56ef0686fdee395de5f7c8d8107ba8cbd64c/preview/20260924161253_3728.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b37679e7faa648f9b0f8069319f5ecbddfb7dff8/preview/20260924161256_8015.jpg", "label": "定番⑧ 本日の一皿", "caption": "今宵は、鮨と。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@30a5e341e559c99e3023c71e2f56fa0b3d572c48/preview/20260924161549_6605.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9a49801d356782cb039b638ad55d83cee4b69a5f/preview/20260924161554_2686.jpg", "label": "定番⑨ 鉄板シズル", "caption": "町家で、静かに一献。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bfd09be4878eab539910ae57f4da709c771433a3/preview/20260924161757_7014.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c84e36da8a653c56022e76e48412738db8867547/preview/20260924161800_5894.jpg", "label": "定番⑩ シネマ", "caption": "握りたてを、どうぞ。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c32c82fc9d0a4834463bca6462bd1422a3da84e1/preview/20260924162011_6807.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b01f8a3bc0c562f2706f8db14794b99c1db5407c/preview/20260924162016_3859.jpg", "label": "定番⑪ ワインと共に", "caption": "上質を、気軽に。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5c71468a451710494d70ad45ffad8ea07c4c1aff/preview/20260924162204_0074.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@247ee9fa94642306920ccf1d295d69c4c5f827b6/preview/20260924162207_8771.jpg", "label": "定番⑫ おすすめ3品", "caption": "日常に、ひと皿の贅沢。", "music": "津軽三味線独奏貝殻節 (1)", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1634f6f512026b50625719ba43fb74f6002a065e/preview/20260924162249_1086.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@24833d4ffb349fe0a53265a1fe58a62541838ceb/preview/20260924162251_7272.jpg", "label": "定番⑬ ポラロイド重ね", "caption": "職人の、手しごと。", "music": "祭りビート", "enabled": 1}
];
