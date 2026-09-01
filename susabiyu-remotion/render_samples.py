# -*- coding: utf-8 -*-
"""洋食おしゃれテンプレの「見本ギャラリー」を一括レンダリングして永続CDNへ納品する。

・投稿はしない（承認待ちにも書かない）。純粋に確認アプリの window.GIFUYA.SAMPLES 用の動画/ポスターを作るだけ。
・STORE_ACCOUNT の店舗（Drive写真・theme・ブランドprops）で、指定パターンを1本ずつ render。
・fetch_typo は1回だけ実行し、同じ写真セットで全テンプレを描く（横並び比較しやすい）。
・各動画/ポスターは poster.up(cdn=True)＝jsDelivr(コミットSHA固定)/R2 の永続ホストへ。
・最後に config 貼り付け用の SAMPLES(JSON) を out/samples.json とログに出力する。

使い方（CI）:
  STORE_ACCOUNT=nagagutsu python render_samples.py creds.json
  # 一部だけ: PATTERNS="yoshokusizzle,yoshokutype" を指定
"""
import os, sys, json, base64, datetime, subprocess

JST = datetime.timezone(datetime.timedelta(hours=9))

import stores, poster
from prepare import REG, PAT_JA  # パターン→(fetch,comp,is_video) と 日本語ラベル

DEFAULT_PATTERNS = list(stores.YOSHOKU_PATTERNS)


def run(cmd):
    print("＄", cmd)
    subprocess.check_call(cmd, shell=True)


def _poster_jpg(comp, props_arg):
    """代表フレームの静止画(JPEG)を作って返す（失敗時 None）。ポスター＝一覧の見た目。"""
    png = "out/sample_poster.png"
    jpg = "out/sample_poster.jpg"
    try:
        run("npx remotion still " + comp + " " + png + " --frame 100 --scale 1.0 --timeout 120000" + props_arg)
    except Exception as e:
        print("[SAMPLE] still 失敗:", e); return None
    try:
        from PIL import Image
        im = Image.open(png).convert("RGB")
        im.save(jpg, "JPEG", quality=86)
        return jpg
    except Exception as e:
        print("[SAMPLE] jpg変換 失敗:", e); return png


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

    account = os.environ.get("STORE_ACCOUNT", "").strip()
    store = stores.get_store(account)
    os.makedirs("out", exist_ok=True)

    # ブランドprops（storeName/handle/region/theme）を注入。theme で洋食の配色が切り替わる。
    props_arg = ""
    if account:
        open("out/_props.json", "w", encoding="utf-8").write(
            json.dumps(stores.render_props(store), ensure_ascii=False))
        props_arg = " --props=out/_props.json"
    stores.apply_fetch_env(store)   # 店舗のDriveフォルダ（food等）を GENRE_*_ID env へ
    os.environ["SHEET_ID"] = os.environ.get("STORE_SHEET_ID") or store["sheet_id"]
    poster.SHEET_ID = os.environ["SHEET_ID"]

    pats = os.environ.get("PATTERNS", "").strip()
    patterns = [p.strip() for p in pats.split(",") if p.strip()] if pats else DEFAULT_PATTERNS

    # 写真セットは1回だけ取得（全テンプレで同じ料理を使う＝比較しやすい）。
    run('python fetch_typo.py "' + creds + '"')

    # キャプション文言と音源を「パターンごとに変える」ため、店舗の文言プールと音源一覧を用意。
    import re as _re, glob as _glob, io as _io
    import captions as _caps
    _pool = []
    try:
        _ph = _caps.load(); _pool = list(_ph.get("generic", [])) + list(_ph.get("sushi", []))
    except Exception:
        pass
    _pool = [p for p in _pool if p] or [store.get("fallback_phrase", "")]
    _tracks = sorted(_glob.glob("public/music/normal/*.mp3") + _glob.glob("public/music/normal/*.m4a") + _glob.glob("public/music/normal/*.wav"))
    print("[SAMPLE] 文言 %d / 音源 %d 種" % (len(_pool), len(_tracks)))

    def _mstart(path):
        base = os.path.splitext(os.path.basename(path or ""))[0]
        m = _re.search(r'(\d{1,2}):(\d{2})(?::(\d{2}))?', base)
        if m:
            a, b, c = int(m.group(1)), int(m.group(2)), m.group(3)
            return a * 3600 + b * 60 + int(c) if c else a * 60 + b
        jm = _re.search(r'(?:(\d+)\s*分)?\s*(\d+)\s*秒', base)   # 「1分23秒」「23秒」
        if jm and (jm.group(1) or jm.group(2)):
            return (int(jm.group(1)) if jm.group(1) else 0) * 60 + (int(jm.group(2)) if jm.group(2) else 0)
        jm2 = _re.search(r'(\d+)\s*分', base)
        if jm2:
            return int(jm2.group(1)) * 60
        m2 = _re.search(r'(\d{1,3})\s*(?:s\b|sec)', base, _re.I)
        return int(m2.group(1)) if m2 else 0

    def _set_typo(cap, music_path):
        # 写真はそのまま、typoData.ts の headline / music / musicStart だけ書き換える。
        s = _io.open("src/typoData.ts", encoding="utf-8").read()
        s = _re.sub(r'export const typoHeadline = ".*?";',
                    'export const typoHeadline = "%s";' % cap.replace('\\', '\\\\').replace('"', '\\"'), s)
        if music_path:
            rel = "music/normal/" + os.path.basename(music_path)
            s = _re.sub(r'export const typoMusic = ".*?";', 'export const typoMusic = "%s";' % rel, s)
            s = _re.sub(r'export const typoMusicStart = \d+;', 'export const typoMusicStart = %d;' % _mstart(music_path), s)
        _io.open("src/typoData.ts", "w", encoding="utf-8").write(s)

    samples = []
    for idx, pattern in enumerate(patterns):
        if pattern not in REG:
            print("[SAMPLE] 未登録パターン スキップ:", pattern); continue
        fetch, comp, is_video = REG[pattern]
        label = PAT_JA.get(pattern, pattern)
        cap = _pool[idx % len(_pool)] if _pool else ""
        mp = _tracks[idx % len(_tracks)] if _tracks else ""
        music_name = os.path.splitext(os.path.basename(mp))[0] if mp else ""
        _set_typo(cap, mp)   # このパターン用にキャプション＆音源を差し込む
        print("\n=========== 見本レンダリング: %s (%s) | 文言=%s | 音源=%s(+%ds) ==========="
              % (pattern, comp, cap, music_name or "既定", _mstart(mp)))
        try:
            if is_video:
                run("npx remotion render " + comp + " out/post.mp4 --crf 26 --timeout 180000 --concurrency 1" + props_arg)
                url = poster.up("out/post.mp4", cdn=True)
            else:
                url = ""
            pj = _poster_jpg(comp, props_arg)
            purl = poster.up(pj, cdn=True) if pj else ""
            if not url:
                url = purl  # 動画が上がらなければポスター静止画で代替
            if not url:
                print("[SAMPLE] URL取得できず スキップ:", pattern); continue
            samples.append({"pattern": pattern, "url": url, "poster": purl,
                            "label": "洋食おしゃれ・" + label.replace("洋食・", ""),
                            "caption": cap, "music": music_name, "enabled": 1})
            print("[SAMPLE] OK", pattern, "->", url[:70])
        except Exception as e:
            print("[SAMPLE] 失敗（継続）:", pattern, e)

    open("out/samples.json", "w", encoding="utf-8").write(json.dumps(samples, ensure_ascii=False, indent=2))
    print("\n===== SAMPLES(JSON) ここから =====")
    print("window.GIFUYA.SAMPLES = " + json.dumps(samples, ensure_ascii=False) + ";")
    print("===== SAMPLES(JSON) ここまで =====")
    print("[SAMPLE] 完了：%d本" % len(samples))


if __name__ == "__main__":
    main()
