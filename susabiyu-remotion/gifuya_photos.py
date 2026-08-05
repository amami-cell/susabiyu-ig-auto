# -*- coding: utf-8 -*-
"""ぎふや福岡天神の料理写真をGoogleドライブから拾い直す（自動）。

使い方（GitHub Actions / ローカル）:
  python gifuya_photos.py discover [キーワード]      # ぎふや/天神のフォルダとファイル名を一覧（folderID把握用・読取専用）
  python gifuya_photos.py listfolder <FOLDER_ID>     # 指定フォルダ配下の画像を一覧（サブフォルダ含む）
  python gifuya_photos.py fetch <FOLDER_ID> <MAP_JSON>
        # MAP_JSON 例: {"feed_05":["刺身","盛り"],"feed_03":["どて焼き","どて"]}
        # 料理名にマッチする最新写真をDL→4:5にトリミング→ ../pwa/gifuya/feed_XX.jpg を更新

認証は creds.json（無ければ環境変数 GOOGLE_CREDS_B64 を復号）。読み書きは Drive のみ。
"""
import os
import io
import sys
import json
import base64

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from PIL import Image, ImageOps

SCOPES = ["https://www.googleapis.com/auth/drive"]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "pwa", "gifuya")
TARGET_W, TARGET_H = 1080, 1350   # Instagram フィード 4:5


def _drive():
    path = "creds.json"
    if not os.path.exists(path) and os.environ.get("GOOGLE_CREDS_B64"):
        open(path, "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
    cr = Credentials.from_service_account_file(path, scopes=SCOPES)
    return build("drive", "v3", credentials=cr)


def _children(drive, fid):
    out, page = [], None
    while True:
        r = drive.files().list(
            q="'%s' in parents and trashed=false" % fid,
            fields="nextPageToken,files(id,name,mimeType,modifiedTime,imageMediaMetadata(width,height))",
            pageSize=300, pageToken=page, supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
        out += r.get("files", [])
        page = r.get("nextPageToken")
        if not page:
            break
    return out


def _walk_images(drive, fid, depth=0):
    """サブフォルダ(深さ2まで)も含めて画像だけ集める。"""
    imgs = []
    for f in _children(drive, fid):
        if f["mimeType"] == "application/vnd.google-apps.folder":
            if depth < 2:
                imgs += _walk_images(drive, f["id"], depth + 1)
        elif f["mimeType"].startswith("image/"):
            imgs.append(f)
    return imgs


def discover(keyword=None):
    kw = (keyword or "ぎふや").strip().replace("'", "")
    drive = _drive()
    q = ("name contains '%s' and mimeType='application/vnd.google-apps.folder' "
         "and trashed=false" % kw)
    fol, page = [], None
    while True:
        r = drive.files().list(q=q, fields="nextPageToken,files(id,name,parents)", pageSize=100,
                               pageToken=page, supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
        fol += r.get("files", [])
        page = r.get("nextPageToken")
        if not page:
            break
    print("[DISCOVER] 「%s」で %d フォルダ" % (kw, len(fol)))
    for f in fol:
        print("DIR|%s|id=%s" % (f.get("name"), f.get("id")))
        for c in _children(drive, f["id"]):
            tag = "SUB" if c["mimeType"] == "application/vnd.google-apps.folder" else (
                "IMG" if c["mimeType"].startswith("image/") else "OTH")
            print("   %s|%s|id=%s" % (tag, c.get("name"), c.get("id")))
    print("[DISCOVER] 完了")


def listfolder(folder_id):
    drive = _drive()
    imgs = _walk_images(drive, folder_id)
    imgs.sort(key=lambda f: f.get("modifiedTime", ""), reverse=True)
    print("[LIST] %s 配下 画像 %d枚（新しい順）" % (folder_id, len(imgs)))
    for f in imgs:
        m = f.get("imageMediaMetadata") or {}
        print("IMG|%s|%sx%s|%s|id=%s" % (f.get("name"), m.get("width", "?"), m.get("height", "?"),
                                         f.get("modifiedTime", "")[:10], f.get("id")))
    print("[LIST] 完了")


def _download(drive, file_id):
    buf = io.BytesIO()
    dl = MediaIoBaseDownload(buf, drive.files().get_media(fileId=file_id, supportsAllDrives=True))
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.seek(0)
    return buf


def _save_45(buf, out_path):
    im = Image.open(buf)
    im = ImageOps.exif_transpose(im)
    if im.mode not in ("RGB",):
        im = im.convert("RGB")
    im = ImageOps.fit(im, (TARGET_W, TARGET_H), method=Image.LANCZOS, centering=(0.5, 0.5))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    im.save(out_path, "JPEG", quality=88, optimize=True, progressive=True)


def _norm(s):
    return "".join((s or "").split()).lower()


def fetch(folder_id, map_json):
    mapping = json.loads(map_json)
    drive = _drive()
    imgs = _walk_images(drive, folder_id)
    imgs.sort(key=lambda f: f.get("modifiedTime", ""), reverse=True)  # 最新を優先
    if not imgs:
        print("NG: フォルダに画像がありません:", folder_id)
        raise SystemExit(1)
    changed = []
    for target, patterns in mapping.items():
        pats = [_norm(p) for p in (patterns if isinstance(patterns, list) else [patterns])]
        hit = None
        for f in imgs:  # 新しい順に走査＝最初に当たったものが最新
            nm = _norm(f.get("name"))
            if any(p in nm for p in pats):
                hit = f
                break
        if not hit:
            print("WARN: マッチ無し target=%s patterns=%s（スキップ）" % (target, patterns))
            continue
        out_path = os.path.join(OUT_DIR, target + ".jpg")
        print("FETCH %s <- %s (%s)" % (target + ".jpg", hit.get("name"), hit.get("modifiedTime", "")[:10]))
        _save_45(_download(drive, hit["id"]), out_path)
        changed.append((target, hit.get("name")))
    print("[FETCH] 更新 %d件" % len(changed))
    for t, n in changed:
        print("UPDATED|%s|%s" % (t, n))
    if not changed:
        raise SystemExit("更新対象が見つかりませんでした（パターン要調整）")


if __name__ == "__main__":
    mode = (sys.argv[1] if len(sys.argv) > 1 else "discover").strip().lower()
    if mode == "discover":
        discover(sys.argv[2] if len(sys.argv) > 2 else None)
    elif mode == "listfolder":
        listfolder(sys.argv[2])
    elif mode == "fetch":
        fetch(sys.argv[2], sys.argv[3])
    else:
        print("unknown mode:", mode)
        raise SystemExit(2)
