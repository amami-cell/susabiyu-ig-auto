"""Playwright でEPにログインし、応募者CSVをダウンロードする。

セレクタは config/selectors.json で指定できる。空なら自動検出を試みる。
どの画面で止まったか分かるよう、各段階でスクリーンショットを artifacts に残す。
"""
from __future__ import annotations

from pathlib import Path

from .config import Settings

# 自動検出に使う候補セレクタ（当たれば selectors.json 不要）
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
CSV_BTN_CANDIDATES = [
    "a:has-text('CSVダウンロード')", "button:has-text('CSVダウンロード')",
    "a:has-text('CSV出力')", "button:has-text('CSV出力')",
    "a:has-text('CSV')", "button:has-text('CSV')",
    "a:has-text('ダウンロード')",
]


def _first_visible(page, configured: str, candidates: list[str]):
    """設定値が空でなければそれを優先、無ければ候補から最初に見えるものを返す。"""
    if configured:
        loc = page.locator(configured).first
        try:
            return loc if loc.count() > 0 else None
        except Exception:
            return None
    for sel in candidates:
        loc = page.locator(sel).first
        try:
            if loc.count() > 0 and loc.is_visible():
                return loc
        except Exception:
            continue
    return None


def _auto_username_field(page):
    """候補で当たらない時の保険：パスワード欄の直前にある見えるテキスト入力欄を返す。

    ログイン画面はほぼ必ず「ID欄→パスワード欄」の順に並ぶので、パスワード欄を
    基準に、その手前で一番近い入力欄をID欄とみなす。これで多くのサイトに当たる。
    """
    try:
        handle = page.evaluate_handle(
            """() => {
                const isVis = el => !!(el.offsetParent || el.getClientRects().length);
                const skip = ['password','hidden','checkbox','radio','submit','button','file','image','reset'];
                const inputs = [...document.querySelectorAll('input, textarea')].filter(el => {
                    const t = (el.getAttribute('type') || 'text').toLowerCase();
                    return isVis(el) && !skip.includes(t);
                });
                const pw = document.querySelector('input[type="password"]');
                if (pw) {
                    const before = inputs.filter(el =>
                        el.compareDocumentPosition(pw) & Node.DOCUMENT_POSITION_FOLLOWING);
                    if (before.length) return before[before.length - 1];
                }
                return inputs[0] || null;
            }"""
        )
        return handle.as_element()
    except Exception:
        return None


def _shot(page, artifacts_dir: Path, name: str) -> None:
    try:
        artifacts_dir.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(artifacts_dir / f"{name}.png"), full_page=True)
    except Exception:
        pass


def _run_pre_export_actions(page, actions: list[dict]) -> None:
    """CSV出力前の検索条件セットなどを実行する。"""
    for act in actions:
        kind = act.get("type")
        sel = act.get("selector", "")
        val = act.get("value")
        if kind == "select":
            page.select_option(sel, str(val))
        elif kind == "fill":
            page.fill(sel, str(val))
        elif kind == "click":
            page.click(sel)
        elif kind == "wait":
            page.wait_for_timeout(int(val or 1000))


def fetch_csv(settings: Settings) -> bytes:
    """ログイン→応募者一覧→CSV出力 を行い、CSVのバイト列を返す。"""
    from playwright.sync_api import sync_playwright

    settings.require_for_fetch()
    artifacts = settings.artifacts_dir
    sel = settings.selectors

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=settings.headless)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        try:
            # --- ログイン画面 ---
            page.goto(settings.ep_login_url, wait_until="domcontentloaded", timeout=60000)
            # SPA等でフォームが遅れて描画される場合に備え、パスワード欄の出現を待つ
            try:
                page.wait_for_selector(
                    "input[type='password']", timeout=15000, state="visible"
                )
            except Exception:
                pass
            page.wait_for_timeout(800)
            _shot(page, artifacts, "01_login")

            pw = _first_visible(page, sel.get("login_pass", ""), PASS_CANDIDATES)
            user = _first_visible(page, sel.get("login_user", ""), USER_CANDIDATES)
            if not user and not sel.get("login_user"):
                # 候補で当たらなければ、パスワード欄の直前の入力欄をIDとみなす
                user = _auto_username_field(page)
            if not user or not pw:
                _shot(page, artifacts, "01_login_fields_not_found")
                raise RuntimeError(
                    "ログインフォームが見つかりません。config/selectors.json を設定してください。"
                )
            user.fill(settings.ep_user)
            pw.fill(settings.ep_pass)

            btn = _first_visible(page, sel.get("login_button", ""), LOGIN_BTN_CANDIDATES)
            if btn:
                btn.click()
            else:
                pw.press("Enter")
            page.wait_for_load_state("networkidle", timeout=60000)
            page.wait_for_timeout(1500)
            _shot(page, artifacts, "02_after_login")

            # --- 応募者一覧 ---
            page.goto(settings.ep_applicant_url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(1500)
            _shot(page, artifacts, "03_applicants")

            # --- CSV出力前の検索条件 ---
            actions = settings.search_params.get("pre_export_actions", [])
            if actions:
                _run_pre_export_actions(page, actions)
                page.wait_for_timeout(1000)
                _shot(page, artifacts, "04_after_search")

            # --- CSV出力 ---
            csv_btn = _first_visible(page, sel.get("csv_button", ""), CSV_BTN_CANDIDATES)
            if not csv_btn:
                _shot(page, artifacts, "05_csv_button_not_found")
                raise RuntimeError(
                    "CSV出力ボタンが見つかりません。config/selectors.json の csv_button を設定してください。"
                )
            with page.expect_download(timeout=60000) as dl_info:
                csv_btn.click()
            download = dl_info.value
            settings.download_dir.mkdir(parents=True, exist_ok=True)
            saved = settings.download_dir / (download.suggested_filename or "applicants.csv")
            download.save_as(str(saved))
            _shot(page, artifacts, "06_downloaded")
            return saved.read_bytes()
        finally:
            context.close()
            browser.close()
