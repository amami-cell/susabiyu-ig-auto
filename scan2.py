from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

CRED = r"C:\Users\Owner\OneDrive\デスクトップ\クロードコード整理用フォルダ\infomart_automation.json"
creds = Credentials.from_service_account_file(CRED, scopes=["https://www.googleapis.com/auth/drive.readonly"])
drive = build("drive", "v3", credentials=creds)

FOOD_ID = "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"

def scan_folder(folder_id, depth=0):
    prefix = "  " * depth
    r = drive.files().list(
        q=f"'{folder_id}' in parents and trashed=false",
        fields="files(id,name,mimeType,size)",
        pageSize=100
    ).execute()
    for f in r.get("files", []):
        if f["mimeType"] == "application/vnd.google-apps.folder":
            print(f"{prefix}[folder] {f['name']}")
            scan_folder(f["id"], depth + 1)
        else:
            size = int(f.get("size", 0)) / 1024
            print(f"{prefix}{f['name']} ({size:.0f}KB)")

print("=== Food folder scan ===")
scan_folder(FOOD_ID)
