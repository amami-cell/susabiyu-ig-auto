# -*- coding: utf-8 -*-
"""pwa/gifuya の各画像から、グリッド表示用の軽いWebPサムネ `<basename>.thumb.webp` を作る。
- 原寸(本番プレビュー用)はそのまま。サムネは「全商品グリッド／候補」など“小さく並べる”表示だけに使う。
- フロントはサムネが無ければ原寸へ自動フォールバック（onerror）するので、取りこぼしても表示は壊れない。
- 既にサムネが原寸より新しければスキップ（毎日のsyncで増分だけ生成＝速い）。
"""
import os
import glob
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GDIR = os.path.abspath(os.path.join(HERE, "..", "pwa", "gifuya"))
W = 360   # サムネ幅（3列グリッドで十分きれい・十分軽い）
Q = 72    # WebP品質


def main():
    made = 0
    for p in sorted(glob.glob(os.path.join(GDIR, "*.jpg"))):
        base = os.path.basename(p)
        out = os.path.join(GDIR, os.path.splitext(base)[0] + ".thumb.webp")
        try:
            if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(p):
                continue  # 既に最新
            im = Image.open(p).convert("RGB")
            if im.width > W:
                im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
            im.save(out, "WEBP", quality=Q, method=6)
            made += 1
        except Exception as e:
            print("[THUMB] skip", base, e)
    print("[THUMB] %d webp thumbs updated -> %s" % (made, GDIR))


if __name__ == "__main__":
    main()
