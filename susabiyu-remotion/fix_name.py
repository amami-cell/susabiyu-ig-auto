import os

OLD = "すさび湿"
NEW = "すさび湯"
exts = (".tsx", ".ts", ".jsx", ".js", ".json", ".md", ".txt", ".html", ".css")
changed = []
for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "out", "dist", "build")]
    for fn in files:
        if not fn.endswith(exts):
            continue
        p = os.path.join(root, fn)
        try:
            txt = open(p, encoding="utf-8").read()
        except Exception:
            continue
        if OLD in txt:
            open(p, "w", encoding="utf-8").write(txt.replace(OLD, NEW))
            changed.append(p)

if changed:
    for c in changed:
        print("修正:", c)
else:
    print("『すさび湿』は見つかりませんでした。別の表記かもしれません。")
