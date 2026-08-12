/**
 * 【調査専用・読み取りのみ】EntryPocketの「ステータス変更」の仕組みを特定する。
 *
 * データは一切変更しない（GETで応募者ページを読むだけ）。
 * ここで得たログをもとに、実際の書き込み(ステータス変更)を安全・確実に実装する。
 *
 * 使い方: epProbeStatusChange を実行 → 実行ログを丸ごとコピーして送る。
 */
function epProbeStatusChange() {
  var jar = epLogin_();
  if (!jar) { Logger.log("★ ログイン失敗（EP_USER/EP_PASS を確認）"); return; }
  Logger.log("✓ ログイン成功。応募者ページを取得します（読み取りのみ）。");

  var html = epFetch_(EP_APPLICANT_URL, { method: "get", followRedirects: true }, jar).getContentText();
  Logger.log("HTML長: " + html.length + " 文字");

  // 1) 名前空間・認証トークン
  Logger.log("namespace: " + ((html.match(/_applycontrol_WAR_MYNApplyControlportlet_/) || [])[0] || "見つからず"));
  Logger.log("p_auth: " + ((html.match(/Liferay\.authToken\s*=\s*['"]([^'"]+)['"]/) || [])[1] || "見つからず"));

  // 2) changeStatus を含むJSの周辺（変更処理の本体）
  var found = 0, idx = html.indexOf("changeStatus");
  while (idx >= 0 && found < 6) {
    Logger.log("---- changeStatus 付近#" + (found + 1) + " ----");
    Logger.log(html.substr(Math.max(0, idx - 250), 700).replace(/\s+/g, " "));
    found++; idx = html.indexOf("changeStatus", idx + 1);
  }
  if (!found) Logger.log("※ HTML内に changeStatus 無し → 外部JSにある可能性（下のJS src参照）");

  // 3) 更新系っぽい part の候補
  var seen = {}, re = /part["'\s:=,()]+([A-Za-z][A-Za-z]+)/g, m;
  while ((m = re.exec(html))) { if (!seen[m[1]]) { seen[m[1]] = 1; } }
  Logger.log("part候補一覧: " + Object.keys(seen).join(", "));

  // 4) ステータスの選択肢（コード→名称）を洗い出す
  var selRe = /<select\b[\s\S]*?<\/select>/gi, s, shown = 0;
  while ((s = selRe.exec(html)) && shown < 8) {
    var block = s[0];
    if (/ステータス|status|選考|状況/i.test(block)) {
      var name = (block.match(/name\s*=\s*["']([^"']+)["']/) || [])[1] || "?";
      Logger.log("=== <select name=" + name + "> ===");
      (block.match(/<option\b[^>]*>[^<]*<\/option>/gi) || []).slice(0, 80)
        .forEach(function (o) { Logger.log("  " + o.replace(/\s+/g, " ")); });
      shown++;
    }
  }
  if (!shown) Logger.log("※ ステータスのselectが見つからず（別UIの可能性）");

  // 5) 外部JS（changeStatusの実装が外部にある場合の手掛かり）
  (html.match(/<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>/gi) || [])
    .forEach(function (x) { if (/apply|applicant|control|status/i.test(x)) Logger.log("関連JS src: " + x.replace(/\s+/g, " ")); });

  // 6) 応募者1件の識別子（チェックボックス等）の付き方
  var cb = (html.match(/<input\b[^>]*type\s*=\s*["']checkbox["'][^>]*>/i) || [])[0];
  if (cb) Logger.log("応募者チェックボックス例: " + cb.replace(/\s+/g, " "));

  Logger.log("★ ここまでのログを丸ごとコピーして送ってください（データは変更していません）。");
}
