"""実行のエントリポイント。

  fetch（CSV取得）→ parse（正規化）→ history（変更検知）
    → sheets（7シートへ蓄積）→ aggregate（集計）→ _実行ログ

失敗しても _実行ログ に結果を残す。CSVが取れれば artifacts/latest.csv も置く。

    python -m src.main            # 通常実行
    python -m src.main --csv path # 取得済みCSVを流し込む（デバッグ用）
"""
from __future__ import annotations

import argparse
import sys
import time
import traceback
from datetime import datetime, timezone, timedelta
from pathlib import Path

from .aggregate import build_dashboard
from .config import Settings
from .history import (
    dedupe_changes,
    detect_diff_changes,
    parse_change_history,
)
from .parse import parse_csv_bytes

JST = timezone(timedelta(hours=9))


def _now_jst() -> datetime:
    return datetime.now(JST)


def run(settings: Settings, csv_override: bytes | None = None) -> int:
    start = time.time()
    now = _now_jst()
    today = now.strftime("%Y-%m-%d")
    stamp = now.strftime("%Y-%m-%d %H:%M:%S")

    result = "success"
    note = ""
    applicants = []
    new_status_count = 0
    change_count = 0
    sheets = None

    try:
        settings.require_for_sheets()

        # --- CSV取得 ---
        if csv_override is not None:
            csv_bytes = csv_override
        else:
            from .fetch import fetch_csv

            csv_bytes = fetch_csv(settings)

        # artifacts に生CSVを保存（デバッグ用）
        try:
            settings.artifacts_dir.mkdir(parents=True, exist_ok=True)
            (settings.artifacts_dir / "latest.csv").write_bytes(csv_bytes)
        except Exception:
            pass

        # --- パース ---
        column_map = settings.columns or None
        applicants = parse_csv_bytes(csv_bytes, column_map=column_map)
        if not applicants:
            raise RuntimeError("CSVから応募者を1件も読み取れませんでした（列名マッピングを確認）。")

        # --- Sheets 接続 ---
        from .sheets import SheetsClient

        sheets = SheetsClient(settings.service_account_json, settings.spreadsheet_id)
        sheets.ensure_sheets()

        # 差分検知の保険用に upsert 前の状態を読む
        prev_status = sheets.read_prev_statuses()

        # --- master 同期（未知コード・新店舗の追記） ---
        before_master = set(_status_codes(sheets))
        status_to_funnel = sheets.sync_status_master(applicants, today)
        after_master = set(status_to_funnel.keys())
        new_status_count = len(after_master - before_master)
        sheets.sync_store_master(applicants, today)

        # --- ステータス変更の復元 ---
        hist_changes = []
        for a in applicants:
            hist_changes.extend(parse_change_history(a.applicant_code, a.change_history))
        diff_changes = detect_diff_changes(prev_status, applicants, stamp)
        existing_keys = sheets.existing_change_keys()
        new_changes = dedupe_changes(hist_changes + diff_changes, seen_keys=existing_keys)
        change_count = len(new_changes)
        sheets.append_changes(new_changes, recorded_at=stamp)

        # --- 蓄積 ---
        sheets.upsert_raw(applicants, today)
        sheets.upsert_snapshot(applicants, status_to_funnel, today)

        # --- 集計 ---
        dash = build_dashboard(applicants, status_to_funnel, generated_at=stamp)
        sheets.write_dashboard(dash)

    except Exception as exc:  # noqa: BLE001
        result = "fail"
        note = f"{type(exc).__name__}: {exc}"
        traceback.print_exc()
    finally:
        elapsed = round(time.time() - start, 1)
        log_row = [
            stamp, settings.trigger, result, len(applicants),
            new_status_count, change_count, elapsed, settings.run_id, note,
        ]
        if sheets is not None:
            try:
                sheets.append_run_log(log_row)
            except Exception:
                traceback.print_exc()
        print(f"[{result}] 応募者={len(applicants)} 新規ステータス={new_status_count} "
              f"変更={change_count} {elapsed}s {note}")

    return 0 if result == "success" else 1


def _status_codes(sheets) -> list[str]:
    rows = sheets.get_values("master_ステータス!A2:A")
    return [r[0] for r in rows if r]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="エントリーポケット取得・蓄積")
    parser.add_argument("--csv", help="取得済みCSVファイルを流し込む（取得をスキップ）")
    args = parser.parse_args(argv)

    settings = Settings.from_env()

    csv_override = None
    if args.csv:
        csv_override = Path(args.csv).read_bytes()

    return run(settings, csv_override=csv_override)


if __name__ == "__main__":
    sys.exit(main())
