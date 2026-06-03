from __future__ import annotations

from dataclasses import FrozenInstanceError

import pytest

from id_agent import ParsedId, ValidationResult, parse, validate


def test_parse_readable_id() -> None:
    result = parse("red-fox-run-big")

    assert result == ParsedId(
        prefix=None,
        words=("red", "fox", "run", "big"),
        word_count=4,
        bits=48,
        raw="red-fox-run-big",
        format="readable",
    )


def test_parse_prefixed_id() -> None:
    result = parse("task_red-fox")

    assert result is not None
    assert result.prefix == "task"
    assert result.words == ("red", "fox")
    assert result.word_count == 2
    assert result.bits == 24


def test_parse_mixed_body_separators_after_prefix() -> None:
    result = parse("task_storm-delta_stone")

    assert result is not None
    assert result.prefix == "task"
    assert result.words == ("storm", "delta", "stone")
    assert result.word_count == 3
    assert result.bits == 36


def test_parse_single_word_body() -> None:
    result = parse("storm")

    assert result is not None
    assert result.prefix is None
    assert result.words == ("storm",)
    assert result.word_count == 1
    assert result.bits == 12


@pytest.mark.parametrize(
    "value",
    ["", "Red-Fox", "!!!invalid!!!", "has spaces", "prefix_", "_body"],
)
def test_parse_rejects_invalid_or_unrecognized_input(value: str) -> None:
    assert parse(value) is None


@pytest.mark.parametrize("value", [None, 123, object()])
def test_parse_rejects_non_string_input(value: object) -> None:
    assert parse(value) is None


def test_parse_does_not_check_word_membership() -> None:
    result = parse("ace-zzzznotaword")

    assert result is not None
    assert result.words == ("ace", "zzzznotaword")


def test_parsed_id_dataclass_is_frozen() -> None:
    parsed = parse("ace-age")

    assert parsed is not None
    with pytest.raises(FrozenInstanceError):
        parsed.word_count = 9  # type: ignore[misc]


def test_validate_accepts_known_words() -> None:
    result = validate("ace-age-aim")

    assert result.valid is True
    assert result.prefix is None
    assert result.word_count == 3
    assert result.words == ("ace", "age", "aim")
    assert result.reason is None


def test_validate_accepts_prefixed_id() -> None:
    result = validate("task_red-fox")

    assert result.valid is True
    assert result.prefix == "task"
    assert result.word_count == 2
    assert result.words == ("red", "fox")


def test_validate_accepts_single_word_id() -> None:
    result = validate("ace")

    assert result.valid is True
    assert result.word_count == 1
    assert result.words == ("ace",)


def test_validate_rejects_empty_and_non_string_as_empty_string() -> None:
    assert validate("").reason == "empty string"
    assert validate(None).reason == "empty string"


def test_validate_rejects_uppercase_before_other_checks() -> None:
    assert validate("HAS-UPPER").reason == "contains uppercase characters"


@pytest.mark.parametrize("value", ["has spaces", "!!!", "ace.age"])
def test_validate_rejects_invalid_characters(value: str) -> None:
    assert validate(value).reason == "contains invalid characters"


def test_validate_reports_unrecognized_format() -> None:
    assert validate("_body").reason == "unrecognized format"


def test_validate_reports_unknown_words() -> None:
    result = validate("ace-zzzznotaword")

    assert result.valid is False
    assert result.reason == "unknown words: zzzznotaword"
    assert result.unknown_words == ("zzzznotaword",)


def test_validation_result_dataclass_is_frozen() -> None:
    validation = validate("ace-age")

    with pytest.raises(FrozenInstanceError):
        validation.valid = False  # type: ignore[misc]


def test_validation_result_default_invalid_shape() -> None:
    result = validate("ace-zzzznotaword")

    assert isinstance(result, ValidationResult)
    assert result.prefix is None
    assert result.word_count is None
    assert result.words == ()
