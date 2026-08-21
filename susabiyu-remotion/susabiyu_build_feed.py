# -*- coding: utf-8 -*-
"""すさび湯 三条：メニュー(susabiyu_menu.MENU)の各品を、実際の料理写真(review_photos/)へ
見本feed1の体裁で焼き込み、pwa/susabiyu/ に一括出力する。

  python susabiyu_build_feed.py

生成物:
  ../pwa/susabiyu/feed_01.jpg .. feed_30.jpg     （投稿用 1080x1350・写真＋大衆デザイン）
  ../pwa/susabiyu/feed_01.thumb.webp / .card.webp（グリッド/カード表示用の軽量版）
  ../pwa/susabiyu/feed.json                       （確認アプリ reels.html が読む候補一覧）

写真は三条の実データ review_photos/ から料理名で特定（ぎふや天神フォルダ 1HUtrz… は除外）。
"""
import os
import re
import glob
import json

from PIL import Image

from susabiyu_menu import MENU, keys, headline_for
from susabiyu_feed_design import render_feed

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.abspath(os.path.join(HERE, "..", "pwa", "susabiyu"))
PHOTO_DIR = os.path.join(HERE, "review_photos")
GIFUYA_FOLDER = "1HUtrzFFJiCuazZOhHBW88RVVdrvyh1Ox"   # ぎふや天神フォルダ＝三条では使わない
WEBP = [("thumb.webp", 360, 72), ("card.webp", 960, 85)]


def _clean(b):
    return b.split("__")[-1].rsplit(".", 1)[0]


def _index_photos():
    idx = {}
    for p in sorted(glob.glob(os.path.join(PHOTO_DIR, "*.jpg"))):
        b = os.path.basename(p)
        if GIFUYA_FOLDER in b:
            continue
        idx.setdefault(_clean(b), p)
    return idx


def _webp(src_jpg):
    base = os.path.splitext(src_jpg)[0]
    im = Image.open(src_jpg).convert("RGB")
    for suffix, w, q in WEBP:
        out = base + "." + suffix
        im2 = im
        if im.width > w:
            im2 = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im2.save(out, "WEBP", quality=q, method=6)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    photos = _index_photos()
    ks = keys()
    items, missing = [], []
    for i, it in enumerate(MENU):
        src = photos.get(it["photo"])
        if not src:
            missing.append(it["photo"])
            print("[SUSABIYU] !! 写真が見つかりません:", it["photo"])
            continue
        key = ks[i]
        jpg = os.path.join(OUT_DIR, key + ".jpg")
        render_feed(src, jpg, headline_for(i), it["name"], reco=bool(it.get("reco")))
        _webp(jpg)
        items.append({
            "img": key + ".jpg",
            "name": it["name"],
            "cap": it.get("cap", ""),
            "tags": it.get("tags", ""),
            "reco": bool(it.get("reco")),
        })
        print("[SUSABIYU] built", key, it["name"], "<-", os.path.basename(src))
    feed = {"items": items, "count": len(items)}
    with open(os.path.join(OUT_DIR, "feed.json"), "w", encoding="utf-8") as f:
        json.dump(feed, f, ensure_ascii=False, indent=1)
    print("[SUSABIYU] %d products -> %s" % (len(items), OUT_DIR))
    if missing:
        print("[SUSABIYU] 見つからなかった料理(%d): %s" % (len(missing), ", ".join(missing)))


if __name__ == "__main__":
    main()
