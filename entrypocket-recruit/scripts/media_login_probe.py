#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飲食店ドットコム / グルメキャリー に GitHub Actions のランナーからログインできるか、
そして応募者CSVの「書き出し(エクスポート)」がどこにあるかを調べる調査スクリプト。

- ログインは総当り的なヒューリスティック（ID/メール/パスワード欄を推測して入力）。
- ログイン後のページを保存し、CSV/ダウンロード/エクスポート/出力 を含むリンク・ボタン・フォームを列挙。
- スクリーンショットとHTMLを artifacts/ に保存（後で人が見て確認できる）。
- 認証情報は環境変数（GitHub Secrets）から読む。チャット等には出さない。

環境変数:
  INSHOKU_USER / INSHOKU_PASS   … 飲食店ドットコム
  GOURMET_USER / GOURMET_PASS   … グルメキャリー
  (任意) INSHOKU_START_URL / GOURMET_START_URL … 開始URL上書き
"""
import os, sys, re, pathlib
from playwright.sync_api import sync_playwright

OUT = pathlib.Path("entrypocket-recruit/artifacts"); OUT.mkdir(parents=True, exist_ok=True)

SITES = [
    {
        "key": "inshoku",
        "label": "飲食店ドットコム",
        "home": "https://www.inshokuten.com/",
        "start": os.environ.get("INSHOKU_START_URL") or "https://www.inshokuten.com/login/",
        "target": "https://www.inshokuten.com/mypage/recruit/",
        "login_urls": [
            "https://www.inshokuten.com/login/",
            "https://www.inshokuten.com/member/login/",
            "https://www.inshokuten.com/mypage/login/",
            "https://www.inshokuten.com/mypage/",
        ],
        "user": os.environ.get("INSHOKU_USER", ""),
        "pw":   os.environ.get("INSHOKU_PASS", ""),
    },
    {
        "key": "gourmet",
        "label": "グルメキャリー",
        "start": os.environ.get("GOURMET_START_URL") or "https://kanri.gourmetcaree.jp/shop-pc/top/menu/",
        "user": os.environ.get("GOURMET_USER", ""),
        "pw":   os.environ.get("GOURMET_PASS", ""),
        "deep": [
            "https://kanri.gourmetcaree.jp/shop-pc/application/list",
            "https://kanri.gourmetcaree.jp/shop-pc/application/list/",
            "https://kanri.gourmetcaree.jp/shop-pc/applicationMail/list/",
            "https://kanri.gourmetcaree.jp/shop-pc/apply/list",
            "https://kanri.gourmetcaree.jp/shop-pc/applicant/list",
        ],
    },
]

KW = re.compile(r"csv|ダウンロード|エクスポート|出力|ｃｓｖ|download|export", re.I)


def log(*a):
    print(*a, flush=True)


def fill_login(page, user, pw):
    """ログイン欄を推測して入力し送信。成功可否は呼び出し側で判断。"""
    # パスワード欄があるか
    pwsel = "input[type=password]"
    if page.locator(pwsel).count() == 0:
        return False  # ログインフォーム無し（＝既にログイン済み or 別画面）
    # ユーザー欄の候補
    user_selectors = [
        "input[type=email]",
        "input[name*=mail i]", "input[name*=login i]", "input[name*=user i]",
        "input[name*=id i]", "input[name*=account i]", "input[name*=code i]",
        "input[type=text]",
    ]
    filled_user = False
    for s in user_selectors:
        try:
            loc = page.locator(s).first
            if loc.count() > 0 and loc.is_visible():
                loc.fill(user); filled_user = True; break
        except Exception:
            continue
    try:
        page.locator(pwsel).first.fill(pw)
    except Exception:
        pass
    # 送信：submitボタン or ログイン文言 or Enter
    for s in ["button[type=submit]", "input[type=submit]",
              "button:has-text('ログイン')", "a:has-text('ログイン')",
              "button:has-text('ログ')", "input[value*=ログイン]"]:
        try:
            b = page.locator(s).first
            if b.count() > 0 and b.is_visible():
                b.click(); return True
        except Exception:
            continue
    try:
        page.locator(pwsel).first.press("Enter"); return True
    except Exception:
        return filled_user


def scan(page):
    """CSV/ダウンロード系のリンク・ボタン・フォームを列挙。"""
    found = []
    try:
        anchors = page.eval_on_selector_all(
            "a", "els => els.map(e => ({t:(e.textContent||'').trim().slice(0,40), href:e.href||''}))")
    except Exception:
        anchors = []
    for a in anchors:
        if KW.search((a.get("t") or "") + " " + (a.get("href") or "")):
            found.append("A  | " + (a["t"] or "") + " | " + (a["href"] or ""))
    try:
        btns = page.eval_on_selector_all(
            "button,input[type=button],input[type=submit]",
            "els => els.map(e => ({t:((e.textContent||e.value)||'').trim().slice(0,40)}))")
    except Exception:
        btns = []
    for b in btns:
        if KW.search(b.get("t") or ""):
            found.append("BTN| " + (b["t"] or ""))
    try:
        forms = page.eval_on_selector_all(
            "form", "els => els.map(e => ({a:e.action||'', m:e.method||''}))")
    except Exception:
        forms = []
    for f in forms:
        if KW.search(f.get("a") or ""):
            found.append("FORM| " + (f["m"] or "") + " " + (f["a"] or ""))
    return found


def run_site(pw_ctx, site):
    log("\n==================== " + site["label"] + " (" + site["key"] + ") ====================")
    if not site["user"] or not site["pw"]:
        log("  [SKIP] 認証情報(Secret)が未設定: " + site["key"].upper() + "_USER / _PASS")
        return
    page = pw_ctx.new_page()
    page.set_default_timeout(30000)
    try:
        # 到達性（トップページがデータセンターから見えるか＝IPブロックの切り分け）
        if site.get("home"):
            try:
                hr = page.request.get(site["home"])
                log("  home reachability: " + str(hr.status) + " (" + site["home"] + ")")
            except Exception as e:
                log("  home reachability err: " + str(e))
        # ログインURL候補を順に開き、パスワード欄がある画面でログイン
        login_urls = site.get("login_urls") or [site["start"]]
        logged = False
        for lu in login_urls:
            try:
                page.goto(lu, wait_until="domcontentloaded"); page.wait_for_timeout(2000)
                has_pw = page.locator("input[type=password]").count() > 0
                is403 = "403" in (page.title() or "") or "forbidden" in (page.content() or "").lower()[:400]
                log("  login try " + lu + " -> " + str(page.status if hasattr(page, 'status') else '') + " title=" + (page.title() or "")[:40] + " pw=" + str(has_pw) + " 403=" + str(is403))
                if has_pw:
                    if fill_login(page, site["user"], site["pw"]):
                        try:
                            page.wait_for_load_state("networkidle", timeout=15000)
                        except Exception:
                            pass
                        page.wait_for_timeout(2000)
                        logged = page.locator("input[type=password]").count() == 0
                        log("  after login url=" + page.url + " title=" + (page.title() or "")[:40] + " ok=" + str(logged))
                    break
            except Exception as e:
                log("  login try err " + lu + ": " + str(e))
        # ログイン後、目的ページ（会員の応募者一覧）へ
        if site.get("target"):
            try:
                page.goto(site["target"], wait_until="domcontentloaded"); page.wait_for_timeout(2500)
                log("  target url=" + page.url + " title=" + (page.title() or "")[:50])
            except Exception as e:
                log("  target err: " + str(e))
        did = False
        if False:
            try:
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass
            page.wait_for_timeout(2500)
            log("  after login url=" + page.url + "  title=" + (page.title() or ""))
        else:
            log("  (ログインフォーム見つからず＝既にログイン済み or 画面違い)")
        # ログイン成功の目安：パスワード欄が消えたか
        still_login = page.locator("input[type=password]").count() > 0
        log("  still_has_password_field=" + str(still_login))
        # 保存
        try:
            page.screenshot(path=str(OUT / (site["key"] + "_after.png")), full_page=True)
        except Exception as e:
            log("  screenshot err: " + str(e))
        try:
            (OUT / (site["key"] + "_after.html")).write_text(page.content(), encoding="utf-8")
        except Exception:
            pass
        # CSV系の導線を探す
        hits = scan(page)
        log("  --- CSV/ダウンロード候補 (現在ページ) ---")
        if hits:
            for h in hits:
                log("    " + h)
        else:
            log("    （現在ページには見当たらず。応募者一覧ページへ遷移が必要かも）")
        # ページ内リンクを全部出す（一覧ページ/CSV書き出しへの導線探し用）
        try:
            links = page.eval_on_selector_all(
                "a", "els => els.slice(0,200).map(e => ((e.textContent||'').trim().slice(0,30)+' :: '+(e.href||'')))")
            log("  --- 全リンク(" + str(len(links)) + ") ---")
            for x in links:
                if x.strip().startswith("::"):
                    continue
                log("    " + x)
        except Exception:
            pass
        # 応募者一覧の候補ページを訪ねてCSV書き出しを探す
        for u in site.get("deep", []):
            try:
                log("  >> visit: " + u)
                page.goto(u, wait_until="domcontentloaded"); page.wait_for_timeout(2000)
                log("     url=" + page.url + " title=" + (page.title() or ""))
                hh = scan(page)
                if hh:
                    for h in hh:
                        log("       " + h)
                else:
                    log("       (CSV導線なし)")
                # このページのフォーム/ボタンのテキストも少し出す
                try:
                    btns = page.eval_on_selector_all("button,input[type=submit],a.btn,a[class*=btn]",
                        "els => els.slice(0,40).map(e => ((e.textContent||e.value||'').trim().slice(0,24)))")
                    bt = [b for b in btns if b]
                    if bt:
                        log("       btns: " + " | ".join(bt[:20]))
                except Exception:
                    pass
                try:
                    page.screenshot(path=str(OUT / (site["key"] + "_" + re.sub(r'[^a-zA-Z]+','_',u)[-30:] + ".png")))
                except Exception:
                    pass
            except Exception as e:
                log("     visit err: " + str(e))
    except Exception as e:
        log("  [ERROR] " + repr(e))
        try:
            page.screenshot(path=str(OUT / (site["key"] + "_error.png")))
        except Exception:
            pass
    finally:
        page.close()


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = b.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            locale="ja-JP", viewport={"width": 1280, "height": 1800})
        for s in SITES:
            try:
                run_site(ctx, s)
            except Exception as e:
                log("site fatal: " + repr(e))
        b.close()


if __name__ == "__main__":
    main()
