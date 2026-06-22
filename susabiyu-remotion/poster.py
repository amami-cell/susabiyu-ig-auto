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

# Configタブ内のトークン管理ブロック（衝突回避のため10行目以降を使用）
TOK_CELL = "Config!B10"     # 現トークン
EXP_CELL = "Config!B11"     # expires_in
DATE_CELL = "Config!B12"    # 最終更新日
REFRESH_EVERY_DAYS = 20     # 24h<…<60日 の安全圏で再更新

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
    cred = Credentials.from_service_account_file(
        path, scopes=["https://www.googleapis.com/auth/spreadsheets"])
    return build("sheets", "v4", credentials=cred).spreadsheets()

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
        return base
    sh = _sheets()
    if not sh:
        return base
    stored = _cell(sh, TOK_CELL)
    cur = stored or base
    if not cur:
        return base
    last = _cell(sh, DATE_CELL)
    need = True
    if last:
        try:
            d = datetime.datetime.strptime(last, "%Y-%m-%d").date()
            need = (datetime.date.today() - d).days >= REFRESH_EVERY_DAYS
        except Exception:
            need = True
    if not need:
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
        return cur
    try:
        today = datetime.date.today().strftime("%Y-%m-%d")
        sh.values().update(
            spreadsheetId=SHEET_ID, range="Config!A10:B12", valueInputOption="RAW",
            body={"values": [["IG_TOKEN", new], ["EXPIRES_IN", exp], ["LAST_REFRESH", today]]}
        ).execute()
        print("[TOKEN] 更新＆保存OK (expires_in=%s)" % exp)
    except Exception as e:
        print("[TOKEN] 書き戻し失敗（投稿は継続）:", e)
    return new

def up(path):
    r = req.post("https://catbox.moe/user/api.php",
                 data={"reqtype": "fileupload"},
                 files={"fileToUpload": open(path, "rb")})
    url = r.text.strip()
    print("[UPLOAD]", url)
    return url

def ig_post(token, url, is_video):
    B = IGB
    me = req.get(f"{B}/me", params={"fields": "user_id,username", "access_token": token}).json()
    uid = me.get("user_id") or me.get("id")
    print("[POST] @" + str(me.get("username")))
    key = "video_url" if is_video else "image_url"
    c = req.post(f"{B}/{uid}/media", data={key: url, "media_type": "STORIES", "access_token": token}).json()
    if "error" in c:
        print("[POST] ERROR:", c["error"])
        return False
    cid = c["id"]
    for _ in range(30):
        s = req.get(f"{B}/{cid}", params={"fields": "status_code", "access_token": token}).json()
        sc = s.get("status_code")
        if sc == "FINISHED":
            break
        if sc == "ERROR":
            print("[POST] status error")
            return False
        time.sleep(5)
    p = req.post(f"{B}/{uid}/media_publish", data={"creation_id": cid, "access_token": token}).json()
    print("[POST] done!", p.get("id"))
    return True

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

def post(media, is_video, phrase=""):
    token = fresh_token()
    if not token:
        print("NG: IG_ACCESS_TOKEN が見つかりません（../.env を確認）")
        return False
    url = up(media)
    ok = ig_post(token, url, is_video)
    if ok:
        kind = "動画ストーリー" if is_video else "画像ストーリー"
        line_notify(f"[自動投稿] {kind}を投稿しました\n{phrase}")
    return ok

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使い方: python poster.py out\\post.png")
        raise SystemExit
    m = sys.argv[1]
    post(m, m.lower().endswith(".mp4"), "テスト投稿")
