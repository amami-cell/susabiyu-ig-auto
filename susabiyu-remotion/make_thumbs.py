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
# 2サイズのWebPを作る：
#   thumb = 360px/q72 … 全商品グリッド・小サムネ用（超軽量）
#   card  = 960px/q85 … カードの本表示用（初回読み込みを軽く・画質は目視で原寸と同等）
# ※実際のInstagram投稿には“原寸JPEG”をそのまま使うので投稿画質は落とさない。
SIZES = [("thumb.webp", 360, 72), ("card.webp", 960, 85)]


def _gen(p, suffix, w, q):
    out = os.path.join(GDIR, os.path.splitext(os.path.basename(p))[0] + "." + suffix)
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(p):
        return 0  # 既に最新
    im = Image.open(p).convert("RGB")
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(out, "WEBP", quality=q, method=6)
    return 1


def main():
    made = 0
    for p in sorted(glob.glob(os.path.join(GDIR, "*.jpg"))):
        for suffix, w, q in SIZES:
            try:
                made += _gen(p, suffix, w, q)
            except Exception as e:
                print("[THUMB] skip", os.path.basename(p), suffix, e)
    print("[THUMB] %d webp files updated -> %s" % (made, GDIR))


if __name__ == "__main__":
    main()
