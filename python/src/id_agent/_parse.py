from __future__ import annotations

import math
import re

from ._types import ParsedId, ValidationResult
from ._wordlist import WORDLIST

_READABLE_BODY_RE = re.compile(r"^[a-z]{2,}(?:[-_][a-z]{2,})*$")
_WORD_SEPARATOR_RE = re.compile(r"[-_]")
_BITS_PER_WORD = math.log2(len(WORDLIST))
_WORD_SET = frozenset(WORDLIST)


def parse(id: object) -> ParsedId | None:
    if not isinstance(id, str) or id == "":
        return None

    prefix: str | None = None
    body = id

    underscore_index = id.find("_")
    if underscore_index > 0:
        prefix = id[:underscore_index]
        body = id[underscore_index + 1 :]

    if body == "":
        return None

    if not _READABLE_BODY_RE.fullmatch(body):
        return None

    words = tuple(_WORD_SEPARATOR_RE.split(body))
    return ParsedId(
        prefix=prefix,
        words=words,
        word_count=len(words),
        bits=len(words) * _BITS_PER_WORD,
        raw=id,
        format="readable",
    )


def validate(id: object) -> ValidationResult:
    if not isinstance(id, str) or id == "":
        return ValidationResult(valid=False, reason="empty string")
    if re.search(r"[A-Z]", id):
        return ValidationResult(valid=False, reason="contains uppercase characters")
    if re.search(r"[^a-z0-9_-]", id):
        return ValidationResult(valid=False, reason="contains invalid characters")

    parsed = parse(id)
    if parsed is None:
        return ValidationResult(valid=False, reason="unrecognized format")

    unknown_words = tuple(word for word in parsed.words if word not in _WORD_SET)
    if unknown_words:
        return ValidationResult(
            valid=False,
            reason=f"unknown words: {', '.join(unknown_words)}",
            unknown_words=unknown_words,
        )

    return ValidationResult(
        valid=True,
        prefix=parsed.prefix,
        word_count=parsed.word_count,
        words=parsed.words,
    )
