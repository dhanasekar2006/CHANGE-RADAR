from __future__ import annotations

from packages.shared.constants import ChangeSignificance

# Cheap first pass, purely from similarity score. `summarize_change` (LLM-backed)
# can override this when the worker's ai_analyze task runs and finds the diff
# is more/less meaningful than raw similarity suggests (e.g. a small text
# change that flips a price or a status).
_THRESHOLDS: list[tuple[float, ChangeSignificance]] = [
    (0.995, ChangeSignificance.NOISE),
    (0.97, ChangeSignificance.MINOR),
    (0.85, ChangeSignificance.MODERATE),
    (0.5, ChangeSignificance.MAJOR),
]


def score_significance(similarity_score: float) -> ChangeSignificance:
    for threshold, significance in _THRESHOLDS:
        if similarity_score >= threshold:
            return significance
    return ChangeSignificance.CRITICAL
