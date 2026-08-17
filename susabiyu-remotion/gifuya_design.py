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
try:
    import numpy as _np
except Exception:                       # numpy が無い環境では照明補正をスキップ
    _np = None

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


def _even_lighting(im):
    """写真の『左右（横方向）』の明るさムラだけを均す。上下は触らない。
    列ごとの平均明るさをなだらかにして、暗い列は持ち上げ・明るい列は少し抑えて左右を統一。
    最後にカード間の明るさを目標平均へ寄せる。numpy が無ければそのまま返す。"""
    if _np is None:
        return im
    im = im.convert("RGB")
    arr = _np.asarray(im).astype(_np.float32)
    W = arr.shape[1]
    col = arr.mean(axis=2).mean(axis=0)                       # 列ごとの明るさ（縦平均）→(W,)
    # 横方向になだらかにぼかす（食材の細かな明暗ではなく、左右のゆるい照明ムラだけ拾う）
    colmap = _np.asarray(
        Image.fromarray(col.reshape(1, W).clip(0, 255).astype("uint8"))
        .filter(ImageFilter.GaussianBlur(max(20, W // 8)))
    ).astype(_np.float32).reshape(W)
    target = float(_np.percentile(colmap, 55))               # 中央寄り＝持ち上げ控えめ（明るくしすぎない）
    gaincol = _np.clip(target / _np.clip(colmap, 1.0, None), 0.88, 1.18)   # 左右を穏やかに均す
    out = _np.clip(arr * gaincol[None, :, None], 0, 255)
    # カード間で明るさを揃える：目標平均を低め(150)に。持ち上げは弱く・下げは効かせる＝全体トーンを落とす。
    cur = float(out.mean())
    if cur > 1:
        out = out * _np.clip(150.0 / cur, 0.80, 1.06)
    # ハイライト・ロールオフ：明るい所だけ圧縮して白飛びを戻す（暗部・中間は不変）。
    knee = 200.0
    hi = out > knee
    out[hi] = knee + (out[hi] - knee) * 0.55
    out = _np.clip(out, 0, 255)
    return Image.fromarray(out.astype("uint8"))


def _cover(im, w, h):
    """アスペクトを保って w×h を覆うようにリサイズ＋センタークロップ→照明ムラ補正。"""
    im = im.convert("RGB")
    iw, ih = im.size
    scale = max(w / iw, h / ih)
    nw, nh = int(iw * scale + 0.5), int(ih * scale + 0.5)
    im = im.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return _even_lighting(im.crop((left, top, left + w, top + h)))


def _scrim(base):
    """テキスト可読性のため、上下と右側を『ごく控えめ』に暗く。
    見出しは _text_heavy / _text_shadow で自前に縁取り＆影を持つので、
    帯は薄めにして写真の明るさをできるだけ均一に保つ（右側が暗く割れないように）。"""
    ov = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(ov)
    # 上グラデ（ロゴ・リボン用）— 薄め
    for y in range(0, 300):
        d.line([(0, y), (W, y)], fill=int(78 * (1 - y / 300)))
    # 下グラデ（見出し・サブコピー用）— 下端だけ薄く
    for y in range(H - 430, H):
        t = (y - (H - 430)) / 430
        d.line([(0, y), (W, y)], fill=int(112 * t))
    # ※右側グラデは廃止（左右の明るさ差の原因になるため）。縦書き文字は自前の影で可読性を確保。
    ov = ov.filter(ImageFilter.GaussianBlur(16))
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


# 縦書きで90°回す文字（長音符・各種ダッシュ・波線）。横棒のまま出ると「ー」が横線に見えて崩れる。
_VERT_ROTATE = set("ー─―–—-‐ｰ~〜～")


def _blit_vert_rot(img, ch, x_cell, y, size, font, fill):
    """横棒系（ー等）を90°回転して、縦書きのマス(x_cell幅=size, y上端)中央に置く。影付き。"""
    cvs = size * 2
    tmp = Image.new("RGBA", (cvs, cvs), (0, 0, 0, 0))
    td = ImageDraw.Draw(tmp)
    bb = td.textbbox((0, 0), ch, font=font)
    cw, chh = bb[2] - bb[0], bb[3] - bb[1]
    ox = cvs / 2 - cw / 2 - bb[0]
    oy = cvs / 2 - chh / 2 - bb[1]
    for dx, dy in ((2, 2), (3, 3)):
        td.text((ox + dx, oy + dy), ch, font=font, fill=(0, 0, 0, 170))
    td.text((ox, oy), ch, font=font, fill=fill)
    tmp = tmp.rotate(90, expand=False, resample=Image.BICUBIC)
    img.alpha_composite(tmp, (int(x_cell + size / 2 - cvs / 2), int(y + size / 2 - cvs / 2)))


def _draw_vertical(img, text, right_x, top_y, font, line_gap=None, col_gap=None,
                   fill=(255, 255, 255)):
    """縦書き（右→左に段を追加）。長音「ー」等は90°回転。段が要る時は均等割り。戻り値=占有幅。"""
    draw = ImageDraw.Draw(img)
    size = font.size
    line_gap = size + (line_gap if line_gap is not None else int(size * 0.10))
    col_gap = col_gap if col_gap is not None else int(size * 0.16)
    # 1段に入る最大文字数（縦の余白から）
    max_per_col = max(1, (H - top_y - 120) // line_gap)
    n = len(text)
    ncols = max(1, -(-n // max_per_col))    # ceil：必要段数
    per_col = max(1, -(-n // ncols))        # ceil：段を均等割り（末尾1文字だけの"変な2段"を防ぐ）
    cols = [text[i:i + per_col] for i in range(0, n, per_col)] or [text]
    x = right_x - size
    used_left = right_x
    for col in cols:
        y = top_y
        for ch in col:
            if ch in _VERT_ROTATE:
                _blit_vert_rot(img, ch, x, y, size, font, fill)
            else:
                cw, chh = _char_size(font, ch)
                cx = x + (size - cw) / 2 - font.getbbox(ch)[0]   # 縦線の中心に寄せる
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

    # 料理名。「ー」等の横棒を含む名前は縦書きだと崩れるので、横書き（下・大ゴシック＋赤下線）にする。
    title = (title or "").strip()
    if any(c in _VERT_ROTATE for c in title):
        margin = 56
        hsize = 120
        hfont = _font(_GOTHIC_PATH, hsize)
        while hsize > 44 and draw.textlength(title, font=hfont) > W - 2 * margin:
            hsize -= 4
            hfont = _font(_GOTHIC_PATH, hsize)
        ty = H - 258
        draw.line([(margin, ty - 22), (margin + 230, ty - 22)], fill=RED, width=9)   # 赤下線
        _text_heavy(draw, (margin, ty - hfont.getbbox(title)[1]),
                    title, hfont, fill=(255, 255, 255), edge=(20, 12, 8), weight=2, ow=3)
    else:
        # 巨大縦書きの料理名（右側）。1段にきれいに収まるよう文字数から自動縮小（上限150・下限64）。
        n = max(1, len(title))
        top_y = 250
        avail = H - top_y - 120                 # 縦に使える高さ
        vsize = max(64, min(150, int(avail / (1.1 * n))))
        vfont = _font(_SERIF_PATH, vsize)
        _draw_vertical(base, title, right_x=W - 60, top_y=top_y, font=vfont)

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

    # ロゴ（白・左上の角へ寄せる）※大きめだが料理の中心には被らない位置
    if logo and os.path.exists(LOGO_WHITE):
        lg = Image.open(LOGO_WHITE).convert("RGBA")
        lw = 360
        lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
        base.alpha_composite(lg, (26, 20))

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


# ─────────────────────────────────────────────────────────────────────────────
# シネマ（レターボックス）スタイル：見本 pattern_cinema.jpg のデザイン言語。
#   上下の黒帯＋中央にロゴ／下に店名。写真は"横長のオリジナル"を切らずに全体を収める。
#   src は 4:5 クロップ済みではなく、横長の元写真を渡すこと（全体が横いっぱいに決まる）。
# ─────────────────────────────────────────────────────────────────────────────
def render_cinema(src, out, en="TAISHO 5  -  FUKUOKA TENJIN",
                  jp="大衆酒場 ぎふや 福岡天神店", logo=True):
    GOLD = (206, 170, 110)
    im = _even_lighting(Image.open(src).convert("RGB"))       # トーン統一＆左右均し
    canvas = Image.new("RGB", (W, H), (8, 8, 8))
    # 写真：横幅いっぱい・アスペクト維持。上下に帯（各≒最低260px）を確保。
    ratio = im.width / max(1, im.height)
    pw, ph = W, int(W / ratio)
    max_ph = H - 560
    if ph > max_ph:
        ph = max_ph
        pw = int(ph * ratio)
    photo = im.resize((max(1, pw), max(1, ph)), Image.LANCZOS)
    px, py = (W - pw) // 2, (H - ph) // 2
    canvas.paste(photo, (px, py))
    d = ImageDraw.Draw(canvas)
    if logo and os.path.exists(LOGO_WHITE):
        lg = Image.open(LOGO_WHITE).convert("RGBA")
        lw = 300
        lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
        canvas.paste(lg, ((W - lw) // 2, max(24, (py - lg.height) // 2)), lg)
    ef, jf = _font(_GOTHIC_PATH, 34), _font(_SERIF_PATH, 60)
    by = py + ph
    ew = d.textlength(en, font=ef)
    d.text(((W - ew) // 2, by + 62), en, font=ef, fill=GOLD)
    jw = d.textlength(jp, font=jf)
    d.text(((W - jw) // 2, by + 112), jp, font=jf, fill=(240, 240, 240))
    canvas.save(out, quality=90)
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
