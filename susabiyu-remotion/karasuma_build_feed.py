# -*- coding: utf-8 -*-
"""鮨処すさび湯（karasuma）：Driveの料理写真(フード)から“加工済みフィード投稿画像”を
全品ぶん一括生成し、pwa/karasuma/ に出力する（feed_NN_j/k.jpg + webp + feed.json）。

  python karasuma_build_feed.py creds.json

意匠は確定版の2案を各料理で焼く:
  ・09 = render_tate_j（縦ロゴ＋地名、地名書体=yujiboku 筆）  -> feed_NN_j.jpg
  ・10 = render_tate_k（地名特大・縦書き、地名書体=kaisei 明朝）-> feed_NN_k.jpg

確認アプリ karasuma_reels.html が ./karasuma/feed.json を読む（item.design=画像ファイル名）。
写真はDriveのフード(GENRE_FOOD_ID)配下を再帰で集め、短辺の大きい順に全採用。
投稿はしない（画像生成＋json出力のみ）。コミット/デプロイはワークフロー側で行う。
"""
import os
import io
import sys
import json
import glob
import re

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from PIL import Image

import karasuma_captions as kc
import karasuma_feed_design as fd

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.abspath(os.path.join(HERE, "..", "pwa", "karasuma"))
FOOD = os.environ.get("GENRE_FOOD_ID") or "1viSmFmc2W9fDrfUENffYwTDTf124ekW0"
LOGO_PARENT = os.environ.get("LOGO_PARENT") or "1EuoC6HqqJS12cKXOsS-W8K5mzcU4lLR6"
MIN_SIDE = int(os.environ.get("MIN_SIDE") or "1000")
LIMIT = int(os.environ.get("N_DISHES") or "0")            # 0=全品
QUALITY = int(os.environ.get("FEED_JPG_QUALITY") or "86")  # 容量節約（全品×2案ぶん）
WEBP = [("thumb.webp", 360, 72), ("card.webp", 960, 85)]


def _creds_path():
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        return sys.argv[1]
    for b in [".", "..", "../.."]:
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


def _clean(nm):
    base = re.sub(r"\.(jpe?g|png|webp|heic)$", "", str(nm or ""), flags=re.I)
    return re.sub(r"\s+", " ", re.sub(r"[_＿]", " ", base)).strip()


def _webp(src_jpg):
    base = os.path.splitext(src_jpg)[0]
    im = Image.open(src_jpg).convert("RGB")
    for suffix, w, q in WEBP:
        out = base + "." + suffix
        im2 = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im2.save(out, "WEBP", quality=q, method=6)


def main():
    cp = _creds_path()
    if not cp:
        print("NG: service_account の creds.json が見つかりません"); sys.exit(1)
    cr = service_account.Credentials.from_service_account_file(
        cp, scopes=["https://www.googleapis.com/auth/drive.readonly"])
    drive = build("drive", "v3", credentials=cr)

    def children(fid):
        out, page = [], None
        while True:
            r = drive.files().list(q="'%s' in parents and trashed=false" % fid,
                fields="nextPageToken, files(id,name,mimeType,imageMediaMetadata(width,height))",
                pageSize=100, pageToken=page, supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
            out += r.get("files", []); page = r.get("nextPageToken")
            if not page:
                break
        return out

    def short(f):
        m = f.get("imageMediaMetadata") or {}
        return min(m.get("width", 0) or 0, m.get("height", 0) or 0)

    imgs = []
    def walk(fid, depth=0):
        for f in children(fid):
            if f["mimeType"] == "application/vnd.google-apps.folder":
                if depth < 3:
                    walk(f["id"], depth + 1)
            elif f["mimeType"].startswith("image/") and short(f) >= MIN_SIDE:
                imgs.append(f)
    walk(FOOD)
    imgs.sort(key=short, reverse=True)
    if LIMIT > 0:
        imgs = imgs[:LIMIT]
    print("[KARASUMA][BUILD] 対象料理写真 %d 枚" % len(imgs))
    if not imgs:
        print("NG: 料理写真が見つかりません"); sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)

    # ロゴ取得（縦ロゴ=KARASUMA_FEED_LOGO / 横ロゴ=KARASUMA_FEED_LOGO_H を生成り透過PNGで用意）
    try:
        def find_logo(fid, depth=0):
            for f in children(fid):
                if f["mimeType"] == "application/vnd.google-apps.folder":
                    nm = f.get("name", "")
                    if ("ロゴ" in nm) or ("logo" in nm.lower()):
                        return f["id"]
                    if depth < 3:
                        sub = find_logo(f["id"], depth + 1)
                        if sub:
                            return sub
            return None

        def process_logo(fid, outp):
            raw = os.path.join(OUT_DIR, "_logo_raw")
            req = drive.files().get_media(fileId=fid)
            b = io.FileIO(raw, "wb"); dl = MediaIoBaseDownload(b, req); done = False
            while not done:
                _, done = dl.next_chunk()
            b.close()
            im = Image.open(raw).convert("RGBA"); px = im.load(); w, h = im.size
            HI, LO = 244, 210; ls = 0; lc = 0
            for y in range(h):
                for x in range(w):
                    r, g, bl, a = px[x, y]
                    if a == 0:
                        continue
                    mn = min(r, g, bl)
                    if mn >= HI:
                        px[x, y] = (r, g, bl, 0)
                    else:
                        na = int(255 * (HI - mn) / (HI - LO)) if mn > LO else 255
                        na = min(na, a); px[x, y] = (r, g, bl, na)
                        if na > 60:
                            ls += (r * 299 + g * 587 + bl * 114) // 1000; lc += 1
            avg = (ls / lc) if lc else 255
            bbox = im.getbbox(); im = im.crop(bbox) if bbox else im
            if avg < 150:
                pk = im.load()
                for y in range(im.size[1]):
                    for x in range(im.size[0]):
                        r, g, bl, a = pk[x, y]
                        if a > 0:
                            pk[x, y] = (0xF3, 0xEA, 0xD8, a)
            im.save(outp)
            try:
                os.remove(raw)
            except Exception:
                pass
            return im.size

        lf = find_logo(LOGO_PARENT)
        imgs_l = [x for x in (children(lf) if lf else []) if x["mimeType"].startswith("image/")]
        for i2, lg in enumerate(imgs_l):
            outp = os.path.join(OUT_DIR, "_logo_%d.png" % i2)
            w, h = process_logo(lg["id"], outp)
            ratio = w / h if h else 1.0
            kind = "横" if ratio >= 1.25 else "縦"
            if ratio >= 1.25 and not os.environ.get("KARASUMA_FEED_LOGO_H"):
                os.environ["KARASUMA_FEED_LOGO_H"] = outp
            if ratio < 1.25 and not os.environ.get("KARASUMA_FEED_LOGO"):
                os.environ["KARASUMA_FEED_LOGO"] = outp
            print("[KARASUMA][BUILD][LOGO] %s(%s) %dx%d ratio=%.2f" % (lg.get("name"), kind, w, h, ratio))
        if not os.environ.get("KARASUMA_FEED_LOGO") and os.environ.get("KARASUMA_FEED_LOGO_H"):
            os.environ["KARASUMA_FEED_LOGO"] = os.environ["KARASUMA_FEED_LOGO_H"]
        if not os.environ.get("KARASUMA_FEED_LOGO_H") and os.environ.get("KARASUMA_FEED_LOGO"):
            os.environ["KARASUMA_FEED_LOGO_H"] = os.environ["KARASUMA_FEED_LOGO"]
        if not imgs_l:
            print("[KARASUMA][BUILD][LOGO] ロゴ未検出＝明朝の屋号にフォールバック")
    except Exception as e:
        print("[KARASUMA][BUILD][LOGO] スキップ:", repr(e))

    # 既存の feed 画像/webp は作り直すので一旦掃除（_logo_*.png は残す）
    for p in glob.glob(os.path.join(OUT_DIR, "feed_*")):
        try:
            os.remove(p)
        except Exception:
            pass

    items = []
    seen = set()
    n = 0
    for f in imgs:
        name = _clean(f["name"])
        if not name or name in seen:
            continue
        seen.add(name)
        n += 1
        desc = kc.desc_for(name)
        local = os.path.join(OUT_DIR, "_src_%03d.jpg" % n)
        req = drive.files().get_media(fileId=f["id"])
        buf = io.FileIO(local, "wb"); dl = MediaIoBaseDownload(buf, req); done = False
        while not done:
            _, done = dl.next_chunk()
        buf.close()
        for suffix, design_default in (("j", fd.FONT_TATE_J), ("k", fd.FONT_TATE_K)):
            key = "feed_%03d_%s" % (n, suffix)
            jpg = os.path.join(OUT_DIR, key + ".jpg")
            try:
                if suffix == "j":
                    fd.render_tate_j(local, jpg, name, desc, quality=QUALITY)
                else:
                    fd.render_tate_k(local, jpg, name, desc, quality=QUALITY)
                _webp(jpg)
                items.append({
                    "design": key + ".jpg",
                    "name": name,
                    "title": name,
                    "cap": desc,
                    "tags": "",
                    "reco": False,
                    "variant": "09" if suffix == "j" else "10",
                })
                print("[KARASUMA][BUILD] %s (%s / %s)" % (key, name, design_default))
            except Exception as e:
                print("[KARASUMA][BUILD][ERR] %s %s: %r" % (key, name, e))
        try:
            os.remove(local)
        except Exception:
            pass

    feed = {"items": items, "count": len(items)}
    with open(os.path.join(OUT_DIR, "feed.json"), "w", encoding="utf-8") as fh:
        json.dump(feed, fh, ensure_ascii=False, indent=1)
    print("[KARASUMA][BUILD] %d料理 -> %d画像 / %s" % (n, len(items), OUT_DIR))


if __name__ == "__main__":
    main()
