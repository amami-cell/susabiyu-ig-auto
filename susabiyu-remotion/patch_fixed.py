# -*- coding: utf-8 -*-
import io

GET1 = ('drive.files().get(fileId=_fx[0], fields="id,name,mimeType,imageMediaMetadata(width,height)", '
        'supportsAllDrives=True).execute()')
GETL = ('[drive.files().get(fileId=_i, fields="id,name,mimeType,imageMediaMetadata(width,height),createdTime", '
        'supportsAllDrives=True).execute() for _i in _fx]')

SINGLE_PICK = (
'_fx = [x for x in os.environ.get("FIXED_IDS", "").split(",") if x]\n'
'if _fx:\n'
'    pick = ' + GET1 + '\n'
'else:\n'
'    pick = random.choice(pool)')

MULTI_FIX = (
'_fx = [x for x in os.environ.get("FIXED_IDS", "").split(",") if x]\n'
'if _fx:\n'
'    picked = ' + GETL + '\n')

JOBS = {
 "fetch_photostory.py": [
    ("pick = random.choice(pool)", "replace", SINGLE_PICK),
    ("phrase = random.choice(phrases)", "replace", 'phrase = os.environ.get("FIXED_CAPTION") or random.choice(phrases)'),
 ],
 "fetch_simple.py": [
    ("pick = random.choice(pool)", "replace", SINGLE_PICK),
    ("phrase = random.choice(phrases)", "replace", 'phrase = os.environ.get("FIXED_CAPTION") or random.choice(phrases)'),
 ],
 "fetch_drive_photos.py": [
    ('usage.record(creds_path, picked, "sushi")', "before", MULTI_FIX),
 ],
 "fetch_tempo.py": [
    ('usage.record(creds_path, picked, "tempo")', "before", MULTI_FIX),
    ('lines = ["export const tempoPhotos = ["]', "before", 'music = os.environ.get("FIXED_MUSIC") or music\n'),
 ],
 "fetch_typo.py": [
    ('usage.record(creds_path, picked, "typo")', "before", MULTI_FIX),
    ("headline = random.choice(phrases)", "replace", 'headline = os.environ.get("FIXED_CAPTION") or random.choice(phrases)'),
    ('lines = ["export const typoPhotos = ["]', "before", 'music = os.environ.get("FIXED_MUSIC") or music\n'),
 ],
}

for fn, edits in JOBS.items():
    try:
        s = io.open(fn, encoding="utf-8-sig").read()
    except FileNotFoundError:
        print("SKIP(no file):", fn); continue
    if "FIXED_IDS" in s:
        print("ALREADY:", fn); continue
    ok = True
    for anchor, mode, text in edits:
        if s.count(anchor) != 1:
            print("ANCHOR NG (%dx):" % s.count(anchor), fn); ok = False; break
        s = s.replace(anchor, text if mode == "replace" else text + anchor, 1)
    if ok:
        io.open(fn, "w", encoding="utf-8-sig").write(s)
        print("PATCHED:", fn)
