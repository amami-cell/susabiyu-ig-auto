import os, glob, json, sys

FOLDERS = {
    "ROOT": "1Z_bROapnskpDLvK-wg3bDbnd7blTycsB",
    "FOOD": "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv",
    "SAKE": "1vIAC9frejCyGhQAizT1Wsgmlaj8ULhTb",
    "INTERIOR": "17h9qNWIEisEaEqNUuH-6XA39eVxgfHQW",
    "EVENT": "1J4NMPxNW3T3IVLmj470-urEhTEicwW5w",
}

from google.oauth2 import service_account
from googleapiclient.discovery import build

def find_creds():
    bases = [".", "..", os.path.join("..",".."), os.path.join("..","..","credentials"),
             os.path.join("..","..","infomart_automation")]
    for b in bases:
        for p in glob.glob(os.path.join(b, "*.json")):
            ap = os.path.abspath(p)
            if "node_modules" in ap: continue
            try: d = json.load(open(ap, encoding="utf-8"))
            except Exception: continue
            if isinstance(d, dict) and d.get("type") == "service_account":
                return ap
    return None

creds_path = sys.argv[1] if len(sys.argv) > 1 and os.path.exists(sys.argv[1]) else find_creds()
if not creds_path:
    print("NG: creds未指定"); raise SystemExit
print("creds:", creds_path)

scopes = ["https://www.googleapis.com/auth/drive.readonly"]
creds = service_account.Credentials.from_service_account_file(creds_path, scopes=scopes)
drive = build("drive", "v3", credentials=creds)

def listing(fid):
    res = drive.files().list(
        q="'%s' in parents and trashed=false" % fid,
        fields="files(id,name,mimeType)", pageSize=50,
        supportsAllDrives=True, includeItemsFromAllDrives=True,
    ).execute()
    return res.get("files", [])

for label, fid in FOLDERS.items():
    print("\n===== %s (%s) =====" % (label, fid))
    try:
        items = listing(fid)
    except Exception as e:
        print("  ERROR:", e)
        continue
    if not items:
        print("  (空 または アクセス不可)")
        continue
    img = [x for x in items if x["mimeType"].startswith("image/")]
    fld = [x for x in items if x["mimeType"] == "application/vnd.google-apps.folder"]
    print("  画像 %d 件 / サブフォルダ %d 件 / 合計 %d 件" % (len(img), len(fld), len(items)))
    for x in items[:12]:
        print("   -", x["mimeType"], "|", x["name"], "|", x["id"])
