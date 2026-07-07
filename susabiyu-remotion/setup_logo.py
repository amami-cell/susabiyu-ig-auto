import os, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join("..", "logo.jpg")
DEST = os.path.join("public", "logo.png")

try:
    from PIL import Image
except ImportError:
    print("NG: Pillow未インストール。 pip install pillow")
    raise SystemExit

if not os.path.exists(SRC):
    print("NG: ロゴが見つかりません:", os.path.abspath(SRC))
    raise SystemExit

img = Image.open(SRC).convert("RGBA")
px = img.load()
W, H = img.size

# 白背景を透過に（しきい値＋フェザー）。残った部分の平均輝度も測る
lum_sum = 0
lum_cnt = 0
HI, LO = 240, 205
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        mn = min(r, g, b)
        if mn >= HI:
            px[x, y] = (r, g, b, 0)
        else:
            if mn > LO:
                na = int(255 * (HI - mn) / (HI - LO))
            else:
                na = 255
            px[x, y] = (r, g, b, na)
            if na > 60:
                lum_sum += (r * 299 + g * 587 + b * 114) // 1000
                lum_cnt += 1

avg_lum = (lum_sum / lum_cnt) if lum_cnt else 255
print("残ロゴ平均輝度:", round(avg_lum, 1))

# 暗いロゴは暗い背景で見えないので、暖かいクリーム色に整える
recolored = False
if avg_lum < 130:
    CR, CG, CB = 0xF2, 0xE7, 0xD6  # warm cream
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a > 0:
                px[x, y] = (CR, CG, CB, a)
    recolored = True
    print("→ 暗いロゴのためクリーム色に整えました")
else:
    print("→ 元の色を維持")

# 余白トリム
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

os.makedirs("public", exist_ok=True)
img.save(DEST)
print("保存:", os.path.abspath(DEST), "サイズ", img.size)

# simpleData.ts / photoData.ts の hasLogo を true に（再フェッチ無しで反映）
for path, pat, rep in [
    (os.path.join("src", "simpleData.ts"), r"simpleHasLogo\s*=\s*(?:true|false)", "simpleHasLogo = true"),
    (os.path.join("src", "photoData.ts"), r"hasLogo\s*:\s*boolean\s*=\s*(?:true|false)", "hasLogo: boolean = true"),
]:
    if os.path.exists(path):
        t = open(path, encoding="utf-8").read()
        t2 = re.sub(pat, rep, t)
        open(path, "w", encoding="utf-8").write(t2)
        print("更新:", path)
print("完了。 npx remotion still SimpleStory out/simple.png で確認できます。")

# SimpleStory のロゴ表示を高さ基準・少し大きめに（横長ロゴ対応）
ss = os.path.join("src", "SimpleStory.tsx")
if os.path.exists(ss):
    t = open(ss, encoding="utf-8").read()
    t2 = t.replace(
        'style={{ width: 70, height: "auto", objectFit: "contain" }}',
        'style={{ height: 96, width: "auto", maxWidth: 360, objectFit: "contain" }}',
    )
    if t2 != t:
        open(ss, "w", encoding="utf-8").write(t2)
        print("更新: SimpleStory ロゴ表示サイズ")
