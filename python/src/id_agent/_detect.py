from __future__ import annotations

import re
from collections.abc import Iterable

from ._types import DuplicateResult


def detect_duplicates(
    text: str | Iterable[str],
    pattern: str | re.Pattern[str],
) -> list[DuplicateResult]:
    texts = _normalize_texts(text)
    compiled = _compile_pattern(pattern)
    counts: dict[str, int] = {}

    for item in texts:
        for match in compiled.finditer(item):
            matched_id = match.group(0)
            counts[matched_id] = counts.get(matched_id, 0) + 1

    return [
        DuplicateResult(id=matched_id, count=count)
        for matched_id, count in counts.items()
        if count > 1
    ]


def _normalize_texts(text: str | Iterable[str]) -> tuple[str, ...]:
    if isinstance(text, str):
        return (text,)
    if not isinstance(text, Iterable):
        raise TypeError("text must be a string or iterable of strings")

    texts = tuple(text)
    if not all(isinstance(item, str) for item in texts):
        raise TypeError("text iterable must contain only strings")
    return texts


def _compile_pattern(pattern: str | re.Pattern[str]) -> re.Pattern[str]:
    if isinstance(pattern, str):
        return re.compile(pattern)
    if isinstance(pattern, re.Pattern):
        if not isinstance(pattern.pattern, str):
            raise TypeError("pattern must match strings")
        return pattern
    raise TypeError("pattern must be a string regex or compiled regex")
