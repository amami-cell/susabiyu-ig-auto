import io
fn = "decide_post.py"
s = io.open(fn, encoding="utf-8-sig").read()
old = ('    plan = {s: rng.choice(ALL) for s in slots}\n'
       '    if not any(plan[s] in VIDEO for s in slots):\n'
       '        plan[rng.choice(slots)] = rng.choice(VIDEO)')
new = ('    video_slot = rng.choice(slots)\n'
       '    plan = {}\n'
       '    for s in slots:\n'
       '        plan[s] = rng.choice(VIDEO) if s == video_slot else rng.choice(STILL)')
if "video_slot = rng.choice(slots)" in s:
    print("ALREADY")
elif s.count(old) == 1:
    io.open(fn, "w", encoding="utf-8-sig").write(s.replace(old, new, 1)); print("PATCHED")
else:
    print("ANCHOR NG", s.count(old))
