from __future__ import annotations

import re

_MULTI_SPACE = re.compile(r"[ \t]+")
_MULTI_NEWLINE = re.compile(r"\n{3,}")


def normalize_whitespace(text: str) -> str:
    """Collapse repeated whitespace so trivial formatting churn isn't a diff.

    Applied to every extracted string before it reaches a differ, regardless
    of diff type, since layout-only whitespace changes are never a real
    content change.
    """
    lines = [_MULTI_SPACE.sub(" ", line).strip() for line in text.splitlines()]
    collapsed = "\n".join(lines)
    return _MULTI_NEWLINE.sub("\n\n", collapsed).strip()
