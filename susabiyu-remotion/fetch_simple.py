import os, io, glob, json, sys, random

FOOD_FOLDER = "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"
INTERIOR_FOLDER = os.environ.get("GENRE_INTERIOR_ID") or "17h9qNWIEisEaEqNUuH-6XA39eVxgfHQW"
OUT = os.path.join("public", "simple.jpg")
MIN_SIDE = 1000

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
except ImportError:
    print("NG: googleライブラリ未インストール。 pip install google-api-python-client google-auth")
    raise SystemExit

def find_creds():
    bases = [".", "..", os.path.join("..", ".."), os.path.join("..", "..", "credentials"),
             os.path.join("..", "..", "infomart_automation")]
    for b in bases:
        for p in glob.glob(os.path.join(b, "*.json")):
            ap = os.path.abspath(p)
            if "node_modules" in ap:
                continue
            try:
                d = json.load(open(ap, encoding="utf-8"))
            except Exception:
                continue
            if isinstance(d, dict) and d.get("type") == "service_account":
                return ap
    return None

creds_path = sys.argv[1] if len(sys.argv) > 1 and os.path.exists(sys.argv[1]) else find_creds()
if not creds_path:
    print("NG: 認証JSON未指定。")
    raise SystemExit

scopes = ["https://www.googleapis.com/auth/drive.readonly"]
creds = service_account.Credentials.from_service_account_file(creds_path, scopes=scopes)
drive = build("drive", "v3", credentials=creds)

def gather(root_id):
    images = []
    stack = [(root_id, None)]
    seen = set()
    while stack:
        fid, fname = stack.pop()
        if fid in seen:
            continue
        seen.add(fid)
        page = None
        while True:
            res = drive.files().list(
                q="'%s' in parents and trashed=false" % fid,
                fields="nextPageToken, files(id,name,mimeType,imageMediaMetadata(width,height))",
                pageSize=100, pageToken=page,
                supportsAllDrives=True, includeItemsFromAllDrives=True,
            ).execute()
            for f in res.get("files", []):
                mt = f["mimeType"]
                if mt == "application/vnd.google-apps.folder":
                    stack.append((f["id"], f["name"]))
                elif mt.startswith("image/"):
                    f["cat"] = fname or "その他"
                    images.append(f)
            page = res.get("nextPageToken")
            if not page:
                break
    return images

def short_side(f):
    m = f.get("imageMediaMetadata") or {}
    w = m.get("width", 0) or 0
    h = m.get("height", 0) or 0
    return min(w, h)

imgs = gather(FOOD_FOLDER)
if not imgs:
    print("NG: 画像が見つかりません。")
    raise SystemExit

big = [f for f in imgs if short_side(f) >= MIN_SIDE]
print("全%d枚中 / 短辺%dpx以上: %d枚" % (len(imgs), MIN_SIDE, len(big)))
pool = big if big else sorted(imgs, key=short_side, reverse=True)[:1]
import usage
pool = usage.prefer(pool, creds_path) or pool
_fx = [x for x in os.environ.get("FIXED_IDS", "").split(",") if x]
if _fx:
    pick = drive.files().get(fileId=_fx[0], fields="id,name,mimeType,imageMediaMetadata(width,height)", supportsAllDrives=True).execute()
else:
    pick = random.choice(pool)
usage.record(creds_path, [pick], "simple")
print("選択:", pick["name"], "(短辺", short_side(pick), "px)")

req = drive.files().get_media(fileId=pick["id"])
buf = io.FileIO(OUT, "wb")
dl = MediaIoBaseDownload(buf, req)
done = False
while not done:
    _, done = dl.next_chunk()
buf.close()
print("PHOTO:", pick["name"], "-> public/simple.jpg")

import captions
phrase = captions.pick([pick.get("cat", "")])
print("PHRASE:", phrase, "| cat:", pick.get("cat", "?"))
import json as _pj, os as _po
_po.makedirs("out", exist_ok=True)
_pj.dump({"ids": [pick["id"]], "caption": phrase, "music": ""}, open(_po.path.join("out", "picked.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("PICKED ->", "out/picked.json")


_meta = pick.get("imageMediaMetadata") or {}
pw = int(_meta.get("width") or 0)
pph = int(_meta.get("height") or 0)
if pw <= 0 or pph <= 0:
    try:
        from PIL import Image as _I
        with _I.open(OUT) as _im:
            pw, pph = _im.size
    except Exception:
        pw, pph = 0, 0
print("DIM:", pw, "x", pph)

has_logo = os.path.exists(os.path.join("public", "logo.png"))

ph = phrase.replace("\\", "\\\\").replace('"', '\\"')
# 大衆画像デザイン用の固定背景（店内写真フォルダの1枚目＝毎回同じ）
_bg = ""
try:
    _q = "'%s' in parents and trashed=false and mimeType contains 'image/'" % INTERIOR_FOLDER
    _fs = drive.files().list(q=_q, fields="files(id,name)", pageSize=100).execute().get("files", [])
    _fs.sort(key=lambda f: f.get("name", ""))
    if _fs:
        _req = drive.files().get_media(fileId=_fs[0]["id"])
        _buf = io.FileIO(os.path.join("public", "taishu_bg.jpg"), "wb")
        _dl = MediaIoBaseDownload(_buf, _req)
        _dn = False
        while not _dn:
            _, _dn = _dl.next_chunk()
        _buf.close()
        _bg = "taishu_bg.jpg"
        print("[BG] taishu_bg.jpg <-", _fs[0].get("name"))
except Exception as _e:
    print("[BG] skip:", _e)

ts = (
    'export const simplePhoto = "simple.jpg";\n'
    'export const simplePhrase = "%s";\n'
    'export const simpleHasLogo = %s;\n'
    'export const simpleW = %d;\n'
    'export const simpleH = %d;\n'
    'export const simpleBg: string = "%s";\n'
    'export const simpleSeed = %d;\n'
) % (ph, "true" if has_logo else "false", pw, pph, _bg, random.randint(0, 9999))
open(os.path.join("src", "simpleData.ts"), "w", encoding="utf-8").write(ts)
print("src/simpleData.ts 書き出し完了。 logo:", has_logo)
