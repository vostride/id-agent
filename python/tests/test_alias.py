from __future__ import annotations

import re

import pytest

from id_agent import WORDLIST, AliasMap


def test_alias_map_generates_word_based_aliases() -> None:
    alias_map = AliasMap(words=3)
    alias = alias_map.set("some-uuid")
    parts = alias.split("-")

    assert len(parts) == 3
    assert all(word in WORDLIST for word in parts)


def test_alias_map_set_is_idempotent() -> None:
    alias_map = AliasMap(words=3)
    first = alias_map.set("uuid-abc")
    second = alias_map.set("uuid-abc")

    assert first == second
    assert len(alias_map) == 1


def test_alias_map_get_returns_original_by_alias() -> None:
    alias_map = AliasMap(words=3)
    alias = alias_map.set("uuid-abc-123")

    assert alias_map.get(alias) == "uuid-abc-123"


def test_alias_map_get_unknown_returns_none() -> None:
    assert AliasMap(words=3).get("unknown") is None


def test_alias_map_len_entries_and_clear() -> None:
    alias_map = AliasMap(words=2)
    first = alias_map.set("orig-1")
    second = alias_map.set("orig-2")

    assert len(alias_map) == 2
    assert alias_map.entries() == (("orig-1", first), ("orig-2", second))

    alias_map.clear()

    assert len(alias_map) == 0
    assert alias_map.entries() == ()


def test_alias_map_default_avoids_collisions_over_sample() -> None:
    alias_map = AliasMap(words=3)
    aliases = {alias_map.set(f"id-{index}") for index in range(50)}

    assert len(aliases) == 50


def test_alias_map_allow_collision_option_is_accepted() -> None:
    alias = AliasMap(words=2, allow_collision=True).set("test-id")

    assert alias


@pytest.mark.parametrize("word_count", [0, 17])
def test_alias_map_reuses_word_count_validation(word_count: int) -> None:
    with pytest.raises(ValueError):
        AliasMap(words=word_count)


@pytest.mark.parametrize("word_count", [3.5, None, True])
def test_alias_map_rejects_non_integer_words(word_count: object) -> None:
    with pytest.raises(TypeError):
        AliasMap(words=word_count)  # type: ignore[arg-type]


def test_alias_map_rejects_non_bool_allow_collision() -> None:
    with pytest.raises(TypeError):
        AliasMap(words=2, allow_collision="yes")  # type: ignore[arg-type]


def test_alias_map_set_requires_string_original() -> None:
    with pytest.raises(TypeError):
        AliasMap(words=2).set(123)  # type: ignore[arg-type]


UUID_PATTERN = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")


def test_replace_auto_registers_pattern_matches() -> None:
    alias_map = AliasMap(words=2)
    text = (
        "User dc193952-186a-4645-a2c4-ebdadbc9a411 created order "
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
    )
    replaced = alias_map.replace(text, pattern=UUID_PATTERN)

    assert "dc193952" not in replaced
    assert "6ba7b810" not in replaced
    assert len(alias_map) == 2


def test_replace_without_pattern_replaces_registered_originals_only() -> None:
    alias_map = AliasMap(words=2)
    alias = alias_map.set("abc-123")
    replaced = alias_map.replace("ID is abc-123 and also def-456")

    assert alias in replaced
    assert "def-456" in replaced


def test_replace_returns_unchanged_text_when_no_matches_exist() -> None:
    alias_map = AliasMap(words=2)

    assert alias_map.replace("no ids here", pattern=UUID_PATTERN) == "no ids here"


def test_replace_deduplicates_repeated_pattern_matches() -> None:
    alias_map = AliasMap(words=2)
    uuid = "dc193952-186a-4645-a2c4-ebdadbc9a411"
    replaced = alias_map.replace(f"{uuid} appears twice: {uuid}", pattern=UUID_PATTERN)

    assert len(alias_map) == 1
    assert replaced.count(uuid) == 0


def test_restore_round_trip() -> None:
    alias_map = AliasMap(words=3)
    original = (
        "Process dc193952-186a-4645-a2c4-ebdadbc9a411 sent to 6ba7b810-9dad-11d1-80b4-00c04fd430c8"
    )
    replaced = alias_map.replace(original, pattern=UUID_PATTERN)

    assert alias_map.restore(replaced) == original


def test_restore_empty_map_returns_text_unchanged() -> None:
    assert AliasMap(words=2).restore("hello") == "hello"


def test_replace_escapes_regex_characters_in_originals() -> None:
    alias_map = AliasMap(words=2)
    alias = alias_map.set("literal.id+value?")

    assert alias_map.replace("literal.id+value?") == alias


def test_replace_uses_longer_originals_first() -> None:
    alias_map = AliasMap(words=2)
    shorter = alias_map.set("abc")
    longer = alias_map.set("abc-123")

    replaced = alias_map.replace("abc-123 abc")

    assert replaced == f"{longer} {shorter}"


def test_replace_accepts_string_regex_pattern() -> None:
    alias_map = AliasMap(words=2)

    alias_map.replace("id-123 id-123", pattern=r"id-\d+")

    assert len(alias_map) == 1


def test_replace_and_restore_require_string_text() -> None:
    alias_map = AliasMap(words=2)

    with pytest.raises(TypeError):
        alias_map.replace(123)  # type: ignore[arg-type]
    with pytest.raises(TypeError):
        alias_map.restore(123)  # type: ignore[arg-type]
