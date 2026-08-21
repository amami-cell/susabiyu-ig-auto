# -*- coding: utf-8 -*-
"""大衆寿司酒場すさび湯 三条：写真が無くても“加工済みフィード投稿画像”を自動生成する。
藍(銭湯)背景＋青海波＋白ロゴ＋料理名(明朝)＋朱の下線＋サブコピー の 1080x1350 ポスター。
ぎふやの feed_XX と同じ「見れば分かる」体裁を、三条ブランド(銭湯×すし酒場)で作る。

使い方:
  from susabiyu_design import render_card
  render_card("まぐろ三昧", "赤身・中とろ・大とろ", "out.jpg", reco=True)
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ぎふやで実績のある縦書き/影/極太見出しのレンダラーを再利用（フォント探索も共通）。
from gifuya_design import (_SERIF_PATH, _GOTHIC_PATH, _font, _draw_vertical,
                           _text_shadow, _text_heavy, _VERT_ROTATE)

W, H = 1080, 1350
HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_WHITE = os.path.join(HERE, "assets_susabiyu_logo_white.png")

# 藍×朱＝大衆酒場/銭湯の定番配色。
INK_TOP = (22, 41, 74)      # 藍(明)
INK_BOT = (10, 22, 44)      # 藍(暗)
WAVE = (35, 62, 104)        # 青海波の線（背景よりわずかに明るい藍）
ACC = (201, 74, 60)         # 朱色（下線・リボン・暖簾）
GOLD = (224, 181, 110)      # おすすめ金
INK_NAVY = (12, 26, 52)


def _gradient_bg():
    base = Image.new("RGB", (W, H), INK_BOT)
    top = Image.new("RGB", (W, H), INK_TOP)
    mask = Image.new("L", (1, H))
    for y in range(H):
        # 上を明るく下を暗く（中央やや上に重心）
        t = (y / H) ** 1.15
        mask.putpixel((0, y), int(255 * (1 - t)))
    mask = mask.resize((W, H))
    base = Image.composite(top, base, mask)
    return base


def _seigaiha_tile(unit=132, line=WAVE):
    """青海波（同心の半円が連なる和柄）の1タイルを作る。銭湯＝湯・水を連想させる。"""
    tw, th = unit, unit // 2
    tile = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    centers = [(-tw // 2, 0), (tw // 2, 0), (tw + tw // 2, 0)]
    rings = 4
    for cx, cy in [(0, 0), (tw, 0)] + centers:
        for i in range(rings):
            r = int(unit / 2 * (i + 1) / rings)
            a = 46 if i % 2 == 0 else 30
            d.arc([cx - r, cy - r, cx + r, cy + r], 0, 180, fill=line + (a,), width=3)
    return tile


def _apply_seigaiha(base):
    tile = _seigaiha_tile()
    tw, th = tile.size
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    y = 0
    row = 0
    while y < H:
        x = -(tw // 2) if row % 2 else 0
        while x < W:
            layer.alpha_composite(tile, (x, y))
            x += tw
        y += th
        row += 1
    base = base.convert("RGBA")
    base.alpha_composite(layer)
    return base


def _vignette(base):
    ov = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(ov)
    # 四隅を少し落として中央を締める
    m = 120
    d.rectangle([0, 0, W, H], fill=0)
    inner = Image.new("L", (W, H), 0)
    di = ImageDraw.Draw(inner)
    di.rounded_rectangle([m, m, W - m, H - m], radius=140, fill=90)
    inner = inner.filter(ImageFilter.GaussianBlur(150))
    black = Image.new("RGB", (W, H), (0, 0, 0))
    # 反転して外側を暗く
    inv = Image.eval(inner, lambda p: 90 - p)
    return Image.composite(black, base.convert("RGB"), inv).convert("RGBA")


def _put_logo(base):
    if not os.path.exists(LOGO_WHITE):
        return
    lg = Image.open(LOGO_WHITE).convert("RGBA")
    lw = 300
    lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
    base.alpha_composite(lg, (44, 40))


def _draw_ribbon_reco(base):
    """右上に金の斜めリボン『★おすすめ』。"""
    tmp = Image.new("RGBA", (520, 150), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    d.rounded_rectangle([20, 40, 500, 120], radius=10, fill=GOLD + (255,))
    f = _font(_GOTHIC_PATH, 44)
    t = "★ おすすめ"
    tb = d.textbbox((0, 0), t, font=f)
    d.text(((520 - (tb[2] - tb[0])) / 2, 40 + (80 - (tb[3] - tb[1])) / 2 - tb[1]),
           t, font=f, fill=INK_NAVY + (255,))
    tmp = tmp.rotate(-14, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(tmp, (W - tmp.width + 30, -18))


def _bottom_wordmark(draw):
    f = _font(_GOTHIC_PATH, 30)
    t1 = "大衆寿司酒場 すさび湯 ・ 河原町三条"
    t2 = "ドリンク全品170円／お寿司は本格的に"
    _text_shadow(draw, (60, H - 96), t1, f, fill=(214, 224, 238))
    f2 = _font(_GOTHIC_PATH, 26)
    _text_shadow(draw, (60, H - 56), t2, f2, fill=(150, 168, 196))


def render_card(name, subcopy, out, reco=False, quality=90):
    base = _gradient_bg()
    base = _apply_seigaiha(base)
    base = _vignette(base)

    _put_logo(base)
    if reco:
        _draw_ribbon_reco(base)

    draw = ImageDraw.Draw(base)
    # ロゴ下の朱の細ルール
    draw.line([(48, 150), (300, 150)], fill=ACC, width=6)

    name = (name or "").strip()
    # 長音符などを含む名前・長い名前は横書き（大明朝＋朱下線）。それ以外は巨大縦書き。
    horizontal = any(c in _VERT_ROTATE for c in name) or len(name) >= 8
    if horizontal:
        margin = 64
        hsize = 118
        hfont = _font(_SERIF_PATH, hsize)
        # 2行まで許容して自動縮小
        def wrap(fnt):
            lines, cur = [], ""
            for ch in name:
                if draw.textlength(cur + ch, font=fnt) <= W - 2 * margin:
                    cur += ch
                else:
                    lines.append(cur); cur = ch
            if cur:
                lines.append(cur)
            return lines
        lines = wrap(hfont)
        while (len(lines) > 2 or (lines and max(draw.textlength(l, font=hfont) for l in lines) > W - 2 * margin)) and hsize > 54:
            hsize -= 6
            hfont = _font(_SERIF_PATH, hsize)
            lines = wrap(hfont)
        lh = int(hsize * 1.2)
        total = lh * len(lines)
        ty = H - 300 - total
        draw.line([(margin, ty - 20), (margin + 220, ty - 20)], fill=ACC, width=9)
        for i, ln in enumerate(lines):
            _text_heavy(draw, (margin, ty + i * lh - hfont.getbbox(ln)[1]),
                        ln, hfont, fill=(255, 255, 255), edge=(8, 14, 26), weight=1, ow=3)
    else:
        n = max(1, len(name))
        top_y = 250
        avail = H - top_y - 240
        vsize = max(96, min(220, int(avail / (1.12 * n))))
        vfont = _font(_SERIF_PATH, vsize)
        _draw_vertical(base, name, right_x=W - 70, top_y=top_y, font=vfont)

    # サブコピー（下・朱下線＋白）。design用の短い一言。
    if subcopy:
        sfont = _font(_GOTHIC_PATH, 58)
        margin = 64
        maxw = W - margin - 40
        lines = []
        for raw in str(subcopy).split("\n"):
            if draw.textlength(raw, font=sfont) <= maxw:
                lines.append(raw)
            else:
                cur = ""
                for ch in raw:
                    if draw.textlength(cur + ch, font=sfont) <= maxw:
                        cur += ch
                    else:
                        lines.append(cur); cur = ch
                if cur:
                    lines.append(cur)
        lines = lines[:2]
        lh = int(58 * 1.24)
        total = lh * len(lines)
        sy0 = H - 150 - total
        draw.line([(margin, sy0 - 20), (margin + 200, sy0 - 20)], fill=ACC, width=8)
        for i, ln in enumerate(lines):
            _text_shadow(draw, (margin, sy0 + i * lh), ln, sfont, fill=(245, 238, 226))

    _bottom_wordmark(draw)
    base.convert("RGB").save(out, quality=quality, subsampling=0)
    return out


if __name__ == "__main__":
    os.makedirs("out", exist_ok=True)
    render_card("まぐろ三昧", "赤身・中とろ・大とろを一度に", "out/_t1.jpg", reco=True)
    render_card("サーモン三昧", "とろける炙りも食べ比べ", "out/_t2.jpg")
    render_card("海鮮ちらし丼", "〆はやっぱりこれ", "out/_t3.jpg", reco=True)
    print("wrote out/_t1..3.jpg")
