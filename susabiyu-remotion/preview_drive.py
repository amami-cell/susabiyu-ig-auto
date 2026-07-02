# -*- coding: utf-8 -*-
"""専用プレビュー納品（Drive直行版）：動画を専用GAS経由で、あなたのドライブ
「天見プレビュー」フォルダへ保存する。GASがあなたとして実行される＝容量制限なし・完全非公開。

設定: preview_gas.txt（privateリポ）に2行
  1行目: GASウェブアプリURL（…/exec）
  2行目: 合言葉（gas_preview.gs の PV_TOKEN と同じ）

使い方: python preview_drive.py <file1.mp4> "タイトル1" [<file2.mp4> "タイトル2" ...]
"""
import os, sys, json, base64, datetime
import requests as req

JST = datetime.timezone(datetime.timedelta(hours=9))
MAX_MB = 42  # base64膨張後もGASの50MB制限に収まる上限


def _cfg():
    for p in ("preview_gas.txt", "../preview_gas.txt"):
        if os.path.exists(p):
            lines = [l.strip() for l in open(p, encoding="utf-8") if l.strip()]
            if len(lines) >= 2 and lines[0].startswith("http"):
                return lines[0], lines[1]
    print("[PVD] preview_gas.txt がありません（1行目=GAS URL, 2行目=合言葉）")
    sys.exit(1)


def main():
    url, token = _cfg()
    args = sys.argv[1:]
    if not args:
        print("[PVD] ファイルを指定してください"); sys.exit(1)
    pairs = []
    it = iter(args)
    for f in it:
        pairs.append((f, next(it, "")))
    now = datetime.datetime.now(JST).strftime("%m%d_%H%M")
    ok = 0
    for f, title in pairs:
        size_mb = os.path.getsize(f) / 1024 / 1024
        if size_mb > MAX_MB:
            print("[PVD] %s は %.0fMB でGAS上限(%dMB)超え。スキップ" % (f, size_mb, MAX_MB)); continue
        base = os.path.splitext(os.path.basename(f))[0]
        name = "%s_%s%s.mp4" % (now, (title or base).replace(" ", "_")[:40], "")
        b64 = base64.b64encode(open(f, "rb").read()).decode()
        r = None
        for att in range(3):
            try:
                r = req.post(url, json={"token": token, "name": name, "mime": "video/mp4", "b64": b64},
                             timeout=300)
                break
            except Exception as e:
                print("[PVD] 送信リトライ(%d): %s" % (att + 1, e))
        if r is None:
            print("[PVD] %s 送信失敗" % f); continue
        try:
            j = r.json()
        except Exception:
            print("[PVD] 応答が読めません: %s" % r.text[:200]); continue
        if j.get("ok"):
            print("[PVD] 納品OK ✅ %s (%.1fMB)" % (j.get("name"), size_mb))
            print("[PVD] 実行アカウント: %s ／ 保存先: %s (%s)" % (
                j.get("email", "?"), j.get("folderName", "?"), j.get("folder", "?")))
            ok += 1
        else:
            print("[PVD] NG ❌ %s : %s" % (f, j.get("error")))
    print("[PVD] 完了: %d/%d 本" % (ok, len(pairs)))
    if ok < len(pairs):
        sys.exit(1)


if __name__ == "__main__":
    main()
