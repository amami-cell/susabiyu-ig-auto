# -*- coding: utf-8 -*-
"""多店舗展開：店舗マスター（既存スプレッドシートのタブ）を管理する。

使い方（GitHub Actions で実行）:
  python store_master.py init            … 「店舗マスター」タブ＋見出しを用意し、すさび湯三条を初期登録（吸い上げ）
  python store_master.py setup [store_id] … Drive URL が空の行に、店ごとのフォルダ一式を自動作成して URL を書き戻し＆共有
                                            store_id 省略時は URL 未設定の全行が対象

秘密情報の扱い: Instagram アクセストークンはマスターに載せず GitHub Secrets で管理する。
"""
import os, sys, base64, datetime
import requests as req

from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials

IGB = "https://graph.instagram.com/v23.0"
SHEET_ID = os.environ.get("SHEET_ID", "13zKaUblOwmgZ-lgCfxylCLlW2Fqutqct5h5TvMRWv30")
MASTER_TAB = "店舗マスター"
INTAKE_TAB = "店舗受付"
ROSTER_TAB = "提出チェック"
SHARE_EMAIL = os.environ.get("SHARE_EMAIL", "amami@8sin.co.jp")

# 提出チェック（私が店名を入れる→未提出が一目で分かる）。あなた専用・各店には共有しない。
ROSTER_HEADER = ["店舗名", "表示名（私が記載）", "アイコン短縮名（私が記載）",
                 "Instagramアカウント名（@〜）", "ログインID/メール", "パスワード",
                 "担当者・連絡先", "提出状況", "備考"]

# 各店に配る「記入用スプレッドシート」の見出し（店名は事前記入・各店が右を埋める）
DIST_HEADER = ["店舗名（記入済み）", "Instagramアカウント名（@〜）", "ログインID／メール",
               "Instagramパスワード", "担当者・お名前", "連絡先", "備考"]

# 各店（みんな）に書き込んでもらう入力用の見出し
INTAKE_HEADER = ["店舗名（正式）", "表示名（確認画面に出る店舗名・そのままでOK）",
                 "アイコン短縮名（任意・長い店名のみ記入）", "Instagramアカウント名（@〜）",
                 "ロゴ画像（Driveのロゴフォルダに入れた/リンク）", "担当者・連絡先",
                 "希望ログインコード(任意)", "希望管理者コード(任意)", "状態", "備考"]

# 列（1始まり）。A..S
HEADER = ["store_id", "店舗名", "表示名（確認画面の見出し）", "IGユーザー名", "IGユーザーID",
          "データシートID", "確認アプリURL(GAS)", "ログインコード", "管理者コード",
          "DriveルートURL", "食事URL", "ドリンクURL", "外観内観URL", "コースURL",
          "音楽アップテンポURL", "音楽ノーマルURL", "ロゴURL", "状態", "備考"]
# 新店で自動作成するサブフォルダ（表示名 → 書き戻す列index 0始まりでJ=9..Q=16）
SUBFOLDERS = ["食事", "ドリンク", "外観・内観", "コース", "音楽(アップテンポ)", "音楽(ノーマル)", "ロゴ"]


def _creds():
    path = "creds.json"
    if not os.path.exists(path) and os.environ.get("GOOGLE_CREDS_B64"):
        open(path, "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
    return Credentials.from_service_account_file(
        path, scopes=["https://www.googleapis.com/auth/spreadsheets",
                      "https://www.googleapis.com/auth/drive"])


def _sheets(cr):
    return build("sheets", "v4", credentials=cr).spreadsheets()


def _drive(cr):
    return build("drive", "v3", credentials=cr)


def _ensure_tab(sh, title):
    meta = sh.get(spreadsheetId=SHEET_ID, fields="sheets.properties.title").execute()
    titles = [s["properties"]["title"] for s in meta.get("sheets", [])]
    if title not in titles:
        sh.batchUpdate(spreadsheetId=SHEET_ID,
            body={"requests": [{"addSheet": {"properties": {"title": title}}}]}).execute()
        print("[MASTER] %s タブを作成" % title)


def _get_rows(sh):
    return sh.values().get(spreadsheetId=SHEET_ID, range=MASTER_TAB + "!A:S").execute().get("values", [])


def _folder_url(fid):
    return "https://drive.google.com/drive/folders/" + fid if fid else ""


def _drive_config():
    """drive_config.txt を KEY=VALUE で読む（すさび湯三条の初期吸い上げ用）。"""
    cfg = {}
    for p in ("drive_config.txt", "../drive_config.txt"):
        if os.path.exists(p):
            for line in open(p, encoding="utf-8"):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    cfg[k.strip()] = v.strip()
            break
    return cfg


def _ig_user_id():
    tok = os.environ.get("IG_ACCESS_TOKEN", "")
    if not tok:
        return ""
    try:
        r = req.get(IGB + "/me", params={"fields": "user_id,username", "access_token": tok}, timeout=30).json()
        return str(r.get("user_id") or r.get("id") or "")
    except Exception as e:
        print("[MASTER] IGユーザーID取得失敗:", e); return ""


def init():
    cr = _creds(); sh = _sheets(cr)
    _ensure_tab(sh, MASTER_TAB)
    rows = _get_rows(sh)
    # 見出し
    if not rows or [c.strip() for c in (rows[0] if rows else [])][:3] != HEADER[:3]:
        sh.values().update(spreadsheetId=SHEET_ID, range=MASTER_TAB + "!A1:S1",
            valueInputOption="RAW", body={"values": [HEADER]}).execute()
        print("[MASTER] 見出しを設定")
        rows = _get_rows(sh)
    # 既に susabiyu_sanjyo があればスキップ
    have = set(r[0].strip() for r in rows[1:] if r)
    if "susabiyu_sanjyo" in have:
        print("[MASTER] すさび湯三条は登録済み。初期登録はスキップ"); return
    cfg = _drive_config()
    g = lambda k, d="": os.environ.get(k) or cfg.get(k) or d
    row = [
        "susabiyu_sanjyo",
        "すさび湯 河原町三条店",
        "すさび湯三条",
        "@susabiyu_sanjyo",
        _ig_user_id(),
        g("SHEET_ID", SHEET_ID),
        os.environ.get("GAS_EXEC_URL", ""),
        "8888",
        "88888",
        _folder_url(g("ROOT_FOLDER_ID")),
        _folder_url(g("GENRE_FOOD_ID")),
        _folder_url(g("GENRE_SAKE_ID")),
        _folder_url(g("GENRE_INTERIOR_ID")),
        _folder_url(g("GENRE_EVENT_ID")),
        _folder_url(g("GENRE_MUSIC_UPTEMPO_ID")),
        _folder_url(g("GENRE_MUSIC_NORMAL_ID")),
        _folder_url(g("LOGO_FOLDER_ID", "1wAXPa6v3F-YC7dj6-j243xEkxra8RKOf")),
        "有効",
        "既存店（初期データ・自動吸い上げ）",
    ]
    sh.values().append(spreadsheetId=SHEET_ID, range=MASTER_TAB + "!A:S",
        valueInputOption="RAW", insertDataOption="INSERT_ROWS", body={"values": [row]}).execute()
    print("[MASTER] すさび湯三条を初期登録しました")


def _mkfolder(drive, name, parent=None):
    meta = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
    if parent:
        meta["parents"] = [parent]
    return drive.files().create(body=meta, fields="id", supportsAllDrives=True).execute()["id"]


def _share(drive, file_id, email):
    if not email:
        return
    try:
        drive.permissions().create(fileId=file_id, sendNotificationEmail=False,
            body={"type": "user", "role": "writer", "emailAddress": email},
            supportsAllDrives=True).execute()
    except Exception as e:
        print("[MASTER] 共有失敗(%s):" % email, e)


def setup(target_store=None):
    cr = _creds(); sh = _sheets(cr); drive = _drive(cr)
    rows = _get_rows(sh)
    if not rows or len(rows) < 2:
        print("[MASTER] 行がありません。先に init を実行してください"); return
    made = 0
    for i in range(1, len(rows)):
        row = rows[i] + [""] * (len(HEADER) - len(rows[i]))  # 右側を空で埋める
        sid = row[0].strip()
        sname = row[1].strip() or sid
        root_url = row[9].strip()                              # J列
        if not sid:
            continue
        if target_store and sid != target_store:
            continue
        if root_url:
            continue                                           # 既にDrive設定済み
        print("[MASTER] %s のDriveフォルダを作成中…" % sid)
        root = _mkfolder(drive, "%s 投稿素材" % sname)
        subs = [_mkfolder(drive, label, root) for label in SUBFOLDERS]
        _share(drive, root, SHARE_EMAIL)                       # ルート共有→配下も継承
        # J..Q（root, 食事, ドリンク, 外観内観, コース, 音楽アップ, 音楽ノーマル, ロゴ）
        urls = [_folder_url(root)] + [_folder_url(s) for s in subs]
        sh.values().update(spreadsheetId=SHEET_ID, range="%s!J%d:Q%d" % (MASTER_TAB, i + 1, i + 1),
            valueInputOption="RAW", body={"values": [urls]}).execute()
        made += 1
        print("[MASTER] %s 作成完了 → %s（%sに共有）" % (sid, _folder_url(root), SHARE_EMAIL))
    print("[MASTER] setup 完了：%d店ぶんのフォルダを作成" % made)


def intake():
    """各店（みんな）が記入する『店舗受付』タブを用意。アプリ実装やGASは不要で、まず集める用。"""
    cr = _creds(); sh = _sheets(cr)
    _ensure_tab(sh, INTAKE_TAB)
    sh.values().update(spreadsheetId=SHEET_ID, range=INTAKE_TAB + "!A1:J1",
        valueInputOption="RAW", body={"values": [INTAKE_HEADER]}).execute()
    ex = ["（記入例）すさび湯 河原町三条店", "すさび湯三条", "三条店", "@susabiyu_sanjyo",
          "ロゴをDriveの『ロゴ』フォルダに入れました", "担当：山田／080-xxxx-xxxx",
          "（空ならこちらで設定）", "（空ならこちらで設定）", "受付中",
          "写真・音楽は各Driveフォルダに入れてください"]
    rows = sh.values().get(spreadsheetId=SHEET_ID, range=INTAKE_TAB + "!A:J").execute().get("values", [])
    row2 = rows[1] if len(rows) > 1 else []
    if not row2 or str(row2[0] if row2 else "").startswith("（記入例）"):
        sh.values().update(spreadsheetId=SHEET_ID, range=INTAKE_TAB + "!A2:J2",
            valueInputOption="RAW", body={"values": [ex]}).execute()
    print("[MASTER] 『店舗受付』タブを用意しました（各店はここに記入）")


def roster():
    """『提出チェック』タブを用意。A列に店名を入れると、@名＋パスワードが揃った店は
    自動で『✅提出済み』、未記入は『⬜未提出』と表示（誰が未提出か一目で分かる）。
    ※あなた専用の管理タブ。各店には共有しない（パスワードを含むため）。"""
    cr = _creds(); sh = _sheets(cr)
    _ensure_tab(sh, ROSTER_TAB)
    sh.values().update(spreadsheetId=SHEET_ID, range=ROSTER_TAB + "!A1:I1",
        valueInputOption="RAW", body={"values": [ROSTER_HEADER]}).execute()
    # H列＝提出状況を自動判定（ARRAYFORMULA）。A列(店名)がある行だけ判定。
    formula = ('=ARRAYFORMULA(IF(A2:A="","",'
               'IF((D2:D<>"")*(F2:F<>""),"✅提出済み",'
               'IF((D2:D<>"")+(F2:F<>""),"△一部","⬜未提出"))))')
    sh.values().update(spreadsheetId=SHEET_ID, range=ROSTER_TAB + "!H2",
        valueInputOption="USER_ENTERED", body={"values": [[formula]]}).execute()
    print("[ROSTER] 『提出チェック』タブを用意しました（A列に店名を入力／H列は自動判定・消さない）")


def saemail():
    """サービスアカウントのメール(client_email)を表示。配布用シートの共有先に使う。"""
    import json as _json
    p = "creds.json"
    if not os.path.exists(p) and os.environ.get("GOOGLE_CREDS_B64"):
        open(p, "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
    try:
        j = _json.load(open(p, encoding="utf-8"))
        print("SA_EMAIL|" + str(j.get("client_email", "")))
    except Exception as e:
        print("[SA] 取得失敗:", e)


def distsheet():
    """各店配布用スプレッドシート(REQ_SHEET_ID=あなたが作りSAに共有した空シート)に、
    提出チェックの店名を事前記入した記入表（パスワード欄あり）を流し込む。"""
    sid = os.environ.get("REQ_SHEET_ID", "").strip()
    if not sid:
        print("[DIST] REQ_SHEET_ID未設定。空のスプレッドシートを作成しサービスアカウントに"
              "編集権限で共有→そのIDを REQ_SHEET_ID に入れて再実行してください。")
        return
    cr = _creds(); sp = _sheets(cr)
    rows = sp.values().get(spreadsheetId=SHEET_ID, range=ROSTER_TAB + "!A2:A").execute().get("values", [])
    stores = [(r[0].strip() if r else "") for r in rows]
    stores = [s for s in stores if s and not s.startswith("（記入例）")]
    try:
        meta = sp.get(spreadsheetId=sid, fields="sheets.properties.title").execute()
        titles = [s["properties"]["title"] for s in meta.get("sheets", [])]
        tab = titles[0] if titles else "シート1"
    except Exception as e:
        print("[DIST] 対象シートに接続できません（共有設定を確認）:", e); return
    values = [DIST_HEADER] + [[s, "", "", "", "", "", ""] for s in stores]
    sp.values().update(spreadsheetId=sid, range="%s!A1" % tab,
        valueInputOption="RAW", body={"values": values}).execute()
    print("[DIST] 配布用シートに %d 店を記入しました: https://docs.google.com/spreadsheets/d/%s/edit" % (len(stores), sid))


def pending():
    """承認待ちタブの各枠の状態（when/status/redo回数/pattern）を出力（redo詰まり診断用）。"""
    cr = _creds(); sh = _sheets(cr)
    try:
        rows = sh.values().get(spreadsheetId=SHEET_ID, range="承認待ち!A:K").execute().get("values", [])
    except Exception as e:
        print("[PEND] 読込失敗:", e); return
    for i in range(1, len(rows)):
        r = rows[i]
        g = lambda n: (r[n] if len(r) > n else "")
        when = str(g(1)).strip()
        if not when:
            continue
        print("PEND|when=%s|status=%s|redo=%s|pattern=%s|token=%s" % (when, g(7), g(10), g(3), g(0)))
    print("[PEND] 完了")


def names():
    """『提出チェック』タブA列の店名を一覧出力（配布用CSVを作るために読み取る）。"""
    cr = _creds(); sh = _sheets(cr)
    try:
        rows = sh.values().get(spreadsheetId=SHEET_ID, range=ROSTER_TAB + "!A2:A").execute().get("values", [])
    except Exception as e:
        print("[NAMES] 読み込み失敗:", e); return
    cnt = 0
    for r in rows:
        n = (r[0] if r else "").strip()
        if n and not n.startswith("（記入例）"):
            print("STORE|" + n); cnt += 1
    print("[NAMES] 合計 %d 店" % cnt)


def requestsheet():
    """各店に配る『記入用の独立スプレッドシート』を作成。本体（機密）とは別ファイルなので安全に共有可。
    列は『店舗受付』と同じ＝記入後そのまま本体の受付タブへコピペできる。
    サービスアカウントで新規作成できない環境では REQ_SHEET_ID に空シートIDを入れて再実行。"""
    cr = _creds(); sp = _sheets(cr); drive = _drive(cr)
    existing = os.environ.get("REQ_SHEET_ID", "").strip()
    if existing:
        sid = existing
        print("[REQ] 既存の記入用シートを使用:", sid)
    else:
        try:
            ss = build("sheets", "v4", credentials=cr).spreadsheets().create(
                body={"properties": {"title": "店舗受付（記入用・各店共有用）"},
                      "sheets": [{"properties": {"title": "受付"}}]},
                fields="spreadsheetId").execute()
            sid = ss["spreadsheetId"]
            print("[REQ] 新規スプレッドシートを作成:", sid)
        except Exception as e:
            print("[REQ] 作成失敗（サービスアカウントの制限の可能性）:", e)
            print("[REQ] 対処：空のスプレッドシートを手動作成→サービスアカウントに編集権限で共有→"
                  "そのIDを REQ_SHEET_ID に入れて再実行してください。")
            return
    try:
        meta = sp.get(spreadsheetId=sid, fields="sheets.properties.title").execute()
        titles = [s["properties"]["title"] for s in meta.get("sheets", [])]
        tab = "受付" if "受付" in titles else (titles[0] if titles else "シート1")
    except Exception:
        tab = "受付"
    sp.values().update(spreadsheetId=sid, range="%s!A1:J1" % tab, valueInputOption="RAW",
        body={"values": [INTAKE_HEADER]}).execute()
    ex = ["（記入例）すさび湯 河原町三条店", "すさび湯三条", "三条店", "@susabiyu_sanjyo",
          "ロゴをDriveの『ロゴ』フォルダに入れました", "担当：山田／080-xxxx-xxxx",
          "（空ならこちらで設定）", "（空ならこちらで設定）", "受付中",
          "写真・音楽は各Driveフォルダに入れてください"]
    sp.values().update(spreadsheetId=sid, range="%s!A2:J2" % tab, valueInputOption="RAW",
        body={"values": [ex]}).execute()
    _share(drive, sid, SHARE_EMAIL)
    try:
        drive.permissions().create(fileId=sid, body={"type": "anyone", "role": "writer"},
            supportsAllDrives=True).execute()
        link_note = "リンクを知っている人は編集可（必要なら後で制限可）"
    except Exception as e:
        print("[REQ] リンク共有設定はスキップ:", e); link_note = "（共有はあなたのみ。配布時に共有設定してください）"
    print("[REQ] 記入用スプレッドシート: https://docs.google.com/spreadsheets/d/%s/edit" % sid)
    print("[REQ] 共有先:", SHARE_EMAIL, "/", link_note)


def _tab_id(sh, title):
    meta = sh.get(spreadsheetId=SHEET_ID, fields="sheets.properties(title,sheetId)").execute()
    for s in meta.get("sheets", []):
        if s["properties"]["title"] == title:
            return s["properties"]["sheetId"]
    return None


def columns():
    """マスターに『アプリ表示』チェックボックス列(T)を用意。✓した店舗だけアプリに出す用。"""
    cr = _creds(); sh = _sheets(cr)
    _ensure_tab(sh, MASTER_TAB)
    gid = _tab_id(sh, MASTER_TAB)
    if gid is None:
        print("[MASTER] タブが見つかりません"); return
    sh.values().update(spreadsheetId=SHEET_ID, range=MASTER_TAB + "!T1",
        valueInputOption="RAW", body={"values": [["アプリ表示"]]}).execute()
    # T2:T1000 をチェックボックスに
    sh.batchUpdate(spreadsheetId=SHEET_ID, body={"requests": [{
        "setDataValidation": {
            "range": {"sheetId": gid, "startRowIndex": 1, "endRowIndex": 1000,
                      "startColumnIndex": 19, "endColumnIndex": 20},
            "rule": {"condition": {"type": "BOOLEAN"}, "showCustomUi": True, "strict": True}
        }
    }]}).execute()
    # すさび湯三条は稼働中なので最初からON
    rows = _get_rows(sh)
    for i in range(1, len(rows)):
        if rows[i] and rows[i][0].strip() == "susabiyu_sanjyo":
            sh.values().update(spreadsheetId=SHEET_ID, range="%s!T%d" % (MASTER_TAB, i + 1),
                valueInputOption="USER_ENTERED", body={"values": [[True]]}).execute()
            print("[MASTER] すさび湯三条を『アプリ表示』ONに設定")
            break
    # アイコン短縮名（任意・長い店名用）の列(U)。アプリのアイコン下ラベルに優先使用。
    sh.values().update(spreadsheetId=SHEET_ID, range=MASTER_TAB + "!U1",
        valueInputOption="RAW", body={"values": [["アイコン短縮名（任意）"]]}).execute()
    print("[MASTER] 『アプリ表示』(T)＋『アイコン短縮名』(U)列を用意しました")


if __name__ == "__main__":
    mode = (sys.argv[1] if len(sys.argv) > 1 else "init").strip().lower()
    arg = sys.argv[2].strip() if len(sys.argv) > 2 else None
    if mode == "init":
        init()
    elif mode == "setup":
        setup(arg)
    elif mode == "all":
        init(); setup(arg)
    elif mode == "columns":
        columns()
    elif mode == "intake":
        intake()
    elif mode == "requestsheet":
        requestsheet()
    elif mode == "roster":
        roster()
    elif mode == "names":
        names()
    elif mode == "pending":
        pending()
    elif mode == "saemail":
        saemail()
    elif mode == "distsheet":
        distsheet()
    else:
        print("使い方: python store_master.py init | setup [store_id] | columns | intake | requestsheet | roster | names | pending | saemail | distsheet | all")
