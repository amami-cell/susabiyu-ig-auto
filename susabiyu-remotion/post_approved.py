# -*- coding: utf-8 -*-
import os, sys, json, base64, datetime
import poster
import prepare

JST = datetime.timezone(datetime.timedelta(hours=9))
SHEET_ID = "13zKaUblOwmgZ-lgCfxylCLlW2Fqutqct5h5TvMRWv30"
APP_TAB = prepare.APP_TAB  # 承認待
DRY = os.environ.get("DRY") == "1"
MAX_REDO = 2

REG = prepare.REG
decide = prepare.decide
thumb_data_uri = prepare.thumb_data_uri
caption_of = prepare.caption_of


def run(cmd):
    import subprocess
    print(">>", cmd)
    r = subprocess.run(cmd, shell=True)
    if r.returncode != 0:
        raise SystemExit("\u30b3\u30de\u30f3\u30c9\u5931\u6557: " + cmd)


def find_row(sh, when_str):
    data = sh.values().get(spreadsheetId=SHEET_ID, range=APP_TAB + "!A:K").execute().get("values", [])
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


def get_redo_count(row):
    # K\u5217(index 10) \u306eredo\u56de\u6570
    try:
        return int(str(row[10]).strip())
    except Exception:
        return 0


def update_preview_row(sh, rownum, pattern, uri, cap, picked_json, redo_count):
    # E(\u30d7\u30ec\u30d3\u30e5\u30fc)=uri, F(caption)=cap, D(pattern)=pattern, J(picked_json), H=pending, I=now, K=redo_count
    now = datetime.datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    # D\u5217 pattern
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!D%d" % (APP_TAB, rownum),
        valueInputOption="RAW", body={"values": [[pattern]]}).execute()
    # E:F \u30d7\u30ec\u30d3\u30e5\u30fc\u3068caption
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!E%d:F%d" % (APP_TAB, rownum, rownum),
        valueInputOption="RAW", body={"values": [[uri, cap]]}).execute()
    # H:I status/now
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!H%d:I%d" % (APP_TAB, rownum, rownum),
        valueInputOption="RAW", body={"values": [["pending", now]]}).execute()
    # J picked_json
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!J%d" % (APP_TAB, rownum),
        valueInputOption="RAW", body={"values": [[picked_json]]}).execute()
    # K redo_count
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!K%d" % (APP_TAB, rownum),
        valueInputOption="RAW", body={"values": [[redo_count]]}).execute()


def regenerate(creds, dt):
    # prepare.py \u76f8\u5f53\u306e1\u67a0\u751f\u6210\u3092 FIXED\u7121\u3057\uff08\u5168\u30e9\u30f3\u30c0\u30e0\uff09\u3067\u5b9f\u884c
    for k in ("FIXED_IDS", "FIXED_CAPTION", "FIXED_MUSIC"):
        os.environ.pop(k, None)
    dec = decide(dt)
    pattern = dec["pattern"]
    fetch, comp, is_video = REG[pattern]
    cf = ' "' + creds + '"' if creds else ""
    run("python " + fetch + cf)
    if is_video:
        run("npx remotion render " + comp + " out/post.mp4 --crf 18 --timeout 120000 --concurrency 1")
    else:
        run("npx remotion still " + comp + " out/post.png")
    picked_json = ""
    try:
        picked_json = open(os.path.join("out", "picked.json"), encoding="utf-8").read()
    except Exception:
        pass
    uri = thumb_data_uri(comp, is_video)
    cap = caption_of(pattern)
    return pattern, uri, cap, picked_json


def line_redo_notify(sh, dt, pattern, cap, redo_count):
    try:
        appurl = poster._cell(sh, "Config!B14")
    except Exception:
        appurl = ""
    patja = prepare.PAT_JA.get(pattern, pattern) if hasattr(prepare, "PAT_JA") else pattern
    lines = [
        "\u3010\u4f5c\u308a\u76f4\u3057\u307e\u3057\u305f\u3011%d/%d %02d:00" % (dt.month, dt.day, dt.hour),
        "\u30d1\u30bf\u30fc\u30f3: %s" % patja,
        "\u5185\u5bb9: %s" % (cap or "\uff08\u52d5\u753b\uff09"),
        "\uff08\u4f5c\u308a\u76f4\u3057 %d/%d \u56de\u76ee\uff09" % (redo_count, MAX_REDO),
        "",
        "\u78ba\u8a8d\u30fb\u64cd\u4f5c\u306f\u3053\u3061\u3089\u2193",
        appurl,
    ]
    try:
        poster.line_notify("\n".join(lines))
    except Exception as e:
        print("LINE\u901a\u77e5\u5931\u6557(\u7d99\u7d9a):", e)


def line_redo_limit_notify(sh, dt, pattern, cap):
    try:
        appurl = poster._cell(sh, "Config!B14")
    except Exception:
        appurl = ""
    patja = prepare.PAT_JA.get(pattern, pattern) if hasattr(prepare, "PAT_JA") else pattern
    lines = [
        "\u3010\u4f5c\u308a\u76f4\u3057\u4e0a\u9650\u3011%d/%d %02d:00" % (dt.month, dt.day, dt.hour),
        "\u4f5c\u308a\u76f4\u3057\u304c%d\u56de\u306b\u9054\u3057\u305f\u305f\u3081\u3001\u3053\u306e\u5185\u5bb9\u3067\u4e88\u5b9a\u6295\u7a3f\u3057\u307e\u3059\u3002" % MAX_REDO,
        "\u30d1\u30bf\u30fc\u30f3: %s" % patja,
        "\u5185\u5bb9: %s" % (cap or "\uff08\u52d5\u753b\uff09"),
        "",
        "\u3084\u3081\u308b\u5834\u5408\u306f\u3053\u3061\u3089\u2193",
        appurl,
    ]
    try:
        poster.line_notify("\n".join(lines))
    except Exception as e:
        print("LINE\u901a\u77e5\u5931\u6557(\u7d99\u7d9a):", e)


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
    if not rownum:
        print("\u8a72\u5f53\u679a\u306a\u3057:", when_str, "-> \u30b9\u30ad\u30c3\u30d7")
        return

    def col(n):
        return row[n] if len(row) > n else ""

    pattern = col(3); slot = col(2); status = str(col(7) or "pending"); picked_json = col(9)
    print("\u5bfe\u8c61:", when_str, "| status:", status, "| pattern:", pattern)

    if status == "rejected":
        print("\u3084\u3081\u308b\u6307\u5b9a -> \u30b9\u30ad\u30c3\u30d7")
        return

    if status == "posted":
        print("\u65e2\u306b\u6295\u7a3f\u6e08 -> \u30b9\u30ad\u30c3\u30d7")
        return

    if status == "redo":
        redo_count = get_redo_count(row)
        if redo_count >= MAX_REDO:
            set_status(sh, rownum, "pending")
            line_redo_limit_notify(sh, dt, pattern, col(5))
            print("\u4f5c\u308a\u76f4\u3057\u4e0a\u9650(%d) -> pending\u306b\u623b\u3057\u3066\u4e88\u5b9a\u6295\u7a3f" % MAX_REDO)
            return
        new_pattern, uri, cap, new_picked = regenerate(creds, dt)
        update_preview_row(sh, rownum, new_pattern, uri, cap, new_picked, redo_count + 1)
        line_redo_notify(sh, dt, new_pattern, cap, redo_count + 1)
        print("\u4f5c\u308a\u76f4\u3057\u5b8c\u4e86 -> pending\u306b\u623b\u3057\u3066\u518d\u63d0\u6848 (%d/%d\u56de\u76ee, pattern=%s)" % (redo_count + 1, MAX_REDO, new_pattern))
        return

    info = {}
    try:
        info = json.loads(picked_json) if picked_json else {}
    except Exception as e:
        print("JSON\u8aad\u8fbc\u5931\u6557:", e)
    ids = info.get("ids", []); caption = info.get("caption", ""); music = info.get("music", "")
    for k in ("FIXED_IDS", "FIXED_CAPTION", "FIXED_MUSIC"):
        os.environ.pop(k, None)
    if ids:
        os.environ["FIXED_IDS"] = ",".join(ids)
    if caption:
        os.environ["FIXED_CAPTION"] = caption
    if music:
        os.environ["FIXED_MUSIC"] = music
    print("\u56fa\u5b9a\u751f\u6210: ids=%d caption=%r music=%r" % (len(ids), caption, music))

    fetch, comp, is_video = REG[pattern]
    cf = ' "' + creds + '"' if creds else ""
    run("python " + fetch + cf)
    if is_video:
        run("npx remotion render " + comp + " out/post.mp4 --crf 18 --timeout 120000 --concurrency 1")
    else:
        run("npx remotion still " + comp + " out/post.png")
    media = os.path.join("out", os.path.basename("out/post.mp4" if is_video else "out/post.png"))

    if DRY:
        print("[DRY] \u751f\u6210\u5b8c\u4e86:", media, "\uff08\u6295\u7a3f\u306f\u3057\u307e\u305b\u3093\uff09"); return
    ok = poster.post(media, is_video, caption, slot, pattern)
    if not ok:
        raise SystemExit("\u6295\u7a3f\u5931\u6557")
    set_status(sh, rownum, "posted")
    print("\u6295\u7a3f\u5b8c\u4e86 & \u72b6\u614b\u3092posted\u306b\u66f4\u65b0")


if __name__ == "__main__":
    main()
