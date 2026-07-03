/* 専用プレビュー受け取りGAS v4
 * v4: サブフォルダ保管（arch=【鮨処】等へ移動）＋サブフォルダ指定納品(sub)を追加。
 *     v3の機能（同番号の旧版自動入れ替え・sweep一括掃除）も含む。
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

function _sub(fo, name) {  // 棚の中のサブフォルダ（無ければ作成）
  var it = fo.getFoldersByName(name);
  return it.hasNext() ? it.next() : fo.createFolder(name);
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
    // 保管: 名前が b.match で始まるファイルをサブフォルダ b.arch へ移動
    if (b.arch) {
      var dst = _sub(fo, String(b.arch));
      var c = 0, it3 = fo.getFiles();
      while (it3.hasNext()) {
        var f2 = it3.next();
        if (!b.match || String(f2.getName()).indexOf(String(b.match)) === 0) {
          f2.moveTo(dst); c++;
        }
      }
      return _out({ ok: 1, moved: c, folder: dst.getUrl(), folderName: dst.getName() });
    }
    var name = String(b.name || "video.mp4").replace(/[\\\/:*?"<>|]/g, "_");
    var target = b.sub ? _sub(fo, String(b.sub)) : fo;
    // 同じ番号（①〜⑩）の旧バージョンを自動でゴミ箱へ＝作り直しても増えない（保存先フォルダ内のみ）
    var m = name.match(/[①②③④⑤⑥⑦⑧⑨⑩]/);
    if (m) {
      var it2 = target.getFiles();
      while (it2.hasNext()) {
        var f1 = it2.next();
        if (f1.getName().indexOf(m[0]) >= 0) f1.setTrashed(true);
      }
    }
    var blob = Utilities.newBlob(Utilities.base64Decode(b.b64), b.mime || "video/mp4", name);
    var f = target.createFile(blob);
    return _out({ ok: 1, id: f.getId(), name: f.getName(), size: f.getSize(),
                  email: me, folder: target.getUrl(), folderName: target.getName() });
  } catch (err) {
    return _out({ error: String(err) });
  }
}

function doGet(e) {
  return _out({ ok: 1, service: "pv4" });
}

function _out(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
