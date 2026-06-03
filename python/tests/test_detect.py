from __future__ import annotations

import re
from dataclasses import FrozenInstanceError

import pytest

from id_agent import DuplicateResult, detect_duplicates


def test_detect_duplicates_in_single_string() -> None:
    dupes = detect_duplicates(
        "ID task_red-fox appears here and task_red-fox appears again",
        pattern=r"task_[a-z]+-[a-z]+",
    )

    assert dupes == [DuplicateResult(id="task_red-fox", count=2)]


def test_detect_duplicates_across_multiple_strings() -> None:
    dupes = detect_duplicates(
        [
            'const id = "task_red-fox"',
            'const other = "task_red-fox"',
            'const unique = "task_big-cat"',
        ],
        pattern=r"task_[a-z]+-[a-z]+",
    )

    assert dupes == [DuplicateResult(id="task_red-fox", count=2)]


def test_detect_duplicates_returns_empty_for_unique_matches() -> None:
    assert detect_duplicates("task_one and task_two are unique", pattern=r"task_[a-z]+") == []


def test_detect_duplicates_returns_empty_for_empty_inputs() -> None:
    assert detect_duplicates("", pattern=r"task_\w+") == []
    assert detect_duplicates([], pattern=r"task_\w+") == []


def test_detect_duplicates_is_synchronous_list() -> None:
    result = detect_duplicates("test test", pattern=r"test")

    assert isinstance(result, list)


def test_detect_duplicates_counts_occurrences_in_first_seen_order() -> None:
    dupes = detect_duplicates("id-a id-b id-a id-a id-b", pattern=r"id-[a-z]")

    assert [(dupe.id, dupe.count) for dupe in dupes] == [("id-a", 3), ("id-b", 2)]


def test_detect_duplicates_accepts_compiled_pattern() -> None:
    dupes = detect_duplicates(
        "task_red-fox and task_red-fox again",
        pattern=re.compile(r"task_[a-z]+-[a-z]+"),
    )

    assert dupes == [DuplicateResult(id="task_red-fox", count=2)]


def test_detect_duplicates_omits_unique_matches() -> None:
    dupes = detect_duplicates("id-a id-b id-a id-c", pattern=r"id-[a-z]")

    assert dupes == [DuplicateResult(id="id-a", count=2)]


def test_detect_duplicates_result_is_frozen_dataclass() -> None:
    result = detect_duplicates("id-a id-a", pattern=r"id-[a-z]")[0]

    with pytest.raises(FrozenInstanceError):
        result.count = 3  # type: ignore[misc]


@pytest.mark.parametrize("text", [123, object()])
def test_detect_duplicates_rejects_invalid_text(text: object) -> None:
    with pytest.raises(TypeError):
        detect_duplicates(text, pattern=r"id-[a-z]")  # type: ignore[arg-type]


def test_detect_duplicates_rejects_non_string_iterable_items() -> None:
    with pytest.raises(TypeError):
        detect_duplicates(["ok", 123], pattern=r"id-[a-z]")  # type: ignore[list-item]


@pytest.mark.parametrize("pattern", [None, 123, object()])
def test_detect_duplicates_rejects_invalid_pattern(pattern: object) -> None:
    with pytest.raises(TypeError):
        detect_duplicates("id-a id-a", pattern=pattern)  # type: ignore[arg-type]
