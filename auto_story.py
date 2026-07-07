import os, random, time, subprocess, tempfile, io
from datetime import datetime, timedelta
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import requests as req

CRED = r"C:\Users\Owner\OneDrive\デスクトップ\クロードコード整理用フォルダ\infomart_automation.json"
WORK = r"C:\Users\Owner\OneDrive\デスクトップ\susabiyu_ig"
FONT = "C:/Windows/Fonts/HGRGY.TTC"
LOGO = os.path.join(WORK, "logo.jpg")
FFMPEG = "ffmpeg"
W, H, FPS = 1080, 1920, 30

TELOPS = {
    "FOOD": ["旬の魚、入ってます。","お造り、切りたてです。","本日のおすすめ。","今日も関東煮やってます。","寿司、握りたてです。","〆の一貫にどうぞ。"],
    "SAKE": ["仕事のあとの一杯に。","今宵もお待ちしてます。","二軒目にどうぞ。","日本酒、入荷しました。","ちょっと寄ってく？"],
    "INTERIOR": ["京都三条の寿司酒場。","まだお席ございます。","カウンターで一杯。","まだ間に合います。"],
    "EVENT": ["ご宴会承ります。","貸切もご相談ください。","ご予約受付中。"],
}

def load_config():
    cfg = {}
    for line in open(os.path.join(WORK, "drive_config.txt")):
        k, v = line.strip().split("=", 1)
        cfg[k] = v
    cfg["TOKEN"] = open(os.path.join(WORK, ".env")).read().split("=", 1)[1].strip()
    return cfg

def get_services():
    creds = Credentials.from_service_account_file(CRED, scopes=[
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/spreadsheets"
    ])
    drive = build("drive", "v3", credentials=creds)
    sheets = build("sheets", "v4", credentials=creds)
    return drive, sheets

def scan_all_photos(drive, folder_id):
    photos = []
    r = drive.files().list(q=f"'{folder_id}' in parents and trashed=false",fields="files(id,name,mimeType)",pageSize=200).execute()
    for f in r.get("files", []):
        if f["mimeType"] == "application/vnd.google-apps.folder":
            photos.extend(scan_all_photos(drive, f["id"]))
        elif f["mimeType"].startswith("image/"):
            photos.append({"id": f["id"], "name": f["name"]})
    return photos

def get_used_photos(sheets, sheet_id):
    try:
        r = sheets.spreadsheets().values().get(spreadsheetId=sheet_id, range="A:F").execute()
        rows = r.get("values", [])[1:]
        used = {}
        for row in rows:
            if len(row) >= 6:
                used[row[0]] = row[5]
        return used
    except:
        return {}

def pick_photo(drive, sheets, cfg):
    genres = ["FOOD", "SAKE", "INTERIOR", "EVENT"]
    last_file = os.path.join(WORK, "last_genre.txt")
    last_genre = open(last_file).read().strip() if os.path.exists(last_file) else ""
    available = [g for g in genres if g != last_genre]
    random.shuffle(available)
    sheet_id = cfg.get("SHEET_ID", "")
    used = get_used_photos(sheets, sheet_id) if sheet_id else {}
    cutoff = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    for genre in available:
        fid = cfg.get(f"GENRE_{genre}_ID", "")
        if not fid: continue
        photos = scan_all_photos(drive, fid)
        if not photos: continue
        fresh = [p for p in photos if p["id"] not in used or used[p["id"]] < cutoff]
        if not fresh: fresh = photos
        photo = random.choice(fresh)
        open(last_file, "w").write(genre)
        print(f"[SELECT] {genre} / {photo['name']}")
        return photo, genre
    return None, None

def record_usage(sheets, sheet_id, photo, genre):
    if not sheet_id: return
    try:
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        r = sheets.spreadsheets().values().get(spreadsheetId=sheet_id, range="A:A").execute()
        ids = [row[0] for row in r.get("values", [])[1:] if row]
        if photo["id"] in ids:
            all_data = sheets.spreadsheets().values().get(spreadsheetId=sheet_id, range="A:I").execute()
            for i, row in enumerate(all_data.get("values", [])):
                if row and row[0] == photo["id"]:
                    count = int(row[6]) + 1 if len(row) > 6 else 1
                    sheets.spreadsheets().values().update(
                        spreadsheetId=sheet_id, range=f"F{i+1}:G{i+1}",
                        valueInputOption="RAW", body={"values": [[now, str(count)]]}
                    ).execute()
                    print(f"[SHEET] updated count={count}"); return
        row = [photo["id"], photo["name"], "susabiyu_sanjo", genre, now, now, "1", "active", ""]
        sheets.spreadsheets().values().append(
            spreadsheetId=sheet_id, range="A:I",
            valueInputOption="RAW", body={"values": [row]}
        ).execute()
        print(f"[SHEET] recorded: {photo['name']}")
    except Exception as e:
        print(f"[SHEET] error (non-fatal): {e}")

def download_photo(drive, file_id, dest):
    fh = io.FileIO(dest, "wb")
    dl = MediaIoBaseDownload(fh, drive.files().get_media(fileId=file_id))
    done = False
    while not done: _, done = dl.next_chunk()
    print(f"[DOWNLOAD] -> {dest}")

def esc(p): return p.replace("\\","/").replace(":","\\:")

def generate_video(img_path, telop, out_path):
    dur = round(random.uniform(5.0, 7.0), 1)
    tf = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8")
    tf.write(telop); tf.close()
    has_logo = os.path.exists(LOGO)
    bg = (
        f"[0]split[bg][fg];"
        f"[bg]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=40[bg2];"
        f"[fg]scale={W}:{H}:force_original_aspect_ratio=decrease[fg2];"
        f"[bg2][fg2]overlay=(W-w)/2:(H-h)/2,"
        f"fade=t=in:d=0.5,fade=t=out:st={dur-0.5:.1f}:d=0.5"
    )
    txt = (
        f"drawtext=fontfile='{esc(FONT)}':textfile='{esc(tf.name)}':"
        f"fontcolor=white:fontsize=72:borderw=3:bordercolor=black@0.7:"
        f"shadowcolor=black@0.4:shadowx=2:shadowy=2:"
        f"x=(w-text_w)/2:y=h*0.85:alpha='if(lt(t,1.2),t/1.2,1)'"
    )
    if has_logo:
        fc = (f"{bg}[main];[1]scale=280:-1,colorkey=white:0.3:0.2,"
              f"format=rgba,colorchannelmixer=aa=0.5[logo];"
              f"[main][logo]overlay=W-w-40:60,{txt}")
        cmd = [FFMPEG,"-y","-loop","1","-framerate",str(FPS),"-i",img_path,"-i",LOGO,
               "-t",str(dur),"-filter_complex",fc,"-c:v","libx264","-pix_fmt","yuv420p",
               "-r",str(FPS),"-movflags","+faststart",out_path]
    else:
        fc = f"{bg},{txt}"
        cmd = [FFMPEG,"-y","-loop","1","-framerate",str(FPS),"-i",img_path,
               "-t",str(dur),"-filter_complex",fc,"-c:v","libx264","-pix_fmt","yuv420p",
               "-r",str(FPS),"-movflags","+faststart",out_path]
    print(f"[VIDEO] duration={dur}s, telop={telop}")
    subprocess.run(cmd, check=True)
    os.unlink(tf.name)
    print(f"[VIDEO] -> {out_path}")

def upload_video(path):
    print("[UPLOAD] uploading...")
    r = req.post("https://catbox.moe/user/api.php",data={"reqtype":"fileupload"},files={"fileToUpload":open(path,"rb")})
    url = r.text.strip()
    print(f"[UPLOAD] -> {url}"); return url

def post_story(token, video_url):
    BASE = "https://graph.instagram.com/v23.0"
    me = req.get(f"{BASE}/me",params={"fields":"user_id,username","access_token":token}).json()
    uid = me.get("user_id") or me.get("id")
    print(f"[POST] @{me.get('username')}")
    c = req.post(f"{BASE}/{uid}/media",data={"video_url":video_url,"media_type":"STORIES","access_token":token}).json()
    if "error" in c: print(f"[POST] ERROR: {c['error']}"); return
    cid = c["id"]
    for i in range(30):
        s = req.get(f"{BASE}/{cid}",params={"fields":"status_code","access_token":token}).json()
        st = s.get("status_code")
        print(f"[POST] status: {st}")
        if st == "FINISHED": break
        if st == "ERROR": print(f"[POST] error: {s}"); return
        time.sleep(5)
    p = req.post(f"{BASE}/{uid}/media_publish",data={"creation_id":cid,"access_token":token}).json()
    print(f"[POST] done! media_id={p.get('id')}")

def main():
    os.chdir(WORK)
    cfg = load_config()
    drive, sheets = get_services()
    photo, genre = pick_photo(drive, sheets, cfg)
    if not photo: return
    img = os.path.join(WORK, "auto_photo.jpg")
    download_photo(drive, photo["id"], img)
    telop = random.choice(TELOPS.get(genre, TELOPS["FOOD"]))
    out = os.path.join(WORK, "auto_story.mp4")
    generate_video(img, telop, out)
    record_usage(sheets, cfg.get("SHEET_ID", ""), photo, genre)
    url = upload_video(out)
    post_story(cfg["TOKEN"], url)
    print("\n=== ALL DONE ===")

if __name__ == "__main__": main()
