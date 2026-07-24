from src.aggregate import FUNNEL_ORDER, build_dashboard
from src.parse import parse_csv_bytes


def test_build_dashboard_counts(sample_csv_bytes):
    applicants = parse_csv_bytes(sample_csv_bytes)
    status_to_funnel = {"1": "応募", "31": "面接", "50": "内定"}
    dash = build_dashboard(applicants, status_to_funnel, generated_at="2026-07-24 08:00:00")

    assert dash.total == 3
    assert dash.duplicate_count == 1
    assert round(dash.duplicate_rate, 2) == 0.33

    assert dash.funnel["応募"] == 1
    assert dash.funnel["面接"] == 1
    assert dash.funnel["内定"] == 1
    # 全ファネル段階のキーが揃っている
    assert set(dash.funnel) == set(FUNNEL_ORDER)


def test_by_store(sample_csv_bytes):
    applicants = parse_csv_bytes(sample_csv_bytes)
    status_to_funnel = {"1": "応募", "31": "面接", "50": "内定"}
    dash = build_dashboard(applicants, status_to_funnel, generated_at="x")
    assert dash.by_store["S10"]["応募"] == 1
    assert dash.by_store["S10"]["面接"] == 1
    assert dash.by_store["S20"]["内定"] == 1


def test_unknown_funnel_ignored_in_funnel_counts():
    from src.parse import Applicant

    applicants = [Applicant(applicant_code="X", status_code="999")]
    dash = build_dashboard(applicants, {}, generated_at="x")
    assert dash.total == 1
    assert sum(dash.funnel.values()) == 0
