import os

ss = os.path.join("src", "SimpleStory.tsx")
if not os.path.exists(ss):
    print("NG: SimpleStory.tsx が見つかりません")
    raise SystemExit

t = open(ss, encoding="utf-8").read()
orig = t

# ロゴ: 高さ96->140, maxWidth 360->440
t = t.replace(
    'style={{ height: 96, width: "auto", maxWidth: 360, objectFit: "contain" }}',
    'style={{ height: 140, width: "auto", maxWidth: 440, objectFit: "contain" }}',
)
# 屋号: 32->40, letterSpacing 8->10
t = t.replace("fontSize: 32, letterSpacing: 8", "fontSize: 40, letterSpacing: 10")
# ロゴ-屋号の間隔: 10->16
t = t.replace("gap: 10,", "gap: 16,")
# 上の余白を少し詰めてバランス: top 250 -> 230
t = t.replace("top: 250,", "top: 230,")

if t == orig:
    print("変化なし（既に適用済みか、対象文字列が違います）")
else:
    open(ss, "w", encoding="utf-8").write(t)
    print("OK: ロゴと屋号を大きくしました（ロゴ高さ140 / 屋号40）")
