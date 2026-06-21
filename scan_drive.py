from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

CRED = r"C:\Users\Owner\OneDrive\デスクトップ\クロードコード整理用フォルダ\infomart_automation.json"
creds = Credentials.from_service_account_file(CRED, scopes=["https://www.googleapis.com/auth/drive.readonly"])
drive = build("drive", "v3", credentials=creds)

config = {}
for line in open("drive_config.txt"):
    k, v = line.strip().split("=", 1)
    config[k] = v

for genre in ["FOOD", "SAKE", "INTERIOR", "EVENT"]:
    fid = config.get(f"GENRE_{genre}_ID", "")
    if not fid:
        continue
    r = drive.files().list(
        q=f"'{fid}' in parents and trashed=false and mimeType contains 'image/'",
        fields="files(id,name,mimeType,size)"
    ).execute()
    files = r.get("files", [])
    print(f"\n[{genre}] {len(files)} photos")
    for f in files:
        print(f"  {f['name']}")
