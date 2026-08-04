# -*- coding: utf-8 -*-
"""ぎふや福岡天神 ストーリー自動投稿（Googleスプレッドシート/GAS 不要の自己完結版）。

採用中のぎふやストーリー動画（既にCDN公開済み）を、日付ベースのローテーションで
1日3回（11:00 / 17:00 / 20:00 JST）Instagramストーリーに自動投稿する。

必要な外部要素は **IG_ACCESS_TOKEN_GIFUYATENJIN（Metaで発行するアクセストークン）だけ**。
未設定なら何もしない（安全）。トークンを登録した瞬間から 11/17/20 の投稿が始まる。
"""
import os
import sys
import datetime
import poster

JST = datetime.timezone(datetime.timedelta(hours=9))

# CDN上のぎふやメディア置き場（deploy_pwa で susabiyu-media/app/gifuya へ配信済み）。
# jsDelivr はIGサーバが確実に取得できる公開CDN。
MEDIA_BASE = (os.environ.get("GIFUYA_MEDIA_BASE") or
              "https://cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@main/app/gifuya").rstrip("/")

# ローテーション対象＝採用中のぎふやストーリー動画（見本ギャラリーで残した10本）。
STORIES = [
    "dv_01.mp4", "dv_03.mp4", "dv_04.mp4", "dv_05.mp4", "dv_07.mp4",
    "dv_08.mp4", "dv_09.mp4", "dv_12.mp4", "dv_14.mp4", "dv_15.mp4",
]
SLOT_HOURS = [11, 17, 20]           # 1日3回の枠（JST）
EPOCH = datetime.date(2026, 1, 1)   # ローテーション基準日
ACCOUNT = "gifuyatenjin"            # AcctTokens / IG_ACCESS_TOKEN_<ACCOUNT> と一致


def _token():
    """三条と同じ自動延命：スプレッドシートの AcctTokens に保存された“延命済み”トークンを使う。
       Secret（IG_ACCESS_TOKEN_GIFUYATENJIN）は種。7日ごとに fresh_token_for が自動更新して保存するので
       60日で切れず投稿し続けられる（token_guard も毎日延命）。
       シート未接続（SHEET_ID/creds なし）の時だけ Secret を直接使う。"""
    poster.SHEET_ID = os.environ.get("SHEET_ID", poster.SHEET_ID)
    has_sheet = bool(getattr(poster, "SHEET_ID", "") and
                     (os.path.exists("creds.json") or os.environ.get("GOOGLE_CREDS_B64")))
    if has_sheet:
        try:
            t = (poster.fresh_token_for(ACCOUNT) or "").strip()
            if t:
                return t
            print("[TOKEN] AcctTokens/Secret のトークンが無効（token_guard が別途通知）。")
            return ""
        except Exception as e:
            print("[TOKEN] fresh_token_for 失敗 -> Secret にフォールバック:", e)
    return (os.environ.get("IG_ACCESS_TOKEN_GIFUYATENJIN") or "").strip()


def _slot_index(now):
    """その時刻がどの枠か（最も近いSLOT_HOURSの番号）。"""
    return min(range(len(SLOT_HOURS)), key=lambda i: abs(SLOT_HOURS[i] - now.hour))


def _pick_story(now):
    days = (now.date() - EPOCH).days
    si = _slot_index(now)
    idx = (days * len(SLOT_HOURS) + si) % len(STORIES)
    return STORIES[idx], si


def _line(msg):
    try:
        poster.line_notify(msg)
    except Exception:
        pass


def main():
    dry = os.environ.get("DRY") == "1"
    tk = _token()
    if not tk:
        print("スキップ：IG_ACCESS_TOKEN_GIFUYATENJIN 未設定。"
              "トークンを登録すると 11:00/17:00/20:00 の自動投稿が始まります（安全のため今は何もしません）。")
        return

    arg = " ".join(a for a in sys.argv[1:] if a.strip())
    if arg:
        now = datetime.datetime.fromisoformat(arg)
        if now.tzinfo is None:
            now = now.replace(tzinfo=JST)
    else:
        now = datetime.datetime.now(JST)

    story, si = _pick_story(now)
    url = MEDIA_BASE + "/" + story
    print("ぎふやストーリー投稿: 枠%d（%d:00 JST） -> %s" % (si + 1, SLOT_HOURS[si], url))

    if dry:
        print("[DRY] 生成URL確認のみ。実投稿はしません。")
        return

    # 最大2回試行（一時的なネット/IG障害で落ちないように）
    last = ""
    for attempt in (1, 2):
        pid = poster.ig_post(tk, url, True)
        if pid:
            print("投稿完了:", pid)
            _line("[ぎふや自動投稿] ストーリーを投稿しました（%d:00 / %s）" % (SLOT_HOURS[si], story))
            return
        last = story
        print("[POST] 試行%d 失敗" % attempt)
    _line("⚠️【ぎふや】ストーリー自動投稿に失敗しました（%s）。次の枠で再試行されます。" % last)
    raise SystemExit("ぎふやストーリー投稿に失敗: " + last)


if __name__ == "__main__":
    main()
