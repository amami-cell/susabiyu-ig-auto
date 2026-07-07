// 店舗一覧（多店舗展開のマスター）。名前はスプレッドシート『店舗受付』C列(アイコン短縮名)から転記。
// id:      内部ID（通知の絞り込みや非表示・フォルダ設定のキーに使う。後から変えない）
// name:    アイコンの下に出す名前。「/」を入れるとその位置で2行になる
// full:    正式店舗名（店舗ページの見出しなどに使用）
// short:   補足の識別名（不要なら空でOK）
// icon:    ロゴ画像（無ければ initial の1文字タイルで表示。ロゴが届いたらここに入れる）
// initial: ロゴが無い時にタイルへ大きく出す1文字
// url:     店舗ページ（準備中の店は共通の store.html?id=◯◯ に飛ぶ）
// live:    true=稼働中 / false=準備中バッジを出す
window.SUSABIYU_STORES = [
  { id: "sanjo",        name: "すさび湯三条店",       full: "すさび湯 河原町三条店",       short: "稼働中", icon: "icons/storelogo_tile.png", initial: "湯", url: "./index.html",    live: true },
  { id: "taishusushi",  name: "すさび湯/梅田",        full: "大衆寿司酒場すさび湯",         short: "", icon: "", initial: "湯", url: "./store.html?id=taishusushi", live: false },
  { id: "hiyoko",       name: "ひよこ飯店",           full: "ひよこ飯店",                   short: "", icon: "", initial: "ひ", url: "./store.html?id=hiyoko", live: false },
  { id: "arata",        name: "ARATA",                full: "ARATA",                        short: "", icon: "", initial: "A", url: "./store.html?id=arata", live: false },
  { id: "chachan",      name: "ちゃーちゃん",         full: "ちゃーちゃん",                 short: "", icon: "", initial: "ち", url: "./store.html?id=chachan", live: false },
  { id: "awakurai",     name: "泡喰ライ",             full: "大衆酒場 曲ル角ニハ泡喰ライ",  short: "", icon: "", initial: "泡", url: "./store.html?id=awakurai", live: false },
  { id: "umami",        name: "UMAMI",                full: "CRAFTMAN UMAMI",               short: "", icon: "", initial: "U", url: "./store.html?id=umami", live: false },
  { id: "taidai",       name: "たいだい",             full: "料理と酒 たいだい",            short: "", icon: "", initial: "た", url: "./store.html?id=taidai", live: false },
  { id: "nagagutsu",    name: "NagaGutsu",            full: "NagaGutsu",                    short: "", icon: "", initial: "N", url: "./store.html?id=nagagutsu", live: false },
  { id: "kumatori",     name: "熊の鳥焼",             full: "熊の鳥焼",                     short: "", icon: "", initial: "熊", url: "./store.html?id=kumatori", live: false },
  { id: "lucua",        name: "ルクアLargo",          full: "ルクアLargo",                  short: "", icon: "", initial: "ル", url: "./store.html?id=lucua", live: false },
  { id: "tanukiya",     name: "味のたぬきや",         full: "味のたぬきや",                 short: "", icon: "", initial: "た", url: "./store.html?id=tanukiya", live: false },
  { id: "gold",         name: "GOLD梅田",             full: "フレンチ酒場GOLD",             short: "", icon: "", initial: "G", url: "./store.html?id=gold", live: false },
  { id: "goldporta",    name: "GOLD/京都ポルタ",      full: "GOLD京都ポルタ",               short: "", icon: "", initial: "G", url: "./store.html?id=goldporta", live: false },
  { id: "sannomiya",    name: "すさび湯/三宮店",      full: "すさび湯 三宮",                short: "", icon: "", initial: "湯", url: "./store.html?id=sannomiya", live: false },
  { id: "karasuma",     name: "すさび湯/京都烏丸",    full: "すさび湯 京都烏丸",            short: "", icon: "", initial: "鮨", url: "./karasuma.html", live: false },
  { id: "kadoma",       name: "門真Largo",            full: "門真Largo",                    short: "", icon: "", initial: "門", url: "./store.html?id=kadoma", live: false },
  { id: "temmabashi",   name: "すさび湯/天満橋店",    full: "すさび湯 天満橋",              short: "", icon: "", initial: "湯", url: "./store.html?id=temmabashi", live: false },
  { id: "goldohatsu",   name: "GOLD/お初天神",        full: "フレンチ酒場GOLDお初",         short: "", icon: "", initial: "G", url: "./store.html?id=goldohatsu", live: false },
  { id: "gifuya",       name: "ぎふや 天満橋",        full: "ぎふや 天満橋店",              short: "", icon: "", initial: "ぎ", url: "./store.html?id=gifuya", live: false },
  { id: "shinjuku",     name: "すさび湯/新宿東口店",  full: "すさび湯 新宿東口",            short: "", icon: "", initial: "湯", url: "./store.html?id=shinjuku", live: false },
  { id: "kabukicho",    name: "すさび湯/歌舞伎町店",  full: "すさび湯 歌舞伎町",            short: "", icon: "", initial: "湯", url: "./store.html?id=kabukicho", live: false },
  { id: "ndanda",       name: "んだんだ",             full: "んだんだ",                     short: "", icon: "", initial: "ん", url: "./store.html?id=ndanda", live: false },
  { id: "gifuyatenjin", name: "ぎふや 福岡天神",      full: "大衆酒場 ぎふや福岡天神",      short: "", icon: "", initial: "ぎ", url: "./store.html?id=gifuyatenjin", live: false },
];
