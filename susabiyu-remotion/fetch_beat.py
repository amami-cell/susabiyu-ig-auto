# 音ハメ動画用: 写真8枚とアップテンポ曲を取得し、曲のビート位置を解析して
# src/beatData.ts に書き出す。カット割りはRemotion側でビートに正確に合わせる。
import os, io, glob, json, sys, random, subprocess

FOOD_FOLDER = os.environ.get("GENRE_FOOD_ID") or "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"
SAKE_FOLDER = os.environ.get("GENRE_SAKE_ID") or "1vIAC9frejCyGhQAizT1Wsgmlaj8ULhTb"
N_PHOTOS = 8
MIN_SIDE = 800
OUT_DIR = os.path.join("public", "beat")
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

def _gather_drinks(root):
    out = []
    for f in list_children(root):
        if f["mimeType"] == "application/vnd.google-apps.folder":
            out += [g for g in list_children(f["id"])
                    if g["mimeType"].startswith("image/") and short_side(g) >= MIN_SIDE]
        elif f["mimeType"].startswith("image/") and short_side(f) >= MIN_SIDE:
            out.append(f)
    return out

drinks = _gather_drinks(SAKE_FOLDER)
random.shuffle(drinks)
drink_cap = 1  # ドリンクは1枚まで
n_drink = min(drink_cap, len(drinks))

import usage
cats = usage.prefer_cats(cats, creds_path) or cats
names = list(cats.keys())
random.shuffle(names)
for k in cats:
    random.shuffle(cats[k])
picked = []
i = 0
food_target = max(1, N_PHOTOS - n_drink)
while len(picked) < food_target and any(cats[k] for k in names):
    k = names[i % len(names)]
    if cats[k]:
        picked.append(cats[k].pop())
    i += 1
picked += drinks[:n_drink]
print("採用: 料理%d枚 + ドリンク%d枚" % (len(picked) - min(n_drink, len(drinks)), min(n_drink, len(drinks))))

_fx = [x for x in os.environ.get("FIXED_IDS", "").split(",") if x]
if _fx:
    picked = [drive.files().get(fileId=_i, fields="id,name,mimeType,imageMediaMetadata(width,height),createdTime", supportsAllDrives=True).execute() for _i in _fx]
usage.record(creds_path, picked, "beat")
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
    items.append({"src": "beat/" + local, "caption": caption})
    print("PHOTO %d:" % idx, f["name"], "(短辺", short_side(f), "px)")

# 音ハメはアップテンポ曲から
music = "bgm.mp3"
sync_music_from_drive(os.environ.get("GENRE_MUSIC_UPTEMPO_ID"), UPTEMPO_DIR)
if os.path.isdir(UPTEMPO_DIR):
    tracks = [p for p in os.listdir(UPTEMPO_DIR)
              if p.lower().endswith((".mp3", ".m4a", ".wav"))]
    if tracks:
        music = "music/uptempo/" + random.choice(tracks)
music = os.environ.get("FIXED_MUSIC") or music
print("MUSIC:", music)

# ---- ビート解析（ffmpeg + numpy。失敗したら120BPMの等間隔にフォールバック） ----
def detect_beats(path, max_sec=60.0):
    import numpy as np
    sr = 22050
    raw = subprocess.run(
        ["ffmpeg", "-v", "quiet", "-t", str(max_sec), "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
        capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    if len(x) < sr * 8:
        return None
    hop, win = 512, 1024
    n = (len(x) - win) // hop
    fenv = sr / float(hop)          # 包絡線のフレームレート（約43/秒）
    hann = np.hanning(win)
    prev = None
    env = np.zeros(n)
    for i in range(n):
        mag = np.abs(np.fft.rfft(x[i * hop:i * hop + win] * hann))
        if prev is not None:
            env[i] = np.maximum(mag - prev, 0).sum()   # スペクトラルフラックス＝アタックの強さ
        prev = mag
    env = env - env.mean()
    env[env < 0] = 0
    if env.max() <= 0:
        return None
    env = env / env.max()
    # テンポ推定：自己相関（84〜190BPM）
    ac = np.correlate(env, env, "full")[len(env) - 1:]
    lo = max(2, int(round(60.0 / 190 * fenv)))
    hi = int(round(60.0 / 84 * fenv))
    lags = np.arange(lo, hi + 1)
    score = ac[lags] + 0.5 * ac[np.minimum(lags * 2, len(ac) - 1)]
    L = int(lags[int(np.argmax(score))])
    # 周期を細かく詰めて位相（1拍目の位置）を合わせる
    best = (-1.0, float(L), 0.0)
    t_idx = np.arange(len(env))
    for P in np.arange(L - 1.0, L + 1.0, 0.02):
        if P < 2:
            continue
        for off in np.arange(0.0, P, P / 24.0):
            grid = np.arange(off, len(env) - 1, P)
            s = float(np.interp(grid, t_idx, env).sum()) / max(len(grid), 1)
            if s > best[0]:
                best = (s, float(P), float(off))
    _, P, off = best
    bpm = 60.0 * fenv / P
    beats = []
    t = off
    while t < n and len(beats) < 64:
        # 解析窓の半分ぶん早く検出される癖を補正（検証で平均約23ms）
        beats.append(round(t / fenv + win / (2.0 * sr), 4))
        t += P
    return bpm, beats

bpm, beats = 120.0, None
try:
    r = detect_beats(os.path.join("public", music))
    if r:
        bpm, beats = r
        print("BEAT: bpm=%.1f 拍数=%d 先頭=%.2fs" % (bpm, len(beats), beats[0]))
except Exception as e:
    print("[BEAT] 解析失敗:", e)
if not beats:
    beats = [round(0.4 + i * 0.5, 4) for i in range(48)]
    print("[BEAT] フォールバック: 120BPM等間隔")

import json as _pj
os.makedirs("out", exist_ok=True)
_pj.dump({"ids": [f["id"] for f in picked], "caption": "", "music": music},
         open(os.path.join("out", "picked.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("PICKED ->", "out/picked.json")

def esc(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')

lines = ["export const beatPhotos = ["]
for it in items:
    lines.append('  { src: "%s", caption: "%s" },' % (esc(it["src"]), esc(it["caption"])))
lines.append("];")
lines.append('export const beatMusic = "%s";' % esc(music))
lines.append("export const beatBpm = %.2f;" % bpm)
lines.append("export const beatTimes: number[] = [%s];" % ", ".join(str(b) for b in beats))
open(os.path.join("src", "beatData.ts"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("src/beatData.ts 書き出し完了。", len(items), "枚 / music:", music, "/ bpm %.1f" % bpm)
