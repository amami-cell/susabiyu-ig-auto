"""EntryPocket の「メモ保存 / 面接枠登録」の送信APIを特定するための読み取り専用プローブ。

- 既存の取得と同じ EP_USER/EP_PASS/EP_LOGIN_URL/EP_APPLICANT_URL でログインし、
  応募者ページの HTML と読み込まれる JS を取得して、メモ・面接に関する
  ハンドラ（part=... / 関数名 / パラメータ名）を探して標準出力に出す。
- 一切の書き込み（保存・登録・送信）は行わない。クリックによる送信もしない。
- 実行は GitHub Actions（ep-probe ワークフロー）。結果は Actions のログで確認する。
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import Settings  # noqa: E402

USER_CANDIDATES = [
    "#_58_login", "input[name='_58_login']", "#username", "input[name='username']",
    "input[name='loginId']", "input[name='login_id']", "input[name='userId']",
    "input[type='email']", "input[name='email']", "input[name='id']",
]
PASS_CANDIDATES = [
    "#_58_password", "input[name='_58_password']", "input[name='password']",
    "input[type='password']",
]
LOGIN_BTN_CANDIDATES = [
    "input[type='submit']", "button[type='submit']",
    "button:has-text('ログイン')", "input[value='ログイン']", "a:has-text('ログイン')",
]

# 探したいトークン（メモ保存・面接枠登録に関係しそうなもの）
TOKENS = [
    "changeStatus", "changeMemo", "saveMemo", "updateMemo", "regMemo", "memo",
    "メモ", "面接", "interview", "reserve", "reservation", "schedule", "yoyaku",
    "interviewDate", "interviewAt", "menaceDate", "part", "statusKbn", "applyCd",
    "changeInterview", "setInterview", "regInterview", "kbn",
]
TOKEN_RE = re.compile("|".join(re.escape(t) for t in TOKENS), re.IGNORECASE)
PART_RE = re.compile(r"""part["'\]\s]*[:=]\s*["']([A-Za-z0-9_]+)["']""")
NS_PARAM_RE = re.compile(r"_applycontrol_WAR_MYNApplyControlportlet_([A-Za-z0-9_]+)")


def _first_visible(page, candidates):
    for sel in candidates:
        loc = page.locator(sel).first
        try:
            if loc.count() > 0 and loc.is_visible():
                return loc
        except Exception:
            continue
    return None


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
    # トークンを含む行を最大80行、前後の文脈込みで出す
    lines = text.splitlines()
    shown = 0
    for i, line in enumerate(lines):
        if TOKEN_RE.search(line):
            snippet = line.strip()
            if len(snippet) > 400:
                snippet = snippet[:400] + "…"
            print(f"  L{i}: {snippet}")
            shown += 1
            if shown >= 80:
                print("  …(以降は省略)")
                break
    if shown == 0:
        print("  (トークン一致なし)")


def main() -> int:
    from playwright.sync_api import sync_playwright

    s = Settings.from_env()
    if not (s.ep_user and s.ep_pass and s.ep_login_url and s.ep_applicant_url):
        print("必要な設定が不足（EP_USER/EP_PASS/EP_LOGIN_URL/EP_APPLICANT_URL）")
        return 1

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        page = ctx.new_page()

        page.goto(s.ep_login_url, wait_until="domcontentloaded", timeout=60000)
        user = _first_visible(page, USER_CANDIDATES)
        pw = _first_visible(page, PASS_CANDIDATES)
        if not (user and pw):
            print("ログイン欄が見つからず")
            return 1
        user.fill(s.ep_user)
        pw.fill(s.ep_pass)
        btn = _first_visible(page, LOGIN_BTN_CANDIDATES)
        if btn:
            btn.click()
        page.wait_for_timeout(2500)

        page.goto(s.ep_applicant_url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(2000)

        # 1) 応募者ページ本体のHTML
        html = page.content()
        _dump_matches("applicant.html", html)

        # 2) 読み込まれている script src 一覧＋各中身（同一オリジンをブラウザ内fetch）
        srcs = page.eval_on_selector_all(
            "script[src]", "els => els.map(e => e.src)"
        )
        print(f"\n##### script[src] 数: {len(srcs)} #####")
        for u in srcs:
            print("  src:", u)
        for u in srcs:
            try:
                text = page.evaluate(
                    "async (u) => { const r = await fetch(u); return await r.text(); }", u
                )
            except Exception as e:  # noqa: BLE001
                print(f"\n[JS取得失敗] {u}: {e}")
                continue
            if TOKEN_RE.search(text) or PART_RE.search(text):
                _dump_matches(f"JS {u.split('/')[-1][:60]}", text)

        # 3) 応募者の詳細（メモ/面接UI）がモーダルで別ロードの場合に備え、
        #    行内のボタン・リンクの onclick を洗い出す（クリックはしない＝送信しない）
        try:
            handlers = page.eval_on_selector_all(
                "a[onclick],button[onclick],[data-part],[href*='part=']",
                "els => els.slice(0,120).map(e => ({t:e.tagName, txt:(e.textContent||'').trim().slice(0,20), on:(e.getAttribute('onclick')||e.getAttribute('href')||e.getAttribute('data-part')||'').slice(0,200)}))",
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
