# -*- coding: utf-8 -*-
"""ナガグツ：店の「外観・内観」写真をDriveから取得し、LP背景スライド用に保存する。

  Drive「外観・内観」フォルダ(SCENE_FOLDER) → 大きい順に最大N枚 → 横長に軽くクロップ
  → pwa/nagagutsu/scene_1.jpg .. scene_N.jpg（LPの背景スライドショーが読む）

使い方（CI）:  python nagagutsu_scene.py creds.json
認証は GOOGLE_CREDS_B64 または creds.json（nagagutsu_feed.py と同じ）。
"""
import os, sys, io, base64

from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "pwa", "nagagutsu")
SCENE_FOLDER = "1O8rHidKZf5PkWE3D52Rhs6d-hWDh4NiL"   # ナガグツ「外観・内観」フォルダ
MAX_N = 3                 # 背景に混ぜる枚数
MIN_SIDE = 700            # これ未満は使わない
TARGET_W, TARGET_H = 1440, 1800   # 4:5（LP背景はcoverなので縦横比は目安）


def _creds_path():
    args = [a for a in sys.argv[1:] if a.strip() and a.lower().endswith(".json")]
    if args and os.path.exists(args[0]):
        return args[0]
    if os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
        return "creds.json"
    raise SystemExit("認証JSONが見つかりません。")


def _drive(creds):
    from googleapiclient.discovery import build
    from google.oauth2.service_account import Credentials
    c = Credentials.from_service_account_file(
        creds, scopes=["https://www.googleapis.com/auth/drive.readonly"])
    return build("drive", "v3", credentials=c)


def _children(drive, fid):
    out, tok = [], None
    while True:
        r = drive.files().list(
            q="'%s' in parents and trashed=false" % fid,
            fields="nextPageToken,files(id,name,mimeType,imageMediaMetadata(width,height))",
            pageSize=1000, pageToken=tok,
            includeItemsFromAllDrives=True, supportsAllDrives=True).execute()
        out += r.get("files", [])
        tok = r.get("nextPageToken")
        if not tok:
            break
    return out


def _walk(drive, fid, depth=0):
    imgs = []
    for f in _children(drive, fid):
        if f["mimeType"] == "application/vnd.google-apps.folder":
            if depth < 2:
                imgs += _walk(drive, f["id"], depth + 1)
        elif f["mimeType"].startswith("image/"):
            m = f.get("imageMediaMetadata") or {}
            w, h = m.get("width") or 0, m.get("height") or 0
            if not (w and h) or min(w, h) >= MIN_SIDE:
                imgs.append((f, w, h))
    return imgs


def _download(drive, fid):
    from googleapiclient.http import MediaIoBaseDownload
    buf = io.BytesIO()
    dl = MediaIoBaseDownload(buf, drive.files().get_media(fileId=fid, supportsAllDrives=True))
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.seek(0)
    return buf


def main():
    creds = _creds_path()
    drive = _drive(creds)
    imgs = _walk(drive, SCENE_FOLDER)
    print("[SCENE] 外観・内観フォルダの画像: %d枚" % len(imgs))
    if not imgs:
        print("[SCENE] 画像が無いので終了（背景は料理写真のみ）。")
        return
    # 大きい画像優先（面積の大きい順）。メタ無しは後ろへ。
    imgs.sort(key=lambda t: (t[1] * t[2]), reverse=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    # 既存 scene_*.jpg を掃除（枚数が減った時に古いのを残さない）
    for old in os.listdir(OUT_DIR):
        if old.startswith("scene_") and old.endswith(".jpg"):
            os.remove(os.path.join(OUT_DIR, old))
    n = 0
    for f, w, h in imgs[:MAX_N]:
        try:
            im = ImageOps.exif_transpose(Image.open(_download(drive, f["id"])))
            if im.mode != "RGB":
                im = im.convert("RGB")
            im = ImageOps.fit(im, (TARGET_W, TARGET_H), method=Image.LANCZOS, centering=(0.5, 0.5))
            n += 1
            out = os.path.join(OUT_DIR, "scene_%d.jpg" % n)
            im.save(out, "JPEG", quality=85, optimize=True, progressive=True)
            print("  保存 scene_%d.jpg <- %s (%sx%s)" % (n, f.get("name", ""), w, h))
        except Exception as e:
            print("  WARN 取得失敗 %s: %s" % (f.get("name", ""), e))
    print("[SCENE] %d枚を pwa/nagagutsu/scene_*.jpg に保存" % n)


if __name__ == "__main__":
    main()
