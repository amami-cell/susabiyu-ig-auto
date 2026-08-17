/**
 * EntryPocket ステータス書き戻し（実機で確認したリクエストで実装）。
 *
 * 送信先: 応募者ページのリソースURL(EP_CSV_RES, p_p_lifecycle=2) に POST。
 *   _..._part      = "changeStatus"
 *   _..._applyCd   = 応募者コード
 *   _..._statusKbn = ステータスコード
 * 失敗時は本文に value:ERROR が含まれる。
 *
 * 書き込みの有効/無効:
 *  - 既定で「有効」。複数人がアプリからステータスを変更できる。
 *  - 完全に止めたい時だけ スクリプトプロパティ EP_WRITE_ENABLED="0" を設定する。
 *  - 変更は毎回 _ステータス変更ログ シートに記録。
 *  - 書き込みは「アプリでの明示操作（ステータスボタン/結果保存）」の時だけ発生する。
 *
 * 双方向同期:
 *  - アプリ→EP : このファイルの epSetStatus が EntryPocket にPOST＋手元も即更新。
 *  - EP→アプリ : 取得(epRun)が毎回CSVから raw_応募者 を作り直し→app_cache 再生成。
 *               EntryPocket 上で誰が変えても、取得時にアプリへ反映される（EntryPocketが正）。
 */

var EP_STATUS_MAP = {
  "01": "未対応", "03": "連絡中", "31": "面接予約済", "32": "面接実施済", "80": "採用",
  "13": "不採用（連絡取れず）", "52": "不採用（面接キャンセル）", "82": "不採用（条件合わず）", "83": "不採用（辞退）"
};
var EP_STATUS_ORDER = ["01", "03", "31", "32", "80", "13", "52", "82", "83"];

// 既定で有効。誤操作防止で完全に止めたい時だけ EP_WRITE_ENABLED="0" を設定する。
function epWriteEnabled_() { return PropertiesService.getScriptProperties().getProperty("EP_WRITE_ENABLED") !== "0"; }

/** アプリから呼ばれる：1名のステータスを変更する。 */
function epSetStatus(applyCd, statusKbn) {
  applyCd = String(applyCd == null ? "" : applyCd).trim();
  statusKbn = String(statusKbn == null ? "" : statusKbn).trim();
  if (statusKbn.length === 1) statusKbn = "0" + statusKbn;   // "1"→"01" 揺れ吸収
  if (!applyCd) return { ok: false, error: "応募者コードが空です" };
  if (!EP_STATUS_MAP[statusKbn]) return { ok: false, error: "未知のステータスコード: " + statusKbn };
  if (!epWriteEnabled_()) return { ok: false, error: "書き込みが無効化されています（EP_WRITE_ENABLED=\"0\" を解除してください）" };

  var jar = epLogin_();
  if (!jar) { epLogStatusChange_(applyCd, statusKbn, false, "ログイン失敗"); return { ok: false, error: "ログイン失敗" }; }

  var hdr = { "Referer": EP_APPLICANT_URL, "X-Requested-With": "XMLHttpRequest" };
  var payload = {};
  payload[EP_CSV_NS + "part"] = "changeStatus";
  payload[EP_CSV_NS + "applyCd"] = applyCd;
  payload[EP_CSV_NS + "statusKbn"] = statusKbn;

  var res = epFetch_(EP_CSV_RES, { method: "post", payload: payload, headers: hdr }, jar);
  var code = res.getResponseCode(), body = String(res.getContentText() || "");
  var isError = /["']value["']\s*:\s*["']ERROR["']/i.test(body);
  var ok = (code === 200) && !isError;

  epLogStatusChange_(applyCd, statusKbn, ok, ok ? "" : ("HTTP=" + code + " " + body.replace(/\s+/g, " ").slice(0, 200)));
  if (ok) epApplyStatusLocally_(applyCd, statusKbn);
  return { ok: ok, error: ok ? "" : (isError ? "EP側でエラー（応募者コード/権限を確認）" : ("HTTP=" + code)), name: EP_STATUS_MAP[statusKbn], code: statusKbn };
}

/** 動作確認：実在コードを埋めて実行。現在と同じステータスに送れば実質無変更で成否だけ分かる。 */
function epTestStatus() {
  var applyCd = "";     // 例: "5002057544"（EPの応募者コード）
  var statusKbn = "";   // 例: 現在のコード "01"
  if (!applyCd || !statusKbn) { Logger.log("epTestStatus: applyCd と statusKbn を埋めてから実行してください"); return; }
  var props = PropertiesService.getScriptProperties(), save = props.getProperty("EP_WRITE_ENABLED");
  props.setProperty("EP_WRITE_ENABLED", "1");
  var r = epSetStatus(applyCd, statusKbn);
  if (save == null) props.deleteProperty("EP_WRITE_ENABLED"); else props.setProperty("EP_WRITE_ENABLED", save);
  Logger.log("結果: " + JSON.stringify(r));
}

function epLogStatusChange_(applyCd, statusKbn, ok, note) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = epSheet_(ss, "_ステータス変更ログ", ["日時", "応募者コード", "新コード", "新ステータス", "結果", "メモ"]);
  sh.appendRow([Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"), applyCd, statusKbn, EP_STATUS_MAP[statusKbn] || "", ok ? "成功" : "失敗", note || ""]);
}

/** 変更成功時、手元のraw_応募者とapp_cacheも即時反映（次の取得を待たずアプリに出す）。 */
function epApplyStatusLocally_(applyCd, statusKbn) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var raw = ss.getSheetByName("raw_応募者"); if (!raw) return;
    var vals = raw.getDataRange().getValues(), h = vals[0];
    var ci = h.indexOf("応募者コード"), sci = h.indexOf("ステータスコード"), sni = h.indexOf("ステータス"), upi = h.indexOf("最終更新日");
    if (ci < 0) return;
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][ci]) === String(applyCd)) {
        if (sci >= 0) raw.getRange(i + 1, sci + 1).setValue(statusKbn);
        if (sni >= 0) raw.getRange(i + 1, sni + 1).setValue(EP_STATUS_MAP[statusKbn] || "");
        if (upi >= 0) raw.getRange(i + 1, upi + 1).setValue(Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd"));
        break;
      }
    }
    try { dashStoreCache_(); } catch (e) { }
  } catch (e) { Logger.log("ローカル反映スキップ: " + e); }
}
