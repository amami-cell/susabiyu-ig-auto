# -*- coding: utf-8 -*-
import sys, os, subprocess, datetime, base64
from decide_post import decide, JST
import poster

DRY = os.environ.get("DRY") == "1"

# pattern -> (fetchスクリプト, render/still, Remotion合成ID, 出力, 動画か)
REG = {
    "sushi":   ("fetch_drive_photos.py", "render", "SushiStory",  "out/post.mp4", True),
    "tempo":   ("fetch_tempo.py",        "render", "TempoStory",  "out/post.mp4", True),
    "typo":    ("fetch_typo.py",         "render", "TypoStory",   "out/post.mp4", True),
    "photo":   ("fetch_photostory.py",   "render", "PhotoStory",  "out/post.mp4", True),
    "simple":  ("fetch_simple.py",       "still",  "SimpleStory", "out/post.png", False),
    "caption": ("fetch_photostory.py",   "still",  "PhotoStory",  "out/post.png", False),
}

def run(cmd):
    print(">>", cmd)
    if DRY:
        return
    r = subprocess.run(cmd, shell=True)
    if r.returncode != 0:
        raise SystemExit("コマンド失敗: " + cmd)

def main():
    creds = ""
    args = [a for a in sys.argv[1:] if a.strip()]
    if args and args[0].lower().endswith(".json"):
        creds = args[0]
        args = args[1:]
    if not creds and os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
        creds = "creds.json"
    if args:
        dt = datetime.datetime.fromisoformat(" ".join(args))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=JST)
    else:
        dt = datetime.datetime.now(JST)

    dec = decide(dt)
    print("時刻:", dt.strftime("%Y-%m-%d %H:%M"), "| 判定:", dec)

    if not dec["active"]:
        print("-> %d時はこの日(%s/OPEN%d時)の投稿枠ではありません。スキップ。" % (dt.hour, dec["kind"], dec["open_hour"]))
        return

    pattern = dec["pattern"]
    fetch, mode, comp, out, is_video = REG[pattern]
    cf = ' "' + creds + '"' if creds else ""
    run("python " + fetch + cf)
    if mode == "render":
        run("npx remotion render " + comp + " " + out + " --crf 18")
    else:
        run("npx remotion still " + comp + " " + out)
    media = os.path.join("out", os.path.basename(out))

    print("素材生成完了:", media, "| pattern:", pattern, "(" + ("動画" if is_video else "静止画") + ")")

    if DRY:
        print("(DRY中につき投稿はスキップ)")
        return
    poster.post(media, is_video, "")

if __name__ == "__main__":
    main()
