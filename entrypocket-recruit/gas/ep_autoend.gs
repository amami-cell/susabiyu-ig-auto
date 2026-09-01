/**
 * 掲載終了からN日（既定14日）で、自動的に「求人結果報告」へ回す仕組み。
 *
 * 仕組み：
 *  - 毎回の取得(epRun ⑤)で、EntryPocketの「掲載中の求人原稿がある店舗」を _掲載監視 に記録し、
 *    各店舗の「最終掲載中日」を更新する（＝この日を最後に掲載中だった）。
 *  - 掲載が止まった店舗（＝今は掲載中でない）で、最終掲載中日からN日経過したら
 *    epEndRecruit を自動実行して結果行を用意し、募集中タブから外す。
 *  - 手入力済みの数値（応募総数・採用人数・備考など）は絶対に上書きしない（auto:true で保護）。
 *  - 一度自動終了したら _掲載監視 に印を付け、再掲載されたら印を消して募集中へ戻す。
 *
 * 日数は Script Property `EP_AUTOEND_DAYS`（数値）で変更可。既定14。0以下で無効化。
 * 手動の「募集終了」ボタンはこれとは別に従来どおり使える。
 */

var EP_AUTOEND_SHEET = "_掲載監視";
var EP_AUTOEND_HDR = ["店舗キー", "表示名", "最終掲載中日", "自動終了"];

function epAutoEndDays_() {
  var v = PropertiesService.getScriptProperties().getProperty("EP_AUTOEND_DAYS");
  var n = parseInt(v, 10);
  return (v == null || isNaN(n)) ? 14 : n;   // 既定14日
}

/** 掲載中店舗の「最終掲載中日」を記録し、再掲載された店舗の自動終了印を解除する。
 *  names==null（取得失敗）のときは何もしない。 */
function epTrackLive_(ss, names) {
  if (names == null) return;
  var today = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd");
  var sh = epSheet_(ss, EP_AUTOEND_SHEET, EP_AUTOEND_HDR);
  var v = sh.getDataRange().getValues();
  var rowByKey = {};
  for (var i = 1; i < v.length; i++) rowByKey[String(v[i][0])] = i + 1;
  names.forEach(function (nm) {
    var k = epNormStore_(epCleanStore_(String(nm || "").trim()));
    if (!k) return;
    var r = rowByKey[k];
    if (r) {
      var wasAuto = String(v[r - 1][3] || "");
      sh.getRange(r, 2, 1, 3).setValues([[nm, today, ""]]);   // 表示名/最終掲載中日/自動終了印クリア
      if (wasAuto) { try { epSetStoreManual_(nm, ""); } catch (e) { } }  // 再掲載→募集中へ戻す
    } else {
      sh.appendRow([k, nm, today, ""]);
    }
  });
}

/** 最終掲載中日からN日経過し、今は掲載中でない店舗を自動で結果報告へ回す。
 *  live は現在掲載中の店舗名リスト（取得成功時のみ）。null なら判定しない（誤終了防止）。 */
function epAutoEndExpired_(ss, live) {
  var DAYS = epAutoEndDays_();
  if (!(DAYS > 0)) return 0;                 // 0以下で無効
  if (live == null) return 0;                // 掲載中リストが信用できない回はスキップ
  var sh = ss.getSheetByName(EP_AUTOEND_SHEET);
  if (!sh || sh.getLastRow() < 2) return 0;

  var liveSet = {};
  live.forEach(function (nm) { var k = epNormStore_(epCleanStore_(String(nm || "").trim())); if (k) liveSet[k] = 1; });

  var v = sh.getDataRange().getValues();
  var now = new Date(), moved = 0;
  for (var i = 1; i < v.length; i++) {
    var key = String(v[i][0]), disp = String(v[i][1] || ""), last = v[i][2], done = String(v[i][3] || "");
    if (done) continue;                      // 既に自動終了済み
    if (liveSet[key]) continue;              // 今も掲載中
    var d = epDate_(last); if (!d) continue;
    var days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days < DAYS) continue;               // まだN日経っていない

    var o = epBuildAutoResult_(ss, key, disp, d);
    if (!o) { sh.getRange(i + 1, 4).setValue("対象なし"); continue; }
    o.auto = true;                           // 既存の手入力を上書きしない
    var res;
    try { res = epEndRecruit(o); } catch (e) { res = { ok: false, error: String(e) }; }
    var stamp = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM-dd");
    sh.getRange(i + 1, 4).setValue(res && res.ok ? ("自動終了 " + stamp) : ("失敗 " + stamp));
    if (res && res.ok) moved++;
  }
  if (moved) { try { epImportPostings_(ss); dashStoreCache_(); } catch (e) { } }
  return moved;
}

/** raw_応募者 を店舗で集計して、自動結果登録用のペイロードを作る。
 *  数値は目安（採用単価/率は元スプシの数式が計算）。手入力保護は epEndRecruit(auto) 側で担保。 */
function epBuildAutoResult_(ss, key, disp, lastLive) {
  var raw = ss.getSheetByName("raw_応募者");
  var apps = 0, hires = 0, minT = 0;
  if (raw && raw.getLastRow() > 1) {
    var v = raw.getDataRange().getValues(), h = v[0], ci = {};
    h.forEach(function (x, i) { ci[String(x)] = i; });
    var cStore = ci["店舗名"], cCode = ci["ステータスコード"], cStat = ci["ステータス"], cApp = ci["応募日時"], cGone = ci["消失"];
    if (cStore != null) {
      for (var i = 1; i < v.length; i++) {
        if (epNormStore_(epCleanStore_(String(v[i][cStore] || ""))) !== key) continue;
        if (cGone != null && String(v[i][cGone] || "") !== "") continue;   // 消失は除外
        apps++;
        var sc = String(v[i][cCode] || ""), sn = String(v[i][cStat] || "");
        if (sc === "80" || (sn.indexOf("採用") >= 0 && sn.indexOf("不採用") < 0)) hires++;
        if (cApp != null) { var d = epDate_(v[i][cApp]); if (d) { var t = d.getTime(); if (!minT || t < minT) minT = t; } }
      }
    }
  }
  var start = minT ? Utilities.formatDate(new Date(minT), "Asia/Tokyo", "yyyy-MM-dd") : "";
  var end = lastLive ? Utilities.formatDate(lastLive, "Asia/Tokyo", "yyyy-MM-dd")
                     : Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd");
  // note は渡さない（既存の手書きメモを消さないため）
  return { store: disp || key, start: start, end: end, apps: apps, hires: hires, quit: "" };
}
