# -*- coding: utf-8 -*-
"""GOLD京都ポルタ：LP用の公式ロゴ（フレンチ酒場GOLD_LOGO-02.png）をDriveから取得して保存する。

  Drive「ロゴ」フォルダ内の公式ロゴPNG → pwa/goldporta/lp_logo.png（LPヘッダーが読む）
  透過PNGはそのまま保持（黒背景ヘッダーに載る）。横幅が大きすぎる時だけ軽く縮小。

使い方（CI）:  python goldporta_logo.py creds.json
認証は GOOGLE_CREDS_B64 または creds.json（nagagutsu_scene.py と同じ）。
"""
import os, sys, io, base64

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "pwa", "goldporta")
LOGO_FILE_ID = "1UCT1_H0yhEgjaZfWgyjSDfB9gngytNl8"   # フレンチ酒場GOLD_LOGO-02.png
MAX_W = 900


def _creds_path():
    args = [a for a in sys.argv[1:] if a.strip() and a.lower().endswith(".json")]
    if args and os.path.exists(args[0]):
        return args[0]
    if os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
        return "creds.json"
    raise SystemExit("認証JSONが見つかりません。")


def _drive(creds):
    from googleapiclient.discovery import build
    from google.oauth2.service_account import Credentials
    c = Credentials.from_service_account_file(
        creds, scopes=["https://www.googleapis.com/auth/drive.readonly"])
    return build("drive", "v3", credentials=c)


def _download(drive, fid):
    from googleapiclient.http import MediaIoBaseDownload
    buf = io.BytesIO()
    dl = MediaIoBaseDownload(buf, drive.files().get_media(fileId=fid, supportsAllDrives=True))
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.seek(0)
    return buf


def main():
    creds = _creds_path()
    drive = _drive(creds)
    im = Image.open(_download(drive, LOGO_FILE_ID))
    # 透過を保つため RGBA に統一（白背景に潰さない）
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    if im.width > MAX_W:
        h = round(im.height * MAX_W / im.width)
        im = im.resize((MAX_W, h), Image.LANCZOS)
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "lp_logo.png")
    im.save(out, "PNG", optimize=True)
    print("[LOGO] 保存 pwa/goldporta/lp_logo.png (%sx%s)" % (im.width, im.height))


if __name__ == "__main__":
    main()
