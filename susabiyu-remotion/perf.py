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


# ---- A2: 曜日ごとの“伸びる時間帯”を学習（読み取り専用・スケジュール変更はまだしない） ----
_HOURS_CACHE = None
MIN_POSTS_PER_WD = 3   # その曜日でこの件数未満は学習しない（既定時間のまま）


def best_hours_by_weekday():
    """{weekday(0=月): [(hour, 平均リーチ), ...] 降順} を返す。失敗時 {}。
    「投稿履歴」の日時から曜日・時、media_id経由で「インサイト投稿」のリーチを突合。"""
    global _HOURS_CACHE
    if _HOURS_CACHE is not None:
        return _HOURS_CACHE
    out = {}
    try:
        import poster, datetime
        sh = poster._sheets()
        if not sh or not poster.SHEET_ID:
            return {}
        hist = sh.values().get(spreadsheetId=poster.SHEET_ID, range=HIST_TAB + "!A:F").execute().get("values", [])
        posts = sh.values().get(spreadsheetId=poster.SHEET_ID, range=POST_TAB + "!A:Q").execute().get("values", [])
        reach = {}
        for i, r in enumerate(posts):
            if i == 0 or len(r) < 6:
                continue
            v = _to_int(r[5])
            if str(r[1]).strip() and v is not None:
                reach[str(r[1]).strip()] = v
        # (weekday, hour) -> [reach,...]
        bucket = {}
        for i, r in enumerate(hist):
            if i == 0 or len(r) < 5:
                continue
            mid = str(r[4]).strip()
            if mid not in reach:
                continue
            ds = str(r[0]).strip()[:16]
            dt = None
            for fmt in ("%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M"):
                try:
                    dt = datetime.datetime.strptime(ds, fmt); break
                except Exception:
                    pass
            if not dt:
                continue
            bucket.setdefault(dt.weekday(), {}).setdefault(dt.hour, []).append(reach[mid])
        for wd, hours in bucket.items():
            ranked = sorted(
                ((h, sum(v) / len(v)) for h, v in hours.items() if len(v) >= 1),
                key=lambda x: -x[1])
            n = sum(len(v) for v in hours.values())
            if n >= MIN_POSTS_PER_WD and ranked:
                out[wd] = [(h, round(a, 1)) for h, a in ranked]
    except Exception as e:
        print("[PERF] best_hours失敗:", e); return {}
    _HOURS_CACHE = out
    return out


# ---- A3: ハッシュタグ成績（キャプション内の#タグ×リーチ）。効いてる/弱いを可視化 ----
_TAGS_CACHE = None
MIN_TAG_USES = 3   # この回数以上使ったタグだけ評価（少数は誤差が大きい）


def tag_performance():
    """[(tag, 平均リーチ, 使用回数), ...] を平均リーチ降順で返す。失敗/不足時 []。
    「インサイト投稿」の E=キャプション から #タグ を抽出し F=リーチ を突合。"""
    global _TAGS_CACHE
    if _TAGS_CACHE is not None:
        return _TAGS_CACHE
    import re
    try:
        import poster
        sh = poster._sheets()
        if not sh or not poster.SHEET_ID:
            return []
        posts = sh.values().get(spreadsheetId=poster.SHEET_ID, range=POST_TAB + "!A:Q").execute().get("values", [])
        agg = {}
        for i, r in enumerate(posts):
            if i == 0 or len(r) < 6:
                continue
            cap = r[4] if len(r) > 4 else ""
            reach = _to_int(r[5])
            if reach is None or not cap:
                continue
            seen = set()
            for t in re.findall(r"#[^\s#　]+", cap):
                k = t.lower()
                if k in seen:
                    continue
                seen.add(k)
                agg.setdefault(t, []).append(reach)
        ranked = [(t, sum(v) / len(v), len(v)) for t, v in agg.items() if len(v) >= MIN_TAG_USES]
        ranked.sort(key=lambda x: -x[1])
        _TAGS_CACHE = ranked
    except Exception as e:
        print("[PERF] tag_performance失敗:", e); return []
    return _TAGS_CACHE
