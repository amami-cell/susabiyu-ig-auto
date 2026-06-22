import glob, re

files = glob.glob("src/**/*.tsx", recursive=True) + glob.glob("src/**/*.ts", recursive=True)
target = None
for f in files:
    txt = open(f, encoding="utf-8").read()
    if "photoUrl" in txt and "telop" in txt and "AbsoluteFill" in txt:
        target = f
        break

if not target:
    print("NG: 対象コンポジションが見つかりません。srcの中身を貼ってください。")
    raise SystemExit

src = open(target, encoding="utf-8").read()
orig = src

# 1) remotion から Audio, staticFile を import
m = re.search(r'import\s*\{([^}]*)\}\s*from\s*[\'"]remotion[\'"]', src)
if m:
    names = [n.strip() for n in m.group(1).split(",") if n.strip()]
    for need in ("Audio", "staticFile"):
        if need not in names:
            names.append(need)
    new_import = "import { " + ", ".join(names) + ' } from "remotion"'
    src = src[:m.start()] + new_import + src[m.end():]
else:
    src = 'import { Audio, staticFile } from "remotion";\n' + src

# 2) 最初の <AbsoluteFill ...> の直後に <Audio> を挿入
if "<Audio" not in src:
    am = re.search(r'<AbsoluteFill[^>]*>', src)
    if am:
        insert = '\n      <Audio src={staticFile("bgm.mp3")} volume={0.5} />'
        src = src[:am.end()] + insert + src[am.end():]

if src != orig:
    open(target, "w", encoding="utf-8").write(src)
    print("OK:", target, "に BGM を追加しました。")
else:
    print("変更なし（既に追加済みの可能性）:", target)
