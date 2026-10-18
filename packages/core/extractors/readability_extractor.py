from __future__ import annotations

from readability import Document

from packages.core.extractors.base import Extractor
from packages.shared.errors import ExtractionError


class ReadabilityExtractor(Extractor):
    """Falls back to Mozilla-Readability-style article extraction.

    Useful for monitors pointed at articles/blog posts where a stable CSS
    selector isn't worth maintaining and "the main content" is good enough.
    """

    def extract(self, content: bytes, selector: str | None) -> str:
        try:
            doc = Document(content)
            summary_html = doc.summary()
        except Exception as exc:  # noqa: BLE001 - third-party parser can raise broadly
            raise ExtractionError(f"readability extraction failed: {exc}") from exc

        from bs4 import BeautifulSoup

        return BeautifulSoup(summary_html, "html.parser").get_text(separator="\n", strip=True)
