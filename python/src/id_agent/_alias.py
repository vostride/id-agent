from __future__ import annotations

import re

from ._generate import _validate_words, generate


class AliasMap:
    def __init__(self, words: int, allow_collision: bool = False) -> None:
        self._words = _validate_words(words)
        if not isinstance(allow_collision, bool):
            raise TypeError("allow_collision must be a bool")
        self._allow_collision = allow_collision
        self._forward: dict[str, str] = {}
        self._reverse: dict[str, str] = {}

    def set(self, original: str) -> str:
        if not isinstance(original, str):
            raise TypeError("original must be a string")

        existing = self._forward.get(original)
        if existing is not None:
            return existing

        while True:
            alias = generate(words=self._words)
            if self._allow_collision or alias not in self._reverse:
                break

        self._forward[original] = alias
        self._reverse[alias] = original
        return alias

    def get(self, alias: str) -> str | None:
        if not isinstance(alias, str):
            raise TypeError("alias must be a string")
        return self._reverse.get(alias)

    def clear(self) -> None:
        self._forward.clear()
        self._reverse.clear()

    def __len__(self) -> int:
        return len(self._forward)

    def entries(self) -> tuple[tuple[str, str], ...]:
        return tuple(self._forward.items())

    def replace(self, text: str, pattern: str | re.Pattern[str] | None = None) -> str:
        if not isinstance(text, str):
            raise TypeError("text must be a string")

        if pattern is not None:
            compiled = _compile_pattern(pattern)
            matches = dict.fromkeys(match.group(0) for match in compiled.finditer(text))
            for match in matches:
                self.set(match)

        regex = _build_replacement_regex(self._forward.keys())
        if regex is None:
            return text
        return regex.sub(lambda match: self._forward.get(match.group(0), match.group(0)), text)

    def restore(self, text: str) -> str:
        if not isinstance(text, str):
            raise TypeError("text must be a string")

        regex = _build_replacement_regex(self._reverse.keys())
        if regex is None:
            return text
        return regex.sub(lambda match: self._reverse.get(match.group(0), match.group(0)), text)


def _compile_pattern(pattern: str | re.Pattern[str]) -> re.Pattern[str]:
    if isinstance(pattern, str):
        return re.compile(pattern)
    if isinstance(pattern, re.Pattern):
        return pattern
    raise TypeError("pattern must be a string regex, compiled regex, or None")


def _build_replacement_regex(keys: object) -> re.Pattern[str] | None:
    sorted_keys = sorted((str(key) for key in keys), key=len, reverse=True)
    if not sorted_keys:
        return None
    return re.compile("|".join(re.escape(key) for key in sorted_keys))
