# -*- coding: utf-8 -*-
"""すさび湯三条「制作物」のドリンク170円バナー(縦2:3)を、投稿で崩れない様に
フィード(4:5=1080x1350)とストーリー(9:16=1080x1920)へフィットさせて書き出す。
・切り取らない：バナー全体を必ず表示（contain）。
・余白は“同じバナーをぼかして拡大”で埋める（IGの blurred-fill 風＝自然・崩れない）。
出力: ../pwa/susabiyu/banner_XX_feed.jpg / banner_XX_story.jpg (＋feed用WebP)
"""
import os, glob
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "review_photos")
OUT_DIR = os.path.abspath(os.path.join(HERE, "..", "pwa", "susabiyu"))
# 使うバナー（制作物フォルダ・すさび湯ブランドの170円バナー）。表示名も併記。
BANNERS = [
    ("event_制作物__170円A.jpg", "170円A（金ハイボール）"),
    ("event_制作物__170円B.jpg", "170円B（レトロ居酒屋）"),
    ("event_制作物__170円C.jpg", "170円C（紺・筆文字）"),
    ("event_制作物__170円D.jpg", "170円D（全ドリンク）"),
    ("event_制作物__ドリンク全品170円(187円)", "全品170円（黄ポップ）"),
]
WEBP = [("thumb.webp", 360, 72), ("card.webp", 960, 85)]


def fit(src, out, W, H):
    im = Image.open(src).convert("RGB")
    iw, ih = im.size
    # 背景：canvasを覆うように拡大→強めのぼかし→やや暗く（前面のバナーを引き立てる）
    s = max(W / iw, H / ih)
    bg = im.resize((int(iw * s + 0.5), int(ih * s + 0.5)), Image.LANCZOS)
    left, top = (bg.width - W) // 2, (bg.height - H) // 2
    bg = bg.crop((left, top, left + W, top + H)).filter(ImageFilter.GaussianBlur(42))
    dark = Image.new("RGB", (W, H), (0, 0, 0))
    bg = Image.blend(bg, dark, 0.28)
    # 前面：バナー全体が入るように縮小（contain）して中央へ
    s2 = min(W / iw, H / ih)
    fg = im.resize((int(iw * s2 + 0.5), int(ih * s2 + 0.5)), Image.LANCZOS)
    canvas = bg.copy()
    canvas.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
    canvas.save(out, quality=92, subsampling=0)
    return out


def _webp(src_jpg):
    base = os.path.splitext(src_jpg)[0]
    im = Image.open(src_jpg).convert("RGB")
    for suffix, w, q in WEBP:
        o = base + "." + suffix
        im2 = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im2.save(o, "WEBP", quality=q, method=6)


# バナー投稿の本文（ドリンク訴求）。料理説明とは別テンプレ。
BANNER_CAP = "何杯でも、気軽に乾杯。\nドリンク全品170円（税込187円）🍺\n仕事帰りのサク飲みも、じっくり一杯も、大衆寿司酒場すさび湯 三条で。"
BANNER_TAGS = "#ドリンク170円 #格安居酒屋 #京都居酒屋 #河原町三条 #すさび湯三条"


def _update_feed_json(banner_items):
    import json
    fp = os.path.join(OUT_DIR, "feed.json")
    try:
        d = json.load(open(fp, encoding="utf-8"))
    except Exception:
        d = {"items": []}
    # 既存のバナー項目は入れ替え（imgがbanner_で始まる）。料理項目はそのまま。
    dishes = [it for it in d.get("items", []) if not str(it.get("img", "")).startswith("banner_")]
    d["items"] = dishes + banner_items
    d["count"] = len(d["items"])
    json.dump(d, open(fp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("[BANNER] feed.json 更新: 料理%d + バナー%d = %d" % (len(dishes), len(banner_items), len(d["items"])))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    banner_items = []
    for i, (fname, label) in enumerate(BANNERS, 1):
        src = os.path.join(SRC_DIR, fname)
        if not os.path.exists(src):
            print("[BANNER] 見つからない:", fname); continue
        key = "banner_%02d" % i
        feed = os.path.join(OUT_DIR, key + "_feed.jpg")
        story = os.path.join(OUT_DIR, key + "_story.jpg")
        fit(src, feed, 1080, 1350)      # フィード 4:5
        fit(src, story, 1080, 1920)     # ストーリー 9:16
        _webp(feed)
        banner_items.append({
            "img": key + "_feed.jpg",
            "name": "🍺 ドリンク170円バナー " + label.split("（")[0].replace("170円", ""),
            "cap": BANNER_CAP, "tags": BANNER_TAGS, "reco": False, "banner": True,
        })
        print("[BANNER] built", key, label, "<-", fname)
    _update_feed_json(banner_items)
    print("[BANNER] %d本 -> %s" % (len(banner_items), OUT_DIR))
    return banner_items


if __name__ == "__main__":
    main()
