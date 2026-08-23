# -*- coding: utf-8 -*-
"""リール素材クリップを集めて src/clipData.ts に書き出す。
取り込み元は2つ（両対応・どちらか無くてもOK）：
  ① Drive フォルダ REEL_CLIPS_ID … 手動で作った動画（Kling等）を入れる場所 → public/clips/ にDL
  ② シート「リール素材」タブ … gen_i2v.py がHFで生成したCDN URL群（ローカルDL不要・URLのまま使う）
新しいものを最大 MAX_CLIPS 本まで採用。0本でも CineReel はロゴのみで安全に描画する。
"""
import os, io, glob, json, sys

MAX_CLIPS = int(os.environ.get("REEL_MAX_CLIPS", "6"))
OUT_DIR = os.path.join("public", "clips")
CLIP_DATA = os.path.join("src", "clipData.ts")
LIB_TAB = "リール素材"
VIDEO_EXT = (".mp4", ".mov", ".webm", ".m4v")


def _drive_and_creds():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds_path = None
    for a in sys.argv[1:]:
        if os.path.exists(a) and a.endswith(".json"):
            creds_path = a
    if not creds_path:
        for b in [".", ".."]:
            for p in glob.glob(os.path.join(b, "*.json")):
                try:
                    if json.load(open(p, encoding="utf-8")).get("type") == "service_account":
                        creds_path = os.path.abspath(p); break
                except Exception:
                    pass
            if creds_path:
                break
    if not creds_path:
        return None, None
    sc = ["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/spreadsheets"]
    cr = service_account.Credentials.from_service_account_file(creds_path, scopes=sc)
    return build("drive", "v3", credentials=cr), creds_path


def _list(drive, fid):
    out, page = [], None
    while True:
        r = drive.files().list(q="'%s' in parents and trashed=false" % fid,
            fields="nextPageToken, files(id,name,mimeType,createdTime)",
            orderBy="createdTime desc", pageSize=100, pageToken=page,
            supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
        out += r.get("files", []); page = r.get("nextPageToken")
        if not page:
            break
    return out


def _dl(drive, fid, dest):
    from googleapiclient.http import MediaIoBaseDownload
    buf = io.FileIO(dest, "wb")
    dl = MediaIoBaseDownload(buf, drive.files().get_media(fileId=fid))
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.close()


def _from_drive(drive):
    fid = os.environ.get("REEL_CLIPS_ID", "").strip()
    if not (drive and fid):
        return []
    os.makedirs(OUT_DIR, exist_ok=True)
    items = []
    for f in _list(drive, fid):
        name = f.get("name", "")
        if f["mimeType"].startswith("video/") or name.lower().endswith(VIDEO_EXT):
            local = os.path.join(OUT_DIR, "d_%s%s" % (f["id"][:8], os.path.splitext(name)[1] or ".mp4"))
            if not os.path.exists(local):
                try:
                    _dl(drive, f["id"], local); print("[CLIP DL]", name)
                except Exception as e:
                    print("[CLIP] DL失敗:", name, e); continue
            items.append({"src": "clips/" + os.path.basename(local), "caption": ""})
    return items


def _from_sheet(creds_path):
    try:
        import poster
        poster.SHEET_ID = os.environ.get("SHEET_ID", getattr(poster, "SHEET_ID", ""))
        sh = poster._sheets()
        if not sh:
            return []
        rows = sh.values().get(spreadsheetId=poster.SHEET_ID, range=LIB_TAB + "!A2:E").execute().get("values", [])
        out = []
        for r in reversed(rows):   # 新しい順
            url = (r[0] if r else "").strip()
            used = (r[4] if len(r) > 4 else "").strip()
            if url.startswith("http") and used.lower() not in ("done", "済", "used"):
                out.append({"src": url, "caption": ""})
        return out
    except Exception as e:
        print("[CLIP] シート取得スキップ:", e); return []


def main():
    drive, creds_path = _drive_and_creds()
    clips = _from_drive(drive) + _from_sheet(creds_path)
    clips = clips[:MAX_CLIPS]
    music = "bgm.mp3"
    body = (
        "// リール素材クリップ（fetch_reel_clips.py が自動生成）。\n"
        "export const clips: { src: string; caption?: string }[] = %s;\n"
        "export const clipMusic = %s;\n"
    ) % (json.dumps(clips, ensure_ascii=False), json.dumps(music))
    open(CLIP_DATA, "w", encoding="utf-8").write(body)
    print("[CLIP] %d本を clipData.ts に書き出し（Drive+HFライブラリ）" % len(clips))
    for c in clips:
        print("   -", c["src"][:70])
    return 0


if __name__ == "__main__":
    sys.exit(main())
