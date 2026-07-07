# -*- coding: utf-8 -*-
import io

PLAN = {
    "fetch_simple.py": [
        ("pick = random.choice(pool)", "before", "import usage\npool = usage.prefer(pool, creds_path) or pool\n"),
        ("pick = random.choice(pool)", "after",  "\nusage.record(creds_path, [pick], \"simple\")"),
    ],
    "fetch_photostory.py": [
        ("pick = random.choice(pool)", "before", "import usage\npool = usage.prefer(pool, creds_path) or pool\n"),
        ("pick = random.choice(pool)", "after",  "\nusage.record(creds_path, [pick], \"photo\")"),
    ],
    "fetch_drive_photos.py": [
        ("by_cat = defaultdict(list)", "before", "import usage\nallimg = usage.prefer(allimg, creds_path) or allimg\n"),
        ("os.makedirs(OUT, exist_ok=True)", "before", "usage.record(creds_path, picked, \"sushi\")\n"),
    ],
    "fetch_tempo.py": [
        ("names = list(cats.keys())", "before", "import usage\ncats = usage.prefer_cats(cats, creds_path) or cats\n"),
        ("os.makedirs(OUT_DIR, exist_ok=True)", "before", "usage.record(creds_path, picked, \"tempo\")\n"),
    ],
    "fetch_typo.py": [
        ("names = list(cats.keys())", "before", "import usage\ncats = usage.prefer_cats(cats, creds_path) or cats\n"),
        ("os.makedirs(OUT_DIR, exist_ok=True)", "before", "usage.record(creds_path, picked, \"typo\")\n"),
    ],
}

ok_all = True
for fn, edits in PLAN.items():
    try:
        s = io.open(fn, encoding="utf-8-sig").read()
    except FileNotFoundError:
        print("SKIP (no file):", fn); ok_all = False; continue
    if "import usage" in s:
        print("ALREADY PATCHED:", fn); continue
    fail = False
    for anchor, pos, text in edits:
        if s.count(anchor) != 1:
            print("ANCHOR NG (%dx) in %s: %s" % (s.count(anchor), fn, anchor)); fail = True; break
        s = s.replace(anchor, (text + anchor) if pos == "before" else (anchor + text), 1)
    if fail:
        ok_all = False; continue
    io.open(fn, "w", encoding="utf-8-sig").write(s)
    print("PATCHED:", fn)

print("=== ALL OK ===" if ok_all else "=== SOME FAILED ===")
