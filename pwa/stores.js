// 店舗一覧（多店舗展開のマスター）。店舗名はスプレッドシート『提出チェック』A列から転記。
// id:      内部ID（通知の絞り込みや非表示・フォルダ設定のキーに使う。後から変えない）
// name:    アイコンの下に出す店舗名（シートの表記そのまま）
// short:   補足の識別名（不要なら空でOK）
// icon:    ロゴ画像（無ければ initial の1文字タイルで表示。ロゴが届いたらここに入れる）
// initial: ロゴが無い時にタイルへ大きく出す1文字
// url:     店舗ページ（空なら「準備中です」の案内だけ出す）
// live:    true=稼働中 / false=準備中バッジを出す
window.SUSABIYU_STORES = [
  { id: "sanjo",        name: "すさび湯 河原町三条店",       short: "稼働中", icon: "icons/icon-192.png", initial: "湯", url: "./index.html",    live: true },
  { id: "taishusushi",  name: "大衆寿司酒場すさび湯",         short: "", icon: "", initial: "湯", url: "", live: false },
  { id: "hiyoko",       name: "ひよこ飯店",                   short: "", icon: "", initial: "ひ", url: "", live: false },
  { id: "arata",        name: "ARATA",                        short: "", icon: "", initial: "A", url: "", live: false },
  { id: "chachan",      name: "ちゃーちゃん",                 short: "", icon: "", initial: "ち", url: "", live: false },
  { id: "awakurai",     name: "大衆酒場 曲ル角ニハ泡喰ライ",  short: "", icon: "", initial: "泡", url: "", live: false },
  { id: "umami",        name: "CRAFTMAN UMAMI",               short: "", icon: "", initial: "U", url: "", live: false },
  { id: "taidai",       name: "料理と酒 たいだい",            short: "", icon: "", initial: "た", url: "", live: false },
  { id: "nagagutsu",    name: "NagaGutsu",                    short: "", icon: "", initial: "N", url: "", live: false },
  { id: "kumatori",     name: "熊の鳥焼",                     short: "", icon: "", initial: "熊", url: "", live: false },
  { id: "lucua",        name: "ルクアLargo",                  short: "", icon: "", initial: "ル", url: "", live: false },
  { id: "tanukiya",     name: "味のたぬきや",                 short: "", icon: "", initial: "た", url: "", live: false },
  { id: "gold",         name: "フレンチ酒場GOLD",             short: "", icon: "", initial: "G", url: "", live: false },
  { id: "goldporta",    name: "GOLD京都ポルタ",               short: "", icon: "", initial: "G", url: "", live: false },
  { id: "sannomiya",    name: "すさび湯 三宮",                short: "", icon: "", initial: "湯", url: "", live: false },
  { id: "karasuma",     name: "すさび湯 京都烏丸",            short: "", icon: "", initial: "鮨", url: "./karasuma.html", live: false },
  { id: "kadoma",       name: "門真Largo",                    short: "", icon: "", initial: "門", url: "", live: false },
  { id: "temmabashi",   name: "すさび湯 天満橋",              short: "", icon: "", initial: "湯", url: "", live: false },
  { id: "goldohatsu",   name: "フレンチ酒場GOLDお初",         short: "", icon: "", initial: "G", url: "", live: false },
  { id: "gifuya",       name: "ぎふや 天満橋店",              short: "", icon: "", initial: "ぎ", url: "", live: false },
  { id: "shinjuku",     name: "すさび湯 新宿東口",            short: "", icon: "", initial: "湯", url: "", live: false },
  { id: "kabukicho",    name: "すさび湯 歌舞伎町",            short: "", icon: "", initial: "湯", url: "", live: false },
  { id: "ndanda",       name: "んだんだ",                     short: "", icon: "", initial: "ん", url: "", live: false },
  { id: "gifuyatenjin", name: "大衆酒場 ぎふや福岡天神",      short: "", icon: "", initial: "ぎ", url: "", live: false },
];
