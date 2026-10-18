from __future__ import annotations

import base64
import io

from packages.core.differs.base import DiffResult, Differ


class VisualDiffer(Differ):
    """Pixel-level diff between two screenshots.

    Unlike TextDiffer/JsonDiffer, `previous`/`current` are base64-encoded
    PNG bytes (screenshots captured by BrowserFetcher), not plain text.
    The payload returned is a base64 PNG highlighting changed regions.
    """

    def __init__(self, pixel_threshold: int = 30) -> None:
        self._pixel_threshold = pixel_threshold

    def diff(self, previous: str, current: str) -> DiffResult:
        from PIL import Image, ImageChops

        prev_img = Image.open(io.BytesIO(base64.b64decode(previous))).convert("RGB")
        curr_img = Image.open(io.BytesIO(base64.b64decode(current))).convert("RGB")

        if prev_img.size != curr_img.size:
            curr_img = curr_img.resize(prev_img.size)

        delta = ImageChops.difference(prev_img, curr_img)
        bbox = delta.getbbox()

        histogram = delta.convert("L").histogram()
        changed_pixels = sum(histogram[self._pixel_threshold :])
        total_pixels = prev_img.size[0] * prev_img.size[1]
        similarity = round(1.0 - (changed_pixels / total_pixels), 4) if total_pixels else 1.0

        if bbox is None:
            return DiffResult(has_changes=False, summary="no visual changes", payload="", similarity_score=1.0)

        buffer = io.BytesIO()
        delta.save(buffer, format="PNG")
        payload = base64.b64encode(buffer.getvalue()).decode("ascii")

        return DiffResult(
            has_changes=True,
            summary=f"changed region {bbox}",
            payload=payload,
            similarity_score=similarity,
        )
