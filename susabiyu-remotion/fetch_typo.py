import os, io, glob, json, sys, random

FOOD_FOLDER = os.environ.get("GENRE_FOOD_ID") or "14oKNgdXee2NrI7Dkmbrlbid4f0_VZ5Cv"
N_PHOTOS = 4
MIN_SIDE = 800
OUT_DIR = os.path.join("public", "typo")
NORMAL_DIR = os.path.join("public", "music", "normal")

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
except ImportError:
    print("NG: googleライブラリ未インストール。")
    raise SystemExit

def find_creds():
    for b in [".", "..", os.path.join("..", "..")]:
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
    print("NG: 認証JSON未指定。")
    raise SystemExit

scopes = ["https://www.googleapis.com/auth/drive.readonly"]
creds = service_account.Credentials.from_service_account_file(creds_path, scopes=scopes)
drive = build("drive", "v3", credentials=creds)

import io as _io_ms
from googleapiclient.http import MediaIoBaseDownload as _MIBD_ms
def _dl_music(f, local_dir):
    name = f.get("name", "")
    dest = os.path.join(local_dir, name)
    if os.path.exists(dest):
        return
    req = drive.files().get_media(fileId=f["id"])
    buf = _io_ms.FileIO(dest, "wb")
    dl = _MIBD_ms(buf, req)
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.close()
    print("[MUSIC DL]", name)


def sync_music_from_drive(folder_id, local_dir, _depth=0):
    """フォルダ配下のmp3を local_dir へ取得。
    直下にmp3があればそれを使う（＝三条は従来どおり非再帰・挙動不変）。直下に無い時だけ
    サブフォルダを再帰（深さ3）で探す（曲がサブフォルダにある店舗＝ぎふや等を救済）。"""
    if not folder_id:
        return
    try:
        os.makedirs(local_dir, exist_ok=True)
        children = list_children(folder_id)
        audio = [f for f in children if f.get("name", "").lower().endswith((".mp3", ".m4a", ".wav"))]
        if audio:
            for f in audio:
                _dl_music(f, local_dir)          # 直下にある＝それを使う（三条の従来動作）
        elif _depth < 3:
            for f in children:                   # 直下に無い時だけサブフォルダを探索（ぎふや救済）
                if f.get("mimeType", "") == "application/vnd.google-apps.folder":
                    sync_music_from_drive(f["id"], local_dir, _depth + 1)
    except Exception as e:
        print("[MUSIC] sync skip:", e)

def list_children(fid):
    out = []
    page = None
    while True:
        res = drive.files().list(
            q="'%s' in parents and trashed=false" % fid,
            fields="nextPageToken, files(id,name,mimeType,imageMediaMetadata(width,height))",
            pageSize=100, pageToken=page,
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        out += res.get("files", [])
        page = res.get("nextPageToken")
        if not page:
            break
    return out

def short_side(f):
    m = f.get("imageMediaMetadata") or {}
    return min(m.get("width", 0) or 0, m.get("height", 0) or 0)

# 店舗別の非料理カテゴリ/ファイル除外（例: ロゴ/外観/内観/ランチ/集合/音楽）。GENRE_EXCLUDE_CATS で部分一致指定。
# 未設定なら無効＝三条は従来どおり。ぎふやは stores.py が設定する。
_EXCL = [s.strip() for s in os.environ.get("GENRE_EXCLUDE_CATS", "").split(",") if s.strip()]
# フラット構造フラグ：写真がフォルダ直下にバラ置き＋一部サブフォルダ、という店舗（ぎふや等）向け。
# 再帰的に画像を集め、除外フォルダ/ファイルを飛ばす（gifuya_photos と同じ考え方）。
_FLAT = os.environ.get("GENRE_FOOD_FLAT") == "1"


def _is_drink_cat(name):
    n = str(name or "").lower()
    for k in ("ドリンク", "飲み物", "飲物", "サワー", "ハイボール", "ビール", "ワイン",
              "日本酒", "焼酎", "カクテル", "梅酒", "ソフトドリンク", "drink", "beer", "sour"):
        if k.lower() in n:
            return True
    return False


def _excluded(name):
    return bool(_EXCL) and any(x in str(name or "") for x in _EXCL)


def _walk_images(fid, folder_name="", depth=0):
    """(画像, 直上フォルダ名) を再帰収集。除外フォルダは辿らない。"""
    out = []
    for f in list_children(fid):
        nm = f.get("name", "")
        if f["mimeType"] == "application/vnd.google-apps.folder":
            if _excluded(nm) or _is_drink_cat(nm):
                continue
            if depth < 3:
                out += _walk_images(f["id"], nm, depth + 1)
        elif f["mimeType"].startswith("image/") and short_side(f) >= MIN_SIDE:
            out.append((f, folder_name))
    return out


cats = {}
if _FLAT:
    # 再帰収集：直下バラ置き＝「料理」、サブフォルダはその名前をカテゴリに。ファイル名の除外語も飛ばす。
    for f, folder in _walk_images(FOOD_FOLDER):
        if _excluded(f.get("name", "")):
            continue
        cat = folder or "料理"
        if _is_drink_cat(cat):
            continue
        cats.setdefault(cat, []).append(f)
    print("[FLAT] 再帰収集 カテゴリ:", {k: len(v) for k, v in cats.items()})
else:
    for f in list_children(FOOD_FOLDER):
        if f["mimeType"] == "application/vnd.google-apps.folder":
            imgs = [g for g in list_children(f["id"])
                    if g["mimeType"].startswith("image/") and short_side(g) >= MIN_SIDE]
            if imgs:
                cats[f["name"]] = imgs
    cats = {k: v for k, v in cats.items() if not _is_drink_cat(k)}
    if _EXCL:
        _before = list(cats.keys())
        cats = {k: v for k, v in cats.items() if not _excluded(k)}
        _removed = [k for k in _before if k not in cats]
        if _removed:
            print("[EXCLUDE] 非料理カテゴリを除外:", _removed)

if not cats:
    print("NG: 条件を満たす画像が見つかりません。")
    raise SystemExit

# 店舗のキャプション体系（料理名→ストーリー用の短い一言）。ナガグツ等のみ。三条/ぎふやは空("")＝従来どおり。
_STORY_FN = None
def _story_for(caption):
    global _STORY_FN
    if _STORY_FN is None:
        acct = os.environ.get("STORE_ACCOUNT", "").strip().lower()
        _STORY_FN = (lambda _nm: "")
        try:
            if acct == "nagagutsu":
                import nagagutsu_captions as _nc
                _STORY_FN = _nc.story_for
        except Exception as _e:
            print("[STORY] キャプション体系スキップ:", _e)
    try:
        return _STORY_FN(caption) or ""
    except Exception:
        return ""


# 料理名の欧文サブ（イタリア語優先）。ナガグツのみ。他店は空。
_SUB_FN = None
def _sub_for(caption):
    global _SUB_FN
    if _SUB_FN is None:
        acct = os.environ.get("STORE_ACCOUNT", "").strip().lower()
        _SUB_FN = (lambda _nm: "")
        try:
            if acct == "nagagutsu":
                import nagagutsu_captions as _nc
                _SUB_FN = _nc.sub_for
        except Exception as _e:
            print("[SUB] 欧文サブ体系スキップ:", _e)
    try:
        return _SUB_FN(caption) or ""
    except Exception:
        return ""


# 表示用の料理名（16文字以上のみ承認済み位置に ｜ 改行マーカーを入れる）。ナガグツのみ。
_DISP_FN = None
def _name_disp(caption):
    global _DISP_FN
    if _DISP_FN is None:
        acct = os.environ.get("STORE_ACCOUNT", "").strip().lower()
        _DISP_FN = (lambda _nm: _nm)
        try:
            if acct == "nagagutsu":
                import nagagutsu_captions as _nc
                _DISP_FN = _nc.name_broken
        except Exception as _e:
            print("[DISP] 改行体系スキップ:", _e)
    try:
        return _DISP_FN(caption) or caption
    except Exception:
        return caption


import re as _re_cap
def _clean_caption(nm):
    """ファイル名から“ちゃんとした料理名”を作る（ぎふやの _dish_name と同じ思想＋汎用の除去）。
    カメラ/書き出しの機械的な連番・日付・コピー・おすすめ印・拡張子・区切り記号を除去し、
    アンダースコアは全角スペースへ。空になったら元の名前に戻す（＝最低限は表示）。"""
    import os as _o
    n = _o.path.splitext(str(nm or ""))[0]
    for h in ("おすすめ", "オススメ", "お勧め", "オススメ料理", "★", "☆"):
        n = n.replace(h, "")
    n = _re_cap.sub(r'(?:IMG|DSC|DSCN|DCIM|PXL|MVIMG|GFY|MOV|VID)[-_ ]?\d+', '', n, flags=_re_cap.I)
    n = _re_cap.sub(r'\d{6,}', '', n)                    # 日付・タイムスタンプ等の長い数字列
    n = n.replace("のコピー", "").replace("コピー", "")
    n = _re_cap.sub(r'[\-_ ]?(?:min|scaled|edit|編集|加工|完成|新|new)$', '', n, flags=_re_cap.I)
    n = _re_cap.sub(r'\(\s*\d+\s*\)\s*$', '', n)         # 末尾 (1) (2)
    n = _re_cap.sub(r'[\-_ ]\d{1,3}$', '', n)            # 末尾の連番 _1 -2 等
    n = n.replace("_", "　").replace("＿", "　")
    n = _re_cap.sub(r'[ 　]{2,}', "　", n).strip(" 　_-★☆[]（）()【】｜|・")
    return n or _o.path.splitext(str(nm or ""))[0]


import usage
cats = usage.prefer_cats(cats, creds_path) or cats
names = list(cats.keys())
random.shuffle(names)
for k in cats:
    random.shuffle(cats[k])
picked = []
i = 0
while len(picked) < N_PHOTOS and any(cats[k] for k in names):
    k = names[i % len(names)]
    if cats[k]:
        _img = cats[k].pop()
        _img["cat"] = k
        picked.append(_img)
    i += 1

_fx = [x for x in os.environ.get("FIXED_IDS", "").split(",") if x]
if _fx:
    picked = [drive.files().get(fileId=_i, fields="id,name,mimeType,imageMediaMetadata(width,height),createdTime", supportsAllDrives=True).execute() for _i in _fx]
usage.record(creds_path, picked, "typo")
os.makedirs(OUT_DIR, exist_ok=True)
items = []
for idx, f in enumerate(picked):
    ext = os.path.splitext(f["name"])[1] or ".jpg"
    local = "%d%s" % (idx, ext)
    req = drive.files().get_media(fileId=f["id"])
    buf = io.FileIO(os.path.join(OUT_DIR, local), "wb")
    dl = MediaIoBaseDownload(buf, req)
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.close()
    caption = _clean_caption(f["name"])
    items.append({"src": "typo/" + local, "caption": caption, "story": _story_for(caption),
                  "sub": _sub_for(caption), "disp": _name_disp(caption)})
    print("PHOTO %d:" % idx, f["name"], "(短辺", short_side(f), "px)")

import captions
headline = captions.pick([f.get("cat", "") for f in picked])
print("HEADLINE:", headline, "| cats:", [f.get("cat", "?") for f in picked])

cands = ["bgm.mp3"]
sync_music_from_drive(os.environ.get("GENRE_MUSIC_NORMAL_ID"), NORMAL_DIR)
if os.path.isdir(NORMAL_DIR):
    cands += ["music/normal/" + t for t in os.listdir(NORMAL_DIR)
              if t.lower().endswith((".mp3", ".m4a", ".wav"))]
music = random.choice(cands)
print("MUSIC:", music)

def esc(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')

import json as _pj, os as _po
_po.makedirs("out", exist_ok=True)
_pj.dump({"ids": [f["id"] for f in picked], "caption": headline, "music": music}, open(_po.path.join("out", "picked.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("PICKED ->", "out/picked.json")
music = os.environ.get("FIXED_MUSIC") or music
lines = ["export const typoPhotos = ["]
for it in items:
    lines.append('  { src: "%s", caption: "%s", sub: "%s", story: "%s", disp: "%s" },'
                 % (esc(it["src"]), esc(it["caption"]), esc(it.get("sub", "")),
                    esc(it.get("story", "")), esc(it.get("disp", it["caption"]))))
lines.append("];")
# サンプル番号（0=本番＝バッジ非表示）。見本レンダリング(render_samples)がテンプレ毎に上書きする。
lines.append('export const typoSampleNo = 0;')
# 投稿本文（Instagramキャプション）。ナガグツは料理体系から自動生成、他店は空（従来どおり）。
_post_cap = ""
try:
    if os.environ.get("STORE_ACCOUNT", "").strip().lower() == "nagagutsu":
        import nagagutsu_captions as _ncp
        import stores as _st
        _handle = (_st.get_store("nagagutsu") or {}).get("handle", "")
        _post_cap = _ncp.post_caption([it["caption"] for it in items], handle=_handle)
        print("[POST-CAP] 投稿本文を生成:", _post_cap.replace("\n", " / ")[:80], "...")
except Exception as _e:
    print("[POST-CAP] スキップ:", _e)
# 複数行の投稿本文はTS文字列リテラル用に改行を \n へエスケープ（生の改行は構文エラーになる）。
lines.append('export const typoPostCaption = "%s";' % esc(_post_cap).replace("\n", "\\n"))
lines.append('export const typoHeadline = "%s";' % esc(headline))
# フィード画像に小さく添えるブランドの一言キャッチ（ナガグツのみ／他店は空）。
_catch = ""
try:
    if os.environ.get("STORE_ACCOUNT", "").strip().lower() == "nagagutsu" and items:
        import nagagutsu_captions as _ncc
        _catch = _ncc.catch(items[0].get("caption", ""))
        print("[CATCH] フィード用キャッチ:", _catch)
except Exception as _e:
    print("[CATCH] スキップ:", _e)
lines.append('export const typoCatch = "%s";' % esc(_catch))
lines.append('export const typoMusic = "%s";' % esc(music))


def _music_start_sec(path):
    """音源ファイル名から再生開始秒を読む。対応：
      「1分23秒〜」→83 / 「30秒」→30 / 「2分」→120 / 「1:05」→65 / 「name_30s」→30。
    見つからなければ0（先頭から）。数字を含まない曲名でも安全に0に倒れる。"""
    import re as _re2
    base = _po.path.splitext(_po.path.basename(path or ""))[0]
    m = _re2.search(r'(\d{1,2}):(\d{2})(?::(\d{2}))?', base)   # m:ss / h:mm:ss
    if m:
        a, b, c = int(m.group(1)), int(m.group(2)), m.group(3)
        return a * 3600 + b * 60 + int(c) if c else a * 60 + b
    jm = _re2.search(r'(?:(\d+)\s*分)?\s*(\d+)\s*秒', base)     # 「1分23秒」「23秒」
    if jm and (jm.group(1) or jm.group(2)):
        return (int(jm.group(1)) if jm.group(1) else 0) * 60 + (int(jm.group(2)) if jm.group(2) else 0)
    jm2 = _re2.search(r'(\d+)\s*分', base)                      # 「2分」だけ
    if jm2:
        return int(jm2.group(1)) * 60
    m2 = _re2.search(r'(\d{1,3})\s*(?:s\b|sec)', base, _re2.I)  # 「30s」「30sec」
    if m2:
        return int(m2.group(1))
    return 0


_mstart = _music_start_sec(music)
print("MUSIC_START:", _mstart, "秒（ファイル名から）")
lines.append('export const typoMusicStart = %d;' % _mstart)


def _fetch_store_logo():
    """店舗の「ロゴ」フォルダから横型ロゴを1枚取得し、暗背景で映える生成り透過PNGにして
    public/store_logo.png へ保存。相対パス "store_logo.png" を返す（見つからなければ ""）。
    ・ロゴフォルダ：FOOD_FOLDER 直下の名前に「ロゴ」or「logo」を含むサブフォルダを再帰的に探索。
    ・横型優先：ファイル名に 横/wide/white/白 を含む＞アスペクト比が横長（幅/高≧1.4）＞先頭。
    """
    try:
        def _find_logo_folder(fid, depth=0):
            for f in list_children(fid):
                if f.get("mimeType") == "application/vnd.google-apps.folder":
                    nm = str(f.get("name", ""))
                    if ("ロゴ" in nm) or ("logo" in nm.lower()):
                        return f["id"]
                    if depth < 2:
                        sub = _find_logo_folder(f["id"], depth + 1)
                        if sub:
                            return sub
            return None

        lf = _find_logo_folder(FOOD_FOLDER)
        if not lf:
            print("[LOGO] ロゴフォルダが見つからず（文字ロゴにフォールバック）"); return ""
        imgs = [f for f in list_children(lf) if str(f.get("mimeType", "")).startswith("image/")]
        if not imgs:
            print("[LOGO] ロゴフォルダに画像なし"); return ""

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
            s += min(ar, 6) * 5   # 横長ほど加点
            return s

        pick = sorted(imgs, key=_score, reverse=True)[0]
        print("[LOGO] 採用:", pick.get("name"))
        raw = os.path.join(OUT_DIR, "_logo_raw")
        req = drive.files().get_media(fileId=pick["id"])
        buf = io.FileIO(raw, "wb")
        dl = MediaIoBaseDownload(buf, req)
        done = False
        while not done:
            _, done = dl.next_chunk()
        buf.close()

        # 白背景を透過に→暗ロゴは生成りに整える→余白トリム（setup_logo.py と同じ考え方）。
        try:
            from PIL import Image
        except ImportError:
            print("[LOGO] Pillow未導入のため無加工でコピー")
            import shutil; shutil.copyfile(raw, os.path.join("public", "store_logo.png")); return "store_logo.png"
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
        if avg < 150:   # 暗いロゴは暗背景で見えない→暖かい生成りへ
            CR, CG, CB = 0xF3, 0xEA, 0xD8
            for y in range(H):
                for x in range(W):
                    r, g, b, a = px[x, y]
                    if a > 0:
                        px[x, y] = (CR, CG, CB, a)
            print("[LOGO] 暗ロゴ→生成りに整えました (avg=%.0f)" % avg)
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
        im.save(os.path.join("public", "store_logo.png"))
        try:
            os.remove(raw)
        except Exception:
            pass
        print("[LOGO] public/store_logo.png 保存完了", im.size)
        return "store_logo.png"
    except Exception as e:
        print("[LOGO] 取得スキップ:", e); return ""


_logo = _fetch_store_logo()
lines.append('export const typoLogo = "%s";' % esc(_logo))
_up = music
_updir = os.path.join("public", "music", "uptempo")
sync_music_from_drive(os.environ.get("GENRE_MUSIC_UPTEMPO_ID"), _updir)
if os.path.isdir(_updir):
    _tr = [t for t in os.listdir(_updir) if t.lower().endswith((".mp3", ".m4a", ".wav"))]
    if _tr:
        _up = "music/uptempo/" + random.choice(_tr)
_up = os.environ.get("FIXED_MUSIC") or _up
lines.append('export const typoUptempo = "%s";' % esc(_up))
open(os.path.join("src", "typoData.ts"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("src/typoData.ts 書き出し完了。", len(items), "枚 / music:", music)
