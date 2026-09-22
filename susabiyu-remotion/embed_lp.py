#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LPのHTML内で相対パス参照している画像を、縮小圧縮して data URI に埋め込み、
「画像内蔵の自己完結HTML」を生成する（＝どのドメイン(中立ドメイン等)でも画像が表示される）。

使い方: python embed_lp.py <in.html> <out.html> [img_root=pwa]

- 参照形式は url(...) / src="..." / poster="..." の <store>/<name>.<ext>(?v=...) を対象。
- 画像は最長辺 MAXDIM に縮小し JPEG(quality Q) で圧縮。PNG(ロゴ等・透過)は PNG のまま縮小。
- 同一参照文字列は一度だけエンコードして使い回す（キャッシュ）。
- 元画像が見つからない参照はそのまま残す（警告）。
"""
import sys, re, os, base64, io
from PIL import Image

Q = 70                # JPEG品質
LOGO_MAXDIM = 560     # ロゴ(PNG透過)用

def maxdim_for(rel):
    """ファイル名の役割で最長辺(px)を出し分け、軽さと画質を両立。"""
    base = os.path.basename(rel)
    if base.startswith("fd_"):      # メニューグリッドのサムネ＝画面上小さい
        return 480
    if base.startswith(("f_", "scene_")):  # ヒーロー/背景＝全幅
        return 1000
    return 720                      # コース画像など

STORES = "goldporta|nagagutsu|gifuya|susabiyu|gifuyatenjin"
REF_RE = re.compile(r'(?:%s)/[A-Za-z0-9_]+\.(?:jpg|jpeg|png|webp)(?:\?[A-Za-z0-9_=&.]+)?' % STORES)

def encode(path, rel):
    is_png = path.lower().endswith(".png")
    im = Image.open(path)
    # 透過PNGは維持、それ以外はRGBへ
    if is_png and im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        md = LOGO_MAXDIM
    else:
        im = im.convert("RGB")
        md = maxdim_for(rel)
    w, h = im.size
    scale = min(1.0, md / float(max(w, h)))
    if scale < 1.0:
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    buf = io.BytesIO()
    if is_png:
        im.save(buf, format="PNG", optimize=True)
        mime = "image/png"
    else:
        im.save(buf, format="JPEG", quality=Q, optimize=True, progressive=True)
        mime = "image/jpeg"
    return "data:%s;base64,%s" % (mime, base64.b64encode(buf.getvalue()).decode("ascii"))

def main():
    inp, outp = sys.argv[1], sys.argv[2]
    root = sys.argv[3] if len(sys.argv) > 3 else "pwa"
    html = open(inp, encoding="utf-8").read()
    cache = {}
    missing = []
    total_ref = [0]

    def repl(m):
        ref = m.group(0)
        total_ref[0] += 1
        if ref in cache:
            return cache[ref]
        rel = ref.split("?", 1)[0]                # クエリ除去したファイル相対パス
        path = os.path.join(root, rel)
        if not os.path.isfile(path):
            missing.append(rel)
            cache[ref] = ref                      # 見つからなければそのまま
            return ref
        try:
            data = encode(path, rel)
        except Exception as e:
            missing.append("%s (%s)" % (rel, e))
            cache[ref] = ref
            return ref
        cache[ref] = data
        return data

    out = REF_RE.sub(repl, html)
    open(outp, "w", encoding="utf-8").write(out)

    uniq = sum(1 for v in cache.values() if v.startswith("data:"))
    size = os.path.getsize(outp)
    print("[embed] refs=%d uniq_embedded=%d out=%s size=%.2fMB" % (total_ref[0], uniq, outp, size / 1024.0 / 1024.0))
    if missing:
        print("[embed][WARN] 見つからず/失敗 %d 件:" % len(missing))
        for x in sorted(set(missing)):
            print("   -", x)

if __name__ == "__main__":
    main()
