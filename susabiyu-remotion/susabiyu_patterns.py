# -*- coding: utf-8 -*-
"""すさび湯三条：フィード静止画“投稿用パターン”を増やすためのレンダラー集（実写真に焼き込み・1080x1350）。
既存の「短冊(feed1)」に加え、大衆トーンで見た目の違うパターンを用意する。
  render_konnoren / render_chochin / render_shinbun / render_kifuda
共通: 実際の料理写真を4:5で覆い、白ロゴ＋料理名＋朱/金/紺の大衆装飾。
"""
import os, math
from PIL import Image, ImageDraw, ImageFilter
from gifuya_design import _cover, _font, _GOTHIC_PATH, _SERIF_PATH, _text_shadow, _text_heavy

W, H = 1080, 1350
HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(HERE, "assets_susabiyu_logo_white.png")
SHU = (196, 40, 38); SHU_D = (150, 26, 24); KIN = (224, 181, 110)
NAVY = (24, 40, 74); KAMI = (240, 226, 178); INK = (28, 22, 18); YEL = (247, 200, 40)


def _logo(base, x=40, y=40, w=290, dark=False):
    if not os.path.exists(LOGO): return
    lg = Image.open(LOGO).convert("RGBA")
    lg = lg.resize((w, int(lg.height * w / lg.width)), Image.LANCZOS)
    if dark:  # 白ロゴを暗色化（明るい帯の上用）
        px = lg.load()
        for j in range(lg.height):
            for i in range(lg.width):
                r, g, b, a = px[i, j]
                if a: px[i, j] = (NAVY[0], NAVY[1], NAVY[2], a)
    base.alpha_composite(lg, (x, y))


def _name_band(base, name, y, rot=-1):
    d = ImageDraw.Draw(base)
    f = _font(_GOTHIC_PATH, 56)
    tw = d.textlength(name, font=f)
    pad = 40; bw = int(tw + pad * 2); bh = 92
    tile = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    td = ImageDraw.Draw(tile)
    td.rounded_rectangle([0, 0, bw - 1, bh - 1], radius=12, fill=SHU + (255,), outline=KIN + (255,), width=4)
    td.text((pad, bh / 2 - 30), name, font=f, fill=(255, 247, 232, 255))
    tile = tile.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(tile, (int(W / 2 - tile.width / 2), y))


def _scrim(base, top=300, bot=480, tstr=96, bstr=150):
    ov = Image.new("L", (W, H), 0); d = ImageDraw.Draw(ov)
    for yy in range(0, top): d.line([(0, yy), (W, yy)], fill=int(tstr * (1 - yy / top)))
    for yy in range(H - bot, H):
        t = (yy - (H - bot)) / bot; d.line([(0, yy), (W, yy)], fill=int(bstr * (t ** 1.3)))
    ov = ov.filter(ImageFilter.GaussianBlur(16))
    return Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), base, ov).convert("RGBA")


# ── ① 紺のれん（公式・クリーン）：上に紺帯＋白ロゴ、下に品名の細帯 ──
def render_konnoren(src, out, name, quality=92):
    base = _cover(src if isinstance(src, Image.Image) else Image.open(src), W, H).convert("RGBA")
    d = ImageDraw.Draw(base)
    d.rectangle([0, 0, W, 172], fill=NAVY + (255,))
    for i in range(0, W, 60):  # のれんの裾（波）
        d.pieslice([i, 150, i + 60, 200], 0, 180, fill=NAVY + (255,))
    _logo(base, 44, 40, 300)
    f2 = _font(_GOTHIC_PATH, 30)
    d.text((W - 320, 66), "@susabiyu_sanjyo", font=f2, fill=(220, 228, 244))
    # 下：半透明の暗帯に品名
    bar = Image.new("RGBA", (W, 150), (0, 0, 0, 0)); bd = ImageDraw.Draw(bar)
    bd.rectangle([0, 0, W, 150], fill=(12, 20, 38, 205))
    base.alpha_composite(bar, (0, H - 150))
    fn = _font(_GOTHIC_PATH, 60); d = ImageDraw.Draw(base)
    d.line([(60, H - 118), (60, H - 42)], fill=KIN, width=8)
    d.text((84, H - 120), name, font=fn, fill=(255, 255, 255))
    d.text((84, H - 46), "大衆寿司酒場すさび湯 ・ 河原町三条", font=_font(_GOTHIC_PATH, 26), fill=(190, 202, 224))
    base.convert("RGB").save(out, quality=quality, subsampling=0); return out


# ── ② 提灯（お祭り・にぎやか）：上に赤提灯4つ＋品名帯 ──
def render_chochin(src, out, name, quality=92):
    base = _scrim(_cover(src if isinstance(src, Image.Image) else Image.open(src), W, H).convert("RGBA"), top=360, tstr=120)
    d = ImageDraw.Draw(base)
    chars = ["寿", "司", "酒", "場"]; cw = 150; gap = 40
    total = len(chars) * cw + (len(chars) - 1) * gap; x0 = (W - total) // 2
    f = _font(_GOTHIC_PATH, 74)
    for i, ch in enumerate(chars):
        cx = x0 + i * (cw + gap); cy = 70
        d.line([(cx + cw / 2, 0), (cx + cw / 2, cy)], fill=KIN, width=4)
        d.ellipse([cx, cy, cx + cw, cy + 170], fill=SHU + (255,), outline=KIN + (255,), width=5)
        for ry in range(cy + 16, cy + 170, 22):  # 提灯の骨
            d.line([(cx + 8, ry), (cx + cw - 8, ry)], fill=(150, 26, 24, 140), width=2)
        d.rectangle([cx + cw / 2 - 20, cy - 10, cx + cw / 2 + 20, cy + 6], fill=(70, 50, 20))
        d.rectangle([cx + cw / 2 - 20, cy + 164, cx + cw / 2 + 20, cy + 180], fill=(70, 50, 20))
        b = f.getbbox(ch); d.text((cx + cw / 2 - (b[2] - b[0]) / 2 - b[0], cy + 85 - (b[3] - b[1]) / 2 - b[1]), ch, font=f, fill=(255, 247, 232))
    _logo(base, 44, 280, 260)
    _name_band(base, name, H - 210, rot=-2)
    d = ImageDraw.Draw(base)
    d.text((60, H - 92), "ドリンク全品170円  ・  河原町三条", font=_font(_GOTHIC_PATH, 30), fill=(240, 232, 210))
    base.convert("RGB").save(out, quality=quality, subsampling=0); return out


# ── ③ うまいもん速報（新聞・レトロ刷り）：生成り紙に写真を白フチで貼る ──
def render_shinbun(src, out, name, quality=92):
    base = Image.new("RGBA", (W, H), KAMI + (255,))
    d = ImageDraw.Draw(base)
    # 上部・黒の速報帯
    d.rectangle([0, 0, W, 150], fill=INK + (255,))
    d.text((44, 44), "うまいもん速報", font=_font(_GOTHIC_PATH, 66), fill=(245, 235, 205))
    d.text((W - 250, 60), "すさび湯 三条", font=_font(_GOTHIC_PATH, 30), fill=(220, 210, 180))
    # 写真を白フチ額で中央に
    ph = _cover(src if isinstance(src, Image.Image) else Image.open(src), 860, 900)
    fr = Image.new("RGB", (900, 940), (255, 255, 255)); fr.paste(ph, (20, 20))
    frr = Image.new("RGBA", (900, 940), (0, 0, 0, 0)); frr.paste(fr, (0, 0))
    sh = Image.new("RGBA", (900, 940), (0, 0, 0, 60)); base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(12)), (96, 214))
    base.alpha_composite(frr, (90, 205))
    # 朱丸スタンプ「旨」
    st = Image.new("RGBA", (200, 200), (0, 0, 0, 0)); sd = ImageDraw.Draw(st)
    sd.ellipse([8, 8, 192, 192], outline=SHU + (255,), width=10)
    sf = _font(_SERIF_PATH, 120); b = sf.getbbox("旨"); sd.text((100 - (b[2] - b[0]) / 2 - b[0], 100 - (b[3] - b[1]) / 2 - b[1]), "旨", font=sf, fill=SHU + (255,))
    st = st.rotate(-12, expand=True, resample=Image.BICUBIC); base.alpha_composite(st, (W - 220, 176))
    # 下・赤の品名帯
    _name_band(base, name, H - 190, rot=-1)
    d = ImageDraw.Draw(base)
    d.text((W / 2, H - 84), "ドリンク全品170円 ／ 河原町三条", font=_font(_GOTHIC_PATH, 30), fill=(90, 70, 40), anchor="ma")
    base.convert("RGB").save(out, quality=quality, subsampling=0); return out


# ── ④ 黄ポップ値札（激安・大衆）：黄の爆発バッジ＋極太コピー ──
def render_kifuda(src, out, name, headline="旨い、安い、\n賑やかに。", quality=92):
    base = _scrim(_cover(src if isinstance(src, Image.Image) else Image.open(src), W, H).convert("RGBA"), bot=560, bstr=170)
    # 右上：黄の爆発バッジ「170円!!」
    badge = Image.new("RGBA", (360, 360), (0, 0, 0, 0)); bd = ImageDraw.Draw(badge)
    pts = []; N = 16
    for i in range(N * 2):
        r = 175 if i % 2 == 0 else 130; a = i / (N * 2) * 2 * math.pi - math.pi / 2
        pts.append((180 + math.cos(a) * r, 180 + math.sin(a) * r))
    bd.polygon(pts, fill=YEL + (255,), outline=SHU + (255,))
    bd.text((180, 120), "ドリンク全品", font=_font(_GOTHIC_PATH, 34), fill=INK + (255,), anchor="mm")
    bd.text((180, 185), "170", font=_font(_GOTHIC_PATH, 118), fill=SHU + (255,), anchor="mm")
    bd.text((180, 258), "円!!", font=_font(_GOTHIC_PATH, 48), fill=INK + (255,), anchor="mm")
    badge = badge.rotate(-10, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(badge, (W - badge.width + 30, 20))
    _logo(base, 44, 44, 270)
    d = ImageDraw.Draw(base)
    # 極太コピー（黄フチ）＋品名
    margin = 60; hf = _font(_GOTHIC_PATH, 118); lines = headline.split("\n")
    hy = H - 300 - len(lines) * int(118 * 1.15)
    for i, ln in enumerate(lines):
        y = hy + i * int(118 * 1.15)
        d.text((margin, y), ln, font=hf, fill=YEL, stroke_width=10, stroke_fill=INK)
        d.text((margin, y), ln, font=hf, fill=(255, 255, 255), stroke_width=3, stroke_fill=YEL)
    _name_band(base, name, H - 180, rot=-2)
    base.convert("RGB").save(out, quality=quality, subsampling=0); return out


if __name__ == "__main__":
    import glob
    os.makedirs("out", exist_ok=True)
    pool = sorted(glob.glob("review_photos/food_*.jpg"))
    def pick(k):
        for p in pool:
            if k in p: return p
        return pool[0]
    render_konnoren(pick("寿司盛り"), "out/pat_konnoren.jpg", "すさび三昧 寿司盛り")
    render_chochin(pick("まぐろ造り"), "out/pat_chochin.jpg", "まぐろ造り")
    render_shinbun(pick("えび天"), "out/pat_shinbun.jpg", "海老の天ぷら")
    render_kifuda(pick("いくら軍艦"), "out/pat_kifuda.jpg", "いくら軍艦")
    print("wrote out/pat_*.jpg")
