# -*- coding: utf-8 -*-
# カテゴリ整合キャプション。
# 寿司系の画像にだけ寿司キャプション（握ります／一貫／ネタ等）を出し、
# それ以外（うどん・一品・ドリンク等）には汎用キャプションのみを使う。
# 寿司系かどうかはフォルダ名(cat)にキーワードが含まれるかで自動判定するので、
# 店舗やフォルダ名が増えても“寿司と確定できない画像には寿司句を出さない”側に
# 安全に倒れる。23店舗展開しても各店フォルダ名のままで破綻しない。
import json, os, random

# フォルダ名にこれらが含まれれば「寿司系」とみなす（大文字小文字無視）。
_SUSHI_KEYS = ("寿司", "鮨", "握り", "にぎり", "刺身", "鮮魚", "海鮮", "ネタ",
               "sushi", "sashimi", "nigiri")


def load():
    """phrases.json を {"generic":[...], "sushi":[...], "atmosphere":[...]} で返す。
    旧形式（ただのリスト）の場合は全件“汎用”として安全側で扱う。"""
    try:
        d = json.load(open("phrases.json", encoding="utf-8"))
    except Exception:
        return {"generic": [], "sushi": [], "atmosphere": []}
    if isinstance(d, list):
        return {"generic": list(d), "sushi": [], "atmosphere": []}
    return {"generic": list(d.get("generic", [])),
            "sushi": list(d.get("sushi", [])),
            "atmosphere": list(d.get("atmosphere", []))}


def is_sushi_cat(cat):
    c = (cat or "").lower()
    return any(k.lower() in c for k in _SUSHI_KEYS)


def pick(cats):
    """表示する画像のカテゴリ名リストを受け取り、整合するキャプションを1つ返す。
    表示画像が“全て”寿司系のときだけ寿司句を解禁。1枚でも非寿司が混じれば汎用のみ。
    FIXED_CAPTION 環境変数があればそれを最優先（やり直し・固定再現用）。"""
    fixed = os.environ.get("FIXED_CAPTION")
    if fixed:
        return fixed
    ph = load()
    pool = list(ph["generic"])
    cl = [c for c in (cats or []) if c]
    if cl and all(is_sushi_cat(c) for c in cl):
        pool += ph["sushi"]
    if not pool:
        pool = ph["generic"] or ph["sushi"]
    return random.choice(pool) if pool else ""


def pick_atmosphere():
    """ドリンク・外観・内観・コース用。料理を一切感じさせない“雰囲気フレーズ”のみ。
    肴・旬・ひと皿などの料理語は atmosphere プールに含めない設計。
    FIXED_CAPTION があればそれを最優先（やり直し・固定再現用）。"""
    fixed = os.environ.get("FIXED_CAPTION")
    if fixed:
        return fixed
    ph = load()
    pool = list(ph.get("atmosphere") or [])
    if not pool:
        _food = ("肴", "旬", "ひと皿", "一皿", "握", "寿司", "鮨", "おすすめ揃")
        pool = [s for s in ph.get("generic", []) if not any(k in s for k in _food)]
    return random.choice(pool) if pool else "京都の夜は、すさびで。"
