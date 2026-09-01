# -*- coding: utf-8 -*-
"""Instagram ストーリーメンションの「確認→リポスト＋シェアコメント」実行役（多店舗対応）。

GAS の確認アプリで採否を決めた行（シート「メンション」/「メンション_<account>」）を、
店舗ごと（account）に処理する：
- status=approved / auto(保留経過): メンション元メディア取得→シェアコメントを焼く→
  R2/CDNへ上げて各店のIGストーリーに投稿（poster.ig_post）＋お礼DM
- status=reply: お礼DMのみ
処理できたら status=done。トークンが無い店舗はスキップ（安全）。

対象店舗は STORES（account="" は三条＝IG_ACCESS_TOKEN、"gifuyatenjin"＝IG_ACCESS_TOKEN_GIFUYATENJIN）。
環境変数 STORE_ACCOUNT を指定するとその店舗だけ処理。GitHub Actions（gifuya_mentions.yml）から定期実行。
"""
import os
import re
import datetime
import urllib.request

import poster  # up / ig_post / fresh_token_for / _sheets / line_notify / IGB / req / SHEET_ID
from PIL import Image, ImageDraw, ImageFont, ImageFilter

JST = datetime.timezone(datetime.timedelta(hours=9))
UTC = datetime.timezone.utc
SW, SH = 1080, 1920                      # ストーリー解像度
DRY = os.environ.get("DRY") == "1"
HOLD_MIN = float(os.environ.get("IG_AUTO_HOLD_MIN", "10"))   # 保留付き自動：受信からこの分数は投稿を待つ
# 深夜ガード：保留経過の「自動」リポストは、迷惑な時間帯に発火させない（＝この時間帯だけ投稿する）。
# 既定 8:00〜22:00 JST。範囲外（深夜〜早朝）に保留が切れても、翌朝この窓に入るまで待つ。
# ※店主が確認アプリで明示「承認」した分（status=approved）は時間帯に関係なく従来どおり投稿する。
AUTO_POST_FROM = int(os.environ.get("IG_AUTO_POST_FROM", "10"))   # 何時から自動投稿してよいか（JST時）
AUTO_POST_TO = int(os.environ.get("IG_AUTO_POST_TO", "22"))       # 何時まで（この時刻以降は翌朝へ持ち越し）
_HERE = os.path.dirname(os.path.abspath(__file__))
_REPLY = "メンションありがとうございます！ご投稿とても嬉しいです😊 またのお越しをお待ちしています🍶"

# 店舗設定（account="" は三条）。トークン/シート/ロゴ/既定DM文を account で切替。
STORES = [
    {"account": "gifuyatenjin", "name": "ぎふや",
     "logo": os.path.join(_HERE, "assets_gifuya_logo_white.png"), "reply": _REPLY},
    {"account": "", "name": "すさび湯三条",
     "logo": os.path.join(_HERE, "assets_susabiyu_logo_white.png"), "reply": _REPLY},
]
ONLY = (os.environ.get("STORE_ACCOUNT") or "").strip()   # 指定時はその店舗だけ

# フォントは既存の加工モジュールから拝借（無ければ既定にフォールバック）
try:
    import gifuya_design as _gd
    _GOTHIC = _gd._GOTHIC_PATH
except Exception:
    _GOTHIC = None


def _tab(account):
    return "メンション" + ("_" + account if account else "")


def _age_min(iso):
    try:
        s = str(iso).replace("Z", "+00:00")
        dt = datetime.datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return (datetime.datetime.now(UTC) - dt).total_seconds() / 60.0
    except Exception:
        return 1e9


def _is_image(path):
    try:
        Image.open(path).verify()
        return True
    except Exception:
        return False


def _font(path, size):
    try:
        if path:
            return ImageFont.truetype(path, size)
    except Exception:
        pass
    return ImageFont.load_default()


def _cover(im, w, h):
    im = im.convert("RGB")
    iw, ih = im.size
    s = max(w / iw, h / ih)
    nw, nh = int(iw * s + 0.5), int(ih * s + 0.5)
    im = im.resize((nw, nh), Image.LANCZOS)
    l, t = (nw - w) // 2, (nh - h) // 2
    return im.crop((l, t, l + w, t + h))


_EMOJI_RE = re.compile("[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002B00-\U00002BFF\U0000FE00-\U0000FE0F\U0000200D]+")


def _strip_emoji(s):
    s = _EMOJI_RE.sub("", s or "")
    s = re.sub(r"[ 　]{2,}", " ", s)
    s = re.sub(r"\n{2,}", "\n", s)
    return s.strip()


def _format_comment(s):
    """絵文字を外し、ハッシュタグは本文と分けて別段落（下）にまとめる。"""
    s = _strip_emoji(s)
    tags = re.findall(r"#\S+", s)
    body = re.sub(r"#\S+", "", s)
    body = re.sub(r"[ 　]{2,}", " ", body).strip(" 　\n")
    if tags:
        return (body + "\n\n" if body else "") + " ".join(tags)
    return body


def _wrap(draw, text, font, maxw):
    lines, cur = [], ""
    for ch in str(text):
        if ch == "\n":
            lines.append(cur); cur = ""; continue
        t = cur + ch
        if draw.textlength(t, font=font) <= maxw:
            cur = t
        else:
            lines.append(cur); cur = ch
    if cur:
        lines.append(cur)
    return lines[:6]


def render_story(src_path, comment, out_path, logo_path=""):
    """メンション元画像の上に、白ロゴ＋下部の帯＋シェアコメントを焼いて 1080x1920 を作る。"""
    base = _cover(Image.open(src_path), SW, SH).convert("RGBA")
    ov = Image.new("L", (SW, SH), 0)
    d = ImageDraw.Draw(ov)
    for y in range(SH - 620, SH):
        t = (y - (SH - 620)) / 620
        d.line([(0, y), (SW, y)], fill=int(200 * t))
    ov = ov.filter(ImageFilter.GaussianBlur(12))
    base = Image.composite(Image.new("RGB", (SW, SH), (0, 0, 0)).convert("RGBA"), base, ov)
    draw = ImageDraw.Draw(base)
    if logo_path and os.path.exists(logo_path):
        lg = Image.open(logo_path).convert("RGBA")
        lw = 340
        lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
        base.alpha_composite(lg, (44, 56))
    comment = _format_comment(comment)   # 絵文字除去＋#別段落
    if comment:
        f = _font(_GOTHIC, 60)
        lines = _wrap(draw, comment, f, SW - 130)
        lh = int(60 * 1.34)
        y = SH - 120 - lh * len(lines)
        for ln in lines:
            for dx, dy in ((3, 3), (2, 3)):
                draw.text((65 + dx, y + dy), ln, font=f, fill=(0, 0, 0))
            draw.text((65, y), ln, font=f, fill=(255, 255, 255))
            y += lh
    base.convert("RGB").save(out_path, quality=92)
    return out_path


def _download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "susabiyu-mention/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
        f.write(r.read())
    return path


def _ig_uid(token):
    me = poster.req.get(poster.IGB + "/me",
                        params={"fields": "user_id,username", "access_token": token}, timeout=30).json()
    if me.get("error"):
        return "", me
    return (me.get("user_id") or me.get("id") or ""), me


def _send_dm(token, uid, recipient_id, text):
    """24時間以内のメンションへ定型お礼DM。instagram_manage_messages 権限が要る。"""
    if not (uid and recipient_id and text):
        return False
    try:
        r = poster.req.post(poster.IGB + "/" + str(uid) + "/messages",
                            params={"access_token": token},
                            json={"recipient": {"id": str(recipient_id)},
                                  "messaging_type": "RESPONSE",
                                  "message": {"text": text}}, timeout=30).json()
        if r.get("error"):
            print("[DM] ERROR:", r["error"]); return False
        print("[DM] sent ->", recipient_id); return True
    except Exception as e:
        print("[DM] 例外:", e); return False


def _read_rows(sh, tab):
    r = sh.values().get(spreadsheetId=poster.SHEET_ID, range=tab + "!A2:J").execute()
    return r.get("values", [])


def _set_status(sh, tab, row_idx, status):
    rng = "%s!H%d:J%d" % (tab, row_idx + 2, row_idx + 2)   # H列=status, J列=更新
    now = datetime.datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    sh.values().update(spreadsheetId=poster.SHEET_ID, range=rng,
                       valueInputOption="RAW", body={"values": [[status, "", now]]}).execute()


def _process(store, sh):
    acct = store["account"]; tab = _tab(acct); name = store["name"]
    tok_key = acct or "sanjo"
    try:
        token = (poster.fresh_token_for(acct) or "").strip()
    except Exception as e:
        print("[%s][TOKEN] 取得失敗:" % name, e); token = ""
    if not token:
        print("[%s][SKIP] トークン未設定。" % name); return 0
    uid, me = _ig_uid(token)
    if not uid:
        print("[%s][SKIP] /me失敗:" % name, me.get("error")); return 0
    print("[%s] IG uid=%s (@%s)  ← IG_ACCOUNT_MAP用" % (name, uid, me.get("username", "")))
    try:
        rows = _read_rows(sh, tab)
    except Exception as e:
        print("[%s][SKIP] シート %s 読めません: %s" % (name, tab, e)); return 0
    reply_def = store["reply"]; logo = store["logo"]; done = 0
    for i, row in enumerate(rows):
        row = (row + [""] * 10)[:10]
        mid, _dt, _acct, sender, _sname, murl, mtype, status, comment, _u = row
        status = (status or "").strip()
        if status not in ("approved", "auto", "reply"):
            continue
        if status == "auto":                          # 保留付き自動：HOLD_MIN未満は待つ
            age = _age_min(_dt)
            if age < HOLD_MIN:
                print("[%s][ROW %d] auto保留中（%.1f/%.0f分）" % (name, i, age, HOLD_MIN)); continue
            # 深夜ガード：保留が切れても、迷惑な時間帯(既定22:00〜翌8:00 JST)は自動投稿しない＝朝まで待つ。
            # （店主が明示「承認」した status=approved はこのガードを通らず従来どおり即投稿）
            nowh = datetime.datetime.now(JST).hour
            if not (AUTO_POST_FROM <= nowh < AUTO_POST_TO):
                print("[%s][ROW %d] auto深夜待機（%d時・%d-%d時のみ自動投稿）" % (name, i, nowh, AUTO_POST_FROM, AUTO_POST_TO)); continue
        comment = (comment or "").strip()
        print("[%s][ROW %d] status=%s sender=%s" % (name, i, status, sender))
        try:
            if status == "reply":
                ok = DRY or _send_dm(token, uid, sender, comment or reply_def)
                if ok and not DRY: _set_status(sh, tab, i, "done")
                elif DRY: print("  [DRY] DM:", comment or reply_def)
                done += 1 if ok else 0; continue

            if not murl:
                print("  メディアURLなし→skip"); continue
            tmp_in = "/tmp/m_%s_%d.bin" % (tok_key, i)
            _download(murl, tmp_in)
            is_video = not _is_image(tmp_in)
            if is_video:                              # 動画は文字焼き未対応→そのままリポスト＋文面はDM
                post_path = "/tmp/m_%s_%d.mp4" % (tok_key, i)
                os.replace(tmp_in, post_path)
                pub_url = post_path if DRY else poster.up(post_path, cdn=False)
            else:
                post_path = "/tmp/m_%s_%d.jpg" % (tok_key, i)
                render_story(tmp_in, comment, post_path, logo)
                pub_url = post_path if DRY else poster.up(post_path, cdn=False)
            if DRY:
                print("  [DRY] post story:", post_path, "| comment:", comment); pid = "DRY"
            else:
                if not pub_url:
                    print("  ホスト失敗→次回"); continue
                pid = poster.ig_post(token, pub_url, is_video)
                if not pid:
                    print("  投稿失敗→次回"); continue
                _send_dm(token, uid, sender, (comment if is_video else "") or reply_def)
            if not DRY:
                _set_status(sh, tab, i, "done")
                try: poster.line_notify("%s: メンションを店ストーリーにリポスト（%s）" % (name, pid))
                except Exception: pass
            done += 1
        except Exception as e:
            print("  例外→次回:", e); continue
    print("[%s] 処理 %d件" % (name, done))
    return done


def main():
    sh = poster._sheets()
    if sh is None:
        print("[SKIP] Sheets未接続（creds.json/GOOGLE_CREDS_B64なし）。"); return
    total = 0
    for store in STORES:
        if ONLY and store["account"] != ONLY:
            continue
        total += _process(store, sh)
    print("[MENTION] 全店 合計 %d件（DRY=%s）" % (total, DRY))


if __name__ == "__main__":
    main()
