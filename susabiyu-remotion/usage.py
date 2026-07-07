# -*- coding: utf-8 -*-
import os, datetime
USED_TAB = "使用写真"
DAYS = 21

def _sheet_id():
    if os.environ.get("SHEET_ID"):
        return os.environ["SHEET_ID"]
    for p in ("../.env", ".env"):
        if os.path.exists(p):
            for line in open(p, encoding="utf-8"):
                line = line.strip()
                if line.startswith("SHEET_ID="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""

def _svc(creds_path):
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        sc = ["https://www.googleapis.com/auth/spreadsheets"]
        c = service_account.Credentials.from_service_account_file(creds_path, scopes=sc)
        return build("sheets", "v4", credentials=c).spreadsheets()
    except Exception as e:
        print("[USAGE] sheets接続不可:", e); return None

def _ensure(sh, sid):
    try:
        meta = sh.get(spreadsheetId=sid, fields="sheets.properties.title").execute()
        titles = [s["properties"]["title"] for s in meta.get("sheets", [])]
        if USED_TAB not in titles:
            sh.batchUpdate(spreadsheetId=sid,
                body={"requests": [{"addSheet": {"properties": {"title": USED_TAB}}}]}).execute()
            sh.values().update(spreadsheetId=sid, range=USED_TAB + "!A1:D1", valueInputOption="RAW",
                body={"values": [["日時", "ファイルID", "ファイル名", "パターン"]]}).execute()
    except Exception as e:
        print("[USAGE] tab確認失敗:", e)

def recent_ids(creds_path, days=DAYS):
    sid = _sheet_id()
    if not (creds_path and sid):
        return set()
    sh = _svc(creds_path)
    if not sh:
        return set()
    _ensure(sh, sid)
    try:
        r = sh.values().get(spreadsheetId=sid, range=USED_TAB + "!A2:B").execute()
        rows = r.get("values", [])
    except Exception:
        return set()
    cutoff = datetime.date.today() - datetime.timedelta(days=days)
    out = set()
    for row in rows:
        if len(row) < 2:
            continue
        try:
            d = datetime.datetime.strptime(row[0][:10], "%Y-%m-%d").date()
        except Exception:
            d = None
        if d is None or d >= cutoff:
            out.add(row[1])
    return out

def recent_map(creds_path, days=DAYS):
    """ファイルID -> 最後に使った日時("YYYY-MM-DD HH:MM") の辞書。期間内のみ。"""
    sid = _sheet_id()
    if not (creds_path and sid):
        return {}
    sh = _svc(creds_path)
    if not sh:
        return {}
    _ensure(sh, sid)
    try:
        r = sh.values().get(spreadsheetId=sid, range=USED_TAB + "!A2:B").execute()
        rows = r.get("values", [])
    except Exception:
        return {}
    cutoff = datetime.date.today() - datetime.timedelta(days=days)
    out = {}
    for row in rows:
        if len(row) < 2:
            continue
        try:
            d = datetime.datetime.strptime(row[0][:10], "%Y-%m-%d").date()
        except Exception:
            d = None
        if d is None or d >= cutoff:
            k = row[1]
            if k not in out or str(row[0]) > str(out[k]):
                out[k] = str(row[0])
    return out

def pending_ids(creds_path):
    """確認画面(承認待ち)に今並んでいる投稿が使っている写真ID。
    ここにある写真は絶対に選ばない＝連続で同じ写真が出るのを防ぐ。"""
    sid = _sheet_id()
    if not (creds_path and sid):
        return set()
    sh = _svc(creds_path)
    if not sh:
        return set()
    import json as _j
    out = set()
    try:
        r = sh.values().get(spreadsheetId=sid, range="承認待ち!H2:J").execute()
        for row in r.get("values", []):
            st = (str(row[0]).strip().lower() if len(row) > 0 else "")
            pj = row[2] if len(row) > 2 else ""
            if st in ("rejected", "posted", "done", "canceled", "skip", "skipped"):
                continue
            if not pj:
                continue
            try:
                for _id in (_j.loads(pj).get("ids") or []):
                    out.add(str(_id))
            except Exception:
                continue
    except Exception as e:
        print("[USAGE] 承認待ち読取失敗:", e)
    return out

def _lru_half(images, used):
    """全部使用済みの時の逃げ道：最後に使ってから時間が経っている順の古い半分。"""
    ranked = sorted(images, key=lambda f: used.get(f.get("id"), ""))
    k = max(1, len(ranked) // 2)
    return ranked[:k]

def prefer(images, creds_path, days=DAYS):
    used = recent_map(creds_path, days)
    pend = pending_ids(creds_path)
    imgs = [f for f in images if f.get("id") not in pend] or list(images)
    fresh = [f for f in imgs if f.get("id") not in used]
    print("[USAGE] 候補%d -> 確認画面除外後%d -> 未使用%d (最近%d日)" % (len(images), len(imgs), len(fresh), days))
    if fresh:
        return fresh
    return _lru_half(imgs, used)   # 全滅時は「一番昔に使った」側の半分から

def prefer_cats(cats, creds_path, days=DAYS):
    used = recent_map(creds_path, days)
    pend = pending_ids(creds_path)
    base = {}
    for k, imgs in cats.items():
        keep = [f for f in imgs if f.get("id") not in pend]
        if keep:
            base[k] = keep
    if not base:
        base = cats
    out = {}; total = 0
    for k, imgs in base.items():
        fresh = [f for f in imgs if f.get("id") not in used]
        if fresh:
            out[k] = fresh; total += len(fresh)
    print("[USAGE] カテゴリ%d -> 未使用ありカテゴリ%d (最近%d日・確認画面除外)" % (len(cats), len(out), days))
    if total > 0:
        return out
    return {k: _lru_half(v, used) for k, v in base.items()}

def record(creds_path, files, pattern):
    if os.environ.get("USAGE_SKIP") == "1":
        print("[USAGE] 見本生成のため記録スキップ")
        return
    sid = _sheet_id()
    if not (creds_path and sid and files):
        return
    sh = _svc(creds_path)
    if not sh:
        return
    _ensure(sh, sid)
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    rows = [[now, f.get("id", ""), f.get("name", ""), pattern] for f in files]
    try:
        sh.values().append(spreadsheetId=sid, range=USED_TAB + "!A:D", valueInputOption="RAW",
            insertDataOption="INSERT_ROWS", body={"values": rows}).execute()
        print("[USAGE] %d枚を使用記録 (%s)" % (len(rows), pattern))
    except Exception as e:
        print("[USAGE] 記録失敗:", e)
