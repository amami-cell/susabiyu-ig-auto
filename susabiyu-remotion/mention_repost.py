# -*- coding: utf-8 -*-
"""ぎふや：Instagram ストーリーメンションの「確認→リポスト＋シェアコメント」実行役。

GAS の確認アプリで採否を決めた行（シート「メンション_<account>」）を読み、
- status=approved（店ストーリーに追加）: メンション元メディアを取得→シェアコメントを焼く→
  R2/CDNへ上げてぎふやのストーリーに投稿（poster.ig_post）＋お礼DM
- status=reply（DM返信のみ）: お礼DMだけ送る
処理できたら status=done にする。トークンが無ければ何もしない（安全）。

前提の外部要素は既存のストーリー投稿と同じ（IG_ACCESS_TOKEN_GIFUYATENJIN / creds.json / R2_*）。
GitHub Actions（gifuya_mentions.yml）から数分おきに実行される想定。
"""
import os
import io
import re
import json
import datetime
import urllib.request

import poster  # up / ig_post / fresh_token_for / _sheets / line_notify / IGB / req / SHEET_ID
from PIL import Image, ImageDraw, ImageFont, ImageFilter

JST = datetime.timezone(datetime.timedelta(hours=9))
UTC = datetime.timezone.utc
ACCOUNT = "gifuyatenjin"
TAB = "メンション_" + ACCOUNT
SW, SH = 1080, 1920                      # ストーリー解像度
DRY = os.environ.get("DRY") == "1"
HOLD_MIN = float(os.environ.get("IG_AUTO_HOLD_MIN", "10"))   # 保留付き自動：受信からこの分数は投稿を待つ


def _age_min(iso):
    """ISO日時から経過分。解釈できなければ大きな値（＝保留を過ぎたとみなす）。"""
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

# フォント/ロゴは既存の加工モジュールから拝借（無ければゴシックにフォールバック）
try:
    import gifuya_design as _gd
    _SERIF = _gd._SERIF_PATH
    _GOTHIC = _gd._GOTHIC_PATH
    _LOGO = _gd.LOGO_WHITE
except Exception:
    _SERIF = _GOTHIC = None
    _LOGO = ""


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
    """画像に焼く文からは絵文字を外す（サーバフォントに絵文字が無く□になるため）。DMでは残す。"""
    s = _EMOJI_RE.sub("", s or "")
    s = re.sub(r"[ 　]{2,}", " ", s)
    s = re.sub(r"\n{2,}", "\n", s)
    return s.strip()


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


def render_story(src_path, comment, out_path):
    """メンション元画像の上に、白ロゴ＋下部の帯＋シェアコメントを焼いて 1080x1920 を作る。"""
    base = _cover(Image.open(src_path), SW, SH).convert("RGBA")
    # 下部の暗い帯（コメント可読性）
    ov = Image.new("L", (SW, SH), 0)
    d = ImageDraw.Draw(ov)
    for y in range(SH - 620, SH):
        t = (y - (SH - 620)) / 620
        d.line([(0, y), (SW, y)], fill=int(200 * t))
    ov = ov.filter(ImageFilter.GaussianBlur(12))
    base = Image.composite(Image.new("RGB", (SW, SH), (0, 0, 0)).convert("RGBA"), base, ov)
    draw = ImageDraw.Draw(base)
    # 白ロゴ（左上）
    if _LOGO and os.path.exists(_LOGO):
        lg = Image.open(_LOGO).convert("RGBA")
        lw = 260
        lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
        base.alpha_composite(lg, (44, 60))
    # シェアコメント（下部）※画像には絵文字を焼かない（□対策）
    comment = _strip_emoji((comment or "").strip())
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
    req = urllib.request.Request(url, headers={"User-Agent": "gifuya-mention/1.0"})
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


def _read_rows(sh):
    r = sh.values().get(spreadsheetId=poster.SHEET_ID, range=TAB + "!A2:J").execute()
    return r.get("values", [])


def _set_status(sh, row_idx, status):
    # row_idx は 0起点（A2 が 0）。H列=status, J列=更新
    rng = "%s!H%d:J%d" % (TAB, row_idx + 2, row_idx + 2)
    now = datetime.datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    sh.values().update(spreadsheetId=poster.SHEET_ID, range=rng,
                       valueInputOption="RAW",
                       body={"values": [[status, "", now]]}).execute()


DEFAULT_REPLY = "メンションありがとうございます！ご投稿とても嬉しいです😊 またのお越しをお待ちしています🍶"


def main():
    token = ""
    try:
        token = (poster.fresh_token_for(ACCOUNT) or "").strip()
    except Exception as e:
        print("[TOKEN] 取得失敗:", e)
    if not token:
        print("[SKIP] トークン未設定。何もしません（安全）。"); return
    sh = poster._sheets()
    if sh is None:
        print("[SKIP] Sheets未接続（creds.json/GOOGLE_CREDS_B64なし）。"); return
    uid, me = _ig_uid(token)
    if not uid:
        print("[SKIP] /me失敗（トークン失効？）:", me.get("error")); return

    rows = _read_rows(sh)
    done = 0
    for i, row in enumerate(rows):
        row = (row + [""] * 10)[:10]
        mid, _dt, _acct, sender, _sname, murl, mtype, status, comment, _u = row
        status = (status or "").strip()
        if status not in ("approved", "auto", "reply"):
            continue
        # 保留付き自動：受信からHOLD_MIN未満は投稿を待つ（その間にアプリで取消/編集/即投稿できる）
        if status == "auto":
            age = _age_min(_dt)
            if age < HOLD_MIN:
                print("[ROW %d] auto保留中（%.1f/%.0f分）→ 次回" % (i, age, HOLD_MIN)); continue
        comment = (comment or "").strip()
        print("[ROW %d] status=%s sender=%s" % (i, status, sender))
        try:
            if status == "reply":
                ok = DRY or _send_dm(token, uid, sender, comment or DEFAULT_REPLY)
                if ok and not DRY:
                    _set_status(sh, i, "done")
                elif DRY:
                    print("  [DRY] would DM:", comment or DEFAULT_REPLY)
                done += 1 if ok else 0
                continue

            # approved / auto(保留経過) ＝ 店ストーリーに追加（リポスト＋シェアコメント）
            if not murl:
                print("  メディアURLなし→skip"); continue
            tmp_in = "/tmp/mention_%d.bin" % i
            _download(murl, tmp_in)
            is_video = not _is_image(tmp_in)
            if is_video:
                # 動画は文字焼き未対応→そのままリポスト、シェアコメントはDMで補う
                post_path = "/tmp/mention_%d.mp4" % i
                os.replace(tmp_in, post_path)
                pub_url = post_path if DRY else poster.up(post_path, cdn=False)
            else:
                post_path = "/tmp/mention_story_%d.jpg" % i
                render_story(tmp_in, comment, post_path)
                pub_url = post_path if DRY else poster.up(post_path, cdn=False)
            if DRY:
                print("  [DRY] would post story from:", post_path, "| comment:", comment)
                _send_ok = True
                pid = "DRY"
            else:
                if not pub_url:
                    print("  ホスト失敗→skip（次回再試行）"); continue
                pid = poster.ig_post(token, pub_url, is_video)
                if not pid:
                    print("  投稿失敗→status据え置き（次回再試行）"); continue
                # お礼DMも送る（動画は文面を含める）
                _send_dm(token, uid, sender, (comment if is_video else "") or DEFAULT_REPLY)
            if not DRY:
                _set_status(sh, i, "done")
                try: poster.line_notify("ぎふや: メンションを店ストーリーにリポストしました（%s）" % pid)
                except Exception: pass
            done += 1
        except Exception as e:
            print("  例外→status据え置き:", e)
            continue
    print("[MENTION] 処理 %d件（DRY=%s）" % (done, DRY))


if __name__ == "__main__":
    main()
