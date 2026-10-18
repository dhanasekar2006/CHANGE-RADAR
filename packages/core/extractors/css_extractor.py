from __future__ import annotations

from bs4 import BeautifulSoup

from packages.core.extractors.base import Extractor
from packages.shared.errors import ExtractionError


class CssExtractor(Extractor):
    def extract(self, content: bytes, selector: str | None) -> str:
        soup = BeautifulSoup(content, "html.parser")
        if not selector:
            return soup.get_text(separator="\n", strip=True)

        matches = soup.select(selector)
        if not matches:
            raise ExtractionError(f"CSS selector matched nothing: {selector}", selector=selector)

        return "\n".join(el.get_text(separator="\n", strip=True) for el in matches)
