/**
 * 【調査用・書き込みなし】メモ保存(popupNote)の開き方URLと保存APIを特定する。
 * Apps Script で epProbeFields を実行 → ログを貼る。読むだけ・保存はしない。
 */
function epProbeFields() {
  var jar = epLogin_();
  if (!jar) { Logger.log("✗ ログイン失敗"); return; }
  Logger.log("✓ ログイン成功");

  var html = epFetch_(EP_APPLICANT_URL, { method: "get", followRedirects: true }, jar).getContentText();
  Logger.log("応募者ページ len=" + html.length);

  // 集める本文：応募者HTML＋読み込まれるJS（ポートレットのJSにpopupNoteがある可能性）
  var texts = [["applicant.html", html]];
  var re = /<script[^>]+src=["']([^"']+)["']/g, m, seen = {};
  while ((m = re.exec(html))) {
    var u = m[1]; if (seen[u]) continue; seen[u] = 1;
    if (/googletagmanager|karte|jquery-1|gtag/i.test(u)) continue; // 無関係な巨大JSは除外
    var abs = (u.indexOf("http") === 0) ? u : epAbsUrl_(u, EP_APPLICANT_URL);
    try { texts.push(["JS " + u.slice(-46), epFetch_(abs, { method: "get" }, jar).getContentText()]); }
    catch (e) { Logger.log("JS取得失敗 " + u + ": " + e); }
  }

  function dumpAround(label, text, kw, win, max) {
    var i = text.indexOf(kw), n = 0;
    while (i >= 0 && n < (max || 4)) {
      var s = Math.max(0, i - 40);
      Logger.log("[" + label + "] …" + text.slice(s, i + win).replace(/\s+/g, " ").trim());
      i = text.indexOf(kw, i + 1); n++;
    }
  }

  Logger.log("========== popupNote（メモポップアップの開き方）==========");
  texts.forEach(function (t) { dumpAround(t[0], t[1], "popupNote", 520, 3); });

  Logger.log("========== Liferay.Util.openWindow / pageFlg / dialog ==========");
  texts.forEach(function (t) {
    dumpAround(t[0], t[1], "openWindow", 360, 2);
    dumpAround(t[0], t[1], "pageFlg", 240, 3);
  });

  Logger.log("========== メモ保存っぽい part=/関数 ==========");
  texts.forEach(function (t) {
    var pr = /part\s*[:=]\s*["']([A-Za-z0-9_]*[Nn]ote[A-Za-z0-9_]*|[A-Za-z0-9_]*[Mm]emo[A-Za-z0-9_]*|reg[A-Za-z0-9_]*|save[A-Za-z0-9_]*|insert[A-Za-z0-9_]*|update[A-Za-z0-9_]*)["']/g, m2, n = 0;
    while ((m2 = pr.exec(t[1])) && n < 20) {
      var s = Math.max(0, m2.index - 180);
      Logger.log("[" + t[0] + "] part=" + m2[1] + " … " + t[1].slice(s, m2.index + 40).replace(/\s+/g, " ").trim().slice(-220));
      n++;
    }
  });

  // popupNote の中からURLを取り出し、その画面を実際に取得して保存フォームを見る
  Logger.log("========== popupNote から辿ったポップアップ本体 ==========");
  var joined = texts.map(function (t) { return t[1]; }).join("\n");
  var pi = joined.indexOf("popupNote");
  if (pi >= 0) {
    var seg = joined.slice(pi, pi + 900);
    var um = seg.match(/https?:\/\/[^\s"']*applicant[^\s"']*/);
    if (um) {
      var purl = um[0].replace(/&amp;/g, "&");
      Logger.log("popup候補URL: " + purl.slice(0, 300));
      try {
        var pop = epFetch_(purl, { method: "get" }, jar).getContentText();
        Logger.log("popup len=" + pop.length);
        var fr = /part\s*[:=]\s*["']([A-Za-z0-9_]+)["']/g, mm, ns = {};
        while ((mm = fr.exec(pop))) ns[mm[1]] = 1;
        Logger.log("  popup内 part=候補: " + Object.keys(ns).join(", "));
        var tr = /<textarea[^>]*name=["']([^"']+)["']|<input[^>]*name=["']([^"']*[Nn]ote[^"']*|[^"']*[Mm]emo[^"']*)["']/g;
        var names = {};
        while ((mm = tr.exec(pop))) { names[mm[1] || mm[2]] = 1; }
        Logger.log("  popup内 メモ入力欄name: " + Object.keys(names).join(", "));
      } catch (e) { Logger.log("popup取得失敗: " + e); }
    } else {
      Logger.log("popupNote付近にURLを検出できず（下のpopupNoteダンプを見て手掛かりを探す）");
    }
  }

  Logger.log("=== 調査おわり（書き込みなし）===");
}
