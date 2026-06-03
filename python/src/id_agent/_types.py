from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class ParsedId:
    prefix: str | None
    words: tuple[str, ...]
    word_count: int
    bits: float
    raw: str
    format: Literal["readable"]


@dataclass(frozen=True)
class ValidationResult:
    valid: bool
    reason: str | None = None
    prefix: str | None = None
    word_count: int | None = None
    words: tuple[str, ...] = ()
    unknown_words: tuple[str, ...] = ()


@dataclass(frozen=True)
class DuplicateResult:
    id: str
    count: int
