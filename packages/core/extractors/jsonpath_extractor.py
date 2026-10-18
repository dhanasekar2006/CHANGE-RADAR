from __future__ import annotations

import json

from jsonpath_ng.ext import parse as parse_jsonpath

from packages.core.extractors.base import Extractor
from packages.shared.errors import ExtractionError


class JsonPathExtractor(Extractor):
    def extract(self, content: bytes, selector: str | None) -> str:
        try:
            data = json.loads(content)
        except json.JSONDecodeError as exc:
            raise ExtractionError(f"invalid JSON: {exc}") from exc

        if not selector:
            return json.dumps(data, sort_keys=True, indent=2)

        try:
            expr = parse_jsonpath(selector)
        except Exception as exc:  # noqa: BLE001 - invalid expression syntax
            raise ExtractionError(f"invalid JSONPath expression: {selector}") from exc

        matches = [m.value for m in expr.find(data)]
        if not matches:
            raise ExtractionError(f"JSONPath matched nothing: {selector}", selector=selector)

        return json.dumps(matches, sort_keys=True, indent=2)
