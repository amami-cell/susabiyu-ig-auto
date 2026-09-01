# -*- coding: utf-8 -*-
import os, sys, json, base64, datetime
import poster
import prepare
import stores

JST = datetime.timezone(datetime.timedelta(hours=9))
# 既定＝三条シート。STORE_SHEET_ID を渡した店舗（ぎふや等）はそのシートを使う（未設定なら三条＝挙動不変）。
SHEET_ID = os.environ.get("STORE_SHEET_ID") or "13zKaUblOwmgZ-lgCfxylCLlW2Fqutqct5h5TvMRWv30"
# 投稿アカウント。空＝三条（fresh_token・挙動不変）。"gifuyatenjin" 等でIG_ACCESS_TOKEN_<ACCOUNT>/AcctTokensを使用。
STORE_ACCOUNT = os.environ.get("STORE_ACCOUNT", "").strip()
STORE = stores.get_store(STORE_ACCOUNT)
APP_TAB = stores.app_tab(STORE)   # 三条＝「承認待ち」、店舗別＝「承認待ち_<account>」
PROPS_ARG = ""                    # 店舗ブランドprops（三条は空＝従来動作）
if STORE_ACCOUNT:
    os.makedirs("out", exist_ok=True)
    open("out/_props.json", "w", encoding="utf-8").write(json.dumps(stores.render_props(STORE), ensure_ascii=False))
    PROPS_ARG = " --props=out/_props.json"
    stores.apply_fetch_env(STORE)
# prepare から借用する関数（thumb_data_uri 等）が店舗の props/シート/タブを使うよう同期
prepare.SHEET_ID = SHEET_ID
prepare.APP_TAB = APP_TAB
prepare.PROPS_ARG = PROPS_ARG
DRY = os.environ.get("DRY") == "1"
MAX_REDO = 5

REG = prepare.REG
decide = prepare.decide
thumb_data_uri = prepare.thumb_data_uri
caption_of = prepare.caption_of


def run(cmd):
    import subprocess
    print(">>", cmd)
    r = subprocess.run(cmd, shell=True)
    if r.returncode != 0:
        # RuntimeError \u306b\u3057\u3066\u4e0a\u4f4d\u306e\u30ea\u30c8\u30e9\u30a4/\u901a\u77e5\u3067\u6355\u6349\u3067\u304d\u308b\u3088\u3046\u306b\u3059\u308b
        raise RuntimeError("\u30b3\u30de\u30f3\u30c9\u5931\u6557: " + cmd)


def find_row(sh, when_str):
    data = sh.values().get(spreadsheetId=SHEET_ID, range=APP_TAB + "!A:K").execute().get("values", [])
    for i, r in enumerate(data):
        if i == 0:
            continue
        if len(r) > 1 and str(r[1]).strip()[:16] == when_str:
            return i + 1, r
    return None, None


def set_status(sh, rownum, status):
    now = datetime.datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!H%d:I%d" % (APP_TAB, rownum, rownum),
        valueInputOption="RAW", body={"values": [[status, now]]}).execute()


def get_redo_count(row):
    # K\u5217(index 10) \u306eredo\u56de\u6570
    try:
        return int(str(row[10]).strip())
    except Exception:
        return 0


def update_preview_row(sh, rownum, pattern, uri, cap, picked_json, redo_count, poster_uri="", blur=""):
    # E(\u30d7\u30ec\u30d3\u30e5\u30fc)=uri, F(caption)=cap, D(pattern)=pattern, J(picked_json), H=pending, I=now, K=redo_count, L=poster, M=blur
    now = datetime.datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    # D\u5217 pattern
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!D%d" % (APP_TAB, rownum),
        valueInputOption="RAW", body={"values": [[pattern]]}).execute()
    # E:F \u30d7\u30ec\u30d3\u30e5\u30fc\u3068caption
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!E%d:F%d" % (APP_TAB, rownum, rownum),
        valueInputOption="RAW", body={"values": [[uri, cap]]}).execute()
    # H:I status/now
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!H%d:I%d" % (APP_TAB, rownum, rownum),
        valueInputOption="RAW", body={"values": [["pending", now]]}).execute()
    # J picked_json
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!J%d" % (APP_TAB, rownum),
        valueInputOption="RAW", body={"values": [[picked_json]]}).execute()
    # K redo_count
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!K%d" % (APP_TAB, rownum),
        valueInputOption="RAW", body={"values": [[redo_count]]}).execute()
    # L:M \u30dd\u30b9\u30bf\u30fc\u3068\u3076\u304b\u3057\uff08\u4f5c\u308a\u76f4\u3057\u5f8c\u3082\u5373\u6642\u8868\u793a\u3092\u6700\u65b0\u5316\uff09
    sh.values().update(spreadsheetId=SHEET_ID, range="%s!L%d:M%d" % (APP_TAB, rownum, rownum),
        valueInputOption="RAW", body={"values": [[poster_uri, blur]]}).execute()


def regenerate(creds, dt):
    # prepare.py \u76f8\u5f53\u306e1\u67a0\u751f\u6210\u3092 FIXED\u7121\u3057\uff08\u5168\u30e9\u30f3\u30c0\u30e0\uff09\u3067\u5b9f\u884c
    for k in ("FIXED_IDS", "FIXED_CAPTION", "FIXED_MUSIC"):
        os.environ.pop(k, None)
    dec = decide(dt)
    pattern = dec["pattern"]
    allowed = STORE.get("patterns")
    if allowed and pattern not in allowed:
        pattern = allowed[dt.toordinal() % len(allowed)]   # 店舗は region-free のみ
    fetch, comp, is_video = REG[pattern]
    cf = ' "' + creds + '"' if creds else ""
    run("python " + fetch + cf)
    if is_video:
        run("npx remotion render " + comp + " out/post.mp4 --crf 18 --timeout 120000 --concurrency 1" + PROPS_ARG)
        try:
            prepare._faststart("out/post.mp4")  # 確認用プレビューの即再生（画質そのまま）
        except Exception:
            pass
    else:
        run("npx remotion still " + comp + " out/post.png" + PROPS_ARG)
    picked_json = ""
    try:
        picked_json = open(os.path.join("out", "picked.json"), encoding="utf-8").read()
    except Exception:
        pass
    poster_uri = ""
    blur = ""
    if is_video:
        # ポスター静止画＋ぼかしを生成（先出し＆即時表示用）
        try:
            poster_uri, blur = thumb_data_uri(comp, True)
        except Exception:
            poster_uri, blur = "", ""
        try:
            mp4u = poster.up("out/post.mp4", cdn=True)
        except Exception:
            mp4u = ""
        uri = mp4u or poster_uri  # 動画が上がらなければポスター静止画で代替
    else:
        uri, blur = thumb_data_uri(comp, is_video)
    cap = caption_of(pattern)
    return pattern, uri, cap, picked_json, blur, poster_uri


def line_redo_notify(sh, dt, pattern, cap, redo_count):
    try:
        appurl = poster._cell(sh, "Config!B14")
    except Exception:
        appurl = ""
    patja = prepare.PAT_JA.get(pattern, pattern) if hasattr(prepare, "PAT_JA") else pattern
    lines = [
        "\u3010\u4f5c\u308a\u76f4\u3057\u307e\u3057\u305f\u3011%d/%d %02d:00" % (dt.month, dt.day, dt.hour),
        "\u30d1\u30bf\u30fc\u30f3: %s" % patja,
        "\u5185\u5bb9: %s" % (cap or "\uff08\u52d5\u753b\uff09"),
        "\uff08\u4f5c\u308a\u76f4\u3057 %d/%d \u56de\u76ee\uff09" % (redo_count, MAX_REDO),
        "",
        "\u78ba\u8a8d\u30fb\u64cd\u4f5c\u306f\u3053\u3061\u3089\u2193",
        appurl,
    ]
    try:
        poster.line_notify("\n".join(lines))
    except Exception as e:
        print("LINE\u901a\u77e5\u5931\u6557(\u7d99\u7d9a):", e)


def line_redo_limit_notify(sh, dt, pattern, cap):
    try:
        appurl = poster._cell(sh, "Config!B14")
    except Exception:
        appurl = ""
    patja = prepare.PAT_JA.get(pattern, pattern) if hasattr(prepare, "PAT_JA") else pattern
    lines = [
        "\u3010\u4f5c\u308a\u76f4\u3057\u4e0a\u9650\u3011%d/%d %02d:00" % (dt.month, dt.day, dt.hour),
        "\u4f5c\u308a\u76f4\u3057\u304c%d\u56de\u306b\u9054\u3057\u305f\u305f\u3081\u3001\u3053\u306e\u5185\u5bb9\u3067\u4e88\u5b9a\u6295\u7a3f\u3057\u307e\u3059\u3002" % MAX_REDO,
        "\u30d1\u30bf\u30fc\u30f3: %s" % patja,
        "\u5185\u5bb9: %s" % (cap or "\uff08\u52d5\u753b\uff09"),
        "",
        "\u3084\u3081\u308b\u5834\u5408\u306f\u3053\u3061\u3089\u2193",
        appurl,
    ]
    try:
        poster.line_notify("\n".join(lines))
    except Exception as e:
        print("LINE\u901a\u77e5\u5931\u6557(\u7d99\u7d9a):", e)


def _notify_post_failure(dt, pattern, cap, err):
    """\u6295\u7a3f\u304c\uff08\u30ea\u30c8\u30e9\u30a4\u3057\u3066\u3082\uff09\u5931\u6557\u3057\u305f\u6642\u306b\u3001\u9ed9\u3063\u3066\u672a\u6295\u7a3f\u306b\u305b\u305aLINE\u3067\u77e5\u3089\u305b\u308b\u3002"""
    try:
        patja = prepare.PAT_JA.get(pattern, pattern)
    except Exception:
        patja = pattern
    lines = [
        "\u26a0\ufe0f\u3010\u81ea\u52d5\u6295\u7a3f\u306b\u5931\u6557\u3011%d/%d %02d:00" % (dt.month, dt.day, dt.hour),
        "\u30d1\u30bf\u30fc\u30f3: %s" % patja,
        "\u5185\u5bb9: %s" % (cap or "\uff08\u52d5\u753b\uff09"),
        "\u30a8\u30e9\u30fc: %s" % (str(err)[:200]),
        "",
        "\u203b\u67a0\u306f\u672a\u6295\u7a3f\u306e\u307e\u307e\u6b8b\u3057\u3066\u3044\u307e\u3059\u3002\u6b21\u306e\u8d77\u52d5\u3067\u518d\u8a66\u884c\u3055\u308c\u307e\u3059\u3002",
    ]
    try:
        poster.line_notify("\n".join(lines))
    except Exception as e:
        print("LINE\u901a\u77e5\u5931\u6557(\u7d99\u7d9a):", e)


def do_redo(sh, rownum, row, dt, creds):
    """1件の作り直しを実行。上限到達なら現内容で確定(pending)。main/scan共用。"""
    def col(n):
        return row[n] if len(row) > n else ""
    when_str = dt.strftime("%Y-%m-%d %H:%M")
    pattern = col(3)
    redo_count = get_redo_count(row)
    if redo_count >= MAX_REDO:
        set_status(sh, rownum, "pending")
        line_redo_limit_notify(sh, dt, pattern, col(5))
        print("作り直し上限(%d) -> pending: %s" % (MAX_REDO, when_str))
        return
    try:
        new_pattern, uri, cap, new_picked, new_blur, new_poster = regenerate(creds, dt)
        update_preview_row(sh, rownum, new_pattern, uri, cap, new_picked, redo_count + 1, new_poster, new_blur)
    except BaseException as e:
        print("[REDO] 作り直し失敗 -> pendingに戻す:", e)
        try:
            set_status(sh, rownum, "pending")
        except Exception as e2:
            print("[REDO] pending復帰も失敗:", e2)
        try:
            poster.line_notify("⚠️【作り直し失敗】%s の作り直しに失敗しました。元の内容のまま予定どおり自動投稿します。\n%s" % (when_str, str(e)[:200]))
        except Exception:
            pass
        try:
            token = str(col(0))
            pwa_url = os.environ.get("PWA_URL") or "https://amami-cell.github.io/susabiyu-media/app/"
            prepare.send_push(sh, "作り直しできませんでした",
                              "%d/%d %02d:00 は元の内容のまま予定どおり投稿します。" % (dt.month, dt.day, dt.hour),
                              pwa_url, token, category="redo")
        except Exception:
            pass
        return
    line_redo_notify(sh, dt, new_pattern, cap, redo_count + 1)
    try:
        token = str(col(0))
        patja = prepare.PAT_JA.get(new_pattern, new_pattern)
        pwa_url = os.environ.get("PWA_URL") or "https://amami-cell.github.io/susabiyu-media/app/"
        prepare.send_push(sh, "作り直し完了",
                          "%d/%d %02d:00 %s を作り直しました。ご確認ください" % (dt.month, dt.day, dt.hour, patja),
                          pwa_url, token, category="redo")
    except Exception as e:
        print("[PUSH] 作り直し通知 失敗(継続):", e)
    print("作り直し完了 -> pending (%d/%d回目, pattern=%s): %s" % (redo_count + 1, MAX_REDO, new_pattern, when_str))


def redo_scan(creds):
    """承認待ちの status==redo を全部拾って必ず作り直す（GAS→GitHub起動に依存しない安全網）。"""
    sh = poster._sheets()
    data = sh.values().get(spreadsheetId=SHEET_ID, range=APP_TAB + "!A:K").execute().get("values", [])
    n = 0
    for i in range(1, len(data)):
        row = data[i]
        if str(row[7] if len(row) > 7 else "").strip() != "redo":
            continue
        whens = str(row[1] if len(row) > 1 else "").strip()[:16]
        try:
            dt = datetime.datetime.strptime(whens, "%Y-%m-%d %H:%M").replace(tzinfo=JST)
        except Exception:
            print("[SCAN] 日付解釈できずスキップ:", whens); continue
        print("[SCAN] 作り直し対象:", whens)
        do_redo(sh, i + 1, row, dt, creds)
        n += 1
    print("[SCAN] redo処理 %d 件" % n)


def redo_check():
    """status==redo の件数を数えて GITHUB_OUTPUT に redo=N を出力（重い処理前のゲート用）。"""
    sh = poster._sheets()
    data = sh.values().get(spreadsheetId=SHEET_ID, range=APP_TAB + "!A:K").execute().get("values", [])
    n = sum(1 for i in range(1, len(data)) if str(data[i][7] if len(data[i]) > 7 else "").strip() == "redo")
    print("[CHECK] redo件数 =", n)
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        try:
            open(out, "a").write("redo=%d\n" % n)
        except Exception as e:
            print("[CHECK] output書込失敗:", e)


def main():
    creds = ""
    args = [a for a in sys.argv[1:] if a.strip()]
    if args and args[0].lower().endswith(".json"):
        creds = args[0]; args = args[1:]
    if not creds and os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"])); creds = "creds.json"
    if creds and os.path.abspath(creds) != os.path.abspath("creds.json"):
        import shutil; shutil.copyfile(creds, "creds.json")
    creds = "creds.json"

    os.environ["SHEET_ID"] = SHEET_ID
    poster.SHEET_ID = SHEET_ID

    # 作り直しの安全網モード（GAS→GitHub起動に依存せず、redo枠を必ず処理する）
    if args and args[0].strip() in ("redo-scan", "redo-check"):
        if args[0].strip() == "redo-check":
            redo_check()
        else:
            redo_scan(creds)
        return

    if args:
        dt = datetime.datetime.fromisoformat(" ".join(args))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=JST)
    else:
        dt = datetime.datetime.now(JST)
    when_str = dt.strftime("%Y-%m-%d %H:%M")

    # 深夜投稿ガード：GitHubのcron遅延で自動投稿が迷惑な時刻に発火するのを防ぐ。
    # スケジュール実行時のみ有効（POST_SCHED_GUARD=1）。手動の「即投稿」は時刻不問で従来どおり投稿。
    # ① 現在時刻が投稿許容窓（既定 10:00〜22:00 JST）の外なら投稿しない＝深夜は絶対に出さない。
    # ② 窓内でも、予定枠(dt)から大幅遅延（既定120分超）なら投稿しない（枠が大きくズレた遅延投稿を回避）。
    # いずれもスキップ時は枠をpendingのまま残し、投稿も通知もしない。
    if os.environ.get("POST_SCHED_GUARD") == "1":
        win_from = int(os.environ.get("POST_WINDOW_FROM", "10"))   # 何時から自動投稿してよいか（JST時）
        win_to = int(os.environ.get("POST_WINDOW_TO", "22"))       # 何時まで（この時刻以降は投稿しない）
        max_late = int(os.environ.get("POST_MAX_LATE_MIN", "120")) # 予定枠からの許容遅延（分）
        nowj = datetime.datetime.now(JST)
        if not (win_from <= nowj.hour < win_to):
            print("[GUARD] 現在 %d時（自動投稿は %d-%d時のみ）→ 深夜等の自動投稿を回避してスキップ（枠pendingのまま／通知なし）"
                  % (nowj.hour, win_from, win_to))
            return
        late_min = (nowj - dt).total_seconds() / 60.0
        if late_min > max_late:
            print("[GUARD] 予定枠 %s より %.0f分 遅延（許容 %d分 超）→ 遅延投稿を回避してスキップ（枠pendingのまま／通知なし）"
                  % (when_str, late_min, max_late))
            return

    sh = poster._sheets()
    rownum, row = find_row(sh, when_str)
    if not rownum:
        print("\u8a72\u5f53\u679a\u306a\u3057:", when_str, "-> \u30b9\u30ad\u30c3\u30d7")
        return

    def col(n):
        return row[n] if len(row) > n else ""

    pattern = col(3); slot = col(2); status = str(col(7) or "pending"); picked_json = col(9)
    print("\u5bfe\u8c61:", when_str, "| status:", status, "| pattern:", pattern)

    if status == "rejected":
        print("\u3084\u3081\u308b\u6307\u5b9a -> \u30b9\u30ad\u30c3\u30d7")
        return

    if status == "posted":
        print("\u65e2\u306b\u6295\u7a3f\u6e08 -> \u30b9\u30ad\u30c3\u30d7")
        return

    if status == "redo":
        redo_count = get_redo_count(row)
        if redo_count >= MAX_REDO:
            set_status(sh, rownum, "pending")
            line_redo_limit_notify(sh, dt, pattern, col(5))
            print("\u4f5c\u308a\u76f4\u3057\u4e0a\u9650(%d) -> pending\u306b\u623b\u3057\u3066\u4e88\u5b9a\u6295\u7a3f" % MAX_REDO)
            return
        try:
            new_pattern, uri, cap, new_picked, new_blur, new_poster = regenerate(creds, dt)
            update_preview_row(sh, rownum, new_pattern, uri, cap, new_picked, redo_count + 1, new_poster, new_blur)
        except BaseException as e:
            # 失敗しても「作り直し中(redo)」のまま固まらせない。元の内容で予定どおり投稿できるようpendingに戻す。
            print("[REDO] 作り直し失敗 -> pendingに戻す:", e)
            try:
                set_status(sh, rownum, "pending")
            except Exception as e2:
                print("[REDO] pending復帰も失敗:", e2)
            try:
                poster.line_notify("⚠️【作り直し失敗】%s の作り直しに失敗しました。元の内容のまま予定どおり自動投稿します。\n%s" % (when_str, str(e)[:200]))
            except Exception:
                pass
            try:
                token = str(col(0))
                pwa_url = os.environ.get("PWA_URL") or "https://amami-cell.github.io/susabiyu-media/app/"
                prepare.send_push(sh, "作り直しできませんでした",
                                  "%d/%d %02d:00 は元の内容のまま予定どおり投稿します。" % (dt.month, dt.day, dt.hour),
                                  pwa_url, token, category="redo")
            except Exception:
                pass
            return
        line_redo_notify(sh, dt, new_pattern, cap, redo_count + 1)
        # PWA\u8cfc\u8aad\u8005(\u81ea\u5206\u30fb\u4ed6\u306e\u4eba)\u5168\u54e1\u306bWeb Push\uff08\u4f5c\u308a\u76f4\u3057\u5b8c\u4e86\uff09\u3002\u8a72\u5f53\u67a0\u3078\u30b8\u30e3\u30f3\u30d7\u3067\u304d\u308b\u3088\u3046focus=token
        try:
            token = str(col(0))
            patja = prepare.PAT_JA.get(new_pattern, new_pattern)
            pwa_url = os.environ.get("PWA_URL") or "https://amami-cell.github.io/susabiyu-media/app/"
            prepare.send_push(sh, "\u4f5c\u308a\u76f4\u3057\u5b8c\u4e86",
                              "%d/%d %02d:00 %s \u3092\u4f5c\u308a\u76f4\u3057\u307e\u3057\u305f\u3002\u3054\u78ba\u8a8d\u304f\u3060\u3055\u3044" % (dt.month, dt.day, dt.hour, patja),
                              pwa_url, token, category="redo")
        except Exception as e:
            print("[PUSH] \u4f5c\u308a\u76f4\u3057\u901a\u77e5 \u5931\u6557(\u7d99\u7d9a):", e)
        print("\u4f5c\u308a\u76f4\u3057\u5b8c\u4e86 -> pending\u306b\u623b\u3057\u3066\u518d\u63d0\u6848 (%d/%d\u56de\u76ee, pattern=%s)" % (redo_count + 1, MAX_REDO, new_pattern))
        return

    info = {}
    try:
        info = json.loads(picked_json) if picked_json else {}
    except Exception as e:
        print("JSON\u8aad\u8fbc\u5931\u6557:", e)
    ids = info.get("ids", []); caption = info.get("caption", ""); music = info.get("music", "")
    for k in ("FIXED_IDS", "FIXED_CAPTION", "FIXED_MUSIC"):
        os.environ.pop(k, None)
    if ids:
        os.environ["FIXED_IDS"] = ",".join(ids)
    if caption:
        os.environ["FIXED_CAPTION"] = caption
    if music:
        os.environ["FIXED_MUSIC"] = music
    print("\u56fa\u5b9a\u751f\u6210: ids=%d caption=%r music=%r" % (len(ids), caption, music))

    # トークンが失効している時は、生成も投稿もせず枠はpendingのまま残し、
    # はっきりした通知を1日1回だけ出す（毎回の投稿失敗スパムを防ぐ・復旧後に自動投稿）。
    if not DRY and not poster.token_alive(STORE_ACCOUNT):
        poster.alert_token_dead()
        print("IGトークン失効のため投稿スキップ（枠はpendingのまま・復旧後に自動投稿されます） account=%r" % STORE_ACCOUNT)
        return

    fetch, comp, is_video = REG[pattern]
    cf = ' "' + creds + '"' if creds else ""
    media = os.path.join("out", os.path.basename("out/post.mp4" if is_video else "out/post.png"))

    # \u751f\u6210\u2192\u6295\u7a3f\u3092\u6700\u59272\u56de\u8a66\u884c\uff08\u4e00\u6642\u7684\u306a\u30cd\u30c3\u30c8/IG/Drive\u969c\u5bb3\u3067\u843d\u3061\u306a\u3044\u3088\u3046\u306b\uff09\u3002
    # \u5931\u6557\u3057\u3066\u3082status\u306fapproved/pending\u306e\u307e\u307e\u6b8b\u3057\u3001LINE\u3067\u901a\u77e5\u3059\u308b\u3002
    import time as _time
    ATTEMPTS = 2
    last_err = None
    posted = False  # \u4e00\u5ea6\u3067\u3082\u6295\u7a3f\u6210\u529f\u3057\u305f\u3089\u3001\u30ea\u30c8\u30e9\u30a4\u3057\u3066\u3082\u4e8c\u5ea6\u3068\u6295\u7a3f\u3057\u306a\u3044\uff08\u4e8c\u91cd\u6295\u7a3f\u9632\u6b62\uff09
    for attempt in range(1, ATTEMPTS + 1):
        try:
            if not posted:
                run("python " + fetch + cf)
                if is_video:
                    run("npx remotion render " + comp + " out/post.mp4 --crf 18 --timeout 120000 --concurrency 1" + PROPS_ARG)
                else:
                    run("npx remotion still " + comp + " out/post.png" + PROPS_ARG)
                if DRY:
                    print("[DRY] \u751f\u6210\u5b8c\u4e86:", media, "\uff08\u6295\u7a3f\u306f\u3057\u307e\u305b\u3093\uff09"); return
                # \u4e8c\u91cd\u6295\u7a3f\u9632\u6b62: \u6295\u7a3f\u76f4\u524d\u306b\u6700\u65b0\u30b9\u30c6\u30fc\u30bf\u30b9\u3092\u518d\u78ba\u8a8d\u3002\u4ed6\u30c8\u30ea\u30ac\u304c\u6295\u7a3f\u6e08\u307f\u306a\u3089\u30b9\u30ad\u30c3\u30d7
                _, fresh = find_row(sh, when_str)
                if fresh is not None and len(fresh) > 7 and str(fresh[7]) == "posted":
                    print("\u4ed6\u30c8\u30ea\u30ac\u30fc\u304c\u65e2\u306b\u6295\u7a3f\u6e08 -> \u30b9\u30ad\u30c3\u30d7"); return
                ok = poster.post(media, is_video, caption, slot, pattern, account=STORE_ACCOUNT)
                if not ok:
                    raise RuntimeError("IG\u6295\u7a3fAPI\u304c\u5931\u6557\u3092\u8fd4\u3057\u307e\u3057\u305f")
                posted = True
            # \u3053\u3053\u307e\u3067\u6765\u305f\u3089\u6295\u7a3f\u306f\u6210\u529f\u6e08\u307f\u3002\u3042\u3068\u306f\u30b9\u30c6\u30fc\u30bf\u30b9\u66f4\u65b0\uff08\u5931\u6557\u3057\u3066\u3082\u518d\u6295\u7a3f\u306f\u3057\u306a\u3044\uff09
            set_status(sh, rownum, "posted")
            print("\u6295\u7a3f\u5b8c\u4e86 & \u72b6\u614b\u3092posted\u306b\u66f4\u65b0")
            # PWA\u8cfc\u8aad\u8005\u3078Web Push\uff08Instagram\u6295\u7a3f\u5b8c\u4e86\uff09\u3002\u30ab\u30c6\u30b4\u30ea ig\uff08\u500b\u5225ON/OFF\u5bfe\u8c61\uff09
            try:
                patja = prepare.PAT_JA.get(pattern, pattern)
                pwa_url = os.environ.get("PWA_URL") or "https://amami-cell.github.io/susabiyu-media/app/"
                prepare.send_push(sh, "Instagram\u6295\u7a3f\u5b8c\u4e86",
                                  "%d/%d %02d:00 %s \u3092\u6295\u7a3f\u3057\u307e\u3057\u305f" % (dt.month, dt.day, dt.hour, patja),
                                  pwa_url, "", category="ig")
            except Exception as _pe:
                print("[PUSH] \u6295\u7a3f\u5b8c\u4e86\u901a\u77e5 \u5931\u6557(\u7d99\u7d9a):", _pe)
            return
        except Exception as e:
            last_err = e
            print("[POST] \u8a66\u884c%d/%d \u5931\u6557:" % (attempt, ATTEMPTS), e)
            if attempt < ATTEMPTS:
                _time.sleep(8)

    # \u5168\u8a66\u884c\u5931\u6557 -> \u901a\u77e5\u3057\u3066\u7570\u5e38\u7d42\u4e86\uff08\u67a0\u306f\u672a\u6295\u7a3f\u306e\u307e\u307e=\u518d\u8a66\u884c\u53ef\u80fd\uff09
    _notify_post_failure(dt, pattern, caption, last_err)
    raise SystemExit("\u6295\u7a3f\u306b\u5931\u6557\u3057\u307e\u3057\u305f(%d\u56de\u8a66\u884c): %s" % (ATTEMPTS, last_err))


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise  # \u65e2\u306b\u901a\u77e5\u6e08\u307f or \u6b63\u5e38\u30b9\u30ad\u30c3\u30d7\u3002Action\u306b\u306f\u5931\u6557\u3068\u3057\u3066\u6b8b\u3059
    except BaseException as e:
        # \u60f3\u5b9a\u5916\u306e\u7570\u5e38\u7d42\u4e86\u3067\u3082\u9ed9\u3089\u305b\u306a\u3044\uff08\u4f5c\u308a\u76f4\u3057\u5931\u6557\u306a\u3069\u3082\u542b\u3081\u3066\u901a\u77e5\uff09
        try:
            poster.line_notify("\u26a0\ufe0f\u3010\u81ea\u52d5\u6295\u7a3f\u51e6\u7406\u304c\u7570\u5e38\u7d42\u4e86\u3011\n" + str(e)[:300] +
                               "\n\u203b\u672a\u6295\u7a3f\u306e\u53ef\u80fd\u6027\u304c\u3042\u308a\u307e\u3059\u3002\u78ba\u8a8d\u753b\u9762\u3092\u3054\u78ba\u8a8d\u304f\u3060\u3055\u3044\u3002")
        except Exception:
            pass
        raise
