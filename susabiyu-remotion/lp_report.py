#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LP（予約/アクセスLP）のアクセス定期レポート。
スプレッドシートの「LPアクセス」タブ（時刻/店/イベント/ラベル/訪問ID/参照元/UA）を集計し、
LPを作っている**全店舗**（＝タブに現れる店を自動検出。今後の新店も自動で対象）について
・表示(view)／クリック／ユニーク訪問（＝重複を除いた実人数≒端末数）
・クリックの内訳（席予約・Instagram・地図・口コミ・電話・コース等）
・直近7日と全期間、最新アクセス時刻
をログに出す。GitHub Actions のログをそのまま報告に使う（DM監視と同じ運用）。

使い方: python lp_report.py            # SHEET_ID/creds は環境変数から
        DAYS=7 python lp_report.py    # 直近Nの窓を変更（既定7）
"""
import os, sys, datetime
import poster

TAB = "LPアクセス"
JST = poster.JST

# 店キー→表示名（未知キーはそのまま出す＝新店を自動的に拾う）
FRIENDLY = {
    "susabiyu":  "三条（すさび湯 河原町三条）",
    "nagagutsu": "ナガグツ（梅田・堂山町）",
    "goldporta": "GOLD京都ポルタ",
    "gifuya":    "ぎふや 福岡天神",
    "gifuyatenjin": "ぎふや 福岡天神",
}

def _parse(ts):
    ts = (ts or "").strip()
    for fmt in ("%Y/%m/%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d %H:%M", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(ts, fmt).replace(tzinfo=JST)
        except Exception:
            pass
    return None

def main():
    days = int(os.environ.get("DAYS", "7") or "7")
    poster.SHEET_ID = (os.environ.get("SHEET_ID") or getattr(poster, "SHEET_ID", "") or "").strip()
    sh = poster._sheets()
    if not sh or not poster.SHEET_ID:
        print("[LP][ERR] SHEET_ID か Google 認証が無いため集計できません")
        return
    try:
        vals = sh.values().get(spreadsheetId=poster.SHEET_ID, range=TAB + "!A:G").execute().get("values", [])
    except Exception as e:
        print("[LP][ERR] 「%s」タブ読取失敗: %s" % (TAB, e)); return

    now = datetime.datetime.now(JST)
    cutoff = now - datetime.timedelta(days=days)
    stores = {}   # key -> dict
    for r in vals:
        if not r or len(r) < 3:
            continue
        store = (r[1] if len(r) > 1 else "").strip()
        ev = (r[2] if len(r) > 2 else "").strip()
        if ev not in ("view", "click"):   # ヘッダ行や空行を除外
            continue
        label = (r[3] if len(r) > 3 else "").strip()
        vid = (r[4] if len(r) > 4 else "").strip()
        dt = _parse(r[0] if r else "")
        s = stores.setdefault(store, {"view": 0, "click": 0, "vids": set(),
                                      "labels": {}, "v7": 0, "c7": 0, "vids7": set(),
                                      "last": None})
        recent = (dt is not None and dt >= cutoff)
        if ev == "view":
            s["view"] += 1
            if recent: s["v7"] += 1
        else:
            s["click"] += 1
            if label:
                s["labels"][label] = s["labels"].get(label, 0) + 1
            if recent: s["c7"] += 1
        if vid:
            s["vids"].add(vid)
            if recent: s["vids7"].add(vid)
        if dt and (s["last"] is None or dt > s["last"]):
            s["last"] = dt

    print("==== LPアクセス定期レポート（%s 時点 / 直近%d日窓）====" % (now.strftime("%Y-%m-%d %H:%M JST"), days))
    if not stores:
        print("[LP] まだアクセス記録がありません")
    # 表示名がある店を先に、その他（新店含む）は後ろに
    order = sorted(stores.keys(), key=lambda k: (k not in FRIENDLY, k))
    for k in order:
        s = stores[k]
        name = FRIENDLY.get(k, k or "(不明)")
        last = s["last"].strftime("%Y-%m-%d %H:%M") if s["last"] else "-"
        labs = "／".join("%s%d" % (lab, n) for lab, n in
                         sorted(s["labels"].items(), key=lambda x: -x[1])) or "なし"
        print("[LP][%s] 全期間 表示%d / クリック%d / ユニーク訪問%d ｜ 直近%d日 表示%d・クリック%d・ユニーク%d ｜ 最新=%s"
              % (name, s["view"], s["click"], len(s["vids"]),
                 days, s["v7"], s["c7"], len(s["vids7"]), last))
        print("[LP][%s]   クリック内訳（全期間）: %s" % (name, labs))
    # 注釈（毎回入れる）
    print("[LP][注] ユニーク訪問＝重複を除いたおおよその実人数（端末数）。同じ人が何回開いても1。")
    print("[LP][注] 端末・ブラウザが違う/シークレット/アプリ内→外部ブラウザで開き直すと別人と数える簡易指標。")

if __name__ == "__main__":
    main()
