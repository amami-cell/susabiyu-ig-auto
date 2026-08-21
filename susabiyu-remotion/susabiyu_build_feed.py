# -*- coding: utf-8 -*-
"""すさび湯 三条：メニュー(susabiyu_menu.MENU)から“加工済みフィード投稿画像”を一括生成し、
pwa/susabiyu/ に feed_XX.jpg（＋軽量WebPサムネ）と feed.json を書き出す。

  python susabiyu_build_feed.py

生成物:
  ../pwa/susabiyu/feed_01.jpg .. feed_30.jpg     （投稿用 1080x1350・原寸）
  ../pwa/susabiyu/feed_01.thumb.webp / .card.webp（グリッド/カード表示用の軽量版）
  ../pwa/susabiyu/feed.json                       （確認アプリ reels.html が読む候補一覧）

※ 確認アプリ(reels.html)は feed.json を読んで「全商品」ピッカーに並べる。
   画像URLの中身が変わった時だけ ?v を上げる運用（sw.js側の画像キャッシュは固定名で保持）。
"""
import os
import json

from PIL import Image

from susabiyu_menu import MENU, keys
from susabiyu_design import render_card

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.abspath(os.path.join(HERE, "..", "pwa", "susabiyu"))
# thumb=360/q72（小サムネ）, card=960/q85（カード本表示）。原寸JPEGは投稿にも使える品質のまま。
WEBP = [("thumb.webp", 360, 72), ("card.webp", 960, 85)]


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
    ks = keys()
    items = []
    for i, it in enumerate(MENU):
        key = ks[i]
        jpg = os.path.join(OUT_DIR, key + ".jpg")
        render_card(it["name"], it.get("sub", ""), jpg, reco=bool(it.get("reco")))
        _webp(jpg)
        items.append({
            "img": key + ".jpg",
            "name": it["name"],
            "cap": it.get("cap", ""),
            "tags": it.get("tags", ""),
            "reco": bool(it.get("reco")),
        })
        print("[SUSABIYU] built", key, it["name"])
    feed = {"items": items, "count": len(items)}
    with open(os.path.join(OUT_DIR, "feed.json"), "w", encoding="utf-8") as f:
        json.dump(feed, f, ensure_ascii=False, indent=1)
    print("[SUSABIYU] %d products -> %s" % (len(items), OUT_DIR))


if __name__ == "__main__":
    main()
