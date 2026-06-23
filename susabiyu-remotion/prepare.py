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
        run("npx remotion still " + comp + " " + png + " --frame 45 --scale 0.5")
    else:
        run("npx remotion still " + comp + " " + png + " --scale 0.5")
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
        creds = args[0]
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
    hol, kind = day_kind(target)
    open_hour = 11 if hol else 16
    slots = [open_hour, 18, 20]

    sh = poster._sheets()
    if sh is None:
        raise SystemExit("シート接続に失敗（creds.json を確認）。")
    poster._ensure_tab(sh, APP_TAB)
    os.makedirs("out", exist_ok=True)

    made = []
    for hour in slots:
        dt = datetime.datetime(target.year, target.month, target.day, hour, 0, tzinfo=JST)
        dec = decide(dt)
        pattern = dec["pattern"]
        fetch, comp, is_video = REG[pattern]
        run('python ' + fetch + ' "' + creds + '"')
        picked_json = ""
        try:
            picked_json = open(os.path.join("out", "picked.json"), encoding="utf-8").read()
        except Exception:
            pass
        uri = thumb_data_uri(comp, is_video)
        cap = caption_of(pattern)
        token = "P" + dt.strftime("%Y%m%d%H") + "_" + pattern
        when = dt.strftime("%Y-%m-%d %H:%M")
        kindstr = "still"
        sh.values().append(spreadsheetId=SHEET_ID, range=APP_TAB + "!A:J",
            valueInputOption="RAW", insertDataOption="INSERT_ROWS",
            body={"values": [[token, when, dec["slot"], pattern, uri, cap, kindstr, "pending", "", picked_json]]}).execute()
        print("[承認待ち] 登録:", token, pattern, "| サムネ", len(uri), "文字 |", cap)
        made.append((hour, PAT_JA.get(pattern, pattern), cap))

    appurl = poster._cell(sh, "Config!B14")
    lines = ["【%d/%d(%s) 投稿の事前確認】" % (target.month, target.day, kind)]
    for hour, patja, cap in made:
        lines.append("・%02d:00 %s … %s" % (hour, patja, cap or "（動画）"))
    lines += ["", "確認・操作はこちら↓", appurl,
              "※各投稿の10分前まで操作可。無反応なら予定どおり自動投稿します。"]
    poster.line_notify("\n".join(lines))
    print("完了: %s ぶん 3枠を承認待ちに登録しました。" % target)

if __name__ == "__main__":
    main()
