# お品書き(TaishuOshina/OshinaStory)専用の写真取得。
# 一〜二品目=寿司系、三〜四品目=寿司以外の料理（ドリンク・外観・内観は除外）。
# 出力は fetch_typo.py と同じ typoData.ts / public/typo（お品書きは typoPhotos を読む）。
import os, io, glob, json, sys, random

FOOD_FOLDER = "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"
N_SUSHI = 2
N_OTHER = 2
MIN_SIDE = 800
OUT_DIR = os.path.join("public", "typo")
NORMAL_DIR = os.path.join("public", "music", "normal")

# 料理以外とみなして除外するフォルダ名キーワード
_NG_KEYS = ("ドリンク", "飲み物", "飲物", "ビール", "サワー", "ハイボール", "ワイン",
            "日本酒", "焼酎", "酒", "drink", "beer", "外観", "内観", "店内", "店外",
            "内装", "外装", "雰囲気", "interior", "exterior")

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

def sync_music_from_drive(folder_id, local_dir):
    if not folder_id:
        return
    try:
        os.makedirs(local_dir, exist_ok=True)
        for f in list_children(folder_id):
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

import captions

def is_ng_cat(cat):
    c = (cat or "").lower()
    return any(k.lower() in c for k in _NG_KEYS)

cats = {}
for f in list_children(FOOD_FOLDER):
    if f["mimeType"] == "application/vnd.google-apps.folder":
        if is_ng_cat(f["name"]):
            print("[SKIP] 除外カテゴリ:", f["name"])
            continue
        imgs = [g for g in list_children(f["id"])
                if g["mimeType"].startswith("image/") and short_side(g) >= MIN_SIDE]
        if imgs:
            cats[f["name"]] = imgs

if not cats:
    print("NG: 条件を満たす画像が見つかりません。")
    raise SystemExit

import usage
cats = usage.prefer_cats(cats, creds_path) or cats
for k in cats:
    random.shuffle(cats[k])

sushi_names = [k for k in cats if captions.is_sushi_cat(k)]
other_names = [k for k in cats if not captions.is_sushi_cat(k)]
random.shuffle(sushi_names)
random.shuffle(other_names)
print("寿司カテゴリ:", sushi_names, "/ その他料理:", other_names)

def take(names, n, taken_ids):
    out = []
    i = 0
    while len(out) < n and any(cats[k] for k in names):
        k = names[i % len(names)]
        if cats[k]:
            img = cats[k].pop()
            if img["id"] not in taken_ids:
                img["cat"] = k
                out.append(img)
                taken_ids.add(img["id"])
        i += 1
        if i > 1000:
            break
    return out

taken = set()
sushi_pick = take(sushi_names, N_SUSHI, taken)
other_pick = take(other_names, N_OTHER, taken)
# 足りない側は反対側で補って必ず4枚にする
if len(sushi_pick) < N_SUSHI:
    sushi_pick += take(other_names, N_SUSHI - len(sushi_pick), taken)
if len(other_pick) < N_OTHER:
    other_pick += take(sushi_names, N_OTHER - len(other_pick), taken)
picked = sushi_pick + other_pick   # 一〜二品目=寿司 → 三〜四品目=その他料理
print("採用: 寿司%d枚 + その他料理%d枚" % (len(sushi_pick), len(other_pick)))

_fx = [x for x in os.environ.get("FIXED_IDS", "").split(",") if x]
if _fx:
    picked = [drive.files().get(fileId=_i, fields="id,name,mimeType,imageMediaMetadata(width,height),createdTime", supportsAllDrives=True).execute() for _i in _fx]
usage.record(creds_path, picked, "typo")
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
    items.append({"src": "typo/" + local, "caption": caption})
    print("PHOTO %d:" % idx, f["name"], "[%s]" % f.get("cat", "?"), "(短辺", short_side(f), "px)")

headline = captions.pick([f.get("cat", "") for f in picked])
print("HEADLINE:", headline, "| cats:", [f.get("cat", "?") for f in picked])

cands = ["bgm.mp3"]
sync_music_from_drive(os.environ.get("GENRE_MUSIC_NORMAL_ID"), NORMAL_DIR)
if os.path.isdir(NORMAL_DIR):
    cands += ["music/normal/" + t for t in os.listdir(NORMAL_DIR)
              if t.lower().endswith((".mp3", ".m4a", ".wav"))]
music = random.choice(cands)
print("MUSIC:", music)

def esc(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')

import json as _pj, os as _po
_po.makedirs("out", exist_ok=True)
_pj.dump({"ids": [f["id"] for f in picked], "caption": headline, "music": music}, open(_po.path.join("out", "picked.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("PICKED ->", "out/picked.json")
music = os.environ.get("FIXED_MUSIC") or music
lines = ["export const typoPhotos = ["]
for it in items:
    lines.append('  { src: "%s", caption: "%s" },' % (esc(it["src"]), esc(it["caption"])))
lines.append("];")
lines.append('export const typoHeadline = "%s";' % esc(headline))
lines.append('export const typoMusic = "%s";' % esc(music))
_up = music
_updir = os.path.join("public", "music", "uptempo")
sync_music_from_drive(os.environ.get("GENRE_MUSIC_UPTEMPO_ID"), _updir)
if os.path.isdir(_updir):
    _tr = [t for t in os.listdir(_updir) if t.lower().endswith((".mp3", ".m4a", ".wav"))]
    if _tr:
        _up = "music/uptempo/" + random.choice(_tr)
_up = os.environ.get("FIXED_MUSIC") or _up
lines.append('export const typoUptempo = "%s";' % esc(_up))
open(os.path.join("src", "typoData.ts"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("src/typoData.ts 書き出し完了。", len(items), "枚 / music:", music)
