import os, io, glob, json, sys, random

FOOD_FOLDER = "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"
OUT = os.path.join("public", "simple.jpg")

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
except ImportError:
    print("NG: googleライブラリ未インストール。 pip install google-api-python-client google-auth")
    raise SystemExit

def find_creds():
    bases = [".", "..", os.path.join("..", ".."), os.path.join("..", "..", "credentials"),
             os.path.join("..", "..", "infomart_automation")]
    for b in bases:
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

creds_path = sys.argv[1] if len(sys.argv) > 1 and os.path.exists(sys.argv[1]) else find_creds()
if not creds_path:
    print("NG: 認証JSON未指定。 python fetch_simple.py \"C:\\...\\infomart_automation.json\"")
    raise SystemExit

scopes = ["https://www.googleapis.com/auth/drive.readonly"]
creds = service_account.Credentials.from_service_account_file(creds_path, scopes=scopes)
drive = build("drive", "v3", credentials=creds)

def gather(root_id):
    images = []
    stack = [root_id]
    seen = set()
    while stack:
        fid = stack.pop()
        if fid in seen:
            continue
        seen.add(fid)
        page = None
        while True:
            res = drive.files().list(
                q="'%s' in parents and trashed=false" % fid,
                fields="nextPageToken, files(id,name,mimeType)",
                pageSize=100, pageToken=page,
                supportsAllDrives=True, includeItemsFromAllDrives=True,
            ).execute()
            for f in res.get("files", []):
                mt = f["mimeType"]
                if mt == "application/vnd.google-apps.folder":
                    stack.append(f["id"])
                elif mt.startswith("image/"):
                    images.append(f)
            page = res.get("nextPageToken")
            if not page:
                break
    return images

imgs = gather(FOOD_FOLDER)
if not imgs:
    print("NG: 画像が見つかりません。")
    raise SystemExit
pick = random.choice(imgs)

req = drive.files().get_media(fileId=pick["id"])
buf = io.FileIO(OUT, "wb")
dl = MediaIoBaseDownload(buf, req)
done = False
while not done:
    _, done = dl.next_chunk()
buf.close()
print("PHOTO:", pick["name"], "-> public/simple.jpg")

# 決め言葉をランダム選択
phrases = json.load(open("phrases.json", encoding="utf-8"))
phrase = random.choice(phrases)
print("PHRASE:", phrase)

has_logo = os.path.exists(os.path.join("public", "logo.png"))

ph = phrase.replace("\\", "\\\\").replace('"', '\\"')
ts = (
    'export const simplePhoto = "simple.jpg";\n'
    'export const simplePhrase = "%s";\n'
    'export const simpleHasLogo = %s;\n'
) % (ph, "true" if has_logo else "false")
open(os.path.join("src", "simpleData.ts"), "w", encoding="utf-8").write(ts)
print("src/simpleData.ts 書き出し完了。 logo:", has_logo)
