# -*- coding: utf-8 -*-
"""投稿パターンの“成績”をインサイトから算出して、ローテの重み(倍率)を返す。
データ源（三条＝既定アカウント。他店と混ざらないよう三条のパターンだけ対象）:
  ・投稿履歴タブ「投稿履歴」 … C=パターン / E=IG_ID(media_id)
  ・インサイトタブ「インサイト投稿」 … B=media_id / F=リーチ / I=保存
成績スコア = 平均(リーチ + 3×保存)。中央値で正規化し 0.4〜2.5 の倍率にクランプ。
データが無いパターンは倍率1.0（＝探索：ちゃんと出して成績を貯める）。
シート不通・データ不足なら {} を返す → decide_post は従来どおり均等（安全側）。
"""
HIST_TAB = "投稿履歴"
POST_TAB = "インサイト投稿"          # 三条は無印（他店は _account 付き）
MIN_POSTS_TOTAL = 8                  # これ未満は探索優先で重み付けしない
_CACHE = None


def _to_int(x):
    try:
        return int(float(str(x).replace(",", "").strip()))
    except Exception:
        return None


def pattern_scores(valid_patterns=None):
    """{pattern: 倍率} を返す。失敗/データ不足時は {}（＝均等運用）。"""
    global _CACHE
    if _CACHE is not None:
        return _CACHE
    weights = {}
    try:
        import poster
        sh = poster._sheets()
        if not sh or not poster.SHEET_ID:
            return {}
        hist = sh.values().get(spreadsheetId=poster.SHEET_ID, range=HIST_TAB + "!A:F").execute().get("values", [])
        posts = sh.values().get(spreadsheetId=poster.SHEET_ID, range=POST_TAB + "!A:Q").execute().get("values", [])
        # media_id -> (reach, saved)
        metric = {}
        for i, r in enumerate(posts):
            if i == 0 or len(r) < 6:
                continue
            mid = str(r[1]).strip()
            reach = _to_int(r[5]) if len(r) > 5 else None
            saved = _to_int(r[8]) if len(r) > 8 else 0
            if mid and reach is not None:
                metric[mid] = (reach, saved or 0)
        # pattern -> [score,...]
        acc = {}
        total = 0
        for i, r in enumerate(hist):
            if i == 0 or len(r) < 5:
                continue
            pat = str(r[2]).strip()
            mid = str(r[4]).strip()
            if valid_patterns is not None and pat not in valid_patterns:
                continue            # 他店/未知パターンは除外（三条のみ採点）
            if mid in metric:
                reach, saved = metric[mid]
                acc.setdefault(pat, []).append(reach + 3 * saved)
                total += 1
        if total < MIN_POSTS_TOTAL:
            print("[PERF] データ%d件（<%d）→探索優先で均等運用" % (total, MIN_POSTS_TOTAL))
            _CACHE = {}
            return _CACHE
        avgs = {p: (sum(v) / len(v)) for p, v in acc.items() if v}
        vals = sorted(avgs.values())
        med = vals[len(vals) // 2] if vals else 0
        if med <= 0:
            _CACHE = {}
            return _CACHE
        for p, a in avgs.items():
            w = a / med
            weights[p] = max(0.4, min(2.5, w))   # 独り勝ち/干殺しを防ぐクランプ
        print("[PERF] 重み(倍率):", {p: round(w, 2) for p, w in sorted(weights.items(), key=lambda x: -x[1])})
    except Exception as e:
        print("[PERF] 取得失敗→均等運用:", e)
        _CACHE = {}
        return _CACHE
    _CACHE = weights
    return _CACHE


def weight_of(pattern, scores):
    """データのあるパターンは成績倍率、無いパターンは1.0（探索）。"""
    return scores.get(pattern, 1.0) if scores else 1.0
