"""Googleスプレッドシート（7シート）への蓄積。

シートは初回実行時に自動生成する。手で作る必要はない。
手編集していいのは master_ステータス と master_店舗 だけ。他は毎回書き換える。
"""
from __future__ import annotations

import base64
import binascii
import json
from typing import Any

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

from .aggregate import DashboardData
from .history import StatusChange
from .parse import KNOWN_STATUSES, Applicant

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# 各シートのヘッダ定義（1行目）
HEADERS: dict[str, list[str]] = {
    "raw_応募者": [
        "応募者コード", "氏名", "フリガナ", "ステータスコード", "ステータス",
        "店舗ID", "店舗名", "電話番号", "電話番号_数字", "tel_link", "メール",
        "媒体", "応募日時", "面接日時", "入社日", "重複", "変更履歴1",
        "勤務可能曜日", "勤務可能時間帯", "初回取得日", "最終更新日", "消失",
    ],
    "snapshot_日次": [
        "日付", "応募者コード", "氏名", "ステータスコード", "ステータス",
        "店舗ID", "ファネル段階", "重複",
    ],
    "log_ステータス変更": [
        "応募者コード", "日時", "変更前", "変更後", "検知元", "記録日時",
    ],
    "master_ステータス": [
        "コード", "名称", "ファネル段階", "要確認", "初出日",
    ],
    "master_店舗": [
        "店舗ID", "表示名", "ブランド", "エリア", "初出日",
    ],
    "dashboard_cache": [
        "key", "value",
    ],
    "_実行ログ": [
        "実行日時", "トリガ", "結果", "応募者数", "新規ステータス数",
        "変更検知数", "所要秒", "run_id", "メモ",
    ],
}

SHEET_ORDER = list(HEADERS.keys())


def _load_credentials_info(value: str) -> dict:
    """サービスアカウント資格情報を dict にする。

    Secret には次のいずれの形で貼られていても受け付ける:
      - JSON の中身そのまま（{"type": "service_account", ...}）
      - その JSON を base64 で包んだもの（既存の GOOGLE_CREDS_B64 を流用した場合）
    """
    if not value or not value.strip():
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON が空です。")
    text = value.strip()

    # まず素の JSON として試す
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # base64 として復号してから JSON を試す
    try:
        decoded = base64.b64decode(text, validate=True).decode("utf-8")
        return json.loads(decoded)
    except (binascii.Error, ValueError, json.JSONDecodeError) as exc:
        raise RuntimeError(
            "GOOGLE_SERVICE_ACCOUNT_JSON を読めませんでした。"
            "サービスアカウントのJSONキーの中身、またはそのbase64を貼ってください。"
        ) from exc


class SheetsClient:
    def __init__(self, service_account_json: str, spreadsheet_id: str):
        info = _load_credentials_info(service_account_json)
        creds = Credentials.from_service_account_info(info, scopes=SCOPES)
        self.svc = build("sheets", "v4", credentials=creds, cache_discovery=False)
        self.spreadsheet_id = spreadsheet_id

    # ---- 低レベル操作 -------------------------------------------------

    def _values(self):
        return self.svc.spreadsheets().values()

    def get_values(self, rng: str) -> list[list[str]]:
        resp = self._values().get(spreadsheetId=self.spreadsheet_id, range=rng).execute()
        return resp.get("values", [])

    def update_values(self, rng: str, values: list[list[Any]]) -> None:
        self._values().update(
            spreadsheetId=self.spreadsheet_id,
            range=rng,
            valueInputOption="RAW",
            body={"values": values},
        ).execute()

    def append_values(self, sheet: str, values: list[list[Any]]) -> None:
        if not values:
            return
        self._values().append(
            spreadsheetId=self.spreadsheet_id,
            range=f"{sheet}!A1",
            valueInputOption="RAW",
            insertDataOption="INSERT_ROWS",
            body={"values": values},
        ).execute()

    def clear(self, rng: str) -> None:
        self._values().clear(spreadsheetId=self.spreadsheet_id, range=rng, body={}).execute()

    # ---- シート初期化 -------------------------------------------------

    def existing_titles(self) -> set[str]:
        meta = self.svc.spreadsheets().get(spreadsheetId=self.spreadsheet_id).execute()
        return {s["properties"]["title"] for s in meta.get("sheets", [])}

    def ensure_sheets(self) -> None:
        """7シートを用意し、無ければ作ってヘッダを書く。"""
        titles = self.existing_titles()
        requests = [
            {"addSheet": {"properties": {"title": name}}}
            for name in SHEET_ORDER
            if name not in titles
        ]
        if requests:
            self.svc.spreadsheets().batchUpdate(
                spreadsheetId=self.spreadsheet_id, body={"requests": requests}
            ).execute()

        # ヘッダが無いシートに書き込む
        for name, header in HEADERS.items():
            first = self.get_values(f"{name}!A1:1")
            if not first or not first[0]:
                self.update_values(f"{name}!A1", [header])

    # ---- raw_応募者 upsert -------------------------------------------

    def read_prev_statuses(self) -> dict[str, str]:
        """upsert前の raw_応募者 から 応募者コード→ステータス名 を読む（差分検知の保険用）。"""
        existing = self.get_values("raw_応募者!A2:E")
        prev: dict[str, str] = {}
        for row in existing:
            if not row or not row[0]:
                continue
            # 列: コード, 氏名, フリガナ, ステータスコード, ステータス
            prev[row[0]] = row[4] if len(row) > 4 else ""
        return prev

    def upsert_raw(self, applicants: list[Applicant], today: str) -> None:
        header = HEADERS["raw_応募者"]
        existing = self.get_values("raw_応募者!A2:V")
        # 応募者コード → 行データ
        by_code: dict[str, list[str]] = {}
        first_seen: dict[str, str] = {}
        for row in existing:
            if not row:
                continue
            code = row[0]
            by_code[code] = row
            # 初回取得日（列20 = index 19）を保持
            if len(row) > 19 and row[19]:
                first_seen[code] = row[19]

        incoming_codes = {a.applicant_code for a in applicants}

        rows: list[list[str]] = []
        for a in applicants:
            fs = first_seen.get(a.applicant_code, today)
            rows.append([
                a.applicant_code, a.name, a.name_kana, a.status_code, a.status_name,
                a.store_id, a.store_name, a.tel_raw, a.tel,
                f"tel:{a.tel}" if a.tel else "", a.email, a.media,
                a.applied_at, a.interview_at, a.hired_at,
                "重複" if a.is_duplicate else "", a.change_history,
                a.available_days, a.available_times, fs, today, "",
            ])

        # 今回消えた応募者は履歴として残す（消失列に TRUE）
        for code, row in by_code.items():
            if code in incoming_codes:
                continue
            padded = (row + [""] * len(header))[: len(header)]
            padded[20] = today          # 最終更新日
            padded[21] = "TRUE"         # 消失
            rows.append(padded)

        # 応募者コード順で書き直し（全書き換え）
        rows.sort(key=lambda r: r[0])
        self.clear("raw_応募者!A2:V")
        if rows:
            self.update_values("raw_応募者!A2", rows)

    # ---- snapshot_日次 upsert（当日分） --------------------------------

    def upsert_snapshot(
        self, applicants: list[Applicant], status_to_funnel: dict[str, str], today: str
    ) -> None:
        existing = self.get_values("snapshot_日次!A2:H")
        # 当日の行を除いた既存を残す
        kept = [r for r in existing if r and r[0] != today]

        new_rows = [
            [
                today, a.applicant_code, a.name, a.status_code, a.status_name,
                a.store_id, status_to_funnel.get(a.status_code, ""),
                "重複" if a.is_duplicate else "",
            ]
            for a in applicants
        ]
        self.clear("snapshot_日次!A2:H")
        combined = kept + new_rows
        if combined:
            self.update_values("snapshot_日次!A2", combined)

    # ---- log_ステータス変更 append（重複排除） -------------------------

    def existing_change_keys(self) -> set[tuple[str, str, str, str]]:
        existing = self.get_values("log_ステータス変更!A2:F")
        keys = set()
        for row in existing:
            if len(row) < 4:
                continue
            keys.add((
                row[0],
                _strip(row[1]),
                _strip(row[2]),
                _strip(row[3]),
            ))
        return keys

    def append_changes(self, changes: list[StatusChange], recorded_at: str) -> None:
        rows = [
            [c.applicant_code, c.changed_at, c.from_status, c.to_status, c.source, recorded_at]
            for c in changes
        ]
        self.append_values("log_ステータス変更", rows)

    # ---- master_ステータス（未知コード自動追記） ----------------------

    def sync_status_master(self, applicants: list[Applicant], today: str) -> dict[str, str]:
        """既存の master を読み、未知コードを 要確認=TRUE で追記。

        返り値は ステータスコード → ファネル段階 の対応表。
        """
        existing = self.get_values("master_ステータス!A2:E")
        table: dict[str, str] = {}       # code -> funnel
        known_codes: set[str] = set()
        for row in existing:
            if not row:
                continue
            code = row[0]
            known_codes.add(code)
            funnel = row[2] if len(row) > 2 else ""
            table[code] = funnel

        # 初期の既知4コードがまだ無ければ入れる
        seed_rows: list[list[str]] = []
        for code, (name, funnel) in KNOWN_STATUSES.items():
            if code not in known_codes:
                seed_rows.append([code, name, funnel, "", today])
                known_codes.add(code)
                table[code] = funnel

        # 実データに出た未知コードを 要確認=TRUE で追記
        seen_names: dict[str, str] = {}
        for a in applicants:
            if a.status_code and a.status_code not in seen_names:
                seen_names[a.status_code] = a.status_name

        new_rows: list[list[str]] = []
        for code, name in seen_names.items():
            if code in known_codes:
                continue
            new_rows.append([code, name, "", "TRUE", today])
            known_codes.add(code)
            table[code] = ""

        self.append_values("master_ステータス", seed_rows + new_rows)
        return table

    # ---- master_店舗（新店舗自動追記） --------------------------------

    def sync_store_master(self, applicants: list[Applicant], today: str) -> None:
        existing = self.get_values("master_店舗!A2:E")
        known = {row[0] for row in existing if row}
        new_rows: list[list[str]] = []
        seen: set[str] = set()
        for a in applicants:
            sid = a.store_id
            if not sid or sid in known or sid in seen:
                continue
            seen.add(sid)
            # 表示名の初期値に store_name を入れておく（人手で直せる）
            new_rows.append([sid, a.store_name, "", "", today])
        self.append_values("master_店舗", new_rows)

    # ---- dashboard_cache -------------------------------------------

    def write_dashboard(self, data: DashboardData) -> None:
        payload = {
            "generated_at": data.generated_at,
            "total": data.total,
            "duplicate_count": data.duplicate_count,
            "duplicate_rate": data.duplicate_rate,
            "funnel": data.funnel,
            "by_store": data.by_store,
            "by_status": data.by_status,
        }
        rows = [
            ["json", json.dumps(payload, ensure_ascii=False)],
            ["generated_at", data.generated_at],
            ["total", data.total],
            ["duplicate_rate", data.duplicate_rate],
        ]
        self.clear("dashboard_cache!A2:B")
        self.update_values("dashboard_cache!A2", rows)

    # ---- _実行ログ ---------------------------------------------------

    def append_run_log(self, row: list[Any]) -> None:
        self.append_values("_実行ログ", [row])


def _strip(s: str) -> str:
    import re

    return re.sub(r"\s+", "", (s or "").strip())
