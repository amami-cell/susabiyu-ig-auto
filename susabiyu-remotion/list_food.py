# -*- coding: utf-8 -*-
"""料理写真の「ファイル名＝料理名」を全部そのまま一覧化する診断スクリプト（読み取り専用）。

fetch_typo.py と同じサービスアカウント認証・同じ走査（_walk_images 相当）で
GENRE_FOOD_ID 配下の画像ファイル名をカテゴリ別に出力する。投稿・書き込みは一切しない。

使い方（Actions）: list_food.yml が creds.json を書き出して
  GENRE_FOOD_ID / GENRE_FOOD_FLAT / GENRE_EXCLUDE_CATS を渡して実行する。
ログの「===== 料理名一覧 ここから =====」〜「ここまで」を読めば全料理名が分かる。
"""
import os, sys, glob, json, re

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
except ImportError:
    print("NG: googleライブラリ未インストール。")
    raise SystemExit

FOOD_FOLDER = os.environ.get("GENRE_FOOD_ID") or "1EuoC6HqqJS12cKXOsS-W8K5mzcU4lLR6"
MIN_SIDE = int(os.environ.get("MIN_SIDE") or "800")
_EXCL = [s.strip() for s in os.environ.get("GENRE_EXCLUDE_CATS", "").split(",") if s.strip()]
_DRINK = ("ドリンク", "飲み物", "飲物", "サワー", "ハイボール", "ビール", "ワイン",
          "日本酒", "焼酎", "カクテル", "梅酒", "ソフトドリンク", "drink", "beer", "sour")


def find_creds():
    for b in [".", "..", os.path.join("..", "..")]:
        for p in glob.glob(os.path.join(b, "*.json")):
            ap = os.path.abspath(p)
            if "node_modules" in ap:
                continue
            try:
                d = json.load(open(ap, encoding="utf-8"))
            except Exception:
                continue
            if isinstance(d, dict) and d.get("type") == "service_account":
                return ap
    return None


def clean(name):
    # 拡張子を落として、fetch_typo の caption と同じ見え方にする
    base = re.sub(r"\.(jpe?g|png|webp|heic|HEIC|JPG|JPEG|PNG|WEBP)$", "", str(name or ""))
    return re.sub(r"\s+", " ", re.sub(r"[_＿]", " ", base)).strip()


def is_drink(name):
    n = str(name or "").lower()
    return any(k.lower() in n for k in _DRINK)


def excluded(name):
    return bool(_EXCL) and any(x in str(name or "") for x in _EXCL)


def main():
    creds_path = sys.argv[1] if len(sys.argv) > 1 and os.path.exists(sys.argv[1]) else find_creds()
    if not creds_path:
        print("NG: 認証JSON未指定。")
        raise SystemExit
    scopes = ["https://www.googleapis.com/auth/drive.readonly"]
    creds = service_account.Credentials.from_service_account_file(creds_path, scopes=scopes)
    drive = build("drive", "v3", credentials=creds)

    def list_children(fid):
        out, page = [], None
        while True:
            res = drive.files().list(
                q="'%s' in parents and trashed=false" % fid,
                fields="nextPageToken, files(id,name,mimeType,imageMediaMetadata(width,height))",
                pageSize=100, pageToken=page,
                supportsAllDrives=True, includeItemsFromAllDrives=True,
            ).execute()
            out += res.get("files", [])
            page = res.get("nextPageToken")
            if not page:
                break
        return out

    def short_side(f):
        m = f.get("imageMediaMetadata") or {}
        return min(m.get("width", 0) or 0, m.get("height", 0) or 0)

    cats = {}   # category -> [(name, short_side)]

    def walk(fid, folder_name="料理", depth=0):
        for f in list_children(fid):
            nm = f.get("name", "")
            if f["mimeType"] == "application/vnd.google-apps.folder":
                if excluded(nm) or is_drink(nm):
                    continue
                if depth < 4:
                    walk(f["id"], nm, depth + 1)
            elif f["mimeType"].startswith("image/"):
                cats.setdefault(folder_name, []).append((nm, short_side(f)))

    walk(FOOD_FOLDER)

    total = sum(len(v) for v in cats.values())
    print("[FOODLIST] FOLDER=%s カテゴリ数=%d 画像総数=%d (MIN_SIDE=%d)" % (
        FOOD_FOLDER, len(cats), total, MIN_SIDE))
    print("===== 料理名一覧 ここから =====")
    idx = 0
    for cat in sorted(cats.keys()):
        items = cats[cat]
        print("\n【%s】(%d枚)" % (cat, len(items)))
        for nm, ss in sorted(items):
            idx += 1
            small = "" if ss >= MIN_SIDE else "  ← 小さい(短辺%dpx<%d・投稿から除外される)" % (ss, MIN_SIDE)
            print("  %3d. %s%s" % (idx, clean(nm), small))
    print("\n===== 料理名一覧 ここまで =====")


if __name__ == "__main__":
    main()
