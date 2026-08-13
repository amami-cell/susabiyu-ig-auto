"""EntryPocket の「メモ保存 / 面接枠登録」の送信APIを特定する読み取り専用プローブ。

- 既存の取得と同じ EP_USER/EP_PASS/EP_LOGIN_URL/EP_APPLICANT_URL でログインし、
  応募者ページの HTML と JS からメモ・面接に関するハンドラ(part=/関数/パラメータ)を探す。
- 一切の書き込み(保存・登録・送信)は行わない。
- ログインフォームが見つからない時は、実際の入力欄構造を全部ログに出して診断する。
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import Settings  # noqa: E402

TOKENS = [
    "changeStatus", "changeMemo", "saveMemo", "updateMemo", "regMemo", "memo",
    "メモ", "面接", "interview", "reserve", "reservation", "schedule", "yoyaku",
    "interviewDate", "interviewAt", "part", "statusKbn", "applyCd",
    "changeInterview", "setInterview", "regInterview", "kbn", "menseki",
]
TOKEN_RE = re.compile("|".join(re.escape(t) for t in TOKENS), re.IGNORECASE)
PART_RE = re.compile(r"""part["'\]\s]*[:=]\s*["']([A-Za-z0-9_]+)["']""")
NS_PARAM_RE = re.compile(r"_applycontrol_WAR_MYNApplyControlportlet_([A-Za-z0-9_]+)")


def _dump_inputs(page, label):
    try:
        inputs = page.eval_on_selector_all(
            "input,textarea,select,button",
            "els => els.slice(0,60).map(e => ({tag:e.tagName, name:e.name||'', id:e.id||'', type:e.type||'', ph:e.placeholder||'', txt:(e.textContent||'').trim().slice(0,20)}))",
        )
        print(f"\n[{label}] url={page.url} title={page.title()!r}")
        for e in inputs:
            print("   ", e)
    except Exception as exc:  # noqa: BLE001
        print(f"[{label}] inputs dump失敗: {exc}")


def _dump_matches(label: str, text: str) -> None:
    if not text:
        return
    parts = sorted(set(PART_RE.findall(text)))
    ns = sorted(set(NS_PARAM_RE.findall(text)))
    print(f"\n===== [{label}] len={len(text)} =====")
    if parts:
        print(f"  part= 候補: {parts}")
    if ns:
        print(f"  namespaceパラメータ: {ns}")
    shown = 0
    for i, line in enumerate(text.splitlines()):
        if TOKEN_RE.search(line):
            snippet = line.strip()
            if len(snippet) > 400:
                snippet = snippet[:400] + "…"
            print(f"  L{i}: {snippet}")
            shown += 1
            if shown >= 100:
                print("  …(以降省略)")
                break
    if shown == 0:
        print("  (トークン一致なし)")


def _find_password(page):
    loc = page.locator("input[type='password']").first
    try:
        if loc.count() > 0:
            return loc
    except Exception:
        pass
    return None


def main() -> int:
    from playwright.sync_api import sync_playwright

    s = Settings.from_env()
    print("login_url=", s.ep_login_url, " applicant_url=", s.ep_applicant_url,
          " user_set=", bool(s.ep_user), " pass_set=", bool(s.ep_pass))
    if not (s.ep_user and s.ep_pass and s.ep_login_url and s.ep_applicant_url):
        print("必要な設定が不足")
        return 1

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context().new_page()

        page.goto(s.ep_login_url, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(2500)
        _dump_inputs(page, "login_url")

        pw = _find_password(page)
        if pw is None:
            # applicant URL に行くとログインへリダイレクトされる作りかもしれない
            page.goto(s.ep_applicant_url, wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(2500)
            _dump_inputs(page, "applicant_url(redirect?)")
            pw = _find_password(page)

        if pw is None:
            print("\nパスワード欄が見つからないため、ここまでの診断で終了（上のINPUTS一覧を確認）。")
            browser.close()
            return 1

        # ユーザー欄＝パスワードより前の text/email/一般 input を採用
        user = None
        for sel in ["#_58_login", "input[name='_58_login']", "input[type='email']",
                    "input[name='username']", "input[name='loginId']", "input[type='text']"]:
            loc = page.locator(sel).first
            try:
                if loc.count() > 0 and loc.is_visible():
                    user = loc
                    break
            except Exception:
                continue
        if user is None:
            print("ユーザー欄が特定できず（パスワード欄はあり）。INPUTS一覧から名前を確認。")
            browser.close()
            return 1

        user.fill(s.ep_user)
        pw.fill(s.ep_pass)
        for sel in ["input[type='submit']", "button[type='submit']",
                    "button:has-text('ログイン')", "input[value='ログイン']"]:
            b = page.locator(sel).first
            try:
                if b.count() > 0 and b.is_visible():
                    b.click()
                    break
            except Exception:
                continue
        page.wait_for_timeout(3000)
        print("\nログイン後:", page.url, page.title())

        page.goto(s.ep_applicant_url, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(2500)

        html = page.content()
        _dump_matches("applicant.html", html)

        srcs = page.eval_on_selector_all("script[src]", "els => els.map(e => e.src)")
        print(f"\n##### script[src] 数: {len(srcs)} #####")
        for u in srcs:
            print("  src:", u)
        for u in srcs:
            try:
                text = page.evaluate("async (u) => { const r = await fetch(u); return await r.text(); }", u)
            except Exception as e:  # noqa: BLE001
                print(f"[JS取得失敗] {u}: {e}")
                continue
            if TOKEN_RE.search(text) or PART_RE.search(text):
                _dump_matches(f"JS {u.split('/')[-1][:60]}", text)

        try:
            handlers = page.eval_on_selector_all(
                "a[onclick],button[onclick],[data-part],[href*='part=']",
                "els => els.slice(0,150).map(e => ({t:e.tagName, txt:(e.textContent||'').trim().slice(0,24), on:(e.getAttribute('onclick')||e.getAttribute('href')||e.getAttribute('data-part')||'').slice(0,220)}))",
            )
            print(f"\n##### onclick/part 付き要素: {len(handlers)} #####")
            for h in handlers:
                if TOKEN_RE.search(h.get("on", "")) or TOKEN_RE.search(h.get("txt", "")):
                    print(f"  <{h['t']} '{h['txt']}'> {h['on']}")
        except Exception as e:  # noqa: BLE001
            print("onclick洗い出し失敗:", e)

        browser.close()
    print("\n===== 調査おわり（書き込みなし・読み取りのみ）=====")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
