/**
 * 【調査用・書き込みなし】EntryPocket の「メモ保存 / 面接枠登録」の送信APIを特定する。
 *
 * 使い方（1回だけ）:
 *   Apps Script エディタで関数 epProbeFields を選んで「実行」→ 実行ログ（Ctrl+Enter/表示→ログ）を
 *   まるごとコピーして貼る。part= の候補やメモ/面接の関数名が出る。
 *
 * これは応募者ページの HTML/JS を「読むだけ」で、保存・送信・クリックは一切しない。
 * epLogin_ / epFetch_ / EP_APPLICANT_URL / epAbsUrl_（ep_fetch.gs）を再利用する。
 */
function epProbeFields() {
  var jar = epLogin_();
  if (!jar) { Logger.log("✗ ログイン失敗"); return; }
  Logger.log("✓ ログイン成功");

  var html = epFetch_(EP_APPLICANT_URL, { method: "get", followRedirects: true }, jar).getContentText();
  Logger.log("応募者ページ len=" + html.length);
  epProbeScan_("applicant.html", html);

  // 外部JS（<script src>）も走査
  var re = /<script[^>]+src=["']([^"']+)["']/g, m, seen = {};
  while ((m = re.exec(html))) {
    var u = m[1]; if (seen[u]) continue; seen[u] = 1;
    var abs = (u.indexOf("http") === 0) ? u : epAbsUrl_(u, EP_APPLICANT_URL);
    try {
      var js = epFetch_(abs, { method: "get" }, jar).getContentText();
      if (/changeMemo|saveMemo|updateMemo|memo|メモ|面接|interview|reserve|schedule|part/i.test(js)) {
        epProbeScan_("JS " + u.slice(-56), js);
      }
    } catch (e) { Logger.log("JS取得失敗 " + u + ": " + e); }
  }
  Logger.log("=== 調査おわり（書き込みなし）===");
}

function epProbeScan_(label, text) {
  var parts = {}, ns = {}, m;
  var pr = /part["'\]\s]*[:=]\s*["']([A-Za-z0-9_]+)["']/g;
  while ((m = pr.exec(text))) parts[m[1]] = 1;
  var nr = /_applycontrol_WAR_MYNApplyControlportlet_([A-Za-z0-9_]+)/g;
  while ((m = nr.exec(text))) ns[m[1]] = 1;
  Logger.log("[" + label + "] len=" + text.length);
  Logger.log("  part= 候補: " + Object.keys(parts).join(", "));
  Logger.log("  namespaceパラメータ: " + Object.keys(ns).slice(0, 60).join(", "));
  var lines = text.split("\n"), n = 0;
  var tok = /changeMemo|saveMemo|updateMemo|regMemo|メモ|memo|面接|interview|reserve|reservation|schedule|changeInterview|setInterview|regInterview/i;
  for (var i = 0; i < lines.length; i++) {
    if (tok.test(lines[i])) {
      var s = lines[i].replace(/\s+/g, " ").trim();
      if (s.length > 300) s = s.slice(0, 300) + "…";
      if (s) { Logger.log("  " + s); if (++n >= 70) { Logger.log("  …(以降省略)"); break; } }
    }
  }
}
