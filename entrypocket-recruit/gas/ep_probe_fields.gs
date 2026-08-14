/**
 * 【調査用・書き込みなし】メモ保存ポップアップ(popupNote)本体を取得して保存APIを特定する。
 * Apps Script で epProbeFields を実行 → ログを貼る。GET だけ・保存はしない。
 */
function epProbeFields() {
  var jar = epLogin_();
  if (!jar) { Logger.log("✗ ログイン失敗"); return; }
  Logger.log("✓ ログイン成功");

  var html = epFetch_(EP_APPLICANT_URL, { method: "get", followRedirects: true }, jar).getContentText();
  Logger.log("応募者ページ len=" + html.length);

  // 一覧からサンプルの応募者コードを1件拾う（メモ画面を開くのに使う。書き込みはしない）
  var codeM = html.match(/status_(?:pc|sp)_(\d{5,})/) ||
    html.match(/delCheckName["'][^>]*value=["'](\d{5,})/) ||
    html.match(/name=["']_applycontrol_WAR_MYNApplyControlportlet_delCheckName["'][^>]*value=["'](\d+)/);
  var code = codeM ? codeM[1] : "";
  Logger.log("sample applyCd=" + code);
  if (!code) { Logger.log("応募者コードを拾えず。ページ構造を確認要"); return; }

  // popupNote の RenderURL を組み立てて GET（メモ画面のHTMLを取得）
  var NS = EP_CSV_NS;
  var purl = EP_APPLICANT_URL + "?p_p_id=applycontrol_WAR_MYNApplyControlportlet" +
    "&p_p_lifecycle=0&p_p_state=pop_up&p_p_mode=view" +
    "&" + NS + "applyCds=" + encodeURIComponent(code) +
    "&" + NS + "pageFlg=popupNote" +
    "&" + NS + "PageNo=1&" + NS + "DisplayNum=50";
  Logger.log("popupURL=" + purl);

  var pop;
  try { pop = epFetch_(purl, { method: "get" }, jar).getContentText(); }
  catch (e) { Logger.log("popup取得失敗: " + e); return; }
  Logger.log("popup len=" + (pop ? pop.length : 0));
  if (!pop) return;

  // part= 候補
  var parts = {}, m, pr = /part\s*[:=]\s*["']([A-Za-z0-9_]+)["']/g;
  while ((m = pr.exec(pop))) parts[m[1]] = 1;
  Logger.log("■ popup内 part= 候補: " + Object.keys(parts).join(", "));

  // フォームの action と method
  var fm = pop.match(/<form[^>]*>/gi) || [];
  fm.slice(0, 6).forEach(function (f) { Logger.log("■ form: " + f.replace(/\s+/g, " ").slice(0, 260)); });

  // textarea / input（メモ入力欄や hidden の name=value）
  var names = {};
  var tr = /<(?:textarea|input|select)[^>]*name=["']([^"']+)["'][^>]*?(?:value=["']([^"']*)["'])?/gi;
  while ((m = tr.exec(pop))) { names[m[1]] = (m[2] || ""); }
  var keys = Object.keys(names);
  Logger.log("■ popup内 入力欄name（" + keys.length + "件）:");
  keys.slice(0, 40).forEach(function (k) { Logger.log("   " + k + (names[k] ? " = " + String(names[k]).slice(0, 30) : "")); });

  // 保存系の関数/ajax/onclick を文脈つきで
  Logger.log("■ 保存系（regist/save/note/ajax/submit/part）文脈:");
  ["regist", "save", "insert", "update", "Note", "memo", "メモ", "登録", "submit(", ".ajax", "part:"].forEach(function (kw) {
    var i = pop.indexOf(kw), n = 0;
    while (i >= 0 && n < 2) {
      Logger.log("   [" + kw + "] " + pop.slice(Math.max(0, i - 30), i + 240).replace(/\s+/g, " ").trim());
      i = pop.indexOf(kw, i + 1); n++;
    }
  });

  Logger.log("=== 調査おわり（書き込みなし）===");
}
