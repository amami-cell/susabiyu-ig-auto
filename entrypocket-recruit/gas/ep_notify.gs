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

/** 新規応募サマリ chg({newByStore,totalByStore,added}) を受け取り、LINEへ通知する。 */
function epNotifyNewApps_(chg) {
  try {
    if (!chg) return;
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty("EP_NOTIFY_ENABLED") === "0") return;      // 通知オフ
    var nb = chg.newByStore || {};
    var stores = Object.keys(nb);
    if (!stores.length) return;                                       // 新規応募なし → 送らない
    var tb = chg.totalByStore || {};
    stores.sort(function (a, b) { return (nb[b] || 0) - (nb[a] || 0); });
    var lines = ["🆕 新規応募が入りました"];
    var totalNew = 0;
    stores.forEach(function (s) {
      var n = nb[s] || 0; totalNew += n;
      var t = tb[s]; var tail = (t != null) ? "（現在" + t + "名）" : "";
      lines.push("・" + s + "：新規" + n + "件" + tail);
    });
    lines[0] = "🆕 新規応募 " + totalNew + "件";
    epLineSend_(lines.join("\n"));
  } catch (e) { Logger.log("LINE通知スキップ: " + e); }
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
