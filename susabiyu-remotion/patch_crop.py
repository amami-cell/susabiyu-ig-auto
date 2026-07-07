# -*- coding: utf-8 -*-
import io, os

def patch_sushi(s):
    lines = s.split("\n"); out = []; changed = False
    for l in lines:
        if "translateX(${drift}px) scale(${scale})" in l:
            changed = True
            for j in range(len(out) - 1, max(-1, len(out) - 5), -1):
                if "objectFit: \"cover\"" in out[j]:
                    out[j] = out[j].replace("\"cover\"", "\"contain\""); break
            continue
        out.append(l)
    return "\n".join(out), changed

def patch_simple(s):
    a = "objectFit: \"cover\" }} />"; b = "objectFit: \"contain\" }} />"
    if a in s:
        return s.replace(a, b, 1), True
    return s, False

for fn, fixer in ((os.path.join("src", "SushiStory.tsx"), patch_sushi),
                  (os.path.join("src", "SimpleStory.tsx"), patch_simple)):
    if not os.path.exists(fn):
        print("SKIP (no file):", fn); continue
    s = io.open(fn, encoding="utf-8-sig").read()
    ns, changed = fixer(s)
    if changed:
        io.open(fn, "w", encoding="utf-8-sig").write(ns)
        print("PATCHED:", fn)
    else:
        print("NO CHANGE:", fn)
