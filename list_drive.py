from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

CRED = r"C:\Users\Owner\OneDrive\デスクトップ\クロードコード整理用フォルダ\infomart_automation.json"
creds = Credentials.from_service_account_file(CRED, scopes=["https://www.googleapis.com/auth/drive"])
drive = build("drive", "v3", credentials=creds)

files = []
page_token = None
while True:
    r = drive.files().list(pageSize=100, fields="nextPageToken,files(id,name,size,mimeType)", pageToken=page_token).execute()
    files.extend(r.get("files", []))
    page_token = r.get("nextPageToken")
    if not page_token:
        break

total = 0
for f in files:
    s = int(f.get("size", 0))
    total += s
    mb = s / 1024 / 1024
    print(f"{mb:8.1f}MB  {f['name'][:45]}")

print(f"\n合計: {len(files)}件 / {total/1024/1024:.0f}MB")
