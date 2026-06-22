# -*- coding: utf-8 -*-
import os, sys, time, datetime
import requests as req

try:
    from googleapiclient.discovery import build
    from google.oauth2.service_account import Credentials
    HAS_G = True
except Exception:
    HAS_G = False

IGB = "https://graph.instagram.com/v23.0"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) susabiyu-ig-bot/1.0"
TOK_CELL = "Config!B10"; DATE_CELL = "Config!B12"
REFRESH_EVERY_DAYS = 20
HIST_TAB = "投稿履歴"

try:
    from zoneinfo import ZoneInfo
    JST = ZoneInfo("Asia/Tokyo")
except Exception:
    JST = datetime.timezone(datetime.timedelta(hours=9))

def load_env():
    env = {}
    for p in ("../.env", ".env"):
        if os.path.exists(p):
            for line in open(p, encoding="utf-8"):
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
            break
    for k in ("IG_ACCESS_TOKEN", "SHEET_ID", "LINE_CHANNEL_TOKEN"):
        if os.environ.get(k):
            env[k] = os.environ[k]
    return env

ENV = load_env()
TOKEN = ENV.get("IG_ACCESS_TOKEN", "")
SHEET_ID = ENV.get("SHEET_ID", "")
LINE_TOKEN = ENV.get("LINE_CHANNEL_TOKEN", "")

def _u_tmpfiles(path):
    r = req.post("https://tmpfiles.org/api/v1/upload", files={"file": open(path, "rb")},
                 headers={"User-Agent": UA}, timeout=120)
    u = r.json().get("data", {}).get("url", "")
    return u.replace("://tmpfiles.org/", "://tmpfiles.org/dl/") if u else ""

def _u_catbox(path):
    r = req.post("https://catbox.moe/user/api.php", data={"reqtype": "fileupload"},
                 files={"fileToUpload": open(path, "rb")}, headers={"User-Agent": UA}, timeout=120)
    return r.text.strip()

def _u_0x0(path):
    r = req.post("https://0x0.st", files={"file": open(path, "rb")},
                 headers={"User-Agent": UA}, timeout=30)
    return r.text.strip()

def up(path):
    for name, fn in (("tmpfiles", _u_tmpfiles), ("catbox", _u_catbox), ("0x0", _u_0x0)):
        try:
            u = fn(path)
        except Exception as e:
            print("[UPLOAD] %s err: %s" % (name, e)); continue
        if isinstance(u, str) and u.startswith("http"):
            print("[UPLOAD] %s: %s" % (name, u)); return u
        print("[UPLOAD] %s NG: %s" % (name, (u or "")[:80]))
    raise SystemExit("アップロード失敗：全ホストでNG")

def _sheets():
    if not HAS_G:
        return None
    path = None
    if os.path.exists("creds.json"):
        path = "creds.json"
    elif os.environ.get("GOOGLE_CREDS_B64"):
        import base64
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
        path = "creds.json"
    if not path:
        return None
    cred = Credentials.from_service_account_file(path, scopes=["https://www.googleapis.com/auth/spreadsheets"])
    return build("sheets", "v4", credentials=cred).spreadsheets()

def _ensure_tab(sh, title):
    try:
        meta = sh.get(spreadsheetId=SHEET_ID, fields="sheets.properties.title").execute()
        titles = [s["properties"]["title"] for s in meta.get("sheets", [])]
        if title not in titles:
            sh.batchUpdate(spreadsheetId=SHEET_ID,
                body={"requests": [{"addSheet": {"properties": {"title": title}}}]}).execute()
            print("[SHEET] %sタブを作成しました" % title)
            return True
    except Exception as e:
        print("[SHEET] %sタブ確認失敗: %s" % (title, e))
    return False

def _cell(sh, rng):
    try:
        r = sh.values().get(spreadsheetId=SHEET_ID, range=rng).execute()
        v = r.get("values")
        return (v[0][0].strip() if v and v[0] else "")
    except Exception:
        return ""

def fresh_token():
    base = TOKEN
    if not (HAS_G and SHEET_ID):
        print("[TOKEN] シート未接続のため環境変数トークンを使用"); return base
    sh = _sheets()
    if not sh:
        print("[TOKEN] 認証情報なしのため環境変数トークンを使用"); return base
    _ensure_tab(sh, "Config")
    stored = _cell(sh, TOK_CELL)
    cur = stored or base
    if not cur:
        return base
    last = _cell(sh, DATE_CELL)
    age = None
    if last:
        try:
            d = datetime.datetime.strptime(last, "%Y-%m-%d").date()
            age = (datetime.date.today() - d).days
        except Exception:
            age = None
    if age is not None and age < REFRESH_EVERY_DAYS:
        print("[TOKEN] 保存済みトークンを使用（前回更新 %s / %d日経過 / 残り%d日で再更新）"
              % (last, age, REFRESH_EVERY_DAYS - age))
        return cur
    new = None; exp = ""
    for url in (IGB + "/refresh_access_token", "https://graph.instagram.com/refresh_access_token"):
        try:
            rr = req.get(url, params={"grant_type": "ig_refresh_token", "access_token": cur}).json()
        except Exception:
            continue
        if rr.get("access_token"):
            new = rr["access_token"]; exp = str(rr.get("expires_in", "")); break
    if not new:
        print("[TOKEN] 更新スキップ（現トークン継続使用）"); return cur
    try:
        today = datetime.date.today().strftime("%Y-%m-%d")
        sh.values().update(spreadsheetId=SHEET_ID, range="Config!A10:B12", valueInputOption="RAW",
            body={"values": [["IG_TOKEN", new], ["EXPIRES_IN", exp], ["LAST_REFRESH", today]]}).execute()
        print("[TOKEN] 更新＆保存OK (expires_in=%s)" % exp)
    except Exception as e:
        print("[TOKEN] 書き戻し失敗（投稿は継続）:", e)
    return new

def record_history(slot, pattern, is_video, ig_id, url):
    if not (HAS_G and SHEET_ID):
        return
    try:
        sh = _sheets()
        if not sh:
            return
        if _ensure_tab(sh, HIST_TAB):
            sh.values().update(spreadsheetId=SHEET_ID, range=HIST_TAB + "!A1:F1",
                valueInputOption="RAW",
                body={"values": [["日時", "スロット", "パターン", "種別", "IG_ID", "URL"]]}).execute()
        now = datetime.datetime.now(JST).strftime("%Y-%m-%d %H:%M")
        kind = "動画" if is_video else "静止画"
        sh.values().append(spreadsheetId=SHEET_ID, range=HIST_TAB + "!A:F",
            valueInputOption="RAW", insertDataOption="INSERT_ROWS",
            body={"values": [[now, slot, pattern, kind, str(ig_id), url]]}).execute()
        print("[HIST] 履歴に記録しました")
    except Exception as e:
        print("[HIST] 記録失敗（投稿は成功）:", e)

def ig_post(token, url, is_video):
    B = IGB
    me = req.get(f"{B}/me", params={"fields": "user_id,username", "access_token": token}).json()
    uid = me.get("user_id") or me.get("id")
    print("[POST] @" + str(me.get("username")))
    key = "video_url" if is_video else "image_url"
    c = req.post(f"{B}/{uid}/media", data={key: url, "media_type": "STORIES", "access_token": token}).json()
    if "error" in c:
        print("[POST] ERROR:", c["error"]); return ""
    cid = c["id"]
    for _ in range(30):
        s = req.get(f"{B}/{cid}", params={"fields": "status_code", "access_token": token}).json()
        sc = s.get("status_code")
        if sc == "FINISHED":
            break
        if sc == "ERROR":
            print("[POST] status error"); return ""
        time.sleep(5)
    p = req.post(f"{B}/{uid}/media_publish", data={"creation_id": cid, "access_token": token}).json()
    if "error" in p:
        print("[POST] publish ERROR:", p["error"]); return ""
    pid = p.get("id", "")
    print("[POST] done!", pid); return pid

def line_notify(text):
    if not LINE_TOKEN:
        return
    try:
        req.post("https://api.line.me/v2/bot/message/broadcast",
                 headers={"Authorization": f"Bearer {LINE_TOKEN}", "Content-Type": "application/json"},
                 json={"messages": [{"type": "text", "text": text}]})
        print("[LINE] notified")
    except Exception as e:
        print("[LINE]", e)

def post(media, is_video, phrase="", slot="", pattern=""):
    token = fresh_token()
    if not token:
        print("NG: IG_ACCESS_TOKEN が見つかりません（../.env を確認）"); return False
    url = up(media)
    pid = ig_post(token, url, is_video)
    if pid:
        kind = "動画ストーリー" if is_video else "画像ストーリー"
        line_notify(f"[自動投稿] {kind}を投稿しました\n{phrase}")
        record_history(slot, pattern, is_video, pid, url)
        return True
    return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使い方: python poster.py out\\post.png"); raise SystemExit
    m = sys.argv[1]
    post(m, m.lower().endswith(".mp4"), "テスト投稿", "test", "manual")
