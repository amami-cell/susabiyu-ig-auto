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


def _video_for_day(d):
    """採用中の動画パターンをなるべく均等に。N日ごとに全採用種が1回ずつ出る。
    日付で決まるのでprepare/postで一致し、再実行しても同じ結果になる。"""
    vids = _enabled_videos()
    n = len(vids) or 1
    if not vids:
        vids = list(CORE_VIDEO)
        n = len(vids)
    o = d.toordinal()
    def order(b):
        r = random.Random("vblock-%d" % b)
        L = list(vids)
        r.shuffle(L)
        return L
    cur = order(o // n)
    # ブロック境界で前日と同じ動画にならないよう、先頭が前ブロック末尾と同じなら1つ回す
    if n > 1 and cur[0] == order(o // n - 1)[n - 1]:
        cur = cur[1:] + cur[:1]
    return cur[o % n]


def plan_day(d, open_hour):
    """その日の3枠を割り当て。動画は4種を均等に回す。静止画は日付シードでランダム。最低1回は動画。"""
    slots = [open_hour, 18, 20]
    rng = random.Random(d.strftime("%Y%m%d"))
    video_slot = rng.choice(slots)
    vpat = _video_for_day(d)
    stills = _enabled_stills() or list(CORE_STILL)
    plan = {}
    for s in slots:
        plan[s] = vpat if s == video_slot else rng.choice(stills)
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
