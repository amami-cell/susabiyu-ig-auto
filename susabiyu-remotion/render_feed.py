# -*- coding: utf-8 -*-
"""洋食フィード投稿画像テンプレ（4:5・静止画）の「デザイン候補」を一括で静止画レンダリングして
永続CDN(jsDelivr)へ納品する。確認アプリの見本「画像」タブに並べて、しっくり来る1枚絵デザインを
オーナーが選べるようにするのが目的。投稿はしない。

・fetch_typo を1回実行し、同じ料理写真で全パターンを描く（＝デザイン比較が容易）。
・各パターンは `npx remotion still <Comp> --scale 1` で1枚絵(1080×1350)を書き出し→JPEG→poster.up(cdn)。
・最後に config 貼付用の FEED SAMPLES(JSON・kind=image) をログに出力する。

使い方（CI）:  STORE_ACCOUNT=nagagutsu python render_feed.py creds.json
"""
import os, sys, json, base64, subprocess

import stores, poster

# YoshokuFeed.tsx の FEED_COMPS と一致させる（id・ラベル）。
FEED_COMPS = [
    ("YoshokuFeedA", "フィード案A・フルブリード×ボトム暗幕(定番)"),
    ("YoshokuFeedB", "フィード案B・ボトムバンド・エディトリアル"),
    ("YoshokuFeedC", "フィード案C・雑誌エディトリアル(下地なし)"),
    ("YoshokuFeedE", "フィード案E・サイドレール(テラコッタ帯)"),
    ("YoshokuFeedE2", "フィード案E2・サイドレール(オリーブ帯)"),
    ("YoshokuFeedE3", "フィード案E3・サイドレール(ゴールド帯)"),
    ("YoshokuFeedH", "フィード案H・パーチメント×ぼかし切り抜き"),
    ("YoshokuFeedH2", "フィード案H2・丸皿カット(正円・テラコッタ地)"),
    ("YoshokuFeedH3", "フィード案H3・イメージポスター(切り抜き3品)"),
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

    # 料理写真を1回だけ取得（全パターンで同じ料理＝デザイン比較用）。
    # フィード画像は H系で“切り抜き（背景除去）”を使うので、ここでだけ生成を有効化する。
    # rembg 未導入・失敗時は空になり、テンプレは従来の写真へフォールバックする（壊れない）。
    os.environ["TYPO_CUTOUT"] = "1"
    run('python fetch_typo.py "' + creds + '"')

    # プロジェクトを1回だけバンドルして、9枚はそのバンドルから描く。
    # `npx remotion still` は毎回バンドルし直すため、9枚で8回ぶん（3〜4分）無駄に待っていた。
    entry = "src/index.ts"
    try:
        run("npx remotion bundle --out-dir=out/bundle")
        if os.path.isdir("out/bundle"):
            entry = "out/bundle"
            print("[FEED] バンドル再利用: out/bundle")
    except Exception as e:
        print("[FEED] bundle 失敗（従来どおり毎回バンドルします）:", e)

    samples = []
    for cid, label in FEED_COMPS:
        png = "out/feed.png"
        jpg = "out/feed.jpg"
        if os.path.exists(png):
            os.remove(png)
        try:
            run("npx remotion still " + entry + " " + cid + " " + png + " --frame 0 --scale 1.0 --timeout 120000" + props_arg)
        except Exception as e:
            print("[FEED] still 失敗 スキップ:", cid, e); continue
        try:
            from PIL import Image
            Image.open(png).convert("RGB").save(jpg, "JPEG", quality=88, optimize=True, progressive=True)
            up = jpg
        except Exception as e:
            print("[FEED] jpg変換失敗（PNGで続行）:", e); up = png
        url = ""
        try:
            url = poster.up(up, cdn=True)
        except Exception as e:
            print("[FEED] upload失敗:", cid, e)
        if not url:
            print("[FEED] URL取得できず スキップ:", cid); continue
        samples.append({"pattern": cid.lower(), "url": url, "label": label,
                        "caption": "フィード投稿画像（4:5）", "kind": "image", "enabled": 1})
        print("[FEED] OK", cid, "->", url[:70])

    # 切り抜き(背景除去)が実際に効いたかをログ末尾に必ず出す（Pythonの出力バッファで先頭に流れて
    # 見落とすのを防ぐ）。0件なら H系は従来表示にフォールバックしている＝原因調査が必要。
    import glob as _glob
    _cuts = sorted(_glob.glob(os.path.join("public", "typo", "cut*.png")))
    print("[CUTOUT-SUMMARY] 生成数=%d %s" % (len(_cuts), [os.path.basename(x) for x in _cuts]))

    print("\n===== FEED SAMPLES(JSON) ここから =====")
    print("FEED_SAMPLES = " + json.dumps(samples, ensure_ascii=False) + ";")
    print("===== FEED SAMPLES(JSON) ここまで =====")
    print("[FEED] 完了：%d枚" % len(samples))


if __name__ == "__main__":
    main()
