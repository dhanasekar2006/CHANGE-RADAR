from __future__ import annotations

import random


def compute_backoff_seconds(attempt: int, *, base: float = 5.0, cap: float = 300.0) -> float:
    """Full-jitter exponential backoff for retrying failed fetches/notifications.

    `attempt` is 1-indexed (first retry = attempt 1).
    """
    exp = min(cap, base * (2 ** (attempt - 1)))
    return random.uniform(0, exp)
