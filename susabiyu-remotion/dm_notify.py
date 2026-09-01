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

# 通知の静音時間帯（既定 22:00〜翌8:00 は通知を出さない＝深夜に鳴らさない）。
# 深夜に届いたDMは翌朝この窓に入ってから通知する（記録＝一覧には即時反映）。
QUIET_FROM = int(os.environ.get("DM_QUIET_FROM", "8"))   # 何時から通知してよいか（JST時）
QUIET_TO = int(os.environ.get("DM_QUIET_TO", "22"))      # 何時まで


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
    """会話一覧（新しい順）。graph.instagram.com は platform=instagram 前提。"""
    fields = "id,updated_time,participants"
    for params in (
        {"fields": fields, "limit": limit, "access_token": token},
        {"platform": "instagram", "fields": fields, "limit": limit, "access_token": token},
    ):
        code, j = _get(IGB + "/me/conversations", params)
        if code == 200 and "data" in j:
            return True, j.get("data", []), None
        err = (j.get("error") or {}) if isinstance(j, dict) else {}
        last = err.get("message") or j.get("_raw") or str(code)
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


def run_account(acct, mode):
    name = _stores.get_store(acct).get("store_name") or acct or "三条"
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
        return  # 件数のみ。本文・通知は出さない

    uid, uname = _me_uid(token)
    sh = poster._sheets()
    stab = _state_tab(acct); ltab = _list_tab(acct)
    poster._ensure_tab(sh, stab); poster._ensure_tab(sh, ltab)

    # 既読の最終時刻を state から読む（A1セル）
    last_seen = ""
    try:
        v = sh.values().get(spreadsheetId=poster.SHEET_ID, range=stab + "!A1").execute().get("values", [])
        last_seen = (v[0][0] if v and v[0] else "") or ""
    except Exception:
        pass

    newest = last_seen
    new_rows = []
    for c in convs:
        for m in _messages(token, c.get("id")):
            frm = str((m.get("from") or {}).get("id") or "")
            if frm == uid:
                continue  # 自分（店）の送信は除外＝受信DMだけ
            ct = m.get("created_time", "")
            if last_seen and ct <= last_seen:
                continue
            sender = (m.get("from") or {}).get("username") or frm
            text = (m.get("message") or "").strip()
            new_rows.append([ct, sender, text, m.get("id", "")])
            if ct > newest:
                newest = ct

    if not new_rows:
        print("[%s][DM] 新着なし" % name); return

    # 一覧タブへ追記（アプリが読む）
    new_rows.sort(key=lambda r: r[0])
    try:
        sh.values().append(spreadsheetId=poster.SHEET_ID, range=ltab + "!A:D",
                           valueInputOption="RAW", insertDataOption="INSERT_ROWS",
                           body={"values": new_rows}).execute()
    except Exception as e:
        print("[%s][DM] 一覧追記に失敗:" % name, e)

    # state を進める
    try:
        sh.values().update(spreadsheetId=poster.SHEET_ID, range=stab + "!A1",
                           valueInputOption="RAW", body={"values": [[newest]]}).execute()
    except Exception as e:
        print("[%s][DM] state更新に失敗:" % name, e)

    # 通知（静音時間帯は出さない＝深夜に鳴らさない。一覧には既に反映済み）
    nowh = datetime.datetime.now(JST).hour
    if not (QUIET_FROM <= nowh < QUIET_TO):
        print("[%s][DM] 新着%d件（%d時＝静音帯 %d-%d時のため通知は保留・一覧には反映済み）"
              % (name, len(new_rows), nowh, QUIET_FROM, QUIET_TO))
        return
    try:
        import prepare
        latest = new_rows[-1]
        body = "%s さんからDM: %s" % (latest[1], (latest[2][:40] + "…") if len(latest[2]) > 40 else latest[2])
        title = "%s 新着DM（%d件）" % (name, len(new_rows))
        prepare.SHEET_ID = poster.SHEET_ID
        prepare.send_push(sh, title, body, "./" + (acct or "") , focus="dm", category="dm", account=acct)
        print("[%s][DM] 新着%d件を通知しました" % (name, len(new_rows)))
    except Exception as e:
        print("[%s][DM] 通知に失敗:" % name, e)


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
