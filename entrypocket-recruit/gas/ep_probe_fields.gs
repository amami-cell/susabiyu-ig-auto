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

/**
 * 【調査用・書き込みなし】EntryPocketの「掲載中の求人原稿一覧」ページを特定する。
 * メニューのリンクを洗い出し、求人/原稿ぽいページを自動で開いて構造を見る。
 * Apps Script で epProbeJobs を実行 → ログを貼る。GETのみ・保存しない。
 */
function epProbeJobs() {
  var jar = epLogin_();
  if (!jar) { Logger.log("✗ ログイン失敗"); return; }
  Logger.log("✓ ログイン成功");
  var base = "https://manage.entrypocket.jp";

  var html = epFetch_(EP_APPLICANT_URL, { method: "get", followRedirects: true }, jar).getContentText();
  Logger.log("応募者ページ len=" + html.length);

  // 1) サイト内メニュー/ページのリンク（/web/8sin-saiyo/*）
  Logger.log("========== メニュー/ページのリンク ==========");
  var seen = {}, m;
  var lr = /<a[^>]+href=["']([^"']*\/web\/8sin-saiyo\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, cnt = 0;
  while ((m = lr.exec(html)) && cnt < 80) {
    var href = m[1].replace(/&amp;/g, "&");
    var label = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    var key = href.split("?")[0];
    if (seen[key]) continue; seen[key] = 1; cnt++;
    Logger.log("• " + (label || "(無題)") + "  → " + key);
  }

  // 2) 求人/原稿/掲載ぽいページを自動で開いて中身を確認
  var cand = [];
  Object.keys(seen).forEach(function (u) { if (/求人|原稿|掲載|募集|manuscript|joboffer|recruit|job|genkou|kanri|tenpo/i.test(u)) cand.push(u); });
  ["manuscript", "joboffer", "job-offer", "recruit", "job", "genkou", "kanri", "tenpo", "shop", "apply-manuscript"].forEach(function (seg) { cand.push(base + "/web/8sin-saiyo/" + seg); });

  Logger.log("========== 求人/原稿ページ候補の確認 ==========");
  var done = {};
  cand.forEach(function (u) {
    if (done[u]) return; done[u] = 1;
    try {
      var r = epFetch_(u, { method: "get", followRedirects: true }, jar);
      var body = r.getContentText();
      var title = (body.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "";
      var looks = /掲載中|掲載期間|求人原稿|募集職種|原稿一覧|募集中|媒体/.test(body);
      Logger.log("[" + u.replace(base, "").slice(0, 46) + "] HTTP=" + r.getResponseCode() + " title=" + title.replace(/\s+/g, " ").trim().slice(0, 40) + " 求人ぽい=" + looks + " len=" + body.length);
      if (looks) {
        var parts = {}, pr = /part\s*[:=]\s*["']([A-Za-z0-9_]+)["']/g, mm;
        while ((mm = pr.exec(body))) parts[mm[1]] = 1;
        Logger.log("   part=候補: " + Object.keys(parts).join(", "));
        ["掲載中", "掲載期間", "掲載開始", "掲載終了", "募集職種", "原稿", "媒体", "店舗名"].forEach(function (kw) {
          var idx = body.indexOf(kw);
          if (idx >= 0) Logger.log("   [" + kw + "] " + body.slice(Math.max(0, idx - 30), idx + 170).replace(/\s+/g, " ").trim());
        });
      }
    } catch (e) { Logger.log("[" + u + "] 取得失敗 " + e); }
  });
  Logger.log("=== 調査おわり（読み取りのみ）===");
}
