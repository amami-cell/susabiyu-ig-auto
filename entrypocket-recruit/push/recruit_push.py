#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
募集システムの「アプリ通知（Webプッシュ）」送信役。

- 募集GASの /exec?push=drain から「新規応募のお知らせ」を取り出す（GASは送信できないため）。
- 既存インスタPWAの VAPID鍵・購読者リスト（インスタ用スプシの「購読」タブ）を再利用して、
  同じアプリに category="recruit" でプッシュする（新しいアプリのインストール不要）。
- 送信は pywebpush。失敗しても他の購読者への送信は続ける。

必要な環境変数（GitHub Actions のシークレット等）:
  RECRUIT_EXEC_URL   募集GASの公開URL（.../exec）。クリック時に開く先にも使う。
  EP_PUSH_KEY        drain保護キー（GAS側 Script Property と一致。未設定なら空でOK）
  SHEET_ID           購読者リストのあるスプレッドシートID（インスタ用と同じ）
  VAPID_PRIVATE_KEY  Web Push 秘密鍵（base64url。インスタ用と同じ）
  VAPID_SUBJECT      mailto:... （任意。未設定は mailto:admin@example.com）
  creds.json         サービスアカウント鍵（ワークフローが GOOGLE_CREDS_B64 から生成）
"""
import base64
import json
import os
import sys

import requests


def _drain(exec_url, key):
    """GASキューから送信待ちを取り出す（sentに更新される）。"""
    try:
        r = requests.get(exec_url, params={"push": "drain", "key": key or ""},
                         timeout=30, allow_redirects=True)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print("[PUSH] drain失敗:", e)
        return []
    if not data.get("ok"):
        print("[PUSH] drain拒否:", data.get("error"))
        return []
    items = data.get("items", [])
    print("[PUSH] 送信待ち %d件" % len(items))
    return items


def _subscribers(sheet_id):
    """購読!A:D を読む。B=subscription JSON, D=カテゴリON/OFF。"""
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(
        "creds.json", scopes=["https://www.googleapis.com/auth/spreadsheets"])
    sh = build("sheets", "v4", credentials=creds).spreadsheets()
    rows = sh.values().get(spreadsheetId=sheet_id, range="購読!A:D").execute().get("values", [])
    return rows[1:] if rows else []


def _vapid_pem(raw):
    """base64url秘密鍵 → PKCS8 PEM を vapid_private.pem に書き出す。"""
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
    pad = "=" * (-len(raw) % 4)
    d = int.from_bytes(base64.urlsafe_b64decode(raw + pad), "big")
    key = ec.derive_private_key(d, ec.SECP256R1())
    pem = key.private_bytes(serialization.Encoding.PEM,
                            serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    open("vapid_private.pem", "wb").write(pem)


def _consolidate(items):
    """溜まった複数件を1つの通知にまとめる（店舗ごとに新規件数を合算）。"""
    merged_new, merged_tot, fallback = {}, {}, []
    for it in items:
        raw = it.get("data") or ""
        parsed = False
        if raw:
            try:
                d = json.loads(raw)
                for s, n in (d.get("newByStore") or {}).items():
                    merged_new[s] = merged_new.get(s, 0) + int(n)
                for s, t in (d.get("totalByStore") or {}).items():
                    merged_tot[s] = int(t)
                parsed = True
            except Exception:
                parsed = False
        if not parsed and it.get("body"):
            fallback.append(it["body"])
    if merged_new:
        total = sum(merged_new.values())
        order = sorted(merged_new, key=lambda k: -merged_new[k])
        lines = ["・%s：新規%d件%s" % (s, merged_new[s], ("（現在%d名）" % merged_tot[s]) if s in merged_tot else "")
                 for s in order]
        return "🆕 新規応募 %d件" % total, "\n".join(lines)
    return "🆕 新規応募", "\n".join(fallback)


def _line_broadcast(text):
    """LINE Messaging API の broadcast（トークン未設定なら何もしない）。"""
    token = (os.environ.get("LINE_CHANNEL_TOKEN") or os.environ.get("EP_LINE_TOKEN") or "").strip()
    if not token:
        print("[LINE] トークン未設定のためスキップ"); return
    try:
        r = requests.post("https://api.line.me/v2/bot/message/broadcast",
                          headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
                          json={"messages": [{"type": "text", "text": text[:4900]}]}, timeout=30)
        print("[LINE] 送信", r.status_code)
    except Exception as e:
        print("[LINE] 送信エラー:", str(e)[:120])


def _category_on(prefs_cell, category):
    """購読者のカテゴリ設定（D列JSON）。未設定は既定ON。"""
    if not category:
        return True
    pr = {}
    if prefs_cell and str(prefs_cell).strip():
        try:
            pr = json.loads(prefs_cell)
        except Exception:
            pr = {}
    return str(pr.get(category, 1)).lower() not in ("0", "false", "off", "no", "なし")


def main():
    exec_url = (os.environ.get("RECRUIT_EXEC_URL") or "").strip()
    key = (os.environ.get("EP_PUSH_KEY") or "").strip()
    sheet_id = (os.environ.get("SHEET_ID") or "").strip()
    vapid_raw = (os.environ.get("VAPID_PRIVATE_KEY") or "").strip()
    subject = (os.environ.get("VAPID_SUBJECT") or "mailto:admin@example.com").strip()

    if not exec_url:
        print("[PUSH] RECRUIT_EXEC_URL 未設定のため終了"); return 0
    items = _drain(exec_url, key)
    if not items:
        return 0

    # 溜まった分を1通にまとめる（1日2回＝1回につき通知1つ）
    title, body = _consolidate(items)

    # ① LINE（まとめて1通）
    _line_broadcast(title + ("\n" + body if body else ""))

    # ② アプリ通知（Webプッシュ）
    if not (sheet_id and vapid_raw):
        print("[PUSH] SHEET_ID / VAPID_PRIVATE_KEY 未設定のためWebプッシュはスキップ"); return 0
    try:
        from pywebpush import webpush, WebPushException
    except Exception as e:
        print("[PUSH] pywebpush 未導入:", e); return 0
    try:
        _vapid_pem(vapid_raw)
    except Exception as e:
        print("[PUSH] VAPID秘密鍵の復元失敗:", e); return 0
    try:
        subs = _subscribers(sheet_id)
    except Exception as e:
        print("[PUSH] 購読の読取失敗:", e); return 0

    payload = json.dumps({"title": title, "body": body, "url": exec_url,
                          "focus": "", "category": "recruit", "tag": "recruit"})
    sent = gone = 0
    for r in subs:
        if len(r) < 2 or not str(r[1]).strip():
            continue
        if not _category_on(r[3] if len(r) > 3 else "", "recruit"):
            continue
        try:
            sub = json.loads(r[1])
        except Exception:
            continue
        try:
            webpush(subscription_info=sub, data=payload,
                    vapid_private_key="vapid_private.pem", vapid_claims={"sub": subject})
            sent += 1
        except WebPushException as e:
            code = getattr(getattr(e, "response", None), "status_code", None)
            if code in (404, 410):
                gone += 1
            else:
                print("[PUSH] 送信失敗(%s):" % code, str(e)[:120])
        except Exception as e:
            print("[PUSH] 送信エラー:", str(e)[:120])
    print("[PUSH] Webプッシュ 送信 %d件 / 期限切れ %d件（まとめ %d件分）" % (sent, gone, len(items)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
