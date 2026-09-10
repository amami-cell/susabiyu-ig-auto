# -*- coding: utf-8 -*-
"""No.11 雑誌ストーリーの「商品ページ」デザイン提案10案を静止画で書き出して永続CDNへ納品する。

同じ料理・同じ紙で10案を並べ、どの組み方にするかをオーナーが選べるようにするのが目的。
投稿はしない。選ばれた案（＋修正指示）を YoshokuMagazine.tsx の本文ページに反映する運用。

使い方（CI）:  STORE_ACCOUNT=nagagutsu python render_magpages.py creds.json
"""
import os, sys, json, base64, subprocess

import stores, poster

# src/YoshokuMagPages.tsx の MAGP_COMPS と一致させる（id・ラベル）。
MAGP_COMPS = [
    ("MagPage01", "案01 グラビア扉（大判＋短冊見出し）"),
    ("MagPage02", "案02 左右分割（縦組みの料理名）"),
    ("MagPage03", "案03 円形トリミング（特大ノンブル）"),
    ("MagPage04", "案04 白フチ写真（定番キャプション）"),
    ("MagPage05", "案05 上下二分（下半分を白場に）"),
    ("MagPage06", "案06 大見出し主役（名前を最上部に特大）"),
    ("MagPage07", "案07 全面写真＋角の小札"),
    ("MagPage08", "案08 二枚組（主役＋ディテール）"),
    ("MagPage09", "案09 縦帯レイアウト（左にテラコッタ帯）"),
    ("MagPage10", "案10 引用主役（説明文を鉤括弧で立てる）"),
    ("MagPage11", "案11 フィード案Eそのまま（サイドレール／テラコッタ帯）"),
]


def run(cmd):
    print("＄", cmd)
    subprocess.check_call(cmd, shell=True)


def main():
    args = [a for a in sys.argv[1:] if a.strip()]
    creds = args[0] if args and args[0].lower().endswith(".json") else ""
    if not creds and os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
        creds = "creds.json"
    if not creds or not os.path.exists(creds):
        raise SystemExit("認証JSONが見つかりません。")
    if os.path.abspath(creds) != os.path.abspath("creds.json"):
        import shutil; shutil.copyfile(creds, "creds.json")
    creds = "creds.json"

    account = os.environ.get("STORE_ACCOUNT", "nagagutsu").strip() or "nagagutsu"
    store = stores.get_store(account)
    os.makedirs("out", exist_ok=True)

    props = stores.render_props(store)
    open("out/_props.json", "w", encoding="utf-8").write(json.dumps(props, ensure_ascii=False))
    props_arg = " --props=out/_props.json"
    stores.apply_fetch_env(store)
    os.environ["SHEET_ID"] = os.environ.get("STORE_SHEET_ID") or store["sheet_id"]
    poster.SHEET_ID = os.environ["SHEET_ID"]

    # 料理写真を1回だけ取得（全案で同じ料理＝デザインだけを比較できる）。
    os.environ["TYPO_CUTOUT"] = ""
    run('python fetch_typo.py "' + creds + '"')

    # プロジェクトを1回だけバンドルして10枚をそこから描く（still は毎回バンドルし直すため）。
    entry = "src/index.ts"
    try:
        run("npx remotion bundle --out-dir=out/bundle")
        if os.path.isdir("out/bundle"):
            entry = "out/bundle"
            print("[MAGP] バンドル再利用: out/bundle")
    except Exception as e:
        print("[MAGP] bundle 失敗（従来どおり毎回バンドルします）:", e)

    # PAGES で対象を絞れる（1案だけ直して見る、が速くできる）
    _sel = [x.strip() for x in os.environ.get("PAGES", "").split(",") if x.strip()]
    targets = [(c, l) for c, l in MAGP_COMPS if not _sel or c in _sel]
    print("[MAGP] 対象 %d案 %s" % (len(targets), [c for c, _ in targets]))

    samples = []
    for cid, label in targets:
        png = "out/magpage.png"
        jpg = "out/magpage.jpg"
        for f in (png, jpg):
            if os.path.exists(f):
                os.remove(f)
        try:
            run("npx remotion still " + entry + " " + cid + " " + png + " --frame 0 --scale 1.0 --timeout 120000" + props_arg)
        except Exception as e:
            print("[MAGP] still 失敗 スキップ:", cid, e); continue
        try:
            from PIL import Image
            Image.open(png).convert("RGB").save(jpg, "JPEG", quality=88, optimize=True, progressive=True)
            up = jpg
        except Exception as e:
            print("[MAGP] jpg変換失敗（PNGで続行）:", e); up = png
        url = ""
        try:
            url = poster.up(up, cdn=True)
        except Exception as e:
            print("[MAGP] upload失敗:", cid, e)
        if not url:
            print("[MAGP] URL取得できず スキップ:", cid); continue
        samples.append({"pattern": cid.lower(), "url": url, "label": label,
                        "caption": "雑誌ストーリー 商品ページ案", "kind": "image", "enabled": 1})
        print("[MAGP] OK", cid, "->", url[:70])

    print("\n===== MAGPAGE SAMPLES(JSON) ここから =====")
    print("MAGPAGE_SAMPLES = " + json.dumps(samples, ensure_ascii=False) + ";")
    print("===== MAGPAGE SAMPLES(JSON) ここまで =====")
    print("[MAGP] 完了：%d枚" % len(samples))


if __name__ == "__main__":
    main()
