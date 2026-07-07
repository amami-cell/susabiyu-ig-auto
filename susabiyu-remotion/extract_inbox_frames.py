# -*- coding: utf-8 -*-
"""受け取りフォルダ(参考動画)の各MP4から等間隔でコマ(JPG)を抜き出す。
抽出したフレームは susabiyu-remotion/review_frames/ に保存し、ワークフロー側でコミットする。
Remotion再現可否の判定用（人間＝クロードが見て演出を把握する）。

使い方: python extract_inbox_frames.py <folder_id_or_url>
"""
import os, sys, base64, subprocess, re, io

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2.service_account import Credentials

FRACS = [0.06, 0.20, 0.34, 0.48, 0.62, 0.76, 0.90]  # 各動画からこの割合位置のコマを抜く
OUT_DIR = "review_frames"
WIDTH = 480  # 横幅(縮小してサイズ節約)


def _creds():
    path = "creds.json"
    if not os.path.exists(path) and os.environ.get("GOOGLE_CREDS_B64"):
        open(path, "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"]))
    return Credentials.from_service_account_file(
        path, scopes=["https://www.googleapis.com/auth/drive"])


def _folder_id(s):
    m = re.search(r"/folders/([a-zA-Z0-9_-]+)", s or "")
    return m.group(1) if m else (s or "").strip()


def _duration(path):
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                            "-of", "default=noprint_wrappers=1:nokey=1", path],
                           capture_output=True, text=True)
        return float(r.stdout.strip())
    except Exception:
        return 0.0


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else ""
    latest_only = arg.endswith("|latest")
    if latest_only:
        arg = arg[:-len("|latest")]
    fid = _folder_id(arg)
    if not fid:
        print("[FRAMES] フォルダID/URLが必要です"); return
    cr = _creds()
    drive = build("drive", "v3", credentials=cr)
    os.makedirs(OUT_DIR, exist_ok=True)
    r = drive.files().list(q="'%s' in parents and trashed=false" % fid,
        fields="files(id,name,mimeType,size,createdTime)", spaces="drive",
        supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
    vids = [f for f in r.get("files", []) if str(f.get("mimeType", "")).startswith("video/")]
    if latest_only and vids:
        # 一番新しくアップされた1本だけ（同名の重複は除く）→ 高密度抽出になる
        vids.sort(key=lambda f: f.get("createdTime", ""), reverse=True)
        vids = vids[:1]
    vids.sort(key=lambda f: f.get("name", ""))
    print("[FRAMES] 動画 %d 本" % len(vids))
    for idx, f in enumerate(vids, 1):
        name = f["name"]; fileid = f["id"]
        tmp = "/tmp/vid_%d.mp4" % idx
        print("[FRAMES] (%d) DL: %s" % (idx, name))
        req = drive.files().get_media(fileId=fileid, supportsAllDrives=True)
        buf = io.FileIO(tmp, "wb")
        dl = MediaIoBaseDownload(buf, req, chunksize=8 * 1024 * 1024)
        done = False
        while not done:
            _, done = dl.next_chunk()
        buf.close()
        dur = _duration(tmp)
        print("[FRAMES] (%d) 長さ %.1f秒" % (idx, dur))
        if dur <= 0:
            dur = 10.0
        if len(vids) <= 2:
            # 動画が少ない時は高密度で抜く（操作の細かい動き・アニメを見るため）
            fps = min(4.0, 150.0 / dur)
            subprocess.run(["ffmpeg", "-y", "-i", tmp,
                            "-vf", "fps=%.3f,scale=%d:-1" % (fps, WIDTH),
                            "-q:v", "4",
                            os.path.join(OUT_DIR, "v%d_%%03d.jpg" % idx)],
                           capture_output=True)
            print("[FRAMES] (%d) 高密度抽出 %.2f fps" % (idx, fps))
        else:
            for j, fr in enumerate(FRACS, 1):
                t = max(0.1, dur * fr)
                out = os.path.join(OUT_DIR, "v%d_%02d.jpg" % (idx, j))
                subprocess.run(["ffmpeg", "-y", "-ss", "%.2f" % t, "-i", tmp,
                                "-frames:v", "1", "-vf", "scale=%d:-1" % WIDTH,
                                "-q:v", "4", out],
                               capture_output=True)
        # インデックス（どのファイルがv1..かの対応）を残す
        with open(os.path.join(OUT_DIR, "index.txt"), "a", encoding="utf-8") as w:
            w.write("v%d = %s (%.1fs)\n" % (idx, name, dur))
        try:
            os.remove(tmp)
        except Exception:
            pass
    print("[FRAMES] 完了 → %s/" % OUT_DIR)


if __name__ == "__main__":
    main()
