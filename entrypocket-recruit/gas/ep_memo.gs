/**
 * EntryPocket 応募者メモの書き戻し（アプリ→EP）。
 *
 * 仕組み（実機で確認）：メモは pageFlg=popupNote のポップアップ内フォーム(noteForm)を
 *   ACTION(p_p_lifecycle=1) で送信する。トークン(p_auth)/hidden(formDate) は都度変わるので、
 *   保存のたびにポップアップを取得して action と hidden をそのまま使い、note だけ差し替えて送信する。
 *
 * 安全策：epWriteEnabled_()（既定ON、EP_WRITE_ENABLED="0"で停止）。全て _メモ変更ログ に記録。
 * EP側は note=100文字以内・上書き。長い場合は100字に切る。
 */
function epSetMemo(applyCd, memo) {
  applyCd = String(applyCd == null ? "" : applyCd).trim();
  memo = String(memo == null ? "" : memo);
  if (memo.length > 100) memo = memo.slice(0, 100);
  if (!applyCd) return { ok: false, error: "応募者コードが空です" };
  if (!epWriteEnabled_()) return { ok: false, error: '書き込みが無効化されています（EP_WRITE_ENABLED="0" を解除）' };

  var jar = epLogin_();
  if (!jar) { epLogMemo_(applyCd, memo, false, "ログイン失敗"); return { ok: false, error: "ログイン失敗" }; }

  var NS = EP_CSV_NS;
  var purl = EP_APPLICANT_URL + "?p_p_id=applycontrol_WAR_MYNApplyControlportlet" +
    "&p_p_lifecycle=0&p_p_state=pop_up&p_p_mode=view" +
    "&" + NS + "applyCds=" + encodeURIComponent(applyCd) +
    "&" + NS + "pageFlg=popupNote&" + NS + "PageNo=1&" + NS + "DisplayNum=50";

  var pop;
  try { pop = epFetch_(purl, { method: "get" }, jar).getContentText(); }
  catch (e) { epLogMemo_(applyCd, memo, false, "popup取得失敗:" + e); return { ok: false, error: "メモ画面の取得に失敗" }; }

  // note を含むフォーム（ACTION, lifecycle=1）を取り出す
  var fm = pop.match(/<form[^>]*action="([^"]*p_p_lifecycle=1[^"]*)"[^>]*>([\s\S]*?)<\/form>/i);
  if (!fm) { epLogMemo_(applyCd, memo, false, "noteForm未検出"); return { ok: false, error: "メモ画面の解析に失敗" }; }
  var action = fm[1].replace(/&amp;/g, "&"), inner = fm[2];

  // フォーム内の全 input/textarea を name→value で拾う（formDate 等の hidden 込み）
  var payload = {};
  var tags = inner.match(/<(?:input|textarea)[^>]*>/gi) || [];
  tags.forEach(function (tag) {
    var nm = (tag.match(/name="([^"]+)"/) || [])[1];
    if (!nm) return;
    var val = (tag.match(/value="([^"]*)"/) || [])[1] || "";
    payload[nm] = val;
  });
  payload[NS + "note"] = memo;                 // メモ本文を差し替え
  if (!(NS + "applyCds" in payload)) payload[NS + "applyCds"] = applyCd;

  var hdr = { "Referer": purl, "X-Requested-With": "XMLHttpRequest" };
  var res = epFetch_(action, { method: "post", payload: payload, headers: hdr, followRedirects: true }, jar);
  var code = res.getResponseCode(), body = String(res.getContentText() || "");
  var ok = (code === 200 || code === 302) && !/value["']\s*:\s*["']ERROR/i.test(body);

  epLogMemo_(applyCd, memo, ok, ok ? "" : ("HTTP=" + code + " " + body.replace(/\s+/g, " ").slice(0, 160)));
  if (ok) epApplyMemoLocally_(applyCd, memo);
  return { ok: ok, error: ok ? "" : ("HTTP=" + code), memo: memo };
}

function epLogMemo_(applyCd, memo, ok, note) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = epSheet_(ss, "_メモ変更ログ", ["日時", "応募者コード", "メモ", "結果", "メモ欄"]);
  sh.appendRow([Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"), applyCd, memo, ok ? "成功" : "失敗", note || ""]);
}

/** 保存成功時、手元の raw_応募者 と app_cache も即反映（次の取得を待たない）。 */
function epApplyMemoLocally_(applyCd, memo) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var raw = ss.getSheetByName("raw_応募者"); if (!raw) return;
    var vals = raw.getDataRange().getValues(), h = vals[0];
    var ci = h.indexOf("応募者コード"), mi = h.indexOf("メモ"), upi = h.indexOf("最終更新日");
    if (ci < 0 || mi < 0) return;
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][ci]) === String(applyCd)) {
        raw.getRange(i + 1, mi + 1).setValue(memo);
        if (upi >= 0) raw.getRange(i + 1, upi + 1).setValue(Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd"));
        break;
      }
    }
    try { dashStoreCache_(); } catch (e) { }
  } catch (e) { Logger.log("メモのローカル反映スキップ: " + e); }
}
