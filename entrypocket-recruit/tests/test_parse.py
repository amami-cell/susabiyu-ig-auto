from src.parse import (
    KNOWN_STATUSES,
    build_header_index,
    normalize_tel,
    parse_csv_bytes,
)


def test_normalize_tel_variants():
    assert normalize_tel("TEL09012345678") == "09012345678"
    assert normalize_tel("090-1234-5678") == "09012345678"
    assert normalize_tel("") == ""
    assert normalize_tel("  090 1234 5678 ") == "09012345678"


def test_header_index_maps_logical_names(sample_headers):
    idx = build_header_index(sample_headers)
    assert idx["applicant_code"] == 0
    assert idx["status_code"] == 3
    assert idx["tel"] == 7
    assert "change_history" in idx


def test_parse_cp932_sample(sample_csv_bytes):
    applicants = parse_csv_bytes(sample_csv_bytes)
    assert len(applicants) == 3

    a1 = applicants[0]
    assert a1.applicant_code == "A001"
    assert a1.name == "山田太郎"
    assert a1.status_code == "1"
    assert a1.tel == "09012345678"
    assert a1.tel_raw == "TEL09012345678"
    assert a1.is_duplicate is False

    a2 = applicants[1]
    assert a2.is_duplicate is True
    assert a2.tel == "09022223333"


def test_known_statuses_seed():
    # 実データで確認できた4コードのみ
    assert set(KNOWN_STATUSES) == {"1", "3", "31", "83"}
    assert KNOWN_STATUSES["31"] == ("面接予約済", "面接")


def test_available_days_all_zero(sample_csv_bytes):
    applicants = parse_csv_bytes(sample_csv_bytes)
    assert all(a.available_days == "0" for a in applicants)


def test_rows_without_code_are_skipped(sample_headers):
    import csv
    import io

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(sample_headers)
    empty = [""] * len(sample_headers)
    w.writerow(empty)  # 空行
    footer = empty.copy()
    footer[1] = "合計"  # 応募者コードが無いフッタ行
    w.writerow(footer)
    data = buf.getvalue().encode("cp932")
    assert parse_csv_bytes(data) == []
