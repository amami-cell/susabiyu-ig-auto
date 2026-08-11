import os, io, glob, json, sys, random

FOOD_FOLDER = os.environ.get("GENRE_FOOD_ID") or "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"
N_PHOTOS = 4
MIN_SIDE = 800
OUT_DIR = os.path.join("public", "typo")
NORMAL_DIR = os.path.join("public", "music", "normal")

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

import io as _io_ms
from googleapiclient.http import MediaIoBaseDownload as _MIBD_ms
def _dl_music(f, local_dir):
    name = f.get("name", "")
    dest = os.path.join(local_dir, name)
    if os.path.exists(dest):
        return
    req = drive.files().get_media(fileId=f["id"])
    buf = _io_ms.FileIO(dest, "wb")
    dl = _MIBD_ms(buf, req)
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.close()
    print("[MUSIC DL]", name)


def sync_music_from_drive(folder_id, local_dir, _depth=0):
    """フォルダ配下のmp3を local_dir へ取得。
    直下にmp3があればそれを使う（＝三条は従来どおり非再帰・挙動不変）。直下に無い時だけ
    サブフォルダを再帰（深さ3）で探す（曲がサブフォルダにある店舗＝ぎふや等を救済）。"""
    if not folder_id:
        return
    try:
        os.makedirs(local_dir, exist_ok=True)
        children = list_children(folder_id)
        audio = [f for f in children if f.get("name", "").lower().endswith((".mp3", ".m4a", ".wav"))]
        if audio:
            for f in audio:
                _dl_music(f, local_dir)          # 直下にある＝それを使う（三条の従来動作）
        elif _depth < 3:
            for f in children:                   # 直下に無い時だけサブフォルダを探索（ぎふや救済）
                if f.get("mimeType", "") == "application/vnd.google-apps.folder":
                    sync_music_from_drive(f["id"], local_dir, _depth + 1)
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

# 店舗別の非料理カテゴリ/ファイル除外（例: ロゴ/外観/内観/ランチ/集合/音楽）。GENRE_EXCLUDE_CATS で部分一致指定。
# 未設定なら無効＝三条は従来どおり。ぎふやは stores.py が設定する。
_EXCL = [s.strip() for s in os.environ.get("GENRE_EXCLUDE_CATS", "").split(",") if s.strip()]
# フラット構造フラグ：写真がフォルダ直下にバラ置き＋一部サブフォルダ、という店舗（ぎふや等）向け。
# 再帰的に画像を集め、除外フォルダ/ファイルを飛ばす（gifuya_photos と同じ考え方）。
_FLAT = os.environ.get("GENRE_FOOD_FLAT") == "1"


def _is_drink_cat(name):
    n = str(name or "").lower()
    for k in ("ドリンク", "飲み物", "飲物", "サワー", "ハイボール", "ビール", "ワイン",
              "日本酒", "焼酎", "カクテル", "梅酒", "ソフトドリンク", "drink", "beer", "sour"):
        if k.lower() in n:
            return True
    return False


def _excluded(name):
    return bool(_EXCL) and any(x in str(name or "") for x in _EXCL)


def _walk_images(fid, folder_name="", depth=0):
    """(画像, 直上フォルダ名) を再帰収集。除外フォルダは辿らない。"""
    out = []
    for f in list_children(fid):
        nm = f.get("name", "")
        if f["mimeType"] == "application/vnd.google-apps.folder":
            if _excluded(nm) or _is_drink_cat(nm):
                continue
            if depth < 3:
                out += _walk_images(f["id"], nm, depth + 1)
        elif f["mimeType"].startswith("image/") and short_side(f) >= MIN_SIDE:
            out.append((f, folder_name))
    return out


cats = {}
if _FLAT:
    # 再帰収集：直下バラ置き＝「料理」、サブフォルダはその名前をカテゴリに。ファイル名の除外語も飛ばす。
    for f, folder in _walk_images(FOOD_FOLDER):
        if _excluded(f.get("name", "")):
            continue
        cat = folder or "料理"
        if _is_drink_cat(cat):
            continue
        cats.setdefault(cat, []).append(f)
    print("[FLAT] 再帰収集 カテゴリ:", {k: len(v) for k, v in cats.items()})
else:
    for f in list_children(FOOD_FOLDER):
        if f["mimeType"] == "application/vnd.google-apps.folder":
            imgs = [g for g in list_children(f["id"])
                    if g["mimeType"].startswith("image/") and short_side(g) >= MIN_SIDE]
            if imgs:
                cats[f["name"]] = imgs
    cats = {k: v for k, v in cats.items() if not _is_drink_cat(k)}
    if _EXCL:
        _before = list(cats.keys())
        cats = {k: v for k, v in cats.items() if not _excluded(k)}
        _removed = [k for k in _before if k not in cats]
        if _removed:
            print("[EXCLUDE] 非料理カテゴリを除外:", _removed)

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
        _img = cats[k].pop()
        _img["cat"] = k
        picked.append(_img)
    i += 1

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
    print("PHOTO %d:" % idx, f["name"], "(短辺", short_side(f), "px)")

import captions
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
