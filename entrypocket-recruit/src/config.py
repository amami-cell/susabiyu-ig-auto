"""環境変数と config/*.json の読み込みを一元化する。

Secrets（EP_USER 等）は環境変数から、変わりやすい設定（セレクタ・列名・
検索条件）は config/*.json から読む。ローカルでは .env を読み込む。
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# リポジトリ内の config ディレクトリ
CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"


def _load_dotenv() -> None:
    """.env があれば環境変数に流し込む（既存の環境変数は上書きしない）。"""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def load_json(name: str) -> dict[str, Any]:
    """config ディレクトリの JSON を読む。無ければ空 dict。"""
    path = CONFIG_DIR / name
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    # "_comment" キーは無視できるよう素通しする（利用側で参照しない）
    return data


@dataclass
class Settings:
    """1回の実行に必要な設定一式。"""

    ep_user: str = ""
    ep_pass: str = ""
    ep_login_url: str = ""
    ep_applicant_url: str = ""
    spreadsheet_id: str = ""
    service_account_json: str = ""
    headless: bool = True
    # 生成物の保存先（スクリーンショット・CSV）
    artifacts_dir: Path = field(default_factory=lambda: Path("artifacts"))
    # ダウンロードした CSV の保存先
    download_dir: Path = field(default_factory=lambda: Path("downloads"))
    # 起動トリガ（auto / manual）— _実行ログ 用
    trigger: str = "manual"
    # GitHub の run id（あれば _実行ログ に残す）
    run_id: str = ""

    selectors: dict[str, Any] = field(default_factory=dict)
    search_params: dict[str, Any] = field(default_factory=dict)
    clients: dict[str, Any] = field(default_factory=dict)
    columns: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_env(cls) -> "Settings":
        _load_dotenv()

        selectors = load_json("selectors.json")
        search_params = load_json("search_params.json")
        clients = load_json("clients.json")
        columns = load_json("columns.json")

        login_url = os.environ.get("EP_LOGIN_URL", "").strip()
        applicant_url = os.environ.get("EP_APPLICANT_URL", "").strip()

        # 環境変数が空なら clients.json の default を使う
        if (not login_url or not applicant_url) and clients.get("clients"):
            first = clients["clients"][0]
            login_url = login_url or first.get("login_url", "")
            applicant_url = applicant_url or first.get("applicant_url", "")

        headless = os.environ.get("HEADLESS", "1").strip() not in ("0", "false", "False")

        return cls(
            ep_user=os.environ.get("EP_USER", ""),
            ep_pass=os.environ.get("EP_PASS", ""),
            ep_login_url=login_url,
            ep_applicant_url=applicant_url,
            spreadsheet_id=os.environ.get("SPREADSHEET_ID", ""),
            service_account_json=os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", ""),
            headless=headless,
            trigger=os.environ.get("EP_TRIGGER", "manual"),
            run_id=os.environ.get("GITHUB_RUN_ID", ""),
            selectors=selectors,
            search_params=search_params,
            clients=clients,
            columns=columns,
        )

    def require_for_fetch(self) -> None:
        """CSV取得に必要な値が揃っているか確認する。"""
        missing = [
            k
            for k, v in {
                "EP_USER": self.ep_user,
                "EP_PASS": self.ep_pass,
                "EP_LOGIN_URL": self.ep_login_url,
                "EP_APPLICANT_URL": self.ep_applicant_url,
            }.items()
            if not v
        ]
        if missing:
            raise RuntimeError(f"CSV取得に必要な設定が足りません: {', '.join(missing)}")

    def require_for_sheets(self) -> None:
        missing = [
            k
            for k, v in {
                "SPREADSHEET_ID": self.spreadsheet_id,
                "GOOGLE_SERVICE_ACCOUNT_JSON": self.service_account_json,
            }.items()
            if not v
        ]
        if missing:
            raise RuntimeError(f"スプレッドシート書き込みに必要な設定が足りません: {', '.join(missing)}")
