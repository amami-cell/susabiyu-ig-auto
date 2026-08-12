# -*- coding: utf-8 -*-
"""指定した料理の「原本（未トリミング）」写真を Google ドライブからそのまま取得して
   pwa/gifuya/orig/o_<hash>.jpg として保存する（4:5中央トリミングで落ちた部分を復元するため）。

   hash は本番と同じ md5(料理名)[:10]。よって o_<hash>.jpg と f_<hash>.jpg が対応する。

   使い方:
     python gifuya_dumporig.py "ジャンボ海老"            # 料理名にこの語を含む原本を取得
     python gifuya_dumporig.py "ジャンボ海老,どて焼き"   # カンマ区切りで複数
     python gifuya_dumporig.py "" <FOLDER_ID>            # 空語＝全料理の原本を取得
   認証は gifuya_photos と同じ creds.json / GOOGLE_CREDS_B64。
"""
import os
import sys
import hashlib

from PIL import Image, ImageOps

import gifuya_photos as gp

MAX_SIDE = 2400  # 原本が巨大な場合の長辺上限（構図確認・再トリミングには十分）


def main():
    keys = [k.strip() for k in (sys.argv[1] if len(sys.argv) > 1 else "ジャンボ海老").split(",") if k.strip()]
    root = sys.argv[2].strip() if len(sys.argv) > 2 else ""
    drive = gp._drive()
    ordered = gp._select(drive, root or gp.IMG_ROOT_DEFAULT)
    outdir = os.path.join(gp.OUT_DIR, "orig")
    os.makedirs(outdir, exist_ok=True)
    n = 0
    for d in ordered:
        if keys and not any(k in d["name"] for k in keys):
            continue
        im = Image.open(gp._download(drive, d["id"]))
        im = ImageOps.exif_transpose(im).convert("RGB")
        if max(im.size) > MAX_SIDE:
            s = MAX_SIDE / max(im.size)
            im = im.resize((int(im.size[0] * s), int(im.size[1] * s)), Image.LANCZOS)
        h = hashlib.md5(d["name"].encode("utf-8")).hexdigest()[:10]
        op = os.path.join(outdir, "o_%s.jpg" % h)
        im.save(op, "JPEG", quality=92, optimize=True)
        n += 1
        print("ORIG|%s|o_%s.jpg|%dx%d|src=%s" % (d["name"], h, im.size[0], im.size[1], d.get("src", "")))
    print("[DUMPORIG] %d件を取得しました。" % n)
    if n == 0:
        raise SystemExit("該当なし（キーワード要調整）: %s" % keys)


if __name__ == "__main__":
    main()
