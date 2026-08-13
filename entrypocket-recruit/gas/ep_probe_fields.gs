/**
 * 【調査用・書き込みなし】EntryPocket の「メモ保存 / 面接枠登録」の送信APIを特定する。
 *
 * 使い方（1回だけ）:
 *   Apps Script で epProbeFields を「実行」→ 実行ログをまるごとコピーして貼る。
 *   メモ追加関数(applicantMemo)や面接遷移(gotoInput/gotoModify)の中身と、全 part= 呼び出しを出す。
 *
 * 応募者ページの HTML を「読むだけ」。保存・送信・クリックは一切しない。
 * epLogin_ / epFetch_ / EP_APPLICANT_URL（ep_fetch.gs）を再利用する。
 */
function epProbeFields() {
  var jar = epLogin_();
  if (!jar) { Logger.log("✗ ログイン失敗"); return; }
  Logger.log("✓ ログイン成功");

  var html = epFetch_(EP_APPLICANT_URL, { method: "get", followRedirects: true }, jar).getContentText();
  Logger.log("応募者ページ len=" + html.length);

  // 1) すべての part= 呼び出しを、前後の文脈つきで出す（どの関数がどの part を投げるか）
  Logger.log("========== part= 呼び出し（前後文脈つき）==========");
  var pr = /_applycontrol_WAR_MYNApplyControlportlet_part\s*[:=]\s*["']([A-Za-z0-9_]+)["']/g, m, cnt = 0, seen = {};
  while ((m = pr.exec(html))) {
    var s = Math.max(0, m.index - 220), ctx = html.slice(s, m.index + 60).replace(/\s+/g, " ").trim();
    Logger.log("• part=" + m[1] + "  … " + ctx.slice(-240));
    if (++cnt >= 40) { Logger.log("…(part= 以降省略)"); break; }
  }

  // 2) 主要な関数の中身を丸ごと（メモ追加・面接遷移・ステータス変更）
  var anchors = ["function applicantMemo", "applicantMemo =", "applicantMemo:function",
    "function changeStatus", "changeStatus =", "changeStatus:function",
    "function gotoInput", "function gotoModify", "function gotoDetail",
    "function saveMemo", "function regMemo", "function memoRegist", "function updateMemo",
    "function reserve", "function interview", "function changeInterview"];
  Logger.log("========== 主要関数の中身（前700字）==========");
  anchors.forEach(function (a) {
    var i = html.indexOf(a);
    if (i < 0) return;
    Logger.log("――― " + a + " @" + i + " ―――");
    Logger.log(html.slice(i, i + 700).replace(/\s+/g, " ").trim());
  });

  // 3) メモ入力欄・面接関連のフォーム項目名（value/hidden）を拾う
  Logger.log("========== メモ/面接の項目名（input/textarea name）==========");
  var nr = /_applycontrol_WAR_MYNApplyControlportlet_([A-Za-z0-9_]*(?:[Mm]emo|[Ii]nterview|[Nn]ote|reserve|schedule)[A-Za-z0-9_]*)/g, ns = {};
  while ((m = nr.exec(html))) ns[m[1]] = 1;
  Logger.log("  " + Object.keys(ns).join(", "));

  Logger.log("=== 調査おわり（書き込みなし）===");
}
