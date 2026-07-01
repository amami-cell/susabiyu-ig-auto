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


def distsheet(target=None):
    """各店配布用スプレッドシート(あなたが作りSAに共有した空シート)に、提出チェックの
    店名を事前記入した記入表（パスワード欄あり）を流し込む。target はシートID or URL。"""
    import re as _re
    sid = (target or os.environ.get("REQ_SHEET_ID", "") or "").strip()
    m = _re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", sid)  # URLが来たらID抽出
    if m:
        sid = m.group(1)
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


def _share_anyone(drive, fid):
    try:
        drive.permissions().create(fileId=fid, body={"type": "anyone", "role": "writer"},
            supportsAllDrives=True).execute()
    except Exception as e:
        print("[DIST] リンク共有設定スキップ:", e)


def distdrive(target=None):
    """配布用シートを見やすく整形（交互色＋枠＋ヘッダー固定）＋各店の画像/音楽フォルダを作成し
    H/I列にURLを貼付＋すさび湯三条を記入例として全項目埋める。target はシートID or URL。"""
    import re as _re
    sid = (target or os.environ.get("REQ_SHEET_ID", "") or "").strip()
    m = _re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", sid)
    if m:
        sid = m.group(1)
    if not sid:
        print("[DIST] シートID/URLが必要です"); return
    cr = _creds(); sp = _sheets(cr); drive = _drive(cr)
    props = sp.get(spreadsheetId=sid, fields="sheets.properties(sheetId,title)").execute()["sheets"][0]["properties"]
    gid = props["sheetId"]; tab = props["title"]
    rows = sp.values().get(spreadsheetId=sid, range="%s!A:I" % tab).execute().get("values", [])
    # 親フォルダ（全店の素材をまとめる）
    parent = _mkfolder(drive, "すさび湯グループ 投稿素材（画像・音楽）")
    _share_anyone(drive, parent); _share(drive, parent, SHARE_EMAIL)
    # H/I 見出し
    sp.values().update(spreadsheetId=sid, range="%s!H1:I1" % tab, valueInputOption="RAW",
        body={"values": [["画像データ用Drive（URL）", "音楽データ用Drive（URL）"]]}).execute()
    # 各店の画像/音楽フォルダ作成→URL（親配下＝親の共有を継承）
    hi = []
    for i in range(1, len(rows)):
        name = (rows[i][0].strip() if rows[i] else "")
        if not name:
            hi.append(["", ""]); continue
        img = _mkfolder(drive, name + " 画像", parent)
        mus = _mkfolder(drive, name + " 音楽", parent)
        hi.append([_folder_url(img), _folder_url(mus)])
        print("[DIST] %s の画像/音楽フォルダ作成" % name)
    if hi:
        sp.values().update(spreadsheetId=sid, range="%s!H2:I%d" % (tab, 1 + len(hi)),
            valueInputOption="RAW", body={"values": hi}).execute()
    # すさび湯三条を記入例として全項目埋める（B〜G）
    ex_row = 2
    for i in range(1, len(rows)):
        if rows[i] and "すさび湯 河原町三条店" in str(rows[i][0]):
            ex_row = i + 1; break
    ex = ["@susabiyu_sanjyo", "susabiyu_sanjyo（メールでも可）", "（ここに実際のパスワードを記入）",
          "本部・天海", "amami@8sin.co.jp", "【記入例】この行のように各項目を記入してください"]
    sp.values().update(spreadsheetId=sid, range="%s!B%d:G%d" % (tab, ex_row, ex_row),
        valueInputOption="RAW", body={"values": [ex]}).execute()
    # 書式：ヘッダー固定＋濃色ヘッダー＋罫線＋列幅（冪等）
    N = max(len(rows), 26)
    fmt = [
        {"updateSheetProperties": {"properties": {"sheetId": gid, "gridProperties": {"frozenRowCount": 1}},
            "fields": "gridProperties.frozenRowCount"}},
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 9},
            "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.17, "green": 0.24, "blue": 0.33},
                "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP",
                "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}}},
            "fields": "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)"}},
        {"updateBorders": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": N, "startColumnIndex": 0, "endColumnIndex": 9},
            "top": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "bottom": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "left": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "right": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "innerHorizontal": {"style": "SOLID", "color": {"red": 0.82, "green": 0.85, "blue": 0.89}},
            "innerVertical": {"style": "SOLID", "color": {"red": 0.82, "green": 0.85, "blue": 0.89}}}},
    ]
    widths = [("A", 200), ("B", 200), ("C", 210), ("D", 210), ("E", 150), ("F", 190), ("G", 240), ("H", 260), ("I", 260)]
    for idx, (col, w) in enumerate(widths):
        fmt.append({"updateDimensionProperties": {"range": {"sheetId": gid, "dimension": "COLUMNS",
            "startIndex": idx, "endIndex": idx + 1}, "properties": {"pixelSize": w}, "fields": "pixelSize"}})
    try:
        sp.batchUpdate(spreadsheetId=sid, body={"requests": fmt}).execute()
    except Exception as e:
        print("[DIST] 書式(基本)一部スキップ:", e)
    # 交互色バンディング（既にあると失敗するので単独try）
    try:
        sp.batchUpdate(spreadsheetId=sid, body={"requests": [
            {"addBanding": {"bandedRange": {"range": {"sheetId": gid, "startRowIndex": 1, "endRowIndex": N,
                "startColumnIndex": 0, "endColumnIndex": 9},
                "rowProperties": {"firstBandColor": {"red": 1, "green": 1, "blue": 1},
                    "secondBandColor": {"red": 0.94, "green": 0.96, "blue": 0.98}}}}}]}).execute()
    except Exception as e:
        print("[DIST] 交互色は既に設定済みかスキップ:", e)
    print("[DIST] 完了：画像/音楽フォルダ作成＋整形＋記入例入力: https://docs.google.com/spreadsheets/d/%s/edit" % sid)


def _folder_id_from_url(u):
    import re as _re
    m = _re.search(r"/folders/([a-zA-Z0-9_-]+)", u or "")
    return m.group(1) if m else ""


def _child_folder(drive, parent_id, name):
    q = ("'%s' in parents and name = '%s' and mimeType = 'application/vnd.google-apps.folder' "
         "and trashed = false") % (parent_id, name.replace("'", "\\'"))
    try:
        r = drive.files().list(q=q, fields="files(id,name)", spaces="drive",
            supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
        fs = r.get("files", [])
        return fs[0]["id"] if fs else None
    except Exception:
        return None


def _ensure_sub(drive, parent_id, name):
    ex = _child_folder(drive, parent_id, name)
    return ex if ex else _mkfolder(drive, name, parent_id)


def distsub(target=None):
    """既存の画像/音楽フォルダ(H/I列URL)の中にサブフォルダを作成し、アップロード案内タブを追加。
    画像: フード/ドリンク/コース・集合写真/ロゴ/外観・内観、音楽: ノーマル/アップテンポ。冪等。"""
    import re as _re
    sid = (target or os.environ.get("REQ_SHEET_ID", "") or "").strip()
    m = _re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", sid)
    if m:
        sid = m.group(1)
    if not sid:
        print("[SUB] シートID/URLが必要です"); return
    cr = _creds(); sp = _sheets(cr); drive = _drive(cr)
    props = sp.get(spreadsheetId=sid, fields="sheets.properties(sheetId,title)").execute()["sheets"][0]["properties"]
    tab = props["title"]
    rows = sp.values().get(spreadsheetId=sid, range="%s!A:I" % tab).execute().get("values", [])
    IMG_SUB = ["フード", "ドリンク", "コース・集合写真", "ロゴ", "外観・内観"]
    MUS_SUB = ["ノーマル", "アップテンポ"]
    for i in range(1, len(rows)):
        row = rows[i]
        name = (row[0].strip() if row else "")
        if not name:
            continue
        iid = _folder_id_from_url(row[7] if len(row) > 7 else "")
        mid = _folder_id_from_url(row[8] if len(row) > 8 else "")
        if iid:
            for s in IMG_SUB:
                _ensure_sub(drive, iid, s)
        if mid:
            for s in MUS_SUB:
                _ensure_sub(drive, mid, s)
        print("[SUB] %s サブフォルダ整備" % name)
    # 案内タブ
    guide_title = "アップロード案内"
    meta = sp.get(spreadsheetId=sid, fields="sheets.properties(sheetId,title)").execute()
    titles = [s["properties"]["title"] for s in meta.get("sheets", [])]
    if guide_title not in titles:
        sp.batchUpdate(spreadsheetId=sid, body={"requests": [
            {"addSheet": {"properties": {"title": guide_title}}}]}).execute()
    lines = [
        ["■ 素材アップロードのご案内"],
        [""],
        ["各店の「画像データ用Drive」「音楽データ用Drive」（一覧シートのH・I列のURL）を開き、下記のフォルダに入れてください。"],
        ["フォルダはこちらで用意しています。"],
        [""],
        ["【画像データ用Drive】"],
        ["・フード … 料理の写真（必要ならフードの中をメニュー別にさらにフォルダ分けしてもOK）"],
        ["・ドリンク … ドリンク・お酒の写真"],
        ["・コース・集合写真 … コース料理／宴会／集合写真"],
        ["・ロゴ … お店のロゴ画像"],
        ["・外観・内観 … お店の外観・店内の写真"],
        [""],
        ["【音楽データ用Drive】"],
        ["・ノーマル … 落ち着いた／通常テンポのBGM"],
        ["・アップテンポ … 明るい／テンポの速いBGM"],
        [""],
        ["※ 写真はできるだけ高画質・タテ長(9:16)だときれいに使えます。"],
        ["※ 各フォルダのURLは一覧シートのH列（画像）・I列（音楽）にあります。"],
    ]
    sp.values().update(spreadsheetId=sid, range="%s!A1" % guide_title,
        valueInputOption="RAW", body={"values": lines}).execute()
    try:
        gg = [s["properties"]["sheetId"] for s in
              sp.get(spreadsheetId=sid, fields="sheets.properties(sheetId,title)").execute()["sheets"]
              if s["properties"]["title"] == guide_title][0]
        sp.batchUpdate(spreadsheetId=sid, body={"requests": [
            {"updateDimensionProperties": {"range": {"sheetId": gg, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 1},
                "properties": {"pixelSize": 760}, "fields": "pixelSize"}},
            {"repeatCell": {"range": {"sheetId": gg, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 1},
                "cell": {"userEnteredFormat": {"textFormat": {"bold": True, "fontSize": 13}}},
                "fields": "userEnteredFormat.textFormat"}}]}).execute()
    except Exception as e:
        print("[SUB] 案内タブ書式スキップ:", e)
    print("[SUB] 完了：サブフォルダ作成＋案内タブ: https://docs.google.com/spreadsheets/d/%s/edit" % sid)


def distnote(target=None):
    """一覧シートの右側(K列)に『フォルダの入れ方』案内を併記＋H1/I1(URL見出し)にセルメモ。"""
    import re as _re
    sid = (target or os.environ.get("REQ_SHEET_ID", "") or "").strip()
    m = _re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", sid)
    if m:
        sid = m.group(1)
    if not sid:
        print("[NOTE] シートID/URLが必要です"); return
    cr = _creds(); sp = _sheets(cr)
    props = sp.get(spreadsheetId=sid, fields="sheets.properties(sheetId,title)").execute()["sheets"][0]["properties"]
    gid = props["sheetId"]; tab = props["title"]
    guide = [
        ["📁 フォルダの入れ方（画像＝H列のURL／音楽＝I列のURL）"],
        ["【画像データ用Drive】の中のフォルダ"],
        ["　フード＝料理の写真（フードの中はメニュー別にさらに分けてもOK）"],
        ["　ドリンク＝ドリンク・お酒の写真"],
        ["　コース・集合写真＝コース料理／宴会／集合写真"],
        ["　ロゴ＝お店のロゴ画像"],
        ["　外観・内観＝お店の外観・店内の写真"],
        ["【音楽データ用Drive】の中のフォルダ"],
        ["　ノーマル＝落ち着いた／通常テンポのBGM"],
        ["　アップテンポ＝明るい／テンポの速いBGM"],
        ["※ 写真は高画質・タテ長(9:16)だときれいに使えます"],
    ]
    sp.values().update(spreadsheetId=sid, range="%s!K1" % tab,
        valueInputOption="RAW", body={"values": guide}).execute()
    n = len(guide)
    reqs = [
        {"updateDimensionProperties": {"range": {"sheetId": gid, "dimension": "COLUMNS", "startIndex": 10, "endIndex": 11},
            "properties": {"pixelSize": 560}, "fields": "pixelSize"}},
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": n, "startColumnIndex": 10, "endColumnIndex": 11},
            "cell": {"userEnteredFormat": {"wrapStrategy": "WRAP", "verticalAlignment": "MIDDLE",
                "backgroundColor": {"red": 1.0, "green": 0.97, "blue": 0.86}}},
            "fields": "userEnteredFormat(wrapStrategy,verticalAlignment,backgroundColor)"}},
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 10, "endColumnIndex": 11},
            "cell": {"userEnteredFormat": {"textFormat": {"bold": True, "fontSize": 12},
                "backgroundColor": {"red": 0.99, "green": 0.9, "blue": 0.6}}},
            "fields": "userEnteredFormat(textFormat,backgroundColor)"}},
        {"updateBorders": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": n, "startColumnIndex": 10, "endColumnIndex": 11},
            "top": {"style": "SOLID", "color": {"red": 0.85, "green": 0.7, "blue": 0.3}},
            "bottom": {"style": "SOLID", "color": {"red": 0.85, "green": 0.7, "blue": 0.3}},
            "left": {"style": "SOLID", "color": {"red": 0.85, "green": 0.7, "blue": 0.3}},
            "right": {"style": "SOLID", "color": {"red": 0.85, "green": 0.7, "blue": 0.3}},
            "innerHorizontal": {"style": "SOLID", "color": {"red": 0.93, "green": 0.85, "blue": 0.6}}}},
        {"updateCells": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 7, "endColumnIndex": 8},
            "rows": [{"values": [{"note": "中のフォルダ：フード／ドリンク／コース・集合写真／ロゴ／外観・内観。フードはメニュー別にさらに分けてもOK。"}]}],
            "fields": "note"}},
        {"updateCells": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 8, "endColumnIndex": 9},
            "rows": [{"values": [{"note": "中のフォルダ：ノーマル／アップテンポ。"}]}],
            "fields": "note"}},
    ]
    try:
        sp.batchUpdate(spreadsheetId=sid, body={"requests": reqs}).execute()
    except Exception as e:
        print("[NOTE] 書式一部スキップ:", e)
    print("[NOTE] 完了：一覧シート右(K列)に案内併記＋URL見出しにメモ: https://docs.google.com/spreadsheets/d/%s/edit" % sid)


def disttop(target=None):
    """右のK列案内を撤去し、表の上（先頭）に案内バナーを差し込む。その下から表（見出し＋各店行）。"""
    import re as _re
    sid = (target or os.environ.get("REQ_SHEET_ID", "") or "").strip()
    m = _re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", sid)
    if m:
        sid = m.group(1)
    if not sid:
        print("[TOP] シートID/URLが必要です"); return
    cr = _creds(); sp = _sheets(cr)
    props = sp.get(spreadsheetId=sid, fields="sheets.properties(sheetId,title)").execute()["sheets"][0]["properties"]
    gid = props["sheetId"]; tab = props["title"]
    # 先頭に4行挿入（案内3行＋空1行）→ 見出し/データはその下へ
    sp.batchUpdate(spreadsheetId=sid, body={"requests": [
        {"insertDimension": {"range": {"sheetId": gid, "dimension": "ROWS", "startIndex": 0, "endIndex": 4},
            "inheritFromBefore": False}}]}).execute()
    guide = [
        ["📁 アップロードのご案内 ── 自分の店の行に入力し、Drive（H列＝画像／I列＝音楽）に素材を入れてください"],
        ["【画像】フード＝料理写真（フードの中はメニュー別にさらに分けてもOK）／ドリンク＝ドリンク・お酒／コース・集合写真＝コース料理・宴会・集合／ロゴ＝店ロゴ／外観・内観＝外観・店内"],
        ["【音楽】ノーマル＝落ち着いた・通常テンポのBGM／アップテンポ＝明るい・速いテンポのBGM　※写真は高画質・タテ長(9:16)推奨"],
    ]
    sp.values().update(spreadsheetId=sid, range="%s!A1" % tab, valueInputOption="RAW", body={"values": guide}).execute()
    # 右のK列案内を消す（値）
    sp.values().clear(spreadsheetId=sid, range="%s!K1:K200" % tab, body={}).execute()
    B = {"style": "SOLID", "color": {"red": 0.85, "green": 0.7, "blue": 0.3}}
    NB = {"style": "NONE"}
    reqs = [
        {"mergeCells": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}},
        {"mergeCells": {"range": {"sheetId": gid, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 0, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}},
        {"mergeCells": {"range": {"sheetId": gid, "startRowIndex": 2, "endRowIndex": 3, "startColumnIndex": 0, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}},
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 3, "startColumnIndex": 0, "endColumnIndex": 9},
            "cell": {"userEnteredFormat": {"wrapStrategy": "WRAP", "verticalAlignment": "MIDDLE",
                "backgroundColor": {"red": 1.0, "green": 0.97, "blue": 0.86}, "textFormat": {"fontSize": 11}}},
            "fields": "userEnteredFormat(wrapStrategy,verticalAlignment,backgroundColor,textFormat)"}},
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 9},
            "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.99, "green": 0.9, "blue": 0.6}, "textFormat": {"bold": True, "fontSize": 13}}},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"}},
        {"updateBorders": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 3, "startColumnIndex": 0, "endColumnIndex": 9},
            "top": B, "bottom": B, "left": B, "right": B, "innerHorizontal": B}},
        {"updateDimensionProperties": {"range": {"sheetId": gid, "dimension": "COLUMNS", "startIndex": 10, "endIndex": 11},
            "properties": {"pixelSize": 100}, "fields": "pixelSize"}},
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 200, "startColumnIndex": 10, "endColumnIndex": 11},
            "cell": {"userEnteredFormat": {}}, "fields": "userEnteredFormat"}},
        {"updateBorders": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 200, "startColumnIndex": 10, "endColumnIndex": 11},
            "top": NB, "bottom": NB, "left": NB, "right": NB, "innerHorizontal": NB, "innerVertical": NB}},
        {"updateSheetProperties": {"properties": {"sheetId": gid, "gridProperties": {"frozenRowCount": 5}},
            "fields": "gridProperties.frozenRowCount"}},
    ]
    try:
        sp.batchUpdate(spreadsheetId=sid, body={"requests": reqs}).execute()
    except Exception as e:
        print("[TOP] 書式一部スキップ:", e)
    print("[TOP] 完了：案内を表の上へ移動＋K列撤去: https://docs.google.com/spreadsheets/d/%s/edit" % sid)


def distwarn(target=None):
    """表の上（見出し直上・4行目）に『画像は短辺1000px以上』の赤帯注意を入れる。冪等。"""
    import re as _re
    sid = (target or os.environ.get("REQ_SHEET_ID", "") or "").strip()
    m = _re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", sid)
    if m:
        sid = m.group(1)
    if not sid:
        print("[WARN] シートID/URLが必要です"); return
    cr = _creds(); sp = _sheets(cr)
    props = sp.get(spreadsheetId=sid, fields="sheets.properties(sheetId,title)").execute()["sheets"][0]["properties"]
    gid = props["sheetId"]; tab = props["title"]
    warn = "⚠️ 画像は必ず【短辺1000ピクセル以上】でお願いします（小さい画像はきれいに使えません）／タテ長(9:16)推奨"
    sp.values().update(spreadsheetId=sid, range="%s!A4" % tab, valueInputOption="RAW",
        body={"values": [[warn]]}).execute()
    reqs = [
        {"mergeCells": {"range": {"sheetId": gid, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 0, "endColumnIndex": 9},
            "mergeType": "MERGE_ALL"}},
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 0, "endColumnIndex": 9},
            "cell": {"userEnteredFormat": {"wrapStrategy": "WRAP", "verticalAlignment": "MIDDLE", "horizontalAlignment": "CENTER",
                "backgroundColor": {"red": 0.98, "green": 0.85, "blue": 0.85},
                "textFormat": {"bold": True, "fontSize": 12, "foregroundColor": {"red": 0.7, "green": 0.0, "blue": 0.0}}}},
            "fields": "userEnteredFormat(wrapStrategy,verticalAlignment,horizontalAlignment,backgroundColor,textFormat)"}},
        {"updateBorders": {"range": {"sheetId": gid, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 0, "endColumnIndex": 9},
            "top": {"style": "SOLID", "color": {"red": 0.8, "green": 0.2, "blue": 0.2}},
            "bottom": {"style": "SOLID", "color": {"red": 0.8, "green": 0.2, "blue": 0.2}},
            "left": {"style": "SOLID", "color": {"red": 0.8, "green": 0.2, "blue": 0.2}},
            "right": {"style": "SOLID", "color": {"red": 0.8, "green": 0.2, "blue": 0.2}}}},
    ]
    try:
        sp.batchUpdate(spreadsheetId=sid, body={"requests": reqs}).execute()
    except Exception as e:
        print("[WARN] 書式一部スキップ:", e)
    print("[WARN] 完了：短辺1000px以上の赤帯注意を挿入: https://docs.google.com/spreadsheets/d/%s/edit" % sid)


def disttime(target=None):
    """『投稿希望時間』列(J)を追加。すさび湯三条を記入例で埋め、上部バナーをJまで拡張。"""
    import re as _re
    sid = (target or os.environ.get("REQ_SHEET_ID", "") or "").strip()
    m = _re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", sid)
    if m:
        sid = m.group(1)
    if not sid:
        print("[TIME] シートID/URLが必要です"); return
    cr = _creds(); sp = _sheets(cr)
    props = sp.get(spreadsheetId=sid, fields="sheets.properties(sheetId,title)").execute()["sheets"][0]["properties"]
    gid = props["sheetId"]; tab = props["title"]
    rows = sp.values().get(spreadsheetId=sid, range="%s!A:J" % tab).execute().get("values", [])
    # 見出し行を検出（「店舗名」で始まる行）
    hr = None
    for i, r in enumerate(rows):
        if r and str(r[0]).strip().startswith("店舗名"):
            hr = i; break
    if hr is None:
        hr = 4  # disttop後の既定（5行目）
    # J見出し＋各店の投稿希望時間（三条は記入例）
    sp.values().update(spreadsheetId=sid, range="%s!J%d" % (tab, hr + 1),
        valueInputOption="RAW", body={"values": [["投稿希望時間（平日／祝日）"]]}).execute()
    jvals = []
    for i in range(hr + 1, len(rows)):
        name = str(rows[i][0]).strip() if rows[i] else ""
        if "すさび湯 河原町三条店" in name:
            jvals.append(["平日 16:00／18:00／20:00　祝日 11:00／18:00／20:00"])
        else:
            jvals.append([""])
    if jvals:
        sp.values().update(spreadsheetId=sid, range="%s!J%d:J%d" % (tab, hr + 2, hr + 1 + len(jvals)),
            valueInputOption="RAW", body={"values": jvals}).execute()
    N = max(len(rows), hr + 26)
    reqs = [
        # 上部バナー(見出しより上の行)をJまで拡張：一旦解除→A:Jで再結合
        {"unmergeCells": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": hr, "startColumnIndex": 0, "endColumnIndex": 10}}},
    ]
    for rr in range(0, hr):
        reqs.append({"mergeCells": {"range": {"sheetId": gid, "startRowIndex": rr, "endRowIndex": rr + 1,
            "startColumnIndex": 0, "endColumnIndex": 10}, "mergeType": "MERGE_ALL"}})
    reqs += [
        # J見出しを他の見出しと同じ濃色＋白太字
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": hr, "endRowIndex": hr + 1, "startColumnIndex": 9, "endColumnIndex": 10},
            "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.17, "green": 0.24, "blue": 0.33},
                "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP",
                "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}}},
            "fields": "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)"}},
        # J列 幅＋データ折返し
        {"updateDimensionProperties": {"range": {"sheetId": gid, "dimension": "COLUMNS", "startIndex": 9, "endIndex": 10},
            "properties": {"pixelSize": 250}, "fields": "pixelSize"}},
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": hr + 1, "endRowIndex": N, "startColumnIndex": 9, "endColumnIndex": 10},
            "cell": {"userEnteredFormat": {"wrapStrategy": "WRAP", "verticalAlignment": "MIDDLE"}},
            "fields": "userEnteredFormat(wrapStrategy,verticalAlignment)"}},
        # J列 罫線（見出し〜データ）
        {"updateBorders": {"range": {"sheetId": gid, "startRowIndex": hr, "endRowIndex": N, "startColumnIndex": 9, "endColumnIndex": 10},
            "top": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "bottom": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "left": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "right": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "innerHorizontal": {"style": "SOLID", "color": {"red": 0.85, "green": 0.87, "blue": 0.9}}}},
    ]
    try:
        sp.batchUpdate(spreadsheetId=sid, body={"requests": reqs}).execute()
    except Exception as e:
        print("[TIME] 書式一部スキップ:", e)
    print("[TIME] 完了：投稿希望時間(J列)追加＋三条の記入例: https://docs.google.com/spreadsheets/d/%s/edit" % sid)


def distmove(target=None):
    """投稿希望時間をDrive列より前(備考の隣=H)へ移動。旧J列を削除しHに新設、Drive列はI/Jへ。"""
    import re as _re
    sid = (target or os.environ.get("REQ_SHEET_ID", "") or "").strip()
    m = _re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", sid)
    if m:
        sid = m.group(1)
    if not sid:
        print("[MOVE] シートID/URLが必要です"); return
    cr = _creds(); sp = _sheets(cr)
    props = sp.get(spreadsheetId=sid, fields="sheets.properties(sheetId,title)").execute()["sheets"][0]["properties"]
    gid = props["sheetId"]; tab = props["title"]
    rows = sp.values().get(spreadsheetId=sid, range="%s!A:K" % tab).execute().get("values", [])
    hr = None
    for i, r in enumerate(rows):
        if r and str(r[0]).strip().startswith("店舗名"):
            hr = i; break
    if hr is None:
        hr = 4
    # 旧J(時間)を削除 → 備考の隣(index7=H)に新列を挿入。Drive(画像/音楽)はI/Jへ。
    sp.batchUpdate(spreadsheetId=sid, body={"requests": [
        {"deleteDimension": {"range": {"sheetId": gid, "dimension": "COLUMNS", "startIndex": 9, "endIndex": 10}}},
        {"insertDimension": {"range": {"sheetId": gid, "dimension": "COLUMNS", "startIndex": 7, "endIndex": 8},
            "inheritFromBefore": False}}]}).execute()
    # 新H：見出し＋データ（三条は記入例）
    sp.values().update(spreadsheetId=sid, range="%s!H%d" % (tab, hr + 1),
        valueInputOption="RAW", body={"values": [["投稿希望時間（平日／祝日）"]]}).execute()
    hvals = []
    for i in range(hr + 1, len(rows)):
        name = str(rows[i][0]).strip() if rows[i] else ""
        if "すさび湯 河原町三条店" in name:
            hvals.append(["平日 16:00／18:00／20:00　祝日 11:00／18:00／20:00"])
        else:
            hvals.append([""])
    if hvals:
        sp.values().update(spreadsheetId=sid, range="%s!H%d:H%d" % (tab, hr + 2, hr + 1 + len(hvals)),
            valueInputOption="RAW", body={"values": hvals}).execute()
    # バナー1行目の文言をI/Jに修正
    sp.values().update(spreadsheetId=sid, range="%s!A1" % tab, valueInputOption="RAW", body={"values": [[
        "📁 アップロードのご案内 ── 自分の店の行に入力し、Drive（I列＝画像／J列＝音楽）に素材を入れてください"]]}).execute()
    N = max(len(rows), hr + 26)
    reqs = [
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": hr, "endRowIndex": hr + 1, "startColumnIndex": 7, "endColumnIndex": 8},
            "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.17, "green": 0.24, "blue": 0.33},
                "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP",
                "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}}},
            "fields": "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)"}},
        {"updateDimensionProperties": {"range": {"sheetId": gid, "dimension": "COLUMNS", "startIndex": 7, "endIndex": 8},
            "properties": {"pixelSize": 250}, "fields": "pixelSize"}},
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": hr + 1, "endRowIndex": N, "startColumnIndex": 7, "endColumnIndex": 8},
            "cell": {"userEnteredFormat": {"wrapStrategy": "WRAP", "verticalAlignment": "MIDDLE",
                "backgroundColor": {"red": 1, "green": 1, "blue": 1}}},
            "fields": "userEnteredFormat(wrapStrategy,verticalAlignment,backgroundColor)"}},
        {"updateBorders": {"range": {"sheetId": gid, "startRowIndex": hr, "endRowIndex": N, "startColumnIndex": 7, "endColumnIndex": 8},
            "top": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "bottom": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "left": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "right": {"style": "SOLID", "color": {"red": 0.6, "green": 0.65, "blue": 0.72}},
            "innerHorizontal": {"style": "SOLID", "color": {"red": 0.85, "green": 0.87, "blue": 0.9}}}},
    ]
    try:
        sp.batchUpdate(spreadsheetId=sid, body={"requests": reqs}).execute()
    except Exception as e:
        print("[MOVE] 書式一部スキップ:", e)
    print("[MOVE] 完了：投稿希望時間を備考の隣(H)へ移動／Drive=I,J: https://docs.google.com/spreadsheets/d/%s/edit" % sid)


def _find_list_tab(sp, sid):
    """配布シートの『一覧タブ』を見出し基準で確実に特定する（sheets[0]に依存しない）。
    先頭〜12行のどこかに『店舗名』で始まるセルを持つタブ＝入力一覧。
    戻り値: (gid, title, header_row_index, header_list) / 見つからなければ (None,...)。"""
    meta = sp.get(spreadsheetId=sid, fields="sheets.properties(sheetId,title,index)").execute()
    for s in meta.get("sheets", []):
        p = s["properties"]; title = p["title"]
        rows = sp.values().get(spreadsheetId=sid, range="'%s'!A1:L12" % title).execute().get("values", [])
        for i, r in enumerate(rows):
            if r and str(r[0]).strip().startswith("店舗名"):
                return p["sheetId"], title, i, r
    return None, None, None, None


def distfinal(target=None):
    """配布シートの最終仕上げ（安全・冪等）。一覧タブを見出し『店舗名』で特定し、
      ① 投稿希望時間(見出しに『投稿希望』を含む列)の三条の記入例が空なら補完
      ② 一覧タブを先頭(index0)へ＝開いてすぐ入力欄が見える
    既存のDrive URL・各店データには一切触れない。"""
    import re as _re
    sid = (target or os.environ.get("REQ_SHEET_ID", "") or "").strip()
    m = _re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", sid)
    if m:
        sid = m.group(1)
    if not sid:
        print("[FINAL] シートID/URLが必要です"); return
    cr = _creds(); sp = _sheets(cr)
    gid, tab, hr, header = _find_list_tab(sp, sid)
    if gid is None:
        print("[FINAL] 一覧タブ（『店舗名』見出し）が見つかりません"); return

    def col_of(key):
        for j, c in enumerate(header):
            if key in str(c):
                return j
        return None
    c_time = col_of("投稿希望")
    c_img = col_of("画像データ")
    c_mus = col_of("音楽データ")
    rows = sp.values().get(spreadsheetId=sid, range="'%s'!A:L" % tab).execute().get("values", [])
    # ① 三条の投稿希望時間を記入例で補完（空のときだけ）
    if c_time is not None:
        for i in range(hr + 1, len(rows)):
            r = rows[i]
            name = str(r[0]).strip() if r else ""
            if "すさび湯 河原町三条店" in name:
                cur = r[c_time] if len(r) > c_time else ""
                if not str(cur).strip():
                    col = chr(65 + c_time)
                    sp.values().update(spreadsheetId=sid, range="'%s'!%s%d" % (tab, col, i + 1),
                        valueInputOption="RAW",
                        body={"values": [["平日 16:00／18:00／20:00　祝日 11:00／18:00／20:00"]]}).execute()
                    print("[FINAL] 三条の投稿希望時間を記入例で補完(%s%d)" % (col, i + 1))
                break
    # ② 一覧タブを先頭へ
    try:
        sp.batchUpdate(spreadsheetId=sid, body={"requests": [
            {"updateSheetProperties": {"properties": {"sheetId": gid, "index": 0}, "fields": "index"}}]}).execute()
        print("[FINAL] 一覧タブ『%s』を先頭に移動" % tab)
    except Exception as e:
        print("[FINAL] タブ並べ替えスキップ:", e)
    tl = (lambda n: chr(65 + n) if isinstance(n, int) else "-")
    print("[FINAL] 完了：一覧=%s ／ 時間列=%s 画像列=%s 音楽列=%s : "
          "https://docs.google.com/spreadsheets/d/%s/edit"
          % (tab, tl(c_time), tl(c_img), tl(c_mus), sid))


def distdump(target=None):
    """配布シートの上部数行を列付きで出力（レイアウト診断用）。"""
    import re as _re
    sid = (target or os.environ.get("REQ_SHEET_ID", "") or "").strip()
    m = _re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", sid)
    if m:
        sid = m.group(1)
    if not sid:
        print("[DUMP] シートID/URLが必要です"); return
    cr = _creds(); sp = _sheets(cr)
    meta = sp.get(spreadsheetId=sid, fields="sheets.properties(sheetId,title,index)").execute()
    for s in meta.get("sheets", []):
        p = s["properties"]
        title = p["title"]
        print("=== TAB[%d] '%s' (id=%s) ===" % (p.get("index", -1), title, p.get("sheetId")))
        rows = sp.values().get(spreadsheetId=sid, range="'%s'!A:L" % title).execute().get("values", [])
        for i in range(min(7, len(rows))):
            r = rows[i]
            cells = [chr(65 + j) + "=" + str(r[j]).replace("\n", " ")[:22] for j in range(len(r))]
            print("  R%d| %s" % (i + 1, " ｜ ".join(cells)))
        print("  (行数 %d)" % len(rows))
    print("[DUMP] 完了")


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
        distsheet(arg)
    elif mode == "distdrive":
        distdrive(arg)
    elif mode == "distsub":
        distsub(arg)
    elif mode == "distnote":
        distnote(arg)
    elif mode == "disttop":
        disttop(arg)
    elif mode == "distwarn":
        distwarn(arg)
    elif mode == "disttime":
        disttime(arg)
    elif mode == "distmove":
        distmove(arg)
    elif mode == "distfinal":
        distfinal(arg)
    elif mode == "distdump":
        distdump(arg)
    else:
        print("使い方: python store_master.py init | setup [store_id] | columns | intake | requestsheet | roster | names | pending | saemail | distsheet | all")
