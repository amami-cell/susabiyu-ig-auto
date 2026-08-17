# -*- coding: utf-8 -*-
"""ぎふやストーリー動画（全10本）を、同期済みのDrive写真（pwa/gifuya/f_*.jpg＋feed.json）から再生成する。

各スロット dv_NN に「コンポジション＋データ形式＋使用料理」を割り当て、ぎふや店名/地域/ハンドルを props で渡す。
写真は data ファイル（typoData/simpleData）＋public 素材を一時差し替えして使い、終了後に git で元へ戻す
（三条の投稿データを壊さない）。地域表記が焼き込みの三条固定になっているコンポジションは使わず、
店名/地域を props で正しく出せる region-free 構成のみを採用。

  python gifuya_render_stories.py            # 全10本
  python gifuya_render_stories.py dv_12 dv_14 # 指定のみ

  ローカルは REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
"""
import os
import sys
import json
import glob
import shutil
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
GDIR = os.path.join(HERE, "..", "pwa", "gifuya")
FEED = os.path.join(GDIR, "feed.json")
MUSIC_DIR = os.path.join(HERE, "public", "music", "uptempo")   # gifuya_photos.py music が Drive から入れる


def _tracks():
    """利用可能なBGM（public/music/uptempo/*.mp3）。無ければ bgm.mp3 の1本にフォールバック。"""
    t = sorted(os.path.basename(x) for x in glob.glob(os.path.join(MUSIC_DIR, "*.mp3")))
    return ["music/uptempo/" + n for n in t] if t else ["bgm.mp3"]

PROPS = json.dumps({
    "storeName": "ぎふや 福岡天神店",
    "handle": "@gifuya_fukuokatenjin",
    "region": "福岡・天神",
}, ensure_ascii=False)

# 各動画 → (コンポジション, データ形式, 使用料理)。全て region-free 構成。
SPECS = [
    {"out": "dv_01.mp4", "comp": "TaishuHitosara", "data": "typo",
     "dishes": ["名物どて焼き", "刺身盛り合わせ", "馬刺し", "自家製鶏唐揚げ", "特製ごまさば", "赤鶏たたき"]},
    {"out": "dv_03.mp4", "comp": "TaishuShun", "data": "typo",
     "dishes": ["海鮮ユッケ", "特製ごまさば", "馬刺し", "刺身盛り合わせ", "明太ポテトサラダ", "厚揚げわさび"]},
    {"out": "dv_04.mp4", "comp": "TaishuAkanoren", "data": "typo",
     "dishes": ["刺身盛り合わせ", "名物どて焼き", "馬刺し", "赤鶏たたき", "自家製鶏唐揚げ", "特製ごまさば"]},
    {"out": "dv_05.mp4", "comp": "TaishuTanzaku", "data": "typo",
     "dishes": ["刺身盛り合わせ", "馬刺し", "特製ごまさば", "海鮮ユッケ", "赤鶏たたき", "名物どて焼き"]},
    {"out": "dv_07.mp4", "comp": "NorenStory", "data": "typo",
     "dishes": ["刺身盛り合わせ", "馬刺し", "名物どて焼き", "自家製鶏唐揚げ"]},
    {"out": "dv_08.mp4", "comp": "SimpleStory", "data": "simple",
     "dishes": ["刺身盛り合わせ"]},
    {"out": "dv_09.mp4", "comp": "TaishuHitosara", "data": "typo",
     "dishes": ["馬刺し", "赤鶏たたき", "刺身盛り合わせ", "特製ごまさば", "海鮮ユッケ", "名物どて焼き"]},
    {"out": "dv_12.mp4", "comp": "TaishuShun", "data": "typo",
     "dishes": ["名物どて焼き", "刺身盛り合わせ", "馬刺し", "特製ごまさば", "自家製鶏唐揚げ", "赤鶏たたき"]},
    {"out": "dv_14.mp4", "comp": "NorenStory", "data": "typo",
     "dishes": ["名物どて焼き", "刺身盛り合わせ", "馬刺し", "特製ごまさば"]},
    {"out": "dv_15.mp4", "comp": "OshinaTate", "data": "typo",
     "dishes": ["刺身盛り合わせ", "名物どて焼き", "特製ごまさば", "自家製鶏唐揚げ"]},
]

DATA_FILES = ["typoData.ts", "simpleData.ts"]
PUB_DIRS = ["typo"]


def _map():
    return {it["name"]: it["img"] for it in json.load(open(FEED, encoding="utf-8"))["items"]}


def _build_typo(dishes, m, music="bgm.mp3"):
    d = os.path.join(HERE, "public", "typo")
    if os.path.isdir(d):
        shutil.rmtree(d)
    os.makedirs(d)
    L = ["export const typoPhotos = ["]
    for i, name in enumerate(dishes):
        img = m.get(name)
        if not img:
            print("  WARN 未検出:", name); continue
        shutil.copyfile(os.path.join(GDIR, img), os.path.join(d, "%d.jpg" % i))
        L.append('  { src: "typo/%d.jpg", caption: "%s" },' % (i, name))
    L += ["];",
          'export const typoHeadline = "本日のおしながき";',
          'export const typoMusic = "%s";' % music,
          'export const typoUptempo = "%s";' % music]
    open(os.path.join(HERE, "src", "typoData.ts"), "w", encoding="utf-8").write("\n".join(L) + "\n")


def _build_simple(dishes, m):
    shutil.copyfile(os.path.join(GDIR, m[dishes[0]]), os.path.join(HERE, "public", "simple.jpg"))
    open(os.path.join(HERE, "src", "simpleData.ts"), "w", encoding="utf-8").write(
        'export const simplePhoto = "simple.jpg";\n'
        'export const simplePhrase = "%s、あります。";\n'
        "export const simpleHasLogo = true;\n"
        "export const simpleW = 1080;\n"
        "export const simpleH = 1350;\n"
        'export const simpleBg: string = "";\n'
        "export const simpleSeed = 0;\n" % dishes[0])


def _render(comp, out):
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    pp = os.path.join(HERE, "out", "gifuya_props.json")
    open(pp, "w", encoding="utf-8").write(PROPS)
    cmd = ["npx", "remotion", "render", comp, os.path.join(GDIR, out),
           "--props=" + pp, "--crf=18", "--concurrency=2"]
    br = os.environ.get("REMOTION_BROWSER")
    if br:
        cmd += ["--browser-executable=" + br, "--ignore-certificate-errors", "--timeout=120000"]
    print(">>", comp, "->", out)
    subprocess.run(cmd, cwd=HERE, check=True)


def main():
    only = [a.replace(".mp4", "") for a in sys.argv[1:] if a.strip()]
    m = _map()
    tracks = _tracks()   # Driveから取得したBGM群（無ければbgm.mp3）。動画ごとに別の曲を割当（三条と同じくランダム音楽）。
    print("[MUSIC] %d曲: %s" % (len(tracks), ", ".join(tracks)))
    done, failed = [], []
    try:
        for idx, s in enumerate(SPECS):
            if only and s["out"].replace(".mp4", "") not in only:
                continue
            music = tracks[idx % len(tracks)]
            if s["data"] == "typo":
                _build_typo(s["dishes"], m, music)
            else:
                _build_simple(s["dishes"], m)
            try:
                _render(s["comp"], s["out"])
                done.append(s["out"])
            except subprocess.CalledProcessError as e:
                print("  FAIL:", s["out"], e)
                failed.append(s["out"])
    finally:
        for f in DATA_FILES:
            subprocess.run(["git", "checkout", "--", os.path.join("src", f)], cwd=HERE)
        for d in PUB_DIRS:
            p = os.path.join(HERE, "public", d)
            if os.path.isdir(p):
                shutil.rmtree(p)
    print("DONE:", ", ".join(done) or "(なし)", "| FAILED:", ", ".join(failed) or "なし")


if __name__ == "__main__":
    main()
