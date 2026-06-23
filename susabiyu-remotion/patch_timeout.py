import io
fn = "prepare.py"
s = io.open(fn, encoding="utf-8-sig").read()
old = 'run("npx remotion render " + comp + " " + out + " --crf 18")'
new = 'run("npx remotion render " + comp + " " + out + " --crf 18 --timeout 120000 --concurrency 1")'
if new in s:
    print("ALREADY")
elif s.count(old) == 1:
    io.open(fn, "w", encoding="utf-8-sig").write(s.replace(old, new, 1)); print("PATCHED")
else:
    print("ANCHOR NG", s.count(old))
