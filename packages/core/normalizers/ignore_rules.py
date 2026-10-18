from __future__ import annotations

import re

IgnoreRule = dict  # {"pattern": str, "type": "regex" | "literal"}


def apply_ignore_rules(text: str, rules: list[IgnoreRule]) -> str:
    """Strip user-configured noise (timestamps, ad slots, view counters, ...)
    out of extracted text before it's diffed.

    Each rule is `{"pattern": "...", "type": "regex" | "literal"}`. Matches
    are removed entirely rather than masked, so two snapshots that differ
    only in ignored content diff as identical.
    """
    result = text
    for rule in rules:
        pattern = rule.get("pattern", "")
        if not pattern:
            continue
        if rule.get("type") == "literal":
            result = result.replace(pattern, "")
        else:
            try:
                result = re.sub(pattern, "", result)
            except re.error:
                continue
    return result
