# -*- coding: utf-8 -*-
"""IGトークンの毎日ヘルスチェック（投稿はしない）。
・生存確認し、必要なら更新（fresh_token が7日毎に自動更新＝トークンを長生きさせる）
・死んでいれば「1日1回だけ」はっきり通知（投稿失敗スパムにならない）
・引数 reset で、保存トークンをクリアして基底(Secret)から取り直す＝再発行後の復旧

使い方: python token_guard.py [creds.json] [reset]
"""
import os, sys, base64
import poster


def main():
    args = [a for a in sys.argv[1:] if a.strip()]
    creds = ""
    if args and args[0].lower().endswith(".json"):
        creds = args[0]; args = args[1:]
    if not creds and os.environ.get("GOOGLE_CREDS_B64"):
        open("creds.json", "wb").write(base64.b64decode(os.environ["GOOGLE_CREDS_B64"])); creds = "creds.json"
    poster.SHEET_ID = os.environ.get("SHEET_ID", poster.SHEET_ID)

    if args and args[0].strip().lower() == "reset":
        ok = poster.token_reset()
        print("[GUARD] reset:", "復旧OK ✅" if ok else "復旧NG（Secretのトークンも無効＝新規再発行が必要）")
        return

    t = poster.fresh_token()
    ok, me = poster._me_ok(t)
    if ok:
        print("[GUARD] トークン正常 @%s（残り寿命は投稿ワークフローが週次で自動延長）" % me.get("username"))
    else:
        print("[GUARD] トークン異常:", me.get("error"))
        poster.alert_token_dead(str(me.get("error"))[:150])

    # 店舗別アカウント（IG_ACCESS_TOKEN_<ACCOUNT>）も毎日点検＆延命
    accts = sorted(k[len("IG_ACCESS_TOKEN_"):].lower()
                   for k in os.environ if k.startswith("IG_ACCESS_TOKEN_") and os.environ.get(k))
    for acc in accts:
        try:
            aok = poster.guard_account(acc)
            if not aok:
                poster.line_notify("⚠️【要対応】%s のInstagram投稿トークンが無効になりました。再発行が必要です。" % acc)
        except Exception as e:
            print("[GUARD] アカウント '%s' 点検で例外: %s" % (acc, e))


if __name__ == "__main__":
    main()
