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
import hashlib

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from PIL import Image, ImageOps

SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets.readonly"]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "pwa", "gifuya")
TARGET_W, TARGET_H = 1080, 1350   # Instagram フィード 4:5

# ぎふや福岡天神「画像」フォルダ（この配下の料理写真をフィード候補に全同期）。
IMG_ROOT_DEFAULT = "1HUtrzFFJiCuazZOhHBW88RVVdrvyh1Ox"
# ぎふや福岡天神「音楽」フォルダ（管理シート 入力用 R29C10）。ストーリー動画のBGM素材。
MUSIC_FOLDER_DEFAULT = "1pk6Lq_TKK4MRWLYRowOjjRRFUfBbyYh_"
# 料理以外のサブフォルダは同期対象から除外（名前に含めば除外）。
FOLDER_EXCLUDE = ["ロゴ", "外観", "内観", "ドリンク", "飲み", "音楽", "集合", "ランチ"]
# 料理写真ではないファイル（寄せ集め/ロゴ等）を除外。
FILE_EXCLUDE = ["料理集合", "集合写真", "GFY", "logo", "ロゴ"]
# 「おすすめ」の目印（専用フォルダ名 or ファイル名の接頭辞）。
RECO_HINT = ["おすすめ", "オススメ", "お勧め", "★"]


def _creds():
    path = "creds.json"
    if not os.path.exists(path) and os.environ.get("GOOGLE_CREDS_B64"):
        open(path, "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
    return Credentials.from_service_account_file(path, scopes=SCOPES)


def _drive():
    return build("drive", "v3", credentials=_creds())


def _sheets():
    return build("sheets", "v4", credentials=_creds()).spreadsheets()


def readsheet(sid):
    """管理スプレッドシートの全タブ・全セルを出力（DriveフォルダID/音楽の在り処を特定するため）。"""
    sh = _sheets()
    try:
        meta = sh.get(spreadsheetId=sid).execute()
    except Exception as e:
        print("NG: スプレッドシートを開けません（サービスアカウントに共有されていない可能性）:", str(e)[:200])
        raise SystemExit(1)
    print("[SHEET] %s / タブ: %s" % (meta.get("properties", {}).get("title", ""),
                                    ", ".join(s["properties"]["title"] for s in meta.get("sheets", []))))
    import re as _re
    for s in meta.get("sheets", []):
        title = s["properties"]["title"]
        try:
            vals = sh.values().get(spreadsheetId=sid, range=title).execute().get("values", [])
        except Exception as e:
            print("  (読取失敗 %s: %s)" % (title, str(e)[:80])); continue
        print("=== TAB: %s (%d行) ===" % (title, len(vals)))
        for ri, row in enumerate(vals):
            for ci, cell in enumerate(row):
                v = str(cell).strip()
                if not v:
                    continue
                mark = ""
                if _re.search(r"[A-Za-z0-9_-]{25,}", v):
                    mark = "  <<ID/URLらしき値"
                if any(h in v for h in MUSIC_HINT):
                    mark += "  <<音楽"
                print("  [%s R%dC%d] %s%s" % (title, ri + 1, ci + 1, v[:150], mark))


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


def _walk_ctx(drive, fid, folder_name="", depth=0):
    """(画像ファイル, 直上フォルダ名) を返す。料理以外のサブフォルダは辿らない。"""
    out = []
    for f in _children(drive, fid):
        nm = f.get("name", "")
        if f["mimeType"] == "application/vnd.google-apps.folder":
            if any(x in nm for x in FOLDER_EXCLUDE):
                continue
            if depth < 3:
                out += _walk_ctx(drive, f["id"], nm, depth + 1)
        elif f["mimeType"].startswith("image/"):
            out.append((f, folder_name))
    return out


def _dish_name(fname):
    n = os.path.splitext(fname)[0]
    for h in RECO_HINT:
        n = n.replace(h, "")
    return n.strip(" _-★[]（）()　")


def _is_reco(fname, folder_name):
    return any(h in folder_name for h in RECO_HINT) or any(h in fname for h in RECO_HINT)


def _slug(name):
    return "f_" + hashlib.md5(name.encode("utf-8")).hexdigest()[:10] + ".jpg"


def _select(drive, root):
    """画像フォルダ配下から料理写真を選定。おすすめ優先・同名は新しい方。"""
    items = _walk_ctx(drive, root or IMG_ROOT_DEFAULT)
    seen = {}
    for f, folder in items:
        fn = f.get("name", "")
        if any(x in fn for x in FILE_EXCLUDE):
            continue
        name = _dish_name(fn)
        if not name:
            continue
        reco = _is_reco(fn, folder)
        mt = f.get("modifiedTime", "")
        prev = seen.get(name)
        if prev is None or (reco and not prev["reco"]) or (mt > prev["mt"]):
            seen[name] = {"name": name, "reco": reco, "id": f["id"], "src": fn, "folder": folder, "mt": mt}
    return sorted(seen.values(), key=lambda d: (not d["reco"], d["name"]))


MUSIC_HINT = ["音楽", "BGM", "bgm", "music", "ミュージック", "サウンド"]


def _is_audio(f):
    nm = f.get("name", "")
    return f.get("mimeType", "").startswith("audio/") or nm.lower().endswith((".mp3", ".m4a", ".wav", ".aac"))


def _folder_has_audio(drive, fid):
    return any(_is_audio(f) for f in _children(drive, fid))


def _parent_of(drive, fid):
    try:
        ps = drive.files().get(fileId=fid, fields="parents", supportsAllDrives=True).execute().get("parents", [])
        return ps[0] if ps else None
    except Exception:
        return None


def _search_music(drive, fid, depth=0):
    """名前が音楽っぽい or mp3を含むフォルダを探す（深さ3まで）。"""
    subs = [f for f in _children(drive, fid) if f["mimeType"] == "application/vnd.google-apps.folder"]
    for f in subs:                                   # 名前一致を最優先
        if any(h in f["name"] for h in MUSIC_HINT):
            return f["id"]
    for f in subs:                                   # 直下にmp3を持つフォルダ
        if _folder_has_audio(drive, f["id"]):
            return f["id"]
    if depth < 3:
        for f in subs:
            r = _search_music(drive, f["id"], depth + 1)
            if r:
                return r
    return None


def _find_music_folder(drive, root):
    """GIFUYA_MUSIC_FOLDER_ID > root自身がmp3を持つ > ぎふやルート（画像の親）から広く探索。"""
    env = os.environ.get("GIFUYA_MUSIC_FOLDER_ID", "").strip() or MUSIC_FOLDER_DEFAULT
    if env:
        return env
    if _folder_has_audio(drive, root):
        return root
    start = _parent_of(drive, root) or root          # 画像の親＝ぎふや直下から探す（音楽フォルダは画像の外にある想定）
    return _search_music(drive, start)


def music(root=None):
    """Driveの音楽フォルダのmp3を susabiyu-remotion/public/music/uptempo/ へ取得（三条と同じくランダム選曲の素材）。"""
    drive = _drive()
    fid = _find_music_folder(drive, root or IMG_ROOT_DEFAULT)
    out_dir = os.path.join(HERE, "public", "music", "uptempo")
    os.makedirs(out_dir, exist_ok=True)
    if not fid:
        print("[MUSIC] 音楽フォルダが見つかりません（bgm.mp3 の1曲で続行）。")
        return
    n = 0
    for f in _children(drive, fid):
        nm = f.get("name", "")
        if f["mimeType"].startswith("audio/") or nm.lower().endswith((".mp3", ".m4a", ".wav")):
            base = os.path.splitext(nm)[0]
            safe = "".join(c for c in base if c.isalnum() or c in "-_") or ("bgm%d" % n)
            with open(os.path.join(out_dir, safe + ".mp3"), "wb") as fp:
                fp.write(_download(drive, f["id"]).read())
            n += 1
            print("MUSIC|%s" % nm)
    print("[MUSIC] %d曲を取得しました。" % n)


def plan(root=None):
    """同期対象を一覧表示（DLもコミットもしない・確認用）。"""
    ordered = _select(_drive(), root)
    print("[PLAN] %d品（おすすめ %d）" % (len(ordered), sum(1 for d in ordered if d["reco"])))
    for d in ordered:
        print("ITEM|%s|reco=%d|folder=%s|%s" % (d["name"], 1 if d["reco"] else 0, d["folder"] or "(直下)", d["src"]))
    print("[PLAN] 完了")
    return ordered


def sync(root=None):
    """料理写真を全同期：4:5トリミングして pwa/gifuya/f_*.jpg を更新し feed.json を書き出す。"""
    drive = _drive()
    ordered = _select(drive, root)
    if not ordered:
        print("NG: 同期対象の料理写真が見つかりません。")
        raise SystemExit(1)
    manifest = []
    for d in ordered:
        img = _slug(d["name"])
        _save_45(_download(drive, d["id"]), os.path.join(OUT_DIR, img))
        manifest.append({"img": img, "name": d["name"], "reco": bool(d["reco"])})
    feed = {"store": "gifuyatenjin", "count": len(manifest), "items": manifest}
    with open(os.path.join(OUT_DIR, "feed.json"), "w", encoding="utf-8") as fp:
        json.dump(feed, fp, ensure_ascii=False, indent=1)
    print("[SYNC] %d品を同期し feed.json を書き出しました（おすすめ %d）"
          % (len(manifest), sum(1 for m in manifest if m["reco"])))
    for m in manifest:
        print("SYNCED|%s|reco=%d|%s" % (m["name"], 1 if m["reco"] else 0, m["img"]))


if __name__ == "__main__":
    mode = (sys.argv[1] if len(sys.argv) > 1 else "discover").strip().lower()
    if mode == "discover":
        discover(sys.argv[2] if len(sys.argv) > 2 else None)
    elif mode == "listfolder":
        listfolder(sys.argv[2])
    elif mode == "fetch":
        fetch(sys.argv[2], sys.argv[3])
    elif mode == "plan":
        plan(sys.argv[2] if len(sys.argv) > 2 else None)
    elif mode == "sync":
        sync(sys.argv[2] if len(sys.argv) > 2 else None)
    elif mode == "music":
        music(sys.argv[2] if len(sys.argv) > 2 else None)
    elif mode == "readsheet":
        readsheet(sys.argv[2])
    else:
        print("unknown mode:", mode)
        raise SystemExit(2)
