from __future__ import annotations

import hashlib
import hmac
import re
import secrets

from ._wordlist import WORDLIST

_MIN_WORDS = 1
_MAX_WORDS = 16
_DEFAULT_WORDS = 8
_DEFAULT_NAMESPACE = "id-agent"
_PREFIX_RE = re.compile(r"^[a-z0-9]+$")


def _validate_words(words: int) -> int:
    if not isinstance(words, int) or isinstance(words, bool):
        raise TypeError("words must be an integer")
    if words < _MIN_WORDS:
        raise ValueError("words must be at least 1")
    if words > _MAX_WORDS:
        raise ValueError("words must be at most 16")
    return words


def _validate_prefix(prefix: str | None) -> str | None:
    if prefix is None:
        return None
    if not isinstance(prefix, str):
        raise TypeError("prefix must be a string or None")
    if not _PREFIX_RE.fullmatch(prefix):
        raise ValueError("prefix must be lowercase alphanumeric")
    return prefix


def _format_id(prefix: str | None, body: str) -> str:
    return f"{prefix}_{body}" if prefix else body


def generate(*, words: int = _DEFAULT_WORDS, prefix: str | None = None) -> str:
    word_count = _validate_words(words)
    checked_prefix = _validate_prefix(prefix)
    selected = [secrets.choice(WORDLIST) for _ in range(word_count)]
    return _format_id(checked_prefix, "-".join(selected))


def generate_deterministic(
    input: str,
    *,
    namespace: str | None = None,
    words: int = _DEFAULT_WORDS,
    prefix: str | None = None,
) -> str:
    if not isinstance(input, str):
        raise TypeError("input must be a non-empty string")
    if input == "":
        raise ValueError("input must be a non-empty string")
    if namespace is None:
        checked_namespace = _DEFAULT_NAMESPACE
    elif not isinstance(namespace, str):
        raise TypeError("namespace must be a string or None")
    elif namespace == "":
        raise ValueError("zero-length namespace is not supported")
    else:
        checked_namespace = namespace

    word_count = _validate_words(words)
    checked_prefix = _validate_prefix(prefix)
    digest = hmac.new(
        checked_namespace.encode("utf-8"),
        input.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    selected = [
        WORDLIST[int.from_bytes(digest[i * 2 : i * 2 + 2], "big") % len(WORDLIST)]
        for i in range(word_count)
    ]
    return _format_id(checked_prefix, "-".join(selected))
