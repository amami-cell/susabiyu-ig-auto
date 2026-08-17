# -*- coding: utf-8 -*-
"""ぎふや料理写真(pwa/gifuya/f_*.jpg)から、各ストーリーコンポジション用のデータファイル＋public素材を組み立てる。
   音楽は存在する public/bgm.mp3 に固定（三条用の別音源が無くてもレンダリングが通るように）。
   使い終わったら caller が `git checkout -- src/*Data.ts` で三条データへ戻すこと。
"""
import os
import json
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
GDIR = os.path.join(HERE, "..", "pwa", "gifuya")
FEED = os.path.join(GDIR, "feed.json")

DEFAULT_DISHES = ["刺身盛り合わせ", "馬刺し", "名物どて焼き", "特製ごまさば", "自家製鶏唐揚げ", "赤鶏たたき"]


def _map():
    return {it["name"]: it["img"] for it in json.load(open(FEED, encoding="utf-8"))["items"]}


def _seq(subdir, dishes, m, digits=1):
    d = os.path.join(HERE, "public", subdir)
    if os.path.isdir(d):
        shutil.rmtree(d)
    os.makedirs(d)
    out = []
    for i, name in enumerate(dishes):
        img = m.get(name)
        if not img:
            print("  WARN 未検出:", name); continue
        fn = ("%0" + str(digits) + "d.jpg") % i
        shutil.copyfile(os.path.join(GDIR, img), os.path.join(d, fn))
        out.append((subdir + "/" + fn, name))
    return out


def _write_list(path, var, items, extra):
    L = ["export const %s = [" % var]
    for src, cap in items:
        L.append('  { src: "%s", caption: "%s" },' % (src, cap))
    L.append("];")
    L += extra
    open(os.path.join(HERE, "src", path), "w", encoding="utf-8").write("\n".join(L) + "\n")


def _single(pubname, dish, m):
    img = m.get(dish)
    shutil.copyfile(os.path.join(GDIR, img), os.path.join(HERE, "public", pubname))


def build(dishes=None):
    dishes = dishes or DEFAULT_DISHES
    m = _map()
    # 複数写真リスト系
    _write_list("typoData.ts", "typoPhotos", _seq("typo", dishes, m), [
        'export const typoHeadline = "本日のおしながき";',
        'export const typoMusic = "bgm.mp3";',
        'export const typoUptempo = "bgm.mp3";'])
    _write_list("tempoData.ts", "tempoPhotos", _seq("tempo", dishes, m), [
        'export const tempoMusic = "bgm.mp3";'])
    _write_list("kaitenData.ts", "kaitenPhotos", _seq("kaiten", dishes, m), [
        'export const kaitenMusic = "bgm.mp3";'])
    _write_list("photoData.ts", "photos", _seq("photos", dishes, m, digits=2), [
        "export const hasLogo: boolean = true;",
        'export const sushiMusic = "bgm.mp3";',
        'export const sushiUptempo = "bgm.mp3";'])
    # 単写真系
    _single("simple.jpg", dishes[0], m)
    open(os.path.join(HERE, "src", "simpleData.ts"), "w", encoding="utf-8").write(
        'export const simplePhoto = "simple.jpg";\n'
        'export const simplePhrase = "本日のおすすめ、あります。";\n'
        "export const simpleHasLogo = true;\n"
        "export const simpleW = 1080;\n"
        "export const simpleH = 1350;\n"
        'export const simpleBg: string = "";\n'
        "export const simpleSeed = 0;\n")
    _single("photostory.jpg", dishes[0], m)
    open(os.path.join(HERE, "src", "photoStoryData.ts"), "w", encoding="utf-8").write(
        'export const photoStoryPhoto = "photostory.jpg";\n'
        'export const photoStoryCaption = "本日のおすすめ、あります。";\n'
        "export const photoStoryHasLogo = true;\n"
        'export const photoStoryMusic = "bgm.mp3";\n'
        'export const photoStoryUptempo = "bgm.mp3";\n'
        'export const photoStoryGenre: string = "food";\n'
        'export const photoStoryBg: string = "";\n'
        "export const photoStorySeed = 0;\n")
    print("assets built for:", " / ".join(dishes))


if __name__ == "__main__":
    build(sys.argv[1:] or None)
