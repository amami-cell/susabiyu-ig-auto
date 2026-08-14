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

  // 求人原稿管理・面接枠管理ページを絶対URLで取得して構造を見る
  var targets = [
    { name: "求人原稿管理", url: base + "/web/8sin-saiyo/job_offer" },
    { name: "面接枠管理", url: base + "/web/8sin-saiyo/interview" }
  ];

  targets.forEach(function (t) {
    Logger.log("\n========== " + t.name + "  " + t.url + " ==========");
    var body;
    try { body = epFetch_(t.url, { method: "get", followRedirects: true }, jar).getContentText(); }
    catch (e) { Logger.log("取得失敗: " + e); return; }
    Logger.log("len=" + body.length + " title=" + ((body.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").replace(/\s+/g, " ").trim().slice(0, 40));

    // ポートレットの名前空間（_xxx_WAR_yyyportlet_）
    var nsSet = {}, m, nr = /_([A-Za-z0-9]+_WAR_[A-Za-z0-9]+portlet)_/g;
    while ((m = nr.exec(body))) nsSet[m[1]] = 1;
    Logger.log("ポートレット名前空間: " + Object.keys(nsSet).join(", "));

    // part= 候補（一覧取得や状態変更のAJAX）
    var parts = {}, pr = /part\s*[:=]\s*["']([A-Za-z0-9_]+)["']/g;
    while ((m = pr.exec(body))) parts[m[1]] = 1;
    Logger.log("part= 候補: " + Object.keys(parts).join(", "));

    // 一覧をAJAXで取りに行く関数（$.ajax の url と data を含む塊）を数個ダンプ
    var ai = body.indexOf(".ajax"), n = 0;
    while (ai >= 0 && n < 4) {
      Logger.log("  [ajax] " + body.slice(ai - 10, ai + 360).replace(/\s+/g, " ").trim());
      ai = body.indexOf(".ajax", ai + 1); n++;
    }

    // 掲載/店舗/期間/状態 の周辺を数箇所
    ["掲載中", "掲載終了", "掲載期間", "掲載開始", "募集職種", "店舗名", "ステータス", "状態", "公開", "停止"].forEach(function (kw) {
      var idx = body.indexOf(kw), c = 0;
      while (idx >= 0 && c < 2) {
        Logger.log("  [" + kw + "] " + body.slice(Math.max(0, idx - 40), idx + 150).replace(/\s+/g, " ").trim());
        idx = body.indexOf(kw, idx + 1); c++;
      }
    });

    // データ行のIDパターン（原稿コード等）と select/option（媒体・店舗）
    var idpat = (body.match(/id=["']([A-Za-z_]*(?:manuscript|jobOffer|genkou|shop)[A-Za-z0-9_]*)["']/gi) || []).slice(0, 12);
    Logger.log("  id例: " + idpat.join(" | ").slice(0, 400));

    // 掲載中の「行」を丸ごとダンプ（正確なパーサ作成用）
    var di = body.indexOf('bgcolor_blue">掲載中');
    if (di < 0) { var ts = body.indexOf('td_status'); di = ts >= 0 ? body.indexOf('掲載中</div>', ts) : -1; }
    if (di >= 0) {
      Logger.log("  [掲載中の行HTML①] " + body.slice(Math.max(0, di - 160), di + 2200).replace(/\s+/g, " ").trim());
      var di2 = body.indexOf('bgcolor_blue">掲載中', di + 10);
      if (di2 >= 0) Logger.log("  [掲載中の行HTML②] " + body.slice(Math.max(0, di2 - 160), di2 + 1400).replace(/\s+/g, " ").trim());
    }
  });

  Logger.log("=== 調査おわり（読み取りのみ）===");
}
