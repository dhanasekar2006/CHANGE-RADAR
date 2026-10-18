from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class DiffResult:
    has_changes: bool
    summary: str
    """Short, human-readable description, e.g. "+3 lines, -1 line"."""
    payload: str
    """Full diff representation (unified diff text, JSON patch, or image path)."""
    similarity_score: float
    """0.0 (completely different) to 1.0 (identical)."""


class Differ(ABC):
    @abstractmethod
    def diff(self, previous: str, current: str) -> DiffResult:
        raise NotImplementedError
