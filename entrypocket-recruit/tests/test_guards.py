"""取得〜集計の“抜け”ガードの単体テスト（A-8 必須列 / A-13 重複除去 / A-9 急減検知）。"""
import csv
import io

from src.parse import (
    Applicant,
    dedupe_by_code,
    is_suspicious_drop,
    missing_required_columns,
)


def _csv(headers, rows=()):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    for r in rows:
        w.writerow(r)
    return buf.getvalue().encode("cp932")


# --- A-8: 必須列の取りこぼし検知 ---
def test_missing_required_none_when_present():
    data = _csv(["応募者コード", "ステータスコード", "店舗ID", "氏名"])
    assert missing_required_columns(data) == []


def test_missing_required_detects_renamed_status():
    # ステータスコード列が候補外の別名に変わった → 検知される
    data = _csv(["応募者コード", "選考ステータス番号", "店舗ID"])
    assert "status_code" in missing_required_columns(data)


def test_missing_required_empty_csv():
    assert set(missing_required_columns(b"")) == {"applicant_code", "status_code", "store_id"}


# --- A-13: 応募者コード重複の除去（後勝ち・空コードは保持） ---
def test_dedupe_keeps_last_occurrence():
    a1 = Applicant(applicant_code="A", name="old")
    a2 = Applicant(applicant_code="A", name="new")
    b = Applicant(applicant_code="B", name="b")
    deduped, removed = dedupe_by_code([a1, a2, b])
    assert removed == 1
    codes = [a.applicant_code for a in deduped]
    assert codes.count("A") == 1 and "B" in codes
    kept_a = next(a for a in deduped if a.applicant_code == "A")
    assert kept_a.name == "new"


def test_dedupe_preserves_empty_codes():
    e1 = Applicant(applicant_code="", name="x")
    e2 = Applicant(applicant_code="  ", name="y")
    deduped, removed = dedupe_by_code([e1, e2])
    assert removed == 0
    assert len(deduped) == 2


# --- A-9: 取得件数の急減検知 ---
def test_is_suspicious_drop():
    assert is_suspicious_drop(100, 40) is True     # 100→40 (<50%)
    assert is_suspicious_drop(100, 60) is False    # 100→60 (>=50%)
    assert is_suspicious_drop(10, 1) is False       # 母数が min_base 未満は無視
    assert is_suspicious_drop(0, 0) is False
    assert is_suspicious_drop(20, 9) is True         # 20*0.5=10, 9<10
    assert is_suspicious_drop(20, 10) is False        # 50%ちょうどは許容
