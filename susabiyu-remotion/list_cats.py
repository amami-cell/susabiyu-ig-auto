# -*- coding: utf-8 -*-
# 料理写真フォルダ(FOOD)直下のサブフォルダ（カテゴリ）名と画像枚数を一覧表示する。
# どのカテゴリが「寿司系」と判定され、寿司キャプションが許可されるかも併記する。
# キャプション整合(captions.py)の判定が実フォルダ名を正しくカバーしているか確認用。
import sys, glob, json, os

FOOD_FOLDER = "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"

from google.oauth2 import service_account
from googleapiclient.discovery import build
import captions


def find_creds():
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        return sys.argv[1]
    for p in glob.glob("*.json") + glob.glob("../*.json"):
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        if isinstance(d, dict) and d.get("type") == "service_account":
            return p
    return None


def children(drive, fid):
    out, page = [], None
    while True:
        r = drive.files().list(
            q="'%s' in parents and trashed=false" % fid,
            fields="nextPageToken, files(id,name,mimeType)",
            pageSize=100, pageToken=page,
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        out += r.get("files", [])
        page = r.get("nextPageToken")
        if not page:
            break
    return out


def count_images(drive, fid):
    n = 0
    stack = [fid]
    seen = set()
    while stack:
        f = stack.pop()
        if f in seen:
            continue
        seen.add(f)
        for c in children(drive, f):
            if c["mimeType"] == "application/vnd.google-apps.folder":
                stack.append(c["id"])
            elif c["mimeType"].startswith("image/"):
                n += 1
    return n


def main():
    creds_path = find_creds()
    if not creds_path:
        raise SystemExit("認証JSONが見つかりません。")
    creds = service_account.Credentials.from_service_account_file(
        creds_path, scopes=["https://www.googleapis.com/auth/drive.readonly"])
    drive = build("drive", "v3", credentials=creds)

    subs = [c for c in children(drive, FOOD_FOLDER)
            if c["mimeType"] == "application/vnd.google-apps.folder"]
    root_imgs = sum(1 for c in children(drive, FOOD_FOLDER)
                    if c["mimeType"].startswith("image/"))

    print("=== 料理写真フォルダ(FOOD) サブフォルダ一覧 ===")
    if root_imgs:
        print("（直下にも画像 %d 枚 … カテゴリ未分類=汎用キャプション扱い）" % root_imgs)
    for c in sorted(subs, key=lambda x: x["name"]):
        n = count_images(drive, c["id"])
        tag = "寿司系→寿司句OK" if captions.is_sushi_cat(c["name"]) else "汎用のみ"
        print("  ・%-16s 画像 %3d 枚   [%s]" % (c["name"], n, tag))
    print("=== 以上 %d カテゴリ ===" % len(subs))


if __name__ == "__main__":
    main()
