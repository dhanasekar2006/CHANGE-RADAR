from __future__ import annotations

import json

import jsonpatch

from packages.core.differs.base import DiffResult, Differ


class JsonDiffer(Differ):
    def diff(self, previous: str, current: str) -> DiffResult:
        prev_obj = json.loads(previous) if previous else None
        curr_obj = json.loads(current) if current else None

        patch = jsonpatch.make_patch(prev_obj, curr_obj)
        ops = list(patch)

        if not ops:
            return DiffResult(has_changes=False, summary="no changes", payload="[]", similarity_score=1.0)

        added = sum(1 for op in ops if op["op"] == "add")
        removed = sum(1 for op in ops if op["op"] == "remove")
        replaced = sum(1 for op in ops if op["op"] == "replace")

        total_fields = max(_count_leaves(prev_obj) + _count_leaves(curr_obj), 1)
        similarity = max(0.0, 1.0 - (len(ops) / total_fields))

        return DiffResult(
            has_changes=True,
            summary=f"+{added} -{removed} ~{replaced} fields",
            payload=json.dumps(ops, indent=2),
            similarity_score=round(similarity, 4),
        )


def _count_leaves(obj: object) -> int:
    if isinstance(obj, dict):
        return sum(_count_leaves(v) for v in obj.values()) or 1
    if isinstance(obj, list):
        return sum(_count_leaves(v) for v in obj) or 1
    return 1
