# -*- coding: utf-8 -*-
"""画像→動画（Image-to-Video）を Hugging Face の無料 I2V Space で生成する。
狙い：三条の料理写真1枚から「来店して食べてるような」数秒の実写風クリップを作り、
      毎日1本ずつ“素材ライブラリ”として貯める（貯まるほど後でリールに使える）。

無料運用：
- HFの ZeroGPU 無料枠を使う（要 HF_TOKEN。無料アカウントで取得できる）。
- 1日1本だけ生成＝無料クォータ内。連打はしない（＝ToS的にも安全）。
- 生成物はCDN(jsDelivr/R2)へ上げ、シート「リール素材」タブにURLを記録して貯める。

使い方:
  python gen_i2v.py probe                 # 使うSpaceのAPI仕様を表示（初回の配線確認用）
  python gen_i2v.py gen [creds.json]      # 1本生成してライブラリに追加
環境変数:
  HF_TOKEN         Hugging Face の read トークン（必須）
  HF_SPACE         使うI2V Space（既定は下記候補・変更可）
  HF_API_NAME      predict の api_name（probeで判明したものを指定。既定 "/generate"）
  GENRE_FOOD_ID    料理写真フォルダ（Drive）。未指定はfetch_beatと同じ既定
  I2V_PROMPT       動きの指示（未指定は“上品な実食”テンプレ）
"""
import os, sys, io, glob, json, random, tempfile, datetime

# 既定は「上品・実食・湯気・ゆっくり寄り」。前回の“うるさい/下品”の反省を反映。
DEFAULT_PROMPT = (
    "cinematic close-up of this Japanese izakaya dish, gentle slow camera push-in, "
    "delicate steam rising, a diner's chopsticks slowly lift one bite, shallow depth of field, "
    "warm natural light, photorealistic, appetizing, calm and elegant, subtle motion"
)
NEG_PROMPT = "fast motion, jitter, glitch, distortion, deformed, extra fingers, text, watermark, cartoon, oversaturated"

HF_SPACE = os.environ.get("HF_SPACE", "Lightricks/LTX-Video")
HF_API_NAME = os.environ.get("HF_API_NAME", "/generate")
FOOD_FOLDER = os.environ.get("GENRE_FOOD_ID") or "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"
MIN_SIDE = 800
LIB_TAB = "リール素材"


def _client():
    from gradio_client import Client
    tok = os.environ.get("HF_TOKEN", "").strip()
    if not tok:
        raise SystemExit("NG: HF_TOKEN 未設定（無料HFアカウントの read トークンを設定してください）")
    # gradio_client のバージョン差でトークン引数名が違う（hf_token / token）。両対応＋env自動認証。
    last = None
    for kw in ("hf_token", "token"):
        try:
            return Client(HF_SPACE, **{kw: tok})
        except TypeError as e:
            last = e
    return Client(HF_SPACE)   # 最終手段：env HF_TOKEN を自動参照


def probe():
    """SpaceのAPI仕様を表示（api_name と引数を確認して HF_API_NAME を決める）。"""
    c = _client()
    try:
        print(c.view_api(all_endpoints=True, print_info=True))
    except Exception as e:
        print("view_api失敗:", e)
    return 0


# ---- Drive から料理写真を1枚だけ取得 ----
def _drive():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds_path = None
    for a in sys.argv[2:]:
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
        raise SystemExit("NG: 認証JSONが見つかりません")
    sc = ["https://www.googleapis.com/auth/drive.readonly"]
    cr = service_account.Credentials.from_service_account_file(creds_path, scopes=sc)
    return build("drive", "v3", credentials=cr), creds_path


def _list(drive, fid):
    out, page = [], None
    while True:
        r = drive.files().list(q="'%s' in parents and trashed=false" % fid,
            fields="nextPageToken, files(id,name,mimeType,imageMediaMetadata(width,height))",
            pageSize=100, pageToken=page, supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
        out += r.get("files", []); page = r.get("nextPageToken")
        if not page:
            break
    return out


def _pick_food_photo(drive):
    """料理フォルダ（サブフォルダ含む）から短辺800px以上の写真を1枚ランダムで。"""
    pool = []
    for f in _list(drive, FOOD_FOLDER):
        if f["mimeType"] == "application/vnd.google-apps.folder":
            for g in _list(drive, f["id"]):
                m = g.get("imageMediaMetadata") or {}
                if g["mimeType"].startswith("image/") and min(m.get("width", 0), m.get("height", 0)) >= MIN_SIDE:
                    pool.append(g)
        elif f["mimeType"].startswith("image/"):
            m = f.get("imageMediaMetadata") or {}
            if min(m.get("width", 0), m.get("height", 0)) >= MIN_SIDE:
                pool.append(f)
    if not pool:
        raise SystemExit("NG: 料理写真が見つかりません")
    ch = random.choice(pool)
    from googleapiclient.http import MediaIoBaseDownload
    ext = os.path.splitext(ch["name"])[1] or ".jpg"
    tf = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    dl = MediaIoBaseDownload(tf, drive.files().get_media(fileId=ch["id"]))
    done = False
    while not done:
        _, done = dl.next_chunk()
    tf.close()
    return tf.name, os.path.splitext(ch["name"])[0]


def _record_library(creds_path, url, source, prompt):
    """シート「リール素材」タブにURLを1行追記して貯める。"""
    import poster
    poster.SHEET_ID = os.environ.get("SHEET_ID", getattr(poster, "SHEET_ID", ""))
    sh = poster._sheets()
    if not sh:
        print("[LIB] シート未接続→記録スキップ（生成物URLのみ）:", url); return
    poster._ensure_tab(sh, LIB_TAB)
    now = datetime.datetime.now(poster.JST).strftime("%Y-%m-%d %H:%M")
    # ヘッダーが無ければ付ける
    head = sh.values().get(spreadsheetId=poster.SHEET_ID, range=LIB_TAB + "!A1:E1").execute().get("values", [])
    if not head:
        sh.values().update(spreadsheetId=poster.SHEET_ID, range=LIB_TAB + "!A1:E1", valueInputOption="RAW",
            body={"values": [["url", "source", "prompt", "created", "used"]]}).execute()
    sh.values().append(spreadsheetId=poster.SHEET_ID, range=LIB_TAB + "!A:E", valueInputOption="RAW",
        insertDataOption="INSERT_ROWS", body={"values": [[url, source, prompt[:120], now, ""]]}).execute()
    print("[LIB] 素材ライブラリに追加:", url[:70])


def gen():
    import poster
    prompt = os.environ.get("I2V_PROMPT") or DEFAULT_PROMPT
    drive, creds_path = _drive()
    img_path, source = _pick_food_photo(drive)
    print("[I2V] 元写真:", source, "| Space:", HF_SPACE, "| api:", HF_API_NAME)
    c = _client()
    from gradio_client import handle_file
    # 代表的なI2V Spaceは (image, prompt, ...) を取る。api_nameはprobeで確定→env上書き可。
    try:
        result = c.predict(handle_file(img_path), prompt, NEG_PROMPT, api_name=HF_API_NAME)
    except Exception as e:
        print("[I2V] 既定シグネチャ失敗→単純(image,prompt)で再試行:", e)
        result = c.predict(handle_file(img_path), prompt, api_name=HF_API_NAME)
    # 返り値は動画パス or {video:...} or (video, ...) のことが多い。動画ファイルを取り出す。
    vid = _extract_video(result)
    if not vid or not os.path.exists(vid):
        raise SystemExit("[I2V] 動画の取り出しに失敗: %r" % (result,))
    url = poster.up(vid, cdn=True) or poster.up(vid)
    if not url:
        raise SystemExit("[I2V] CDNアップロード失敗")
    print("[I2V] 生成OK →", url)
    _record_library(creds_path, url, source, prompt)
    return 0


def _extract_video(result):
    """gradioの多様な返り値から動画ファイルパスを1つ取り出す。"""
    def one(x):
        if isinstance(x, str) and x.lower().endswith((".mp4", ".webm", ".mov")):
            return x
        if isinstance(x, dict):
            for k in ("video", "name", "path", "url"):
                v = x.get(k)
                if isinstance(v, str) and v.lower().endswith((".mp4", ".webm", ".mov")):
                    return v
        return None
    if isinstance(result, (list, tuple)):
        for x in result:
            got = one(x) or (_extract_video(x) if isinstance(x, (list, tuple, dict)) else None)
            if got:
                return got
        return None
    return one(result)


if __name__ == "__main__":
    mode = (sys.argv[1] if len(sys.argv) > 1 else "gen").strip()
    if mode == "probe":
        sys.exit(probe())
    sys.exit(gen())
