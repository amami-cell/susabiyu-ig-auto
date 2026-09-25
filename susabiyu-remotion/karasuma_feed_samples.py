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
        design_set = fd.TATE_VARIANTS if os.environ.get("FEED_SET") == "tate" else fd.DESIGNS
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
