"""Playwright でEPにログインし、応募者CSVをダウンロードする。

セレクタは config/selectors.json で指定できる。空なら自動検出を試みる。
どの画面で止まったか分かるよう、各段階でスクリーンショットを artifacts に残す。
"""
from __future__ import annotations

import os
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


def _dump_login_diagnostics(page) -> None:
    """ログインフォームが見つからない時、実行ログに手掛かりを出す。

    アーティファクト画像を開けなくても、ログだけで原因（ボット判定・リダイレクト・
    iframe内フォーム等）を切り分けられるようにする。値は出さず、構造だけ出力する。
    """
    try:
        print(f"[diag] final_url = {page.url}")
        print(f"[diag] title     = {page.title()!r}")
    except Exception:
        pass
    frames = getattr(page, "frames", [page.main_frame])
    print(f"[diag] frames = {len(frames)}")
    for i, fr in enumerate(frames):
        try:
            info = fr.evaluate(
                """() => {
                    const inputs = [...document.querySelectorAll('input, textarea')].map(el => ({
                        type: (el.getAttribute('type') || 'text'),
                        name: el.getAttribute('name') || '',
                        id: el.id || '',
                        ph: el.getAttribute('placeholder') || ''
                    }));
                    const buttons = [...document.querySelectorAll('button, input[type=submit], a')]
                        .map(el => (el.value || el.textContent || '').trim())
                        .filter(t => t && t.length <= 24).slice(0, 12);
                    return {
                        url: location.href,
                        hasPassword: !!document.querySelector('input[type=password]'),
                        inputs, buttons,
                        bodySnippet: (document.body ? document.body.innerText : '').slice(0, 200)
                    };
                }"""
            )
            print(f"[diag] frame#{i} url={info.get('url')}")
            print(f"[diag] frame#{i} hasPassword={info.get('hasPassword')}")
            for inp in info.get("inputs", [])[:15]:
                print(f"[diag] frame#{i} input type={inp['type']!r} "
                      f"name={inp['name']!r} id={inp['id']!r} ph={inp['ph']!r}")
            if info.get("buttons"):
                print(f"[diag] frame#{i} buttons={info['buttons']}")
            snip = (info.get("bodySnippet") or "").replace("\n", " ")
            print(f"[diag] frame#{i} body[:200]={snip!r}")
        except Exception as e:  # noqa: BLE001
            print(f"[diag] frame#{i} inspect失敗: {e}")


def _find_login_across_frames(page, sel):
    """全フレーム（iframe含む）を走査して (frame, user要素, pw要素) を返す。

    パスワード欄を含むフレームを見つけ、その中でID欄も探す。config指定を最優先。
    """
    frames = getattr(page, "frames", [page.main_frame])
    for fr in frames:
        try:
            pw = None
            if sel.get("login_pass"):
                pw = fr.query_selector(sel["login_pass"])
            if not pw:
                pw = fr.query_selector("input[type='password']")
            if not pw:
                continue

            user = None
            if sel.get("login_user"):
                user = fr.query_selector(sel["login_user"])
            if not user:
                for cand in USER_CANDIDATES:
                    try:
                        el = fr.query_selector(cand)
                    except Exception:
                        el = None
                    if el:
                        user = el
                        break
            if not user:
                # パスワード欄の直前にある入力欄をIDとみなす（フレーム内）
                try:
                    handle = fr.evaluate_handle(
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
                    user = handle.as_element()
                except Exception:
                    user = None
            return fr, user, pw
        except Exception:
            continue
    return None, None, None


def fetch_csv(settings: Settings) -> bytes:
    """ログイン→応募者一覧→CSV出力 を行い、CSVのバイト列を返す。"""
    from playwright.sync_api import sync_playwright

    settings.require_for_fetch()
    artifacts = settings.artifacts_dir
    sel = settings.selectors

    with sync_playwright() as p:
        # 自動化ブラウザだと弾くサイト対策：自動化フラグを消し、実ブラウザに寄せる
        browser = p.chromium.launch(
            headless=settings.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )
        default_ua = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        context = browser.new_context(
            accept_downloads=True,
            locale="ja-JP",
            timezone_id="Asia/Tokyo",
            user_agent=os.environ.get("EP_USER_AGENT", default_ua),
            extra_http_headers={
                "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
            },
        )
        # navigator.webdriver を隠す（自動化検知よけ）
        try:
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
            )
        except Exception:
            pass
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

            # iframe内フォームにも対応して、パスワード欄を含むフレームを探す
            login_frame, user, pw = _find_login_across_frames(page, sel)
            if not user or not pw:
                _shot(page, artifacts, "01_login_fields_not_found")
                _dump_login_diagnostics(page)
                try:
                    (artifacts / "01_login.html").write_text(
                        page.content(), encoding="utf-8"
                    )
                except Exception:
                    pass
                raise RuntimeError(
                    "ログインフォームが見つかりません。config/selectors.json を設定してください。"
                )
            user.fill(settings.ep_user)
            pw.fill(settings.ep_pass)

            # ログインボタンは同じフレーム内から探す
            btn = login_frame.query_selector(sel["login_button"]) if sel.get("login_button") else None
            if not btn:
                for cand in LOGIN_BTN_CANDIDATES:
                    try:
                        btn = login_frame.query_selector(cand)
                    except Exception:
                        btn = None
                    if btn:
                        break
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
