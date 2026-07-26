"""セレクタ調査用。ブラウザを開いて手で操作すると、対応するコードが別窓に出る。

    python scripts/record_login.py

ログイン → 応募者一覧 → CSV出力 まで手で操作し、別ウィンドウ（Playwright
Inspector）に現れる selector を config/selectors.json に転記する。

EP_LOGIN_URL を .env か環境変数に入れておくと、その画面から始まる。
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

# .env を読む（src.config を使わず単体で動くよう最小実装）
ENV = Path(__file__).resolve().parent.parent / ".env"
if ENV.exists():
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main() -> int:
    url = os.environ.get("EP_LOGIN_URL", "https://manage.entrypocket.jp/")
    print(f"codegen を起動します: {url}")
    print("ブラウザで ログイン→応募者一覧→CSV出力 を操作してください。")
    print("Inspector に出るセレクタを config/selectors.json に転記します。\n")
    cmd = [sys.executable, "-m", "playwright", "codegen", "--target", "python", url]
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())
