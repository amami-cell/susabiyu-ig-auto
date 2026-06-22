import os, sys, glob, json
from collections import OrderedDict

GENRES = OrderedDict([
    ("FOOD", "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"),
    ("SAKE", "1vIAC9frejCyGhQAizT1Wsgmlaj8ULhTb"),
    ("INTERIOR", "17h9qNWIEisEaEqNUuH-6XA39eVxgfHQW"),
    ("EVENT", "1J4NMPxNW3T3IVLmj470-urEhTEicwW5w"),
])
SOFT = 1000
HARD = 800

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
    stack = [root_id]
    seen = set()
    while stack:
        fid = stack.pop()
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
                    stack.append(f["id"])
                elif mt.startswith("image/"):
                    images.append(f)
            page = res.get("nextPageToken")
            if not page:
                break
    return images

def wh(f):
    m = f.get("imageMediaMetadata") or {}
    return (m.get("width", 0) or 0, m.get("height", 0) or 0)

lines = [
    "【写真 差し替えのお願い】",
    "下記は解像度が低く、ストーリー投稿で画質が粗くなってしまいます。",
    "高解像度での撮り直し、または元データの再アップをお願いします。（【要】は特に優先）",
    "",
]
n_hard = 0
n_soft = 0
for g, gid in GENRES.items():
    small = []
    for f in gather(gid):
        w, h = wh(f)
        s = min(w, h)
        if 0 < s < SOFT:
            small.append((s, os.path.splitext(f["name"])[0], w, h))
    small.sort()
    if not small:
        continue
    lines.append("- " + g + " -")
    for s, name, w, h in small:
        if s < HARD:
            lines.append("【要】%s（%dx%d）" % (name, w, h))
            n_hard += 1
        else:
            lines.append("%s（%dx%d）" % (name, w, h))
            n_soft += 1
    lines.append("")

text = "\n".join(lines).rstrip() + "\n"
print(text)
open("line_message.txt", "w", encoding="utf-8").write(text)
print("---- line_message.txt に保存しました（要差し替え %d件 / やや小さい %d件）" % (n_hard, n_soft))
