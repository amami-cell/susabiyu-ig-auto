# -*- coding: utf-8 -*-
import sys, os, re, subprocess, datetime, base64, io
from decide_post import decide, JST, day_kind
import poster

SHEET_ID = "13zKaUblOwmgZ-lgCfxylCLlW2Fqutqct5h5TvMRWv30"
APP_TAB = "承認待ち"
PAT_JA = {"sushi":"王道","tempo":"賑やか","typo":"雑誌風","photo":"全画面","simple":"額装","caption":"写真キャプション", "oshina":"お品書き","oshinatate":"お品書き(縦書き)","kaiten":"回転レーン","osusume":"店主おすすめ","gridzoom":"グリッド→ズーム","noren":"暖簾くぐり","season":"季節の旬","polaroid":"ポラロイド"}
REG = {
  "sushi":   ("fetch_drive_photos.py","SushiStory",True),
  "tempo":   ("fetch_tempo.py","TempoStory",True),
  "typo":    ("fetch_typo.py","TypoStory",True),
  "photo":   ("fetch_photostory.py","PhotoStory",True),
  "simple":  ("fetch_simple.py","SimpleStory",False),
  "caption": ("fetch_photostory.py","PhotoStory",False),
  "oshina":    ("fetch_typo.py","OshinaStory",True),
  "oshinatate":("fetch_typo.py","OshinaTate",True),
  "kaiten":   ("fetch_kaiten.py","KaitenStory",True),
  "osusume":  ("fetch_typo.py","OsusumeStory",True),
  "gridzoom": ("fetch_tempo.py","GridZoom",True),
  "noren":   ("fetch_typo.py","NorenStory",True),
  "season":  ("fetch_typo.py","SeasonStory",True),
  "polaroid": ("fetch_tempo.py","Polaroid",True),
}
CAP_VAR = {
  "photo":("photoStoryData.ts","photoStoryCaption"),
  "caption":("photoStoryData.ts","photoStoryCaption"),
  "simple":("simpleData.ts","simplePhrase"),
  "typo":("typoData.ts","typoHeadline"),
}

def run(cmd):
    print(">>", cmd)
    r = subprocess.run(cmd, shell=True)
    if r.returncode != 0:
        raise SystemExit("コマンド失敗: " + cmd)

def caption_of(pattern):
    info = CAP_VAR.get(pattern)
    if not info:
        return ""
    fn, var = info
    try:
        txt = open(os.path.join("src", fn), encoding="utf-8").read()
    except Exception:
        return ""
    m = re.search(r'export const ' + var + r'\s*=\s*"((?:[^"\\]|\\.)*)"', txt)
    return m.group(1).replace('\\"', '"').replace('\\\\', '\\') if m else ""

def _blur_uri(png):
    """極小ぼかしプレースホルダ（即時表示用のデータ・URI）。
    約32px・1KB弱なのでセル上限内に収まり、ネット待ちゼロで即表示できる。
    本体のフル解像度は別途読み込むので鮮明度は一切落ちない。"""
    try:
        from PIL import Image as _ImgB
        im = _ImgB.open(png).convert("RGB")
        w = 32
        h = max(1, int(im.height * (w / im.width)))
        im = im.resize((w, h))
        b = io.BytesIO()
        im.save(b, format="JPEG", quality=40)
        return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
    except Exception as e:
        print("[BLUR] 生成失敗:", e)
        return ""

def thumb_data_uri(comp, is_video):
    """(本体URL, ぼかしデータ・URI) を返す。本体はフル解像度のまま。"""
    png = "out/thumb.png"
    if os.path.exists(png):
        os.remove(png)
    if is_video:
        run("npx remotion still " + comp + " " + png + " --frame 45 --scale 1.0 --timeout 120000")
    else:
        run("npx remotion still " + comp + " " + png + " --scale 1.0 --timeout 120000")
    blur = _blur_uri(png)  # 先に即時表示用のぼかしを作る
    # 画像をアップロードしてURLを返す（セル50k上限回避・鮮明）
    try:
        _up = png
        try:
            from PIL import Image as _Img
            _jpg = os.path.join("out", "thumb.jpg")
            _Img.open(png).convert("RGB").save(_jpg, "JPEG", quality=92, optimize=True, progressive=True)
            _up = _jpg
        except Exception as _je:
            print("[THUMB] JPEG変換失敗(PNGで続行):", _je)
        u = poster.up(_up, cdn=True)
        if u:
            return u, blur
    except Exception as e:
        print("[THUMB UP] 失敗:", e)
    # フォールバック：base64（控えめサイズでセル上限内）
    try:
        from PIL import Image
        img = Image.open(png).convert("RGB")
        w = 360
        h = int(img.height * (w / img.width))
        img = img.resize((w, h))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=65)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode(), blur
    except Exception as e:
        print("[THUMB] 生成失敗:", e)
        return "", blur

def _faststart(mp4):
    """mp4のmoov索引を先頭へ移動（再エンコード無し＝画質そのまま）。
    ブラウザが頭だけ読んで即再生開始できる。ffmpeg不在なら無変換で継続。"""
    try:
        import subprocess as _sp
        out = mp4[:-4] + "_fs.mp4" if mp4.endswith(".mp4") else mp4 + "_fs.mp4"
        r = _sp.run(["ffmpeg", "-y", "-i", mp4, "-c", "copy", "-movflags", "+faststart", out],
                    stdout=_sp.DEVNULL, stderr=_sp.DEVNULL)
        if r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 0:
            os.replace(out, mp4); print("[FASTSTART] OK", mp4)
        else:
            print("[FASTSTART] skip (ffmpeg rc=%s)" % r.returncode)
    except Exception as e:
        print("[FASTSTART] skip:", e)

def send_push(sh, title, body, url, focus=""):
    """承認待ちが新規作成された時、購読者へWeb Push通知（音/バナー）。失敗してもprepareは継続。"""
    raw = (os.environ.get("VAPID_PRIVATE_KEY") or "").strip()
    subject = (os.environ.get("VAPID_SUBJECT") or "mailto:admin@example.com").strip()
    if not raw:
        print("[PUSH] VAPID未設定のためスキップ"); return
    try:
        from pywebpush import webpush, WebPushException
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
    except Exception as e:
        print("[PUSH] ライブラリ未導入:", e); return
    try:
        pad = "=" * (-len(raw) % 4)
        d = int.from_bytes(base64.urlsafe_b64decode(raw + pad), "big")
        key = ec.derive_private_key(d, ec.SECP256R1())
        pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
        open("vapid_private.pem", "wb").write(pem)
    except Exception as e:
        print("[PUSH] 秘密鍵の復元失敗:", e); return
    try:
        rows = sh.values().get(spreadsheetId=SHEET_ID, range="購読!A:B").execute().get("values", [])
    except Exception as e:
        print("[PUSH] 購読の読取失敗:", e); return
    import json as _pjson
    payload = _pjson.dumps({"title": title, "body": body, "url": url, "focus": focus, "tag": (focus or "susabiyu")})
    sent = 0; gone = 0
    for r in rows[1:]:
        if len(r) < 2 or not str(r[1]).strip():
            continue
        try:
            sub = _pjson.loads(r[1])
        except Exception:
            continue
        try:
            webpush(subscription_info=sub, data=payload, vapid_private_key="vapid_private.pem",
                    vapid_claims={"sub": subject})
            sent += 1
        except WebPushException as e:
            code = getattr(getattr(e, "response", None), "status_code", None)
            print("[PUSH] 送信失敗(%s):" % code, str(e)[:100])
            if code in (404, 410): gone += 1
        except Exception as e:
            print("[PUSH] 送信エラー:", str(e)[:100])
    print("[PUSH] 送信 %d件 / 期限切れ %d件" % (sent, gone))

def main():
    creds = ""
    args = [a for a in sys.argv[1:] if a.strip()]
    if args and args[0].lower().endswith(".json"):
        creds = args[0]; args = args[1:]
    if not creds and os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
        creds = "creds.json"
    if creds and os.path.abspath(creds) != os.path.abspath("creds.json"):
        import shutil; shutil.copyfile(creds, "creds.json")
    creds = "creds.json"
    if not os.path.exists(creds):
        raise SystemExit("認証JSONが見つかりません。")

    os.environ["SHEET_ID"] = SHEET_ID
    poster.SHEET_ID = SHEET_ID

    today = datetime.datetime.now(JST).date()
    target = today + datetime.timedelta(days=2)
    if args:
        try:
            target = datetime.date.fromisoformat(args[0][:10])
            print("指定日を使用:", target)
        except Exception:
            print("日付形式が不正のため実行日+2日を使用:", args[0])
    hol, kind = day_kind(target)
    open_hour = 11 if hol else 16
    slots = [open_hour, 18, 20]

    sh = poster._sheets()
    if sh is None:
        raise SystemExit("シート接続に失敗（creds.json を確認）。")
    poster._ensure_tab(sh, APP_TAB)
    os.makedirs("out", exist_ok=True)
    existing_when = set()
    try:
        _rows = sh.values().get(spreadsheetId=SHEET_ID, range=APP_TAB + "!A:B").execute().get("values", [])
        for _r in _rows[1:]:
            if len(_r) > 1 and str(_r[1]).strip():
                existing_when.add(str(_r[1]).strip()[:16])
        print("既存枠数:", len(existing_when))
    except Exception as _e:
        print("既存行の取得に失敗（重複チェックなしで続行）:", _e)

    made = []
    first_token = ""
    for hour in slots:
        dt = datetime.datetime(target.year, target.month, target.day, hour, 0, tzinfo=JST)
        if dt.strftime("%Y-%m-%d %H:%M") in existing_when:
            print("既存のためスキップ:", dt.strftime("%Y-%m-%d %H:%M"))
            continue
        dec = decide(dt)
        pattern = dec["pattern"]
        fetch, comp, is_video = REG[pattern]
        run('python ' + fetch + ' "' + creds + '"')
        picked_json = ""
        try:
            picked_json = open(os.path.join("out", "picked.json"), encoding="utf-8").read()
        except Exception:
            pass
        poster_uri = ""
        blur = ""
        if is_video:
            run("npx remotion render " + comp + " out/post.mp4 --crf 26 --timeout 120000 --concurrency 1")
            _faststart("out/post.mp4")
            # ポスター静止画＋ぼかしを同じフレームから生成（先出し用）
            try:
                poster_uri, blur = thumb_data_uri(comp, True)
            except Exception:
                poster_uri, blur = "", ""
            try:
                mp4u = poster.up("out/post.mp4", cdn=True)
            except Exception:
                mp4u = ""
            uri = mp4u or poster_uri  # 動画が上がらなければポスター静止画で代替
        else:
            uri, blur = thumb_data_uri(comp, is_video)
        cap = caption_of(pattern)
        token = "P" + dt.strftime("%Y%m%d%H") + "_" + pattern
        if not first_token: first_token = token
        when = dt.strftime("%Y-%m-%d %H:%M")
        kindstr = "still"
        sh.values().append(spreadsheetId=SHEET_ID, range=APP_TAB + "!A:M",
            valueInputOption="RAW", insertDataOption="INSERT_ROWS",
            body={"values": [[token, when, dec["slot"], pattern, uri, cap, kindstr, "pending", "", picked_json, "", poster_uri, blur]]}).execute()
        print("[承認待ち] 登録:", token, pattern, "| サムネ", len(uri), "文字 | blur", len(blur), "|", cap)
        made.append((hour, PAT_JA.get(pattern, pattern), cap))

    if not made:
        print("対象日 %s は全枠が既に登録済み。新規登録もLINE通知もせずスキップしました。" % target)
        return
    appurl = poster._cell(sh, "Config!B14")
    lines = ["【%d/%d(%s) 投稿の事前確認】" % (target.month, target.day, kind)]
    for hour, patja, cap in made:
        lines.append("・%02d:00 %s … %s" % (hour, patja, cap or "（動画）"))
    lines += ["", "確認・操作はこちら↓", appurl,
              "※各投稿の10分前まで操作可。無反応なら予定どおり自動投稿します。"]
    poster.line_notify("\n".join(lines))
    try:
        pwa_url = os.environ.get("PWA_URL") or "https://amami-cell.github.io/susabiyu-media/app/"
        send_push(sh, "すさび湯 確認", "%d/%d の投稿 %d件が確認待ちです" % (target.month, target.day, len(made)), pwa_url, first_token)
    except Exception as e:
        print("[PUSH] 失敗(継続):", e)
    print("完了: %s ぶん %d枠を承認待ちに登録しました。" % (target, len(made)))

if __name__ == "__main__":
    main()
