import os, io, glob, json, sys, random

FOOD_FOLDER = "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"
# 1枚見せの全画面動画には「外観/内観・コース」も織り交ぜる（画面に商品名＝ファイル名は出ず雰囲気フレーズのみ）。
INTERIOR_FOLDER = os.environ.get("GENRE_INTERIOR_ID") or "17h9qNWIEisEaEqNUuH-6XA39eVxgfHQW"  # 外観・内観
EVENT_FOLDER    = os.environ.get("GENRE_EVENT_ID") or "1J4NMPxNW3T3IVLmj470-urEhTEicwW5w"  # コース
OUT = os.path.join("public", "photostory.jpg")
MIN_SIDE = 1080

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

NORMAL_DIR = os.path.join("public", "music", "normal")
def _music_children(fid):
    out = []
    page = None
    while True:
        res = drive.files().list(q="'%s' in parents and trashed=false" % fid,
            fields="nextPageToken, files(id,name)", pageSize=100, pageToken=page,
            supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
        out += res.get("files", [])
        page = res.get("nextPageToken")
        if not page:
            break
    return out
def sync_music_from_drive(folder_id, local_dir):
    if not folder_id:
        return
    try:
        os.makedirs(local_dir, exist_ok=True)
        for f in _music_children(folder_id):
            name = f.get("name", "")
            if not name.lower().endswith((".mp3", ".m4a", ".wav")):
                continue
            dest = os.path.join(local_dir, name)
            if os.path.exists(dest):
                continue
            req = drive.files().get_media(fileId=f["id"])
            buf = io.FileIO(dest, "wb")
            dl = MediaIoBaseDownload(buf, req)
            done = False
            while not done:
                _, done = dl.next_chunk()
            buf.close()
            print("[MUSIC DL]", name)
    except Exception as e:
        print("[MUSIC] sync skip:", e)
def pick_music():
    music = "bgm.mp3"
    sync_music_from_drive(os.environ.get("GENRE_MUSIC_NORMAL_ID"), NORMAL_DIR)
    if os.path.isdir(NORMAL_DIR):
        tracks = [t for t in os.listdir(NORMAL_DIR)
                  if t.lower().endswith((".mp3", ".m4a", ".wav"))]
        if tracks:
            music = "music/normal/" + random.choice(tracks)
    return os.environ.get("FIXED_MUSIC") or music

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

food = gather(FOOD_FOLDER)
for f in food:
    f["genre"] = "food"
atmo = gather(INTERIOR_FOLDER) + gather(EVENT_FOLDER)   # 外観/内観・コース
for f in atmo:
    f["genre"] = "atmo"
imgs = food + atmo
print("素材: 料理=%d枚 / 外観内観コース=%d枚" % (len(food), len(atmo)))
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
elif os.environ.get("PREVIEW_ATMO"):
    # プレビュー専用：外観/内観・コースを確実に全画面で見せる（あとで削除する一時動作）
    _ap = [f for f in pool if f.get("genre") == "atmo"] or pool
    pick = random.choice(_ap)
else:
    pick = random.choice(pool)
usage.record(creds_path, [pick], "photo")
print("選択:", pick["name"], "(短辺", short_side(pick), "px)")

req = drive.files().get_media(fileId=pick["id"])
buf = io.FileIO(OUT, "wb")
dl = MediaIoBaseDownload(buf, req)
done = False
while not done:
    _, done = dl.next_chunk()
buf.close()
print("PHOTO:", pick["name"], "-> public/photostory.jpg")

import captions
if pick.get("genre") == "atmo":
    phrase = captions.pick_atmosphere()   # 外観/内観・コースは料理を感じさせない雰囲気フレーズのみ
else:
    phrase = captions.pick([pick.get("cat", "")])
print("PHRASE:", phrase, "| cat:", pick.get("cat", "?"), "| genre:", pick.get("genre", "food"))
music = pick_music()
print("MUSIC:", music)
import json as _pj, os as _po
_po.makedirs("out", exist_ok=True)
_pj.dump({"ids": [pick["id"]], "caption": phrase, "music": music}, open(_po.path.join("out", "picked.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("PICKED ->", "out/picked.json")


has_logo = os.path.exists(os.path.join("public", "logo.png"))

ph = phrase.replace("\\", "\\\\").replace('"', '\\"')
_m = music.replace("\\", "\\\\").replace('"', '\\"')
ts = (
    'export const photoStoryPhoto = "photostory.jpg";\n'
    'export const photoStoryCaption = "%s";\n'
    'export const photoStoryHasLogo = %s;\n'
    'export const photoStoryMusic = "%s";\n'
) % (ph, "true" if has_logo else "false", _m)
open(os.path.join("src", "photoStoryData.ts"), "w", encoding="utf-8").write(ts)
print("src/photoStoryData.ts 書き出し完了。 logo:", has_logo)
