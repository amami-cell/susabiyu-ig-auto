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

// 見本ギャラリー（鮨処すさび湯 専用・和モダン意匠のストーリーテンプレ 全20種）。
// 全て写真主役・文字だけ無し・theme=wamodan。OP/CLOSEは誌面案(v9)。BGMは店の和BGM。
window.GIFUYA.SAMPLES = [
  {"pattern": "yoshokutatewa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0fdaa10ad360afed6bc52dae59a714af0333fd65/preview/20260924130633_6755.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9a16d22eba36d21dcce6c1f30c689e4ef41b6287/preview/20260924130636_2754.jpg", "label": "和① 縦書き大明朝", "caption": "町家で、静かに一献。", "music": "あじさい茶屋", "enabled": 1},
  {"pattern": "yoshokumagwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@358e38355b7d66b63d68e28b60708d05e8d9ef8d/preview/20260924130751_8740.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@43310ed7c131755baf1ae791af934902da1edbed/preview/20260924130754_5661.jpg", "label": "和② スタイリッシュ雑誌", "caption": "旬を、ひと貫。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokuhitowa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c715abd9a7559453c9a3ab84588292d2fe7fcf97/preview/20260924130921_2544.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ed11c2a3d0e1beb021822a044517a2942044b588/preview/20260924130923_5271.jpg", "label": "和③ 本日の一皿", "caption": "京の粋を、ひと皿に。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokumaruwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@fcf67491ef0e090064b83e88bb071701ccc4959f/preview/20260924131053_3937.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@dccaf88074ac25973f951f3bab87e63972fc05de/preview/20260924131056_5185.jpg", "label": "和④ 円窓", "caption": "握りたてを、どうぞ。", "music": "宵風灯路", "enabled": 1},
  {"pattern": "yoshokunorenwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2d5990cbf2b419e124d7a0da0c8d59c9696c1b22/preview/20260924131225_0994.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@66d901de42a168d284307e2d06b928f5b6fee423/preview/20260924131228_6211.jpg", "label": "和⑤ 暖簾くぐり", "caption": "上質を、気軽に。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokutsuiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@adcc68529a7717afc265d94d98d7ccd40b8913ea/preview/20260924131353_9830.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@ef9ec65c7872822c82e823307f843d3ed3db92d7/preview/20260924131356_9747.jpg", "label": "和⑥ 対二枚組", "caption": "四条烏丸、京の夜。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokutanzakuwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8a42b1fe74afaa72f7252e5f7a8f8f6d9cc76c67/preview/20260924131524_1849.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8100cf0a3cec4c1d1f32061de5b31ee0eb05dba2/preview/20260924131527_3104.jpg", "label": "和⑦ 短冊", "caption": "職人の、手しごと。", "music": "津軽三味線独奏貝殻節 (1)", "enabled": 1},
  {"pattern": "yoshokusumiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@438e95a04d91d557911e0eb9a87b71535573831d/preview/20260924131655_0119.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@02d4e10b8be2b0c8b1783e6977eb2e04406ac653/preview/20260924131657_4128.jpg", "label": "和⑧ 水墨", "caption": "いい夜の、はじまり。", "music": "祭りビート", "enabled": 1},
  {"pattern": "yoshokukinsujiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@bdda7fbb1ceed7b4fa0774f71e42d9b9256b23f1/preview/20260924131828_9335.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@dac0c209baeb656f73da1534e0d96f71ce5fb94a/preview/20260924131831_2870.jpg", "label": "和⑨ 金箔ひとすじ", "caption": "〜京町家で、旬の鮨と和食を〜", "music": "祭りヤグラ", "enabled": 1},
  {"pattern": "yoshokukintsugiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@04c3bf485724a9d3ef003c8c1758a421240800bd/preview/20260924132001_1075.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8047fa33fbd6d07928c8084efb41b0e3fe84b714/preview/20260924132004_4471.jpg", "label": "和⑩ 金継ぎ", "caption": "今宵は、鮨と。", "music": "花笠音頭 (1)", "enabled": 1},
  {"pattern": "yoshokumasuwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7f1a874df3ed30c6224be808d3bdd7b8a87181f7/preview/20260924132113_6734.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@de1e5c88e41d599bc9de3f620ff2b0a22ce466af/preview/20260924132115_9618.jpg", "label": "和⑪ 枡グリッド", "caption": "旬を、ひと貫。", "music": "銭湯に行こう (1)", "enabled": 1},
  {"pattern": "yoshokushojiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5d09a41610405fad1a96ece65e144a5c32621581/preview/20260924132247_5906.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@06d63032e176da56f7232e745741c13068cfe94e/preview/20260924132250_5714.jpg", "label": "和⑫ 障子越し", "caption": "町家で、静かに一献。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokujubakowa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@606083462e67cd4aec3a3af0ca7ee1d6ad409e23/preview/20260924132401_0381.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e0b6934f77d1f77d0ad201461b1beffae15b7a0f/preview/20260924132403_0406.jpg", "label": "和⑬ 重箱三段", "caption": "京の粋を、ひと皿に。", "music": "あじさい茶屋", "enabled": 1},
  {"pattern": "yoshokuminamowa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4273df1970827dc008f3f617ebc5d773a8e3eb1b/preview/20260924132538_2238.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@4310605f149c39e01999e2fafd76dc652558c6e9/preview/20260924132542_2529.jpg", "label": "和⑭ 水面", "caption": "握りたてを、どうぞ。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokukoushiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e552a98978ac009d849f5471207fab92ed6d3a9b/preview/20260924132709_0593.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@2d6ad26dce5c6d1b970964542ea76ebf8ad56724/preview/20260924132712_7598.jpg", "label": "和⑮ 縦格子スライド", "caption": "上質を、気軽に。", "music": "宵風灯路", "enabled": 1},
  {"pattern": "yoshokuhakuwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@7cc76586bed770e3c635a9ee816fabc852bac567/preview/20260924132843_1029.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@cf8aae7395fef9def49bce4dc11468e13eec998c/preview/20260924132845_9909.jpg", "label": "和⑯ 箔押し", "caption": "四条烏丸、京の夜。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuichiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@8a65becbb879f1db418bd71d9940a892303ff978/preview/20260924133013_1240.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@aca388319f3637a05debeb8747b9e56c764ccb3e/preview/20260924133016_9914.jpg", "label": "和⑰ 一行ミニマル", "caption": "職人の、手しごと。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokuougiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@dc6bdd14bcb76533918028185fcd10e4458204d7/preview/20260924133149_2897.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@1ffede2070f2150d4b898b958fd8247616ae4692/preview/20260924133152_5415.jpg", "label": "和⑱ 扇", "caption": "いい夜の、はじまり。", "music": "津軽三味線独奏貝殻節 (1)", "enabled": 1},
  {"pattern": "yoshokuichimatsuwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@63db539c427b568cb6760a7db96f710f5adb27e5/preview/20260924133318_8451.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@95d68cdca4b1aa4278764a9925eea71b8621970a/preview/20260924133321_4433.jpg", "label": "和⑲ 市松", "caption": "〜京町家で、旬の鮨と和食を〜", "music": "祭りビート", "enabled": 1},
  {"pattern": "yoshokubyoubuwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@35803b3c24b3a1a6cf3c4ed2e7c79122014bc280/preview/20260924133453_4460.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d5506cb0bcaca1b8311232f14dc466455f189f01/preview/20260924133455_4124.jpg", "label": "和⑳ 金屏風", "caption": "今宵は、鮨と。", "music": "祭りヤグラ", "enabled": 1}
];
