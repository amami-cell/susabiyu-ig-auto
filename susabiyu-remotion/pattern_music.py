# -*- coding: utf-8 -*-
"""テンプレごとの「音源・文言」の固定割当。

値の出どころ（重要）：確認アプリの config に書かれている music/caption ラベルは
実際の動画と1つ分ずれていた（URLだけ差し替えてラベルを更新し忘れた結果）。
そのため値は「その mp4 を実際に焼いたときの生成ログ」を正として起こしている。
例）No.7 の実際の曲は Somebody_(Prod._Khaim)。config が表示していた
    Take_Me_To_The_Top は隣の No.10 のものだった。

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
import os, re, glob

# パターン名 → 音源ファイル名（拡張子なし。public/music/normal/ の中を探す）
MUSIC = {
    "yoshokudish":       "1分3秒～　Funky_droll_street",
    "yoshokuchalk":      "1分51秒～　Good_Evening_Sunset",
    "yoshokusizzle":     "20秒～　Cocktail_Glass",
    "yoshokumag":        "26秒～　Just_the_Record",
    "yoshokucine":       "26秒～　Just_the_Record",
    "yoshokuwine":       "49秒～　Somebody_(Prod._Khaim)",
    "yoshokutrio":       "49秒～　Somebody_(Prod._Khaim)",
    "yoshokupola":       "4秒～月の降る街",
    "yoshokutype":       "French_Toast",
    "yoshokuopen":       "49秒～　Take_Me_To_The_Top",
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
    "yoshokudish":       "この一皿に乾杯を。",
    "yoshokuchalk":      "肉と、赤と、いい夜と。",
    "yoshokusizzle":     "旨いを、遠慮なく。",
    "yoshokumag":        "腹ペコ、集合。",
    "yoshokucine":       "腹ペコ、集合。",
    "yoshokuwine":       "日常に、ひと皿の贅沢。",
    "yoshokutrio":       "日常に、ひと皿の贅沢。",
    "yoshokupola":       "肉バルの、実力。",
    "yoshokutype":       "いい夜の、はじまり。",
    "yoshokuopen":       "〆まで、旨い。",
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


def _key(name):
    """照合用のキー。ファイル名の頭の「49秒～」「1分23秒～」は“再生開始位置”の指定で、
    運用中に付け替えられる（＝曲は同じでも名前が変わる）。そこを落として曲名だけで
    照合する。全角/半角の空白・チルダ・大文字小文字の揺れも吸収する。"""
    n = os.path.splitext(os.path.basename(name or ""))[0]
    n = re.sub(r"^\s*(?:\d+\s*分)?\s*(?:\d+\s*秒)?\s*[～~〜]?\s*", "", n)
    n = n.replace("\u3000", " ").replace("_", " ")
    return re.sub(r"\s+", "", n).lower()


def music_path(pattern, tracks=None):
    """そのパターンに割り当てた音源の実ファイルパスを返す。
    見つからない時は "" を返し、呼び側は従来どおりのフォールバックに任せる
    （Drive側でファイルが消えても落とさないため）。"""
    stem = MUSIC.get(pattern)
    if not stem:
        return ""
    if tracks is None:
        tracks = sorted(glob.glob(os.path.join("public", "music", "normal", "*")))
    # ①完全一致（名前がそのまま残っている場合）
    for t in tracks:
        if os.path.splitext(os.path.basename(t))[0] == stem:
            return t
    # ②曲名だけで一致（頭の秒数指定が付け替えられている場合。開始位置は現在の名前に従う）
    k = _key(stem)
    for t in tracks:
        if _key(t) == k:
            return t
    return ""


def music_rel(pattern):
    """fetch_typo の FIXED_MUSIC に渡す相対パス（例 music/normal/xxx.mp3）。"""
    p = music_path(pattern)
    return ("music/normal/" + os.path.basename(p)) if p else ""


def hook(pattern):
    return HOOK.get(pattern, "")


def report(patterns, tracks):
    """どのパターンがどの音源に解決したかを1行にまとめて返す（ログ確認用）。
    解決できなかったものは ? を付ける。ログの末尾に出すので短く保つ。"""
    out = []
    for p in patterns:
        t = music_path(p, tracks)
        out.append("%s=%s" % (p.replace("yoshoku", ""), os.path.splitext(os.path.basename(t))[0] if t else "?" + (MUSIC.get(p) or "-")))
    return " | ".join(out)
