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

# デザイン案。店ごとに使う案を変える。
# ・ナガグツ … ユーザー指定で「サイドレール(左オビ)3色＝テラコッタ/オリーブ/ゴールド」に統一。
#   左上は店ロゴ画像(nagagutsu_logo.png)、左オビ＋料理名の体裁を全品で揃える（グリッドが1トーンに）。
# ・その他(GOLD等) … 従来の6案のまま。
if ACCOUNT == "nagagutsu":
    DESIGNS = ["YoshokuFeedE", "YoshokuFeedE2", "YoshokuFeedE3"]
    NO_SCRIM = set()   # サイドレール案は下地(左オビ+下グラデ)があるので明るさ制約は不要
else:
    DESIGNS = [
        "YoshokuFeedA", "YoshokuFeedB", "YoshokuFeedC",
        "YoshokuFeedE", "YoshokuFeedE2", "YoshokuFeedE3",
    ]
    # 暗幕・下地を敷かず写真に直接字を置く案。明るい写真だと文字が負ける。
    # 禁止ではなく「暗い写真から順に割り当てる」に変える。全案が必ず出番を持ち、かつ
    # 下地なしの案は一番読みやすい（暗い）写真に回る。
    NO_SCRIM = {"YoshokuFeedA", "YoshokuFeedC"}


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


def _norm_dish(name):
    """料理名の末尾に付いた分量表記（例「ウフマヨ 1個」「牡蠣 2個」「串カツ 3本」）を落とす。
    メニュー名として不要な個数ラベルを表示・キャプションから除く（ユーザー要望）。
    さらに半角カナ（例 海老タコMIXｱﾋｰｼﾞｮ）は表示フォントに字形が無く□化するので全角へ正規化。
    （動画側は fetch_typo が正規化済み。フィードもここで揃える＝desc辞書の全角キーにも一致する）"""
    import unicodedata
    s = str(name or "").strip()
    if any(0xFF61 <= ord(c) <= 0xFF9F for c in s):
        s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"[ 　]*[×xX]?[ 　]*[0-9０-９]+[ 　]*(個|本|貫|枚|皿|人前|串|杯|切れ|尾|セット)[ 　]*$", "", s)
    return s.strip()


def _slug(name):
    return hashlib.md5(name.encode("utf-8")).hexdigest()[:10]


def _assign(dishes):
    """料理ごとにデザインを割り当てる。

      ②均等   … 6案を品数ぶんの枠に均等配分する（必ず全案に出番がある）
      ③適材適所 … 下地なしの案(A/C)の枠は、文字が載る帯が暗い＝いちばん読みやすい写真へ回す
      ①連続回避 … 表示順で同じ案が隣り合ったら、後ろの品と入れ替えて散らす

    dishes は表示順（料理名順）で渡す。割り当てはハッシュ順を使うので毎回同じ結果になる。
    """
    n = len(dishes)
    if not n:
        return {}
    # ②枠を均等に作る。余りは料理名ハッシュで決まる順に配って、偏り方も固定する。
    quota = []
    for i in range(n):
        quota.append(DESIGNS[i % len(DESIGNS)])
    # ③下地なしの案の枠を、暗い写真から順に配る
    dark_first = sorted(dishes, key=lambda it: (it["bright"], it["name"]))
    ac = [d for d in quota if d in NO_SCRIM]
    other = [d for d in quota if d not in NO_SCRIM]
    # 明るさ順の前半（暗い側）に A/C、残りにその他。どちらもハッシュ順で安定させる。
    ac.sort(key=lambda d: hashlib.md5(d.encode()).hexdigest())
    other.sort(key=lambda d: hashlib.md5(d.encode()).hexdigest())
    for i, it in enumerate(dark_first):
        it["design_id"] = ac[i] if i < len(ac) else other[i - len(ac)]
    # A/C を許す明るさの上限＝暗い側から数えて A/C 枠ぶんに入った写真の、いちばん明るい値。
    # 下の入れ替えでこの線を越えて A/C が移らないようにする（越えると③が崩れる）。
    ac_cut = dark_first[len(ac) - 1]["bright"] if ac else 0.0

    def _ok(design, it):
        return (design not in NO_SCRIM) or (it["bright"] <= ac_cut)

    # ①表示順で同じ案が続いたら、以降の品と交換して崩す（交換相手も連続にならない物を選ぶ）
    for i in range(1, n):
        if dishes[i]["design_id"] != dishes[i - 1]["design_id"]:
            continue
        for j in range(i + 1, n):
            a, b = dishes[i]["design_id"], dishes[j]["design_id"]
            if b == a:
                continue
            if b == dishes[i - 1]["design_id"]:
                continue
            if j + 1 < n and dishes[j + 1]["design_id"] == a:
                continue
            if a == dishes[j - 1]["design_id"] and j - 1 != i:
                continue
            if not (_ok(b, dishes[i]) and _ok(a, dishes[j])):
                continue                      # 下地なしの案を明るい写真へ移さない
            dishes[i]["design_id"], dishes[j]["design_id"] = b, a
            break
    used = {d: 0 for d in DESIGNS}
    for it in dishes:
        used[it["design_id"]] += 1
    runs = sum(1 for i in range(1, n) if dishes[i]["design_id"] == dishes[i - 1]["design_id"])
    print("[FEED] 連続して同じ案になった箇所: %d" % runs)
    acb = [it["bright"] for it in dishes if it["design_id"] in NO_SCRIM]
    if acb:
        print("[FEED] 下地なし案(A/C)を当てた写真の明るさ: 最小%.0f 最大%.0f 平均%.0f"
              % (min(acb), max(acb), sum(acb) / len(acb)))
    return used


def run(cmd):
    print("＄", cmd)
    subprocess.check_call(cmd, shell=True)


def main():
    creds = _creds_path()
    store = stores.get_store(ACCOUNT)
    # 店舗ごとのキャプション体系を使う（ナガグツ＝元気お姉さん／GOLD＝ソムリエお姉さん）。
    # 未定義の店は nagagutsu_captions にフォールバック（従来どおり動く）。
    import importlib
    _capmod = {"nagagutsu": "nagagutsu_captions", "goldporta": "goldporta_captions"}.get(ACCOUNT, "nagagutsu_captions")
    nc = importlib.import_module(_capmod)

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
        nm = _norm_dish(_stem(f.get("name", "")))
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
        # 「ランチ」フォルダの料理は昼メニュー扱い＝フィード文面を昼向けにする（夜/ワイン提案を外す）。
        is_lunch = ("ランチ" in str(folder or "")) or ("lunch" in str(folder or "").lower())
        try:
            c = nc.caption_for(nm, lunch=is_lunch)
        except TypeError:
            c = nc.caption_for(nm)   # lunch 引数に未対応の店（旧captions）でも動く
        dishes.append({
            "name": nm, "slug": sl, "img": raw_rel, "cat": folder or "料理", "lunch": is_lunch,
            # cap は確認アプリの予約作成が本文として使う。投稿本文(post)があればそれを優先
            # （ナガグツ＝元気お姉さん／GOLD＝ソムリエお姉さん）。無ければ従来の短いcap。
            "title": c.get("title") or nm, "cap": c.get("post") or c.get("cap") or "", "tags": c.get("tags") or "",
            "sub": nc.sub_for(nm) or "", "disp": nc.name_broken(nm) or nm, "desc": nc.desc_for(nm) or "",
            "bright": _text_band_brightness(im),
        })
        print("  取得 %-28s 明るさ %.0f%s" % (nm[:28], dishes[-1]["bright"], "  [ランチ]" if is_lunch else ""))

    used = _assign(dishes)   # 内訳（連続箇所・A/Cを当てた写真の明るさ）は _assign 側で出す
    print("[FEED] デザイン割り当て:", {k.replace("YoshokuFeed", ""): v for k, v in used.items()})

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
        # ナガグツは左上を店ロゴ画像に（文字ロゴではなく丸ロゴ）。public/nagagutsu_logo.png を使う。
        if ACCOUNT == "nagagutsu":
            props["brandLogo"] = "nagagutsu_logo.png"
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

    # 軽量版WebP（thumb 360px / card 960px）。三条もぎふやも持っている。
    # これが無いとアプリのグリッドが原寸JPEGを何十枚も読むことになり、一覧が重くなる。
    # 投稿には原寸JPEGを使うので、投稿画質は落ちない。
    try:
        import make_thumbs
        make_thumbs.main(OUT_DIR)
    except Exception as e:
        print("[FEED] WebP生成スキップ（表示は原寸へフォールバック）:", e)


if __name__ == "__main__":
    main()
