# -*- coding: utf-8 -*-
"""すさび湯三条：ドリンク170円バナー(9:16)を「週2回」ストーリーへ自動投稿する。

・素材は作成済みの pwa/susabiyu/banner_XX_story.jpg（Remotion不要＝軽い/速い）。
・5枚を“順ローテ”で出す。状態はシート不要＝日付から決定的に算出（実行のたびに1つ進む）。
  週2回（水・日）× 5枚 なので 2.5週で一巡。全部まんべんなく出る。
・投稿は poster.post() を再利用（CDNアップ→画像ストーリー投稿→LINE通知→履歴記録まで一括）。
・既定は LIVE（cronで本当に投稿）。手動テストは DRY=1 で投稿せず選定だけ表示。

呼び出し: python susabiyu_banner_story.py [creds.json]
"""
import os, sys, datetime
import poster

HERE = os.path.dirname(os.path.abspath(__file__))
BANNER_DIR = os.path.abspath(os.path.join(HERE, "..", "pwa", "susabiyu"))
N_BANNERS = 5                       # banner_01_story.jpg 〜 banner_05_story.jpg
# ローテ基準日（月曜）。ここからの経過で「何回目の実行か」を決定的に数える。
ROT_START = datetime.date(2026, 1, 5)   # Monday
POST_WEEKDAYS = (2, 6)                   # 水=2, 日=6（週2回）
JST = poster.JST

BANNER_CAP = ("何杯でも、気軽に乾杯。ドリンク全品170円（税込187円）🍺 "
              "大衆寿司酒場すさび湯 三条")


def rotation_index(today=None):
    """今日が何回目の投稿か（0始まり）を日付から決定的に出し、mod5でバナー番号に。
       週2回運用なので run_no = 経過週*2 + (その週の何スロット目か)。"""
    today = today or datetime.datetime.now(JST).date()
    weeks = (today - ROT_START).days // 7
    wd = today.weekday()
    # その週で POST_WEEKDAYS の何番目か（水=slot0, 日=slot1）。該当日でなくても直近スロット扱い。
    slot = 0
    for i, d in enumerate(POST_WEEKDAYS):
        if wd >= d:
            slot = i
    run_no = weeks * len(POST_WEEKDAYS) + slot
    return run_no % N_BANNERS


def banner_path(idx):
    return os.path.join(BANNER_DIR, "banner_%02d_story.jpg" % (idx + 1))


def main():
    live = os.environ.get("DRY", "").strip() not in ("1", "true", "yes")
    creds = sys.argv[1] if len(sys.argv) > 1 else "creds.json"
    if os.path.exists(creds):
        os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", creds)
    idx = rotation_index()
    path = banner_path(idx)
    print("[BANNER-STORY] %s / idx=%d / file=%s / exists=%s" % (
        "LIVE" if live else "DRY", idx, os.path.basename(path), os.path.exists(path)))
    if not os.path.exists(path):
        print("[BANNER-STORY] 画像が見つかりません→中止:", path); return 1
    if not live:
        print("[BANNER-STORY] DRY: 投稿しません（この番号のバナーをストーリー投稿予定）"); return 0
    ok = poster.post(path, False, BANNER_CAP, slot="banner", pattern="banner_%02d" % (idx + 1))
    print("[BANNER-STORY] 投稿%s" % ("成功" if ok else "失敗"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
