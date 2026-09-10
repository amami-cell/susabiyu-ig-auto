# -*- coding: utf-8 -*-
"""テンプレごとの「音源・文言」の固定割当。

これまで音源と文言は render_samples.py の中で _tracks[idx % len(_tracks)] ＝
「そのとき実行したパターンの並び順」で決めていた。そのため一部だけ再レンダリング
すると順番がずれ、同じテンプレでも音楽と文言が毎回変わってしまっていた。
さらに本番投稿(prepare.py)は fetch_typo の random.choice で音源を引いていたため、
見本で確認した「テンプレ×音楽」の組み合わせが本番では再現されなかった。

ここでパターン名に紐づけて固定することで、
  ・見本を一部だけ焼き直しても組み合わせが変わらない
  ・本番投稿でも見本と同じ音源・文言で出る
  ・ランダムなのは料理写真だけ（fetch_typo の shuffle）
という状態にする。値は承認済みの見本(config.nagagutsu.js)から起こしたもの。

音源を差し替えたい時はここの1行を書き換える。ファイル名の「1分23秒～」の部分が
再生開始位置になる（render_samples/_mstart が読む）ので、名前ごと変える。
"""
import os, glob

# パターン名 → 音源ファイル名（拡張子なし。public/music/normal/ の中を探す）
MUSIC = {
    "yoshokudish":       "1分23秒～　愛の傘下",
    "yoshokuchalk":      "1分3秒～　Funky_droll_street",
    "yoshokusizzle":     "1分51秒～　Good_Evening_Sunset",
    "yoshokumag":        "20秒～　Cocktail_Glass",
    "yoshokucine":       "26秒～　Just_the_Record",
    "yoshokuwine":       "49秒～　Somebody_(Prod._Khaim)",
    "yoshokutrio":       "49秒～　Take_Me_To_The_Top",
    "yoshokupola":       "4秒～月の降る街",
    "yoshokutype":       "French_Toast",
    "yoshokuopen":       "paving_walkway",
    "yoshokumagazine":   "1分23秒～　愛の傘下",
    "yoshokuopblur":     "1分51秒～　Good_Evening_Sunset",
    "yoshokuopmortar":   "20秒～　Cocktail_Glass",
    "yoshokuopwine":     "26秒～　Just_the_Record",
    "yoshokuop4":        "1分23秒～　愛の傘下",
    "yoshokuop5":        "1分3秒～　Funky_droll_street",
    "yoshokuop6":        "1分51秒～　Good_Evening_Sunset",
    "yoshokuop7":        "20秒～　Cocktail_Glass",
    "yoshokuop8":        "26秒～　Just_the_Record",
    "yoshokuop9":        "1分23秒～　愛の傘下",
}

# パターン名 → 画面に出すフック文言
HOOK = {
    "yoshokudish":       "今夜は、肉。",
    "yoshokuchalk":      "この一皿に乾杯を。",
    "yoshokusizzle":     "肉と、赤と、いい夜と。",
    "yoshokumag":        "旨いを、遠慮なく。",
    "yoshokucine":       "腹ペコ、集合。",
    "yoshokuwine":       "日常に、ひと皿の贅沢。",
    "yoshokutrio":       "〆まで、旨い。",
    "yoshokupola":       "肉バルの、実力。",
    "yoshokutype":       "いい夜の、はじまり。",
    "yoshokuopen":       "〜コスパ良く日常に贅沢を〜",
    "yoshokumagazine":   "今夜は、肉。",
    "yoshokuopblur":     "肉と、赤と、いい夜と。",
    "yoshokuopmortar":   "旨いを、遠慮なく。",
    "yoshokuopwine":     "腹ペコ、集合。",
    "yoshokuop4":        "今夜は、肉。",
    "yoshokuop5":        "この一皿に乾杯を。",
    "yoshokuop6":        "肉と、赤と、いい夜と。",
    "yoshokuop7":        "旨いを、遠慮なく。",
    "yoshokuop8":        "腹ペコ、集合。",
    "yoshokuop9":        "今夜は、肉。",
}


def music_path(pattern, tracks=None):
    """そのパターンに割り当てた音源の実ファイルパスを返す。
    見つからない時は "" を返し、呼び側は従来どおりのフォールバックに任せる
    （Drive側でファイル名が変わっても落とさないため）。"""
    stem = MUSIC.get(pattern)
    if not stem:
        return ""
    if tracks is None:
        tracks = sorted(glob.glob(os.path.join("public", "music", "normal", "*")))
    for t in tracks:
        if os.path.splitext(os.path.basename(t))[0] == stem:
            return t
    return ""


def music_rel(pattern):
    """fetch_typo の FIXED_MUSIC に渡す相対パス（例 music/normal/xxx.mp3）。"""
    p = music_path(pattern)
    return ("music/normal/" + os.path.basename(p)) if p else ""


def hook(pattern):
    return HOOK.get(pattern, "")
