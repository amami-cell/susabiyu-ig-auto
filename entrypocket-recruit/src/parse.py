"""CP932 の応募者CSVをパースして正規化する。

EPのCSVは Shift-JIS(CP932)・62列・DL時点の全件スナップショット。
列名でマッピングするので列順が変わっても壊れにくい。列名の候補は
config/columns.json に持たせている。
"""
from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from typing import Any

# よく出るステータスコード ↔ 名称 ↔ ファネル段階の初期表。
# master_ステータス シートの初期投入にも使う。実データで確認できた4件のみ。
KNOWN_STATUSES: dict[str, tuple[str, str]] = {
    "1": ("未対応", "応募"),
    "3": ("連絡中", "接触"),
    "31": ("面接予約済", "面接"),
    "83": ("不採用（辞退）", "終了"),
}

# 論理名 → CSVヘッダ候補（columns.json が無い時のフォールバック）
DEFAULT_COLUMN_MAP: dict[str, list[str]] = {
    "applicant_code": ["応募者コード", "応募者ID", "応募ID", "ID"],
    "name": ["氏名", "応募者氏名", "名前", "お名前"],
    "name_kana": ["フリガナ", "カナ", "氏名カナ"],
    "status_code": ["ステータスコード", "対応状況コード", "選考ステータスコード"],
    "status_name": ["ステータス", "対応状況", "選考ステータス", "ステータス名"],
    "store_id": ["店舗ID", "店舗コード", "勤務地ID", "求人ID"],
    "store_name": ["店舗名", "勤務地", "求人名"],
    "tel": ["電話番号", "TEL", "携帯電話", "連絡先"],
    "email": ["メールアドレス", "Email", "メール"],
    "media": ["媒体", "応募媒体", "流入元", "応募経路"],
    "applied_at": ["応募日時", "応募日", "エントリー日時", "登録日時"],
    "interview_at": ["面接日時", "面接予定日時", "面接日"],
    "hired_at": ["入社日", "入社予定日", "採用日"],
    "is_duplicate": ["重複フラグ", "重複", "重複応募"],
    "change_history": ["変更履歴1", "変更履歴", "対応履歴"],
    "available_days": ["勤務可能曜日", "希望曜日", "シフト希望曜日"],
    "available_times": ["勤務可能時間帯", "希望時間帯", "シフト希望時間帯"],
}


@dataclass
class Applicant:
    """正規化した応募者1件。"""

    applicant_code: str = ""
    name: str = ""
    name_kana: str = ""
    status_code: str = ""
    status_name: str = ""
    store_id: str = ""
    store_name: str = ""
    tel: str = ""          # 数字だけに正規化
    tel_raw: str = ""      # 元の "TEL090..." の形
    email: str = ""
    media: str = ""
    applied_at: str = ""
    interview_at: str = ""
    hired_at: str = ""
    is_duplicate: bool = False
    change_history: str = ""
    available_days: str = ""
    available_times: str = ""
    raw: dict[str, str] = field(default_factory=dict)


def normalize_tel(value: str) -> str:
    """'TEL09012345678' や '090-1234-5678' → '09012345678'（数字だけ）。"""
    if not value:
        return ""
    return re.sub(r"\D", "", value)


def _to_bool(value: str) -> bool:
    """重複フラグを bool に。'1' '○' 'TRUE' 'あり' などを真とみなす。"""
    if not value:
        return False
    v = value.strip().lower()
    return v in ("1", "true", "○", "◯", "あり", "yes", "y", "重複")


def build_header_index(
    headers: list[str], column_map: dict[str, list[str]] | None = None
) -> dict[str, int]:
    """CSVヘッダ行から 論理名 → 列インデックス を作る。

    候補ヘッダのうち最初に一致したものを採用。全角空白やBOMは無視する。
    """
    column_map = column_map or DEFAULT_COLUMN_MAP
    cleaned = [(_clean_header(h), i) for i, h in enumerate(headers)]
    lookup = {name: idx for name, idx in cleaned}

    index: dict[str, int] = {}
    for logical, candidates in column_map.items():
        if logical.startswith("_"):
            continue
        for cand in candidates:
            key = _clean_header(cand)
            if key in lookup:
                index[logical] = lookup[key]
                break
    return index


def _clean_header(h: str) -> str:
    return (h or "").replace("﻿", "").replace("　", "").strip()


def parse_csv_bytes(
    data: bytes,
    encoding: str = "cp932",
    column_map: dict[str, list[str]] | None = None,
) -> list[Applicant]:
    """CP932 の CSV バイト列を Applicant のリストにする。"""
    text = data.decode(encoding, errors="replace")
    return parse_csv_text(text, column_map=column_map)


def parse_csv_text(
    text: str, column_map: dict[str, list[str]] | None = None
) -> list[Applicant]:
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return []

    headers = rows[0]
    idx = build_header_index(headers, column_map)
    clean_headers = [_clean_header(h) for h in headers]

    applicants: list[Applicant] = []
    for row in rows[1:]:
        if not any(cell.strip() for cell in row):
            continue  # 空行を飛ばす

        def get(logical: str) -> str:
            i = idx.get(logical)
            if i is None or i >= len(row):
                return ""
            return row[i].strip()

        tel_raw = get("tel")
        raw = {
            clean_headers[i]: (row[i].strip() if i < len(row) else "")
            for i in range(len(clean_headers))
        }

        applicant = Applicant(
            applicant_code=get("applicant_code"),
            name=get("name"),
            name_kana=get("name_kana"),
            status_code=get("status_code"),
            status_name=get("status_name"),
            store_id=get("store_id"),
            store_name=get("store_name"),
            tel=normalize_tel(tel_raw),
            tel_raw=tel_raw,
            email=get("email"),
            media=get("media"),
            applied_at=get("applied_at"),
            interview_at=get("interview_at"),
            hired_at=get("hired_at"),
            is_duplicate=_to_bool(get("is_duplicate")),
            change_history=get("change_history"),
            available_days=get("available_days"),
            available_times=get("available_times"),
            raw=raw,
        )
        # 応募者コードが取れない行はスキップ（フッタ・注記行など）
        if not applicant.applicant_code:
            continue
        applicants.append(applicant)

    return applicants
