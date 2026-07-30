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
 *   epSetup … 1回だけ実行。取得を試し、成功したら毎朝8時の自動取得を設置する。
 *   epRun   … 毎回の取得本体（トリガーから自動で呼ばれる）。手動でも実行可。
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
  status_code: ["ステータスコード", "対応状況コード", "選考ステータスコード"],
  status_name: ["ステータス", "対応状況", "選考ステータス", "ステータス名"],
  store_id: ["店舗ID", "店舗コード", "勤務地ID", "求人ID", "クライアントID", "クライアントコード"],
  store_name: ["店舗名", "勤務地", "求人名", "クライアント名", "クライアント", "応募店舗", "募集店舗"],
  tel: ["電話番号", "TEL", "携帯電話", "連絡先"],
  email: ["メールアドレス", "Email", "メール"],
  media: ["媒体名", "媒体", "応募媒体", "流入元", "応募経路"],
  applied_at: ["応募日時", "応募日", "エントリー日時", "登録日時"],
  interview_at: ["面接日時", "面接予定日時", "面接日"],
  hired_at: ["入社日", "入社予定日", "採用日"],
  is_duplicate: ["重複フラグ", "重複", "重複応募"],
  change_history: ["変更履歴1", "変更履歴", "対応履歴"],
  gender: ["性別"],
  birth: ["生年月日", "生年月日（西暦）", "誕生日"]
};

// ========================= エントリポイント =========================

function epSetup() {
  var ok = epRun();
  if (ok) {
    epInstallTrigger_();
    Logger.log("★★ 完成しました。毎朝8時に自動で取得します。もう触らなくてOKです。");
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

    epWriteSheets_(parsed);
    Logger.log("✓ ④ スプレッドシートへ蓄積完了");
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
    rows.push({
      code: code, name: get("name"), kana: get("name_kana"),
      statusCode: get("status_code"), statusName: get("status_name"),
      storeId: get("store_id"), storeName: get("store_name"),
      telRaw: telRaw, tel: telRaw.replace(/\D/g, ""), email: get("email"),
      media: get("media"), appliedAt: get("applied_at"),
      interviewAt: get("interview_at"), hiredAt: get("hired_at"),
      dup: epBool_(get("is_duplicate")), history: get("change_history"),
      gender: get("gender"), birth: birth, age: epAge_(birth)
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

  // master_店舗（新店舗自動追記）
  var mstore = epSheet_(ss, "master_店舗", ["店舗ID", "表示名", "ブランド", "エリア", "初出日"]);
  epSyncStoreMaster_(mstore, rows, today);

  // raw_応募者（全書き換え。今回消えた応募者は消失フラグで残す）
  var raw = epSheet_(ss, "raw_応募者", ["応募者コード", "氏名", "フリガナ", "ステータスコード", "ステータス",
    "店舗ID", "店舗名", "電話番号", "電話番号_数字", "tel_link", "メール", "媒体", "応募日時",
    "面接日時", "入社日", "重複", "変更履歴1", "初回取得日", "最終更新日", "消失"]);
  epUpsertRaw_(raw, rows, today);

  // snapshot_日次（当日分を入れ替え）
  var snap = epSheet_(ss, "snapshot_日次", ["日付", "応募者コード", "氏名", "ステータスコード", "ステータス", "店舗ID", "ファネル段階", "重複"]);
  epUpsertSnapshot_(snap, rows, funnel, today);

  // dashboard_cache（集計）
  var dash = epSheet_(ss, "dashboard_cache", ["key", "value"]);
  epWriteDashboard_(dash, rows, funnel);
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
  var vals = sh.getDataRange().getValues(), known = {};
  for (var i = 1; i < vals.length; i++) if (vals[i][0] !== "") known[vals[i][0]] = 1;
  var add = [], seen = {};
  rows.forEach(function (r) {
    if (r.storeId && !known[r.storeId] && !seen[r.storeId]) { seen[r.storeId] = 1; add.push([r.storeId, r.storeName, "", "", today]); }
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 5).setValues(add);
}

function epUpsertRaw_(sh, rows, today) {
  var vals = sh.getDataRange().getValues();
  var firstSeen = {};
  for (var i = 1; i < vals.length; i++) if (vals[i][0] !== "") firstSeen[vals[i][0]] = vals[i][17] || today;
  var incoming = {};
  var out = rows.map(function (r) {
    incoming[r.code] = 1;
    return [r.code, r.name, r.kana, r.statusCode, r.statusName, r.storeId, r.storeName,
      r.telRaw, r.tel, r.tel ? "tel:" + r.tel : "", r.email, r.media, r.appliedAt,
      r.interviewAt, r.hiredAt, r.dup ? "重複" : "", r.history,
      firstSeen[r.code] || today, today, ""];
  });
  // 今回消えた応募者は履歴として残す
  for (var k = 1; k < vals.length; k++) {
    var row = vals[k]; if (row[0] === "" || incoming[row[0]]) continue;
    row = row.slice(0, 20); while (row.length < 20) row.push("");
    row[18] = today; row[19] = "TRUE"; out.push(row);
  }
  out.sort(function (a, b) { return String(a[0]) < String(b[0]) ? -1 : 1; });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 20).clearContent();
  if (out.length) sh.getRange(2, 1, out.length, 20).setValues(out);
}

function epUpsertSnapshot_(sh, rows, funnel, today) {
  var vals = sh.getDataRange().getValues();
  var keep = [];
  for (var i = 1; i < vals.length; i++) if (vals[i][0] !== "" && String(vals[i][0]) !== today) keep.push(vals[i].slice(0, 8));
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
  ScriptApp.newTrigger("epRun").timeBased().atHour(8).everyDays(1).inTimezone("Asia/Tokyo").create();
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

// 生年月日→満年齢（YYYY/MM/DD, YYYY-MM-DD, YYYYMMDD 等に対応）
function epAge_(s) {
  if (!s) return null;
  var m = String(s).match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/);
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
