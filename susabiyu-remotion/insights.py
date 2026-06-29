# -*- coding: utf-8 -*-
# Instagramインサイト収集（graph.instagram.com / Instagramログイン版API）。
#   mode=check   … トークンで何が取れるかを総当りで確認（実装前の権限チェック）
#   mode=collect … 日次のアカウント指標＋直近投稿の指標をシートに蓄積
# ※ストーリーズのインサイトは24hで消えるため、collectを毎日回して取りこぼしを減らす。
import os, sys, json, datetime
import requests as req
import poster

try:
    from zoneinfo import ZoneInfo
    JST = ZoneInfo("Asia/Tokyo")
except Exception:
    JST = datetime.timezone(datetime.timedelta(hours=9))

IGB = getattr(poster, "IGB", "https://graph.instagram.com/v23.0")
DAILY_TAB = "インサイト日次"   # 1日1行：日付ごとのアカウント指標
POST_TAB = "インサイト投稿"    # 1投稿1行：投稿ごとの指標（収集時点のスナップショット）
DAILY_HEADER = ["日付", "フォロワー数", "リーチ", "閲覧数", "プロフィール表示",
                "リンクタップ", "エンゲージ数", "取得時刻", "raw"]
POST_HEADER = ["取得日", "media_id", "種別", "投稿日時", "キャプション",
               "リーチ", "閲覧/再生", "いいね", "保存", "シェア", "コメント", "返信", "raw"]


def _token():
    t = ""
    try:
        t = poster.fresh_token() or ""
    except Exception as e:
        print("[TOKEN] fresh_token失敗:", e)
    return t or getattr(poster, "TOKEN", "") or os.environ.get("IG_ACCESS_TOKEN", "")


def _uid(token):
    r = req.get(IGB + "/me", params={"fields": "user_id,username", "access_token": token}, timeout=30).json()
    return (r.get("user_id") or r.get("id")), r.get("username", "")


def _ts(d):
    return int(datetime.datetime(d.year, d.month, d.day, tzinfo=JST).timestamp())


# 総当りで試すアカウント指標（v23でどれが通るか不明なため広めに）
TRY_METRICS = [
    ("reach", {}), ("reach", {"metric_type": "total_value"}),
    ("views", {"metric_type": "total_value"}), ("impressions", {}),
    ("profile_views", {"metric_type": "total_value"}), ("profile_views", {}),
    ("website_clicks", {"metric_type": "total_value"}),
    ("profile_links_taps", {"metric_type": "total_value"}),
    ("accounts_engaged", {"metric_type": "total_value"}),
    ("total_interactions", {"metric_type": "total_value"}),
    ("follower_count", {}),
]
TRY_MEDIA_METRICS = [
    "reach,likes,saved,shares,comments,total_interactions",
    "views,reach,likes,saved,shares,comments",
    "reach,replies,navigation,total_interactions",  # stories系
    "plays,reach,likes,saved,shares",               # reels系
    "impressions,reach,saved",
]


def check():
    token = _token()
    if not token:
        print("NG: トークンが取得できません（IG_ACCESS_TOKEN / Config!B10 を確認）"); return
    uid, uname = _uid(token)
    print("[CHECK] uid=%s username=%s" % (uid, uname))
    if not uid:
        print("NG: user_id取得不可。トークン or 連携を確認"); return
    info = req.get(IGB + "/" + str(uid), params={"fields": "followers_count,media_count", "access_token": token}, timeout=30).json()
    print("[FIELDS] followers_count/media_count ->", json.dumps(info, ensure_ascii=False)[:200])

    until = datetime.datetime.now(JST).date()
    since = until - datetime.timedelta(days=2)
    sp, up = _ts(since), _ts(until)
    print("[CHECK] アカウント指標（period=day, %s〜%s）" % (since, until))
    for metric, extra in TRY_METRICS:
        p = {"metric": metric, "period": "day", "since": sp, "until": up, "access_token": token}
        p.update(extra)
        try:
            r = req.get(IGB + "/" + str(uid) + "/insights", params=p, timeout=30).json()
        except Exception as e:
            print("  - %-18s %-22s EXC %s" % (metric, extra, e)); continue
        if "error" in r:
            print("  - %-18s %-22s NG  %s" % (metric, extra, r["error"].get("message", "")[:110]))
        else:
            print("  - %-18s %-22s OK  %s" % (metric, extra, json.dumps(r.get("data"), ensure_ascii=False)[:160]))

    print("[CHECK] 直近メディア & 投稿インサイト")
    m = req.get(IGB + "/" + str(uid) + "/media",
                params={"fields": "id,media_type,media_product_type,timestamp", "limit": 5, "access_token": token}, timeout=30).json()
    if "data" not in m:
        print("  メディア取得NG:", json.dumps(m, ensure_ascii=False)[:200]); return
    for md in m["data"][:3]:
        mid = md["id"]; mp = md.get("media_product_type"); mt = md.get("media_type")
        print("  media %s (%s/%s, %s)" % (mid, mp, mt, md.get("timestamp")))
        for ms in TRY_MEDIA_METRICS:
            r = req.get(IGB + "/" + str(mid) + "/insights", params={"metric": ms, "access_token": token}, timeout=30).json()
            if "error" in r:
                print("    - %-44s NG %s" % (ms, r["error"].get("message", "")[:80]))
            else:
                print("    - %-44s OK %s" % (ms, json.dumps(r.get("data"), ensure_ascii=False)[:160]))


def _ensure(sh, tab, header):
    poster._ensure_tab(sh, tab)
    rows = sh.values().get(spreadsheetId=poster.SHEET_ID, range=tab + "!A1:Z1").execute().get("values", [])
    if not rows:
        sh.values().update(spreadsheetId=poster.SHEET_ID, range=tab + "!A1",
                           valueInputOption="RAW", body={"values": [header]}).execute()


def _val(token, uid, metric, extra, sp, up):
    """1メトリクスの合計値を取る。取れなければNone。"""
    p = {"metric": metric, "period": "day", "since": sp, "until": up, "access_token": token}
    p.update(extra)
    try:
        r = req.get(IGB + "/" + str(uid) + "/insights", params=p, timeout=30).json()
        if "error" in r:
            return None
        tot = 0; got = False
        for d in r.get("data", []):
            tv = d.get("total_value")
            if tv and "value" in tv:
                tot += tv["value"]; got = True
            else:
                for v in d.get("values", []):
                    tot += v.get("value", 0); got = True
        return tot if got else None
    except Exception:
        return None


def collect():
    token = _token()
    if not token:
        raise SystemExit("トークンなし")
    uid, uname = _uid(token)
    if not uid:
        raise SystemExit("user_id取得不可")
    sh = poster._sheets()
    if sh is None:
        raise SystemExit("シート接続失敗")
    _ensure(sh, DAILY_TAB, DAILY_HEADER)
    _ensure(sh, POST_TAB, POST_HEADER)

    today = datetime.datetime.now(JST).date()
    y = today - datetime.timedelta(days=1)
    sp, up = _ts(y), _ts(today)
    now = datetime.datetime.now(JST).strftime("%Y-%m-%d %H:%M")

    info = req.get(IGB + "/" + str(uid), params={"fields": "followers_count", "access_token": token}, timeout=30).json()
    followers = info.get("followers_count", "")

    reach = _val(token, uid, "reach", {"metric_type": "total_value"}, sp, up)
    if reach is None:
        reach = _val(token, uid, "reach", {}, sp, up)
    views = _val(token, uid, "views", {"metric_type": "total_value"}, sp, up)
    if views is None:
        views = _val(token, uid, "impressions", {}, sp, up)
    pviews = _val(token, uid, "profile_views", {"metric_type": "total_value"}, sp, up)
    if pviews is None:
        pviews = _val(token, uid, "profile_views", {}, sp, up)
    links = _val(token, uid, "profile_links_taps", {"metric_type": "total_value"}, sp, up)
    if links is None:
        links = _val(token, uid, "website_clicks", {"metric_type": "total_value"}, sp, up)
    eng = _val(token, uid, "accounts_engaged", {"metric_type": "total_value"}, sp, up)

    raw = json.dumps({"reach": reach, "views": views, "pviews": pviews, "links": links, "eng": eng}, ensure_ascii=False)
    rows = sh.values().get(spreadsheetId=poster.SHEET_ID, range=DAILY_TAB + "!A:A").execute().get("values", [])
    dates = [r[0] for r in rows[1:] if r]
    line = [str(y), followers, reach if reach is not None else "", views if views is not None else "",
            pviews if pviews is not None else "", links if links is not None else "",
            eng if eng is not None else "", now, raw]
    if str(y) in dates:
        i = dates.index(str(y)) + 2
        sh.values().update(spreadsheetId=poster.SHEET_ID, range="%s!A%d:I%d" % (DAILY_TAB, i, i),
                           valueInputOption="RAW", body={"values": [line]}).execute()
        print("[COLLECT] %s 更新: フォロワー%s リーチ%s 閲覧%s" % (y, followers, reach, views))
    else:
        sh.values().append(spreadsheetId=poster.SHEET_ID, range=DAILY_TAB + "!A:I",
                           valueInputOption="RAW", insertDataOption="INSERT_ROWS", body={"values": [line]}).execute()
        print("[COLLECT] %s 追加: フォロワー%s リーチ%s 閲覧%s" % (y, followers, reach, views))


def diag():
    """確認用フィード（承認待ちタブ）の各枠で、プレビューURL/ポスター/ぼかしの状態を出す。
    画像が出ない原因（url空 / data-URI切れ等）の切り分け用。"""
    sh = poster._sheets()
    if sh is None:
        raise SystemExit("シート接続失敗")
    tab = "承認待ち"
    data = sh.values().get(spreadsheetId=poster.SHEET_ID, range=tab + "!A:M").execute().get("values", [])
    print("[DIAG] 行数:", len(data))
    for i, r in enumerate(data):
        if i == 0:
            continue
        def c(n):
            return str(r[n]) if len(r) > n else ""
        st = c(7)
        if st not in ("pending", "redo", "approved"):
            continue
        url = c(4); pos = c(11); blur = c(12)
        head = url.replace("\n", " ")[:46]
        kind = "video" if (".mp4" in url.lower() or ".mov" in url.lower() or c(6) == "video") else "still/other"
        print("  %s | %-8s | %-10s | %-11s | url_len=%5d head=%s | poster_len=%5d | blur_len=%5d"
              % (c(1)[:16], st, c(3), kind, len(url), head, len(pos), len(blur)))
    print("[DIAG] 目安: url_len=0は画像なし / data-URIが50000ちょうど付近は切れの疑い")


def setredo(whens):
    """指定枠の status を redo にする（再生成の前段。投稿はしない）。
    使い方の例: insights.py "setredo|2026-06-30 16:00|2026-06-30 20:00" """
    sh = poster._sheets()
    if sh is None:
        raise SystemExit("シート接続失敗")
    tab = "承認待ち"
    data = sh.values().get(spreadsheetId=poster.SHEET_ID, range=tab + "!A:M").execute().get("values", [])
    now = datetime.datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    for w in whens:
        w = w.strip()
        if not w:
            continue
        found = False
        for i, r in enumerate(data):
            if i == 0:
                continue
            if len(r) > 1 and str(r[1]).strip()[:16] == w[:16]:
                sh.values().update(spreadsheetId=poster.SHEET_ID, range="%s!H%d:I%d" % (tab, i + 1, i + 1),
                                   valueInputOption="RAW", body={"values": [["redo", now]]}).execute()
                print("[SETREDO] %s -> redo（このあとredo.ymlで再生成）" % w)
                found = True
                break
        if not found:
            print("[SETREDO] %s 見つからず" % w)


def main():
    raw = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else "check"
    parts = [p.strip() for p in raw.split("|")]
    mode = parts[0] or "check"
    if mode == "check":
        check()
    elif mode == "collect":
        collect()
    elif mode == "diag":
        diag()
    elif mode == "setredo":
        setredo(parts[1:])
    else:
        print("usage: python insights.py [check|collect|diag|'setredo|<when>|<when>...']")


if __name__ == "__main__":
    main()
