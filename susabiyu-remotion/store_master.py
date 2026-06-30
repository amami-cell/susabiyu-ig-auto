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
SHARE_EMAIL = os.environ.get("SHARE_EMAIL", "amami@8sin.co.jp")

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
    else:
        print("使い方: python store_master.py init | setup [store_id] | columns | intake | all")
