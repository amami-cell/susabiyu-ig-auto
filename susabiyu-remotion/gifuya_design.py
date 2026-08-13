# -*- coding: utf-8 -*-
"""ぎふや福岡天神：生の料理写真に「加工」（ロゴ＋巨大縦書きの料理名＋赤下線＋サブコピー＋任意の赤リボン）を
自動で焼き込み、feed_XX.jpg と同じ体裁の 1080x1350 投稿画像を作る。
見本(feed_01〜12)のデザイン言語を踏襲。全料理を一発で"加工済み"にするための共通レンダラー。

使い方:
  from gifuya_design import render_post
  render_post("in.jpg", "out.jpg", "名物どて焼き", subcopy="とろける自家製どて味噌", ribbon="福岡天神店")
"""
import os

from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1350
RED = (196, 30, 32)
HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_WHITE = os.path.join(HERE, "assets_gifuya_logo_white.png")

# 明朝（縦書き見出し向き）→ ゴシックの順で探す。CIでは fonts-noto-cjk を入れて明朝を使う。
_SERIF_CANDS = [
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSerifCJKjp-Bold.otf",
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSerifCJKjp-Regular.otf",
    "/usr/share/fonts/truetype/noto/NotoSerifCJK-Bold.ttc",
    "/usr/share/fonts/opentype/ipafont-mincho/ipam.ttf",
    "/usr/share/fonts/truetype/fonts-japanese-mincho.ttf",
]
_GOTHIC_CANDS = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Bold.otf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Regular.otf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
    "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
]


def _first_font_path(cands):
    for p in cands:
        if os.path.exists(p):
            return p
    return None


_SERIF_PATH = _first_font_path(_SERIF_CANDS) or _first_font_path(_GOTHIC_CANDS)
_GOTHIC_PATH = _first_font_path(_GOTHIC_CANDS) or _SERIF_PATH


def _font(path, size):
    return ImageFont.truetype(path, size)


def _cover(im, w, h):
    """アスペクトを保って w×h を覆うようにリサイズ＋センタークロップ。"""
    im = im.convert("RGB")
    iw, ih = im.size
    scale = max(w / iw, h / ih)
    nw, nh = int(iw * scale + 0.5), int(ih * scale + 0.5)
    im = im.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return im.crop((left, top, left + w, top + h))


def _scrim(base):
    """テキスト可読性のため、上下と右側をほんのり暗く。"""
    ov = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(ov)
    # 上グラデ（ロゴ・リボン用）
    for y in range(0, 360):
        d.line([(0, y), (W, y)], fill=int(120 * (1 - y / 360)))
    # 下グラデ（見出し・サブコピー用）
    for y in range(H - 520, H):
        t = (y - (H - 520)) / 520
        d.line([(0, y), (W, y)], fill=int(165 * t))
    # 右側グラデ（縦書き見出し用）
    for x in range(W - 470, W):
        t = (x - (W - 470)) / 470
        col = int(120 * t)
        d.line([(x, 0), (x, H)], fill=col)
    ov = ov.filter(ImageFilter.GaussianBlur(8))
    black = Image.new("RGB", (W, H), (0, 0, 0))
    return Image.composite(black, base, ov)


def _text_shadow(draw, xy, text, font, fill=(255, 255, 255), anchor=None, sh=(0, 0, 0, 170)):
    x, y = xy
    for dx, dy in ((2, 2), (2, 3), (3, 2)):
        draw.text((x + dx, y + dy), text, font=font, fill=sh, anchor=anchor)
    draw.text((x, y), text, font=font, fill=fill, anchor=anchor)


def _char_size(font, ch):
    b = font.getbbox(ch)
    return (b[2] - b[0], b[3] - b[1])


def _draw_vertical(img, text, right_x, top_y, font, line_gap=None, col_gap=None,
                   fill=(255, 255, 255)):
    """縦書き（右→左に段を追加）。長い名前は自動で複数段。戻り値=占有幅。"""
    draw = ImageDraw.Draw(img)
    size = font.size
    line_gap = size + (line_gap if line_gap is not None else int(size * 0.10))
    col_gap = col_gap if col_gap is not None else int(size * 0.16)
    # 1段に入る最大文字数（縦の余白から）
    max_per_col = max(1, (H - top_y - 120) // line_gap)
    cols = [text[i:i + max_per_col] for i in range(0, len(text), max_per_col)] or [text]
    x = right_x - size
    used_left = right_x
    for col in cols:
        y = top_y
        for ch in col:
            cw, chh = _char_size(font, ch)
            # 中央寄せして描画（縦線の中心に）
            cx = x + (size - cw) / 2 - font.getbbox(ch)[0]
            for dx, dy in ((2, 2), (3, 3)):
                draw.text((cx + dx, y + dy), ch, font=font, fill=(0, 0, 0, 170))
            draw.text((cx, y), ch, font=font, fill=fill)
            y += line_gap
        used_left = x
        x -= (size + col_gap)
    return right_x - used_left + size


def _draw_ribbon(img, text, font):
    """右上に赤の斜めリボン（feed_05風）。"""
    tmp = Image.new("RGBA", (520, 150), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    d.rounded_rectangle([20, 40, 500, 120], radius=10, fill=RED + (255,))
    tw = d.textbbox((0, 0), text, font=font)
    d.text(((520 - (tw[2] - tw[0])) / 2, 40 + (80 - (tw[3] - tw[1])) / 2 - tw[1]),
           text, font=font, fill=(255, 255, 255, 255))
    tmp = tmp.rotate(-14, expand=True, resample=Image.BICUBIC)
    img.paste(tmp, (W - tmp.width + 30, -18), tmp)


def render_post(src, out, title, subcopy=None, ribbon="福岡天神店", logo=True):
    base = _cover(Image.open(src), W, H)
    base = _scrim(base).convert("RGBA")

    # ロゴ（白・左上）
    if logo and os.path.exists(LOGO_WHITE):
        lg = Image.open(LOGO_WHITE).convert("RGBA")
        lw = 250
        lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
        base.alpha_composite(lg, (36, 28))

    draw = ImageDraw.Draw(base)

    # 右上リボン
    if ribbon:
        _draw_ribbon(base, ribbon, _font(_GOTHIC_PATH, 40))

    # 巨大縦書きの料理名（右側）。文字数で自動縮小。
    title = (title or "").strip()
    n = max(1, len(title))
    vsize = 150 if n <= 5 else (128 if n <= 7 else (108 if n <= 9 else 92))
    vfont = _font(_SERIF_PATH, vsize)
    _draw_vertical(base, title, right_x=W - 60, top_y=250, font=vfont)

    # 下部：赤下線＋サブコピー
    if subcopy:
        sfont = _font(_GOTHIC_PATH, 40)
        sy = H - 96
        draw.line([(60, sy - 18), (60 + 210, sy - 18)], fill=RED, width=7)
        _text_shadow(draw, (60, sy), subcopy, sfont, fill=(255, 255, 255))

    base.convert("RGB").save(out, quality=90)
    return out


# ─────────────────────────────────────────────────────────────────────────────
# 短冊（メイン）スタイル：見本 pattern_tanzaku.jpg のデザイン言語を踏襲。
#   右に赤の縦リボン短冊「福岡天神店」＋左下に極太の見出し＋赤下線＋料理名サブ。
#   使い方: render_tanzaku("in.jpg", "out.jpg", "厚揚げわさび", headline="旨い、安い")
# ─────────────────────────────────────────────────────────────────────────────
def _text_heavy(draw, xy, text, font, fill=(255, 255, 255), edge=(18, 10, 6),
                weight=7, ow=3, anchor=None):
    """見本 pattern_tanzaku 相当の極太ゴシック見出し：Noto Sans Bold をストロークで太らせ、
    さらに細い暗色のフチで写真に載せても抜けて見えるようにする。"""
    draw.text(xy, text, font=font, fill=edge, anchor=anchor,
              stroke_width=weight + ow, stroke_fill=edge)
    draw.text(xy, text, font=font, fill=fill, anchor=anchor,
              stroke_width=weight, stroke_fill=fill)


def _vertical_ribbon(text, font, pad_x=20, pad_y=26, line_gap_ratio=0.12):
    """赤の縦リボン短冊（白文字・縦積み）をRGBAで返す。pattern_tanzaku の右上の短冊。"""
    size = font.size
    line_gap = int(size * (1 + line_gap_ratio))
    w = size + pad_x * 2
    h = line_gap * len(text) + pad_y * 2 - (line_gap - size)
    rib = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(rib)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=10, fill=RED + (255,))
    y = pad_y
    for ch in text:
        b = font.getbbox(ch)
        cw = b[2] - b[0]
        d.text((pad_x + (size - cw) / 2 - b[0], y - b[1]), ch, font=font, fill=(255, 255, 255, 255))
        y += line_gap
    return rib


def render_tanzaku(src, out, title, headline=None, ribbon="福岡天神店", logo=True):
    """見本 pattern_tanzaku.jpg の体裁で焼き込む。headline=極太見出し／title=赤下線下の料理名。"""
    base = _cover(Image.open(src), W, H)
    base = _scrim(base).convert("RGBA")

    # ロゴ（白・左上）※見本 pattern_tanzaku 相当の大きさ
    if logo and os.path.exists(LOGO_WHITE):
        lg = Image.open(LOGO_WHITE).convert("RGBA")
        lw = 388
        lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
        base.alpha_composite(lg, (40, 34))

    # 右上：赤の縦リボン短冊（福岡天神店）
    if ribbon:
        rib = _vertical_ribbon(ribbon, _font(_GOTHIC_PATH, 50))
        rib = rib.rotate(-5, expand=True, resample=Image.BICUBIC)
        base.alpha_composite(rib, (W - rib.width - 66, 96))

    draw = ImageDraw.Draw(base)
    margin = 56

    # 料理名（赤下線の下・明朝）
    title = (title or "").strip()
    sfont = _font(_SERIF_PATH, 52)
    sb = draw.textbbox((0, 0), title, font=sfont)
    sh = sb[3] - sb[1]
    sub_y = H - 78 - sh
    # 赤下線
    ul_y = sub_y - 26

    # 見出し（複数行対応・ゴシック）※見本 pattern_tanzaku 相当：クリーンな白＋細い暗フチ
    headline = (headline or "").strip()
    hlines = headline.split("\n") if headline else []
    hsize = 108
    hfont = _font(_GOTHIC_PATH, hsize)
    lh = int(hsize * 1.28)
    block_h = lh * max(1, len(hlines))
    hy = ul_y - 34 - block_h
    for i, ln in enumerate(hlines):
        _text_heavy(draw, (margin, hy + i * lh - hfont.getbbox(ln)[1] + 8),
                    ln, hfont, fill=(255, 255, 255), edge=(20, 12, 8), weight=2, ow=3)
    # 赤下線バー
    ul_w = 500
    draw.rectangle([margin, ul_y, margin + ul_w, ul_y + 11], fill=RED)
    # 料理名を下線の下に
    _text_shadow(draw, (margin, sub_y - sb[1]), title, sfont, fill=(255, 255, 255))

    base.convert("RGB").save(out, quality=90)
    return out


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "tanzaku":
        render_tanzaku(sys.argv[2], sys.argv[3], sys.argv[4],
                       headline=(sys.argv[5] if len(sys.argv) > 5 else None))
        print("tanzaku ->", sys.argv[3])
    else:
        render_post(sys.argv[1], sys.argv[2], sys.argv[3],
                    subcopy=(sys.argv[4] if len(sys.argv) > 4 else None))
        print("designed ->", sys.argv[2])
