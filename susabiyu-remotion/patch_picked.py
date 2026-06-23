# -*- coding: utf-8 -*-
import io

W = ('import json as _pj, os as _po\n'
     '_po.makedirs("out", exist_ok=True)\n'
     '_pj.dump(%s, open(_po.path.join("out", "picked.json"), "w", encoding="utf-8"), ensure_ascii=False)\n'
     'print("PICKED ->", "out/picked.json")\n')

JOBS = {
  "fetch_photostory.py": ('print("PHRASE:", phrase)',
                          '{"ids": [pick["id"]], "caption": phrase, "music": ""}'),
  "fetch_simple.py":     ('print("PHRASE:", phrase)',
                          '{"ids": [pick["id"]], "caption": phrase, "music": ""}'),
  "fetch_drive_photos.py":('usage.record(creds_path, picked, "sushi")',
                          '{"ids": [f["id"] for f in picked], "caption": "", "music": ""}'),
  "fetch_tempo.py":      ('lines = ["export const tempoPhotos = ["]',
                          '{"ids": [f["id"] for f in picked], "caption": "", "music": music}'),
  "fetch_typo.py":       ('lines = ["export const typoPhotos = ["]',
                          '{"ids": [f["id"] for f in picked], "caption": headline, "music": music}'),
}

for fn, (anchor, payload) in JOBS.items():
    try:
        s = io.open(fn, encoding="utf-8-sig").read()
    except FileNotFoundError:
        print("SKIP(no file):", fn); continue
    if "out/picked.json" in s or 'out", "picked.json' in s:
        print("ALREADY:", fn); continue
    if s.count(anchor) != 1:
        print("ANCHOR NG (%dx):" % s.count(anchor), fn); continue
    block = W % payload
    if anchor.startswith("lines ="):
        s = s.replace(anchor, block + anchor, 1)
    else:
        s = s.replace(anchor, anchor + "\n" + block, 1)
    io.open(fn, "w", encoding="utf-8-sig").write(s)
    print("PATCHED:", fn)
