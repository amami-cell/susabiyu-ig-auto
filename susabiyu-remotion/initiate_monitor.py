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


def read_ops(sh, suf):
    """承認待ち_<店>（＝予約・投稿の実体）を読み、予約/投稿済み/失敗の運用アイテムを返す。
    我々の系は pending＝これから自動投稿される枠 / posted＝投稿済み / error＝失敗。
    列: B予定日時 C スロット D パターン E プレビューURL F キャプション G 種別 H ステータス"""
    tab = "承認待ち" + (("_" + suf) if suf else "")
    try:
        rows = sh.values().get(spreadsheetId=poster.SHEET_ID, range=tab + "!B2:H3000").execute().get("values", [])
    except Exception as e:
        print("[OPS] %s 読めず: %s" % (tab, str(e)[:100]))
        return []
    now = datetime.datetime.now(JST)
    items = []
    for r in rows:
        g = lambda k: (r[k] if len(r) > k else "")
        dt = str(g(0)).strip()
        if not dt:
            continue
        try:
            t = datetime.datetime.strptime(dt[:16], "%Y-%m-%d %H:%M").replace(tzinfo=JST)
        except Exception:
            continue
        status = (str(g(6)).strip() or "pending")
        cap = str(g(4))
        prev = str(g(3)).strip()
        kind = "story" if (str(g(5)).strip().lower() in ("", "still", "image", "video", "story")) else "post"
        future = t > now
        if status == "posted":
            state = "posted"
        elif status == "error":
            state = "failed"
        elif status in ("rejected", "ng"):
            continue
        elif future:
            state = "reserved"            # pending/ok/approved の未来枠＝これから自動投稿
        else:
            continue                      # 過去の未投稿（スキップ枠）は出さない
        items.append({"id": dt.replace(" ", "_"), "at": t.isoformat(), "caption": cap,
                      "thumb": prev, "kind": kind, "state": state})
    posted = sorted([x for x in items if x["state"] == "posted"], key=lambda x: x["at"], reverse=True)[:30]
    other = [x for x in items if x["state"] != "posted"]
    return other + posted


def read_resv(sh):
    """予約投稿タブ（②OK＝api=schedule で作成される分離エンジンの予約）を account 別に ops 形へ。"""
    try:
        rows = sh.values().get(spreadsheetId=poster.SHEET_ID, range="予約投稿!A2:M2000").execute().get("values", [])
    except Exception as e:
        print("[RESV] 予約投稿 読めず: %s" % str(e)[:100])
        return {}
    now = datetime.datetime.now(JST)
    out = {}
    for r in rows:
        g = lambda k: (r[k] if len(r) > k else "")
        when = str(g(1)).strip()
        if not when:
            continue
        try:
            t = datetime.datetime.strptime(when[:16], "%Y-%m-%d %H:%M").replace(tzinfo=JST)
        except Exception:
            continue
        status = (str(g(6)).strip() or "scheduled")
        acct = str(g(9)).strip()
        if status == "posted":
            state = "posted"
        elif status == "failed":
            state = "failed"
        elif status in ("canceled", "expired") or status.endswith("_hidden"):
            continue
        elif t > now:
            state = "reserved"
        else:
            continue
        out.setdefault(acct, []).append({"id": "resv_" + str(g(0)), "at": t.isoformat(),
                                         "caption": str(g(4)), "thumb": str(g(3)).strip(),
                                         "kind": "post", "state": state})
    return out


_THEME_JP = {"generic": "本日のおすすめ", "atmosphere": "店の雰囲気", "sushi": "握りたて",
             "food": "自慢の一皿", "drink": "今夜の一杯", "course": "宴会・コース",
             "lunch": "ランチ", "noren": "暖簾くぐり", "season": "季節の旬"}


def _phrases(suf):
    fn = "phrases.json" if not suf else ("phrases_" + suf + ".json")
    try:
        with open(fn, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _store_meta(suf):
    try:
        import stores as _s
        st = _s.get_store(suf)
        return (st.get("store_name") or suf or "三条"), (st.get("slots_weekday") or [11, 18, 20])
    except Exception:
        return (suf or "三条"), [11, 18, 20]


def build_proposals(sid_ui, suf, stats, posts):
    """無料の文例エンジン：店別 phrases＋実数値から投稿の下書き案を作る（OKは確認のみ・予約しない）。"""
    import random
    ph = _phrases(suf)
    cats = [k for k, v in ph.items() if isinstance(v, list) and v]
    if not cats:
        return []
    store_name, slots = _store_meta(suf)
    now = datetime.datetime.now(JST)
    why = []
    hl = stats.get("hLikes")
    if hl is not None and hl < 10:
        why.append("14日の平均♥%.1f。まず反応の取れる定番で底上げ" % hl)
    ds = stats.get("daysSince")
    if ds is not None and ds >= 2:
        why.append("最終フィードから%d日。来店理由を思い出してもらう" % ds)
    fi = stats.get("folInc")
    if fi is not None:
        why.append("フォロワー%+d/28日。認知を広げて新規を呼ぶ" % fi)
    why.append("定番の訴求で安定した反応を狙う")
    r = random.Random(hash(sid_ui) & 0xffffffff)
    thumbs = [p["thumb"] for p in posts if p.get("thumb")][:10]
    items = []
    count = 6
    for i in range(count):
        cat = cats[i % len(cats)]
        p = r.choice(ph[cat])
        is_story = (i == count - 1)
        dayoff = 1 + i // max(1, len(slots))
        hh = slots[i % len(slots)]
        at = now.replace(hour=hh, minute=0, second=0, microsecond=0) + datetime.timedelta(days=dayoff)
        tag = "#%s #グルメ #今夜ごはん #乾杯 #おすすめ" % sid_ui
        cap = p if is_story else (p + "\n" + store_name + " でお待ちしています。\nご予約はプロフィールから。\n\n" + tag)
        items.append({"id": "prop_%s_%d" % (sid_ui, i), "at": at.isoformat(),
                      "kind": "story" if is_story else "post",
                      "theme": _THEME_JP.get(cat, cat), "why": why[i % len(why)],
                      "caption": cap, "thumb": thumbs[i % len(thumbs)] if thumbs else ""})
    return items


def main():
    if not os.path.exists("creds.json") and os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
    sid = os.environ.get("SHEET_ID", "") or getattr(poster, "SHEET_ID", "")
    if sid:
        poster.SHEET_ID = sid
    sh = poster._sheets()
    if sh is None:
        raise SystemExit("シート接続に失敗（creds.json / SHEET_ID を確認）")

    RESV = read_resv(sh)   # 予約投稿（②OKで作成）を account 別に
    now = datetime.datetime.now(JST)
    nowiso = now.isoformat()
    tm = now.strftime("%Y-%m")
    stores = {}
    for sid_ui, suf in STORE_MAP:
        posts, stories = read_posts(sh, suf)
        fol, mon = read_daily(sh, suf)
        ops = read_ops(sh, suf) + RESV.get(suf, [])
        mf = [p for p in posts if p["at"][:7] == tm]
        ms = [p for p in stories if p["at"][:7] == tm]
        hist = {tm: {"n": len(mf), "sn": len(ms),
                     "likes": sum(p["likes"] for p in mf), "reach": sum(p["reach"] for p in mf),
                     "saved": sum(p["saved"] for p in mf), "views": sum(p.get("views", 0) for p in mf),
                     "sviews": sum(p["views"] for p in ms), "comments": sum(p["comments"] for p in mf)}}
        # 提案（自動下書き・文例）用の簡易stats＋生成
        since14 = (now - datetime.timedelta(days=14)).isoformat()
        f14 = [p for p in posts if p["at"] >= since14]
        _hl = (sum(p["likes"] for p in f14) / len(f14)) if f14 else None
        try:
            _ds = (now - datetime.datetime.fromisoformat(posts[0]["at"])).days if posts else None
        except Exception:
            _ds = None
        _ks = sorted(fol.keys())
        _fi = (fol[_ks[-1]] - fol[_ks[0]]) if len(_ks) >= 2 else None
        proposals = build_proposals(sid_ui, suf, {"hLikes": _hl, "daysSince": _ds, "folInc": _fi}, posts)
        stores[sid_ui] = {"at": nowiso, "err": "", "savedOk": True, "connected": True,
                          "posts": posts, "stories": stories, "ops": ops, "proposals": proposals,
                          "stat": {"fol": fol, "mon": mon, "hist": hist, "monErr": None}}
        _rsv = len([x for x in ops if x["state"] == "reserved"])
        print("[MON] %-12s(%-12s) posts=%3d stories=%3d fol=%3d mon=%d 予約%d%s" % (
            sid_ui, (suf or "三条"), len(posts), len(stories), len(fol), len(mon), _rsv,
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
