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
# 対象ディレクトリ。引数で他店（pwa/nagagutsu など）も指定できる。既定はぎふや＝従来どおり。
GDIR = os.path.abspath(os.path.join(HERE, "..", "pwa", "gifuya"))
# 2サイズのWebPを作る：
#   thumb = 360px/q72 … 全商品グリッド・小サムネ用（超軽量）
#   card  = 960px/q85 … カードの本表示用（初回読み込みを軽く・画質は目視で原寸と同等）
# ※実際のInstagram投稿には“原寸JPEG”をそのまま使うので投稿画質は落とさない。
SIZES = [("thumb.webp", 360, 72), ("card.webp", 960, 85)]


def _gen(p, suffix, w, q):
    out = os.path.join(os.path.dirname(p), os.path.splitext(os.path.basename(p))[0] + "." + suffix)
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(p):
        return 0  # 既に最新
    im = Image.open(p).convert("RGB")
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(out, "WEBP", quality=q, method=6)
    return 1


def main(target=None):
    """target 未指定なら従来どおり pwa/gifuya。他店は run('../pwa/nagagutsu') のように渡す。"""
    made = 0
    d = os.path.abspath(target) if target else GDIR
    for p in sorted(glob.glob(os.path.join(d, "*.jpg"))):
        for suffix, w, q in SIZES:
            try:
                made += _gen(p, suffix, w, q)
            except Exception as e:
                print("[THUMB] skip", os.path.basename(p), suffix, e)
    print("[THUMB] %d webp files updated -> %s" % (made, d))
    return made


if __name__ == "__main__":
    import sys
    main(sys.argv[1] if len(sys.argv) > 1 else None)
