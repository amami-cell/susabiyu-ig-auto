/* 専用プレビュー受け取りGAS v2（既存の確認アプリGASとは別の、独立した小さなスクリプト）
 *
 * v2: 指定フォルダが開けない場合は、実行アカウント自身のドライブに
 *     「天見プレビュー（自動）」を作成してそこへ保存＋SHARE_TOに共有。
 *     応答に実行アカウントと保存先URLを含める（診断用）。
 *
 * 更新の仕方: コードを全部置き換えて保存 → デプロイ → デプロイを管理 →
 *   （鉛筆マーク）→ バージョン「新バージョン」→ デプロイ（URLは変わりません）
 */

var PV_FOLDER = "1WpCYFb0OUV2vkLysacVnZiUDZjQOaV5v";  // 天見プレビュー フォルダ
var PV_TOKEN = "SWKBZqXmhdjP6oH1KWk-2DDePafm8C65";    // 合言葉（ロボットしか知らない）
var SHARE_TO = "amami@8sin.co.jp";                     // 自動作成時の共有先

function _folder() {
  try { return DriveApp.getFolderById(PV_FOLDER); } catch (e) {}
  var it = DriveApp.getRootFolder().getFoldersByName("天見プレビュー（自動）");
  if (it.hasNext()) return it.next();
  var f = DriveApp.createFolder("天見プレビュー（自動）");
  try { f.addEditor(SHARE_TO); } catch (e) {}
  return f;
}

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    if (!b || b.token !== PV_TOKEN) return _out({ error: "auth" });
    var me = "";
    try { me = Session.getEffectiveUser().getEmail(); } catch (err) {}
    if (b.ping) return _out({ ok: 1, pong: 1, email: me });
    var name = String(b.name || "video.mp4").replace(/[\\\/:*?"<>|]/g, "_");
    var blob = Utilities.newBlob(Utilities.base64Decode(b.b64), b.mime || "video/mp4", name);
    var fo = _folder();
    var f = fo.createFile(blob);
    return _out({ ok: 1, id: f.getId(), name: f.getName(), size: f.getSize(),
                  email: me, folder: fo.getUrl(), folderName: fo.getName() });
  } catch (err) {
    return _out({ error: String(err) });
  }
}

function doGet(e) {
  return _out({ ok: 1, service: "pv2" });
}

function _out(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
