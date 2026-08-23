#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
募集システムの「アプリ通知（Webプッシュ）」送信役。

- 募集GASの /exec?push=drain から「新規応募のお知らせ」を取り出す（GASは送信できないため）。
- 既存インスタPWAの VAPID鍵・購読者リスト（インスタ用スプシの「購読」タブ）を再利用して、
  同じアプリに category="recruit" でプッシュする（新しいアプリのインストール不要）。
- 送信は pywebpush。失敗しても他の購読者への送信は続ける。
- 購読者ごとの prefs（D列JSON）で「通知する店舗」を絞れる（stores 未設定＝全店舗＝従来通り）。

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
        # JSONで無い＝ログイン画面等が返っている可能性。原因が分かるよう状態を出す。
        try:
            snippet = (r.text or "")[:200].replace("\n", " ")
            print("[PUSH] drain失敗:", e, "| HTTP", r.status_code, "| body:", snippet)
        except Exception:
            print("[PUSH] drain失敗:", e)
        return []
    if not data.get("ok"):
        print("[PUSH] drain拒否:", data.get("error"))
        return []
    items = data.get("items", [])
    print("[PUSH] 送信待ち %d件" % len(items))
    return items


def _recruit_subscribers(exec_url, key):
    """求人PWAの購読者を募集GAS(?subs=list)から読む。[{subscription, prefs, endpoint}] を返す。"""
    try:
        r = requests.get(exec_url, params={"subs": "list", "key": key or ""}, timeout=30, allow_redirects=True)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        try:
            print("[PUSH] 購読取得失敗:", e, "| HTTP", r.status_code, "| body:", (r.text or "")[:160].replace("\n", " "))
        except Exception:
            print("[PUSH] 購読取得失敗:", e)
        return []
    if not data.get("ok"):
        print("[PUSH] 購読取得拒否:", data.get("error")); return []
    return data.get("subs", [])


def _prune_dead(exec_url, key, endpoints):
    """失効(404/410)したendpointを募集GAS(?subs=prune)に伝えて掃除する。"""
    if not endpoints:
        return
    try:
        requests.get(exec_url, params={"subs": "prune", "key": key or "", "eps": ",".join(endpoints)},
                     timeout=30, allow_redirects=True)
        print("[PUSH] 失効購読を掃除:", len(endpoints), "件")
    except Exception as e:
        print("[PUSH] 掃除失敗:", str(e)[:120])


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


def _extract(items):
    """溜まったitemsから 店舗別新規(merged_new)・店舗別現在数(merged_tot)・その他(fallback) を取り出す。"""
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
        if not parsed and (it.get("body") or it.get("title")):
            fallback.append((it.get("title") or "", it.get("body") or ""))
    return merged_new, merged_tot, fallback


def _compose(merged_new, merged_tot, fallback):
    """指定の店舗別新規＋その他 から (title, body) を作る。新規応募がある場合は下にその他本文も付す。"""
    if merged_new:
        total = sum(merged_new.values())
        order = sorted(merged_new, key=lambda k: -merged_new[k])
        lines = ["・%s：新規%d件%s" % (s, merged_new[s], ("（現在%d名）" % merged_tot[s]) if s in merged_tot else "")
                 for s in order]
        title = "🆕 新規応募 %d件" % total
        body = "\n".join(lines)
        fb = "\n".join(b for _, b in fallback if b)
        if fb:
            body = body + "\n\n" + fb
        return title, body
    if len(fallback) == 1:
        return (fallback[0][0] or "お知らせ"), fallback[0][1]
    titles = "／".join(t for t, _ in fallback if t)
    bodies = "\n".join(b for _, b in fallback if b)
    return (titles or "お知らせ"), bodies


def _consolidate(items):
    """LINE用：全店舗まとめて1通に（従来どおり）。"""
    merged_new, merged_tot, fallback = _extract(items)
    if merged_new:
        total = sum(merged_new.values())
        order = sorted(merged_new, key=lambda k: -merged_new[k])
        lines = ["・%s：新規%d件%s" % (s, merged_new[s], ("（現在%d名）" % merged_tot[s]) if s in merged_tot else "")
                 for s in order]
        return "🆕 新規応募 %d件" % total, "\n".join(lines)
    if len(fallback) == 1:
        return (fallback[0][0] or "お知らせ"), fallback[0][1]
    titles = "／".join(t for t, _ in fallback if t)
    bodies = "\n".join(b for _, b in fallback if b)
    return (titles or "お知らせ"), bodies


def _norm_store(s):
    """店舗名の照合用に軽く正規化（前後空白と全角/半角スペース除去）。"""
    return "".join(str(s or "").split()).replace("　", "")


def _prefs_stores(prefs_cell):
    """購読者の「通知する店舗」設定。None＝全店舗（従来通り）。set＝その店舗のみ。"""
    if not prefs_cell or not str(prefs_cell).strip():
        return None
    try:
        pr = json.loads(prefs_cell)
    except Exception:
        return None
    st = pr.get("stores")
    if st is None:
        return None  # 店舗指定なし＝全店舗
    if isinstance(st, str):
        if st.strip().lower() in ("all", ""):
            return None
        st = st.split(",")
    if isinstance(st, list):
        out = set(_norm_store(x) for x in st if str(x).strip())
        return out  # 空set＝新規応募の個別通知は無し（サマリー等は届く）
    return None


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

    # 店舗別の新規／その他を取り出す（購読者ごとの絞り込みに使う）
    merged_new, merged_tot, fallback = _extract(items)

    # ① LINE（全店舗まとめて1通・従来どおり）
    title, body = _consolidate(items)
    _line_broadcast(title + ("\n" + body if body else ""))

    # ② アプリ通知（Webプッシュ）→ 求人PWAの購読者へ（インスタとは別リスト）
    if not vapid_raw:
        print("[PUSH] VAPID_PRIVATE_KEY 未設定のためWebプッシュはスキップ"); return 0
    try:
        from pywebpush import webpush, WebPushException
    except Exception as e:
        print("[PUSH] pywebpush 未導入:", e); return 0
    try:
        _vapid_pem(vapid_raw)
    except Exception as e:
        print("[PUSH] VAPID秘密鍵の復元失敗:", e); return 0
    subs = _recruit_subscribers(exec_url, key)
    if not subs:
        print("[PUSH] 求人PWAの購読者がまだ0人（LINEは送信済み）"); return 0

    sent = gone = skipped = 0
    dead = []
    for s in subs:
        raw = s.get("subscription") or ""
        if not str(raw).strip():
            continue
        prefs = s.get("prefs") or ""
        if not _category_on(prefs, "recruit"):
            continue
        # 購読者ごとに「通知する店舗」で新規応募を絞る（未設定＝全店舗）
        allow = _prefs_stores(prefs)
        if allow is None:
            sub_new = merged_new
        else:
            sub_new = {k: v for k, v in merged_new.items() if _norm_store(k) in allow}
        # この購読者に送る中身が無ければスキップ（新規も その他も無し）
        if not sub_new and not fallback:
            skipped += 1
            continue
        s_title, s_body = _compose(sub_new, merged_tot, fallback)
        payload = json.dumps({"title": s_title, "body": s_body, "url": exec_url,
                              "focus": "", "category": "recruit", "tag": "recruit"})
        try:
            sub = json.loads(raw)
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
                if s.get("endpoint"):
                    dead.append(s["endpoint"])
            else:
                print("[PUSH] 送信失敗(%s):" % code, str(e)[:120])
        except Exception as e:
            print("[PUSH] 送信エラー:", str(e)[:120])
    print("[PUSH] Webプッシュ 送信 %d件 / 対象外 %d件 / 期限切れ %d件（まとめ %d件分）"
          % (sent, skipped, gone, len(items)))
    _prune_dead(exec_url, key, dead)
    return 0


if __name__ == "__main__":
    sys.exit(main())
