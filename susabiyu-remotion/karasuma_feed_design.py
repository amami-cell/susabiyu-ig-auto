# -*- coding: utf-8 -*-
"""鮨処すさび湯（京都・四条烏丸）フィード投稿画像（4:5・1080x1350）の和モダン意匠。
三条/ぎふやと同じ「写真全面＋文字焼き込み」方式（gifuya_design のヘルパーを流用）だが、
見た目はストーリーで作った和モダン（墨×生成り×金・明朝）に統一。上品・完全個室の世界観。

3案:
  ① render_tate  縦書き大明朝（軸装風）
  ② render_obi   生成りの帯（献立エディトリアル）
  ③ render_maru  円窓（まる窓）

  from karasuma_feed_design import render_tate, render_obi, render_maru
  render_obi("in.jpg", "out.jpg", "まぐろ中とろ", "とろける脂と赤身の甘み、中とろ。", sub="SUSHI")
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from gifuya_design import _cover, _font, _SERIF_PATH, _GOTHIC_PATH

W, H = 1080, 1350
HERE = os.path.dirname(os.path.abspath(__file__))

# 和モダン配色（ストーリーの YTHEMES.wamodan と揃える）
BASE = (20, 16, 12)        # 墨
INK = (244, 237, 221)      # 生成り
SUB = (203, 190, 159)      # 淡い金生成り
ACCENT = (216, 179, 106)   # 金
SLAB = (123, 59, 46)       # 弁柄
CREAM = (240, 233, 216)    # 生成りの帯地
CREAM_INK = (38, 30, 24)   # 帯上の文字（墨）

# 烏丸(上品)は三条の大衆ロゴを使わず、既定は明朝の屋号テキスト。
# ロゴ画像を使いたい時だけ環境変数 KARASUMA_FEED_LOGO にパスを渡す。
_LOGO_CANDS = [p for p in [os.environ.get("KARASUMA_FEED_LOGO", "")] if p]


def _mincho(size):
    return _font(_SERIF_PATH, size)


def _gothic(size):
    return _font(_GOTHIC_PATH, size)


def _logo_white(max_w):
    for p in _LOGO_CANDS:
        if os.path.exists(p):
            try:
                im = Image.open(p).convert("RGBA")
                if im.width > max_w:
                    r = max_w / im.width
                    im = im.resize((max_w, int(im.height * r)), Image.LANCZOS)
                return im
            except Exception:
                continue
    return None


def _shadow_text(img, xy, text, font, fill=INK, anchor=None, sh=(0, 0, 0, 150), off=((2, 2), (3, 3))):
    d = ImageDraw.Draw(img)
    x, y = xy
    for dx, dy in off:
        d.text((x + dx, y + dy), text, font=font, fill=sh, anchor=anchor)
    d.text((x, y), text, font=font, fill=fill + (255,) if len(fill) == 3 else fill, anchor=anchor)


def _wrap(text, font, max_w):
    """句読点/読点で優先的に折り、無ければ文字数で折る。"""
    d = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    def w(s):
        b = d.textbbox((0, 0), s, font=font); return b[2] - b[0]
    if w(text) <= max_w:
        return [text]
    lines, cur = [], ""
    for ch in text:
        if w(cur + ch) > max_w and cur:
            lines.append(cur); cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines[:3]


def _grad_top_bottom(base, top=300, top_a=150, bot=460, bot_a=190):
    ov = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(ov)
    for y in range(0, top):
        d.line([(0, y), (W, y)], fill=int(top_a * (1 - y / top)))
    for y in range(H - bot, H):
        t = (y - (H - bot)) / bot
        d.line([(0, y), (W, y)], fill=int(bot_a * t))
    ov = ov.filter(ImageFilter.GaussianBlur(18))
    black = Image.new("RGB", (W, H), (8, 6, 4))
    return Image.composite(black, base, ov).convert("RGBA")


def _place_logo_or_text(img, x, y, max_w=300):
    lg = _logo_white(max_w)
    if lg is not None:
        img.alpha_composite(lg, (x, y))
        return y + lg.height
    _shadow_text(img, (x, y), "鮨処すさび湯", _mincho(52), fill=INK)
    return y + 66


# ── 案①：縦書き大明朝（軸装風）──────────────────────────────
def render_tate(src, out, name, desc, sub="SUSHI", badge="四条烏丸｜完全個室", quality=92):
    base = _cover(Image.open(src), W, H).convert("RGBA")
    base = _grad_top_bottom(base, top=320, top_a=140, bot=520, bot_a=170)
    # 右側もほんのり沈めて縦書きを読ませる
    ov = Image.new("L", (W, H), 0); d = ImageDraw.Draw(ov)
    for x in range(W - 360, W):
        d.line([(x, 0), (x, H)], fill=int(120 * ((x - (W - 360)) / 360)))
    ov = ov.filter(ImageFilter.GaussianBlur(24))
    base = Image.composite(Image.new("RGB", (W, H), (8, 6, 4)), base, ov).convert("RGBA")

    d = ImageDraw.Draw(base)
    # 左上：白ロゴ＋SUSHI・KYOTO
    yb = _place_logo_or_text(base, 60, 56, 300)
    _shadow_text(base, (62, yb + 8), "SUSHI・KYOTO", _gothic(24), fill=ACCENT)
    # 右上：上品バッジ
    bf = _gothic(26)
    bb = d.textbbox((0, 0), badge, font=bf)
    _shadow_text(base, (W - 60 - (bb[2] - bb[0]), 64), badge, bf, fill=INK)
    # 右：金の縦罫＋縦書き料理名（大明朝）
    d.rectangle([W - 96, 250, W - 93, 250 + 360], fill=ACCENT)
    vf = _mincho(96 if len(name) <= 7 else (78 if len(name) <= 10 else 62))
    from gifuya_design import _draw_vertical
    _draw_vertical(base, name, right_x=W - 120, top_y=250, font=vf, fill=INK)
    # 左下：金の短罫＋説明文
    d.rectangle([60, H - 300, 168, H - 297], fill=ACCENT)
    df = _mincho(40)
    y = H - 268
    for ln in _wrap(desc, df, W - 380):
        _shadow_text(base, (60, y), ln, df, fill=(241, 231, 210)); y += 58
    _shadow_text(base, (60, H - 90), "@susabiyu_kyoto", _gothic(26), fill=ACCENT)
    base.convert("RGB").save(out, quality=quality)
    return out


# ── 案②：生成りの帯（献立エディトリアル）───────────────────────
def render_obi(src, out, name, desc, sub="SUSHI", badge="四条烏丸｜完全個室", quality=92):
    BAND = int(H * 0.36)
    photo = _cover(Image.open(src), W, H - BAND + 40).convert("RGBA")
    base = Image.new("RGBA", (W, H), CREAM + (255,))
    base.alpha_composite(photo, (0, 0))
    d = ImageDraw.Draw(base)
    # 帯（生成り）＋上辺に金の細線
    by = H - BAND
    d.rectangle([0, by, W, H], fill=CREAM + (255,))
    d.rectangle([0, by, W, by + 4], fill=ACCENT)
    # 写真右上：上品バッジ（墨地の小札）
    bf = _gothic(26); bb = d.textbbox((0, 0), badge, font=bf)
    d.rounded_rectangle([W - 96 - (bb[2] - bb[0]), 48, W - 40, 100], radius=8, fill=(16, 12, 10, 210))
    d.text((W - 68 - (bb[2] - bb[0]), 60), badge, font=bf, fill=INK + (255,))
    # 写真左上：白ロゴ
    _place_logo_or_text(base, 56, 52, 280)
    # 帯の中：欧文サブ → 料理名（明朝・墨・大）→ 説明文 → 罫 → ロゴ的テキスト＋handle
    x = 70
    d.text((x, by + 44), sub, font=_gothic(26), fill=SLAB + (255,))
    nf = _mincho(84 if len(name) <= 9 else (66 if len(name) <= 13 else 54))
    d.text((x, by + 84), name, font=nf, fill=CREAM_INK + (255,))
    df = _mincho(38)
    y = by + 84 + nf.size + 22
    for ln in _wrap(desc, df, W - 140):
        d.text((x, y), ln, font=df, fill=(70, 58, 46, 255)); y += 54
    d.rectangle([x, H - 96, x + 96, H - 93], fill=ACCENT)
    d.text((x, H - 78), "鮨処すさび湯　@susabiyu_kyoto", font=_gothic(28), fill=CREAM_INK + (255,))
    base.convert("RGB").save(out, quality=quality)
    return out


# ── 案③：円窓（まる窓）─────────────────────────────────────
def render_maru(src, out, name, desc, sub="SUSHI", badge="四条烏丸｜完全個室", quality=92):
    base = Image.new("RGBA", (W, H), BASE + (255,))
    # 墨地に微かな縦グラデ
    ov = Image.new("L", (W, H), 0); dd = ImageDraw.Draw(ov)
    for y in range(H):
        dd.line([(0, y), (W, y)], fill=int(30 * (y / H)))
    base = Image.composite(Image.new("RGB", (W, H), (6, 5, 4)), base.convert("RGB"), ov).convert("RGBA")
    d = ImageDraw.Draw(base)
    # 円窓（中央やや上）
    D = 760
    cx, cy = W // 2, 600
    photo = _cover(Image.open(src), D, D).convert("RGBA")
    mask = Image.new("L", (D, D), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, D, D], fill=255)
    base.paste(photo, (cx - D // 2, cy - D // 2), mask)
    # 金の細いリング
    for wgt, col in ((6, ACCENT), (2, (150, 120, 70))):
        d.ellipse([cx - D // 2 - wgt, cy - D // 2 - wgt, cx + D // 2 + wgt, cy + D // 2 + wgt],
                  outline=col, width=wgt)
    # 上：屋号＋SUSHI・KYOTO（中央）
    yb = 70
    lg = _logo_white(300)
    if lg is not None:
        base.alpha_composite(lg, (cx - lg.width // 2, yb)); yb2 = yb + lg.height + 6
    else:
        _shadow_text(base, (cx, yb), "鮨処すさび湯", _mincho(48), fill=INK, anchor="ma"); yb2 = yb + 60
    d.text((cx, yb2), "SUSHI・KYOTO", font=_gothic(24), fill=ACCENT + (255,), anchor="ma")
    # 下：料理名（中央・大明朝）＋説明文＋バッジ
    ny = cy + D // 2 + 44
    nf = _mincho(76 if len(name) <= 10 else 60)
    d.text((cx, ny), name, font=nf, fill=INK + (255,), anchor="ma")
    df = _mincho(36)
    y = ny + nf.size + 20
    for ln in _wrap(desc, df, W - 200):
        d.text((cx, y), ln, font=df, fill=SUB + (255,), anchor="ma"); y += 50
    d.text((cx, H - 78), "【 " + badge + " 】", font=_gothic(26), fill=ACCENT + (255,), anchor="ma")
    base.convert("RGB").save(out, quality=quality)
    return out


DESIGNS = [("tate", "案① 縦書き大明朝(軸装風)", render_tate),
           ("obi", "案② 生成りの帯(献立)", render_obi),
           ("maru", "案③ 円窓(まる窓)", render_maru)]


# ── 案①（縦書き大明朝）ベースの構成バリエーション ─────────────────
def _prep(src, top_a=140, bot_a=180, right_a=110):
    base = _cover(Image.open(src), W, H).convert("RGBA")
    base = _grad_top_bottom(base, top=320, top_a=top_a, bot=520, bot_a=bot_a)
    if right_a:
        ov = Image.new("L", (W, H), 0); d = ImageDraw.Draw(ov)
        for x in range(W - 380, W):
            d.line([(x, 0), (x, H)], fill=int(right_a * ((x - (W - 380)) / 380)))
        ov = ov.filter(ImageFilter.GaussianBlur(24))
        base = Image.composite(Image.new("RGB", (W, H), (8, 6, 4)), base, ov).convert("RGBA")
    return base


def _vfont(name, big=96):
    return _mincho(big if len(name) <= 7 else (int(big * 0.81) if len(name) <= 10 else int(big * 0.65)))


# ①B：表紙風（上中央の屋号＋上下の金横罫＋右の縦書き大＋下中央にキャッチ1行）
def render_tate_b(src, out, name, desc, sub="SUSHI", badge="四条烏丸｜完全個室", quality=92):
    from gifuya_design import _draw_vertical
    base = _prep(src, top_a=175, bot_a=205, right_a=120)
    d = ImageDraw.Draw(base)
    d.text((W // 2, 58), "鮨処すさび湯", font=_mincho(50), fill=INK + (255,), anchor="ma")
    d.text((W // 2, 122), "SUSHI・KYOTO", font=_gothic(24), fill=ACCENT + (255,), anchor="ma")
    d.rectangle([90, 170, W - 90, 173], fill=ACCENT)
    d.rectangle([90, H - 176, W - 90, H - 173], fill=ACCENT)
    _draw_vertical(base, name, right_x=W - 96, top_y=214, font=_vfont(name, 104), fill=INK)
    df = _mincho(38)
    _shadow_text(base, (W // 2, H - 150), _wrap(desc, df, W - 300)[0], df, fill=(241, 231, 210), anchor="ma")
    _shadow_text(base, (92, 60), badge, _gothic(24), fill=SUB)
    base.convert("RGB").save(out, quality=quality)
    return out


# ①D：右の縦書き＋足元に生成りの細帯（説明を墨文字で最も読みやすく）
def render_tate_d(src, out, name, desc, sub="SUSHI", badge="四条烏丸｜完全個室", quality=92):
    from gifuya_design import _draw_vertical
    band = 156
    base = _prep(src, top_a=140, bot_a=40, right_a=120)
    d = ImageDraw.Draw(base)
    _place_logo_or_text(base, 60, 54, 300)
    _shadow_text(base, (62, 120), "SUSHI・KYOTO", _gothic(22), fill=ACCENT)
    bf = _gothic(24); bb = d.textbbox((0, 0), badge, font=bf)
    _shadow_text(base, (W - 60 - (bb[2] - bb[0]), 62), badge, bf, fill=INK)
    d.rectangle([W - 96, 214, W - 93, 214 + 330], fill=ACCENT)
    _draw_vertical(base, name, right_x=W - 120, top_y=214, font=_vfont(name, 92), fill=INK)
    by = H - band
    d.rectangle([0, by, W, H], fill=CREAM + (255,))
    d.rectangle([0, by, W, by + 4], fill=ACCENT)
    df = _mincho(36)
    d.text((64, by + 34), _wrap(desc, df, W - 128)[0], font=df, fill=CREAM_INK + (255,))
    d.text((64, by + 92), "鮨処すさび湯　@susabiyu_kyoto", font=_gothic(24), fill=CREAM_INK + (255,))
    base.convert("RGB").save(out, quality=quality)
    return out


# ①E：額装風（四隅の金L字＋上中央の屋号＋右の縦書き＋左下に金二本罫＋説明）
def render_tate_e(src, out, name, desc, sub="SUSHI", badge="四条烏丸｜完全個室", quality=92):
    from gifuya_design import _draw_vertical
    base = _prep(src, top_a=155, bot_a=195, right_a=110)
    d = ImageDraw.Draw(base)
    m, L, t = 46, 74, 6
    for x, y, dx, dy in [(m, m, 1, 1), (W - m, m, -1, 1), (m, H - m, 1, -1), (W - m, H - m, -1, -1)]:
        d.line([(x, y), (x + dx * L, y)], fill=ACCENT, width=t)
        d.line([(x, y), (x, y + dy * L)], fill=ACCENT, width=t)
    d.text((W // 2, 66), "鮨処すさび湯", font=_mincho(46), fill=INK + (255,), anchor="ma")
    d.text((W // 2, 124), "SUSHI・KYOTO", font=_gothic(22), fill=ACCENT + (255,), anchor="ma")
    _draw_vertical(base, name, right_x=W - 104, top_y=210, font=_vfont(name, 92), fill=INK)
    d.rectangle([84, H - 250, 192, H - 247], fill=ACCENT)
    d.rectangle([84, H - 236, 192, H - 233], fill=ACCENT)
    df = _mincho(38)
    y = H - 206
    for ln in _wrap(desc, df, W - 360):
        _shadow_text(base, (84, y), ln, df, fill=(241, 231, 210)); y += 56
    base.convert("RGB").save(out, quality=quality)
    return out


# 案①ファミリー（ベース＋構成違い）
TATE_VARIANTS = [
    ("tateA", "①A 軸装(ベース)", render_tate),
    ("tateB", "①B 表紙風(上下金罫・中央屋号)", render_tate_b),
    ("tateD", "①D 縦書き＋生成り足元帯", render_tate_d),
    ("tateE", "①E 額装風(四隅の金飾り)", render_tate_e),
]
