/**
 * 他媒体（飲食店ドットコム / グルメキャリー）の応募者CSVを取り込む。
 * エンポケの深い選考モデルとは分け、専用シート「他媒体_応募」に素の応募者一覧として蓄積する。
 * 別ページ(?page=media)で表示し、新着は責任者へプッシュ通知（epの通知キューを再利用）。
 *
 * 取り込み経路:
 *   doPost {api:'media_importcsv', media:'inshoku'|'gourmet', b64:<CSVのbase64>}
 *   → PCの取得スクリプト / ブックマークレット / アプリの手動アップロードから叩く。
 */

var MEDIA_SHEET = "他媒体_応募";
var MEDIA_HDR = ["媒体", "店舗", "氏名", "カナ", "応募日時", "雇用形態", "職種", "年齢", "性別",
  "電話", "メール", "住所", "状況/資格", "自己PR", "取得日時", "key"];
var MEDIA_LABEL = { inshoku: "飲食店ドットコム", gourmet: "グルメキャリー" };

/** base64(CSV) を受け取り、文字コードを判定して取り込む。 */
function mediaImportCsvB64(media, b64) {
  try {
    media = String(media || "").toLowerCase();
    if (!MEDIA_LABEL[media]) return { ok: false, error: "unknown media: " + media };
    var bytes = Utilities.base64Decode(String(b64 || ""));
    var csv = "";
    // この2媒体のCSVは Shift_JIS(cp932)。まずShift_JISで読み、化けたらUTF-8にフォールバック。
    try { csv = Utilities.newBlob(bytes).getDataAsString("Shift_JIS"); } catch (e) { csv = ""; }
    if (!csv || (csv.match(/�/g) || []).length > 5) {
      try { var u = Utilities.newBlob(bytes).getDataAsString("UTF-8"); if (u && (u.match(/�/g) || []).length <= 5) csv = u; } catch (e) { }
    }
    return mediaImportText(media, csv);
  } catch (e) { return { ok: false, error: String(e) }; }
}

/** テキスト(CSV)を取り込む本体。 */
function mediaImportText(media, csv) {
  var started = new Date();
  try {
    var rows = (media === "inshoku") ? mediaParseInshoku_(csv) : mediaParseGourmet_(csv);
    var res = mediaWrite_(media, rows);
    // 新着を通知キューへ（店舗別ルーティング対応）
    if (res.newByStore && Object.keys(res.newByStore).length) {
      mediaNotifyNew_(media, res.newByStore);
    }
    try { epLog_(started, "success", rows.length, MEDIA_LABEL[media] + "取り込み: 新規" + res.added + "件 / 全" + rows.length + "件"); } catch (e) { }
    return { ok: true, media: media, rows: rows.length, added: res.added };
  } catch (e) {
    try { epLog_(started, "fail", 0, MEDIA_LABEL[media] + "取り込み失敗: " + e); } catch (x) { }
    return { ok: false, media: media, error: String(e) };
  }
}

/* ---------- パーサー ---------- */

// 飲食店ドットコム: 店名,雇用形態,職種,応募日時,名前（カナ）,住所,年齢,性別,応募環境,電話番号,メール,現在の状況,転職時期,自己PR,希望連絡時間
function mediaParseInshoku_(text) {
  var recs = epSplitRecords_(text);
  var out = [];
  for (var i = 1; i < recs.length; i++) {
    var c = recs[i]; if (!c || c.join("").trim() === "") continue;
    var g = function (n) { return (c[n] == null ? "" : String(c[n]).trim()); };
    var store = g(0); if (!store && !g(4)) continue;
    var nm = mediaSplitNameKana_(g(4));
    out.push(mediaNorm_("inshoku", {
      store: store, name: nm.name, kana: nm.kana, appliedAt: g(3),
      employ: g(1), job: g(2), age: mediaAge_(g(6)), gender: g(7),
      tel: g(9), email: g(10), address: g(5), status: g(11), pr: g(13)
    }));
  }
  return out;
}

// グルメキャリー: 応募日,応募時間,エリア,氏名,氏名(カナ),性別,年齢,郵便番号,都道府県,市区町村,住所,電話番号,メール,希望連絡時間・連絡方法,取得資格,自己PR,応募先名（原稿名）,応募遷移,希望雇用形態,希望職種
function mediaParseGourmet_(text) {
  var recs = epSplitRecords_(text);
  var out = [];
  for (var i = 1; i < recs.length; i++) {
    var c = recs[i]; if (!c || c.join("").trim() === "") continue;
    var g = function (n) { return (c[n] == null ? "" : String(c[n]).trim()); };
    var store = g(17) || g(16); if (!store && !g(3)) continue;   // 店舗＝応募遷移
    var addr = [g(8), g(9), g(10)].filter(Boolean).join("");
    var applied = (g(0) + " " + g(1)).trim();
    out.push(mediaNorm_("gourmet", {
      store: store, name: g(3), kana: g(4), appliedAt: applied,
      employ: g(18), job: g(19), age: mediaAge_(g(6)), gender: g(5),
      tel: g(11), email: g(12), address: addr, status: g(14), pr: g(15)
    }));
  }
  return out;
}

/* ---------- 正規化・ユーティリティ ---------- */

function mediaNorm_(media, r) {
  // 店舗名はエンポケの別名表で名寄せ（集計・通知ルーティングを共通化）
  var store = r.store || "";
  try { if (typeof epCleanStore_ === "function") store = epCleanStore_(store); } catch (e) { }
  var tel = String(r.tel || "").replace(/[^\d]/g, "");
  var key = [media, tel || (r.name || ""), r.appliedAt || "", store].join("|");
  return {
    media: media, store: store, name: r.name || "", kana: r.kana || "",
    appliedAt: r.appliedAt || "", employ: r.employ || "", job: r.job || "",
    age: r.age, gender: r.gender || "", tel: r.tel || "", email: r.email || "",
    address: r.address || "", status: r.status || "", pr: r.pr || "", key: key
  };
}

function mediaSplitNameKana_(s) {
  s = String(s || "");
  var m = s.match(/^(.*?)[\s　]*[（(]([^）)]*)[）)]\s*$/);
  if (m) return { name: m[1].trim(), kana: m[2].trim() };
  return { name: s.trim(), kana: "" };
}

function mediaAge_(s) {
  var d = String(s == null ? "" : s).replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).replace(/[^\d]/g, "");
  var n = d ? +d : null;
  return (n && n >= 10 && n <= 99) ? n : null;
}

/* ---------- シート書き込み（重複排除して追記） ---------- */

function mediaWrite_(media, rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = epSheet_(ss, MEDIA_SHEET, MEDIA_HDR);
  var keyCol = MEDIA_HDR.indexOf("key");
  var existing = {};
  if (sh.getLastRow() > 1) {
    var kv = sh.getRange(2, keyCol + 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < kv.length; i++) existing[String(kv[i][0])] = 1;
  }
  var now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  var add = [], newByStore = {};
  rows.forEach(function (r) {
    if (existing[r.key]) return;
    existing[r.key] = 1;
    add.push([MEDIA_LABEL[media], r.store, r.name, r.kana, r.appliedAt, r.employ, r.job,
      (r.age == null ? "" : r.age), r.gender, r.tel, r.email, r.address, r.status, r.pr, now, r.key]);
    if (r.store) newByStore[r.store] = (newByStore[r.store] || 0) + 1;
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, MEDIA_HDR.length)
    .setValues(add.map(function (row) { return row.map(csvGuard_); }));  // 数式インジェクション対策
  return { added: add.length, newByStore: newByStore };
}

/* ---------- 通知（新着応募） ---------- */

function mediaNotifyNew_(media, newByStore) {
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty("EP_NOTIFY_ENABLED") === "0") return;
    var stores = Object.keys(newByStore);
    if (!stores.length) return;
    stores.sort(function (a, b) { return (newByStore[b] || 0) - (newByStore[a] || 0); });
    var total = 0, lines = [];
    stores.forEach(function (s) { var n = newByStore[s] || 0; total += n; lines.push("・" + s + "：新規" + n + "件"); });
    var title = "🆕【" + MEDIA_LABEL[media] + "】新規応募 " + total + "件";
    // epの通知キューへ。data.newByStore で店舗別ルーティング（購読者の「通知する店舗」設定が効く）。
    epEnqueuePush_(title, lines.join("\n"), "recruit", JSON.stringify({ newByStore: newByStore, media: MEDIA_LABEL[media] }));
  } catch (e) { Logger.log("media notify skip: " + e); }
}

/* ---------- 表示用データ（別ページから読む） ---------- */

/** 他媒体の応募者一覧をJSONで返す（新しい順）。 */
function mediaListData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(MEDIA_SHEET);
  if (!sh || sh.getLastRow() < 2) return { ok: true, items: [] };
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, MEDIA_HDR.length).getValues();
  var items = v.map(function (r) {
    var o = {};
    MEDIA_HDR.forEach(function (h, i) {
      // Sheetsが日付風文字列をDate型に自動変換した分は JST 文字列へ戻す（UTC ISO化・表示崩れを防ぐ）。
      o[h] = (r[i] instanceof Date) ? Utilities.formatDate(r[i], "Asia/Tokyo", "yyyy/MM/dd HH:mm") : r[i];
    });
    return o;
  });
  // 応募日時で新しい順。Date/文字列/フォーマット差が混在しても壊れないよう数値TSに正規化して比較。
  items.sort(function (a, b) { return mediaTs_(b["応募日時"]) - mediaTs_(a["応募日時"]); });
  return { ok: true, items: items };
}

// 応募日時（Date or "yyyy/MM/dd HH:mm" 等の文字列）を比較可能なミリ秒に。解釈不能は0。
function mediaTs_(v) {
  if (v instanceof Date) return v.getTime();
  var s = String(v == null ? "" : v).trim();
  if (!s) return 0;
  var t = new Date(s.replace(/\//g, "-").replace(" ", "T")).getTime();
  return isNaN(t) ? 0 : t;
}
