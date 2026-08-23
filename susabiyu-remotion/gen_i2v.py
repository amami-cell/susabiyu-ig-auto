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

# probeで確認済み：Lightricks/ltx-video-distilled の /image_to_video は
#   (prompt, negative_prompt, image, video, height, width, mode, duration,
#    frames_to_use, seed, randomize_seed, guidance, improve_texture) を取り、動画を返す。
# テキストプロンプトが効く＝「箸で持ち上げる・湯気」など“実食”を指示できる唯一の生存Space。
HF_SPACE = os.environ.get("HF_SPACE", "Lightricks/ltx-video-distilled")
HF_API_NAME = os.environ.get("HF_API_NAME", "/image_to_video")
# 縦動画寄り（後段のリールは9:16に整形するので厳密でなくてよい）。無料GPU時間を考え小さめ・短め。
I2V_HEIGHT = int(os.environ.get("I2V_HEIGHT", "704"))
I2V_WIDTH = int(os.environ.get("I2V_WIDTH", "512"))
I2V_DURATION = float(os.environ.get("I2V_DURATION", "3"))
FOOD_FOLDER = os.environ.get("GENRE_FOOD_ID") or "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"
MIN_SIDE = 800
LIB_TAB = "リール素材"


# 実在チェック用のI2V Space候補（無料ZeroGPU系）。probeでどれが生きてるか自動判定する。
CANDIDATES = [
    "multimodalart/stable-video-diffusion",
    "fffiloni/stable-video-diffusion-img2vid",
    "wangfuyun/AnimateLCM-SVD",
    "Lightricks/ltx-video-distilled",
    "Lightricks/LTX-Video-Playground",
    "ali-vilab/i2vgen-xl",
    "modelscope/i2vgen-xl",
    "fffiloni/SVD_Keyframe_Interpolation",
    "guoyww/AnimateDiff",
    "TencentARC/PhotoMaker-V2",
]


def _client(space=None):
    from gradio_client import Client
    sp = space or HF_SPACE
    tok = os.environ.get("HF_TOKEN", "").strip()
    if not tok:
        raise SystemExit("NG: HF_TOKEN 未設定（無料HFアカウントの read トークンを設定してください）")
    # gradio_client のバージョン差でトークン引数名が違う（hf_token / token）。両対応＋env自動認証。
    for kw in ("hf_token", "token"):
        try:
            return Client(sp, **{kw: tok})
        except TypeError:
            pass
    return Client(sp)   # 最終手段：env HF_TOKEN を自動参照


def _summarize_api(c):
    """named_endpoints を「api_name → 引数(型)」で短く表示する。"""
    try:
        info = c.view_api(return_format="dict")
    except Exception as e:
        return "view_api失敗: %s" % e
    eps = (info or {}).get("named_endpoints", {}) or {}
    lines = []
    for name, meta in eps.items():
        ps = []
        for p in meta.get("parameters", []):
            pn = p.get("parameter_name") or p.get("label") or "?"
            ty = (p.get("python_type") or {}).get("type") or p.get("type") or "?"
            ps.append("%s:%s" % (pn, ty))
        lines.append("   %s (%s)" % (name, ", ".join(ps)))
    return "\n".join(lines) or "   （named_endpoints なし）"


def probe():
    """候補Space（or HF_SPACE指定時はそれのみ）を順に叩き、生きてるSpaceとAPI仕様を表示。"""
    spaces = [HF_SPACE] if os.environ.get("HF_SPACE") else CANDIDATES
    ok = 0
    for sp in spaces:
        try:
            c = _client(sp)
            print("== OK:", sp, "==")
            print(_summarize_api(c))
            ok += 1
        except Exception as e:
            print("-- NG:", sp, "|", type(e).__name__, str(e)[:100])
    print("\n[PROBE] 生存Space %d/%d" % (ok, len(spaces)))
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
    print("[I2V] 元写真:", source)
    result = _generate_with_fallback(img_path, prompt)
    if result is None:
        print("[I2V] 全Spaceで無料GPUを確保できず（混雑）。今日はスキップ＝明日また回す。")
        return 0   # “空き待ち”は失敗ではないのでワークフローは緑（毎日回し続ける）
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


def _is_quota_out(e):
    """無料ZeroGPUの1日分クォータを使い切り（=これ以上は無駄。即中断して明日に回す）。"""
    s = str(e).lower()
    return "exceeded your free zerogpu quota" in s or ("quota" in s and "left" in s)


def _is_congested(e):
    """GPUの空き待ちで落ちただけ（クォータは消費していない＝リトライする価値あり）。"""
    s = str(e).lower()
    return ("no gpu was available" in s) or ("gpu was available" in s) or ("queue" in s) or ("gpu task aborted" in s)


def _call_ltx(c, img, prompt):
    from gradio_client import handle_file
    return c.predict(
        prompt, NEG_PROMPT, handle_file(img), None,
        I2V_HEIGHT, I2V_WIDTH, "image-to-video", I2V_DURATION,
        9, 42, True, 1, True, api_name="/image_to_video")


def _call_svd(c, img, prompt):
    from gradio_client import handle_file
    return c.predict(handle_file(img), 42, True, 127, 6, api_name="/video")


# 生存確認済みの無料I2V。(space, 呼び出し, リトライ回数)。
# LTX distilled＝高速＆プロンプトが効く＝“実食”演出向き＆クォータ消費が少ない → 最優先で多めにリトライ。
# AnimateLCM-SVD＝プロンプト無しだが軽め＝最後の保険。※180s喰う大型SVDはクォータ即枯れなので不採用。
TARGETS = [
    ("Lightricks/ltx-video-distilled", _call_ltx, 4),
    ("wangfuyun/AnimateLCM-SVD", _call_svd, 1),
]


def _generate_with_fallback(img_path, prompt):
    """無料ZeroGPUは“空き待ち”で落ちる。混雑はリトライ、クォータ切れは即中断（明日に回す）。"""
    import time
    if os.environ.get("HF_SPACE"):
        builder = _call_ltx if HF_API_NAME == "/image_to_video" else _call_svd
        targets = [(HF_SPACE, builder, 4)]
    else:
        targets = TARGETS
    for space, builder, tries in targets:
        for attempt in range(1, tries + 1):
            try:
                print("[I2V] 生成試行:", space, "(%d/%d)" % (attempt, tries))
                c = _client(space)
                return builder(c, img_path, prompt)
            except Exception as e:
                if _is_quota_out(e):
                    print("   本日の無料GPUクォータ切れ→中断（明日また回す）:", str(e)[:90])
                    return None
                if _is_congested(e):
                    print("   混雑でGPU確保できず→少し待って再挑戦:", str(e)[:80])
                    time.sleep(15)
                    continue
                print("   失敗（別Spaceへ）:", type(e).__name__, str(e)[:90])
                break
    return None


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
