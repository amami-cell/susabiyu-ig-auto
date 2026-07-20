# -*- coding: utf-8 -*-
"""すさび湯 烏丸店 デザインテンプレ生成（A/B/C）。上品・エディトリアル路線。
必要: Pillow, IPA明朝(/usr/share/fonts/opentype/ipafont-mincho/ipam.ttf), IPAゴシック。
写真は susabiyu-remotion/review_photos（または各料理写真）を差し替えて使う。
使い方: python generate.py <料理写真.jpg> [A|B|C]
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

MIN = "/usr/share/fonts/opentype/ipafont-mincho/ipam.ttf"
GOT = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"
W, H = 1080, 1350


def food_base(path, ph=1000, grade=(1.18, 1.12, 0.98), fade=0.34):
    c = Image.new("RGB", (W, H), (8, 8, 10))
    src = Image.open(path).convert("RGB")
    r = max(W / src.width, ph / src.height)
    n = src.resize((int(src.width * r), int(src.height * r)))
    n = n.crop(((n.width - W) // 2, (n.height - ph) // 2, (n.width - W) // 2 + W, (n.height - ph) // 2 + ph))
    n = ImageEnhance.Contrast(n).enhance(grade[0]); n = ImageEnhance.Color(n).enhance(grade[1]); n = ImageEnhance.Brightness(n).enhance(grade[2])
    n = Image.blend(n, Image.new("RGB", (W, ph), (255, 150, 60)), 0.06)
    c.paste(n, (0, H - ph))
    g = Image.new("L", (1, ph), 0)
    for y in range(ph):
        g.putpixel((0, y), int(255 * min(1, max(0, (y / ph) / fade))))
    g = g.resize((W, ph))
    reg = c.crop((0, H - ph, W, H))
    reg = Image.composite(reg, Image.new("RGB", (W, ph), (8, 8, 10)), g)
    c.paste(reg, (0, H - ph))
    return c


def vt(d, cx, top, text, size, fill, fp=MIN, cgap=6):
    f = ImageFont.truetype(fp, size); y = top
    for ch in text:
        bb = d.textbbox((0, 0), ch, font=f); w = bb[2] - bb[0]
        d.text((cx - w / 2 - bb[0], y), ch, font=f, fill=fill); y += size + cgap
    return y


def pattern_A(path, title="まぐろ三昧", c1="本気の握り、", c2="大衆価格で。", romaji="MAGURO ZANMAI"):
    c = food_base(path, 1000, (1.18, 1.12, 0.98), 0.34); d = ImageDraw.Draw(c)
    d.text((60, 64), "大衆すし酒場  すさび湯 烏丸", font=ImageFont.truetype(MIN, 34), fill=(235, 232, 225))
    d.line([(60, 116), (560, 116)], fill=(150, 145, 135), width=2)
    d.text((905, 58), "July", font=ImageFont.truetype(GOT, 26), fill=(200, 196, 190))
    d.text((905, 92), "21", font=ImageFont.truetype(GOT, 44), fill=(240, 236, 230))
    d.line([(900, 150), (1020, 150)], fill=(150, 145, 135), width=2)
    d.text((905, 158), "Kyoto", font=ImageFont.truetype(GOT, 26), fill=(200, 196, 190))
    vt(d, 915, 235, title, 150, (245, 242, 236))
    vt(d, 720, 300, c1, 60, (235, 232, 225)); vt(d, 640, 300, c2, 60, (235, 232, 225))
    d.text((820, 1120), romaji, font=ImageFont.truetype(GOT, 24), fill=(210, 206, 200))
    d.rectangle([60, 1120, 290, 1270], outline=(220, 190, 120), width=3)
    d.text((84, 1142), "ドリンク全品", font=ImageFont.truetype(MIN, 34), fill=(235, 232, 225))
    d.text((100, 1192), "170円", font=ImageFont.truetype(MIN, 64), fill=(240, 205, 120))
    return c


def pattern_B(path, title="炙り肉寿司", c1="とろける贅を、", c2="一貫に込めて。", badge="数量限定", romaji="NIKU SUSHI"):
    c = food_base(path, 1010, (1.22, 1.1, 0.95), 0.4); d = ImageDraw.Draw(c)
    vt(d, 905, 150, title, 150, (246, 242, 235))
    vt(d, 735, 205, c1, 66, (236, 232, 225)); vt(d, 650, 205, c2, 66, (236, 232, 225))
    d.rectangle([56, 150, 150, 470], outline=(220, 190, 120), width=3); vt(d, 103, 178, badge, 60, (240, 205, 120))
    d.text((60, 60), "大衆すし酒場  すさび湯 烏丸", font=ImageFont.truetype(MIN, 32), fill=(232, 228, 222))
    d.line([(60, 110), (540, 110)], fill=(150, 145, 135), width=2)
    d.text((900, 1180), romaji, font=ImageFont.truetype(GOT, 24), fill=(210, 206, 200))
    return c


def pattern_C(path, brand="すさび湯", title="極上十貫", romaji="JOU-NIGIRI  MATSU"):
    c = food_base(path, 880, (1.12, 1.1, 1.0), 0.3); d = ImageDraw.Draw(c)
    d.rectangle([40, 40, W - 40, H - 40], outline=(120, 112, 98), width=2)
    d.text((80, 110), brand, font=ImageFont.truetype(MIN, 120), fill=(244, 240, 233))
    d.text((88, 250), "大衆すし酒場  烏丸", font=ImageFont.truetype(MIN, 34), fill=(210, 205, 196))
    d.line([(88, 320), (520, 320)], fill=(150, 145, 135), width=2)
    d.text((880, 120), "[", font=ImageFont.truetype(GOT, 60), fill=(200, 196, 190))
    d.text((915, 118), "July", font=ImageFont.truetype(GOT, 28), fill=(210, 206, 200))
    d.text((915, 152), "21", font=ImageFont.truetype(GOT, 40), fill=(240, 236, 230))
    d.text((990, 120), "]", font=ImageFont.truetype(GOT, 60), fill=(200, 196, 190))
    vt(d, 940, 420, title, 96, (244, 240, 233))
    d.text((150, 1150), romaji, font=ImageFont.truetype(GOT, 24), fill=(200, 196, 190))
    return c


if __name__ == "__main__":
    photo = sys.argv[1] if len(sys.argv) > 1 else "review_photos/food_寿司盛り合わせ__寿司盛りまぐろ三昧.jpg"
    pat = (sys.argv[2] if len(sys.argv) > 2 else "A").upper()
    out = {"A": pattern_A, "B": pattern_B, "C": pattern_C}[pat](photo)
    out.save("karasuma_%s.jpg" % pat, quality=92); print("saved karasuma_%s.jpg" % pat)
