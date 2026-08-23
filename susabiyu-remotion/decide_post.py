# -*- coding: utf-8 -*-
import sys, datetime, random

try:
    from zoneinfo import ZoneInfo
    JST = ZoneInfo("Asia/Tokyo")
except Exception:
    JST = datetime.timezone(datetime.timedelta(hours=9))

try:
    import jpholiday
    HAS_JP = True
except ImportError:
    HAS_JP = False

WD = ["月", "火", "水", "木", "金", "土", "日"]

# 三条＝大衆酒場トーンのパターンで投稿する。
# 「見本」タブで採用になっているものだけがローテに入る（動画も画像も）。
# シートに繋がらない時の安全側フォールバックは CORE_VIDEO / CORE_STILL。
CORE_VIDEO = ["taishuodo", "taishutempo", "taishuzen", "taishuoshina"]
NEW_VIDEO = ["taishufuda", "taishukaiten", "taishuoshi", "taishushinbun", "taishugrid",
             "taishutanzaku", "taishunoren", "taishushun", "taishuhito", "sanjokaiten"]
VIDEO = CORE_VIDEO + NEW_VIDEO
CORE_STILL = ["taishucap"]   # 公式のれんデザイン
NEW_STILL = ["taishugaku", "taishuimga", "taishuimga2", "taishuimgb",
             "taishuimgd", "taishuimge", "taishuimgf"]
STILL = CORE_STILL + NEW_STILL
ALL = VIDEO + STILL
LABEL = {
    "taishuodo": "動王道", "taishutempo": "動賑や", "taishuzen": "動全画",
    "taishuoshina": "動品書", "taishufuda": "動値札", "taishukaiten": "動回転",
    "taishuoshi": "動黒板", "taishushinbun": "動新聞", "taishugrid": "動格子",
    "taishutanzaku": "動短冊", "taishunoren": "動暖簾", "taishushun": "動旬",
    "taishuhito": "動一皿", "sanjokaiten": "動回烏",
    "taishucap": "静のれん", "taishugaku": "静額装",
    "taishuimga": "静提灯", "taishuimga2": "静提灯2", "taishuimgb": "静チラシ",
    "taishuimgd": "静紺のれ", "taishuimge": "静黄ポ", "taishuimgf": "静白抜",
}

def day_kind(d):
    if d.weekday() >= 5:
        return True, "土日"
    if HAS_JP and jpholiday.is_holiday(d):
        return True, "祝日"
    return False, "平日"

_ENABLED_CACHE = None
def _enabled_patterns():
    """ギャラリーで「採用」になっている(動画リスト, 画像リスト)を返す。
    スプレッドの「パターン」タブ(A=pattern, F=enabled)を読む。
    シート未接続や全無効など取得できないときは安全側でCOREのみを使う。"""
    global _ENABLED_CACHE
    if _ENABLED_CACHE is not None:
        return _ENABLED_CACHE
    vids = list(CORE_VIDEO)   # シート不可時の安全側（新型は採用されるまで投稿しない）
    stills = list(CORE_STILL)
    try:
        import poster
        sh = poster._sheets()
        if sh and poster.SHEET_ID:
            rows = sh.values().get(spreadsheetId=poster.SHEET_ID,
                                   range="パターン!A:F").execute().get("values", [])
            off = ("0", "false", "no", "off", "×", "x", "無", "なし")
            en = []
            for i, r in enumerate(rows):
                if i == 0 or not r:
                    continue
                key = str(r[0]).strip()
                val = (str(r[5]).strip().lower() if len(r) > 5 and str(r[5]).strip() != "" else "1")
                if val not in off:
                    en.append(key)
            keep_v = [k for k in VIDEO if k in en]   # 並び順を保つ＝決定的
            keep_s = [k for k in STILL if k in en]
            if keep_v:
                vids = keep_v
            if keep_s:
                stills = keep_s
            print("[ENABLED] 採用動画:", vids, "/ 採用画像:", stills)
    except Exception as e:
        print("[ENABLED] パターン取得失敗（COREのみ使用）:", e)
    _ENABLED_CACHE = (vids, stills)
    return _ENABLED_CACHE

def _enabled_videos():
    return _enabled_patterns()[0]

def _enabled_stills():
    return _enabled_patterns()[1]


# ---- 成績で自動重み付け（インサイト×履歴）。データ不足時は均等（＝従来挙動）に自動フォールバック ----
_SCORES_CACHE = None
def _scores():
    global _SCORES_CACHE
    if _SCORES_CACHE is None:
        try:
            import perf
            _SCORES_CACHE = perf.pattern_scores(set(ALL))   # 三条パターンのみ採点
        except Exception as e:
            print("[PERF] スコア取得不可→均等:", e); _SCORES_CACHE = {}
    return _SCORES_CACHE

def _wpick(pool, rng):
    """poolから“成績倍率”で重み付けして1つ選ぶ。rngは日付シード＝決定的。
    データの無いパターンは倍率1.0＝ちゃんと出て成績を貯める（探索）。"""
    pool = list(pool)
    if not pool:
        return None
    sc = _scores()
    ws = []
    for p in pool:
        try:
            import perf
            ws.append(perf.weight_of(p, sc))
        except Exception:
            ws.append(1.0)
    tot = sum(ws) or float(len(pool))
    x = rng.random() * tot
    c = 0.0
    for p, w in zip(pool, ws):
        c += w
        if x <= c:
            return p
    return pool[-1]


def _video_for_day(d):
    """その日の動画パターンを“成績で重み付け”して選ぶ（日付シード＝決定的・prepare/post一致）。
    前日と同じ動画は避ける。データ不足時は倍率1.0＝均等（従来と同等の挙動）。"""
    vids = list(_enabled_videos() or CORE_VIDEO)
    if len(vids) <= 1:
        return vids[0] if vids else CORE_VIDEO[0]
    o = d.toordinal()
    pick = _wpick(vids, random.Random("vday-%d" % o))
    prev = _wpick(vids, random.Random("vday-%d" % (o - 1)))
    if pick == prev:
        rest = [v for v in vids if v != pick] or vids
        pick = _wpick(rest, random.Random("vday2-%d" % o))
    return pick


def plan_day(d, open_hour):
    """その日の3枠を割り当て。1枠は動画（必ず1本以上）、残りは静止画。
    いずれも“成績で重み付け”して選ぶ（日付シードで決定的）。同じ日に同テンプレは重複させない。"""
    slots = [open_hour, 18, 20]
    rng = random.Random(d.strftime("%Y%m%d"))
    video_slot = rng.choice(slots)
    vpat = _video_for_day(d)
    stills = list(_enabled_stills() or CORE_STILL)
    plan = {}
    used = set()
    for s in slots:
        if s == video_slot:
            plan[s] = vpat
        else:
            avail = [p for p in stills if p not in used] or stills
            plan[s] = _wpick(avail, random.Random("still-%s-%d" % (d.strftime("%Y%m%d"), s)))
            used.add(plan[s])
    return slots, plan

def decide(dt):
    d = dt.date()
    hol, kind = day_kind(d)
    open_hour = 11 if hol else 16
    slots, plan = plan_day(d, open_hour)
    hour = dt.hour
    pattern = plan.get(hour)
    media = "video" if pattern in VIDEO else ("still" if pattern else None)
    slot = "open" if hour == open_hour else ("mid" if hour == 18 else ("late" if hour == 20 else None))
    return {
        "date": str(d), "kind": kind, "open_hour": open_hour, "slot": slot,
        "active": hour in slots, "media": media, "pattern": pattern,
        "plan": {str(k): plan[k] for k in slots},
    }

def main():
    if len(sys.argv) > 1:
        s = " ".join(sys.argv[1:])
        try:
            dt = datetime.datetime.fromisoformat(s)
        except ValueError:
            print('日時の形式: "2026-06-22 16:00"')
            return
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=JST)
        print(decide(dt))
        return

    if not HAS_JP:
        print("注意: jpholiday 未インストール。祝日は土日のみで判定します。\n")
    today = datetime.datetime.now(JST).date()
    print("=== 2週間プレビュー（各枠の割り当て）===")
    print("日付         曜  OPEN     OPEN枠  18:00   20:00  動画数")
    for i in range(14):
        d = today + datetime.timedelta(days=i)
        hol, kind = day_kind(d)
        oh = 11 if hol else 16
        _, plan = plan_day(d, oh)
        slots = [oh, 18, 20]
        vids = sum(1 for s in slots if plan[s] in VIDEO)
        mk = WD[d.weekday()] + ("祝" if kind == "祝日" else "  ")
        cells = "  ".join(LABEL[plan[s]] for s in slots)
        print(f"{d}  {mk}  {oh:>2}:00   {cells}    {vids}")
    print("\n各枠=6パターンから完全ランダム。動画が0なら1枠を動画に強制（必ず1日1本以上）。")

if __name__ == "__main__":
    main()
