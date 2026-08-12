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

function dumpKw_(t, kw) {
  var i = t.indexOf(kw), c = 0;
  while (i >= 0 && c < 4) { Logger.log("[" + kw + " #" + (c + 1) + "] " + t.substr(Math.max(0, i - 150), 750).replace(/\s+/g, " ")); c++; i = t.indexOf(kw, i + 1); }
  if (!c) Logger.log("[" + kw + "] 見つからず");
}

// main.js（素で取得）とHTMLから、変更処理・リソースURLを抜き出す
function epProbeMainJs() {
  var jar = epLogin_(); if (!jar) { Logger.log("★ ログイン失敗"); return; }
  var ref = { "Referer": EP_APPLICANT_URL };

  // A) 素の main.js（クエリ無し）を直接取得
  var url1 = "https://manage.entrypocket.jp/MYN-ApplyControl-portlet/js/main.js";
  var r1 = epFetch_(url1, { method: "get", headers: ref }, jar);
  var js = r1.getContentText();
  Logger.log("A) main.js HTTP=" + r1.getResponseCode() + " / len=" + js.length);
  if (js.length < 400) Logger.log("A本文: " + js.replace(/\s+/g, " "));
  dumpKw_(js, "changeStatus");
  dumpKw_(js, "selectionStatusKb");
  dumpKw_(js, "part");

  // B) 応募者ページHTMLから 変更処理・リソースURL を探す
  var html = epFetch_(EP_APPLICANT_URL, { method: "get", followRedirects: true }, jar).getContentText();
  Logger.log("HTML changeStatus 出現数: " + (html.split("changeStatus").length - 1));
  dumpKw_(html, "changeStatus");
  dumpKw_(html, "selectionStatusKb");
  dumpKw_(html, "p_p_lifecycle=2");
  dumpKw_(html, "serveResource");
  dumpKw_(html, "onchange");
  Logger.log("★ このログを丸ごと送ってください（データは変更していません）。");
}
