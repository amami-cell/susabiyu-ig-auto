# -*- coding: utf-8 -*-
"""
こまつ原「写真付き・1ファイル」料理確認表PDFを生成する。

- サービスアカウント(drive.readonly)で Drive の「画像データ（大衆食堂 こまつ原）」配下を
  再帰的に走査し、各画像の「親フォルダ名＝カテゴリ」「ファイル名＝料理名」で収集する。
- カテゴリは親フォルダの作成時刻の昇順（オーナーが作った順）で並べる。
- PIL で A4 グリッド（写真＋料理名キャプション）を描画し、複数ページの1PDFに保存する。

使い方:  python komatsubara_menu_pdf.py creds.json [root_folder_id] [out.pdf]
既定の root_folder_id は こまつ原 本番フォルダ 1HyHZs6VWjBoyFQWlJhxu1_l6P4OATOWn。
"""
import os, io, sys, json, textwrap

ROOT_DEFAULT = "1HyHZs6VWjBoyFQWlJhxu1_l6P4OATOWn"  # 画像データ（大衆食堂 こまつ原）

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
except ImportError:
    print("NG: google ライブラリ未インストール")
    raise SystemExit(1)
from PIL import Image, ImageDraw, ImageFont

creds_path = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].strip() else "creds.json"
root_id = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].strip() else ROOT_DEFAULT
out_path = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3].strip() else "out/komatsubara_menu.pdf"
os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

scopes = ["https://www.googleapis.com/auth/drive.readonly"]
creds = service_account.Credentials.from_service_account_file(creds_path, scopes=scopes)
print("[SA]", getattr(creds, "service_account_email", "?"))
drive = build("drive", "v3", credentials=creds)

FOLDER = "application/vnd.google-apps.folder"


def _ls(parent):
    out, page = [], None
    while True:
        res = drive.files().list(
            q="'%s' in parents and trashed=false" % parent,
            fields="nextPageToken, files(id,name,mimeType,createdTime)",
            pageSize=200, pageToken=page,
            supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
        out += res.get("files", [])
        page = res.get("nextPageToken")
        if not page:
            break
    return out


# 再帰走査：画像ファイルを {category, created(親の作成時刻), name, id} で集める
cats = {}  # catname -> {"created":..., "items":[{name,id}]}


def walk(folder_id, cat_name=None, cat_created=None):
    for f in _ls(folder_id):
        if f["mimeType"] == FOLDER:
            walk(f["id"], f["name"], f.get("createdTime", ""))
        elif f["mimeType"].startswith("image/"):
            c = cat_name or "未分類"
            d = cats.setdefault(c, {"created": cat_created or "", "items": []})
            nm = f["name"].rsplit(".", 1)[0]
            d["items"].append({"name": nm, "id": f["id"]})


walk(root_id)
# 並び：カテゴリ＝親フォルダ作成時刻昇順、料理＝名前昇順
ordered = sorted(cats.items(), key=lambda kv: (kv[1]["created"], kv[0]))
for _, d in ordered:
    d["items"].sort(key=lambda x: x["name"])
total = sum(len(d["items"]) for _, d in ordered)
print("[COUNT] categories=%d dishes=%d" % (len(ordered), total))
for name, d in ordered:
    print("  %2d  %s" % (len(d["items"]), name))
if total == 0:
    print("NG: 画像が1枚も見つかりません。サービスアカウントにフォルダが共有されているか確認してください。")
    raise SystemExit(2)


def dl(file_id):
    buf = io.BytesIO()
    req = drive.files().get_media(fileId=file_id, supportsAllDrives=True)
    dn = MediaIoBaseDownload(buf, req)
    done = False
    while not done:
        _, done = dn.next_chunk()
    buf.seek(0)
    im = Image.open(buf).convert("RGB")
    return im


def cover(im, size):
    w, h = im.size
    s = max(size / w, size / h)
    im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    w, h = im.size
    l, t = (w - size) // 2, (h - size) // 2
    return im.crop((l, t, l + size, t + size))


# ---- フォント ----
def _font(paths, sz):
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, sz)
            except Exception:
                pass
    return ImageFont.load_default()


REG = ["/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
       "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Regular.otf",
       "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"]
BLD = ["/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
       "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Bold.otf",
       "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc"]

# ---- レイアウト（A4 @150dpi）----
W, H = 1240, 1754
MT, MB, ML, MR = 70, 70, 64, 64
COLS = 4
GAP = 22
CELL = (W - ML - MR - GAP * (COLS - 1)) // COLS   # サムネ一辺
CAP_H = 58                                        # キャプション高さ(2行)
ROW_H = CELL + CAP_H + 18
CATBAR_H = 52

ACCENT = (156, 42, 42)
INK = (36, 28, 23)
SUB = (120, 110, 100)
BG = (255, 253, 248)
LINE = (230, 220, 201)
CARD = (255, 255, 255)

f_name = _font(BLD, 22)
f_cap = _font(REG, 20)
f_h1 = _font(BLD, 44)
f_h2 = _font(BLD, 30)
f_small = _font(REG, 19)
f_cat = _font(BLD, 27)
f_catn = _font(REG, 18)

pages = []
page = None
draw = None
y = 0


def new_page(first=False):
    global page, draw, y
    page = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(page)
    pages.append(page)
    if first:
        draw.text((ML, 40), "大衆食堂 こまつ原 ・ 梅田", font=f_catn, fill=ACCENT)
        draw.text((ML, 66), "料理 確認表（写真付き）", font=f_h1, fill=INK)
        draw.text((ML, 126),
                  "全 %d カテゴリ / %d 品　｜　料理名はGoogleドライブのファイル名そのまま（確認・修正用）"
                  % (len(ordered), total), font=f_small, fill=SUB)
        draw.line((ML, 160, W - MR, 160), fill=ACCENT, width=3)
        y = 182
    else:
        y = MT


def catbar(name, n, cont=False):
    global y
    if y + CATBAR_H + ROW_H > H - MB:   # 見出しの直後に1行も入らないなら改ページ
        new_page()
    draw.rectangle((ML, y, ML + 6, y + CATBAR_H), fill=ACCENT)
    draw.rectangle((ML + 6, y, W - MR, y + CATBAR_H), fill=(243, 236, 224))
    label = name + ("（続き）" if cont else "")
    draw.text((ML + 22, y + 10), label, font=f_cat, fill=INK)
    bb = draw.textbbox((0, 0), label, font=f_cat)
    draw.text((ML + 22 + (bb[2] - bb[0]) + 14, y + 20), "%d品" % n, font=f_catn, fill=SUB)
    y += CATBAR_H + 14


def wrap_center(cx, top, text):
    # 2行まで、はみ出しは…
    lines = textwrap.wrap(text, width=9) or [text]
    lines = lines[:2]
    if len("".join(textwrap.wrap(text, width=9))) < len(text) and len(lines) == 2:
        lines[1] = lines[1][:8] + "…"
    ty = top
    for ln in lines:
        bb = draw.textbbox((0, 0), ln, font=f_name)
        draw.text((cx - (bb[2] - bb[0]) / 2, ty), ln, font=f_name, fill=INK)
        ty += 26


new_page(first=True)
done = 0
for name, d in ordered:
    items = d["items"]
    catbar(name, len(items))
    col = 0
    first_row_after_bar = True
    i = 0
    while i < len(items):
        if col == 0:
            if y + ROW_H > H - MB:
                new_page()
                catbar(name, len(items), cont=True)
                first_row_after_bar = True
        it = items[i]
        x = ML + col * (CELL + GAP)
        # カード枠
        draw.rectangle((x, y, x + CELL, y + CELL), fill=CARD, outline=LINE, width=1)
        try:
            im = cover(dl(it["id"]), CELL - 2)
            page.paste(im, (x + 1, y + 1))
        except Exception as e:
            draw.text((x + CELL / 2 - 16, y + CELL / 2 - 10), "写真?", font=f_cap, fill=(180, 165, 150))
            print("  WARN dl失敗 %s: %s" % (it["name"], e))
        wrap_center(x + CELL / 2, y + CELL + 10, it["name"])
        done += 1
        col += 1
        i += 1
        if col >= COLS:
            col = 0
            y += ROW_H
            first_row_after_bar = False
    if col != 0:                     # 端数行を送る
        y += ROW_H
    y += 10                          # カテゴリ間の余白

# フッター（最終ページ）
dr = ImageDraw.Draw(pages[-1])
dr.text((ML, H - 44), "データ元：Googleドライブ「画像データ（大衆食堂 こまつ原）」／生成：Instagram運用アシスタント",
        font=_font(REG, 15), fill=SUB)

print("[RENDER] pages=%d dishes_drawn=%d" % (len(pages), done))
pages[0].save(out_path, "PDF", save_all=True, append_images=pages[1:], resolution=150.0)
print("[OK] wrote", out_path, os.path.getsize(out_path), "bytes")
