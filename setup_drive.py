import sys
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

CRED_PATH = r"C:\Users\Owner\OneDrive\デスクトップ\クロードコード整理用フォルダ\infomart_automation.json"
SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
]
GENRES = ["Food", "Sake", "Interior", "Event"]

def auth():
    creds = Credentials.from_service_account_file(CRED_PATH, scopes=SCOPES)
    drive = build("drive", "v3", credentials=creds)
    sheets = build("sheets", "v4", credentials=creds)
    return drive, sheets, creds

def create_folder(drive, name, parent_id=None):
    meta = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
    if parent_id:
        meta["parents"] = [parent_id]
    f = drive.files().create(body=meta, fields="id").execute()
    print(f"  folder: {name} -> {f['id']}")
    return f["id"]

def share(drive, file_id, email, role="writer"):
    drive.permissions().create(
        fileId=file_id,
        body={"type": "user", "role": role, "emailAddress": email},
        sendNotificationEmail=False,
    ).execute()

def create_index_sheet(sheets, title):
    body = {"properties": {"title": title}}
    s = sheets.spreadsheets().create(body=body).execute()
    sid = s["spreadsheetId"]
    print(f"  sheet: {title} -> {sid}")
    headers = [["file_id", "file_name", "store", "genre", "added_date",
                "last_used", "use_count", "status", "hash"]]
    sheets.spreadsheets().values().update(
        spreadsheetId=sid, range="A1:I1",
        valueInputOption="RAW", body={"values": headers}
    ).execute()
    return sid

def main():
    email = input("あなたのGoogleアカウントのメールアドレス: ").strip()
    if not email:
        print("メールアドレスが必要です"); return

    print("\n認証中...")
    drive, sheets, creds = auth()

    print("\nDriveフォルダ作成仭...")
    root_id = create_folder(drive, "Susabiyu_Sanjo")
    genre_ids = {}
    for g in GENRES:
        genre_ids[g] = create_folder(drive, g, root_id)

    print("\nフォルダを共有中...")
    share(drive, root_id, email)
    print(f"  {email} に共有しました")

    print("\nインデックスSheet作成中...")
    sheet_id = create_index_sheet(sheets, "Susabiyu_IG_Index")
    share(drive, sheet_id, email)

    print("\n========== 完了 ==========")
    print(f"Drive folder ID : {root_id}")
    print(f"Sheet ID        : {sheet_id}")
    print(f"Sheet URL       : https://docs.google.com/spreadsheets/d/{sheet_id}")
    print(f"\nDriveの「共有アイテム」に Susabiyu_Sanjo フォルダが表示されます。")
    print(f"そこに写真を入れてください。")

    with open("drive_config.txt", "w") as f:
        f.write(f"ROOT_FOLDER_ID={root_id}\n")
        f.write(f"SHEET_ID={sheet_id}\n")
        for g, gid in genre_ids.items():
            f.write(f"GENRE_{g.upper()}_ID={gid}\n")
    print(f"\n設定を drive_config.txt に保存しました。")

if __name__ == "__main__":
    main()
