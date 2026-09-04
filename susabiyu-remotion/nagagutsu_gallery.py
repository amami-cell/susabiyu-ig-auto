# -*- coding: utf-8 -*-
"""ナガグツ：Drive内の全料理写真を「その料理のキャプション付き」で一覧できる確認ページを1枚のHTMLで作る。
サムネはページ内にdata-URIで埋め込む（＝外部依存ゼロ・開いた瞬間に表示・スマホで軽い）。
出来たHTMLを poster.up(cdn=True) で永続ホスト(jsDelivr)へ上げ、URLをログに出す。投稿はしない。

使い方（CI）:  STORE_ACCOUNT=nagagutsu python nagagutsu_gallery.py creds.json
必要env: GOOGLE_CREDS_B64 / GH_MEDIA_TOKEN / GH_MEDIA_REPO
"""
import os, sys, io, glob, json, base64, html, datetime

import stores
import nagagutsu_captions as nc
import poster
from list_dishes import clean_caption, is_drink

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from PIL import Image

THUMB = 460      # サムネ長辺px（スマホで十分・軽い）
JPEGQ = 70


def find_creds():
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        return sys.argv[1]
    if os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
        return "creds.json"
    for p in glob.glob("*.json") + glob.glob("../*.json"):
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        if isinstance(d, dict) and d.get("type") == "service_account":
            return p
    return None


def main():
    account = os.environ.get("STORE_ACCOUNT", "nagagutsu").strip() or "nagagutsu"
    store = stores.get_store(account)
    food = (store.get("folders") or {}).get("food")
    if not food:
        raise SystemExit("food フォルダ未設定: %r" % account)
    excl = [s.strip() for s in (store.get("exclude_cats") or []) if s.strip()]

    creds_path = find_creds()
    if not creds_path:
        raise SystemExit("認証JSONが見つかりません。")
    creds = service_account.Credentials.from_service_account_file(
        creds_path, scopes=["https://www.googleapis.com/auth/drive.readonly"])
    drive = build("drive", "v3", credentials=creds)

    def children(fid):
        out, page = [], None
        while True:
            r = drive.files().list(
                q="'%s' in parents and trashed=false" % fid,
                fields="nextPageToken, files(id,name,mimeType,imageMediaMetadata(width,height))",
                pageSize=100, pageToken=page,
                supportsAllDrives=True, includeItemsFromAllDrives=True,
            ).execute()
            out += r.get("files", [])
            page = r.get("nextPageToken")
            if not page:
                break
        return out

    def excluded(nm):
        return bool(excl) and any(x in str(nm or "") for x in excl)

    items = []   # (category, cleanName, fileId)

    def walk(fid, folder="料理", depth=0):
        for f in children(fid):
            nm = f.get("name", "")
            if f["mimeType"] == "application/vnd.google-apps.folder":
                if excluded(nm) or is_drink(nm):
                    continue
                if depth < 3:
                    walk(f["id"], nm, depth + 1)
            elif f["mimeType"].startswith("image/"):
                if excluded(nm):
                    continue
                items.append((folder, clean_caption(nm), f["id"]))

    print("走査開始:", food)
    walk(food)
    items.sort(key=lambda t: (t[0], t[1]))
    print("料理写真 %d 枚" % len(items))

    def thumb_data_uri(file_id):
        buf = io.BytesIO()
        req = drive.files().get_media(fileId=file_id)
        dl = MediaIoBaseDownload(buf, req)
        done = False
        while not done:
            _, done = dl.next_chunk()
        buf.seek(0)
        im = Image.open(buf).convert("RGB")
        im.thumbnail((THUMB, THUMB))
        out = io.BytesIO()
        im.save(out, "JPEG", quality=JPEGQ, optimize=True)
        return "data:image/jpeg;base64," + base64.b64encode(out.getvalue()).decode()

    cards = []
    for i, (cat, name, fid) in enumerate(items, 1):
        try:
            uri = thumb_data_uri(fid)
        except Exception as e:
            print("[SKIP] %s: %s" % (name, e)); continue
        c = nc.caption_for(name)
        cards.append({
            "cat": cat, "title": c["title"], "story": c["story"],
            "cap": c["cap"], "tags": c["tags"], "uri": uri,
        })
        print("OK %2d %s" % (i, name))

    # カテゴリ順に並べつつ見出しを挟む
    esc = html.escape
    body = []
    last_cat = None
    for c in cards:
        if c["cat"] != last_cat:
            body.append('<h2 class="cat">%s</h2>' % esc(c["cat"]))
            last_cat = c["cat"]
        cap_html = esc(c["cap"]).replace("\n", "<br>")
        body.append(
            '<div class="card">'
            '<img loading="lazy" src="%s" alt="%s">'
            '<div class="meta">'
            '<div class="name">%s</div>'
            '<div class="story">%s</div>'
            '<div class="cap">%s</div>'
            '<div class="tags">%s</div>'
            '</div></div>' % (
                c["uri"], esc(c["title"]), esc(c["title"]),
                esc(c["story"]), cap_html, esc(c["tags"]))
        )

    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
    doc = """<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ナガグツ 料理キャプション一覧</title>
<style>
:root{--bg:#17110b;--card:#20160d;--ink:#F6EFE0;--sub:#D6C4A0;--acc:#E7DCC4;--line:#3a2c1b}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif;-webkit-text-size-adjust:100%}
header{position:sticky;top:0;background:linear-gradient(#17110bF2,#17110bCC);backdrop-filter:blur(6px);padding:14px 16px;border-bottom:1px solid var(--line);z-index:5}
header h1{margin:0;font-size:17px;letter-spacing:2px}
header .sub{color:var(--sub);font-size:12px;margin-top:3px}
.wrap{max-width:900px;margin:0 auto;padding:12px 12px 60px}
h2.cat{font-size:14px;letter-spacing:3px;color:var(--acc);border-left:3px solid var(--acc);padding:4px 10px;margin:22px 4px 10px}
.grid{display:grid;grid-template-columns:1fr;gap:12px}
@media(min-width:620px){.grid{grid-template-columns:1fr 1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.card img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;background:#000}
.meta{padding:11px 13px 13px}
.name{font-size:16px;font-weight:700;letter-spacing:.5px}
.story{margin-top:5px;color:var(--acc);font-size:13px;letter-spacing:1px}
.cap{margin-top:8px;color:var(--ink);font-size:13px;line-height:1.6;opacity:.95}
.tags{margin-top:8px;color:var(--sub);font-size:11px;line-height:1.5;word-break:break-all}
</style></head><body>
<header><h1>ナガグツ 料理キャプション一覧</h1>
<div class="sub">全%d品 ／ 各料理：写真＋ストーリー短句＋投稿本文＋タグ ／ %s 時点</div></header>
<div class="wrap"><div class="grid">
%s
</div></div></body></html>""" % (len(cards), now, "\n".join(body))

    os.makedirs("out", exist_ok=True)
    outp = "out/nagagutsu_menu.html"
    open(outp, "w", encoding="utf-8").write(doc)
    kb = os.path.getsize(outp) // 1024
    print("HTML書き出し:", outp, "(%d KB / %d品)" % (kb, len(cards)))

    url = poster.up(outp, cdn=True)
    print("\n===== GALLERY URL ここから =====")
    print(url or "(アップロード失敗)")
    print("===== GALLERY URL ここまで =====")


if __name__ == "__main__":
    main()
