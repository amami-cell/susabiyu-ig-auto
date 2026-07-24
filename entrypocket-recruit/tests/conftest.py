"""テスト用のサンプルCSV（CP932・実データに近い形）を生成する。"""
from __future__ import annotations

import csv
import io

import pytest

# 主要な列 + フィラーで 62 列に近づけたヘッダ。
# 勤務可能曜日・時間帯はサンプル同様に全件 0 を入れる。
BASE_HEADERS = [
    "応募者コード", "氏名", "フリガナ", "ステータスコード", "ステータス",
    "店舗ID", "店舗名", "電話番号", "メールアドレス", "媒体",
    "応募日時", "面接日時", "入社日", "重複フラグ", "変更履歴1",
    "勤務可能曜日", "勤務可能時間帯",
]
# 62列に合わせてフィラー列を足す
FILLER = [f"予備{i}" for i in range(62 - len(BASE_HEADERS))]
HEADERS = BASE_HEADERS + FILLER


def _row(values: dict) -> list[str]:
    row = [values.get(h, "") for h in BASE_HEADERS]
    row += [""] * len(FILLER)
    return row


SAMPLE_ROWS = [
    _row({
        "応募者コード": "A001", "氏名": "山田太郎", "フリガナ": "ヤマダタロウ",
        "ステータスコード": "1", "ステータス": "未対応", "店舗ID": "S10",
        "店舗名": "すさび湯 本店", "電話番号": "TEL09012345678",
        "メールアドレス": "taro@example.com", "媒体": "バイトル",
        "応募日時": "2026/07/20 09:00", "重複フラグ": "0",
        "変更履歴1": "", "勤務可能曜日": "0", "勤務可能時間帯": "0",
    }),
    _row({
        "応募者コード": "A002", "氏名": "鈴木花子", "フリガナ": "スズキハナコ",
        "ステータスコード": "31", "ステータス": "面接予約済", "店舗ID": "S10",
        "店舗名": "すさび湯 本店", "電話番号": "090-2222-3333",
        "媒体": "Indeed", "応募日時": "2026/07/18 12:30", "重複フラグ": "1",
        "変更履歴1": "2026/07/18 12:30 未対応 → 連絡中\n2026/07/19 10:00 連絡中 → 面接予約済",
        "勤務可能曜日": "0", "勤務可能時間帯": "0",
    }),
    _row({
        "応募者コード": "A003", "氏名": "佐藤次郎", "フリガナ": "サトウジロウ",
        # 未知コード（master に無い）
        "ステータスコード": "50", "ステータス": "内定", "店舗ID": "S20",
        "店舗名": "すさび湯 駅前店", "電話番号": "TEL08099998888",
        "媒体": "バイトル", "応募日時": "2026/07/15 08:00", "重複フラグ": "0",
        "変更履歴1": "2026/07/16 09:00 未対応 → 面接予約済 → 内定",
        "勤務可能曜日": "0", "勤務可能時間帯": "0",
    }),
]


def make_csv_bytes(rows=None) -> bytes:
    rows = SAMPLE_ROWS if rows is None else rows
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(HEADERS)
    for r in rows:
        w.writerow(r)
    return buf.getvalue().encode("cp932")


@pytest.fixture
def sample_csv_bytes() -> bytes:
    return make_csv_bytes()


@pytest.fixture
def sample_headers() -> list[str]:
    return HEADERS
