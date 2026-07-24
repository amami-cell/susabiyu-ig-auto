"""ステータス変更の復元。

主：CSVの `変更履歴1` 列に入っている遷移テキストをパースする。
保険：前回スナップショットとの比較で差分を拾う。
同一イベントは (応募者コード, 日時, 前, 後) をキーに重複排除する。
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

from .parse import Applicant

# 行頭に付きうる日時（省略されることもある）。
_DATE_RE = re.compile(
    r"^\s*(\d{4}[/\-年]\d{1,2}[/\-月]\d{1,2}日?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)\s*"
)
# 複数文字の矢印を単一文字 → に正規化してから割る。
_MULTI_ARROWS = ("=>", "->", "⇒", "➡", "≫", ">>")
_ARROW_CHAR = "→"


@dataclass(frozen=True)
class StatusChange:
    applicant_code: str
    changed_at: str      # 分かる範囲で。無ければ空
    from_status: str
    to_status: str
    source: str          # "履歴" or "差分"

    def key(self) -> tuple[str, str, str, str]:
        return (
            self.applicant_code,
            _norm(self.changed_at),
            _norm(self.from_status),
            _norm(self.to_status),
        )


def _norm(s: str) -> str:
    return re.sub(r"\s+", "", (s or "").strip())


def parse_change_history(applicant_code: str, history_text: str) -> list[StatusChange]:
    """`変更履歴1` のテキストから遷移を取り出す。"""
    if not history_text or not history_text.strip():
        return []

    changes: list[StatusChange] = []
    # 複数行・区切り文字混在に耐えるよう、まず行で割る
    segments = re.split(r"[\n]+", history_text)
    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue
        # 行頭の日時を取り出す
        date = ""
        m = _DATE_RE.match(seg)
        if m:
            date = m.group(1).strip()
            seg = seg[m.end():]

        # 矢印を単一文字に正規化して分割
        norm = seg
        for arrow in _MULTI_ARROWS:
            norm = norm.replace(arrow, _ARROW_CHAR)
        if _ARROW_CHAR not in norm:
            continue
        tokens = [t.strip(" 　:：-,、;；") for t in norm.split(_ARROW_CHAR)]
        tokens = [t for t in tokens if t]
        # 連続するトークンを (前→後) のペアにする（チェーン対応）
        for i in range(len(tokens) - 1):
            frm, to = tokens[i], tokens[i + 1]
            if not to:
                continue
            changes.append(
                StatusChange(
                    applicant_code=applicant_code,
                    changed_at=date,
                    from_status=frm,
                    to_status=to,
                    source="履歴",
                )
            )
    return changes


def detect_diff_changes(
    prev_status: dict[str, str],
    applicants: Iterable[Applicant],
    changed_at: str,
) -> list[StatusChange]:
    """前回スナップショット（応募者コード→ステータス名）と比較して差分を拾う保険。"""
    changes: list[StatusChange] = []
    for a in applicants:
        before = prev_status.get(a.applicant_code)
        after = a.status_name or a.status_code
        if before is None:
            continue  # 新規応募は「変更」ではないので出さない
        if _norm(before) != _norm(after) and after:
            changes.append(
                StatusChange(
                    applicant_code=a.applicant_code,
                    changed_at=changed_at,
                    from_status=before,
                    to_status=after,
                    source="差分",
                )
            )
    return changes


def dedupe_changes(
    changes: Iterable[StatusChange], seen_keys: set[tuple[str, str, str, str]] | None = None
) -> list[StatusChange]:
    """同一イベントを1つに畳む。seen_keys を渡すと既存ログとの重複も除ける。

    履歴由来を優先して残す（差分は保険なので、同じ遷移があれば履歴を採用）。
    """
    seen = set(seen_keys) if seen_keys else set()
    # 履歴を先に処理して優先採用
    ordered = sorted(changes, key=lambda c: 0 if c.source == "履歴" else 1)
    result: list[StatusChange] = []
    for c in ordered:
        k = c.key()
        if k in seen:
            continue
        seen.add(k)
        result.append(c)
    return result
