from __future__ import annotations

import difflib

from packages.core.differs.base import DiffResult, Differ


class TextDiffer(Differ):
    def diff(self, previous: str, current: str) -> DiffResult:
        if previous == current:
            return DiffResult(has_changes=False, summary="no changes", payload="", similarity_score=1.0)

        prev_lines = previous.splitlines(keepends=True)
        curr_lines = current.splitlines(keepends=True)

        unified = "".join(
            difflib.unified_diff(prev_lines, curr_lines, fromfile="previous", tofile="current", lineterm="\n")
        )

        matcher = difflib.SequenceMatcher(a=previous, b=current)
        similarity = matcher.ratio()

        added = sum(1 for line in unified.splitlines() if line.startswith("+") and not line.startswith("+++"))
        removed = sum(1 for line in unified.splitlines() if line.startswith("-") and not line.startswith("---"))

        return DiffResult(
            has_changes=True,
            summary=f"+{added} lines, -{removed} lines",
            payload=unified,
            similarity_score=round(similarity, 4),
        )
