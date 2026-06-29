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
# 既定で採用(=投稿に使う)のは基本4種だけ。新パターンは見本で採用されるまで「無し(0)」。
CORE = {"sushi", "tempo", "typo", "photo"}


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
        default_enabled = "1" if key in CORE else "0"
        sh.values().append(spreadsheetId=SHEET_ID, range=TAB + "!A:G",
            valueInputOption="RAW", insertDataOption="INSERT_ROWS",
            body={"values": [[key, label, url, poster_uri, blur, default_enabled, now]]}).execute()
    print("[SAMPLE] %s 保存: %s" % (key, url[:60]))


def prune(sh, valid_keys):
    """現在のコード(REG)に無いパターン＝過去に作って削除した見本の行を「パターン」タブから物理削除する。
    これでギャラリーから消える。今後コードから外したパターンも自動で見本から消える。"""
    try:
        meta = sh.get(spreadsheetId=SHEET_ID, fields="sheets(properties(sheetId,title))").execute()
        sid = None
        for s in meta.get("sheets", []):
            if s["properties"]["title"] == TAB:
                sid = s["properties"]["sheetId"]
                break
        if sid is None:
            return
        rows = sh.values().get(spreadsheetId=SHEET_ID, range=TAB + "!A:G").execute().get("values", [])
        drop = []
        for i, r in enumerate(rows):
            if i == 0 or not r:
                continue
            key = str(r[0]).strip()
            if key and key not in valid_keys:
                drop.append(i)
        if not drop:
            return
        reqs = [{"deleteDimension": {"range": {"sheetId": sid, "dimension": "ROWS",
                "startIndex": i, "endIndex": i + 1}}} for i in sorted(drop, reverse=True)]
        sh.batchUpdate(spreadsheetId=SHEET_ID, body={"requests": reqs}).execute()
        print("[PRUNE] 旧パターン行を削除:", [str(rows[i][0]) for i in drop])
    except Exception as e:
        print("[PRUNE] 削除スキップ:", e)


def main():
    _ensure_creds()
    if not os.path.exists("creds.json"):
        raise SystemExit("認証JSONが見つかりません。")
    sh = poster._sheets()
    if sh is None:
        raise SystemExit("シート接続に失敗。")
    poster._ensure_tab(sh, TAB)
    prune(sh, set(REG.keys()))  # コードから消したパターンの見本行を掃除
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
            prepare.run("npx remotion render " + comp + " out/post.mp4 --crf 18 --timeout 120000 --concurrency 1")
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
