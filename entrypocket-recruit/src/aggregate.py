"""dashboard_cache 用の集計。GASが速く読めるよう、実行のたびに数値を作る。"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Iterable

from .parse import Applicant

# ファネル段階の並び順（表示・集計の基準）
FUNNEL_ORDER = ["応募", "接触", "面接", "内定", "入社", "終了"]


@dataclass
class DashboardData:
    generated_at: str = ""
    total: int = 0
    duplicate_count: int = 0
    duplicate_rate: float = 0.0
    funnel: dict[str, int] = field(default_factory=dict)
    by_store: dict[str, dict[str, int]] = field(default_factory=dict)
    by_status: dict[str, int] = field(default_factory=dict)


def build_dashboard(
    applicants: Iterable[Applicant],
    status_to_funnel: dict[str, str],
    generated_at: str,
) -> DashboardData:
    """応募者リストと ステータスコード→ファネル段階 の表から集計する。"""
    applicants = list(applicants)
    total = len(applicants)
    dup = sum(1 for a in applicants if a.is_duplicate)

    funnel: dict[str, int] = {stage: 0 for stage in FUNNEL_ORDER}
    by_store: dict[str, dict[str, int]] = defaultdict(lambda: {s: 0 for s in FUNNEL_ORDER})
    by_status: dict[str, int] = defaultdict(int)

    for a in applicants:
        by_status[a.status_code or a.status_name or "不明"] += 1
        stage = status_to_funnel.get(a.status_code, "")
        if stage in funnel:
            funnel[stage] += 1
        if a.store_id:
            if stage in by_store[a.store_id]:
                by_store[a.store_id][stage] += 1

    return DashboardData(
        generated_at=generated_at,
        total=total,
        duplicate_count=dup,
        duplicate_rate=round(dup / total, 4) if total else 0.0,
        funnel=funnel,
        by_store={k: dict(v) for k, v in by_store.items()},
        by_status=dict(by_status),
    )
