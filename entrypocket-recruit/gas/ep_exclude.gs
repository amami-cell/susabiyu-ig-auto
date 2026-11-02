/**
 * 繰り返し応募（要注意リスト）の「誤検知」除外。
 * 端末をまたいで共有・永続するため、専用シート「名寄せ除外」に除外キーを保存する。
 * キー形式: 't:<電話の数字>' / 'm:<メール小文字>' / 'n:<正規化氏名>'
 * 認証は google.script.run（オーナー実行）経由のみ。外部doPost（取込キー）とは無関係。
 */
var REPEAT_EXCLUDE_SHEET = "名寄せ除外";

function repeatExcludeSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(REPEAT_EXCLUDE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(REPEAT_EXCLUDE_SHEET);
    sh.appendRow(["key", "氏名", "追加日時"]);
  }
  return sh;
}

/** 除外キーの配列を返す（表示側で突き合わせる）。 */
function repeatExcludeList_() {
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REPEAT_EXCLUDE_SHEET);
    if (!sh || sh.getLastRow() < 2) return [];
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    var out = {};
    v.forEach(function (r) { var k = String(r[0] || "").trim(); if (k) out[k] = 1; });
    return Object.keys(out);
  } catch (e) { return []; }
}

/**
 * 誤検知の除外を追加／解除する。
 * o = { keys:[...], name:'', on:true|false }
 *   on=true  … keys を除外に追加（既にあればスキップ）
 *   on=false … keys を除外から解除（該当行を削除）
 * 戻り値: { ok, excluded:[...現在の全除外キー] }
 */
function epRepeatExclude(o) {
  try {
    o = o || {};
    var keys = (o.keys || []).map(function (k) { return String(k || "").trim(); }).filter(Boolean);
    if (!keys.length) return { ok: false, error: "対象キーがありません" };
    var sh = repeatExcludeSheet_();
    var last = sh.getLastRow();
    var existing = (last >= 2) ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0] || "").trim(); }) : [];
    if (o.on) {
      var add = keys.filter(function (k) { return existing.indexOf(k) < 0; });
      if (add.length) {
        var now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
        sh.getRange(sh.getLastRow() + 1, 1, add.length, 3)
          .setValues(add.map(function (k) { return [k, (o.name || ""), now]; }));
      }
    } else if (last >= 2) {
      var rows = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = rows.length - 1; i >= 0; i--) {
        if (keys.indexOf(String(rows[i][0] || "").trim()) >= 0) sh.deleteRow(i + 2);
      }
    }
    return { ok: true, excluded: repeatExcludeList_() };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
