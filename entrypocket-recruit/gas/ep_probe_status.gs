/**
 * 【調査専用・読み取りのみ】EntryPocketの「ステータス変更」の仕組みを特定する。
 * データは一切変更しない（GETで応募者ページ・main.jsを読むだけ）。
 *
 * 使い方: epProbeStatusChange を実行 → ログを送る（ステータスコード確認済み）。
 *         その後 epProbeMainJs を実行 → ログを送る（変更リクエストの形を特定）。
 */

// ステータス選択肢・名前空間などを洗い出す（実行済み）
function epProbeStatusChange() {
  var jar = epLogin_();
  if (!jar) { Logger.log("★ ログイン失敗（EP_USER/EP_PASS を確認）"); return; }
  var html = epFetch_(EP_APPLICANT_URL, { method: "get", followRedirects: true }, jar).getContentText();
  Logger.log("HTML長: " + html.length + " 文字");
  Logger.log("namespace: " + ((html.match(/_applycontrol_WAR_MYNApplyControlportlet_/) || [])[0] || "見つからず"));
  var found = 0, idx = html.indexOf("changeStatus");
  while (idx >= 0 && found < 6) {
    Logger.log("---- changeStatus 付近#" + (found + 1) + " ----");
    Logger.log(html.substr(Math.max(0, idx - 250), 700).replace(/\s+/g, " "));
    found++; idx = html.indexOf("changeStatus", idx + 1);
  }
  if (!found) Logger.log("※ HTML内に changeStatus 無し → main.js を調べる（epProbeMainJs）");
  var selRe = /<select\b[\s\S]*?<\/select>/gi, s, shown = 0;
  while ((s = selRe.exec(html)) && shown < 8) {
    var block = s[0];
    if (/ステータス|status|選考|状況/i.test(block)) {
      Logger.log("=== <select name=" + ((block.match(/name\s*=\s*["']([^"']+)["']/) || [])[1] || "?") + "> ===");
      (block.match(/<option\b[^>]*>[^<]*<\/option>/gi) || []).slice(0, 80).forEach(function (o) { Logger.log("  " + o.replace(/\s+/g, " ")); });
      shown++;
    }
  }
}

// main.js から changeStatus 等の実装（リクエストの組み立て方）を抜き出す
function epProbeMainJs() {
  var jar = epLogin_();
  if (!jar) { Logger.log("★ ログイン失敗"); return; }
  var html = epFetch_(EP_APPLICANT_URL, { method: "get", followRedirects: true }, jar).getContentText();

  var m = html.match(/<script[^>]+src\s*=\s*["']([^"']*ApplyControl-portlet\/js\/main\.js[^"']*)["']/i);
  if (!m) { Logger.log("★ main.js の src が見つからず"); return; }
  var src = m[1].replace(/&amp;/g, "&");
  if (src.indexOf("http") !== 0) src = "https://manage.entrypocket.jp" + (src.charAt(0) === "/" ? "" : "/") + src;
  Logger.log("main.js: " + src);

  var js = epFetch_(src, { method: "get", followRedirects: true }, jar).getContentText();
  Logger.log("JS長: " + js.length + " 文字");

  // 主要関数の周辺を抜き出す（changeStatus と、動作確認済みの downloadCSV を比較用に）
  ["function changeStatus", "changeStatus", "downloadCSV", "part =", "part=", "p_p_lifecycle", "serveResource", "resourceURL"].forEach(function (kw) {
    var i = js.indexOf(kw), c = 0;
    while (i >= 0 && c < 3) {
      Logger.log("---- [" + kw + "] #" + (c + 1) + " ----");
      Logger.log(js.substr(Math.max(0, i - 120), 900).replace(/\s+/g, " "));
      c++; i = js.indexOf(kw, i + 1);
    }
  });
  Logger.log("★ このログを丸ごと送ってください（データは変更していません）。");
}
