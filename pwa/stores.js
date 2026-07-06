// 店舗一覧（多店舗展開のマスター）。店舗を増やす時はここに1行追加するだけ。
// id:      内部ID（通知の絞り込みや非表示設定のキーに使う）
// name:    正式屋号
// short:   識別名（アイコンの下に出す。屋号がかぶるため）
// icon:    ロゴ画像（無ければ initial の1文字タイルで表示）
// initial: ロゴが無い時にタイルへ大きく出す1文字
// url:     店舗ページ
// live:    true=稼働中 / false=準備中バッジを出す
window.SUSABIYU_STORES = [
  { id: "sanjo",    name: "大衆寿司居酒屋 すさび湯", short: "河原町三条", icon: "icons/icon-192.png", initial: "湯", url: "./index.html",    live: true },
  { id: "karasuma", name: "鮨処すさび湯",           short: "四条烏丸",   icon: "",                   initial: "鮨", url: "./karasuma.html", live: false },
];
