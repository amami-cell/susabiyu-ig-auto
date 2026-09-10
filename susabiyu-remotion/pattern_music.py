# -*- coding: utf-8 -*-
"""No.7（yoshokutrio）だけ、音源と文言を固定する。

指定：「7だけ音楽とOPを固定。他の音楽はランダムでいい。7の曲を他が使うのも構わない」

固定しない他のテンプレは従来どおりの挙動に戻る。
  ・見本(render_samples)  : 音源一覧から並び順で割り当て（実行のたびに変わりうる）
  ・本番投稿(fetch_typo)  : random.choice で毎回ランダム

OPの案はテンプレごとにコード側で固定済み（No.7 は案7＝金の円環）なので、
ここで持つ必要があるのは音源だけ。文言も No.7 は承認された組み合わせのまま保つ。

値の出どころ：確認アプリの config に書かれている music/caption ラベルは実際の
動画と1つ分ずれていたため、「その mp4 を実際に焼いたときの生成ログ」を正とした。
No.7 の実際の曲は Somebody_(Prod._Khaim)。config が表示していた
Take_Me_To_The_Top は隣の No.10 のものだった。

音源を差し替えたい時はここの1行を書き換える。ファイル名の頭の「49秒～」が
再生開始位置になるので、開始位置を変えたい時は Drive 側で名前を付け替えればよい
（照合は曲名だけで行うので、秒数を変えても追随する）。
"""
import os, re, glob

# パターン名 → 音源ファイル名（拡張子なし。public/music/normal/ の中を探す）
MUSIC = {
    "yoshokutrio": "49秒～　Somebody_(Prod._Khaim)",
}

# パターン名 → 画面に出すフック文言
HOOK = {
    "yoshokutrio": "日常に、ひと皿の贅沢。",
}


def _key(name):
    """照合用のキー。ファイル名の頭の「49秒～」「1分23秒～」は“再生開始位置”の指定で、
    運用中に付け替えられる（＝曲は同じでも名前が変わる）。そこを落として曲名だけで
    照合する。全角/半角の空白・チルダ・大文字小文字の揺れも吸収する。"""
    # splitext は使わない。曲名にドットが含まれる（例 "Somebody_(Prod._Khaim)"）と
    # "._Khaim)" を拡張子と誤認して切り落としてしまい、照合が必ず外れる。
    # 実際の音源拡張子だけを末尾から取り除く。
    n = re.sub(r"\.(?:mp3|m4a|wav)$", "", os.path.basename(name or ""), flags=re.I)
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
