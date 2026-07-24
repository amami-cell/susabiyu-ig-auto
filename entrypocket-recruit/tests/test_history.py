from src.history import (
    StatusChange,
    dedupe_changes,
    detect_diff_changes,
    parse_change_history,
)
from src.parse import Applicant


def test_parse_single_transition():
    changes = parse_change_history("A002", "2026/07/18 12:30 未対応 → 連絡中")
    assert len(changes) == 1
    c = changes[0]
    assert c.applicant_code == "A002"
    assert c.from_status == "未対応"
    assert c.to_status == "連絡中"
    assert c.changed_at.startswith("2026/07/18")
    assert c.source == "履歴"


def test_parse_multiple_lines():
    text = "2026/07/18 12:30 未対応 → 連絡中\n2026/07/19 10:00 連絡中 → 面接予約済"
    changes = parse_change_history("A002", text)
    assert len(changes) == 2
    assert changes[1].to_status == "面接予約済"


def test_parse_chained_arrows():
    # 「未対応 → 面接予約済 → 内定」を2遷移として拾う
    changes = parse_change_history("A003", "2026/07/16 09:00 未対応 → 面接予約済 → 内定")
    tos = [c.to_status for c in changes]
    assert "面接予約済" in tos
    assert "内定" in tos


def test_empty_history():
    assert parse_change_history("A001", "") == []
    assert parse_change_history("A001", "   ") == []


def test_detect_diff_changes():
    prev = {"A001": "未対応", "A002": "連絡中"}
    applicants = [
        Applicant(applicant_code="A001", status_name="連絡中"),  # 変わった
        Applicant(applicant_code="A002", status_name="連絡中"),  # 同じ
        Applicant(applicant_code="A009", status_name="未対応"),  # 新規（対象外）
    ]
    changes = detect_diff_changes(prev, applicants, "2026-07-24 08:00:00")
    assert len(changes) == 1
    assert changes[0].applicant_code == "A001"
    assert changes[0].source == "差分"


def test_dedupe_prefers_history():
    hist = StatusChange("A001", "2026/07/18", "未対応", "連絡中", "履歴")
    diff = StatusChange("A001", "2026/07/18", "未対応", "連絡中", "差分")
    result = dedupe_changes([diff, hist])
    assert len(result) == 1
    assert result[0].source == "履歴"


def test_dedupe_against_existing_keys():
    hist = StatusChange("A001", "2026/07/18", "未対応", "連絡中", "履歴")
    seen = {hist.key()}
    assert dedupe_changes([hist], seen_keys=seen) == []
