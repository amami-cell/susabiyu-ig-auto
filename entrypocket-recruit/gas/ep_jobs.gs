/**
 * EntryPocket 求人原稿管理（job_offer）から「掲載中」の店舗一覧を取得する（読み取りのみ）。
 * これを募集中タブの判定に使う（応募が無くても掲載中なら募集中に出す）。
 * epRun から呼ばれ、_掲載中店舗 シートに店舗名を書く。取得失敗時は既存を消さない。
 */
var EP_JOB_URL = "https://manage.entrypocket.jp/web/8sin-saiyo/job_offer";
var EP_JOB_NS = "_MYNJobManuscriptControl_WAR_MYNJobManuscriptControlportlet_";

/** 掲載中の店舗表示名リストを返す。取得/解析に失敗したら null（＝呼び出し側は既存維持）。 */
function epFetchLiveShops_(jar) {
  var url = EP_JOB_URL + "?p_p_id=MYNJobManuscriptControl_WAR_MYNJobManuscriptControlportlet" +
    "&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view" +
    "&" + EP_JOB_NS + "DisplayNum=200&" + EP_JOB_NS + "PageNo=1";
  var body;
  try { body = epFetch_(url, { method: "get", followRedirects: true }, jar).getContentText(); }
  catch (e) { Logger.log("  求人原稿ページ取得失敗: " + e); return null; }
  // 正しく求人原稿ページが取れているか（ログイン切れ等の誤検知を防ぐ）
  if (!body || body.indexOf("manuscript_list_data") < 0) {
    Logger.log("  求人原稿ページが想定と違う（掲載中店舗の更新はスキップ）");
    return null;
  }
  var out = {};
  var chunks = body.split('class="table_tr" id="tr_');
  for (var i = 1; i < chunks.length; i++) {
    var c = chunks[i];
    var status = (c.match(/td_status[\s\S]*?inr inr2[^>]*>([^<]*)<\/div>/) || [])[1] || "";
    if (status.indexOf("掲載中") < 0) continue;           // 掲載中だけ
    var store = (c.match(/td_branch[\s\S]*?inr inr3">([^<]+)<\/div>/) || [])[1] || "";
    store = epCleanStore_(store.replace(/\s+/g, " ").trim());
    if (store) out[epNormStore_(store)] = store;
  }
  var names = [];
  for (var k in out) names.push(out[k]);
  Logger.log("  掲載中の店舗: " + names.length + "件");
  return names;
}

/** 掲載中の店舗を _掲載中店舗 シートへ書く（0件や失敗時は既存を消さない）。
 *  prefetched を渡すと再取得せずそれを使う（epRun で1回だけ取得するため）。 */
function epWriteLiveShops_(ss, jar, prefetched) {
  var names = (prefetched !== undefined) ? prefetched : epFetchLiveShops_(jar);
  if (names == null) return -1;               // 取得失敗 → 既存維持
  if (!names.length) { Logger.log("  掲載中店舗0件のため既存を保持"); return 0; }
  var sh = epSheet_(ss, "_掲載中店舗", ["店舗名"]);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).clearContent();
  sh.getRange(2, 1, names.length, 1).setValues(names.map(function (n) { return [n]; }));
  return names.length;
}

/**
 * 【診断・書き込みなし】募集中に出ている「掲載中(応募0含む)」が、本物か残骸かを判定する。
 * Apps Script で epDiagLive を実行 → ログを貼る。
 */
function epDiagLive() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cur = epLiveShops_(ss);
  Logger.log("■ 今アプリが『掲載中』として募集中に出している店舗: " + cur.length + "件");
  Logger.log("  " + (cur.join(" / ") || "(なし)"));

  var mon = ss.getSheetByName("_掲載監視");
  if (mon && mon.getLastRow() > 1) {
    var mv = mon.getDataRange().getValues();
    Logger.log("■ _掲載監視（店舗ごとの最終掲載中日／自動終了印）:");
    for (var i = 1; i < Math.min(mv.length, 60); i++)
      Logger.log("   " + mv[i][1] + " : 最終掲載中=" + mv[i][2] + (mv[i][3] ? ("  [" + mv[i][3] + "]") : ""));
  } else {
    Logger.log("■ _掲載監視: まだ無し（自動終了機能デプロイ後の初回取得待ち）");
  }

  Logger.log("■ いまEntryPocketに実際に問い合わせて『掲載中』を取り直します…");
  var jar = epLogin_();
  if (!jar) { Logger.log("  ✗ ログイン失敗 → 掲載中の取得も失敗する状態。古い掲載中が残り続けている可能性が高い。"); return; }
  var fresh = epFetchLiveShops_(jar);
  if (fresh == null) {
    Logger.log("  ✗ 求人原稿ページの取得/解析に失敗(null) → 掲載中を更新できず、_掲載中店舗 が古いまま。");
    Logger.log("    ＝『応募0の掲載中店舗』は残骸の疑い。ページ構造/ログインの修正が必要。");
  } else {
    Logger.log("  ✓ 今EntryPocketが返す掲載中: " + fresh.length + "件 → " + (fresh.join(" / ") || "(0件)"));
    Logger.log("    上の『アプリが出している掲載中』と食い違う店舗があれば、それが残骸です。");
  }
  Logger.log("=== 診断おわり（読み取りのみ）===");
}

/** _掲載中店舗 シートの店舗名リストを返す（ダッシュボード表示用）。 */
function epLiveShops_(ss) {
  var sh = ss.getSheetByName("_掲載中店舗");
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    .map(function (r) { return String(r[0] || ""); }).filter(Boolean);
}
