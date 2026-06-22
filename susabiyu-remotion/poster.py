# -*- coding: utf-8 -*-
import os, sys, time
import requests as req

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
LINE_TOKEN = ENV.get("LINE_CHANNEL_TOKEN", "")

def up(path):
    r = req.post("https://catbox.moe/user/api.php",
                 data={"reqtype": "fileupload"},
                 files={"fileToUpload": open(path, "rb")})
    url = r.text.strip()
    print("[UPLOAD]", url)
    return url

def ig_post(token, url, is_video):
    B = "https://graph.instagram.com/v23.0"
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
    if not TOKEN:
        print("NG: IG_ACCESS_TOKEN が見つかりません（../.env を確認）")
        return False
    url = up(media)
    ok = ig_post(TOKEN, url, is_video)
    if ok:
        kind = "動画ストーリー" if is_video else "画像ストーリー"
        line_notify(f"[自動投稿] {kind}を投稿しました\n{phrase}")
    return ok

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使い方: python poster.py out\\simple.png")
        raise SystemExit
    m = sys.argv[1]
    post(m, m.lower().endswith(".mp4"), "テスト投稿")
