from __future__ import annotations

from abc import ABC, abstractmethod


class Extractor(ABC):
    """Pulls the meaningful content out of a raw fetch, given a selector/rule."""

    @abstractmethod
    def extract(self, content: bytes, selector: str | None) -> str:
        """Return the extracted content as a string.

        `selector` is a CSS selector, XPath expression, or JSONPath expression
        depending on the implementation; None means "use the whole document"
        where that's meaningful (e.g. ReadabilityExtractor).
        """
        raise NotImplementedError
