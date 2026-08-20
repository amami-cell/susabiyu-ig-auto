/**
 * 求人専用PWAのWeb Push購読者を管理する（インスタとは別の独立した購読リスト）。
 * 求人しか使わない人がこのリストに入り、募集通知だけを受け取る。
 * 保存先: 募集スプレッドシートの "_購読" タブ [endpoint, subscription, prefs, ua, 登録日時]。
 * 送信役(recruit_push.py)は /exec?subs=list で読む。
 */
var EP_SUBS_SHEET = "_購読";
var EP_SUBS_HDR = ["endpoint", "subscription", "prefs", "ua", "登録日時"];

/** 購読を登録/更新（endpointで重複排除）。 */
function epSubRegister_(obj) {
  obj = obj || {};
  var ep = String(obj.ep || "");
  var sub = String(obj.sub || "");
  if (!ep || !sub) return { ok: false, error: "no endpoint/subscription" };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = epSheet_(ss, EP_SUBS_SHEET, EP_SUBS_HDR);
  var v = sh.getDataRange().getValues();
  var now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]) === ep) {
      sh.getRange(i + 1, 2).setValue(sub);
      if (obj.prefs != null) sh.getRange(i + 1, 3).setValue(String(obj.prefs));
      if (obj.ua != null) sh.getRange(i + 1, 4).setValue(String(obj.ua));
      return { ok: true, updated: true };
    }
  }
  sh.appendRow([ep, sub, String(obj.prefs || ""), String(obj.ua || ""), now]);
  return { ok: true, added: true };
}

/** 購読を解除（endpoint一致の行を削除）。 */
function epSubUnregister_(ep) {
  ep = String(ep || "");
  if (!ep) return { ok: false };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(EP_SUBS_SHEET);
  if (!sh || sh.getLastRow() < 2) return { ok: true, removed: 0 };
  var v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) if (String(v[i][0]) === ep) sh.deleteRow(i + 1);
  return { ok: true };
}

/** 購読一覧を返す（送信役が読む）。key未設定なら誰でも可（推奨は設定）。 */
function epSubList_(key) {
  var need = PropertiesService.getScriptProperties().getProperty("EP_PUSH_KEY") || "";
  if (need && String(key || "") !== need) return { ok: false, error: "forbidden" };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(EP_SUBS_SHEET);
  if (!sh || sh.getLastRow() < 2) return { ok: true, subs: [] };
  var v = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    if (!v[i][1]) continue;
    out.push({ subscription: String(v[i][1]), prefs: String(v[i][2] || ""), endpoint: String(v[i][0]) });
  }
  return { ok: true, subs: out };
}

/** 送信側から「失効(404/410)」を通知されたendpointを掃除する。 */
function epSubPrune_(eps) {
  if (!eps || !eps.length) return { ok: true, removed: 0 };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(EP_SUBS_SHEET);
  if (!sh || sh.getLastRow() < 2) return { ok: true, removed: 0 };
  var dead = {}; eps.forEach(function (e) { dead[String(e)] = 1; });
  var v = sh.getDataRange().getValues(), n = 0;
  for (var i = v.length - 1; i >= 1; i--) if (dead[String(v[i][0])]) { sh.deleteRow(i + 1); n++; }
  return { ok: true, removed: n };
}
