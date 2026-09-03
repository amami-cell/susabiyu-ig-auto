# -*- coding: utf-8 -*-
"""店舗(STORE_ACCOUNT)のDrive「画像(FOOD)」フォルダを再帰的に走査し、
料理写真ファイルを“クリーンな料理名”に整えてカテゴリ別・一覧で出力する。

目的：料理ごとのキャプション（nagagutsu_captions.py 等）を人手で書くための素材。
fetch_typo と同じ除外規則（ロゴ/外観/内観/コース/ドリンク…）・同じ名前クリーニングを使う
ので、実際に動画へ載る料理名と一致する。ダウンロードはしない（名前一覧のみ・軽量）。

使い方（CI）:  STORE_ACCOUNT=nagagutsu python list_dishes.py creds.json
"""
import os, sys, glob, json, re

import stores

from google.oauth2 import service_account
from googleapiclient.discovery import build


def find_creds():
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        return sys.argv[1]
    if os.environ.get("GOOGLE_CREDS_B64"):
        import base64
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
        return "creds.json"
    for p in glob.glob("*.json") + glob.glob("../*.json"):
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        if isinstance(d, dict) and d.get("type") == "service_account":
            return p
    return None


# ── fetch_typo と同じ料理名クリーニング（機械連番/日付/コピー/おすすめ印/末尾連番を除去） ──
def clean_caption(nm):
    n = os.path.splitext(str(nm or ""))[0]
    for h in ("おすすめ", "オススメ", "お勧め", "オススメ料理", "★", "☆"):
        n = n.replace(h, "")
    n = re.sub(r'(?:IMG|DSC|DSCN|DCIM|PXL|MVIMG|GFY|MOV|VID)[-_ ]?\d+', '', n, flags=re.I)
    n = re.sub(r'\d{6,}', '', n)
    n = n.replace("のコピー", "").replace("コピー", "")
    n = re.sub(r'[\-_ ]?(?:min|scaled|edit|編集|加工|完成|新|new)$', '', n, flags=re.I)
    n = re.sub(r'\(\s*\d+\s*\)\s*$', '', n)
    n = re.sub(r'[\-_ ]\d{1,3}$', '', n)
    n = n.replace("_", "　").replace("＿", "　")
    n = re.sub(r'[ 　]{2,}', "　", n).strip(" 　_-★☆[]（）()【】｜|・")
    return n or os.path.splitext(str(nm or ""))[0]


DRINK_KW = ("ドリンク", "飲み物", "飲物", "サワー", "ハイボール", "ビール", "ワイン",
            "日本酒", "焼酎", "カクテル", "梅酒", "ソフトドリンク", "drink", "beer", "sour")


def is_drink(name):
    n = str(name or "").lower()
    return any(k.lower() in n for k in DRINK_KW)


def main():
    account = os.environ.get("STORE_ACCOUNT", "").strip()
    store = stores.get_store(account)
    food = (store.get("folders") or {}).get("food")
    if not food:
        raise SystemExit("この店舗にはfoodフォルダ未設定です: %r" % account)
    excl = [s.strip() for s in (store.get("exclude_cats") or []) if s.strip()]

    creds_path = find_creds()
    if not creds_path:
        raise SystemExit("認証JSONが見つかりません。")
    creds = service_account.Credentials.from_service_account_file(
        creds_path, scopes=["https://www.googleapis.com/auth/drive.readonly"])
    drive = build("drive", "v3", credentials=creds)

    def children(fid):
        out, page = [], None
        while True:
            r = drive.files().list(
                q="'%s' in parents and trashed=false" % fid,
                fields="nextPageToken, files(id,name,mimeType,imageMediaMetadata(width,height))",
                pageSize=100, pageToken=page,
                supportsAllDrives=True, includeItemsFromAllDrives=True,
            ).execute()
            out += r.get("files", [])
            page = r.get("nextPageToken")
            if not page:
                break
        return out

    def excluded(nm):
        return bool(excl) and any(x in str(nm or "") for x in excl)

    cats = {}   # カテゴリ名 -> [ (clean名, 元ファイル名, 短辺px) ]

    def walk(fid, folder_name="料理", depth=0):
        for f in children(fid):
            nm = f.get("name", "")
            if f["mimeType"] == "application/vnd.google-apps.folder":
                if excluded(nm) or is_drink(nm):
                    continue
                if depth < 3:
                    walk(f["id"], nm, depth + 1)
            elif f["mimeType"].startswith("image/"):
                if excluded(nm):
                    continue
                m = f.get("imageMediaMetadata") or {}
                side = min(m.get("width", 0) or 0, m.get("height", 0) or 0)
                cats.setdefault(folder_name, []).append((clean_caption(nm), nm, side))

    print("=== %s（%s）料理名一覧 ===" % (store.get("store_name", account), account or "三条"))
    print("FOODフォルダ:", food)
    walk(food)

    total = 0
    uniq = {}
    for cat in sorted(cats.keys()):
        rows = cats[cat]
        print("\n■ カテゴリ「%s」 %d枚" % (cat, len(rows)))
        for clean, raw, side in sorted(rows, key=lambda r: r[0]):
            flag = "" if side >= 800 else "  (※短辺%dpx<800＝動画では不採用)" % side
            print("   ・%s   ［元:%s］%s" % (clean, raw, flag))
            uniq.setdefault(clean, 0)
            uniq[clean] += 1
            total += 1

    print("\n=== 料理名（ユニーク %d 種 / 合計 %d 枚） ===" % (len(uniq), total))
    for name in sorted(uniq.keys()):
        print("   %s%s" % (name, ("  ×%d" % uniq[name]) if uniq[name] > 1 else ""))
    print("=== 以上 ===")


if __name__ == "__main__":
    main()
