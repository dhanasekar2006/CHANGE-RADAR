from __future__ import annotations

from packages.shared.constants import ChangeSignificance
from packages.shared.errors import ChangeRadarError

SYSTEM_PROMPT = (
    "You are ChangeRadar's change analyst. You are given a unified diff between two "
    "snapshots of a monitored page or API. Reply with two lines only:\n"
    "SIGNIFICANCE: one of noise, minor, moderate, major, critical\n"
    "SUMMARY: one sentence describing what changed, written for someone who hasn't seen the diff"
)


class ChangeSummary:
    def __init__(self, significance: ChangeSignificance, summary: str) -> None:
        self.significance = significance
        self.summary = summary


def summarize_change(diff_text: str, *, api_key: str, model: str) -> ChangeSummary:
    """Ask the configured model to summarize a diff and re-score its significance.

    Called from apps/worker's ai_analyze task after the cheap similarity-based
    score_significance() pass. Raises ChangeRadarError on API failure; callers
    should fall back to the similarity-based score rather than block notification.
    """
    if not api_key:
        raise ChangeRadarError("AI scoring is not configured (missing ANTHROPIC_API_KEY)")

    try:
        import anthropic
    except ImportError as exc:  # pragma: no cover - environment guard
        raise ChangeRadarError("anthropic package is not installed") from exc

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model,
        max_tokens=200,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": diff_text[:12000]}],
    )

    text = "".join(block.text for block in response.content if block.type == "text")
    return _parse_response(text)


def _parse_response(text: str) -> ChangeSummary:
    significance = ChangeSignificance.MINOR
    summary = text.strip()

    for line in text.splitlines():
        if line.upper().startswith("SIGNIFICANCE:"):
            value = line.split(":", 1)[1].strip().lower()
            try:
                significance = ChangeSignificance(value)
            except ValueError:
                pass
        elif line.upper().startswith("SUMMARY:"):
            summary = line.split(":", 1)[1].strip()

    return ChangeSummary(significance=significance, summary=summary)
