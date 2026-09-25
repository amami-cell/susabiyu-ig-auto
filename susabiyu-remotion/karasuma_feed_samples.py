# -*- coding: utf-8 -*-
"""烏丸すさび湯フィード投稿画像の“3案サンプル”を実データで焼いて永続CDNへ上げる（読み取り中心）。
Driveの料理写真を数枚取得 → karasuma_feed_design の3案（縦書き/生成り帯/円窓）で焼く →
poster.up(cdn=True) で jsDelivr に上げ、ログにURLを出す（確認用）。投稿はしない。
"""
import os, io, sys, json, glob, re

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

import karasuma_captions as kc
import karasuma_feed_design as fd
import poster

FOOD = os.environ.get("GENRE_FOOD_ID") or "1viSmFmc2W9fDrfUENffYwTDTf124ekW0"  # フード（料理写真）
LOGO_PARENT = os.environ.get("LOGO_PARENT") or "1EuoC6HqqJS12cKXOsS-W8K5mzcU4lLR6"  # 画像フォルダ（配下にロゴ）
N_DISHES = int(os.environ.get("N_DISHES") or "2")
MIN_SIDE = 1000


def _creds():
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


def clean(nm):
    base = re.sub(r"\.(jpe?g|png|webp|heic)$", "", str(nm or ""), flags=re.I)
    return re.sub(r"\s+", " ", re.sub(r"[_＿]", " ", base)).strip()


def main():
    cp = sys.argv[1] if len(sys.argv) > 1 and os.path.exists(sys.argv[1]) else _creds()
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

    # フード配下を再帰で集めて、短辺の大きい順に採用
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
    print("[FEEDSAMPLE] 候補画像 %d 枚" % len(imgs))
    if not imgs:
        print("NG: 料理写真が見つかりません"); return

    os.makedirs("out", exist_ok=True)

    # ロゴ取得（KARASUMA_FEED_LOGO 未設定かつ tatelogo セットの時）：画像フォルダ配下の「ロゴ」から1枚→生成り透過PNG化
    if os.environ.get("FEED_SET") == "tatelogo" and not os.environ.get("KARASUMA_FEED_LOGO"):
        try:
            from PIL import Image
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
            lf = find_logo(LOGO_PARENT)
            imgs_l = [x for x in (children(lf) if lf else []) if x["mimeType"].startswith("image/")]
            if imgs_l:
                pick = sorted(imgs_l, key=short, reverse=True)[0]
                raw = "out/_logo_raw"
                req = drive.files().get_media(fileId=pick["id"])
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
                if avg < 150:  # 暗ロゴ→生成り単色に（暗背景で映える）
                    pk = im.load()
                    for y in range(im.size[1]):
                        for x in range(im.size[0]):
                            r, g, bl, a = pk[x, y]
                            if a > 0:
                                pk[x, y] = (0xF3, 0xEA, 0xD8, a)
                im.save("out/logo.png")
                os.environ["KARASUMA_FEED_LOGO"] = os.path.abspath("out/logo.png")
                print("[FEEDSAMPLE][LOGO] 採用:", pick.get("name"), "avg=%.0f" % avg, "->", os.environ["KARASUMA_FEED_LOGO"])
            else:
                print("[FEEDSAMPLE][LOGO] ロゴが見つからず＝明朝の屋号にフォールバック")
        except Exception as e:
            print("[FEEDSAMPLE][LOGO] スキップ:", repr(e))

    picks = imgs[:N_DISHES]
    results = []
    for i, f in enumerate(picks):
        name = clean(f["name"])
        desc = kc.desc_for(name)
        local = "out/feedsrc_%d.jpg" % i
        req = drive.files().get_media(fileId=f["id"])
        buf = io.FileIO(local, "wb"); dl = MediaIoBaseDownload(buf, req); done = False
        while not done:
            _, done = dl.next_chunk()
        buf.close()
        print("\n=== 料理%d: %s | desc=%s ===" % (i + 1, name, desc))
        _set = os.environ.get("FEED_SET")
        design_set = {"tate": fd.TATE_VARIANTS, "tatelogo": fd.TATE_LOGO_VARIANTS}.get(_set, fd.DESIGNS)
        for key, label, fn in design_set:
            outp = "out/feed_%s_%d.jpg" % (key, i)
            try:
                fn(local, outp, name, desc)
                url = poster.up(outp, cdn=True)
                print("[FEEDSAMPLE] %s (%s) -> %s" % (label, name, url))
                results.append({"design": key, "label": label, "dish": name, "url": url})
            except Exception as e:
                print("[FEEDSAMPLE][ERR] %s %s: %r" % (label, name, e))

    print("\n===== FEED SAMPLES(JSON) ここから =====")
    print(json.dumps(results, ensure_ascii=False))
    print("===== FEED SAMPLES(JSON) ここまで =====")


if __name__ == "__main__":
    main()
