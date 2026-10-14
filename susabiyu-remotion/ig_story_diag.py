# -*- coding: utf-8 -*-
"""IGストーリー投稿の失敗原因を“公開せずに”診断する。
使い方: python ig_story_diag.py <video_url>
  STORE_ACCOUNT で対象アカウントのトークンを解決（poster.fresh_token_for）。
  media_type=STORIES のコンテナを作成し、status(詳細)/status_code を数十秒ポーリングして
  IGが返す実エラー（例 2207026=動画仕様NG 等）を出力する。media_publish は**呼ばない**（投稿しない）。
"""
import os, sys, time
import poster
import requests as req

B = poster.IGB
ACCOUNT = os.environ.get("STORE_ACCOUNT", "").strip()
url = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
if not url:
    print("usage: python ig_story_diag.py <video_url>"); sys.exit(1)

tok = poster.fresh_token_for(ACCOUNT)
if not tok:
    print("[DIAG] トークン未解決 account=%r（Secret未設定?）" % ACCOUNT); sys.exit(1)

me = req.get(f"{B}/me", params={"fields": "user_id,username", "access_token": tok}).json()
print("[DIAG] account=%r me=%s" % (ACCOUNT, me))
uid = me.get("user_id") or me.get("id")
if not uid:
    print("[DIAG] uid取得失敗（トークン失効?）"); sys.exit(1)

print("[DIAG] video_url=", url)
c = req.post(f"{B}/{uid}/media",
             data={"video_url": url, "media_type": "STORIES", "access_token": tok}).json()
print("[DIAG] media作成応答=", c)
cid = c.get("id")
if not cid:
    print("[DIAG] コンテナ作成失敗＝ここで原因確定（上の応答のerrorを参照）"); sys.exit(0)

for i in range(40):
    s = req.get(f"{B}/{cid}", params={"fields": "status_code,status", "access_token": tok}).json()
    sc = s.get("status_code")
    print("[DIAG] poll%02d status_code=%s status=%s" % (i, sc, s.get("status")))
    if sc == "FINISHED":
        print("[DIAG] => FINISHED（この動画は投稿可能。失敗は一時要因だった可能性）"); break
    if sc == "ERROR":
        print("[DIAG] => ERROR 確定。IGの実エラー=", s.get("status")); break
    time.sleep(5)
else:
    print("[DIAG] タイムアウト（FINISHED/ERROR に至らず）")
print("[DIAG] ※media_publish は呼んでいません＝投稿していません。")
