/* 専用プレビュー受け取りGAS（既存の確認アプリGASとは別の、独立した小さなスクリプト）
 *
 * 役割: 自動生成した動画を、あなたのGoogleドライブ「天見プレビュー」フォルダに保存する。
 *       GASはあなたのアカウントとして動くので、ロボットの容量制限を受けない。
 *       保存先はあなたのドライブ＝共有していない限り、本当にあなたしか見られない。
 *
 * 使い方（1回だけ・約2分）:
 *   1. script.google.com → 「新しいプロジェクト」
 *   2. この内容をまるごと貼り付けて保存（名前は「プレビュー受け取り」など）
 *   3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *        実行するユーザー: 自分
 *        アクセスできるユーザー: 全員
 *      → デプロイ → 表示された「ウェブアプリのURL（…/exec）」をチャットに貼る
 *   ※「全員」でも、下のPV_TOKENが一致しないと何もできません（動画の閲覧は一切不可）。
 */

var PV_FOLDER = "1WpCYFb0OUV2vkLysacVnZiUDZjQOaV5v";  // 天見プレビュー フォルダ
var PV_TOKEN = "SWKBZqXmhdjP6oH1KWk-2DDePafm8C65";    // 合言葉（ロボットしか知らない）

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    if (!b || b.token !== PV_TOKEN) return _out({ error: "auth" });
    if (b.ping) return _out({ ok: 1, pong: 1 });
    var name = String(b.name || "video.mp4").replace(/[\\\/:*?"<>|]/g, "_");
    var blob = Utilities.newBlob(Utilities.base64Decode(b.b64), b.mime || "video/mp4", name);
    var f = DriveApp.getFolderById(PV_FOLDER).createFile(blob);
    return _out({ ok: 1, id: f.getId(), name: f.getName(), size: f.getSize() });
  } catch (err) {
    return _out({ error: String(err) });
  }
}

function doGet(e) {
  return _out({ ok: 1, service: "pv" });
}

function _out(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
