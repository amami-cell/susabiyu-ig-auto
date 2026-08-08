# -*- coding: utf-8 -*-
"""ぎふやストーリー動画を、同期済みのDrive写真（pwa/gifuya/f_*.jpg＋feed.json）から再生成する。

各動画に対応する Remotion コンポジションへ、ぎふやの店名/地域/ハンドルを props で渡してレンダリング。
写真は typoData.ts＋public/typo/ を一時的にぎふや料理へ差し替えて使い、終了後に typoData.ts を git で元へ戻す
（三条の投稿データを壊さない）。

  使い方:
    python gifuya_render_stories.py            # 全対象を再レンダリング
    python gifuya_render_stories.py dv_05       # 指定だけ

  CI では npx remotion が Chromium を自動取得。ローカルは環境変数で headless_shell を指定:
    REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
"""
import os
import sys
import json
import shutil
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
GDIR = os.path.join(HERE, "..", "pwa", "gifuya")
FEED = os.path.join(GDIR, "feed.json")
TYPO_DIR = os.path.join(HERE, "public", "typo")
TYPO_DATA = os.path.join(HERE, "src", "typoData.ts")

# ぎふや福岡天神店のブランディング（各コンポジションは region/storeName/handle を props で受ける）。
PROPS = json.dumps({
    "storeName": "ぎふや 福岡天神店",
    "handle": "@gifuya_fukuokatenjin",
    "region": "福岡・天神",
}, ensure_ascii=False)

# 動画 → (コンポジション, 使用料理)。造り盛り(刺身盛り合わせ)を含む“お品書き系”が対象。
SPECS = [
    {"out": "dv_05.mp4", "comp": "TaishuTanzaku",
     "dishes": ["刺身盛り合わせ", "馬刺し", "特製ごまさば", "海鮮ユッケ", "赤鶏たたき", "名物どて焼き"]},
    {"out": "dv_15.mp4", "comp": "OshinaTate",
     "dishes": ["刺身盛り合わせ", "名物どて焼き", "特製ごまさば", "自家製鶏唐揚げ"]},
]


def _load_map():
    data = json.load(open(FEED, encoding="utf-8"))
    return {it["name"]: it["img"] for it in data["items"]}


def _build_typo(dishes, name2img):
    if os.path.isdir(TYPO_DIR):
        shutil.rmtree(TYPO_DIR)
    os.makedirs(TYPO_DIR, exist_ok=True)
    lines = ["export const typoPhotos = ["]
    for i, name in enumerate(dishes):
        img = name2img.get(name)
        if not img:
            print("  WARN: 料理が feed.json に見つかりません:", name)
            continue
        shutil.copyfile(os.path.join(GDIR, img), os.path.join(TYPO_DIR, "%d.jpg" % i))
        lines.append('  { src: "typo/%d.jpg", caption: "%s" },' % (i, name))
    lines += ["];",
              'export const typoHeadline = "本日のおしながき";',
              'export const typoMusic = "bgm.mp3";',
              'export const typoUptempo = "bgm.mp3";']
    open(TYPO_DATA, "w", encoding="utf-8").write("\n".join(lines) + "\n")


def _render(comp, out):
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    props_path = os.path.join(HERE, "out", "gifuya_props.json")
    open(props_path, "w", encoding="utf-8").write(PROPS)
    cmd = ["npx", "remotion", "render", comp, os.path.join(GDIR, out),
           "--props=" + props_path, "--crf=18", "--concurrency=2"]
    br = os.environ.get("REMOTION_BROWSER")
    if br:
        cmd += ["--browser-executable=" + br, "--ignore-certificate-errors", "--timeout=120000"]
    print(">>", " ".join(cmd[:6]), "...")
    subprocess.run(cmd, cwd=HERE, check=True)


def main():
    only = [a.replace(".mp4", "") for a in sys.argv[1:] if a.strip()]
    name2img = _load_map()
    done = []
    try:
        for s in SPECS:
            if only and s["out"].replace(".mp4", "") not in only and s["comp"] not in only:
                continue
            print("=== %s (%s) ===" % (s["out"], s["comp"]))
            _build_typo(s["dishes"], name2img)
            _render(s["comp"], s["out"])
            done.append(s["out"])
    finally:
        subprocess.run(["git", "checkout", "--", TYPO_DATA], cwd=HERE)
        if os.path.isdir(TYPO_DIR):
            shutil.rmtree(TYPO_DIR)
    print("DONE:", ", ".join(done) if done else "(対象なし)")


if __name__ == "__main__":
    main()
