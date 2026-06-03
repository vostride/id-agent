from __future__ import annotations

import pytest

from id_agent import WORDLIST, generate


def _body_words(value: str) -> list[str]:
    return value.split("_", 1)[-1].split("-")


def test_generate_defaults_to_eight_words() -> None:
    value = generate()

    assert len(value.split("-")) == 8
    assert "_" not in value


@pytest.mark.parametrize("word_count", [1, 3, 12])
def test_generate_word_count(word_count: int) -> None:
    value = generate(words=word_count)
    words = value.split("-")

    assert len(words) == word_count
    assert all(word in WORDLIST for word in words)


def test_generate_one_word_has_no_hyphen() -> None:
    value = generate(words=1)

    assert "-" not in value
    assert value in WORDLIST


def test_generate_prefix_uses_underscore_separator() -> None:
    value = generate(words=3, prefix="task")

    assert value.startswith("task_")
    assert len(_body_words(value)) == 3
    assert all(word in WORDLIST for word in _body_words(value))


def test_generate_uses_randomness_without_brittle_single_pair_assertion() -> None:
    samples = {generate() for _ in range(8)}

    assert len(samples) > 1


@pytest.mark.parametrize("word_count", [0, 17, -1])
def test_generate_rejects_invalid_word_count_values(word_count: int) -> None:
    with pytest.raises(ValueError):
        generate(words=word_count)


@pytest.mark.parametrize("word_count", [3.5, "3", None, True])
def test_generate_rejects_non_integer_word_count(word_count: object) -> None:
    with pytest.raises(TypeError):
        generate(words=word_count)  # type: ignore[arg-type]


@pytest.mark.parametrize("prefix", ["TASK", "my-task", "", "has space"])
def test_generate_rejects_invalid_prefix_values(prefix: str) -> None:
    with pytest.raises(ValueError):
        generate(prefix=prefix)


@pytest.mark.parametrize("prefix", [3, object(), False])
def test_generate_rejects_non_string_prefix(prefix: object) -> None:
    with pytest.raises(TypeError):
        generate(prefix=prefix)  # type: ignore[arg-type]
