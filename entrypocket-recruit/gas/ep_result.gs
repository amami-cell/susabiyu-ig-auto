/**
 * 求人結果（応募総数・採用人数・退職人数・備考）をアプリから元スプレッドシートへ書き戻す。
 *
 * - 率/単価は元スプシ側の数式で自動計算されるので触らない（入力4項目だけ書く）。
 * - 誤爆防止：指定行の店舗名が一致するか検証してから書く。ズレていたら店舗名＋開始日で再特定。
 * - 安全スイッチ EP_WRITE_ENABLED=1 のときだけ書き込む。全部 _結果入力ログ に記録。
 * - 書き込み後は「求人打ち出し」を取り込み直して即アプリ反映。
 *   Notionへの反映は、元スプシの「プロジェクト実行」を押す運用（別プロジェクトのため自動起動はしない）。
 */
function epSaveResult(o) {
  o = o || {};
  if (typeof epWriteEnabled_ !== 'function' || !epWriteEnabled_()) return { ok: false, error: "書き込みが無効です（設定 EP_WRITE_ENABLED=1 で有効化）" };
  var store = epCleanStore_(String(o.store || "").replace(/\s+/g, " ").trim());
  if (!store) return { ok: false, error: "店舗が空です" };

  var ext;
  try { ext = SpreadsheetApp.openById(NOTION_POSTINGS_SHEET_ID); }
  catch (e) { return { ok: false, error: "スプレッドシートを開けません: " + e }; }

  // シート特定（元シート名優先。無ければ「店舗名」見出しのタブ）
  var sh = o.srcSheet ? ext.getSheetByName(o.srcSheet) : null;
  if (!sh) {
    var shs = ext.getSheets();
    for (var s = 0; s < shs.length; s++) {
      var w = Math.min(40, shs[s].getLastColumn() || 1);
      var head = shs[s].getRange(1, 1, 1, w).getValues()[0].map(function (x) { return String(x || "").replace(/　/g, "").trim(); });
      if (head.indexOf("店舗名") >= 0) { sh = shs[s]; break; }
    }
  }
  if (!sh) return { ok: false, error: "対象シートが見つかりません" };

  var vals = sh.getDataRange().getValues();
  var hdr = vals[0].map(function (x) { return String(x || "").replace(/　/g, "").trim(); });
  var col = function (key) { for (var j = 0; j < POST_COLMAP[key].length; j++) { var p = hdr.indexOf(POST_COLMAP[key][j]); if (p >= 0) return p; } return -1; };
  var cStore = col("store"), cApps = col("apps"), cHire = col("hired"), cQuit = col("quit"), cNote = col("note"), cStart = col("start");
  if (cStore < 0) return { ok: false, error: "店舗名の列が見つかりません" };

  var norm = function (v) { return epCleanStore_(String(v || "").replace(/\s+/g, " ").trim()); };

  // 行特定：まず控えた行番号→店舗名一致で検証。ダメなら店舗名＋開始日で探索。
  var row = -1, r0 = parseInt(o.srcRow, 10);
  if (r0 >= 2 && r0 <= vals.length && norm(vals[r0 - 1][cStore]) === store) row = r0;
  if (row < 0) {
    var want = o.start ? String(o.start) : "";
    for (var i = 1; i < vals.length; i++) {
      if (norm(vals[i][cStore]) !== store) continue;
      if (want && cStart >= 0) { var d = epDate_(vals[i][cStart]); if (!d) continue; if (Utilities.formatDate(d, "Asia/Tokyo", "yyyy-MM-dd") !== want) continue; }
      row = i + 1; break;
    }
  }
  if (row < 0) return { ok: false, error: "対象行が見つかりません（店舗名/期間が一致せず）" };

  // 書き込み（入力4項目だけ。数式列＝採用単価/率/退職率 は触らない）
  if (cApps >= 0 && o.apps != null && String(o.apps) !== "") sh.getRange(row, cApps + 1).setValue(+o.apps || 0);
  if (cHire >= 0 && o.hires != null && String(o.hires) !== "") sh.getRange(row, cHire + 1).setValue(+o.hires || 0);
  if (cQuit >= 0 && o.quit != null && String(o.quit) !== "") sh.getRange(row, cQuit + 1).setValue(+o.quit || 0);
  if (cNote >= 0 && o.note != null) sh.getRange(row, cNote + 1).setValue(String(o.note));

  epLogResult_(store, row, o);

  // 即アプリ反映（次の自動取得を待たない）
  try { var ss = SpreadsheetApp.getActiveSpreadsheet(); epImportPostings_(ss); dashStoreCache_(); } catch (e) { }

  return { ok: true, row: row, store: store };
}

function epLogResult_(store, row, o) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = epSheet_(ss, "_結果入力ログ", ["日時", "店舗", "元行", "応募総数", "採用人数", "退職人数", "備考"]);
  sh.appendRow([Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"), store, row,
    (o.apps == null ? "" : o.apps), (o.hires == null ? "" : o.hires), (o.quit == null ? "" : o.quit), String(o.note || "")]);
}
