import os,json,random,time,subprocess,tempfile,io,base64
from datetime import datetime,timedelta
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import requests as req
CRED_B64=os.environ.get("GOOGLE_CREDS_B64","")
TOKEN=os.environ.get("IG_ACCESS_TOKEN","")
SHEET_ID=os.environ.get("SHEET_ID","")
LINE_TOKEN=os.environ.get("LINE_CHANNEL_TOKEN","")
GENRE_IDS={"FOOD":os.environ.get("GENRE_FOOD_ID",""),"SAKE":os.environ.get("GENRE_SAKE_ID",""),"INTERIOR":os.environ.get("GENRE_INTERIOR_ID",""),"EVENT":os.environ.get("GENRE_EVENT_ID","")}
FONT="/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
W,H,FPS=1080,1920,30
TELOPS={"FOOD":["旬の魚、入ってます。","お造り、切りたてです。","本日のおすすめ。","寿司、握りたてです。"],"SAKE":["仕事のあとの一杯に。","今宵もお待ちしてます。","二軒目にどうぞ。","日本酒、入荷しました。"],"INTERIOR":["京都三条の寿司酒場。","まだお席ございます。","カウンターで一杯。"],"EVENT":["ご宴会承ります。","貸切もご相談ください。","ご予約受付中。"]}
def get_services():
    c=json.loads(base64.b64decode(CRED_B64))
    cr=Credentials.from_service_account_info(c,scopes=["https://www.googleapis.com/auth/drive.readonly","https://www.googleapis.com/auth/spreadsheets"])
    return build("drive","v3",credentials=cr),build("sheets","v4",credentials=cr)
def refresh_token(sheets,token):
    try:
        r=req.get("https://graph.instagram.com/v23.0/refresh_access_token",params={"grant_type":"ig_refresh_token","access_token":token}).json()
        if "access_token" in r:
            nt=r["access_token"];d=r.get("expires_in",0)//86400;print(f"[TOKEN] refreshed, {d} days")
            try:
                now=datetime.now().strftime("%Y-%m-%d %H:%M")
                try:sheets.spreadsheets().values().get(spreadsheetId=SHEET_ID,range="Config!A1").execute()
                except:sheets.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID,body={"requests":[{"addSheet":{"properties":{"title":"Config"}}}]}).execute()
                sheets.spreadsheets().values().update(spreadsheetId=SHEET_ID,range="Config!A1:C2",valueInputOption="RAW",body={"values":[["token","updated","days"],[nt,now,str(d)]]}).execute()
            except:pass
            return nt
    except Exception as e:print(f"[TOKEN] {e}")
    return token
def scan(drive,fid):
    ps=[]
    r=drive.files().list(q=f"'{fid}' in parents and trashed=false",fields="files(id,name,mimeType)",pageSize=200).execute()
    for f in r.get("files",[]):
        if f["mimeType"]=="application/vnd.google-apps.folder":ps.extend(scan(drive,f["id"]))
        elif f["mimeType"].startswith("image/"):ps.append({"id":f["id"],"name":f["name"]})
    return ps
def pick(drive,sheets):
    gs=[g for g in ["FOOD","SAKE","INTERIOR","EVENT"] if GENRE_IDS.get(g)]
    random.shuffle(gs)
    try:
        r=sheets.spreadsheets().values().get(spreadsheetId=SHEET_ID,range="A:F").execute()
        used={row[0]:row[5] for row in r.get("values",[])[1:] if len(row)>=6}
    except:used={}
    cut=(datetime.now()-timedelta(days=30)).strftime("%Y-%m-%d")
    for g in gs:
        ps=scan(drive,GENRE_IDS[g])
        if not ps:continue
        fr=[p for p in ps if p["id"] not in used or used[p["id"]]<cut]
        p=random.choice(fr if fr else ps)
        print(f"[SELECT] {g} / {p['name']}");return p,g
    return None,None
def record(sheets,photo,genre):
    if not SHEET_ID:return
    try:
        now=datetime.now().strftime("%Y-%m-%d %H:%M")
        row=[photo["id"],photo["name"],"susabiyu_sanjo",genre,now,now,"1","active",""]
        sheets.spreadsheets().values().append(spreadsheetId=SHEET_ID,range="A:I",valueInputOption="RAW",body={"values":[row]}).execute()
        print(f"[SHEET] {photo['name']}")
    except Exception as e:print(f"[SHEET] {e}")
def dl(drive,fid,dest):
    fh=io.FileIO(dest,"wb");d=MediaIoBaseDownload(fh,drive.files().get_media(fileId=fid))
    done=False
    while not done:_,done=d.next_chunk()
def esc(p):return p.replace("\\","/").replace(":","\\:")
def mkv(img,telop,out):
    dur=round(random.uniform(5.0,7.0),1)
    tf=tempfile.NamedTemporaryFile("w",suffix=".txt",delete=False,encoding="utf-8");tf.write(telop);tf.close()
    fc=(f"[0]split[bg][fg];[bg]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=40[bg2];"
        f"[fg]scale={W}:{H}:force_original_aspect_ratio=decrease[fg2];[bg2][fg2]overlay=(W-w)/2:(H-h)/2,"
        f"fade=t=in:d=0.5,fade=t=out:st={dur-0.5:.1f}:d=0.5,"
        f"drawtext=fontfile='{esc(FONT)}':textfile='{esc(tf.name)}':fontcolor=white:fontsize=72:"
        f"borderw=3:bordercolor=black@0.7:shadowcolor=black@0.4:shadowx=2:shadowy=2:"
        f"x=(w-text_w)/2:y=h*0.85:alpha='if(lt(t,1.2),t/1.2,1)'")
    subprocess.run(["ffmpeg","-y","-loop","1","-framerate",str(FPS),"-i",img,"-t",str(dur),"-filter_complex",fc,"-c:v","libx264","-pix_fmt","yuv420p","-r",str(FPS),"-movflags","+faststart",out],check=True,capture_output=True)
    os.unlink(tf.name);print(f"[VIDEO] {dur}s / {telop}")
def up(path):
    r=req.post("https://catbox.moe/user/api.php",data={"reqtype":"fileupload"},files={"fileToUpload":open(path,"rb")})
    url=r.text.strip();print(f"[UPLOAD] {url}");return url
def ig_post(token,vurl):
    B="https://graph.instagram.com/v23.0"
    me=req.get(f"{B}/me",params={"fields":"user_id,username","access_token":token}).json()
    uid=me.get("user_id") or me.get("id");print(f"[POST] @{me.get('username')}")
    c=req.post(f"{B}/{uid}/media",data={"video_url":vurl,"media_type":"STORIES","access_token":token}).json()
    if "error" in c:print(f"[POST] ERROR: {c['error']}");return
    cid=c["id"]
    for _ in range(30):
        s=req.get(f"{B}/{cid}",params={"fields":"status_code","access_token":token}).json()
        if s.get("status_code")=="FINISHED":break
        if s.get("status_code")=="ERROR":print("[POST] error");return
        time.sleep(5)
    p=req.post(f"{B}/{uid}/media_publish",data={"creation_id":cid,"access_token":token}).json()
    print(f"[POST] done! {p.get('id')}")
def line_notify(telop,photo_name,genre):
    if not LINE_TOKEN:return
    msg=f"[ストーリー投稿完了]\n写真: {photo_name}\nジャンル: {genre}\nテロップ: {telop}"
    try:
        req.post("https://api.line.me/v2/bot/message/broadcast",
            headers={"Authorization":f"Bearer {LINE_TOKEN}","Content-Type":"application/json"},
            json={"messages":[{"type":"text","text":msg}]})
        print("[LINE] notified")
    except Exception as e:print(f"[LINE] {e}")
def main():
    global TOKEN
    drive,sheets=get_services()
    TOKEN=refresh_token(sheets,TOKEN)
    photo,genre=pick(drive,sheets)
    if not photo:print("No photos");return
    img="/tmp/photo.jpg";dl(drive,photo["id"],img)
    telop=random.choice(TELOPS.get(genre,TELOPS["FOOD"]))
    out="/tmp/story.mp4";mkv(img,telop,out)
    record(sheets,photo,genre)
    url=up(out);ig_post(TOKEN,url)
    line_notify(telop,photo["name"],genre)
    print("=== DONE ===")
if __name__=="__main__":main()
