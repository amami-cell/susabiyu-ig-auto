# -*- coding: utf-8 -*-
import sys, os, json, datetime, base64, subprocess
from decide_post import decide, JST
import poster

SHEET_ID = "13zKaUblOwmgZ-lgCfxylCLlW2Fqutqct5h5TvMRWv30"
APP_TAB = "承認待ち"
DRY = os.environ.get("DRY") == "1"
REG = {
  "sushi":   ("fetch_drive_photos.py","render","SushiStory","out/post.mp4",True),
  "tempo":   ("fetch_tempo.py","render","TempoStory","out/post.mp4",True),
  "typo":    ("fetch_typo.py","render","TypoStory","out/post.mp4",True),
  "photo":   ("fetch_photostory.py","render","PhotoStory","out/post.mp4",True),
  "simple":  ("fetch_simple.py","still","SimpleStory","out/post.png",False),
  "caption": ("fetch_photostory.py","still","PhotoStory","out/post.png",False),
}

def run(cmd):
    print(">>", cmd)
    r = subprocess.run(cmd, shell=True)
    if r.returncode != 0:
        raise SystemExit("コマンド失敗: " + cmd)

def find_row(sh, when_str):
    data = sh.values().get(spreadsheetId=SHEET_ID, range=APP_TAB + "!A:J").execute().get("values", [])
    for i, r in enumerate(data):
        if i == 0:
            continue
        if len(r) > 1 and str(r[1]).strip()[:16] == when_str:
            return i + 1, r
    return None, None

def set_status(sh, rownum, status):
    now = datetime.datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!H%d:I%d" % (APP_TAB, rownum, rownum),
        valueInputOption="RAW", body={"values": [[status, now]]}).execute()

def main():
    creds = ""
    args = [a for a in sys.argv[1:] if a.strip()]
    if args and args[0].lower().endswith(".json"):
        creds = args[0]; args = args[1:]
    if not creds and os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"])); creds = "creds.json"
    if creds and os.path.abspath(creds) != os.path.abspath("creds.json"):
        import shutil; shutil.copyfile(creds, "creds.json")
    creds = "creds.json"

    os.environ["SHEET_ID"] = SHEET_ID
    poster.SHEET_ID = SHEET_ID

    if args:
        dt = datetime.datetime.fromisoformat(" ".join(args))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=JST)
    else:
        dt = datetime.datetime.now(JST)
    when_str = dt.strftime("%Y-%m-%d %H:%M")

    sh = poster._sheets()
    rownum, row = find_row(sh, when_str)
    if not row:
        print("承認待ち行なし:", when_str, "-> 投稿スキップ")
        poster.line_notify("[投稿スキップ] %s の承認待ちが見つかりませんでした" % when_str)
        return

    def col(n):
        return row[n] if len(row) > n else ""
    pattern = col(3); slot = col(2); status = col(7) or "pending"; picked_json = col(9)
    print("対象:", when_str, "| パターン:", pattern, "| 状態:", status)

    if status == "rejected":
        print("やめる指定 -> 投稿中止"); return
    if status == "redo":
        print("作り直し指定 -> 今回は投稿せず保留（再生成は次ステップ）"); return

    info = {}
    try:
        info = json.loads(picked_json) if picked_json else {}
    except Exception as e:
        print("JSON読込失敗:", e)
    ids = info.get("ids", []); caption = info.get("caption", ""); music = info.get("music", "")
    for k in ("FIXED_IDS", "FIXED_CAPTION", "FIXED_MUSIC"):
        os.environ.pop(k, None)
    if ids:
        os.environ["FIXED_IDS"] = ",".join(ids)
    if caption:
        os.environ["FIXED_CAPTION"] = caption
    if music:
        os.environ["FIXED_MUSIC"] = music
    print("固定生成: ids=%d caption=%r music=%r" % (len(ids), caption, music))

    fetch, mode, comp, out, is_video = REG[pattern]
    run('python ' + fetch + ' "' + creds + '"')
    if mode == "render":
        run("npx remotion render " + comp + " " + out + " --crf 18 --timeout 120000 --concurrency 1")
    else:
        run("npx remotion still " + comp + " " + out)
    media = os.path.join("out", os.path.basename(out))

    if DRY:
        print("[DRY] 生成完了:", media, "（投稿はしません）"); return
    ok = poster.post(media, is_video, caption, slot, pattern)
    if not ok:
        raise SystemExit("投稿失敗")
    set_status(sh, rownum, "posted")
    print("投稿完了 & 状態をpostedに更新")

if __name__ == "__main__":
    main()
