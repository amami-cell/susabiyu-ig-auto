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

/**
 * 募集終了：EntryPocket由来の募集中店舗を「求人結果報告」へ移行する。
 *  - 元スプシ(NOTION_POSTINGS_SHEET_ID)に該当店舗の行が無ければ新規追加、あれば更新。
 *  - master_店舗 の手動フラグを「終了」にして、募集中タブから外す。
 *  - 応募総数/採用人数はアプリ側でCSVから自動集計した値を渡す（編集可）。
 */
function epEndRecruit(o) {
  o = o || {};
  if (typeof epWriteEnabled_ !== 'function' || !epWriteEnabled_()) return { ok: false, error: '書き込みが無効化されています（EP_WRITE_ENABLED="0" を解除）' };
  var store = epCleanStore_(String(o.store || "").replace(/\s+/g, " ").trim());
  if (!store) return { ok: false, error: "店舗が空です" };

  var ext;
  try { ext = SpreadsheetApp.openById(NOTION_POSTINGS_SHEET_ID); }
  catch (e) { return { ok: false, error: "スプレッドシートを開けません: " + e }; }

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
  var cStore = col("store"), cStart = col("start"), cEnd = col("end"), cApps = col("apps"), cHire = col("hired"), cQuit = col("quit"), cNote = col("note");
  if (cStore < 0) return { ok: false, error: "店舗名の列が見つかりません" };
  var norm = function (v) { return epCleanStore_(String(v || "").replace(/\s+/g, " ").trim()); };

  // 既存行を探す（重複防止）：①控えた元行を店舗名で検証 → ②店舗＋開始日 → ③店舗のみ（結果未入力の行を優先）。無ければ新規追加。
  var row = -1, want = o.start ? String(o.start) : "";
  var r0 = parseInt(o.srcRow, 10);
  if (r0 >= 2 && r0 <= vals.length && norm(vals[r0 - 1][cStore]) === store) row = r0;   // ① アプリが狙った既存行
  if (row < 0 && want && cStart >= 0) {                                                   // ② 店舗＋開始日が一致
    for (var i = 1; i < vals.length; i++) {
      if (norm(vals[i][cStore]) !== store) continue;
      var d = epDate_(vals[i][cStart]); if (!d || Utilities.formatDate(d, "Asia/Tokyo", "yyyy-MM-dd") !== want) continue;
      row = i + 1; break;
    }
  }
  if (row < 0) {                                                                          // ③ 店舗一致・結果未入力の行があれば上書き（重複させない）
    var empty = -1, any = -1;
    for (var i2 = 1; i2 < vals.length; i2++) {
      if (norm(vals[i2][cStore]) !== store) continue;
      if (any < 0) any = i2 + 1;
      var noApps = (cApps < 0) || String(vals[i2][cApps] || "") === "";
      var noHire = (cHire < 0) || String(vals[i2][cHire] || "") === "";
      if (noApps && noHire && empty < 0) empty = i2 + 1;
    }
    if (empty > 0) row = empty;
  }
  var created = false;
  var setIf = function (r, c, v) { if (c >= 0 && v != null && String(v) !== "") sh.getRange(r, c + 1).setValue(v); };
  if (row < 0) {
    var arr = []; for (var k = 0; k < hdr.length; k++) arr.push("");
    arr[cStore] = o.store || store;
    if (cStart >= 0 && o.start) arr[cStart] = o.start;
    if (cEnd >= 0 && o.end) arr[cEnd] = o.end;
    if (cApps >= 0 && o.apps != null && String(o.apps) !== "") arr[cApps] = +o.apps || 0;
    if (cHire >= 0 && o.hires != null && String(o.hires) !== "") arr[cHire] = +o.hires || 0;
    if (cQuit >= 0 && o.quit != null && String(o.quit) !== "") arr[cQuit] = +o.quit || 0;
    if (cNote >= 0 && o.note != null) arr[cNote] = String(o.note);
    sh.appendRow(arr);
    row = sh.getLastRow(); created = true;
  } else {
    // auto（自動終了）のときは、既に値が入っているセルは絶対に上書きしない（手入力を保護）。
    var put = function (c, v) {
      if (c < 0 || v == null || String(v) === "") return;
      if (o.auto && String(vals[row - 1][c] || "") !== "") return;
      sh.getRange(row, c + 1).setValue(v);
    };
    if (cStart >= 0 && o.start && !vals[row - 1][cStart]) sh.getRange(row, cStart + 1).setValue(o.start);
    put(cEnd, o.end);
    put(cApps, (o.apps == null || o.apps === "") ? "" : (+o.apps || 0));
    put(cHire, (o.hires == null || o.hires === "") ? "" : (+o.hires || 0));
    put(cQuit, (o.quit == null || o.quit === "") ? "" : (+o.quit || 0));
    if (cNote >= 0 && o.note != null && !(o.auto && String(vals[row - 1][cNote] || "") !== "")) sh.getRange(row, cNote + 1).setValue(String(o.note));
  }

  // 募集中から外す（master_店舗 の手動フラグ＝終了）
  try { epSetStoreManual_(o.store || store, "終了"); } catch (e) { }

  epLogResult_(store, row, o);
  // auto はバッチ側(epAutoEndExpired_)でまとめて取り込むので、ここでは再取込しない。
  if (!o.auto) { try { var ss = SpreadsheetApp.getActiveSpreadsheet(); epImportPostings_(ss); dashStoreCache_(); } catch (e) { } }
  return { ok: true, row: row, store: store, created: created };
}

/**
 * 【緊急用・パスワード必須】求人結果報告(元スプシ)の行を1件削除する。
 * 完全無料枠など結果報告が不要な打ち出しを消す用。パスワードは "8888"。
 * 誤爆防止：指定行の店舗名が一致するか検証してから削除。削除内容は _削除ログ に残す。
 */
function epDeletePosting(o) {
  o = o || {};
  if (String(o.pass || "") !== "8888") return { ok: false, error: "パスワードが違います" };
  if (typeof epWriteEnabled_ === 'function' && !epWriteEnabled_()) return { ok: false, error: "書き込みが無効です" };
  var store = epCleanStore_(String(o.store || "").replace(/\s+/g, " ").trim());
  if (!store) return { ok: false, error: "店舗が空です" };

  var ext;
  try { ext = SpreadsheetApp.openById(NOTION_POSTINGS_SHEET_ID); }
  catch (e) { return { ok: false, error: "スプレッドシートを開けません: " + e }; }

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
  var cStore = col("store"), cStart = col("start");
  if (cStore < 0) return { ok: false, error: "店舗名の列が見つかりません" };
  var norm = function (v) { return epCleanStore_(String(v || "").replace(/\s+/g, " ").trim()); };

  // 行特定：控えた行番号→店舗名で検証。ダメなら店舗名＋開始日で探索。
  var row = -1, r0 = parseInt(o.srcRow, 10);
  if (r0 >= 2 && r0 <= vals.length && norm(vals[r0 - 1][cStore]) === store) row = r0;
  if (row < 0) {
    var want = o.start ? String(o.start) : "";
    for (var i = 1; i < vals.length; i++) {
      if (norm(vals[i][cStore]) !== store) continue;
      if (want && cStart >= 0) { var d = epDate_(vals[i][cStart]); if (!d || Utilities.formatDate(d, "Asia/Tokyo", "yyyy-MM-dd") !== want) continue; }
      row = i + 1; break;
    }
  }
  if (row < 0) return { ok: false, error: "対象行が見つかりません（店舗名/期間が一致せず）" };

  var snapshot = vals[row - 1].join(" | ");
  sh.deleteRow(row);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var log = epSheet_(ss, "_削除ログ", ["日時", "店舗", "元行", "削除内容"]);
    log.appendRow([Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"), store, row, String(snapshot).slice(0, 800)]);
  } catch (e) { }
  try { var ss2 = SpreadsheetApp.getActiveSpreadsheet(); epImportPostings_(ss2); dashStoreCache_(); } catch (e) { }
  return { ok: true, store: store, row: row };
}

/**
 * 【診断・書き込みなし】求人結果の重複を洗い出す（同じ店舗で期間が重なる＝二重登録の疑い）。
 * Apps Scriptで epDiagDupes を実行 → ログを貼る。求人は2〜4週間の打ち出し前提。
 */
function epDiagDupes() {
  var rows = (typeof epFetchNotionRows_ === 'function' ? epFetchNotionRows_() : null), src = 'Notion';
  if (!rows || !rows.length) { rows = (typeof epFetchPostingSheetRows_ === 'function' ? epFetchPostingSheetRows_() : null); src = 'スプレッドシート'; }
  if (!rows || !rows.length) { Logger.log('結果データ0件'); return; }
  var DEF = 21 * 86400000;
  var fmt_ = function (v) { var d = epDate_(v); return d ? Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd') : String(v || ''); };
  Logger.log('■ 求人結果 ' + rows.length + '件（' + src + '）の重複チェック（同じ店舗＋期間が重なる／終了不明は約3週間とみなす）');
  var by = {};
  rows.forEach(function (r) { var k = epNormStore_(epCleanStore_(r.store || '')); if (k) (by[k] = by[k] || []).push(r); });
  var found = 0;
  Object.keys(by).forEach(function (k) {
    var arr = by[k]; if (arr.length < 2) return;
    var flagged = [];
    for (var i = 0; i < arr.length; i++) for (var j = i + 1; j < arr.length; j++) {
      var s1 = epDate_(arr[i].start), s2 = epDate_(arr[j].start); if (!s1 || !s2) continue;
      var e1 = epDate_(arr[i].end) || new Date(s1.getTime() + DEF), e2 = epDate_(arr[j].end) || new Date(s2.getTime() + DEF);
      if (s1 <= e2 && s2 <= e1) { if (flagged.indexOf(arr[i]) < 0) flagged.push(arr[i]); if (flagged.indexOf(arr[j]) < 0) flagged.push(arr[j]); }
    }
    if (flagged.length > 1) {
      found++;
      Logger.log('  ⚠️ ' + arr[0].store + '：' + flagged.length + '件 重複の疑い');
      flagged.forEach(function (p) { Logger.log('     ・' + fmt_(p.start) + '〜' + fmt_(p.end) + '  応募' + (p.apps || '-') + '/採用' + (p.hired || '-') + ' 媒体' + (p.media || '-')); });
    }
  });
  if (!found) Logger.log('  重複の疑いは見つかりませんでした。');
  Logger.log('=== 診断おわり（読み取りのみ）===');
}

/** 共有入力ページ用：対象行の現在値＋CSV自動集計を返す。ok:falseなら対象が見つからない。 */
function epEntryData_(o) {
  o = o || {};
  var store = epCleanStore_(String(o.st || o.store || "").replace(/\s+/g, " ").trim());
  var out = { ok: false, s: o.s || "", r: o.r || "", store: o.st || o.store || store, start: o.start || "", end: o.end || "", apps: "", hires: "", quit: "", note: "", autoApps: "", autoHires: "" };
  if (!store) return out;
  try {
    var ext = SpreadsheetApp.openById(NOTION_POSTINGS_SHEET_ID);
    var sh = o.s ? ext.getSheetByName(o.s) : null;
    if (!sh) {
      var shs = ext.getSheets();
      for (var i = 0; i < shs.length; i++) {
        var w = Math.min(40, shs[i].getLastColumn() || 1);
        var hd = shs[i].getRange(1, 1, 1, w).getValues()[0].map(function (x) { return String(x || "").replace(/　/g, "").trim(); });
        if (hd.indexOf("店舗名") >= 0) { sh = shs[i]; break; }
      }
    }
    if (sh) {
      var vals = sh.getDataRange().getValues();
      var hdr = vals[0].map(function (x) { return String(x || "").replace(/　/g, "").trim(); });
      var col = function (k) { for (var j = 0; j < POST_COLMAP[k].length; j++) { var p = hdr.indexOf(POST_COLMAP[k][j]); if (p >= 0) return p; } return -1; };
      var cStore = col("store"), cApps = col("apps"), cHire = col("hired"), cQuit = col("quit"), cNote = col("note"), cStart = col("start"), cEnd = col("end");
      var norm = function (v) { return epCleanStore_(String(v || "").replace(/\s+/g, " ").trim()); };
      var row = -1, r0 = parseInt(o.r, 10);
      if (r0 >= 2 && r0 <= vals.length && cStore >= 0 && norm(vals[r0 - 1][cStore]) === store) row = r0;
      if (row < 0 && cStore >= 0) {
        for (var k = 1; k < vals.length; k++) {
          if (norm(vals[k][cStore]) !== store) continue;
          if (o.start && cStart >= 0) { var d = epDate_(vals[k][cStart]); if (!d || Utilities.formatDate(d, "Asia/Tokyo", "yyyy-MM-dd") !== String(o.start)) continue; }
          row = k + 1; break;
        }
      }
      if (row >= 2) {
        out.ok = true; out.r = row; out.store = String(vals[row - 1][cStore] || out.store);
        if (cApps >= 0) out.apps = vals[row - 1][cApps]; if (cHire >= 0) out.hires = vals[row - 1][cHire];
        if (cQuit >= 0) out.quit = vals[row - 1][cQuit]; if (cNote >= 0) out.note = String(vals[row - 1][cNote] || "");
        if (cStart >= 0) { var ds = epDate_(vals[row - 1][cStart]); if (ds) out.start = Utilities.formatDate(ds, "Asia/Tokyo", "yyyy-MM-dd"); }
        if (cEnd >= 0) { var de = epDate_(vals[row - 1][cEnd]); if (de) out.end = Utilities.formatDate(de, "Asia/Tokyo", "yyyy-MM-dd"); }
      }
    }
  } catch (e) { }
  try { var ac = epEntryAutoCounts_(store, out.start, out.end); out.autoApps = ac.apps; out.autoHires = ac.hires; } catch (e2) { }
  out.ok = !!store;   // 店舗が分かれば入力可（既存行が無ければ保存時に新規作成）
  return out;
}

/** raw_応募者 から店舗×期間内の応募/採用を数える（共有入力ページの初期値用）。 */
function epEntryAutoCounts_(store, start, end) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), raw = ss.getSheetByName("raw_応募者");
  var a = 0, h = 0;
  if (raw && raw.getLastRow() > 1) {
    var v = raw.getDataRange().getValues(), hh = v[0], ci = {}; hh.forEach(function (x, i) { ci[String(x)] = i; });
    var cS = ci["店舗名"], cA = ci["応募日時"], cC = ci["ステータスコード"], cN = ci["ステータス"], cG = ci["消失"];
    var st = start ? epDate_(start) : null, en = end ? epDate_(end) : null, endEx = en ? new Date(en.getTime() + 86400000) : null;
    var key = epNormStore_(store);
    for (var i = 1; i < v.length; i++) {
      if (cS == null || epNormStore_(epCleanStore_(String(v[i][cS] || ""))) !== key) continue;
      if (cG != null && String(v[i][cG] || "") !== "") continue;
      var d = cA != null ? epDate_(v[i][cA]) : null;
      if (st && (!d || d < st)) continue; if (endEx && d && d >= endEx) continue;
      a++; var sc = String(v[i][cC] || ""), sn = String(v[i][cN] || ""); if (sc === "80" || sn.indexOf("採用") >= 0) h++;
    }
  }
  return { apps: a, hires: h };
}

/**
 * 【緊急用・パスワード必須】結果報告せずに店舗を削除する（完全無料枠など報告不要な打ち出し）。
 * スプシに既存行があれば削除し、master_店舗を「終了」にして募集中/未提出から外す。結果は書かない。
 */
function epDismissStore(o) {
  o = o || {};
  if (String(o.pass || "") !== "8888") return { ok: false, error: "パスワードが違います" };
  var store = epCleanStore_(String(o.store || "").replace(/\s+/g, " ").trim());
  if (!store) return { ok: false, error: "店舗が空です" };
  var deleted = false;
  // スプシに既存の結果行があれば削除（無ければスキップ＝そもそもスプシに書かれていない）
  try {
    var res = epDeletePosting({ pass: "8888", store: o.store || store, srcSheet: o.srcSheet, srcRow: o.srcRow, start: o.start });
    deleted = !!(res && res.ok);
  } catch (e) { }
  // 募集中/未提出から外す
  try { epSetStoreManual_(o.store || store, "終了"); } catch (e) { }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var log = epSheet_(ss, "_削除ログ", ["日時", "店舗", "元行", "削除内容"]);
    log.appendRow([Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"), store, (o.srcRow || ""), "結果報告不要で除外" + (deleted ? "（スプシ行も削除）" : "（スプシには元々なし）")]);
    dashStoreCache_();
  } catch (e) { }
  return { ok: true, store: store, deleted: deleted };
}

/** master_店舗 の手動フラグ列(F)に値を書く（店舗表示名で照合）。 */
function epSetStoreManual_(storeDisp, value) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ms = ss.getSheetByName("master_店舗"); if (!ms) return false;
  var v = ms.getDataRange().getValues();
  var target = epNormStore_(epCleanStore_(String(storeDisp || "").trim()));
  for (var i = 1; i < v.length; i++) {
    var disp = epCleanStore_(v[i][1] || String(v[i][0]));
    if (epNormStore_(disp) === target) { ms.getRange(i + 1, 6).setValue(value); return true; }
  }
  return false;
}

function epLogResult_(store, row, o) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = epSheet_(ss, "_結果入力ログ", ["日時", "店舗", "元行", "応募総数", "採用人数", "退職人数", "備考"]);
  sh.appendRow([Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"), store, row,
    (o.apps == null ? "" : o.apps), (o.hires == null ? "" : o.hires), (o.quit == null ? "" : o.quit), String(o.note || "")]);
}
