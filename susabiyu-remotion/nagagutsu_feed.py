# -*- coding: utf-8 -*-
"""ナガグツのフィード投稿素材を作る（ぎふや方式のナガグツ版）。

確認アプリの「フィード」タブは pwa/<account>/feed.json を読む。ぎふやは 62品ぶん揃って
いるのに対し、ナガグツは feed.json もフォルダも無く、タブが空のままだった。ここで埋める。

  Drive の料理写真 → 4:5 トリミング → 承認済みフィードデザインを料理ごとに割り当てて焼く
  → pwa/nagagutsu/f_*.jpg（生写真）と fd_*.jpg（加工済み投稿画像）→ feed.json

■ デザインは1案に固定せず「ランダムでおすすめ」
指定は「ランダムでフィード投稿が変にならないようにランダムでおすすめ」。
そこで承認済み6案を料理ごとに散らす。ただし素のランダムだと事故るので3つ効かせる。

  ①同じ案が連続しない       … グリッドに並べた時に単調・不自然にならない
  ②6案が均等に散る           … 使用回数の少ない案から選ぶ（偏らせない）
  ③写真ごとに不向きな案を外す … 案A・案Cは暗幕なしで写真に直接字を置く型なので、
                                文字が載る帯が明るい写真だと読めない。その写真では選ばない。

並びは料理名のハッシュで決めるので、何度回しても同じ割り当てになる（＝毎回違う絵に
なって「昨日と違う」と混乱することがない）。写真が増減した時だけ変わる。

使い方:
    STORE_ACCOUNT=nagagutsu python nagagutsu_feed.py creds.json
    （--limit N で先頭N品だけ焼く＝動作確認用）
"""
import os, sys, io, json, re, base64, hashlib, subprocess

from PIL import Image, ImageOps

import stores

HERE = os.path.dirname(os.path.abspath(__file__))
ACCOUNT = os.environ.get("STORE_ACCOUNT", "nagagutsu").strip() or "nagagutsu"
OUT_DIR = os.path.join(HERE, "..", "pwa", ACCOUNT)      # アプリが読む場所
PUB_DIR = os.path.join(HERE, "public", "nfeed")          # Remotion が staticFile で読む場所
TARGET_W, TARGET_H = 1080, 1350                          # 4:5
MIN_SIDE = 700                                           # これ未満の小さい画像は使わない

# 承認済みの6案（render_feed.py / YoshokuFeed.tsx の FEED_COMPS と一致させる）。
DESIGNS = [
    "YoshokuFeedA", "YoshokuFeedB", "YoshokuFeedC",
    "YoshokuFeedE", "YoshokuFeedE2", "YoshokuFeedE3",
]
# 暗幕・下地を敷かず写真に直接字を置く案。明るい写真だと文字が負けるので条件付きで使う。
NO_SCRIM = {"YoshokuFeedA", "YoshokuFeedC"}
# 文字が載る帯（下から40%）の明るさがこれを超えたら NO_SCRIM 系は避ける。
BRIGHT_LIMIT = 138.0


def _creds_path():
    args = [a for a in sys.argv[1:] if a.strip() and a.lower().endswith(".json")]
    if args and os.path.exists(args[0]):
        return args[0]
    if os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
        return "creds.json"
    raise SystemExit("認証JSONが見つかりません。")


def _drive(creds):
    from googleapiclient.discovery import build
    from google.oauth2.service_account import Credentials
    c = Credentials.from_service_account_file(
        creds, scopes=["https://www.googleapis.com/auth/drive.readonly"])
    return build("drive", "v3", credentials=c)


def _children(drive, fid):
    out, tok = [], None
    while True:
        r = drive.files().list(
            q="'%s' in parents and trashed=false" % fid,
            fields="nextPageToken,files(id,name,mimeType,imageMediaMetadata(width,height),createdTime)",
            pageSize=1000, pageToken=tok,
            includeItemsFromAllDrives=True, supportsAllDrives=True).execute()
        out += r.get("files", [])
        tok = r.get("nextPageToken")
        if not tok:
            break
    return out


def _short_side(f):
    m = f.get("imageMediaMetadata") or {}
    w, h = m.get("width") or 0, m.get("height") or 0
    return min(w, h) if (w and h) else 9999      # メタが無い時は弾かない


def _walk(drive, fid, excl, folder="", depth=0):
    """料理写真を再帰収集。除外フォルダ（ロゴ/外観/ドリンク等）は辿らない。"""
    out = []
    for f in _children(drive, fid):
        nm = f.get("name", "")
        if any(x in nm for x in excl):
            continue
        if f["mimeType"] == "application/vnd.google-apps.folder":
            if depth < 3:
                out += _walk(drive, f["id"], excl, nm, depth + 1)
        elif f["mimeType"].startswith("image/") and _short_side(f) >= MIN_SIDE:
            out.append((f, folder))
    return out


def _download(drive, fid):
    from googleapiclient.http import MediaIoBaseDownload
    buf = io.BytesIO()
    dl = MediaIoBaseDownload(buf, drive.files().get_media(fileId=fid, supportsAllDrives=True))
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.seek(0)
    return buf


def _save_45(buf, path):
    """4:5 の中央クロップで保存し、そのPIL画像を返す（明るさ判定に使い回す）。"""
    im = ImageOps.exif_transpose(Image.open(buf))
    if im.mode != "RGB":
        im = im.convert("RGB")
    im = ImageOps.fit(im, (TARGET_W, TARGET_H), method=Image.LANCZOS, centering=(0.5, 0.5))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "JPEG", quality=90, optimize=True, progressive=True)
    return im


def _text_band_brightness(im):
    """文字が載る帯（下から40%）の平均輝度。明るいほど下地なしの案は不利。"""
    band = im.crop((0, int(TARGET_H * 0.60), TARGET_W, TARGET_H)).convert("L")
    px = list(band.getdata())
    return sum(px) / float(len(px))


def _stem(name):
    return re.sub(r"\.(jpg|jpeg|png|webp)$", "", name or "", flags=re.I).strip()


def _slug(name):
    return hashlib.md5(name.encode("utf-8")).hexdigest()[:10]


def _assign(dishes):
    """料理ごとにデザインを割り当てる（①連続回避 ②均等 ③写真に不向きな案を除外）。"""
    used = {d: 0 for d in DESIGNS}
    prev = None
    for it in dishes:
        allowed = [d for d in DESIGNS
                   if not (d in NO_SCRIM and it["bright"] > BRIGHT_LIMIT)]
        if not allowed:                      # 念のため（全部弾かれたら制約を緩める）
            allowed = list(DESIGNS)
        cand = [d for d in allowed if d != prev] or allowed
        # 使用回数が少ない順 → 同数なら料理名のハッシュで決める（毎回同じ結果になる）
        h = _slug(it["name"])
        cand.sort(key=lambda d: (used[d], hashlib.md5((h + d).encode()).hexdigest()))
        pick = cand[0]
        it["design_id"] = pick
        used[pick] += 1
        prev = pick
    return used


def run(cmd):
    print("＄", cmd)
    subprocess.check_call(cmd, shell=True)


def main():
    creds = _creds_path()
    store = stores.get_store(ACCOUNT)
    import nagagutsu_captions as nc

    limit = 0
    for i, a in enumerate(sys.argv):
        if a == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])

    root = (store.get("folders") or {}).get("food", "")
    if not root:
        raise SystemExit("この店舗の料理写真フォルダIDが stores.py にありません。")
    excl = list(store.get("exclude_cats") or [])

    drive = _drive(creds)
    found = _walk(drive, root, excl)
    print("[FEED] Drive収集: %d枚" % len(found))

    # 同じ料理名は1枚に（新しい方を採用）。料理名＝ファイル名から拡張子を落としたもの。
    best = {}
    for f, folder in found:
        nm = _stem(f.get("name", ""))
        if not nm:
            continue
        cur = best.get(nm)
        if not cur or (f.get("createdTime", "") > cur[0].get("createdTime", "")):
            best[nm] = (f, folder)
    names = sorted(best.keys())               # 並びを固定＝割り当ても固定
    if limit:
        names = names[:limit]
    print("[FEED] 料理: %d品" % len(names))

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(PUB_DIR, exist_ok=True)

    dishes = []
    for nm in names:
        f, folder = best[nm]
        sl = _slug(nm)
        raw_rel = "f_%s.jpg" % sl
        im = _save_45(_download(drive, f["id"]), os.path.join(OUT_DIR, raw_rel))
        im.save(os.path.join(PUB_DIR, sl + ".jpg"), "JPEG", quality=92)   # Remotion用
        c = nc.caption_for(nm)
        dishes.append({
            "name": nm, "slug": sl, "img": raw_rel, "cat": folder or "料理",
            "title": c.get("title") or nm, "cap": c.get("cap") or "", "tags": c.get("tags") or "",
            "sub": nc.sub_for(nm) or "", "disp": nc.name_broken(nm) or nm, "desc": nc.desc_for(nm) or "",
            "bright": _text_band_brightness(im),
        })
        print("  取得 %-28s 明るさ %.0f" % (nm[:28], dishes[-1]["bright"]))

    used = _assign(dishes)
    print("[FEED] デザイン割り当て:", {k.replace("YoshokuFeed", ""): v for k, v in used.items()})
    dark = sum(1 for d in dishes if d["bright"] > BRIGHT_LIMIT)
    print("[FEED] 明るすぎて下地なし案(A/C)を外した写真: %d品" % dark)

    # バンドルは1回だけ。あとは props を差し替えて全品を焼く（再バンドルしない）。
    entry = "src/index.ts"
    try:
        run("npx remotion bundle --out-dir=out/bundle")
        if os.path.isdir("out/bundle"):
            entry = "out/bundle"
            print("[FEED] バンドル再利用: out/bundle")
    except Exception as e:
        print("[FEED] bundle 失敗（毎回バンドルします）:", e)

    os.makedirs("out", exist_ok=True)
    ok = 0
    for d in dishes:
        it = {"src": "nfeed/%s.jpg" % d["slug"], "caption": d["name"], "disp": d["disp"],
              "sub": d["sub"], "desc": d["desc"], "story": "", "cut": ""}
        props = {"storeName": store["store_name"], "handle": store["handle"],
                 "theme": store.get("theme") or "italian", "it": it}
        open("out/_feed_props.json", "w", encoding="utf-8").write(
            json.dumps(props, ensure_ascii=False))
        png = "out/nfeed.png"
        if os.path.exists(png):
            os.remove(png)
        try:
            run("npx remotion still %s %s %s --frame 0 --scale 1.0 --timeout 120000 --props=out/_feed_props.json"
                % (entry, d["design_id"], png))
        except Exception as e:
            print("  WARN 焼き失敗 %s (%s): %s" % (d["name"], d["design_id"], e))
            continue
        design_rel = "fd_%s.jpg" % d["slug"]
        Image.open(png).convert("RGB").save(
            os.path.join(OUT_DIR, design_rel), "JPEG", quality=88, optimize=True, progressive=True)
        d["design"] = design_rel
        ok += 1
        print("  焼き %-28s %s" % (d["name"][:28], d["design_id"]))

    items = []
    for d in dishes:
        it = {"img": d["img"], "name": d["name"], "title": d["title"],
              "cap": d["cap"], "tags": d["tags"], "reco": False}
        if d.get("design"):
            it["design"] = d["design"]
            it["design_id"] = d["design_id"]
        items.append(it)
    feed = {"store": ACCOUNT, "count": len(items), "items": items}
    with open(os.path.join(OUT_DIR, "feed.json"), "w", encoding="utf-8") as fp:
        json.dump(feed, fp, ensure_ascii=False, indent=1)
    print("[FEED] %d品を書き出し（加工済み %d）→ pwa/%s/feed.json" % (len(items), ok, ACCOUNT))


if __name__ == "__main__":
    main()
