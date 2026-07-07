# -*- coding: utf-8 -*-
import io, os

SIMPLE_OLD = """        <div
          style={{
            width: 1080 - M * 2,
            height: 1000,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(212,165,116,0.4)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
          }}
        >
          <Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>"""

SIMPLE_NEW = """        <div
          style={{
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(212,165,116,0.4)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
            lineHeight: 0,
          }}
        >
          <Img src={src} style={{ display: "block", maxWidth: 1080 - M * 2, maxHeight: 1040, width: "auto", height: "auto" }} />
        </div>"""

SUSHI_OLD = """        <div
          style={{
            width: 1080 - MARGIN * 2,
            height: 1040,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(212,165,116,0.35)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
          }}
        >
          <Img
            src={src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>"""

SUSHI_NEW = """        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(212,165,116,0.35)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
            lineHeight: 0,
          }}
        >
          <Img
            src={src}
            style={{
              display: "block",
              maxWidth: 1080 - MARGIN * 2,
              maxHeight: 1040,
              width: "auto",
              height: "auto",
            }}
          />
        </div>"""

JOBS = [
    (os.path.join("src", "SimpleStory.tsx"), SIMPLE_OLD, SIMPLE_NEW),
    (os.path.join("src", "SushiStory.tsx"), SUSHI_OLD, SUSHI_NEW),
]
for fn, old, new in JOBS:
    if not os.path.exists(fn):
        print("SKIP (no file):", fn); continue
    s = io.open(fn, encoding="utf-8-sig").read()
    if new in s:
        print("ALREADY:", fn); continue
    if s.count(old) != 1:
        print("ANCHOR NG (%dx):" % s.count(old), fn); continue
    io.open(fn, "w", encoding="utf-8-sig").write(s.replace(old, new, 1))
    print("PATCHED:", fn)
