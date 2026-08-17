/**
 * エントリーポケット 求人進捗 自動蓄積（GAS完結版）
 *
 * これ1つで「ログイン→CSV取得→7シートへ蓄積」を行う。GitHub/GCP不要。
 * Googleのサーバー(Apps Script)から実行するのでEPの海外IPブロックを受けない。
 *
 * 事前準備（コードではなく設定）:
 *   歯車（プロジェクトの設定）→ スクリプト プロパティ
 *     EP_USER = ログインID / EP_PASS = パスワード
 *
 * 使い方:
 *   epSetup … 1回だけ実行。取得を試し、成功したら1日5回の自動取得を設置する。
 *   epRun   … 毎回の取得本体（トリガーから自動で呼ばれる）。手動でも実行可。
 *
 * 自動取得の時刻（日本時間）: 5:00 / 10:00 / 15:00 / 17:00 / 23:00
 *   過去に溜めた分はそのまま。毎回は「新規応募・ステータス変更」を見て、
 *   変化があった時だけ更新としてログに残す（無ければ「変更なし」）。
 */

var EP_LOGIN_URL = "https://manage.entrypocket.jp/web/-/login";
var EP_APPLICANT_URL = "https://manage.entrypocket.jp/web/8sin-saiyo/applicant";
var EP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
var EP_BASIC = "";  // Basic認証が有効な場合にここへ "Basic xxx" を入れる

// ステータスコード → [名称, ファネル段階]（実データで確認できた4件）
var KNOWN_STATUSES = { "1": ["未対応", "応募"], "3": ["連絡中", "接触"],
                       "31": ["面接予約済", "面接"], "83": ["不採用（辞退）", "終了"] };

// CSVヘッダ → 内部の論理名（候補は複数可）
var COLMAP = {
  applicant_code: ["応募者コード", "応募者ID", "応募ID", "ID"],
  name: ["氏名", "応募者氏名", "名前", "お名前"],
  name_kana: ["フリガナ", "カナ", "氏名カナ"],
  status_code: ["選考状況ステータスコード", "ステータスコード", "対応状況コード", "選考ステータスコード"],
  status_name: ["選考状況ステータス", "ステータス", "対応状況", "選考ステータス", "ステータス名"],
  store_id: ["店舗ID", "店舗コード", "勤務地ID", "求人ID", "クライアントID", "クライアントコード"],
  store_name: ["店舗マスタ名", "店舗名", "勤務地", "求人名", "クライアント名", "クライアント", "応募店舗", "募集店舗"],
  tel: ["電話番号", "TEL", "携帯電話", "連絡先"],
  email: ["メールアドレス", "Email", "メール"],
  media: ["媒体名", "媒体", "応募媒体", "流入元", "応募経路"],
  applied_at: ["応募日時", "応募日", "エントリー日時", "登録日時"],
  interview_at: ["面接日時", "面接予定日時", "面接日"],
  hired_at: ["入社日", "入社予定日", "採用日"],
  is_duplicate: ["重複フラグ", "重複", "重複応募"],
  change_history: ["変更履歴1", "変更履歴", "対応履歴"],
  gender: ["性別"],
  birth: ["生年月日", "生年月日（西暦）", "生年月日(西暦)", "誕生日", "生年月日 "],
  age_col: ["年齢", "満年齢", "年令", "年齢（歳）", "年齢(歳)", "歳", "年齢 "],
  occupation: ["現在の職業", "職業", "現職", "ご職業"],
  memo: ["メモ(新規)", "メモ（新規）", "メモ", "メモ1", "対応メモ", "対応履歴メモ"],
  memo_old: ["メモ(過去)", "メモ（過去）"]
};

// 店舗マスタ名の先頭にある【アルバイト】等の【…】を除去して店舗名だけにする
// 店舗名の表記ゆれ統一（左→右）。必要な別名はここに足すだけ。
var EP_STORE_ALIAS = {
  "たぬき屋": "たぬきや"
};
function epCleanStore_(s) {
  var v = String(s || "").replace(/^(?:\s*【[^】]*】\s*)+/, "").trim();
  if (EP_STORE_ALIAS[v]) return EP_STORE_ALIAS[v];
  return v;
}

// 店舗名の照合用キー（空白・中黒を除去して小文字化）。応募データと打ち出しデータの突き合わせに使う。
function epNormStore_(s) {
  return epCleanStore_(String(s || "")).replace(/[\s　・･]/g, "").toLowerCase();
}

// 日付セル（Date or 文字列 "2026/05/25" 等）→ Date（時刻切り捨て）。読めなければ null。
function epDate_(v) {
  if (Object.prototype.toString.call(v) === "[object Date]") return isNaN(v.getTime()) ? null : v;
  var m = String(v || "").trim().match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return null;
  var d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0); return d;
}

// ========================= 求人打ち出し履歴（Notion由来の別スプレッドシート）=========================

// 取得元：スクリプトプロパティに NOTION_TOKEN / NOTION_DB_ID があれば Notion を直読み。
//   無ければ下のスプレッドシート(Notionのミラー)を読む（フォールバック）。
var NOTION_POSTINGS_SHEET_ID = "1Oh1mxj5Jjn5wB5fTtW4GJrepA6cFDwQRhE9mK2QbxFw";
var POSTING_KEEP_DAYS = 365;   // 掲載終了からこの日数を過ぎた打ち出しは取り込まない（古い分は自動で捨てる）

// シートの全項目を蓄積する（この順で「求人打ち出し」シートに書く）
// 末尾の「元シート」「元行」は、アプリからの結果書き戻し先を特定するための控え。
var POST_HEADER = ["店舗名", "報告者", "媒体", "商品名",
  "エリア1", "エリア2", "路線1", "路線2", "求人費",
  "掲載開始", "掲載終了", "応募総数", "採用人数", "採用単価", "採用率",
  "退職人数", "退職率", "状態", "備考", "元シート", "元行"];

// 打ち出しシートの見出し → 論理名（候補複数可。実データの見出しに合わせてある）
var POST_COLMAP = {
  store: ["店舗名"], reporter: ["報告者"], media: ["求人媒体", "媒体"], plan: ["商品名", "プラン名", "プラン"],
  area1: ["エリアリスティング1週目", "エリアリスティング1", "エリア1"],
  area2: ["エリアリスティング2週目", "エリアリスティング2", "エリア2"],
  line1: ["路線リスティング1週目", "路線リスティング1", "路線1"],
  line2: ["路線リスティング2週目", "路線リスティング2", "路線2"],
  cost: ["求人費(税込)", "求人費（税込）", "求人費", "費用"],
  start: ["連載開始", "掲載開始", "募集開始", "開始"], end: ["連載終了", "掲載終了", "募集終了", "終了"],
  apps: ["応募総数", "応募数", "応募者数"], hired: ["採用人数", "採用数"],
  unit: ["採用単価", "単価"], hireRate: ["採用率"], quit: ["退職人数", "退職者数"], quitRate: ["退職率"],
  note: ["退職理由等、備考", "退職理由等", "備考", "退職理由"]
};

// 取り込み本体：Notion優先→ダメならスプレッドシート。共通の書き出しへ渡す。
function epImportPostings_(ss) {
  var rows = epFetchNotionRows_(), srcName = "Notion";
  if (!rows || !rows.length) { rows = epFetchPostingSheetRows_(); srcName = "スプレッドシート"; }
  // ★取得0件のときは既存の「求人打ち出し」を消さない（一時的な取得失敗でデータを飛ばさないため）
  if (!rows || !rows.length) { Logger.log("  求人打ち出し: 取得0件のため既存データを保持（上書きしない）"); return; }
  epWritePostings_(ss, rows, srcName);
}

// Notion API からデータベースの全行を取得（未設定なら null）。行は論理名キーの素データ。
function epFetchNotionRows_() {
  var p = PropertiesService.getScriptProperties();
  var token = p.getProperty("NOTION_TOKEN"), db = p.getProperty("NOTION_DB_ID");
  if (!token || !db) return null;
  db = db.replace(/-/g, "");   // ダッシュ有無どちらでも可
  var rows = [], cursor = null, guard = 0;
  do {
    var payload = { page_size: 100 };
    if (cursor) payload.start_cursor = cursor;
    var res = UrlFetchApp.fetch("https://api.notion.com/v1/databases/" + db + "/query", {
      method: "post", contentType: "application/json",
      headers: { "Authorization": "Bearer " + token, "Notion-Version": "2022-06-28" },
      payload: JSON.stringify(payload), muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      Logger.log("  Notion APIエラー HTTP=" + res.getResponseCode() + " " + res.getContentText().slice(0, 200));
      return rows.length ? rows : null;
    }
    var data = JSON.parse(res.getContentText());
    (data.results || []).forEach(function (pg) {
      var props = pg.properties || {};
      var get = function (key) {
        for (var j = 0; j < POST_COLMAP[key].length; j++) { var nm = POST_COLMAP[key][j]; if (props[nm] != null) return epNotionValue_(props[nm]); }
        return "";
      };
      rows.push({
        store: get("store"), reporter: get("reporter"), media: get("media"), plan: get("plan"),
        area1: get("area1"), area2: get("area2"), line1: get("line1"), line2: get("line2"),
        cost: get("cost"), start: get("start"), end: get("end"), apps: get("apps"), hired: get("hired"),
        unit: get("unit"), hireRate: get("hireRate"), quit: get("quit"), quitRate: get("quitRate"), note: get("note")
      });
    });
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor && ++guard < 50);
  Logger.log("  Notion取得 " + rows.length + "件");
  return rows;
}

// Notionプロパティ1つ → 素の値（型ごとに取り出す）
function epNotionValue_(pr) {
  if (!pr) return "";
  switch (pr.type) {
    case "title": return (pr.title || []).map(function (x) { return x.plain_text; }).join("");
    case "rich_text": return (pr.rich_text || []).map(function (x) { return x.plain_text; }).join("");
    case "number": return pr.number == null ? "" : pr.number;
    case "select": return pr.select ? pr.select.name : "";
    case "status": return pr.status ? pr.status.name : "";
    case "multi_select": return (pr.multi_select || []).map(function (x) { return x.name; }).join(", ");
    case "date": return pr.date ? (pr.date.start || "") : "";
    case "checkbox": return pr.checkbox ? "true" : "";
    case "url": return pr.url || "";
    case "email": return pr.email || "";
    case "phone_number": return pr.phone_number || "";
    case "people": return (pr.people || []).map(function (x) { return x.name || ""; }).join(", ");
    case "created_time": return pr.created_time || "";
    case "last_edited_time": return pr.last_edited_time || "";
    case "formula": var f = pr.formula || {}; return f.string != null ? f.string : (f.number != null ? f.number : (typeof f.boolean === "boolean" ? (f.boolean ? "true" : "") : (f.date ? (f.date.start || "") : "")));
    case "rollup":
      var r = pr.rollup || {};
      if (r.type === "number") return r.number == null ? "" : r.number;
      if (r.type === "date") return r.date ? (r.date.start || "") : "";
      if (r.type === "array") return (r.array || []).map(function (a) { return epNotionValue_(a); }).filter(String).join(", ");
      return "";
    default: return "";
  }
}

// フォールバック：Notionのミラー・スプレッドシートから全行を取得（論理名キー）。無理なら null。
function epFetchPostingSheetRows_() {
  var ext;
  try { ext = SpreadsheetApp.openById(NOTION_POSTINGS_SHEET_ID); }
  catch (e) { Logger.log("  打ち出しシートを開けず(権限/ID?): " + e); return null; }
  var sheets = ext.getSheets(), src = null, hdr = null, srcSheetName = "";
  for (var s = 0; s < sheets.length; s++) {
    var vv; try { vv = sheets[s].getDataRange().getValues(); } catch (e) { continue; }
    if (!vv.length) continue;
    var head = vv[0].map(function (x) { return String(x || "").replace(/　/g, "").trim(); });
    if (head.indexOf("店舗名") >= 0) { src = vv; hdr = head; srcSheetName = sheets[s].getName(); break; }
  }
  if (!src) return null;
  var hidx = {};
  for (var key in POST_COLMAP) {
    for (var j = 0; j < POST_COLMAP[key].length; j++) { var p = hdr.indexOf(POST_COLMAP[key][j]); if (p >= 0) { hidx[key] = p; break; } }
  }
  var g = function (row, k) { var p = hidx[k]; return (p == null || p >= row.length) ? "" : row[p]; };
  var rows = [];
  for (var i = 1; i < src.length; i++) {
    var row = src[i];
    rows.push({
      store: g(row, "store"), reporter: g(row, "reporter"), media: g(row, "media"), plan: g(row, "plan"),
      area1: g(row, "area1"), area2: g(row, "area2"), line1: g(row, "line1"), line2: g(row, "line2"),
      cost: g(row, "cost"), start: g(row, "start"), end: g(row, "end"), apps: g(row, "apps"), hired: g(row, "hired"),
      unit: g(row, "unit"), hireRate: g(row, "hireRate"), quit: g(row, "quit"), quitRate: g(row, "quitRate"), note: g(row, "note"),
      srcSheet: srcSheetName, srcRow: (i + 1)   // 元スプシの実際の行番号（1始まり）
    });
  }
  return rows;
}

// 共通の書き出し：期間で募集中/終了を判定・古い分は捨てる・「求人打ち出し」シートへ全書き換え。
function epWritePostings_(ss, rows, srcName) {
  var today = new Date(); today.setHours(0, 0, 0, 0); var tt = today.getTime();
  var cutoff = tt - POSTING_KEEP_DAYS * 86400000;
  var out = [];
  rows.forEach(function (r) {
    var store = epCleanStore_(String(r.store || "").replace(/\s+/g, " ").trim());
    if (!store) return;
    var st = epDate_(r.start), en = epDate_(r.end);
    if (en && en.getTime() < cutoff) return;                          // 古すぎ→捨てる
    var active = st && st.getTime() <= tt && (!en || tt <= en.getTime()); // 期間内=募集中
    out.push([store, String(r.reporter || ""), String(r.media || ""), String(r.plan || ""),
      String(r.area1 || ""), String(r.area2 || ""), String(r.line1 || ""), String(r.line2 || ""),
      r.cost,
      st ? Utilities.formatDate(st, "Asia/Tokyo", "yyyy-MM-dd") : "",
      en ? Utilities.formatDate(en, "Asia/Tokyo", "yyyy-MM-dd") : "",
      r.apps, r.hired, r.unit, r.hireRate, r.quit, r.quitRate, active ? "募集中" : "終了", String(r.note || ""),
      String(r.srcSheet || ""), (r.srcRow || "")]);
  });
  out.sort(function (a, b) { return String(b[9]) < String(a[9]) ? -1 : 1; });  // 掲載開始(列10)の新しい順

  // ★有効行が0件のときは既存を保持（空で上書きしてデータを飛ばさない）
  if (!out.length) { Logger.log("  求人打ち出し: 有効0件（" + srcName + " 取得" + rows.length + "件）のため既存を保持・上書きしない"); return; }

  var sh = epSheet_(ss, "求人打ち出し", POST_HEADER);
  sh.getRange(1, 1, 1, POST_HEADER.length).setValues([POST_HEADER]);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, POST_HEADER.length).clearContent();
  sh.getRange(2, 1, out.length, POST_HEADER.length).setValues(out);
  Logger.log("  ✓ 求人打ち出し取り込み(" + srcName + ") " + out.length + "件");
}

// ========================= エントリポイント =========================

function epSetup() {
  var ok = epRun();
  if (ok) {
    epInstallTrigger_();
    Logger.log("★★ 完成しました。1日5回（5/10/15/17/23時）自動で取得します。もう触らなくてOKです。");
  } else {
    Logger.log("★ 取得できませんでした。上のログ（✓✗の行）をそのまま送ってください。");
  }
}

function epRun() {
  var started = new Date();
  var result = "success", note = "", n = 0;
  try {
    var jar = epLogin_();
    if (!jar) { throw new Error("ログイン失敗"); }
    Logger.log("✓ ① ログイン成功");

    var csv = epDownloadCsv_(jar);
    if (!csv) { throw new Error("CSVダウンロード先を特定できず"); }
    Logger.log("✓ ② CSV取得 (" + csv.length + "字)");

    var parsed = epParseCsv_(csv);
    n = parsed.rows.length;
    Logger.log("✓ ③ 応募者 " + n + "件 / 列 " + parsed.headers.length);
    // 集計に使う列がちゃんと当たっているか確認（店舗/性別/生年月日）
    var i = parsed.idx || {};
    Logger.log("   マッピング: 店舗名=" + (parsed.headers[i.store_name] || "×") +
               " / 店舗ID=" + (parsed.headers[i.store_id] || "×") +
               " / 性別=" + (parsed.headers[i.gender] || "×") +
               " / 生年月日=" + (parsed.headers[i.birth] || "×") +
               " / ステータス=" + (parsed.headers[i.status_name] || "×"));
    Logger.log("   全ヘッダ: " + parsed.headers.join(","));
    if (!n) { throw new Error("CSVから応募者を読めず（列名マッピング要確認）"); }

    var chg = epWriteSheets_(parsed) || { added: 0, changed: 0 };
    note = (chg.added || chg.changed) ? ("新規" + chg.added + "件 / ステータス変更" + chg.changed + "件") : "変更なし";
    Logger.log("✓ ④ スプレッドシートへ蓄積完了（" + note + "）");

    // ④' 新規応募があればLINEへ「店舗名＋件数」を通知（インスタ投稿と同じ公式アカウント）
    try { epNotifyNewApps_(chg); } catch (eN) { Logger.log("通知スキップ: " + eN); }

    // ⑤ EntryPocketの「掲載中の求人原稿がある店舗」を取得（募集中タブ用）→ キャッシュ再作成
    try {
      var ss5 = SpreadsheetApp.getActiveSpreadsheet();
      var liveNames = epFetchLiveShops_(jar);                 // 1回だけ取得
      var live = epWriteLiveShops_(ss5, jar, liveNames);      // シートへ反映（失敗/0件は既存維持）
      Logger.log("✓ ⑤ 掲載中店舗 " + (live < 0 ? "取得失敗(既存維持)" : (live + "件")));
      // ⑥ 掲載監視＋掲載終了からN日で自動的に結果報告へ（取得成功時のみ）
      try {
        epTrackLive_(ss5, liveNames);
        var mv = epAutoEndExpired_(ss5, liveNames);
        if (mv) Logger.log("✓ ⑥ 掲載終了" + epAutoEndDays_() + "日経過で自動終了 " + mv + "店舗");
      } catch (e6) { Logger.log("自動終了処理スキップ: " + e6); }
      dashStoreCache_();
    } catch (e5) { Logger.log("掲載中店舗の取得スキップ: " + e5); }
  } catch (e) {
    result = "fail"; note = String(e);
    Logger.log("✗ " + note);
  }
  epLog_(started, result, n, note);
  return result === "success";
}

// ========================= ログイン =========================

function epLogin_() {
  var p = PropertiesService.getScriptProperties();
  var user = p.getProperty("EP_USER"), pass = p.getProperty("EP_PASS");
  if (!user || !pass) { Logger.log("★ EP_USER / EP_PASS を設定してください"); return null; }

  var jar = {};
  // ログインページからセッションと認証トークンを得る
  var html = epFetch_(EP_LOGIN_URL, { method: "get", followRedirects: false }, jar).getContentText();
  jar["COOKIE_SUPPORT"] = "true";
  jar["GUEST_LANGUAGE_ID"] = "ja_JP";
  var pauth = (html.match(/Liferay\.authToken\s*=\s*['"]([^'"]+)['"]/) || [])[1] || "";

  // Liferayの正規ログインservlet に login/password で送る（検証済みの勝ちパターン）
  var payload = { login: user, password: pass, rememberMe: "false" };
  if (pauth) payload["p_auth"] = pauth;
  var r2 = epFetch_("https://manage.entrypocket.jp/c/portal/login",
    { method: "post", payload: payload, followRedirects: false, headers: { "Referer": EP_LOGIN_URL } }, jar);
  var loc = r2.getAllHeaders()["Location"] || "";
  if (loc) epFetch_(epAbsUrl_(loc, EP_LOGIN_URL), { method: "get", followRedirects: false }, jar);

  // 成否判定：応募者ページにパスワード欄が無ければログイン成功
  var app = epFetch_(EP_APPLICANT_URL, { method: "get", followRedirects: true }, jar).getContentText();
  if (!/name\s*=\s*["']?_58_password/i.test(app)) {
    Logger.log("  ログイン成功 (HTTP=" + r2.getResponseCode() + ")");
    return jar;
  }
  Logger.log("  ログイン失敗 HTTP=" + r2.getResponseCode() + " redirect=" + loc);
  return null;
}

// ========================= CSVダウンロード =========================

// downloadCSV() が叩く Liferay リソースURL（p_p_lifecycle=2 = serveResource）
var EP_CSV_RES = "https://manage.entrypocket.jp/web/8sin-saiyo/applicant" +
  "?p_p_id=applycontrol_WAR_MYNApplyControlportlet&p_p_lifecycle=2&p_p_state=normal" +
  "&p_p_mode=view&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_count=1";
var EP_CSV_NS = "_applycontrol_WAR_MYNApplyControlportlet_";

function epDownloadCsv_(jar) {
  var hdr = { "Referer": EP_APPLICANT_URL, "X-Requested-With": "XMLHttpRequest" };

  // 1) 事前チェック（応募者0件だと value:ERROR が返る）
  var chk = epFetch_(EP_CSV_RES, { method: "post", payload: epKv_(EP_CSV_NS + "part", "downloadCSVCheck"), headers: hdr }, jar).getContentText();
  Logger.log("  CSVチェック応答: " + chk.replace(/\s+/g, " ").slice(0, 150));
  if (/["']value["']\s*:\s*["']ERROR["']/i.test(chk) || /検索結果が0件/.test(chk)) { Logger.log("  応募者0件のためCSVなし"); return null; }

  // 2) 本家 downloadFile() と同一：part=downloadCSV をURL末尾に付けて POST
  //    （changeStatus 等の他 part は絶対に叩かない＝ダウンロード専用に限定）
  var url = EP_CSV_RES + "&" + EP_CSV_NS + "part=downloadCSV";
  var res = epFetch_(url, { method: "post", payload: "", headers: hdr }, jar);
  var ct = String(res.getAllHeaders()["Content-Type"] || "");
  var cd = String(res.getAllHeaders()["Content-Disposition"] || "");
  Logger.log("  CSV DL: HTTP=" + res.getResponseCode() + " / " + ct + " / " + cd);
  // Content-Type が csv、または添付ファイルなら CSV とみなす（列名に依存しない）
  if (res.getResponseCode() === 200 && (/csv/i.test(ct) || /\.csv/i.test(cd) || /attachment/i.test(cd))) {
    var text = epDecode_(res, ct);
    Logger.log("  → CSV取得成功 / 先頭: " + text.replace(/\s+/g, " ").slice(0, 80));
    return text;
  }
  Logger.log("  CSV応答冒頭: " + epDecode_(res, ct).replace(/\s+/g, " ").slice(0, 200));
  return null;
}

function epKv_(k, v) { var o = {}; o[k] = v; return o; }

// ========================= CSVパース =========================

function epParseCsv_(text) {
  var lines = epSplitRecords_(text);
  if (!lines.length) return { headers: [], idx: {}, rows: [] };
  var headers = lines[0].map(function (h) { return (h || "").replace(/﻿/g, "").replace(/　/g, "").trim(); });
  var idx = {};
  for (var key in COLMAP) {
    for (var j = 0; j < COLMAP[key].length; j++) {
      var pos = headers.indexOf(COLMAP[key][j]);
      if (pos >= 0) { idx[key] = pos; break; }
    }
  }
  var rows = [];
  for (var r = 1; r < lines.length; r++) {
    var cols = lines[r];
    if (!cols.length || cols.join("").trim() === "") continue;
    var get = function (k) { var p = idx[k]; return (p == null || p >= cols.length) ? "" : (cols[p] || "").trim(); };
    var code = get("applicant_code");
    if (!code) continue;
    var telRaw = get("tel");
    var birth = get("birth");
    // 全角数字→半角に正規化してから数字を取り出す（全角だと拾えず不明になるのを防ぐ）
    var ageDigits = epZenHan_(get("age_col")).replace(/[^\d]/g, "");
    var age = (ageDigits && +ageDigits >= 10 && +ageDigits <= 99) ? +ageDigits : epAge_(birth);
    var memoNew = get("memo"), memoOld = get("memo_old"); // メモ(新規)＋メモ(過去)をまとめる
    var memoAll = [memoNew, memoOld ? ("【過去メモ】\n" + memoOld) : ""].filter(Boolean).join("\n\n");
    rows.push({
      code: code, name: get("name"), kana: get("name_kana"),
      statusCode: get("status_code"), statusName: get("status_name"),
      storeId: get("store_id"), storeName: epCleanStore_(get("store_name")),
      telRaw: telRaw, tel: telRaw.replace(/\D/g, ""), email: get("email"),
      media: get("media"), appliedAt: get("applied_at"),
      interviewAt: get("interview_at"), hiredAt: get("hired_at"),
      dup: epBool_(get("is_duplicate")), history: get("change_history"),
      memo: memoAll, occupation: get("occupation"),
      gender: get("gender"), birth: birth, age: (age == null || age < 0 || age > 120) ? null : age
    });
  }
  return { headers: headers, idx: idx, rows: rows };
}

// ========================= シート書き込み =========================

var FUNNEL_ORDER = ["応募", "接触", "面接", "内定", "入社", "終了"];

function epWriteSheets_(parsed) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd");
  var rows = parsed.rows;

  // master_ステータス（未知コード自動追記）→ code→funnel
  var mst = epSheet_(ss, "master_ステータス", ["コード", "名称", "ファネル段階", "要確認", "初出日"]);
  var funnel = epSyncStatusMaster_(mst, rows, today);

  // master_店舗（新店舗自動追記。F列「募集手動」に 募集中/終了 と書けば自動判定を上書き）
  var mstore = epSheet_(ss, "master_店舗", ["店舗ID", "表示名", "ブランド", "エリア", "初出日", "募集手動"]);
  epSyncStoreMaster_(mstore, rows, today);

  // raw_応募者（全書き換え。今回消えた応募者は消失フラグで残す）
  var raw = epSheet_(ss, "raw_応募者", RAW_HEADER);
  var chg = epUpsertRaw_(raw, rows, today);

  // snapshot_日次（当日分を入れ替え）
  var snap = epSheet_(ss, "snapshot_日次", ["日付", "応募者コード", "氏名", "ステータスコード", "ステータス", "店舗ID", "ファネル段階", "重複"]);
  epUpsertSnapshot_(snap, rows, funnel, today);

  // dashboard_cache（集計）
  var dash = epSheet_(ss, "dashboard_cache", ["key", "value"]);
  epWriteDashboard_(dash, rows, funnel);

  // 求人打ち出し履歴（Notion由来の別スプレッドシート）を取り込む（実データで募集中/終了を判定）
  try { epImportPostings_(ss); } catch (e) { Logger.log("求人打ち出し取り込みスキップ: " + e); }

  // 表示用の完成データを作って保存（アプリを開く時はこれを読むだけ＝ほぼ一瞬）
  try { dashStoreCache_(); } catch (e) { Logger.log("app_cache生成スキップ: " + e); }

  return chg;  // { added, changed } 差分サマリ
}

function epSyncStatusMaster_(sh, rows, today) {
  var vals = sh.getDataRange().getValues();
  var funnel = {}, known = {};
  for (var i = 1; i < vals.length; i++) { if (vals[i][0] !== "") { known[vals[i][0]] = 1; funnel[String(vals[i][0])] = vals[i][2] || ""; } }
  var add = [];
  for (var c in KNOWN_STATUSES) if (!known[c]) { add.push([c, KNOWN_STATUSES[c][0], KNOWN_STATUSES[c][1], "", today]); known[c] = 1; funnel[c] = KNOWN_STATUSES[c][1]; }
  var seen = {};
  rows.forEach(function (r) {
    if (r.statusCode && !known[r.statusCode] && !seen[r.statusCode]) {
      seen[r.statusCode] = 1; add.push([r.statusCode, r.statusName, "", "TRUE", today]); funnel[r.statusCode] = "";
    }
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 5).setValues(add);
  return funnel;
}

function epSyncStoreMaster_(sh, rows, today) {
  // 既存シートにも「募集手動」見出しを補う（手で書き足せる列）
  if (String(sh.getRange(1, 6).getValue() || "").trim() === "") sh.getRange(1, 6).setValue("募集手動");
  // 店舗ID→実際の店舗名（今回データから）
  var nameById = {};
  rows.forEach(function (r) { if (r.storeId && r.storeName && !nameById[r.storeId]) nameById[r.storeId] = r.storeName; });

  var vals = sh.getDataRange().getValues(), known = {}, fixes = [];
  for (var i = 1; i < vals.length; i++) {
    var id = vals[i][0]; if (id === "") continue; known[id] = 1;
    // 表示名が空 or 数字だけ（＝店舗IDのまま）で、実名が分かるなら直す
    var disp = String(vals[i][1] || "").trim();
    if ((disp === "" || /^\d+$/.test(disp)) && nameById[id]) fixes.push([i + 1, nameById[id]]);
  }
  fixes.forEach(function (f) { sh.getRange(f[0], 2).setValue(f[1]); });

  var add = [], seen = {};
  rows.forEach(function (r) {
    if (r.storeId && !known[r.storeId] && !seen[r.storeId]) { seen[r.storeId] = 1; add.push([r.storeId, r.storeName, "", "", today, ""]); }
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 6).setValues(add);
}

// raw_応募者の列定義（24列）。列を増やしたらここだけ直せばよい。
var RAW_HEADER = ["応募者コード", "氏名", "フリガナ", "ステータスコード", "ステータス",
  "店舗ID", "店舗名", "電話番号", "電話番号_数字", "tel_link", "メール", "媒体", "応募日時",
  "面接日時", "入社日", "重複", "変更履歴", "メモ", "年齢", "性別", "現在の職業",
  "初回取得日", "最終更新日", "消失"];

function epUpsertRaw_(sh, rows, today) {
  var W = RAW_HEADER.length;                 // 24
  var vals = sh.getDataRange().getValues();
  var oldHdr = vals.length ? vals[0] : [];
  var fsCol = oldHdr.indexOf("初回取得日"); // 旧スキーマ(20列)でも名前で位置を特定
  var scCol = oldHdr.indexOf("ステータス"); // 前回のステータス名（差分検知用）
  // 旧行を「見出し名」で引くヘルパ（新旧スキーマ混在に強い）
  function pick(row, name, alt) {
    var i = oldHdr.indexOf(name); if (i < 0 && alt) i = oldHdr.indexOf(alt);
    return i >= 0 ? row[i] : "";
  }
  var firstSeen = {}, prevStatus = {};
  for (var i = 1; i < vals.length; i++) if (vals[i][0] !== "") {
    firstSeen[vals[i][0]] = (fsCol >= 0 ? vals[i][fsCol] : "") || today;
    prevStatus[vals[i][0]] = scCol >= 0 ? String(vals[i][scCol] || "") : "";
  }

  var hadPrior = false; for (var pk in prevStatus) { hadPrior = true; break; } // 初回(空)は通知しない
  var incoming = {}, added = 0, changed = 0, newByStore = {}, totalByStore = {};
  var out = rows.map(function (r) {
    incoming[r.code] = 1;
    var sname = epCleanStore_(String(r.storeName || "").trim()) || "(店舗不明)";
    totalByStore[sname] = (totalByStore[sname] || 0) + 1;                  // 現在の応募者数(店舗別)
    if (!(r.code in prevStatus)) { added++; if (hadPrior) newByStore[sname] = (newByStore[sname] || 0) + 1; } // 新規応募
    else if (String(prevStatus[r.code]) !== String(r.statusName)) changed++; // ステータス変更
    return [r.code, r.name, r.kana, r.statusCode, r.statusName, r.storeId, r.storeName,
      r.telRaw, r.tel, r.tel ? "tel:" + r.tel : "", r.email, r.media, r.appliedAt,
      r.interviewAt, r.hiredAt, r.dup ? "重複" : "", r.history, r.memo,
      (r.age == null ? "" : r.age), r.gender, r.occupation,
      firstSeen[r.code] || today, today, ""];
  });
  // 今回消えた応募者は履歴として残す（旧行も新スキーマ幅に整形）
  for (var k = 1; k < vals.length; k++) {
    var row = vals[k]; if (row[0] === "" || incoming[row[0]]) continue;
    out.push([pick(row, "応募者コード"), pick(row, "氏名"), pick(row, "フリガナ"),
      pick(row, "ステータスコード"), pick(row, "ステータス"), pick(row, "店舗ID"),
      epCleanStore_(pick(row, "店舗名")), pick(row, "電話番号"), pick(row, "電話番号_数字"),
      pick(row, "tel_link"), pick(row, "メール"), pick(row, "媒体"), pick(row, "応募日時"),
      pick(row, "面接日時"), pick(row, "入社日"), pick(row, "重複"),
      pick(row, "変更履歴", "変更履歴1"), pick(row, "メモ"), pick(row, "年齢"),
      pick(row, "性別"), pick(row, "現在の職業"),
      pick(row, "初回取得日") || today, today, "TRUE"]);
  }
  out.sort(function (a, b) { return String(a[0]) < String(b[0]) ? -1 : 1; });
  // 見出しを新スキーマへ強制更新（旧20列シートからの移行対応）
  sh.getRange(1, 1, 1, W).setValues([RAW_HEADER]);
  var clearW = Math.max(W, oldHdr.length);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, clearW).clearContent();
  if (out.length) sh.getRange(2, 1, out.length, W).setValues(out);
  return { added: added, changed: changed, newByStore: newByStore, totalByStore: totalByStore };  // 差分サマリ（ログ・通知用）
}

var SNAPSHOT_KEEP_DAYS = 92;   // 日次スナップショットは直近この日数だけ残す（古い分は自動削除で軽量化）

function epUpsertSnapshot_(sh, rows, funnel, today) {
  var vals = sh.getDataRange().getValues();
  var cut = new Date(); cut.setDate(cut.getDate() - SNAPSHOT_KEEP_DAYS);
  var cutStr = Utilities.formatDate(cut, "Asia/Tokyo", "yyyy-MM-dd");
  var keep = [];
  for (var i = 1; i < vals.length; i++) {
    var d = String(vals[i][0]);
    if (vals[i][0] !== "" && d !== today && d >= cutStr) keep.push(vals[i].slice(0, 8));
  }
  var add = rows.map(function (r) { return [today, r.code, r.name, r.statusCode, r.statusName, r.storeId, funnel[r.statusCode] || "", r.dup ? "重複" : ""]; });
  var all = keep.concat(add);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 8).clearContent();
  if (all.length) sh.getRange(2, 1, all.length, 8).setValues(all);
}

function epWriteDashboard_(sh, rows, funnel) {
  var total = rows.length, dup = 0, fc = {};
  var byStore = {}, byStatus = {}, byGender = {}, byAgeGroup = {}, byAge = {};
  FUNNEL_ORDER.forEach(function (s) { fc[s] = 0; });
  function inc(o, k) { k = (k === "" || k == null) ? "不明" : k; o[k] = (o[k] || 0) + 1; }
  rows.forEach(function (r) {
    if (r.dup) dup++;
    var st = funnel[r.statusCode] || "";
    if (fc[st] != null) fc[st]++;
    inc(byStore, r.storeName || r.storeId);                 // ① 応募店舗別
    inc(byStatus, r.statusName || r.statusCode);            // ② ステータス別（採用・連絡中 等）
    inc(byGender, r.gender);                                // ④ 性別
    inc(byAgeGroup, epAgeGroup_(r.age));                    // ③ 年齢層
    if (r.age != null) inc(byAge, String(r.age));           // ⑤ 年齢
  });
  var payload = {
    generated_at: Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"),
    total: total, duplicate_count: dup, duplicate_rate: total ? Math.round(dup / total * 1e4) / 1e4 : 0,
    funnel: fc,
    by_store: byStore, by_status: byStatus, by_gender: byGender,
    by_age_group: byAgeGroup, by_age: byAge
  };
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
  sh.getRange(2, 1, 3, 2).setValues([["json", JSON.stringify(payload)], ["generated_at", payload.generated_at], ["total", total]]);
}

function epLog_(started, result, n, note) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = epSheet_(ss, "_実行ログ", ["実行日時", "トリガ", "結果", "応募者数", "所要秒", "メモ"]);
  var sec = Math.round((new Date() - started) / 100) / 10;
  sh.appendRow([Utilities.formatDate(started, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"), "GAS", result, n, sec, note]);
}

// ========================= 補助 =========================

function epInstallTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "epRun") ScriptApp.deleteTrigger(t); });
  // 1日5回（日本時間 5 / 10 / 15 / 17 / 23 時）
  [5, 10, 15, 17, 23].forEach(function (h) {
    ScriptApp.newTrigger("epRun").timeBased().atHour(h).everyDays(1).inTimezone("Asia/Tokyo").create();
  });
}

function epSheet_(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  var first = sh.getRange(1, 1, 1, header.length).getValues()[0];
  if (first.join("") === "") sh.getRange(1, 1, 1, header.length).setValues([header]);
  return sh;
}

function epFetch_(url, opts, jar) {
  opts = opts || {}; opts.muteHttpExceptions = true; opts.headers = opts.headers || {};
  opts.headers["User-Agent"] = EP_UA; opts.headers["Accept-Language"] = "ja-JP,ja;q=0.9";
  if (EP_BASIC) opts.headers["Authorization"] = EP_BASIC;
  var ck = Object.keys(jar).map(function (k) { return k + "=" + jar[k]; }).join("; ");
  if (ck) opts.headers["Cookie"] = ck;
  var res = UrlFetchApp.fetch(url, opts);
  var s = res.getAllHeaders()["Set-Cookie"];
  if (s) { if (!Array.isArray(s)) s = [s]; s.forEach(function (c) { var kv = c.split(";")[0].split("="); if (kv.length >= 2) jar[kv[0].trim()] = kv.slice(1).join("=").trim(); }); }
  return res;
}

function epExtractForm_(html) {
  var forms = html.match(/<form[\s\S]*?<\/form>/gi) || [];
  for (var i = 0; i < forms.length; i++) {
    var f = forms[i]; if (!/type\s*=\s*["']?password/i.test(f)) continue;
    var action = (f.match(/<form[^>]*\baction\s*=\s*["']([^"']*)["']/i) || [])[1] || "";
    var inputs = {}, uf = "", pf = "", re = /<input\b[^>]*>/gi, m;
    while ((m = re.exec(f))) {
      var t = m[0], name = (t.match(/\bname\s*=\s*["']([^"']*)["']/i) || [])[1]; if (!name) continue;
      var ty = ((t.match(/\btype\s*=\s*["']([^"']*)["']/i) || [])[1] || "text").toLowerCase();
      inputs[name] = epUnescape_((t.match(/\bvalue\s*=\s*["']([^"']*)["']/i) || [])[1] || "");
      if (ty === "password" && !pf) pf = name; else if ((ty === "text" || ty === "email") && !uf) uf = name;
    }
    if (!uf) for (var k in inputs) if (k !== pf) { uf = k; break; }
    return { action: epUnescape_(action), inputs: inputs, userField: uf, passField: pf };
  }
  return null;
}

function epAbsUrl_(u, base) {
  if (/^https?:\/\//i.test(u)) return u;
  var o = base.match(/^(https?:\/\/[^\/]+)/i)[1];
  return u.charAt(0) === "/" ? o + u : base.replace(/[^\/]*$/, "") + u;
}

function epUnescape_(s) { return String(s).replace(/&amp;/g, "&").replace(/&#38;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }

function epBool_(v) { v = String(v || "").trim().toLowerCase(); return v === "1" || v === "true" || v === "○" || v === "◯" || v === "あり" || v === "重複" || v === "yes"; }

// 全角英数を半角へ（年齢・日付が全角でも拾えるように）
function epZenHan_(s) {
  return String(s == null ? "" : s).replace(/[０-９Ａ-Ｚａ-ｚ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
}

// 生年月日→満年齢（YYYY/MM/DD, YYYY-MM-DD, YYYYMMDD 等に対応）
function epAge_(s) {
  if (!s) return null;
  var m = epZenHan_(s).match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/);
  if (!m) return null;
  var by = +m[1], bm = +m[2], bd = +m[3];
  if (by < 1900 || bm < 1 || bm > 12) return null;
  var now = new Date(), age = now.getFullYear() - by;
  if ((now.getMonth() + 1) < bm || ((now.getMonth() + 1) === bm && now.getDate() < bd)) age--;
  return (age < 0 || age > 120) ? null : age;
}

// 年齢→年齢層
function epAgeGroup_(age) {
  if (age == null) return "不明";
  if (age < 20) return "〜19歳";
  if (age < 30) return "20代";
  if (age < 40) return "30代";
  if (age < 50) return "40代";
  if (age < 60) return "50代";
  return "60代〜";
}

function epDecode_(res, ct) {
  // 生バイトから読み直すのがGASでの鉄則（getContentText等は壊すことがある）
  var blob = Utilities.newBlob(res.getContent());
  var cands = [];
  var mcs = ct && String(ct).match(/charset=([\w\-]+)/i);
  if (mcs) cands.push(mcs[1]);           // 宣言charset(MS932等)を最優先
  cands = cands.concat(["MS932", "Shift_JIS", "Windows-31J", "UTF-8"]);
  var best = "", bestBad = 1e9;
  for (var i = 0; i < cands.length; i++) {
    try {
      var t = blob.getDataAsString(cands[i]);
      var bad = (t.match(/�/g) || []).length;   // 文字化け(置換文字)の数
      if (bad < bestBad) { bestBad = bad; best = t; }
      if (bad === 0) break;
    } catch (e) { }
  }
  return best;
}

// CSV全体を「レコード（行）の配列」に。各行はセルの配列。改行/カンマのクオート対応。
function epSplitRecords_(text) {
  var records = [], row = [], cell = "", inQ = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); records.push(row); row = []; cell = ""; }
      else if (ch === "\r") { /* skip */ }
      else cell += ch;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); records.push(row); }
  return records;
}
