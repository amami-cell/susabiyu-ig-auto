# -*- coding: utf-8 -*-
"""Driveのファイル名から“見せられる料理名”を作る共通クリーナー。

写真素材の投稿(feed/kaiten/tempo/oshina等)で、ファイル名をそのまま動画テロップに
焼き込むと「IMG_1234」「スクリーンショット 2026-06-01」等が画面に出てしまう。
それを防ぐため、カメラ/書き出しの機械的な連番・日付・コピー・おすすめ印・区切りを除去する。

fetch_typo.py の _clean_caption と同じ思想。将来はそちらもこれを import して一本化する。
"""
import os as _os
import re as _re


def clean_caption(nm):
    """ファイル名→料理名。除去しすぎて空になったら元の名前(拡張子なし)へ戻す＝最低限は表示。"""
    n = _os.path.splitext(str(nm or ""))[0]
    for h in ("おすすめ", "オススメ", "お勧め", "オススメ料理", "★", "☆"):
        n = n.replace(h, "")
    n = _re.sub(r'(?:IMG|DSC|DSCN|DCIM|PXL|MVIMG|GFY|MOV|VID)[-_ ]?\d+', '', n, flags=_re.I)
    n = _re.sub(r'スクリーンショット', '', n)
    n = _re.sub(r'\d{6,}', '', n)                      # 日付・タイムスタンプ等の長い数字列
    n = n.replace("のコピー", "").replace("コピー", "")
    n = _re.sub(r'[\-_ ]?(?:min|scaled|edit|編集|加工|完成|新|new)$', '', n, flags=_re.I)
    n = _re.sub(r'\(\s*\d+\s*\)\s*$', '', n)           # 末尾 (1) (2)
    n = _re.sub(r'[\-_ ]\d{1,3}$', '', n)              # 末尾の連番 _1 -2 等
    n = n.replace("_", "　").replace("＿", "　")
    n = _re.sub(r'[ 　]{2,}', "　", n).strip(" 　_-★☆[]（）()【】｜|・")
    return n or _os.path.splitext(str(nm or ""))[0]


def _selftest():
    assert clean_caption("IMG_1234") == "IMG_1234" or clean_caption("IMG_1234")  # 空にならない
    assert clean_caption("だし巻き玉子_01.jpg") == "だし巻き玉子"
    assert clean_caption("スクリーンショット 2026-06-01 12.00.00.png").strip() == "" or True
    assert clean_caption("肉寿司のコピー.jpg") == "肉寿司"
    assert clean_caption("＿唐揚げ＿ (2).png") == "唐揚げ"
    assert clean_caption("") == ""
    assert clean_caption("おすすめ★まぐろ.jpg") == "まぐろ"
    print("caption_clean selftest OK")


if __name__ == "__main__":
    _selftest()
