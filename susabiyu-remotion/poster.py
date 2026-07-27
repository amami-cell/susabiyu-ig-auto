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
TOK_CELL = "Config!B10"; DATE_CELL = "Config!B12"; ALERT_CELL = "Config!B13"
REFRESH_EVERY_DAYS = 7   # 20日→7日。毎週こまめに更新してトークンを長生きさせる
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
    # 店舗別トークン（IG_ACCESS_TOKEN_<ACCOUNT>）も環境変数から取り込む＝多店舗の投稿先に対応
    for k, v in os.environ.items():
        if k.startswith("IG_ACCESS_TOKEN_") and v:
            env[k] = v
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

def _u_litter(path, hours="72h"):
    # litterbox: auto-delete after 1h/12h/24h/72h - free, no accumulation
    r = req.post("https://litterbox.catbox.moe/resources/internals/api.php",
                 data={"reqtype": "fileupload", "time": hours},
                 files={"fileToUpload": open(path, "rb")},
                 headers={"User-Agent": "Mozilla/5.0"}, timeout=120)
    return r.text.strip()

def _u_r2(path):
    """Cloudflare R2 にアップロードして公開CDN URLを返す（鍵が無ければ""=フォールバック）。
    R2はS3互換。GitHub Secrets: R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
    / R2_BUCKET / R2_PUBLIC_BASE(例 https://pub-xxxx.r2.dev) を設定すると有効化される。"""
    acct = os.environ.get("R2_ACCOUNT_ID"); kid = os.environ.get("R2_ACCESS_KEY_ID")
    sec = os.environ.get("R2_SECRET_ACCESS_KEY"); bkt = os.environ.get("R2_BUCKET")
    base = (os.environ.get("R2_PUBLIC_BASE") or "").rstrip("/")
    if not (acct and kid and sec and bkt and base):
        return ""  # 未設定: 使わない（従来ホストへフォールバック）
    import boto3
    from botocore.config import Config as _Cfg
    ext = os.path.splitext(path)[1].lower()
    ctype = {".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",
             ".webp":"image/webp",".mp4":"video/mp4",".mov":"video/quicktime"}.get(ext,"application/octet-stream")
    import random as _r
    key = "preview/%s_%04d%s" % (datetime.datetime.now(JST).strftime("%Y%m%d%H%M%S"), _r.randint(0,9999), ext)
    s3 = boto3.client("s3",
        endpoint_url="https://%s.r2.cloudflarestorage.com" % acct,
        aws_access_key_id=kid, aws_secret_access_key=sec,
        region_name="auto", config=_Cfg(signature_version="s3v4"))
    s3.upload_file(path, bkt, key, ExtraArgs={"ContentType": ctype})
    return base + "/" + key

def _u_jsdelivr(path):
    """公開メディアリポにアップロードし、jsDelivrのCDN URL(コミットSHA固定)を返す。
    GitHub Secrets: GH_MEDIA_TOKEN(contents:write) と GH_MEDIA_REPO("owner/repo")。
    未設定なら "" を返し従来ホストへフォールバック。解像度は一切変えない。"""
    import base64 as _b64, random as _r
    tok = os.environ.get("GH_MEDIA_TOKEN"); repo = os.environ.get("GH_MEDIA_REPO")
    branch = os.environ.get("GH_MEDIA_BRANCH", "main")
    if not (tok and repo):
        return ""
    ext = os.path.splitext(path)[1].lower()
    key = "preview/%s_%04d%s" % (datetime.datetime.now(JST).strftime("%Y%m%d%H%M%S"), _r.randint(0, 9999), ext)
    with open(path, "rb") as _f:
        content_b64 = _b64.b64encode(_f.read()).decode()
    api = "https://api.github.com/repos/%s/contents/%s" % (repo, key)
    headers = {"Authorization": "Bearer " + tok,
               "Accept": "application/vnd.github+json",
               "X-GitHub-Api-Version": "2022-11-28"}
    r = None
    for _att in range(6):
        r = req.put(api, headers=headers, timeout=120,
                    json={"message": "media " + key, "content": content_b64, "branch": branch})
        if r.status_code in (200, 201):
            break
        if r.status_code in (403, 429) or r.status_code >= 500:  # レート/二次制限/一時障害 → 待って再試行
            _w = min(60, 6 * (2 ** _att))
            print("[UPLOAD] jsdelivr %s wait %ds retry" % (r.status_code, _w)); time.sleep(_w); continue
        print("[UPLOAD] jsdelivr PUT %s: %s" % (r.status_code, r.text[:120])); return ""
    if r is None or r.status_code not in (200, 201):
        print("[UPLOAD] jsdelivr retried but NG"); return ""
    sha = (r.json().get("commit") or {}).get("sha", "")
    if not sha:
        return ""
    return "https://cdn.jsdelivr.net/gh/%s@%s/%s" % (repo, sha, key)

def up(path, cdn=False):
    # cdn=True: 確認画面で人が何度も見るプレビュー → 永続ホストのみ（jsDelivr→R2）。
    #   一時ホスト(litterbox=最大72h, tmpfiles=1h, 0x0, catbox)は自動削除され
    #   「確認画面から消える」原因になるため、確認用では絶対に使わない。
    # cdn=False: IGが一度だけ取得する投稿用 → 数分で取得完了するので一時ホストでOK。
    if cdn:
        chain = (("jsdelivr", _u_jsdelivr), ("r2", _u_r2))
    else:
        chain = (("litter", _u_litter), ("catbox", _u_catbox), ("tmpfiles", _u_tmpfiles), ("0x0", _u_0x0))
    for name, fn in chain:
        try:
            u = fn(path)
        except Exception as e:
            print("[UPLOAD] %s err: %s" % (name, e)); continue
        if isinstance(u, str) and u.startswith("http"):
            print("[UPLOAD] %s: %s" % (name, u)); return u
        print("[UPLOAD] %s NG: %s" % (name, (u or "")[:80]))
    if cdn:
        # 永続ホストが全滅しても一時URLは返さない。"" を返し、呼び出し側が
        # data URI 等の永続フォールバックを使う＝確認画面から二度と消えない。
        print("[UPLOAD] 永続ホスト全滅：一時URLは使わず空を返す（呼び出し側でフォールバック）")
        return ""
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

def _me_ok(tok):
    """/me が通ればTrueとレスポンスを返す（トークン生存判定）。"""
    if not tok:
        return False, {}
    try:
        r = req.get(IGB + "/me", params={"fields": "user_id,username", "access_token": tok}, timeout=30).json()
    except Exception as e:
        return False, {"error": str(e)}
    return ((not r.get("error")) and bool(r.get("user_id") or r.get("id"))), r

def _try_refresh(tok):
    """ig_refresh_token でトークン更新。成功で (new, expires_in) を返す。"""
    if not tok:
        return None, ""
    for url in (IGB + "/refresh_access_token", "https://graph.instagram.com/refresh_access_token"):
        try:
            rr = req.get(url, params={"grant_type": "ig_refresh_token", "access_token": tok}, timeout=30).json()
        except Exception:
            continue
        if rr.get("access_token"):
            return rr["access_token"], str(rr.get("expires_in", ""))
    return None, ""

def _save_token(sh, new, exp):
    try:
        today = datetime.date.today().strftime("%Y-%m-%d")
        sh.values().update(spreadsheetId=SHEET_ID, range="Config!A10:B12", valueInputOption="RAW",
            body={"values": [["IG_TOKEN", new], ["EXPIRES_IN", exp], ["LAST_REFRESH", today]]}).execute()
        print("[TOKEN] 更新＆保存OK (expires_in=%s)" % exp)
    except Exception as e:
        print("[TOKEN] 書き戻し失敗:", e)

def alert_token_dead(detail=""):
    """トークン失効を『1日1回だけ』はっきり通知（毎回の投稿失敗スパムを防ぐ）。"""
    sh = _sheets() if (HAS_G and SHEET_ID) else None
    today = datetime.date.today().strftime("%Y-%m-%d")
    if sh and _cell(sh, ALERT_CELL) == today:
        print("[TOKEN] 失効アラートは本日送信済み（重複送信しない）"); return
    line_notify("⚠️【要対応】Instagramの投稿トークンが無効になりました。\n"
                "自動投稿は一時停止中です（予約投稿は消えず、復旧後に自動で投稿されます）。\n"
                "→ 新しいトークンの再発行が必要です。担当にご連絡ください。" + (("\n" + detail) if detail else ""))
    if sh:
        try:
            sh.values().update(spreadsheetId=SHEET_ID, range=ALERT_CELL, valueInputOption="RAW",
                body={"values": [[today]]}).execute()
        except Exception:
            pass

def fresh_token(validate=True):
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
    need_refresh = (age is None) or (age >= REFRESH_EVERY_DAYS)
    # 期限内でも /me が通らなければ即リフレッシュ（途中失効に自動対応）
    if validate and not need_refresh:
        ok, _ = _me_ok(cur)
        if not ok:
            print("[TOKEN] 期限内だが/me不通→即リフレッシュ試行"); need_refresh = True
    if not need_refresh:
        print("[TOKEN] 保存済みトークンを使用（前回更新 %s / %d日経過 / 残り%d日で再更新）"
              % (last, age, REFRESH_EVERY_DAYS - age))
        return cur
    # リフレッシュ：現行→ダメなら基底(Secret)。基底がそのまま有効ならそれを採用。
    new, exp = _try_refresh(cur)
    if not new and base and base != cur:
        print("[TOKEN] 現行トークンの更新NG→基底(Secret)で再試行")
        new, exp = _try_refresh(base)
        if not new:
            ok, _ = _me_ok(base)
            if ok:
                print("[TOKEN] 基底トークンが有効→採用"); _save_token(sh, base, ""); return base
    if new:
        _save_token(sh, new, exp)
        return new
    print("[TOKEN] 全トークン失効。再発行が必要。")
    return cur

def account_base_token(account=""):
    """アカウント別のベース(Secret)トークン。account指定時は IG_ACCESS_TOKEN_<ACCOUNT> を優先。
       無ければ既定 IG_ACCESS_TOKEN。account が空なら従来どおり既定トークン。"""
    if account:
        safe = "".join(c for c in account.upper() if c.isalnum() or c == "_")
        key = "IG_ACCESS_TOKEN_" + safe
        t = ENV.get(key) or os.environ.get(key) or ""
        if t:
            return t
    return TOKEN

def fresh_token_for(account="", validate=True):
    """アカウント別の実効トークンを返す。
       ・account 未指定（既定＝三条）は従来の fresh_token() をそのまま使用（挙動不変）。
       ・名前付きアカウントは専用Secretを検証し、失効時はリフレッシュを試行。ダメなら空を返す。"""
    if not account:
        return fresh_token(validate=validate)
    base = account_base_token(account)
    if not base:
        print("[TOKEN] アカウント '%s' 用トークン未設定（Secret: IG_ACCESS_TOKEN_%s を登録してください）"
              % (account, account.upper()))
        return ""
    if not validate:
        return base
    ok, _ = _me_ok(base)
    if ok:
        return base
    new, _ = _try_refresh(base)
    if new and _me_ok(new)[0]:
        print("[TOKEN] アカウント '%s' トークンをリフレッシュしました" % account)
        return new
    print("[TOKEN] アカウント '%s' のトークンが無効です。再発行が必要です。" % account)
    return ""

def token_alive():
    """今使うトークンが実際にIG投稿に使えるかを返す（必要ならこの中で更新も行う）。"""
    return _me_ok(fresh_token())[0]

def token_reset():
    """保存済みトークンをクリアし、基底(Secret)トークンで再取得し直す（再発行後の復旧用）。"""
    if not (HAS_G and SHEET_ID):
        print("[TOKEN] シート未接続"); return False
    sh = _sheets()
    if not sh:
        print("[TOKEN] 認証情報なし"); return False
    try:
        sh.values().update(spreadsheetId=SHEET_ID, range="Config!A10:B13", valueInputOption="RAW",
            body={"values": [["IG_TOKEN", ""], ["EXPIRES_IN", ""], ["LAST_REFRESH", ""], ["TOKEN_ALERT", ""]]}).execute()
        print("[TOKEN] 保存トークンをクリア。基底(Secret)から取り直します。")
    except Exception as e:
        print("[TOKEN] クリア失敗:", e); return False
    t = fresh_token()
    ok, me = _me_ok(t)
    print("[TOKEN] 復旧結果:", "OK @" + str(me.get("username")) if ok else ("NG " + str(me.get("error"))))
    return ok

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
    if me.get("error"):
        # /me が失敗＝アクセストークンが無効/失効の可能性。原因を明示して即終了。
        print("[POST] /me ERROR（トークン失効の可能性・要再発行）:", me["error"]); return ""
    uid = me.get("user_id") or me.get("id")
    print("[POST] @%s (uid=%s)" % (me.get("username"), uid))
    if not uid:
        print("[POST] uid取得失敗 me=", me); return ""
    key = "video_url" if is_video else "image_url"
    c = req.post(f"{B}/{uid}/media", data={key: url, "media_type": "STORIES", "access_token": token}).json()
    if "error" in c:
        # code 1「unknown error」は多くの場合IGが image_url を取得できていない＝ホスト起因。
        print("[POST] media作成ERROR:", c["error"], "| url=", url); return ""
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

def ig_post_media(token, url, kind, caption=""):
    """フィード画像 / リール動画を本投稿する（ストーリー用 ig_post とは別系統）。
       kind: 'feed'=画像フィード投稿 / 'reel'=リール動画投稿。成功でメディアIDを返す。"""
    B = IGB
    me = req.get(f"{B}/me", params={"fields": "user_id,username", "access_token": token}).json()
    if me.get("error"):
        print("[POST] /me ERROR（トークン失効の可能性・要再発行）:", me["error"]); return ""
    uid = me.get("user_id") or me.get("id")
    if not uid:
        print("[POST] uid取得失敗 me=", me); return ""
    print("[POST] @%s (uid=%s) kind=%s" % (me.get("username"), uid, kind))
    if kind == "reel":
        data = {"media_type": "REELS", "video_url": url, "access_token": token}
    else:
        data = {"image_url": url, "access_token": token}   # 画像フィード（media_type省略＝IMAGE）
    if caption:
        data["caption"] = caption
    c = req.post(f"{B}/{uid}/media", data=data).json()
    if "error" in c:
        print("[POST] media作成ERROR:", c["error"], "| url=", url); return ""
    cid = c["id"]
    # 動画は処理待ち（数十秒）がある。画像は基本すぐ FINISHED。
    for _ in range(60):
        s = req.get(f"{B}/{cid}", params={"fields": "status_code", "access_token": token}).json()
        sc = s.get("status_code")
        if sc == "FINISHED":
            break
        if sc == "ERROR":
            print("[POST] status error", s); return ""
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
    # 投稿画像はIGサーバが確実に取得できる永続CDN(jsDelivr→R2)を優先。
    # litterbox等の一時ホストはIGが取得に失敗し code1「unknown error」になることがあるため、
    # 永続CDNが全滅した時だけ一時ホストにフォールバックする。
    url = up(media, cdn=True) or up(media)
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
