# brand_logo.py — ストーリー共有テンプレ(tempo/photo/simple/sushi/taishu*)が参照する
# public/logo.png を「店ごとの正しいロゴ」に用意する（店舗横断＝すさび湯ロゴ焼き込みを防ぐ）。
#
# 背景：共有テンプレは staticFile("logo.png") を使う。既定の public/logo.png は“すさび湯”ロゴ
# （リポ同梱）。店別フォルダ(GENRE_LOGO_ID)が未設定のため、放っておくと全店でそれが焼かれていた。
#
# 方針：
#   ・すさび湯本体（account="" の三条 / account="karasuma" の鮨処すさび湯）→ 既定ロゴのままで正しい。何もしない。
#   ・それ以外の店 → その店の「ロゴ」フォルダ（FOOD_FOLDER 直下の名前に「ロゴ/logo」を含むサブ
#     フォルダ）から横型ロゴを1枚取り、白抜き→（暗ロゴは）生成り化して public/logo.png に上書き。
#   ・店ロゴが取れない時 → public/logo.png を“消す”。テンプレ側は has_logo=False でロゴ非表示に
#     フォールバックし、すさび湯ロゴは絶対に出さない。
#
# 使い方（各 fetch スクリプトで drive を作った直後に1回）：
#   import brand_logo
#   brand_logo.ensure_brand_logo(drive, FOOD_FOLDER, os.environ.get("STORE_ACCOUNT", ""))
import os, io

PUB_LOGO = os.path.join("public", "logo.png")
# storelogo_white.png も“すさび湯の白ロゴ”がリポ同梱でハードコード参照される（noren/taishunoren/
# gridzoom/taishukaiten/taishuoshi/taishugrid/taishutempo/beat/cinereel/TaishuImgAn 等）。
# これも店別の白ロゴへ差し替える（＝第2の店舗横断経路を塞ぐ）。
PUB_STORELOGO = os.path.join("public", "storelogo_white.png")
# すさび湯本体（既定ロゴ＝すさび湯でそのまま正しい店）。ここは触らない。
SUSABIYU_ACCOUNTS = {"", "karasuma"}


def _list_children(drive, fid):
    out, tok = [], None
    while True:
        r = drive.files().list(
            q="'%s' in parents and trashed=false" % fid,
            fields="nextPageToken, files(id,name,mimeType,imageMediaMetadata)",
            pageSize=1000, pageToken=tok,
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        out.extend(r.get("files", []))
        tok = r.get("nextPageToken")
        if not tok:
            break
    return out


def _find_logo_folder(drive, fid, depth=0):
    for f in _list_children(drive, fid):
        if f.get("mimeType") == "application/vnd.google-apps.folder":
            nm = str(f.get("name", ""))
            if ("ロゴ" in nm) or ("logo" in nm.lower()):
                return f["id"]
            if depth < 2:
                sub = _find_logo_folder(drive, f["id"], depth + 1)
                if sub:
                    return sub
    return None


def _score(f):
    nm = str(f.get("name", "")).lower()
    m = f.get("imageMediaMetadata") or {}
    w, h = m.get("width", 0) or 0, m.get("height", 0) or 0
    ar = (w / h) if h else 0
    s = 0
    if any(k in nm for k in ("横", "wide", "yoko")):
        s += 100
    if any(k in nm for k in ("white", "白", "透過", "trans")):
        s += 40
    if ar >= 1.4:
        s += 30
    s += min(ar, 6) * 5
    return s


def _build_store_logo(drive, food_folder, account):
    """店の「ロゴ」フォルダから横型ロゴを取得し、白抜き→（暗ロゴは）生成り化して
    public/logo.png に保存。成功で True。取得できなければ False（logo.png は作らない）。"""
    from googleapiclient.http import MediaIoBaseDownload
    lf = _find_logo_folder(drive, food_folder)
    if not lf:
        print("[BRAND] %s: ロゴフォルダが見つからず" % account)
        return False
    imgs = [f for f in _list_children(drive, lf) if str(f.get("mimeType", "")).startswith("image/")]
    if not imgs:
        print("[BRAND] %s: ロゴフォルダに画像なし" % account)
        return False
    pick = sorted(imgs, key=_score, reverse=True)[0]
    print("[BRAND] %s: ロゴ採用 %s" % (account, pick.get("name")))
    os.makedirs("public", exist_ok=True)
    raw = os.path.join("public", "_brand_logo_raw")
    req = drive.files().get_media(fileId=pick["id"])
    buf = io.FileIO(raw, "wb")
    dl = MediaIoBaseDownload(buf, req)
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.close()

    try:
        from PIL import Image
    except ImportError:
        import shutil
        shutil.copyfile(raw, PUB_LOGO)
        print("[BRAND] Pillow未導入のため無加工でコピー")
        try:
            os.remove(raw)
        except Exception:
            pass
        return True

    im = Image.open(raw).convert("RGBA")
    px = im.load(); W, H = im.size
    HI, LO = 244, 210; lum_sum = 0; lum_cnt = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            mn = min(r, g, b)
            if a == 0:
                continue
            if mn >= HI:
                px[x, y] = (r, g, b, 0)
            else:
                na = int(255 * (HI - mn) / (HI - LO)) if mn > LO else 255
                na = min(na, a)
                px[x, y] = (r, g, b, na)
                if na > 60:
                    lum_sum += (r * 299 + g * 587 + b * 114) // 1000; lum_cnt += 1
    avg = (lum_sum / lum_cnt) if lum_cnt else 255
    bbox = im.getbbox()
    im_c = im.crop(bbox) if bbox else im

    # logo_color 指定の店（GOLD等）は色付きのまま。それ以外は暗ロゴを生成り単色化。
    color_only = False
    try:
        import stores as _stx
        color_only = bool((_stx.get_store(account) or {}).get("logo_color"))
    except Exception:
        pass
    im_k = im_c.copy()
    if color_only:
        print("[BRAND] logo_color 指定(%s): 色付きロゴをそのまま使用" % account)
    elif avg < 150:
        CR, CG, CB = 0xF3, 0xEA, 0xD8
        pk = im_k.load(); w2, h2 = im_k.size
        for y in range(h2):
            for x in range(w2):
                r, g, b, a = pk[x, y]
                if a > 0:
                    pk[x, y] = (CR, CG, CB, a)
        print("[BRAND] 暗ロゴ→生成りに整えました (avg=%.0f)" % avg)
    im_k.save(PUB_LOGO)
    # storelogo_white.png（ハードコード参照）用の白ロゴ。logo_color 店（GOLD等）は色付きのまま。
    if color_only:
        im_c.save(PUB_STORELOGO)
    else:
        im_w = im_c.copy()
        pw = im_w.load(); ww, hh = im_w.size
        for y in range(hh):
            for x in range(ww):
                r, g, b, a = pw[x, y]
                if a > 0:
                    pw[x, y] = (255, 255, 255, a)
        im_w.save(PUB_STORELOGO)
    try:
        os.remove(raw)
    except Exception:
        pass
    print("[BRAND] 店別ロゴに差し替え (%s) logo.png+storelogo_white.png %r" % (account, im_k.size))
    return True


# 1x1 完全透過PNG（Pillowが無い環境でも確実に置けるフォールバック用の生バイト）。
_TRANSPARENT_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc`\x00\x00"
    b"\x00\x02\x00\x01\xe2!\xbc3\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _write_transparent_placeholder():
    """非すさび湯店で店ロゴが取れない時、すさび湯ロゴを絶対に出さないための完全透過画像。
    logo.png / storelogo_white.png の両方を透過に（無条件参照テンプレでもレンダーは壊れない・ロゴ不可視）。"""
    os.makedirs("public", exist_ok=True)
    for path in (PUB_LOGO, PUB_STORELOGO):
        try:
            from PIL import Image
            Image.new("RGBA", (8, 8), (0, 0, 0, 0)).save(path)
        except Exception:
            with open(path, "wb") as fp:
                fp.write(_TRANSPARENT_PNG)


def ensure_brand_logo(drive, food_folder, account):
    """共有 logo.png を店に合わせて用意する。すさび湯本体は既定のまま。
    非すさび湯で店ロゴが取れなければ“完全透過”に差し替え、すさび湯ロゴを絶対に出さない。
    戻り値は「可視ロゴが載ったか」（透過プレースホルダ時は False）。"""
    account = (account or "").strip()
    if account in SUSABIYU_ACCOUNTS:
        # すさび湯本体：既定の public/logo.png（すさび湯ロゴ）でよい。
        return os.path.exists(PUB_LOGO)
    try:
        ok = _build_store_logo(drive, food_folder, account)
    except Exception as e:
        ok = False
        print("[BRAND] 店ロゴ取得で例外:", e)
    if ok and os.path.exists(PUB_LOGO):
        return True
    # 店ロゴが用意できない → すさび湯ロゴを絶対に出さないため完全透過に差し替え（レンダーは壊さない）。
    _write_transparent_placeholder()
    print("[BRAND] %s: 店ロゴ未取得のため logo.png を完全透過に（ロゴ不可視・すさび湯ロゴは出さない）" % account)
    return False
