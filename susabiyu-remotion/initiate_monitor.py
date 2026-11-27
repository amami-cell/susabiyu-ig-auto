# -*- coding: utf-8 -*-
"""イニシエート総合ページ用 monitor JSON 生成（読み取り専用）。

既存の insights 収集シート（インサイト投稿_<account> / インサイト日次_<account>）を読み、
pwa/initiate.html が読む pwa/initiate_monitor.json を出力する。

・Instagram Graph API は叩かない＝レート制限に当たらない・サムネは収集時に恒久ホスト済み。
・1プロセスで全店をまとめて処理する1ループ（店舗が増えても実行回数は増えない＝無料枠方針）。
・本番Instagramへ出す処理は一切しない（完全な読み取り専用）。

出力:
  pwa/initiate_monitor.json  … {stores:{<id>:{at,err,posts,stories,stat}}, bench:[...]}
  pwa/initiate_version.json  … {latest:<ISO>} … 画面の「更新監視」ポーリング用
"""
import os, sys, json, base64, datetime
import poster

try:
    from zoneinfo import ZoneInfo
    JST = ZoneInfo("Asia/Tokyo")
except Exception:
    JST = datetime.timezone(datetime.timedelta(hours=9))

_HERE = os.path.dirname(os.path.abspath(__file__))
OUT_MON = os.environ.get("INITIATE_MONITOR_OUT", os.path.join(_HERE, "..", "pwa", "initiate_monitor.json"))
OUT_VER = os.path.join(_HERE, "..", "pwa", "initiate_version.json")

# UI店ID → insights タブの接尾辞（""=三条）。UI(initiate.html)の STORE_MASTER と一致させること。
STORE_MAP = [
    ("sanjo",        ""),
    ("karasuma",     "karasuma"),
    ("goldporta",    "goldporta"),
    ("nagagutsu",    "nagagutsu"),
    ("komatsubara",  "komatsubara"),
    ("gifuyatenjin", "gifuyatenjin"),
]

# インサイト投稿タブの列（insights.py POST_HEADER と一致）
# 0取得日 1media_id 2種別 3投稿日時 4キャプション 5リーチ 6閲覧/再生 7いいね 8保存
# 9シェア 10コメント 11返信 12raw 13サムネ 14本体 15媒体種別 16リンク
# インサイト日次タブの列（DAILY_HEADER）: 0日付 1フォロワー数 2リーチ 3閲覧数 ...


def _num(x):
    try:
        if x is None or x == "":
            return 0
        return int(float(str(x).replace(",", "")))
    except Exception:
        return 0


def _norm_ts(ts):
    """IGの timestamp（例 2026-11-20T17:03:00+0000）を JS が確実に解釈できる +09:00 ISO に。"""
    ts = (ts or "").strip()
    if not ts:
        return ""
    try:
        t = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return t.astimezone(JST).isoformat()
    except Exception:
        return ts


def read_posts(sh, suf):
    tab = "インサイト投稿" + (("_" + suf) if suf else "")
    try:
        rows = sh.values().get(spreadsheetId=poster.SHEET_ID, range=tab + "!A:Q").execute().get("values", [])
    except Exception as e:
        print("[MON] %s 読めず: %s" % (tab, str(e)[:100]))
        return [], []
    posts, stories, seen = [], [], set()
    for i, r in enumerate(rows):
        if i == 0 or len(r) < 5:
            continue
        g = lambda k: (r[k] if len(r) > k else "")
        mid = str(g(1)).strip()
        if not mid or mid in seen:
            continue
        seen.add(mid)
        kind = str(g(2)).strip()
        ts = _norm_ts(str(g(3)).strip())
        if not ts:
            continue
        link = str(g(16)).strip()
        thumb = str(g(13)).strip()
        typ = "VIDEO" if str(g(15)).strip().lower() == "video" else "IMAGE"
        if kind == "story":
            stories.append({"at": ts, "id": mid, "url": link, "type": typ,
                            "views": _num(g(6)), "replies": _num(g(11)), "thumb": thumb})
        else:
            posts.append({"at": ts, "id": mid, "url": link, "type": typ,
                          "likes": _num(g(7)), "saved": _num(g(8)), "comments": _num(g(10)),
                          "reach": _num(g(5)), "views": _num(g(6)), "thumb": thumb,
                          "caption": str(g(4))})
    posts.sort(key=lambda p: p["at"], reverse=True)
    stories.sort(key=lambda p: p["at"], reverse=True)
    return posts[:200], stories[:105]


def read_daily(sh, suf):
    tab = "インサイト日次" + (("_" + suf) if suf else "")
    fol, mon = {}, {}
    try:
        rows = sh.values().get(spreadsheetId=poster.SHEET_ID, range=tab + "!A:I").execute().get("values", [])
    except Exception as e:
        print("[MON] %s 読めず: %s" % (tab, str(e)[:100]))
        return fol, mon
    for i, r in enumerate(rows):
        if i == 0 or len(r) < 2:
            continue
        d = str(r[0]).strip()[:10]
        if not d:
            continue
        f = _num(r[1]) if len(r) > 1 else 0
        v = _num(r[3]) if len(r) > 3 else 0   # 閲覧数
        if f:
            fol[d] = f
        if v:
            mk = d[:7]
            mon[mk] = mon.get(mk, 0) + v
    return fol, mon


def main():
    if not os.path.exists("creds.json") and os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
    sid = os.environ.get("SHEET_ID", "") or getattr(poster, "SHEET_ID", "")
    if sid:
        poster.SHEET_ID = sid
    sh = poster._sheets()
    if sh is None:
        raise SystemExit("シート接続に失敗（creds.json / SHEET_ID を確認）")

    now = datetime.datetime.now(JST)
    nowiso = now.isoformat()
    tm = now.strftime("%Y-%m")
    stores = {}
    for sid_ui, suf in STORE_MAP:
        posts, stories = read_posts(sh, suf)
        fol, mon = read_daily(sh, suf)
        mf = [p for p in posts if p["at"][:7] == tm]
        ms = [p for p in stories if p["at"][:7] == tm]
        hist = {tm: {"n": len(mf), "sn": len(ms),
                     "likes": sum(p["likes"] for p in mf), "reach": sum(p["reach"] for p in mf),
                     "saved": sum(p["saved"] for p in mf), "views": sum(p.get("views", 0) for p in mf),
                     "sviews": sum(p["views"] for p in ms), "comments": sum(p["comments"] for p in mf)}}
        stores[sid_ui] = {"at": nowiso, "err": "", "savedOk": True, "connected": True,
                          "posts": posts, "stories": stories,
                          "stat": {"fol": fol, "mon": mon, "hist": hist, "monErr": None}}
        print("[MON] %-12s(%-12s) posts=%3d stories=%3d fol=%3d mon=%d%s" % (
            sid_ui, (suf or "三条"), len(posts), len(stories), len(fol), len(mon),
            "" if (posts or stories or fol) else "  ← データ無し（insights未収集）"))

    # bench（直近28日の本数で3群・1店あたり平均）
    cut28 = (now - datetime.timedelta(days=28)).isoformat()
    groups = {"lo": [], "mid": [], "hi": []}
    for s in stores.values():
        pf = [p for p in s["posts"] if p["at"] >= cut28]
        pw = len(pf) / 4.0
        k = "lo" if pw < 1 else ("mid" if pw < 3 else "hi")
        likes = (sum(p["likes"] for p in pf) / len(pf)) if pf else 0
        reach = (sum(p["reach"] for p in pf) / len(pf)) if pf else 0
        ks = sorted(s["stat"]["fol"].keys())
        finc = (s["stat"]["fol"][ks[-1]] - s["stat"]["fol"][ks[0]]) if len(ks) >= 2 else 0
        groups[k].append((likes, reach, finc))
    bench = []
    for k in ("lo", "mid", "hi"):
        arr = groups[k]; n = len(arr)
        bench.append({"k": k, "stores": n,
                      "likes": round(sum(a[0] for a in arr) / n, 1) if n else 0,
                      "reach": round(sum(a[1] for a in arr) / n, 1) if n else 0,
                      "fol": round(sum(a[2] for a in arr) / n, 1) if n else 0})

    data = {"stores": stores, "bench": bench, "generatedAt": nowiso}
    outp = os.path.abspath(OUT_MON)
    os.makedirs(os.path.dirname(outp), exist_ok=True)
    with open(outp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.abspath(OUT_VER), "w", encoding="utf-8") as f:
        json.dump({"latest": nowiso}, f, ensure_ascii=False)
    print("[MON] 書き出し: %s (%d KB)" % (outp, os.path.getsize(outp) // 1024))


if __name__ == "__main__":
    main()
