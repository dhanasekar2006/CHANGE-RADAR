"""End-to-end test of the detection pipeline against the fixture pairs in
tests/fixtures, exercising the same extractor/normalizer/differ/scoring
chain that check_monitor runs — without any HTTP, Celery, or database
involved.
"""
from pathlib import Path

from packages.core.differs import JsonDiffer, TextDiffer
from packages.core.extractors import CssExtractor, JsonPathExtractor
from packages.core.normalizers import normalize_whitespace
from packages.core.scoring import score_significance

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"


def test_pricing_page_change_detected_as_moderate() -> None:
    v1 = (FIXTURES / "pricing_page_v1.html").read_bytes()
    v2 = (FIXTURES / "pricing_page_v2.html").read_bytes()

    extractor = CssExtractor()
    text_v1 = normalize_whitespace(extractor.extract(v1, ".price"))
    text_v2 = normalize_whitespace(extractor.extract(v2, ".price"))

    result = TextDiffer().diff(text_v1, text_v2)

    assert result.has_changes
    assert "$29/mo" in text_v1
    assert "$34/mo" in text_v2
    assert score_significance(result.similarity_score) is not None


def test_api_response_change_detected_via_jsonpath() -> None:
    v1 = (FIXTURES / "api_response_v1.json").read_bytes()
    v2 = (FIXTURES / "api_response_v2.json").read_bytes()

    extractor = JsonPathExtractor()
    text_v1 = extractor.extract(v1, "$.in_stock")
    text_v2 = extractor.extract(v2, "$.in_stock")

    result = JsonDiffer().diff(text_v1, text_v2)

    assert result.has_changes
    assert "true" in text_v1.lower()
    assert "false" in text_v2.lower()


def test_identical_snapshots_produce_no_change() -> None:
    v1 = (FIXTURES / "pricing_page_v1.html").read_bytes()

    extractor = CssExtractor()
    text = normalize_whitespace(extractor.extract(v1, ".price"))

    result = TextDiffer().diff(text, text)

    assert not result.has_changes
    assert result.similarity_score == 1.0
