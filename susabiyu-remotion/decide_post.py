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

# 6パターン（動画4 / 静止画2）
VIDEO = ["sushi", "tempo", "typo", "photo"]
STILL = ["simple", "caption"]
ALL = VIDEO + STILL
LABEL = {
    "sushi": "動王道", "tempo": "動賑やか", "typo": "動雑誌",
    "photo": "動全画", "simple": "静額装", "caption": "静写真",
}

def day_kind(d):
    if d.weekday() >= 5:
        return True, "土日"
    if HAS_JP and jpholiday.is_holiday(d):
        return True, "祝日"
    return False, "平日"

def plan_day(d, open_hour):
    """その日の3枠を日付シードでランダム割り当て。最低1回は動画を保証。"""
    slots = [open_hour, 18, 20]
    rng = random.Random(d.strftime("%Y%m%d"))
    plan = {s: rng.choice(ALL) for s in slots}
    if not any(plan[s] in VIDEO for s in slots):
        plan[rng.choice(slots)] = rng.choice(VIDEO)
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
