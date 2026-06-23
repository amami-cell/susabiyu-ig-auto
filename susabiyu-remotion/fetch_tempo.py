import os, io, glob, json, sys, random

FOOD_FOLDER = "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"
N_PHOTOS = 6
MIN_SIDE = 800
OUT_DIR = os.path.join("public", "tempo")
UPTEMPO_DIR = os.path.join("public", "music", "uptempo")

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
except ImportError:
    print("NG: googleライブラリ未インストール。")
    raise SystemExit

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

scopes = ["https://www.googleapis.com/auth/drive.readonly"]
creds = service_account.Credentials.from_service_account_file(creds_path, scopes=scopes)
drive = build("drive", "v3", credentials=creds)

def list_children(fid):
    out = []
    page = None
    while True:
        res = drive.files().list(
            q="'%s' in parents and trashed=false" % fid,
            fields="nextPageToken, files(id,name,mimeType,imageMediaMetadata(width,height))",
            pageSize=100, pageToken=page,
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        out += res.get("files", [])
        page = res.get("nextPageToken")
        if not page:
            break
    return out

def short_side(f):
    m = f.get("imageMediaMetadata") or {}
    return min(m.get("width", 0) or 0, m.get("height", 0) or 0)

cats = {}
for f in list_children(FOOD_FOLDER):
    if f["mimeType"] == "application/vnd.google-apps.folder":
        imgs = [g for g in list_children(f["id"])
                if g["mimeType"].startswith("image/") and short_side(g) >= MIN_SIDE]
        if imgs:
            cats[f["name"]] = imgs

if not cats:
    print("NG: 条件を満たす画像が見つかりません。")
    raise SystemExit

import usage
cats = usage.prefer_cats(cats, creds_path) or cats
names = list(cats.keys())
random.shuffle(names)
for k in cats:
    random.shuffle(cats[k])
picked = []
i = 0
while len(picked) < N_PHOTOS and any(cats[k] for k in names):
    k = names[i % len(names)]
    if cats[k]:
        picked.append(cats[k].pop())
    i += 1

_fx = [x for x in os.environ.get("FIXED_IDS", "").split(",") if x]
if _fx:
    picked = [drive.files().get(fileId=_i, fields="id,name,mimeType,imageMediaMetadata(width,height),createdTime", supportsAllDrives=True).execute() for _i in _fx]
usage.record(creds_path, picked, "tempo")
os.makedirs(OUT_DIR, exist_ok=True)
items = []
for idx, f in enumerate(picked):
    ext = os.path.splitext(f["name"])[1] or ".jpg"
    local = "%d%s" % (idx, ext)
    req = drive.files().get_media(fileId=f["id"])
    buf = io.FileIO(os.path.join(OUT_DIR, local), "wb")
    dl = MediaIoBaseDownload(buf, req)
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.close()
    caption = os.path.splitext(f["name"])[0]
    items.append({"src": "tempo/" + local, "caption": caption})
    print("PHOTO %d:" % idx, f["name"], "(短辺", short_side(f), "px)")

music = "bgm.mp3"
if os.path.isdir(UPTEMPO_DIR):
    tracks = [p for p in os.listdir(UPTEMPO_DIR)
              if p.lower().endswith((".mp3", ".m4a", ".wav"))]
    if tracks:
        music = "music/uptempo/" + random.choice(tracks)
print("MUSIC:", music)

def esc(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')

import json as _pj, os as _po
_po.makedirs("out", exist_ok=True)
_pj.dump({"ids": [f["id"] for f in picked], "caption": "", "music": music}, open(_po.path.join("out", "picked.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("PICKED ->", "out/picked.json")
music = os.environ.get("FIXED_MUSIC") or music
lines = ["export const tempoPhotos = ["]
for it in items:
    lines.append('  { src: "%s", caption: "%s" },' % (esc(it["src"]), esc(it["caption"])))
lines.append("];")
lines.append('export const tempoMusic = "%s";' % esc(music))
open(os.path.join("src", "tempoData.ts"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("src/tempoData.ts 書き出し完了。", len(items), "枚 / music:", music)
