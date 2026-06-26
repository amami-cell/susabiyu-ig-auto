# -*- coding: utf-8 -*-
import sys, os, re, subprocess, datetime, base64, io
from decide_post import decide, JST, day_kind
import poster

SHEET_ID = "13zKaUblOwmgZ-lgCfxylCLlW2Fqutqct5h5TvMRWv30"
APP_TAB = "承認待ち"
PAT_JA = {"sushi":"王道","tempo":"賑やか","typo":"雑誌風","photo":"全画面","simple":"額装","caption":"写真キャプション"}
REG = {
  "sushi":   ("fetch_drive_photos.py","SushiStory",True),
  "tempo":   ("fetch_tempo.py","TempoStory",True),
  "typo":    ("fetch_typo.py","TypoStory",True),
  "photo":   ("fetch_photostory.py","PhotoStory",True),
  "simple":  ("fetch_simple.py","SimpleStory",False),
  "caption": ("fetch_photostory.py","PhotoStory",False),
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

def thumb_data_uri(comp, is_video):
    png = "out/thumb.png"
    if os.path.exists(png):
        os.remove(png)
    if is_video:
        run("npx remotion still " + comp + " " + png + " --frame 45 --scale 1.0 --timeout 120000")
    else:
        run("npx remotion still " + comp + " " + png + " --scale 1.0 --timeout 120000")
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
        u = poster.up(_up)
        if u:
            return u
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
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        print("[THUMB] 生成失敗:", e)
        return ""

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
        if is_video:
            run("npx remotion render " + comp + " out/post.mp4 --crf 26 --timeout 120000 --concurrency 1")
            try:
                uri = poster.up("out/post.mp4") or thumb_data_uri(comp, is_video)
            except Exception:
                uri = thumb_data_uri(comp, is_video)
            try:
                poster_uri = thumb_data_uri(comp, True)
            except Exception:
                poster_uri = ""
        else:
            uri = thumb_data_uri(comp, is_video)
        cap = caption_of(pattern)
        token = "P" + dt.strftime("%Y%m%d%H") + "_" + pattern
        when = dt.strftime("%Y-%m-%d %H:%M")
        kindstr = "still"
        sh.values().append(spreadsheetId=SHEET_ID, range=APP_TAB + "!A:L",
            valueInputOption="RAW", insertDataOption="INSERT_ROWS",
            body={"values": [[token, when, dec["slot"], pattern, uri, cap, kindstr, "pending", "", picked_json, "", poster_uri]]}).execute()
        print("[承認待ち] 登録:", token, pattern, "| サムネ", len(uri), "文字 |", cap)
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
    print("完了: %s ぶん %d枠を承認待ちに登録しました。" % (target, len(made)))

if __name__ == "__main__":
    main()
