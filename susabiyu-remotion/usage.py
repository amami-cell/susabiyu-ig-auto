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

def prefer(images, creds_path, days=DAYS):
    used = recent_ids(creds_path, days)
    if not used:
        return list(images)
    fresh = [f for f in images if f.get("id") not in used]
    print("[USAGE] 候補%d -> 未使用%d (最近%d日除外)" % (len(images), len(fresh), days))
    return fresh if fresh else list(images)

def prefer_cats(cats, creds_path, days=DAYS):
    used = recent_ids(creds_path, days)
    if not used:
        return cats
    out = {}; total = 0
    for k, imgs in cats.items():
        fresh = [f for f in imgs if f.get("id") not in used]
        if fresh:
            out[k] = fresh; total += len(fresh)
    print("[USAGE] カテゴリ%d -> 未使用ありカテゴリ%d (最近%d日除外)" % (len(cats), len(out), days))
    return out if total > 0 else cats

def record(creds_path, files, pattern):
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
