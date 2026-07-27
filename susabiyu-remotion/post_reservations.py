# -*- coding: utf-8 -*-
"""予約投稿の自動実行エンジン。

確認画面(PWA)で「日時を決めて予約」した投稿を、その時刻になったら自動でInstagramに
本投稿する。既存の自動スロット投稿(post_approved.py / 承認待ちタブ)には一切触れず、
専用タブ「予約投稿」だけを見る＝本番の投稿パイプラインへの影響ゼロ。

安全設計：
- 既定は DRY-RUN（実際には投稿しない。何を投稿するかログするだけ）。
  実投稿は env RESV_LIVE=1 か 引数 live のときだけ。
- 二重投稿防止：投稿直前に status を "posting" に更新して確保→成功で "posted"。
- 取りこぼし救済：when<=now かつ GRACE_H 時間以内のみ投稿。それより古い予約は
  "expired" にして無言の遅延投稿を防ぐ。

予約投稿タブ（列 A〜I）:
  A token / B when("%Y-%m-%d %H:%M" JST) / C kind(feed|reel) / D media_url(公開URL or ローカルパス)
  E caption / F hashtags(スペース区切り "#a #b") / G status(scheduled|posting|posted|failed|canceled|expired)
  H created_at / I note(posted_at や失敗理由) / J account(投稿先アカウント。空=既定/三条。例:gifuyatenjin)
"""
import os, sys, datetime
import poster  # 既存の _sheets/_ensure_tab/fresh_token/up/ig_post_media/line_notify を再利用

RESV_TAB = "予約投稿"
GRACE_H = 24            # when がこの時間より過去なら投稿せず expired
JST = poster.JST

# ---- 純粋ロジック（ネット/シート不要・selftest対象） ----
def parse_when(s):
    """'YYYY-MM-DD HH:MM'(JST) を aware datetime に。失敗で None。"""
    s = (s or "").strip()[:16]
    for fmt in ("%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M"):
        try:
            return datetime.datetime.strptime(s, fmt).replace(tzinfo=JST)
        except Exception:
            pass
    return None

def classify(when_dt, now, grace_h=GRACE_H):
    """予約時刻と現在から状態を判定: 'due'（投稿すべき）/ 'future'（まだ）/ 'expired'（古すぎ）/ 'bad'。"""
    if when_dt is None:
        return "bad"
    if when_dt > now:
        return "future"
    if when_dt < now - datetime.timedelta(hours=grace_h):
        return "expired"
    return "due"

def build_caption(caption, hashtags):
    """本文＋ハッシュタグを1つのキャプションに。"""
    cap = (caption or "").rstrip()
    tags = (hashtags or "").strip()
    if tags:
        return (cap + "\n\n" + tags).strip() if cap else tags
    return cap

def _on_cdn(url):
    low = (url or "").lower()
    return ("jsdelivr.net" in low) or (".r2.dev" in low) or ("cloudflarestorage" in low) or ("r2.cloudflarestorage" in low)

def resolve_media(media, kind):
    """IGが確実に取得できる公開URLに解決する。
       画像(feed)で非CDNのhttp(例:github.io)は、DL→jsDelivr/R2へ再ホスト（IG取得失敗を防ぐ）。
       ローカルパスも再ホスト。動画(reel)は既にCDN配信なのでそのまま。失敗時は元URL。"""
    if not media:
        return ""
    if media.startswith("http"):
        if kind == "feed" and not _on_cdn(media):
            try:
                import tempfile
                r = poster.req.get(media, timeout=30)
                if r.status_code == 200 and r.content:
                    ext = os.path.splitext(media.split("?")[0])[1] or ".jpg"
                    tf = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
                    tf.write(r.content); tf.close()
                    return poster.up(tf.name, cdn=True) or media
            except Exception as e:
                print("  [WARN] 再ホスト失敗→元URL使用:", e)
            return media
        return media
    if os.path.exists(media):
        return poster.up(media, cdn=True) or poster.up(media)
    return media

# ---- シート入出力 ----
def _read_rows(sh):
    r = sh.values().get(spreadsheetId=poster.SHEET_ID, range=RESV_TAB + "!A2:J").execute()
    return r.get("values", [])

def _set(sh, row_idx, col, value):
    """1-based row_idx（データ行、ヘッダー=1なので実シート行= idx+1）。col='G'等。"""
    rng = "%s!%s%d" % (RESV_TAB, col, row_idx + 1)
    sh.values().update(spreadsheetId=poster.SHEET_ID, range=rng,
                       valueInputOption="RAW", body={"values": [[value]]}).execute()

def _now_str(now):
    return now.strftime("%Y-%m-%d %H:%M")

def run(live):
    sh = poster._sheets()
    if not sh:
        print("NG: creds/Sheets が使えません（GOOGLE_CREDS_B64 か creds.json を確認）"); return 1
    created = poster._ensure_tab(sh, RESV_TAB)
    if created:
        sh.values().update(spreadsheetId=poster.SHEET_ID, range=RESV_TAB + "!A1:I1",
            valueInputOption="RAW", body={"values": [[
                "token", "when", "kind", "media_url", "caption", "hashtags",
                "status", "created_at", "note"]]}).execute()
        print("[RESV] 予約投稿タブを作成しました（まだ予約はありません）"); return 0

    rows = _read_rows(sh)
    now = datetime.datetime.now(JST)
    print("[RESV] now=%s / rows=%d / mode=%s" % (_now_str(now), len(rows), "LIVE" if live else "DRY-RUN"))
    tok_cache = {}   # account -> token（アカウント別に一度だけ解決してキャッシュ）
    def token_of(account):
        acc = (account or "").strip()
        if acc not in tok_cache:
            tok_cache[acc] = poster.fresh_token_for(acc) if live else ""
        return tok_cache[acc]

    posted = 0
    for i, row in enumerate(rows):   # i は0-based（データ行）
        row = (row + [""] * 10)[:10]
        token_id, when_s, kind, media, caption, tags, status, created, note, account = row
        status = (status or "scheduled").strip()
        if status != "scheduled":
            continue
        state = classify(parse_when(when_s), now)
        if state == "future":
            continue
        if state == "bad":
            print("  [SKIP] 日時が不正 token=%s when=%r" % (token_id, when_s)); continue
        if state == "expired":
            print("  [EXPIRED] %s (%s) 予定を%dh超過→投稿せず" % (token_id, when_s, GRACE_H))
            if live:
                _set(sh, i + 1, "G", "expired"); _set(sh, i + 1, "I", "期限切れ " + _now_str(now))
            continue

        # due
        kind = "reel" if (kind or "").strip().lower() == "reel" else "feed"
        cap = build_caption(caption, tags)
        acc = (account or "").strip()
        acc_label = acc or "既定(三条)"
        if not live:
            print("  [DRY] 投稿する→ token=%s account=%s kind=%s when=%s media=%s" % (token_id, acc_label, kind, when_s, media))
            print("        caption=%r" % cap[:80]); posted += 1; continue

        # 投稿先アカウントのトークンを解決（アカウント別）
        atoken = token_of(acc)
        if not atoken:
            _set(sh, i + 1, "G", "failed"); _set(sh, i + 1, "I", "アカウント %s のトークン無効/未設定" % acc_label)
            print("  [FAIL] トークン無効/未設定 account=%s token=%s" % (acc_label, token_id)); continue

        # 二重投稿防止：先に posting で確保
        _set(sh, i + 1, "G", "posting"); _set(sh, i + 1, "I", "投稿中 " + _now_str(now))
        url = resolve_media(media, kind)
        if not url:
            _set(sh, i + 1, "G", "failed"); _set(sh, i + 1, "I", "メディアURL取得失敗")
            print("  [FAIL] media URL なし token=%s" % token_id); continue
        try:
            pid = poster.ig_post_media(atoken, url, kind, cap)
        except Exception as e:
            pid = ""; print("  [FAIL] 例外:", e)
        if pid:
            _set(sh, i + 1, "G", "posted"); _set(sh, i + 1, "I", "投稿済 %s id=%s" % (_now_str(now), pid))
            poster.line_notify("[予約投稿] %s を投稿しました\n%s" % ("リール" if kind == "reel" else "フィード", caption or ""))
            print("  [POSTED] token=%s id=%s" % (token_id, pid)); posted += 1
        else:
            _set(sh, i + 1, "G", "failed"); _set(sh, i + 1, "I", "投稿失敗 " + _now_str(now))
            print("  [FAIL] 投稿失敗 token=%s" % token_id)

    print("[RESV] 完了：%s %d 件" % ("投稿" if live else "対象(DRY)", posted))
    return 0

# ---- selftest（ネット/シート不要でロジック検証） ----
def selftest():
    now = datetime.datetime(2026, 7, 25, 18, 0, tzinfo=JST)
    assert parse_when("2026-07-25 18:00") == now
    assert parse_when("2026/07/25 18:00") == now
    assert parse_when("bad") is None
    assert classify(parse_when("2026-07-25 17:30"), now) == "due"
    assert classify(parse_when("2026-07-25 18:00"), now) == "due"
    assert classify(parse_when("2026-07-25 18:30"), now) == "future"
    assert classify(parse_when("2026-07-24 10:00"), now) == "expired"  # 32h前
    assert classify(parse_when("x"), now) == "bad"
    assert build_caption("本文", "#a #b") == "本文\n\n#a #b"
    assert build_caption("", "#a") == "#a"
    assert build_caption("本文", "") == "本文"
    assert _on_cdn("https://cdn.jsdelivr.net/gh/x/y@z/a.jpg") is True
    assert _on_cdn("https://amami-cell.github.io/susabiyu-media/app/sample/feed1.jpg") is False
    assert resolve_media("", "feed") == ""
    assert resolve_media("https://cdn.jsdelivr.net/gh/x/y@z/a.mp4", "reel") == "https://cdn.jsdelivr.net/gh/x/y@z/a.mp4"
    print("selftest OK")

if __name__ == "__main__":
    arg = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    if arg == "--selftest":
        selftest(); sys.exit(0)
    # 引数: [creds.json] [live|dry]。live判定は 引数live か env RESV_LIVE=1。
    mode = ""
    for a in sys.argv[1:]:
        if a in ("live", "dry"):
            mode = a
    live = (mode == "live") or (os.environ.get("RESV_LIVE", "").strip() in ("1", "true", "yes"))
    sys.exit(run(live))
