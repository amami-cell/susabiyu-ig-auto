# -*- coding: utf-8 -*-
"""全店：InstagramのDM（受信メッセージ）を検知して、確認アプリへ通知＋一覧に貯める。

・投稿系とは独立。既存の15分巡回（mentions-repost）に相乗りで回す想定（新cronを増やさない＝無料枠維持）。
・権限は DM送信（お礼DM）と同じ instagram_manage_messages を利用（graph.instagram.com）。
・プライバシー配慮：診断(diag)モードでは件数だけを出し、メッセージ本文はログに出さない。

モード:
  diag   … 会話一覧が読めるかだけ確認（件数のみ。本文・通知なし）。まず可否確認用。
  run    … 新着の受信DMを検知→Web Push通知＋「DM_<account>」タブに記録（アプリ表示用）。
           前回位置は「DM状態_<account>」に updated_time / 既読メッセージIDで保持。

使い方（CI）:
  STORE_ACCOUNT=gifuyatenjin python dm_notify.py creds.json diag
  python dm_notify.py creds.json run           # STORE_ACCOUNT未指定＝全店ループ
"""
import os, sys, json, base64, datetime

import poster
import stores as _stores

JST = datetime.timezone(datetime.timedelta(hours=9))
IGB = getattr(poster, "IGB", "https://graph.instagram.com/v23.0")

# 通知を出す時間帯（既定 10:00〜22:00 JST）。この窓の外（22:00〜翌10:00）は鳴らさない。
# 窓外に届いたDMは翌朝この窓に入ってからまとめて通知する（記録＝一覧には即時反映）。
QUIET_FROM = int(os.environ.get("DM_QUIET_FROM", "10"))   # 何時から通知してよいか（JST時）
QUIET_TO = int(os.environ.get("DM_QUIET_TO", "22"))       # 何時まで


def _now_iso():
    # IGの created_time はISO8601(+0000)。基準化フォールバック用に現在UTCを同形式で返す。
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+0000")


def _accounts():
    a = os.environ.get("STORE_ACCOUNT", "").strip()
    if a:
        return [a]
    # 全店（三条=空文字 は DM運用対象なら含める。ここでは登録済みアカウントを対象）
    out = []
    for key, st in _stores.STORES.items():
        out.append(st.get("account", key) or "")
    # 重複除去・順序維持
    seen = set(); res = []
    for x in out:
        if x not in seen:
            seen.add(x); res.append(x)
    return res


def _get(url, params):
    r = poster.req.get(url, params=params, timeout=30)
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {"_raw": r.text[:200]}


def _conversations(token, limit=25):
    """会話一覧（新しい順）を取得。
    重要：通常の受信箱(primary)だけでなく『メッセージリクエスト』も拾う。
    Instagramのリクエストは別フォルダ扱いのため、folder 指定でも取得を試み、会話IDでマージする。
    （未対応のfolder指定はエラーになるが握りつぶし、取れた分だけ使う＝取りこぼし防止）。"""
    fields = "id,updated_time,participants"
    base = {"platform": "instagram", "fields": fields, "limit": limit, "access_token": token}
    # 素の呼び出し（primary）＋リクエスト相当のフォルダ違いを順に試す。
    attempts = [
        dict(base),
        {"fields": fields, "limit": limit, "access_token": token},           # platform無し版（後方互換）
        dict(base, folder="requests"),
        dict(base, folder="pending"),
        dict(base, folder="page"),
    ]
    merged = {}; anyok = False; last = None; got = []
    for params in attempts:
        code, j = _get(IGB + "/me/conversations", params)
        if code == 200 and isinstance(j, dict) and "data" in j:
            anyok = True
            n0 = len(merged)
            for c in (j.get("data") or []):
                cid = c.get("id")
                if cid and cid not in merged:
                    merged[cid] = c
            got.append("%s:+%d" % (params.get("folder", "primary"), len(merged) - n0))
        else:
            err = (j.get("error") or {}) if isinstance(j, dict) else {}
            last = err.get("message") or (j.get("_raw") if isinstance(j, dict) else None) or str(code)
    if anyok:
        data = sorted(merged.values(), key=lambda c: c.get("updated_time", ""), reverse=True)
        print("[DM] 会話ソース内訳:", ", ".join(got))
        return True, data, None
    return False, [], last


def _messages(token, conv_id, limit=10):
    code, j = _get(IGB + "/" + str(conv_id),
                   {"fields": "messages.limit(%d){id,created_time,from,message}" % limit,
                    "access_token": token})
    if code == 200:
        return (j.get("messages") or {}).get("data", [])
    return []


def _me_uid(token):
    code, j = _get(IGB + "/me", {"fields": "user_id,username", "access_token": token})
    return str(j.get("user_id") or j.get("id") or ""), j.get("username", "")


def _state_tab(acct):
    return "DM状態" + ("_" + acct if acct else "")


def _list_tab(acct):
    return "DM" + ("_" + acct if acct else "")


def _app_url(acct):
    # 通知タップ時に開く、その店の確認アプリのページ。
    return {"": "./", "gifuyatenjin": "./gifuyatenjin.html",
            "nagagutsu": "./nagagutsu.html", "goldporta": "./goldporta.html"}.get(acct, "./")


def run_account(acct, mode):
    name = _stores.get_store(acct).get("store_name") or acct or "三条"
    # 名前付き店舗は「自前トークン」必須。無いと account_base_token が既定(三条)トークンへ
    # フォールバックし、他店の受信箱を読んで DM_<acct> に誤って書き込む（＝誤配線）。
    # 自前トークンが無い店舗はDM処理をスキップし、過去に誤配線で書かれた行があれば掃除する。
    if acct:
        own = (os.environ.get("IG_ACCESS_TOKEN_" + acct.upper(), "") or "").strip()
        if not own:
            print("[%s][DM][SKIP] 自前トークン未設定＝既定トークンへの誤配線を避けてスキップ" % name)
            if mode == "run":
                try:
                    sh0 = poster._sheets(); ltab0 = _list_tab(acct); stab0 = _state_tab(acct)
                    v0 = sh0.values().get(spreadsheetId=poster.SHEET_ID, range=ltab0 + "!A1:D1").execute().get("values", [])
                    if v0:  # 誤配線で書かれた行がある時だけクリア（無ければAPIも呼ばない）
                        sh0.values().clear(spreadsheetId=poster.SHEET_ID, range=ltab0).execute()
                        sh0.values().clear(spreadsheetId=poster.SHEET_ID, range=stab0).execute()
                        print("[%s][DM] 誤配線行をクリア（%s / %s）" % (name, ltab0, stab0))
                except Exception as _e:
                    print("[%s][DM] 掃除スキップ:" % name, _e)
            return
    try:
        token = (poster.fresh_token_for(acct) or "").strip()
    except Exception as e:
        print("[%s][TOKEN] 取得失敗: %s" % (name, e)); return
    if not token:
        print("[%s][SKIP] トークン未設定" % name); return

    ok, convs, err = _conversations(token)
    if not ok:
        print("[%s][DM] 会話一覧が取得できません（権限/設定不足の可能性）: %s" % (name, err)); return
    print("[%s][DM] 会話 %d 件 取得OK" % (name, len(convs)))
    if mode == "diag":
        # リクエスト監視用：DM一覧タブ（Webhookが書くリクエスト本文も含む）の件数と最新時刻・24h内件数を出す。
        try:
            sh = poster._sheets(); ltab = _list_tab(acct)
            vals = sh.values().get(spreadsheetId=poster.SHEET_ID, range=ltab + "!A:D").execute().get("values", [])
            rows = [r for r in vals if r and len(r) > 0 and str(r[0]).strip()]
            newest = rows[-1][0] if rows else "-"
            cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=24))
            recent = 0
            for r in rows:
                try:
                    ts = str(r[0]).strip().replace(" ", "T")
                    dtv = datetime.datetime.fromisoformat(ts)
                    if dtv.tzinfo is None:
                        dtv = dtv.replace(tzinfo=JST)
                    if dtv.astimezone(datetime.timezone.utc) >= cutoff:
                        recent += 1
                except Exception:
                    pass
            print("[%s][DM][MON] 一覧タブ=%s 累計%d件 / 直近24h %d件 / 最新=%s"
                  % (name, ltab, len(rows), recent, newest))
        except Exception as e:
            print("[%s][DM][MON] 一覧タブ読取スキップ:" % name, e)
        return  # 件数のみ。本文・通知は出さない

    uid, uname = _me_uid(token)
    sh = poster._sheets()
    stab = _state_tab(acct); ltab = _list_tab(acct)
    poster._ensure_tab(sh, stab); poster._ensure_tab(sh, ltab)

    # state: A1=既読の最終時刻(last_seen) / B1=夜間などで通知保留した件数(pending)
    last_seen = ""; pending = 0
    try:
        v = sh.values().get(spreadsheetId=poster.SHEET_ID, range=stab + "!A1:B1").execute().get("values", [])
        if v and v[0]:
            last_seen = (v[0][0] if len(v[0]) > 0 else "") or ""
            try: pending = int(v[0][1]) if len(v[0]) > 1 and v[0][1] != "" else 0
            except Exception: pending = 0
    except Exception:
        pass

    # 初回（stateなし）は「基準化」だけ：過去DMを大量通知しないよう、最新時刻を記録して終了。
    first_run = (last_seen == "")
    newest = last_seen
    new_rows = []
    # 更新のあった会話だけメッセージ取得（API呼び出し削減）。updated_time は新しい順。
    for c in convs:
        ut = c.get("updated_time", "")
        if last_seen and ut and ut <= last_seen:
            continue
        for m in _messages(token, c.get("id")):
            ct = m.get("created_time", "")
            if ct and ct > newest:
                newest = ct
            frm = str((m.get("from") or {}).get("id") or "")
            if frm == uid:
                continue  # 自分（店）の送信は除外＝受信DMだけ
            if last_seen and ct <= last_seen:
                continue
            if first_run:
                continue  # 初回は記録も通知もしない（基準化のみ）
            sender = (m.get("from") or {}).get("username") or frm
            text = (m.get("message") or "").strip()
            new_rows.append([ct, sender, text, m.get("id", "")])

    if first_run:
        try:
            sh.values().update(spreadsheetId=poster.SHEET_ID, range=stab + "!A1:B1",
                               valueInputOption="RAW", body={"values": [[newest or _now_iso(), 0]]}).execute()
        except Exception as e:
            print("[%s][DM] 初回基準化の保存に失敗:" % name, e)
        print("[%s][DM] 初回基準化（以後の新着から通知します）" % name); return

    # Webhook(GAS)が既に同じDMを一覧に書いている場合があるので、msgid重複を除外してから追記する。
    if new_rows:
        try:
            ex = sh.values().get(spreadsheetId=poster.SHEET_ID, range=ltab + "!D:D").execute().get("values", [])
            seen_mid = set(r[0] for r in ex if r and r[0])
            new_rows = [r for r in new_rows if str(r[3]) not in seen_mid]
        except Exception:
            pass
    # 新着を一覧タブへ追記（アプリが読む）
    if new_rows:
        new_rows.sort(key=lambda r: r[0])
        try:
            sh.values().append(spreadsheetId=poster.SHEET_ID, range=ltab + "!A:D",
                               valueInputOption="RAW", insertDataOption="INSERT_ROWS",
                               body={"values": new_rows}).execute()
        except Exception as e:
            print("[%s][DM] 一覧追記に失敗:" % name, e)

    nowh = datetime.datetime.now(JST).hour
    in_window = (QUIET_FROM <= nowh < QUIET_TO)
    to_notify = len(new_rows) + (pending if in_window else 0)

    if in_window and to_notify > 0:
        try:
            import prepare
            if new_rows:
                latest = new_rows[-1]
                head = "%s さんからDM: %s" % (latest[1], (latest[2][:40] + "…") if len(latest[2]) > 40 else latest[2])
            else:
                head = "夜間に届いたDMがあります"
            title = "%s 新着DM（%d件）" % (name, to_notify)
            prepare.SHEET_ID = poster.SHEET_ID
            prepare.send_push(sh, title, head, _app_url(acct), focus="dm", category="dm", account=acct)
            print("[%s][DM] %d件を通知しました" % (name, to_notify))
            pending = 0
        except Exception as e:
            print("[%s][DM] 通知に失敗:" % name, e)
    elif not in_window:
        pending += len(new_rows)
        if new_rows:
            print("[%s][DM] 新着%d件（%d時＝静音帯%d-%d時のため通知保留・一覧は反映済み・翌朝まとめて通知）"
                  % (name, len(new_rows), nowh, QUIET_FROM, QUIET_TO))
    else:
        print("[%s][DM] 新着なし" % name)

    # state を保存（last_seen前進＋pending件数）
    try:
        sh.values().update(spreadsheetId=poster.SHEET_ID, range=stab + "!A1:B1",
                           valueInputOption="RAW", body={"values": [[newest, pending]]}).execute()
    except Exception as e:
        print("[%s][DM] state更新に失敗:" % name, e)


def main():
    args = [a for a in sys.argv[1:] if a.strip()]
    creds = ""
    if args and args[0].lower().endswith(".json"):
        creds = args[0]; args = args[1:]
    if not creds and os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"])); creds = "creds.json"
    if creds and os.path.abspath(creds) != os.path.abspath("creds.json"):
        import shutil; shutil.copyfile(creds, "creds.json")
    creds = "creds.json"
    if not os.path.exists(creds):
        raise SystemExit("認証JSONが見つかりません。")

    mode = (args[0].strip() if args else "run")
    poster.SHEET_ID = os.environ.get("SHEET_ID") or os.environ.get("STORE_SHEET_ID") or getattr(poster, "SHEET_ID", "")
    for acct in _accounts():
        try:
            run_account(acct, mode)
        except Exception as e:
            print("[%s][DM] 例外（継続）:" % (acct or "三条"), e)


if __name__ == "__main__":
    main()
