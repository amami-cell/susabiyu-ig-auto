# -*- coding: utf-8 -*-
"""店舗の営業時間を「入力用」スプレッドシート(REQ_SHEET_ID)から読む。
store_master.reqcols が K〜列に投入する項目のうち「営業時間」(K基準で5列目＝O列)を取得する。
・行は K列(表示名)が store["store_name"] に一致/部分一致する行を探す（ハードコードしない）。
・戻り値: (open_text, hours_raw)  例 ("OPEN 17:00", "17:00〜23:00")。見つからなければ ("", "")。
本番・見本どちらからも使えるよう副作用なしのユーティリティにする。"""
import os
import re


def _sheet_id():
    sid = (os.environ.get("REQ_SHEET_ID", "") or "").strip()
    m = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", sid)
    return m.group(1) if m else sid


def _first_time(s):
    """営業時間文字列から開店時刻(最初の H:MM)を取り出す。'17:00〜23:00'→'17:00'。"""
    m = re.search(r"(\d{1,2})[:：](\d{2})", str(s or ""))
    if not m:
        return ""
    return "%d:%02d" % (int(m.group(1)), int(m.group(2)))


def read(store, creds_path):
    """(open_text, hours_raw) を返す。失敗時は ("","")。"""
    sid = _sheet_id()
    if not sid or not store:
        return "", ""
    name = str(store.get("store_name", "")).strip()
    if not name:
        return "", ""
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        cr = service_account.Credentials.from_service_account_file(
            creds_path, scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"])
        sp = build("sheets", "v4", credentials=cr).spreadsheets()
        # タブ「入力用」を優先、無ければ index=1、それも無ければ末尾。
        metas = sp.get(spreadsheetId=sid, fields="sheets.properties(title,index)").execute().get("sheets", [])
        tab = None
        for s in metas:
            p = s["properties"]
            if p.get("title") == "入力用" or p.get("index") == 1:
                tab = p["title"]; break
        if not tab and metas:
            tab = metas[-1]["properties"]["title"]
        if not tab:
            return "", ""
        # K列(表示名)と O列(営業時間)をまとめて取得（K6:O60）。
        rng = "'%s'!K6:O60" % tab
        rows = sp.values().get(spreadsheetId=sid, range=rng).execute().get("values", [])
        for r in rows:
            disp = (r[0] if len(r) > 0 else "").strip()
            if not disp:
                continue
            if disp == name or (name in disp) or (disp in name):
                hours = (r[4] if len(r) > 4 else "").strip()  # K,L,M,N,O → O=index4
                if not hours:
                    return "", ""
                t = _first_time(hours)
                return (("OPEN " + t) if t else ""), hours
        return "", ""
    except Exception as e:
        print("[HOURS] 取得スキップ:", e)
        return "", ""
