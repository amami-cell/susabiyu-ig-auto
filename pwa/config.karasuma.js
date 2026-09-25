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
  {"pattern": "yoshokutatewa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@05e63ed6b1aef9b999461cd394d8510b149ff239/preview/20260925130642_2860.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5cd5eee9629dd0fd0370f3ec81f67dc9156c0fe9/preview/20260925130645_4777.jpg", "label": "和① 縦書き大明朝", "caption": "町家で、静かに一献。", "music": "あじさい茶屋", "enabled": 1},
  {"pattern": "yoshokumagwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a5f708455d6378ad41ce3ed1b2b8eea0882f3d4b/preview/20260925130800_9503.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@92b9cb1477127cf4d90ba26ae2eb9edbe32362a6/preview/20260925130802_0017.jpg", "label": "和② スタイリッシュ雑誌", "caption": "旬を、ひと貫。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokuhitowa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d31f9b74e796915be2aefeeaffb011c39cf59f34/preview/20260925130948_7554.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@dfffdaf67fa0ceb9498ae231eb9b66630ed663f8/preview/20260925130951_4963.jpg", "label": "和③ 本日の一皿", "caption": "京の粋を、ひと皿に。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokusumiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@64abe9ddb40aa4bc88c8f9002f5af266634a2375/preview/20260925131206_7196.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@655ea53eb96c9ed98a58f345fe4de8a1c2170754/preview/20260925131208_1520.jpg", "label": "和④ 水墨", "caption": "いい夜の、はじまり。", "music": "祭りビート", "enabled": 1},
  {"pattern": "yoshokukinsujiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c5f960fe945ae475b487e1495288c034c94c1ac9/preview/20260925131340_4274.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@101dd905a7df582ca2cbfa5c5cfdadc77a156c41/preview/20260925131343_6733.jpg", "label": "和⑤ 金箔ひとすじ", "caption": "〜京町家で、旬の鮨と和食を〜", "music": "祭りヤグラ", "enabled": 1},
  {"pattern": "yoshokuhakuwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b9370aebb7b34783a6d49971a2d2f623be73dd82/preview/20260925131521_8589.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@19d01334abfda7cb8e206670469edf80b8c38b47/preview/20260925131524_2167.jpg", "label": "和⑥ 箔押し", "caption": "四条烏丸、京の夜。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuichiwa", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@b00b8cc79935c5eedffc15752fbb5fd7d8ded79a/preview/20260925131700_3983.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@e785d0fc4863cdcdf0c6e566b1abc9675cd4ed52/preview/20260925131704_4340.jpg", "label": "和⑦ 一行", "caption": "職人の、手しごと。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokudish", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@998e264799d79f56b4796347d8410ceb1cbe7cf0/preview/20260925132014_1968.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@288a061405e7d7fde7bd95a7787111edd1b57f2f/preview/20260925132018_4024.jpg", "label": "定番⑧ 本日の一皿", "caption": "今宵は、鮨と。", "music": "bgm (1)", "enabled": 1},
  {"pattern": "yoshokusizzle", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@cbb074361dfe840423af229cd7447c1f55845336/preview/20260925132312_2287.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@91bba0e2437b718315f4d253256540b3b664c045/preview/20260925132315_9623.jpg", "label": "定番⑨ 鉄板シズル", "caption": "町家で、静かに一献。", "music": "四条通", "enabled": 1},
  {"pattern": "yoshokucine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@d1b956bf1640bbc9c869c0e2c56d448c5007c7d2/preview/20260925132520_3236.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@c1f00906caec2a356859ce01e081fa472b46e881/preview/20260925132522_5329.jpg", "label": "定番⑩ シネマ", "caption": "握りたてを、どうぞ。", "music": "日本式風景", "enabled": 1},
  {"pattern": "yoshokuwine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@5576fc5e13d752c7e191d9ebe661e3f143bb6c62/preview/20260925132739_2279.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@01e4424bfde3de84a442fc27bdc663668d86b946/preview/20260925132742_3260.jpg", "label": "定番⑪ ワインと共に", "caption": "上質を、気軽に。", "music": "橙アップテンポ (1)", "enabled": 1},
  {"pattern": "yoshokutrio", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@6ea83804f89e6fe9a82b724ab7a0ed0931fafdcb/preview/20260925132932_2387.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@9f295068d36b90e988b4e12deb86256aecb37ba2/preview/20260925132935_1216.jpg", "label": "定番⑫ おすすめ3品", "caption": "日常に、ひと皿の贅沢。", "music": "津軽三味線独奏貝殻節 (1)", "enabled": 1},
  {"pattern": "yoshokupola", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@a6e6abca1a1922823069dea06017bd867f4cfa24/preview/20260925133017_7817.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@11795de8d2836d49e1b3520ba59680035aade431/preview/20260925133019_5303.jpg", "label": "定番⑬ ポラロイド重ね", "caption": "職人の、手しごと。", "music": "祭りビート", "enabled": 1},
  {"pattern": "yoshokumagazine", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@0b44572b212bd1ac601f62dfa4711499540e45fe/preview/20260925133149_3361.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@767ae56f6aa35050632c6f84c92f85f936593b8e/preview/20260925133152_2547.jpg", "label": "定番⑮ 雑誌ストーリー", "caption": "旬を、ひと貫。", "music": "銭湯に行こう (1)", "enabled": 1},
  {"pattern": "yoshokumag", "url": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@cca80aee47d6b99ff32d776f20bdbecf53319d2b/preview/20260925133311_9485.mp4", "poster": "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@58a64c23339159b8c795e4a559b714ad0eafbe3e/preview/20260925133314_5942.jpg", "label": "定番⑭ 雑誌エディトリアル", "caption": "京の粋を、ひと皿に。", "music": "宵風灯路", "enabled": 1}
];
