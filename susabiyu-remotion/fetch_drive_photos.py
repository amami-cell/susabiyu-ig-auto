import os, io, glob, json, sys
from collections import defaultdict

FOOD_FOLDER = "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"
LOGO_FOLDER = "1wAXPa6v3F-YC7dj6-j243xEkxra8RKOf"
N = 5
MIN_SIDE = 800
OUT = os.path.join("public", "photos")

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
print("creds:", creds_path)

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
                fields="nextPageToken, files(id,name,mimeType,createdTime,imageMediaMetadata(width,height))",
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
    return min(m.get("width", 0) or 0, m.get("height", 0) or 0)

def download(file_id, dest):
    req = drive.files().get_media(fileId=file_id)
    buf = io.FileIO(dest, "wb")
    dl = MediaIoBaseDownload(buf, req)
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.close()

allimg = gather(FOOD_FOLDER)
if not allimg:
    print("NG: FOOD配下に画像が見つかりません。")
    raise SystemExit

big = [f for f in allimg if short_side(f) >= MIN_SIDE]
print("全%d枚中 / 短辺%dpx以上: %d枚" % (len(allimg), MIN_SIDE, len(big)))
if big:
    allimg = big

import usage
allimg = usage.prefer(allimg, creds_path) or allimg
by_cat = defaultdict(list)
for im in allimg:
    by_cat[im["cat"]].append(im)
for c in by_cat:
    by_cat[c].sort(key=lambda x: x.get("createdTime", ""), reverse=True)
cats = sorted(by_cat.keys(), key=lambda c: by_cat[c][0].get("createdTime", ""), reverse=True)
picked = []
idx = defaultdict(int)
while len(picked) < N:
    progressed = False
    for c in cats:
        if idx[c] < len(by_cat[c]):
            picked.append(by_cat[c][idx[c]])
            idx[c] += 1
            progressed = True
            if len(picked) >= N:
                break
    if not progressed:
        break

usage.record(creds_path, picked, "sushi")
os.makedirs(OUT, exist_ok=True)
for old in glob.glob(os.path.join(OUT, "*")):
    try:
        os.remove(old)
    except Exception:
        pass

entries = []
for i, f in enumerate(picked, 1):
    ext = ".jpg"
    if "png" in f["mimeType"]:
        ext = ".png"
    elif "webp" in f["mimeType"]:
        ext = ".webp"
    dest = os.path.join(OUT, "%02d%s" % (i, ext))
    download(f["id"], dest)
    cap = os.path.splitext(f["name"])[0]
    entries.append(("photos/%02d%s" % (i, ext), cap))
    print("DL:", dest, "| [%s]" % f["cat"], "caption:", cap)

logo_path = os.path.join("public", "logo.png")
has_logo = False
try:
    logos = gather(LOGO_FOLDER)
    pngs = [x for x in logos if "png" in x["mimeType"]]
    pick = (pngs or logos)[0] if logos else None
    if pick:
        download(pick["id"], logo_path)
        has_logo = True
        print("LOGO:", pick["name"], "-> public/logo.png")
except Exception:
    print("ロゴはDriveから取得できず。public/logo.png があれば使います。")
if not has_logo and os.path.exists(logo_path):
    has_logo = True
    print("既存の public/logo.png を使用します。")

lines = ["export const photos: { src: string; caption: string }[] = ["]
for src, cap in entries:
    cap2 = cap.replace("\\", "\\\\").replace('"', '\\"')
    lines.append('  { src: "%s", caption: "%s" },' % (src, cap2))
lines.append("];")
lines.append("export const hasLogo: boolean = %s;" % ("true" if has_logo else "false"))
open(os.path.join("src", "photoData.ts"), "w", encoding="utf-8").write("\n".join(lines) + "\n")

print("完了:", len(entries), "枚（カテゴリ分散・短辺%dpx以上）。 logo: %s" % (MIN_SIDE, has_logo))
