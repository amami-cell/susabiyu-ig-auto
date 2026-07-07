import io
fn = "prepare.py"
s = io.open(fn, encoding="utf-8-sig").read()
anchor = '"'"'        open("creds.json","wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"])); creds = "creds.json"'"'"'
add = anchor + '"'"'\n    if creds and creds.lower().endswith(".json") and os.path.abspath(creds) != os.path.abspath("creds.json"):\n        import shutil; shutil.copyfile(creds, "creds.json")'"'"'
if "shutil.copyfile(creds" in s:
    print("ALREADY")
elif s.count(anchor) == 1:
    io.open(fn, "w", encoding="utf-8-sig").write(s.replace(anchor, add, 1)); print("PATCHED")
else:
    print("ANCHOR NG", s.count(anchor))
