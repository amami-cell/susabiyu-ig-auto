/* 専用プレビュー受け取りGAS v3
 * v3: ①〜⑥の同じ番号の旧バージョンを自動でゴミ箱へ（常に最新だけ残る）＋
 *     sweep命令（指定の文字で始まる古いファイルの一括掃除）を追加。
 *
 * 更新の仕方: コードを全部置き換えて保存 → デプロイ → デプロイを管理 →
 *   （鉛筆マーク）→ バージョン「新バージョン」→ デプロイ（URLは変わりません）
 */

var PV_FOLDER = "1WpCYFb0OUV2vkLysacVnZiUDZjQOaV5v";
var PV_TOKEN = "SWKBZqXmhdjP6oH1KWk-2DDePafm8C65";
var SHARE_TO = "amami@8sin.co.jp";

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
    var fo = _folder();
    // 掃除: 名前が b.sweep で始まるファイルをゴミ箱へ
    if (b.sweep) {
      var n = 0, it = fo.getFiles();
      while (it.hasNext()) {
        var f0 = it.next();
        if (String(f0.getName()).indexOf(String(b.sweep)) === 0) { f0.setTrashed(true); n++; }
      }
      return _out({ ok: 1, swept: n });
    }
    var name = String(b.name || "video.mp4").replace(/[\\\/:*?"<>|]/g, "_");
    // 同じ番号（①〜⑩）の旧バージョンを自動でゴミ箱へ＝作り直しても増えない
    var m = name.match(/[①②③④⑤⑥⑦⑧⑨⑩]/);
    if (m) {
      var it2 = fo.getFiles();
      while (it2.hasNext()) {
        var f1 = it2.next();
        if (f1.getName().indexOf(m[0]) >= 0) f1.setTrashed(true);
      }
    }
    var blob = Utilities.newBlob(Utilities.base64Decode(b.b64), b.mime || "video/mp4", name);
    var f = fo.createFile(blob);
    return _out({ ok: 1, id: f.getId(), name: f.getName(), size: f.getSize(),
                  email: me, folder: fo.getUrl(), folderName: fo.getName() });
  } catch (err) {
    return _out({ error: String(err) });
  }
}

function doGet(e) {
  return _out({ ok: 1, service: "pv3" });
}

function _out(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
