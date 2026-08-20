/**
 * 新規応募が入ったら LINE に「店舗名＋件数」を通知する（インスタ投稿システムと同じ仕組み）。
 *
 * - 送信は LINE Messaging API の broadcast（公式アカウントの友だち全員へ）。
 *   インスタ自動投稿（poster.py の line_notify）と同じエンドポイント・同じ公式アカウントを再利用できる。
 * - トークンは Script Property から読む（GitHub Secret はGASから読めないため、値だけ登録が必要）:
 *     LINE_CHANNEL_TOKEN … LINE Messaging API のチャネルアクセストークン（インスタ側と同じ値でOK）
 *     ※ 互換のため EP_LINE_TOKEN でも可。
 * - 通知を止めたいときは Script Property  EP_NOTIFY_ENABLED = 0
 * - トークン未設定なら黙って何もしない（エラーにしない）。
 */

/** 新規応募サマリ chg({newByStore,totalByStore,added}) を受け取り、通知キューに積む。
 *  実際の送信（LINE＋Webプッシュ）は 1日2回の送信役(GitHub Actions)がまとめて行う。
 *  取得は1日5回だが、都度は送らず溜めることで「通知は1日2回」にする。 */
function epNotifyNewApps_(chg) {
  try {
    if (!chg) return;
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty("EP_NOTIFY_ENABLED") === "0") return;      // 通知オフ
    var nb = chg.newByStore || {};
    var stores = Object.keys(nb);
    if (!stores.length) return;                                       // 新規応募なし → 積まない
    var tb = chg.totalByStore || {};
    stores.sort(function (a, b) { return (nb[b] || 0) - (nb[a] || 0); });
    var totalNew = 0, lines = [], dataNew = {}, dataTot = {};
    stores.forEach(function (s) {
      var n = nb[s] || 0; totalNew += n; dataNew[s] = n;
      var t = tb[s]; if (t != null) dataTot[s] = t;
      lines.push("・" + s + "：新規" + n + "件" + (t != null ? "（現在" + t + "名）" : ""));
    });
    var title = "🆕 新規応募 " + totalNew + "件";
    // キューに積むだけ（送信役が1日2回、溜まった分をまとめてLINE＋Webプッシュ）
    epEnqueuePush_(title, lines.join("\n"), "recruit", JSON.stringify({ newByStore: dataNew, totalByStore: dataTot }));
  } catch (e) { Logger.log("通知スキップ: " + e); }
}

/* ============================================================
 *  アプリ通知（Webプッシュ）: GASは送信できないので「送信待ちキュー」に積むだけ。
 *  実際の送信は GitHub Actions(Python/pywebpush) が /exec?push=drain で取り出して行う。
 *  既存インスタPWAのVAPID鍵・購読者リストを再利用（category="recruit"）。
 * ============================================================ */
var EP_PUSH_SHEET = "_Push送信待ち";
var EP_PUSH_HDR = ["id", "日時", "title", "body", "category", "status", "送信日時", "data"];

/** 送信待ちに1件積む。data=集計JSON（送信役が複数件をまとめる用）。 */
function epEnqueuePush_(title, body, category, data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = epSheet_(ss, EP_PUSH_SHEET, EP_PUSH_HDR);
    sh.appendRow([Utilities.getUuid(), Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"),
      String(title || ""), String(body || ""), String(category || "recruit"), "pending", "", String(data || "")]);
    epPushCleanup_(sh);
  } catch (e) { Logger.log("push enqueue skip: " + e); }
}

/** 送信済みで14日より古い行を掃除（キューを小さく保つ）。 */
function epPushCleanup_(sh) {
  try {
    if (sh.getLastRow() < 2) return;
    var v = sh.getDataRange().getValues();
    var cut = new Date(); cut.setDate(cut.getDate() - 14);
    for (var i = v.length - 1; i >= 1; i--) {
      if (String(v[i][5]) === "sent") {
        var d = epDate_(v[i][6] || v[i][1]);
        if (d && d.getTime() < cut.getTime()) sh.deleteRow(i + 1);
      }
    }
  } catch (e) { }
}

/** 動作確認用：テスト通知を1件キューに積む（?push=test から呼ばれる）。key未設定なら誰でも可。 */
function epEnqueueTest_(key) {
  var need = PropertiesService.getScriptProperties().getProperty("EP_PUSH_KEY") || "";
  if (need && String(key || "") !== need) return { ok: false, error: "forbidden" };
  epEnqueuePush_("🔔 テスト通知（動作確認）",
    "募集システムの通知テストです。実際の新規応募時は、ここに店舗名と新規件数が入ります。",
    "recruit");
  return { ok: true, test: true };
}

/** 送信待ちを取り出して sent に更新（送信役=Actionsが呼ぶ）。key未設定なら誰でも可（推奨は設定）。 */
function epDrainPush_(key) {
  var props = PropertiesService.getScriptProperties();
  var need = props.getProperty("EP_PUSH_KEY") || "";
  if (need && String(key || "") !== need) return { ok: false, error: "forbidden" };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(EP_PUSH_SHEET);
  if (!sh || sh.getLastRow() < 2) return { ok: true, items: [] };
  var v = sh.getDataRange().getValues(), items = [], mark = [];
  for (var i = 1; i < v.length && items.length < 50; i++) {
    if (String(v[i][5]) !== "pending") continue;
    items.push({ id: String(v[i][0]), title: String(v[i][2]), body: String(v[i][3]), category: String(v[i][4] || "recruit"), ts: String(v[i][1]), data: String(v[i][7] || "") });
    mark.push(i + 1);
  }
  var now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  mark.forEach(function (r) { sh.getRange(r, 6).setValue("sent"); sh.getRange(r, 7).setValue(now); });
  return { ok: true, items: items };
}

/** LINE Messaging API の broadcast でテキストを送る（トークン未設定なら何もしない）。 */
function epLineSend_(text) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("LINE_CHANNEL_TOKEN") || props.getProperty("EP_LINE_TOKEN") || "";
  if (!token) { Logger.log("LINEトークン未設定のため通知しません（Script Property LINE_CHANNEL_TOKEN を登録）"); return false; }
  try {
    var res = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/broadcast", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token },
      payload: JSON.stringify({ messages: [{ type: "text", text: String(text).slice(0, 4900) }] }),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    if (code >= 200 && code < 300) { Logger.log("✓ LINE通知 送信"); return true; }
    Logger.log("LINE通知 失敗 code=" + code + " " + res.getContentText().slice(0, 200));
    return false;
  } catch (e) { Logger.log("LINE通知 例外: " + e); return false; }
}

/** 手動テスト用：LINEにテスト通知を送る（Apps Scriptで実行）。 */
function epNotifyTest() {
  var ok = epLineSend_("✅ 募集システムからのテスト通知です。\n新規応募が入るとこの形で店舗名と件数をお知らせします。");
  Logger.log(ok ? "送信OK（LINEを確認）" : "送信できず（トークン未設定 or エラー。ログ参照）");
}
