#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
グルメキャリー顧客管理から応募者CSVを自動取得し、募集アプリ(GAS)へ投入する。
GitHub Actions（データセンターIP）からログイン可能なことを確認済み。

流れ:
  1) ログイン（ヒューリスティックにID/パスワード欄を埋めて送信）
  2) 応募メール一覧 /shop-pc/applicationMail/list/ を開く
  3) 「ユーザー情報のCSV出力」ボタンでCSVをダウンロード
  4) GAS の doPost {api:media_importcsv, media:'gourmet', b64:...} へ送信（重複は自動スキップ）

環境変数（GitHub Secrets）:
  GOURMET_USER / GOURMET_PASS / RECRUIT_EXEC_URL
"""
import os, sys, base64, json, urllib.request
from playwright.sync_api import sync_playwright

EXEC = (os.environ.get("RECRUIT_EXEC_URL") or "").strip() or \
    "https://script.google.com/macros/s/AKfycbz6i36c7UjbM3S44kl1kEcsI0CSjYo9jL-W-T4BJUAr9jmBlVXj-vnQTUwQbGoxcHYT/exec"
USER = os.environ.get("GOURMET_USER", "")
PW   = os.environ.get("GOURMET_PASS", "")
MENU = "https://kanri.gourmetcaree.jp/shop-pc/top/menu/"
LIST = "https://kanri.gourmetcaree.jp/shop-pc/applicationMail/list/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"


def log(*a):
    print(*a, flush=True)


def post_csv(media, data: bytes) -> str:
    b64 = base64.b64encode(data).decode()
    payload = {"api": "media_importcsv", "media": media, "b64": b64}
    ingest = (os.environ.get("RECRUIT_INGEST_KEY") or "").strip()
    if ingest:
        payload["key"] = ingest   # EP_INGEST_KEY をarmしている場合に必要（未設定なら無くても通る）
    body = json.dumps(payload).encode()
    req = urllib.request.Request(EXEC, data=body,
                                 headers={"Content-Type": "text/plain;charset=utf-8"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode("utf-8", "replace")


def do_login(page):
    if page.locator("input[type=password]").count() == 0:
        return True  # 既にログイン済み
    for s in ["input[type=email]", "input[name*=mail i]", "input[name*=login i]",
              "input[name*=user i]", "input[name*=id i]", "input[name*=account i]", "input[type=text]"]:
        loc = page.locator(s).first
        try:
            if loc.count() > 0 and loc.is_visible():
                loc.fill(USER); break
        except Exception:
            continue
    try:
        page.locator("input[type=password]").first.fill(PW)
    except Exception:
        pass
    for s in ["button[type=submit]", "input[type=submit]", "button:has-text('ログイン')",
              "input[value*=ログイン]", "button:has-text('ログ')"]:
        try:
            b = page.locator(s).first
            if b.count() > 0 and b.is_visible():
                b.click(); break
        except Exception:
            continue
    else:
        try:
            page.locator("input[type=password]").first.press("Enter")
        except Exception:
            pass
    try:
        page.wait_for_load_state("networkidle", timeout=20000)
    except Exception:
        pass
    page.wait_for_timeout(2000)
    return page.locator("input[type=password]").count() == 0


def main():
    if not EXEC or not USER or not PW:
        log("[FAIL] 環境変数 RECRUIT_EXEC_URL / GOURMET_USER / GOURMET_PASS が必要"); sys.exit(1)
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = b.new_context(accept_downloads=True, locale="ja-JP", user_agent=UA,
                            viewport={"width": 1280, "height": 1600})
        page = ctx.new_page(); page.set_default_timeout(30000)
        try:
            page.goto(MENU, wait_until="domcontentloaded"); page.wait_for_timeout(1500)
            if not do_login(page):
                log("[FAIL] ログインできず（ID/パスワードを確認）"); sys.exit(1)
            log("login ok: " + page.url + " / " + (page.title() or ""))

            page.goto(LIST, wait_until="domcontentloaded")
            try:
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass
            page.wait_for_timeout(2000)
            log("list page: " + page.url + " / " + (page.title() or ""))

            page.set_default_timeout(15000)
            # 確認ダイアログ(confirm/alert)は自動でOK
            page.on("dialog", lambda d: (log("dialog: " + (d.message or "")[:100]), d.accept()))

            # 行の全選択（選択必須なCSV出力に備える。まずヘッダの全選択、無ければ各行を短時間で）
            def try_select_all():
                for s in ["thead input[type=checkbox]", "th input[type=checkbox]",
                          "input[type=checkbox][name*=all i]", "input[type=checkbox][onclick*=all i]",
                          "input#checkall", "input.checkall", "input[type=checkbox][id*=all i]"]:
                    try:
                        loc = page.locator(s).first
                        if loc.count() > 0 and loc.is_visible():
                            loc.check(timeout=2000); log("select-all via " + s); return True
                    except Exception:
                        continue
                return False
            if not try_select_all():
                try:
                    boxes = page.locator("form input[type=checkbox], table input[type=checkbox]")
                    n = min(boxes.count(), 80); c = 0
                    for i in range(n):
                        try:
                            boxes.nth(i).check(timeout=1500); c += 1
                        except Exception:
                            continue
                    log("checked " + str(c) + "/" + str(n))
                except Exception as e:
                    log("select fallback skip: " + str(e))

            # CSV出力ボタンを特定
            csv_btn = None
            for s in ["input[value*='CSV出力']", "button:has-text('CSV出力')", "a:has-text('CSV出力')",
                      "input[value*='CSV']", "button:has-text('CSV')", "a:has-text('CSV')"]:
                loc = page.locator(s).first
                try:
                    if loc.count() > 0:
                        csv_btn = loc; log("csv button: " + s); break
                except Exception:
                    continue
            if csv_btn is None:
                log("[FAIL] CSV出力ボタンが見つからない"); sys.exit(1)
            # ボタン＆フォームの実物を出す（仕組み確定用）
            try:
                info = csv_btn.evaluate(
                    "e=>({outer:(e.outerHTML||'').slice(0,300),"
                    "form:((e.form&&e.form.action)||''),fm:((e.form&&e.form.method)||''),"
                    "name:(e.name||''),val:(e.value||''),"
                    "inputs:(e.form?Array.from(e.form.querySelectorAll('input,select,button')).slice(0,40)"
                    ".map(x=>((x.tagName)+'['+(x.type||'')+'] '+(x.name||'')+'='+(String(x.value||'').slice(0,16)))):[])})")
                log("csv btn outer: " + str(info.get("outer")))
                log("csv form: " + str(info.get("form")) + " [" + str(info.get("fm")) + "]  btnname=" + str(info.get("name")) + " val=" + str(info.get("val")))
                for x in (info.get("inputs") or []):
                    log("   input: " + str(x))
            except Exception as e:
                log("btn info err: " + str(e))

            data = None

            def looks_csv(bts):
                if not bts or len(bts) < 50:
                    return False
                head = bts[:400].decode("ascii", "replace").lower()
                return ("<html" not in head) and ("<!doctype" not in head) and (b"," in bts[:400])

            # フォーム全項目を再現してexportCsvへPOST（全応募者IDを含める）
            info = csv_btn.evaluate(
                "e=>{var f=e.form;var action=e.getAttribute('formaction')||f.action;var out=[];"
                "f.querySelectorAll('input,select,textarea').forEach(function(x){if(!x.name)return;"
                "if(x.type==='checkbox'||x.type==='radio'){if(x.name==='selectedMailIds'||x.checked)out.push([x.name,x.value]);}"
                "else if(x.tagName==='SELECT'){out.push([x.name,x.value]);}"
                "else{out.push([x.name,x.value]);}});"
                "return {action:action, pairs:out};}")
            import urllib.parse
            action = urllib.parse.urljoin(page.url, info["action"])
            pairs = info["pairs"]
            log("form action=" + action + " fields=" + str(len(pairs)))
            body = urllib.parse.urlencode([(k, v) for k, v in pairs])
            try:
                r = page.request.post(action, data=body,
                                      headers={"content-type": "application/x-www-form-urlencoded"})
                bd = r.body()
                log("exportCsv POST: " + str(r.status) + " ct=" + (r.headers.get("content-type") or "") + " len=" + str(len(bd)))
                if r.ok and looks_csv(bd):
                    data = bd; log("via form-replay POST")
            except Exception as e:
                log("form-replay err: " + str(e))

            # フォールバック: クリックでダウンロードが出るなら拾う
            if not data:
                try:
                    with page.expect_download(timeout=12000) as di:
                        csv_btn.click()
                    with open(di.value.path(), "rb") as f:
                        d = f.read()
                    if looks_csv(d):
                        data = d; log("via download event " + str(len(d)) + "B")
                except Exception as e:
                    log("download fallback err: " + str(e))

            # 診断保存
            try:
                import pathlib
                od = pathlib.Path("entrypocket-recruit/artifacts"); od.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(od / "gourmet_after_click.png"), full_page=True)
                (od / "gourmet_after_click.html").write_text(page.content(), encoding="utf-8")
            except Exception:
                pass

            if not data or len(data) < 50:
                log("[FAIL] CSVを取得できず（サイズ不足）"); sys.exit(1)
            log("csv bytes = " + str(len(data)))

            res = post_csv("gourmet", data)
            log("app response: " + res[:300])
            log("=== done ===")
        except Exception as e:
            log("[ERROR] " + repr(e)); sys.exit(1)
        finally:
            b.close()


if __name__ == "__main__":
    main()
