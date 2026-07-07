import os, sys, glob, json
from collections import OrderedDict

GENRES = OrderedDict([
    ("FOOD", "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"),
    ("SAKE", "1vIAC9frejCyGhQAizT1Wsgmlaj8ULhTb"),
    ("INTERIOR", "17h9qNWIEisEaEqNUuH-6XA39eVxgfHQW"),
    ("EVENT", "1J4NMPxNW3T3IVLmj470-urEhTEicwW5w"),
])
MIN_SIDE = 1000

from google.oauth2 import service_account
from googleapiclient.discovery import build

def find_creds():
    for b in [".", "..", os.path.join("..", "..")]:
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

creds = service_account.Credentials.from_service_account_file(creds_path, scopes=["https://www.googleapis.com/auth/drive.readonly"])
drive = build("drive", "v3", credentials=creds)

def gather(root_id):
    images = []
    stack = [(root_id, "")]
    seen = set()
    while stack:
        fid, path = stack.pop()
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
                    stack.append((f["id"], (path + "/" + f["name"]).lstrip("/")))
                elif mt.startswith("image/"):
                    f["folder"] = path
                    images.append(f)
            page = res.get("nextPageToken")
            if not page:
                break
    return images

def short_side(f):
    m = f.get("imageMediaMetadata") or {}
    return min(m.get("width", 0) or 0, m.get("height", 0) or 0)

lines = []
total = 0
for g, gid in GENRES.items():
    imgs = gather(gid)
    small = [f for f in imgs if short_side(f) < MIN_SIDE]
    small.sort(key=short_side)
    lines.append("=== %s （全%d枚中 %d枚が小さい）===" % (g, len(imgs), len(small)))
    for f in small:
        m = f.get("imageMediaMetadata") or {}
        lines.append("  %s  %sx%s  [%s]" % (f["name"], m.get("width", "?"), m.get("height", "?"), f.get("folder", "")))
    total += len(small)

out = "\n".join(lines)
print(out)
print("\n合計 小さい画像: %d枚（短辺%dpx未満）" % (total, MIN_SIDE))
open("small_images.txt", "w", encoding="utf-8").write(out + "\n\n合計: %d枚\n" % total)
print("一覧を small_images.txt に保存しました。")
