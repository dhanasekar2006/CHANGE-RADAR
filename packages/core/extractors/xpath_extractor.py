from __future__ import annotations

from lxml import etree

from packages.core.extractors.base import Extractor
from packages.shared.errors import ExtractionError


class XPathExtractor(Extractor):
    def extract(self, content: bytes, selector: str | None) -> str:
        if not selector:
            raise ExtractionError("XPath extractor requires a selector")

        try:
            tree = etree.HTML(content)
        except etree.XMLSyntaxError as exc:
            raise ExtractionError(f"failed to parse document: {exc}") from exc

        if tree is None:
            raise ExtractionError("failed to parse document: empty tree")

        matches = tree.xpath(selector)
        if not matches:
            raise ExtractionError(f"XPath matched nothing: {selector}", selector=selector)

        parts = [m if isinstance(m, str) else etree.tostring(m, method="text", encoding="unicode") for m in matches]
        return "\n".join(p.strip() for p in parts if p and p.strip())
