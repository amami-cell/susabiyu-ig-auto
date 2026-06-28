# -*- coding: utf-8 -*-
# 各動画パターンの「見本」を1本ずつ生成し、スプレッドの「パターン」タブに保存する。
# ギャラリー(PWA)で採用/無しを判断するためのサンプル置き場。
import os, sys, base64, datetime
import prepare, poster

SHEET_ID = prepare.SHEET_ID
TAB = "パターン"
REG = prepare.REG
PAT_JA = prepare.PAT_JA
JST = prepare.JST
HEADER = ["pattern", "label", "url", "poster", "blur", "enabled", "updated"]


def _ensure_creds():
    if not os.path.exists("creds.json") and os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
    os.environ["SHEET_ID"] = SHEET_ID
    poster.SHEET_ID = SHEET_ID


def upsert(sh, key, label, url, poster_uri, blur):
    rows = sh.values().get(spreadsheetId=SHEET_ID, range=TAB + "!A:G").execute().get("values", [])
    if not rows:
        sh.values().update(spreadsheetId=SHEET_ID, range=TAB + "!A1:G1",
                           valueInputOption="RAW", body={"values": [HEADER]}).execute()
        rows = [HEADER]
    now = datetime.datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    found = None
    for i, r in enumerate(rows):
        if i == 0:
            continue
        if r and str(r[0]) == key:
            found = i + 1
            enabled = r[5] if len(r) > 5 and str(r[5]).strip() != "" else "1"
            break
    if found:
        sh.values().update(spreadsheetId=SHEET_ID, range="%s!A%d:G%d" % (TAB, found, found),
            valueInputOption="RAW",
            body={"values": [[key, label, url, poster_uri, blur, enabled, now]]}).execute()
    else:
        sh.values().append(spreadsheetId=SHEET_ID, range=TAB + "!A:G",
            valueInputOption="RAW", insertDataOption="INSERT_ROWS",
            body={"values": [[key, label, url, poster_uri, blur, "1", now]]}).execute()
    print("[SAMPLE] %s 保存: %s" % (key, url[:60]))


def main():
    _ensure_creds()
    if not os.path.exists("creds.json"):
        raise SystemExit("認証JSONが見つかりません。")
    sh = poster._sheets()
    if sh is None:
        raise SystemExit("シート接続に失敗。")
    poster._ensure_tab(sh, TAB)
    only = set(a.strip() for a in sys.argv[1:] if a.strip())  # 任意: 対象パターンkeyを指定
    os.makedirs("out", exist_ok=True)
    made = 0
    for key, (fetch, comp, is_video) in REG.items():
        if not is_video:
            continue
        if only and key not in only:
            continue
        print("=== 見本生成:", key, "(", comp, ") ===")
        # FIXED系は使わずランダムで“代表的な仕上がり”を作る
        for k in ("FIXED_IDS", "FIXED_CAPTION", "FIXED_MUSIC"):
            os.environ.pop(k, None)
        try:
            prepare.run('python ' + fetch + ' "creds.json"')
            prepare.run("npx remotion render " + comp + " out/post.mp4 --crf 26 --timeout 120000 --concurrency 1")
            prepare._faststart("out/post.mp4")
            poster_uri, blur = prepare.thumb_data_uri(comp, True)
            try:
                url = poster.up("out/post.mp4", cdn=True)
            except Exception:
                url = ""
            url = url or poster_uri
            upsert(sh, key, PAT_JA.get(key, key), url, poster_uri, blur)
            made += 1
        except Exception as e:
            print("[SAMPLE] %s 失敗(継続):" % key, e)
    print("完了: 見本 %d種を更新しました。" % made)


if __name__ == "__main__":
    main()
