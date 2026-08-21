# -*- coding: utf-8 -*-
"""大衆寿司酒場すさび湯 三条：既存のフィード見本(pwa/sample/feed1.jpg)と同じ体裁を、
実際の料理写真(review_photos)に焼き込んで量産する。
  ・白ロゴ（左上）
  ・朱の縦リボン短冊2枚（右上）「ドリンク全品170円!!」「河原町三条店」
  ・下部に極太の大衆コピー（見出し）＋金の下線＋料理名
写真を覆う 1080x1350（4:5）で、投稿にもそのまま使える体裁。

  from susabiyu_feed_design import render_feed
  render_feed("in.jpg", "out.jpg", "旨い、安い、賑やかに。", "まぐろ三昧", reco=True)
"""
import os
from PIL import Image, ImageDraw, ImageFilter

from gifuya_design import (_cover, _SERIF_PATH, _GOTHIC_PATH, _font,
                           _text_shadow, _text_heavy, _draw_vertical)

W, H = 1080, 1350
HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_WHITE = os.path.join(HERE, "assets_susabiyu_logo_white.png")

SHU = (196, 40, 38)        # 朱（大衆の赤）
SHU_D = (150, 26, 24)
KIN = (224, 181, 110)      # 金（下線・リボン縁）
INK = (30, 24, 20)

# 短冊の“色違い”パターン。レイアウト(feed1)は同じで、短冊リボンの色だけ変える。
# 下線・縁・ロゴは金/白のまま＝大衆の統一感は保つ。
SCHEMES = {
    "shu":   (196, 40, 38),    # 朱赤（現行）
    "ai":    (30, 54, 104),    # 藍
    "midori": (28, 86, 60),    # 深緑
    "kuro":  (34, 30, 28),     # 黒（×金）
    "enji":  (122, 32, 46),    # 臙脂（ワイン）
    "cha":   (120, 74, 36),    # 茶（渋め）
}


def _scrim(base):
    """上（ロゴ/リボン）と下（見出し）をほんのり暗くして文字を読みやすく。写真中央は明るいまま。"""
    ov = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(ov)
    for y in range(0, 340):
        d.line([(0, y), (W, y)], fill=int(96 * (1 - y / 340)))
    for y in range(H - 560, H):
        t = (y - (H - 560)) / 560
        d.line([(0, y), (W, y)], fill=int(150 * (t ** 1.3)))
    ov = ov.filter(ImageFilter.GaussianBlur(18))
    black = Image.new("RGB", (W, H), (0, 0, 0))
    return Image.composite(black, base, ov).convert("RGBA")


def _put_logo(base):
    if not os.path.exists(LOGO_WHITE):
        return
    lg = Image.open(LOGO_WHITE).convert("RGBA")
    lw = 300
    lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
    # 白ロゴを少し濃い影付きで（明るい写真でも視認）
    sh = Image.new("RGBA", lg.size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, 120), (0, 0), lg)
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)), (40, 44))
    base.alpha_composite(lg, (36, 40))


def _fuda(base, lines, x, top=44, w=96, rot=-6, big_idx=None, fill=SHU):
    """縦リボン短冊（金フチ）に縦書き。lines=各段の文字列（右→左）。fill=短冊の色。"""
    pad = 16
    size = 46
    gap = 8
    # 高さ＝最長段の文字数から見積り
    maxn = max(len(s) for s in lines)
    hh = pad * 2 + maxn * (size + 4)
    ww = pad * 2 + len(lines) * (size + gap) - gap
    tile = Image.new("RGBA", (ww, hh), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    d.rounded_rectangle([0, 0, ww - 1, hh - 1], radius=14, fill=fill + (255,), outline=KIN + (255,), width=4)
    f = _font(_GOTHIC_PATH, size)
    cx = ww - pad - size
    for col in lines:
        y = pad
        for ch in col:
            b = f.getbbox(ch)
            cwx = cx + (size - (b[2] - b[0])) / 2 - b[0]
            _sc = tuple(int(c * 0.45) for c in fill)   # 影＝短冊色を暗くした色
            d.text((cwx + 2, y + 2), ch, font=f, fill=_sc + (200,))
            d.text((cwx, y), ch, font=f, fill=(255, 247, 232, 255))
            y += size + 4
        cx -= (size + gap)
    tile = tile.rotate(rot, expand=True, resample=Image.BICUBIC)
    # ドロップシャドウ
    sh = Image.new("RGBA", tile.size, (0, 0, 0, 0))
    sh.paste((60, 15, 8, 150), (0, 0), tile)
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)), (x + 6, top + 8))
    base.alpha_composite(tile, (x, top))
    return ww


def render_feed(src, out, headline, dishname, reco=False, quality=92, scheme="shu"):
    col = SCHEMES.get(scheme, SHU)       # 短冊の色（色違いパターン）
    src_im = src if isinstance(src, Image.Image) else Image.open(src)
    base = _cover(src_im, W, H)          # 4:5に覆う＋照明ムラ補正（ぎふや実績の処理）
    base = _scrim(base)

    _put_logo(base)

    # 右上：縦リボン短冊2枚（見本feed1と同じ並び＝左「ドリンク全品170円!!」／右「河原町三条店」）
    _fuda(base, ["河原町三条店"], x=W - 150, top=44, rot=-6, fill=col)
    _fuda(base, ["ドリンク全品170円!!"], x=W - 258, top=36, rot=-6, fill=col)

    draw = ImageDraw.Draw(base)

    if reco:
        rf = _font(_GOTHIC_PATH, 40)
        tmp = Image.new("RGBA", (360, 120), (0, 0, 0, 0))
        td = ImageDraw.Draw(tmp)
        td.rounded_rectangle([16, 30, 344, 96], radius=10, fill=KIN + (255,))
        t = "★ おすすめ"
        tb = td.textbbox((0, 0), t, font=rf)
        td.text(((360 - (tb[2] - tb[0])) / 2, 30 + (66 - (tb[3] - tb[1])) / 2 - tb[1]), t, font=rf, fill=INK + (255,))
        tmp = tmp.rotate(8, expand=True, resample=Image.BICUBIC)
        base.alpha_composite(tmp, (34, 210))

    # 下部：極太の大衆コピー（見出し・最大2行）＋金下線＋料理名
    margin = 60
    hsize = 116
    hfont = _font(_GOTHIC_PATH, hsize)
    def wrap(fnt):
        lines, cur = [], ""
        for ch in headline:
            if ch == "\n":
                lines.append(cur); cur = ""; continue
            if draw.textlength(cur + ch, font=fnt) <= W - 2 * margin:
                cur += ch
            else:
                lines.append(cur); cur = ch
        if cur:
            lines.append(cur)
        return lines
    lines = wrap(hfont)
    while (len(lines) > 2 or (lines and max(draw.textlength(l, font=hfont) for l in lines) > W - 2 * margin)) and hsize > 62:
        hsize -= 6
        hfont = _font(_GOTHIC_PATH, hsize)
        lines = wrap(hfont)
    lh = int(hsize * 1.18)
    # 料理名の高さ
    dfont = _font(_GOTHIC_PATH, 52)
    total = lh * len(lines)
    dy = H - 96 - 66                       # 料理名の基準
    hy = dy - total - 22
    # 金の下線（見出し左）
    draw.line([(margin, hy - 18), (margin + 240, hy - 18)], fill=KIN, width=10)
    for i, ln in enumerate(lines):
        _text_heavy(draw, (margin, hy + i * lh - hfont.getbbox(ln or "あ")[1]), ln, hfont,
                    fill=(255, 255, 255), edge=(20, 14, 10), weight=2, ow=3)
    # 料理名
    _text_shadow(draw, (margin, dy), dishname, dfont, fill=(245, 235, 220))

    base.convert("RGB").save(out, quality=quality, subsampling=0)
    return out


if __name__ == "__main__":
    import glob
    os.makedirs("out", exist_ok=True)
    cands = sorted(glob.glob("review_photos/food_*.jpg"))
    tests = [(cands[0], "旨い、安い、賑やかに。", "テスト料理A", True),
             (cands[len(cands)//2], "この安さは、ちょっと反則。", "テスト料理B", False)]
    for i, (p, h, n, r) in enumerate(tests):
        render_feed(p, "out/_f%d.jpg" % i, h, n, reco=r)
    print("wrote out/_f0..1.jpg from", [os.path.basename(t[0]) for t in tests])
