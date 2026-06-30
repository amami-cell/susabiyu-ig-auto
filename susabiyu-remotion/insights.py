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
               "リーチ", "閲覧/再生", "いいね", "保存", "シェア", "コメント", "返信", "raw", "サムネ"]


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
TRY_STORY_METRICS = [
    "reach,replies,total_interactions",
    "views,reach,replies",
    "navigation",
    "reach,replies,profile_visits,follows,shares",
    "reach,replies,total_interactions,navigation,profile_activity",
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

    print("[CHECK] 直近ストーリーズ & インサイト（このシステムはストーリーズ投稿）")
    st = req.get(IGB + "/" + str(uid) + "/stories",
                 params={"fields": "id,media_type,media_product_type,timestamp", "access_token": token}, timeout=30).json()
    if "data" not in st:
        print("  ストーリーズ取得NG:", json.dumps(st, ensure_ascii=False)[:200])
    else:
        print("  現在ライブのストーリーズ件数:", len(st["data"]))
        for sd in st["data"][:3]:
            sid = sd["id"]
            print("  story %s (%s/%s, %s)" % (sid, sd.get("media_product_type"), sd.get("media_type"), sd.get("timestamp")))
            for ms in TRY_STORY_METRICS:
                r = req.get(IGB + "/" + str(sid) + "/insights", params={"metric": ms, "access_token": token}, timeout=30).json()
                if "error" in r:
                    print("    - %-46s NG %s" % (ms, r["error"].get("message", "")[:90]))
                else:
                    print("    - %-46s OK %s" % (ms, json.dumps(r.get("data"), ensure_ascii=False)[:170]))


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


def _first(d):
    tv = d.get("total_value")
    if tv and "value" in tv:
        return tv["value"]
    vs = d.get("values") or []
    return vs[0].get("value") if vs else None


def _post_insights(token, mid, metrics):
    """投稿1件の指標を取る。組み合わせが弾かれたら個別に取り直す。"""
    out = {}
    try:
        r = req.get(IGB + "/" + str(mid) + "/insights",
                    params={"metric": ",".join(metrics), "access_token": token}, timeout=30).json()
    except Exception:
        r = {}
    if "data" in r:
        for d in r["data"]:
            out[d["name"]] = _first(d)
        return out
    for m in metrics:
        try:
            rr = req.get(IGB + "/" + str(mid) + "/insights",
                         params={"metric": m, "access_token": token}, timeout=30).json()
            if "data" in rr:
                for d in rr["data"]:
                    out[d["name"]] = _first(d)
        except Exception:
            pass
    return out


STORY_METRICS = ["reach", "views", "replies", "total_interactions", "navigation", "profile_visits", "follows", "shares"]
FEED_METRICS = ["reach", "views", "likes", "saved", "shares", "comments", "total_interactions"]


def _host_thumb(md):
    """投稿のサムネ画像を恒久CDN(jsDelivr)へ保存してURLを返す。
    InstagramのCDN URLは期限切れ・ストーリーズは24hで消えるため、取り込んだ時に複製する。"""
    url = md.get("thumbnail_url") or md.get("media_url") or ""
    if not url:
        return ""
    try:
        r = req.get(url, timeout=30)
        if r.status_code != 200 or not r.content:
            return ""
        os.makedirs("out", exist_ok=True)
        path = os.path.join("out", "ptthumb.jpg")
        with open(path, "wb") as f:
            f.write(r.content)
        try:
            from PIL import Image
            im = Image.open(path).convert("RGB")
            w = 400
            h = max(1, int(im.height * (w / im.width)))
            im.resize((w, h)).save(path, "JPEG", quality=82)
        except Exception:
            pass
        return poster.up(path, cdn=True) or ""
    except Exception as e:
        print("[THUMB] host失敗:", str(e)[:80])
        return ""


def _collect_posts(sh, token, uid):
    """投稿ごとの指標を POST_TAB に収集（media_idで重複更新）。
    ・ストーリーズは24hで消えるので、毎日collectを回してライブ中に拾う。
    ・フィード/リールは累積指標なので毎回最新スナップショットで上書き。
    ・サムネは初回だけ恒久CDNへ複製（既に保存済みなら使い回す）。"""
    today = datetime.datetime.now(JST).strftime("%Y-%m-%d")
    items = []
    try:
        st = req.get(IGB + "/" + str(uid) + "/stories",
                     params={"fields": "id,media_type,media_product_type,timestamp,permalink,media_url,thumbnail_url", "access_token": token}, timeout=30).json()
        for md in st.get("data", []):
            items.append(("story", md))
        print("[POSTS] ライブ中ストーリーズ:", len(st.get("data", [])))
    except Exception as e:
        print("[POSTS] stories取得失敗:", e)
    try:
        m = req.get(IGB + "/" + str(uid) + "/media",
                    params={"fields": "id,media_type,media_product_type,timestamp,permalink,caption,media_url,thumbnail_url", "limit": 25, "access_token": token}, timeout=30).json()
        for md in m.get("data", []):
            mp = (md.get("media_product_type") or "").upper()
            items.append(("reel" if mp == "REELS" else "feed", md))
        print("[POSTS] 直近フィード/リール:", len(m.get("data", [])))
    except Exception as e:
        print("[POSTS] media取得失敗:", e)

    rows = sh.values().get(spreadsheetId=poster.SHEET_ID, range=POST_TAB + "!A:N").execute().get("values", [])
    idx = {}
    thumbmap = {}
    for i, r in enumerate(rows):
        if i == 0 or len(r) < 2:
            continue
        idx[str(r[1])] = i + 1
        if len(r) > 13 and str(r[13]).strip():
            thumbmap[str(r[1])] = str(r[13]).strip()
    appends = []
    n = 0
    for kind, md in items:
        mid = str(md["id"])
        metrics = STORY_METRICS if kind == "story" else FEED_METRICS
        ins = _post_insights(token, mid, metrics)
        cap = (md.get("caption") or "").replace("\n", " ").replace("\r", " ")[:80]
        thumb = thumbmap.get(mid) or _host_thumb(md)   # 既に保存済みなら使い回し
        line = [today, mid, kind, md.get("timestamp", ""), cap,
                ins.get("reach", ""), ins.get("views", ""), ins.get("likes", ""),
                ins.get("saved", ""), ins.get("shares", ""), ins.get("comments", ""),
                ins.get("replies", ""), json.dumps(ins, ensure_ascii=False), thumb]
        if mid in idx:
            i = idx[mid]
            sh.values().update(spreadsheetId=poster.SHEET_ID, range="%s!A%d:N%d" % (POST_TAB, i, i),
                               valueInputOption="RAW", body={"values": [line]}).execute()
        else:
            appends.append(line)
        n += 1
    if appends:
        sh.values().append(spreadsheetId=poster.SHEET_ID, range=POST_TAB + "!A:N",
                           valueInputOption="RAW", insertDataOption="INSERT_ROWS", body={"values": appends}).execute()
    print("[POSTS] %d件の投稿指標を収集（新規%d / 更新%d）" % (n, len(appends), n - len(appends)))


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

    # 投稿ごとの指標（ストーリーズ／フィード／リール）も収集
    try:
        _collect_posts(sh, token, uid)
    except Exception as e:
        print("[POSTS] 収集スキップ:", e)


def _day_metrics(token, uid, sp, up):
    """1日分のアカウント指標（reach, views, pviews, links, eng）を返す。"""
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
    return reach, views, pviews, links, eng


def backfill(n=30):
    """直近n日分のアカウント日次指標を遡って取り込む（1日ずつAPIを叩く）。
    ※フォロワー数の過去日は取得不可なので当日のみ。過去投稿はフィード/リールのみ遡れる
    （ストーリーズは24hで消えるため今ライブ分だけ）。"""
    token = _token()
    if not token:
        raise SystemExit("トークンなし")
    uid, _ = _uid(token)
    if not uid:
        raise SystemExit("user_id取得不可")
    sh = poster._sheets()
    if sh is None:
        raise SystemExit("シート接続失敗")
    _ensure(sh, DAILY_TAB, DAILY_HEADER)
    _ensure(sh, POST_TAB, POST_HEADER)
    now = datetime.datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    today = datetime.datetime.now(JST).date()
    info = req.get(IGB + "/" + str(uid), params={"fields": "followers_count", "access_token": token}, timeout=30).json()
    cur_followers = info.get("followers_count", "")
    rows = sh.values().get(spreadsheetId=poster.SHEET_ID, range=DAILY_TAB + "!A:A").execute().get("values", [])
    dates = {}
    for i, r in enumerate(rows[1:]):
        if r:
            dates[str(r[0])] = i + 2
    pend = []
    done = 0
    for k in range(1, n + 1):
        day = today - datetime.timedelta(days=k)
        sp, up = _ts(day), _ts(day + datetime.timedelta(days=1))
        reach, views, pviews, links, eng = _day_metrics(token, uid, sp, up)
        if reach is None and views is None and pviews is None and links is None and eng is None:
            continue
        fol = cur_followers if k == 1 else ""
        raw = json.dumps({"reach": reach, "views": views, "pviews": pviews, "links": links, "eng": eng}, ensure_ascii=False)
        line = [str(day), fol, reach if reach is not None else "", views if views is not None else "",
                pviews if pviews is not None else "", links if links is not None else "",
                eng if eng is not None else "", now, raw]
        if str(day) in dates:
            sh.values().update(spreadsheetId=poster.SHEET_ID, range="%s!A%d:I%d" % (DAILY_TAB, dates[str(day)], dates[str(day)]),
                               valueInputOption="RAW", body={"values": [line]}).execute()
        else:
            pend.append(line)
        done += 1
        print("[BACKFILL] %s reach=%s views=%s pviews=%s" % (day, reach, views, pviews))
    if pend:
        sh.values().append(spreadsheetId=poster.SHEET_ID, range=DAILY_TAB + "!A:I",
                           valueInputOption="RAW", insertDataOption="INSERT_ROWS", body={"values": pend}).execute()
    try:
        _collect_posts(sh, token, uid)
    except Exception as e:
        print("[POSTS] 収集スキップ:", e)
    print("[BACKFILL] 完了: %d日分を処理（新規%d / 更新%d）" % (done, len(pend), done - len(pend)))


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
        url = c(4)
        host = "jsdelivr" if "cdn.jsdelivr.net" in url else ("litter" if "litter" in url else ("none" if not url else "other"))
        alive = "?"
        if url:
            try:
                hr = req.get(url, stream=True, timeout=30)
                alive = "OK" if hr.status_code == 200 else ("DEAD(%d)" % hr.status_code)
                hr.close()
            except Exception:
                alive = "DEAD(err)"
        print("  %s | %-8s | %-10s | host=%-8s | %-9s | %s"
              % (c(1)[:16], st, c(3), host, alive, url.replace("\n", " ")[:60]))
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


def heal():
    """一時ホスト(litterbox等)に保存されたプレビューを、まだ生きているうちに
    永続(jsDelivr/R2)へ再アップロードして差し替える。確認画面の画像が消えないように。"""
    sh = poster._sheets()
    if sh is None:
        raise SystemExit("シート接続失敗")
    tab = "承認待ち"
    data = sh.values().get(spreadsheetId=poster.SHEET_ID, range=tab + "!A:M").execute().get("values", [])
    TEMP = ("litter.catbox.moe", "tmpfiles.org", "0x0.st", "//catbox.moe", "files.catbox.moe")
    r2base = (os.environ.get("R2_PUBLIC_BASE") or "").rstrip("/")
    os.makedirs("out", exist_ok=True)
    healed = 0
    target = 0
    for i, r in enumerate(data):
        if i == 0:
            continue
        st = str(r[7]) if len(r) > 7 else ""
        if st not in ("pending", "redo", "approved"):
            continue
        url = str(r[4]) if len(r) > 4 else ""
        if not url or "cdn.jsdelivr.net" in url or (r2base and r2base in url):
            continue  # 既に永続
        if not any(h in url for h in TEMP):
            continue  # 不明なホストは触らない
        target += 1
        try:
            resp = req.get(url, timeout=90)
            if resp.status_code != 200 or not resp.content:
                print("[HEAL] %s 取得不可(%s)＝期限切れ。要再生成" % (str(r[1])[:16], resp.status_code))
                continue
            ext = ".mp4" if (".mp4" in url.lower() or ".mov" in url.lower()) else ".jpg"
            p = os.path.join("out", "heal" + ext)
            open(p, "wb").write(resp.content)
            newu = poster.up(p, cdn=True)
            if "cdn.jsdelivr.net" in newu or (r2base and r2base in newu):
                sh.values().update(spreadsheetId=poster.SHEET_ID, range="%s!E%d" % (tab, i + 1),
                                   valueInputOption="RAW", body={"values": [[newu]]}).execute()
                print("[HEAL] %s 永続化: %s" % (str(r[1])[:16], newu[:55]))
                healed += 1
            else:
                print("[HEAL] %s 永続化できず（一時のまま）" % str(r[1])[:16])
            if healed >= 8:
                print("[HEAL] レート保護のため今回はここまで（残りは次回）")
                break
        except Exception as e:
            print("[HEAL] err %s: %s" % (str(r[1])[:16], e))
    print("[HEAL] 一時ホスト対象 %d / 永続化 %d" % (target, healed))


def main():
    raw = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else "check"
    parts = [p.strip() for p in raw.split("|")]
    mode = parts[0] or "check"
    if mode == "check":
        check()
    elif mode == "collect":
        collect()
    elif mode == "backfill":
        try:
            days = int(parts[1]) if len(parts) > 1 and parts[1] else 30
        except Exception:
            days = 30
        backfill(days)
    elif mode == "diag":
        diag()
    elif mode == "setredo":
        setredo(parts[1:])
    elif mode == "heal":
        heal()
    else:
        print("usage: python insights.py [check|collect|diag|heal|'setredo|<when>...']")


if __name__ == "__main__":
    main()
