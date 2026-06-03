from __future__ import annotations

import hashlib
import re
from collections.abc import Mapping
from typing import Any

import pytest

from id_agent import (
    WORDLIST,
    AliasMap,
    detect_duplicates,
    generate_deterministic,
    parse,
    validate,
)
from tests.conformance_fixtures import read_conformance_fixture


def _case_id(case: Mapping[str, Any]) -> str:
    return str(case["name"])


DETERMINISTIC_FIXTURE = read_conformance_fixture("deterministic.json")
PARSE_VALIDATE_FIXTURE = read_conformance_fixture("parse-validate.json")
ALIAS_MAP_FIXTURE = read_conformance_fixture("alias-map.json")
DUPLICATES_FIXTURE = read_conformance_fixture("duplicates.json")
WORDLIST_FIXTURE = read_conformance_fixture("wordlist.json")


@pytest.mark.parametrize(
    "case",
    DETERMINISTIC_FIXTURE["successCases"],
    ids=_case_id,
)
def test_conformance_deterministic_success(case: Mapping[str, Any]) -> None:
    assert generate_deterministic(str(case["input"]), **case["options"]) == case["expected"]


@pytest.mark.parametrize(
    "case",
    DETERMINISTIC_FIXTURE["errorCases"],
    ids=_case_id,
)
def test_conformance_deterministic_errors(case: Mapping[str, Any]) -> None:
    with pytest.raises(ValueError):
        generate_deterministic(str(case["input"]), **case["options"])


@pytest.mark.parametrize(
    "case",
    PARSE_VALIDATE_FIXTURE["parseCases"],
    ids=_case_id,
)
def test_conformance_parse(case: Mapping[str, Any]) -> None:
    result = parse(case["id"])
    expected = case["expected"]

    if expected is None:
        assert result is None
        return

    assert result is not None
    assert result.prefix == expected["prefix"]
    assert result.words == tuple(expected["words"])
    assert result.word_count == expected["wordCount"]
    assert result.bits == expected["bits"]
    assert result.raw == expected["raw"]
    assert result.format == expected["format"]


@pytest.mark.parametrize(
    "case",
    PARSE_VALIDATE_FIXTURE["validateCases"],
    ids=_case_id,
)
def test_conformance_validate(case: Mapping[str, Any]) -> None:
    result = validate(case["id"])
    expected = case["expected"]

    assert result.valid == expected["valid"]
    if "prefix" in expected:
        assert result.prefix == expected["prefix"]
    if "wordCount" in expected:
        assert result.word_count == expected["wordCount"]
    if "words" in expected:
        assert result.words == tuple(expected["words"])
    if "reason" in expected:
        assert result.reason == expected["reason"]
    if "unknownWords" in expected:
        assert result.unknown_words == tuple(expected["unknownWords"])


@pytest.mark.parametrize(
    "case",
    ALIAS_MAP_FIXTURE["cases"],
    ids=_case_id,
)
def test_conformance_alias_map(case: Mapping[str, Any]) -> None:
    alias_map = AliasMap(
        words=case["words"],
        allow_collision=case.get("allowCollision", False),
    )
    expected = case["expected"]

    if case["name"] == "set-shape":
        alias = alias_map.set(str(case["original"]))
        parts = alias.split("-")
        assert len(parts) == expected["aliasWordCount"]
        assert all(word in WORDLIST for word in parts) == expected["aliasWordsInWordlist"]
        assert len(alias_map) == expected["size"]
        assert alias_map.get(alias) == case["original"]

    if case["name"] == "idempotent-set":
        first = alias_map.set(str(case["original"]))
        second = alias_map.set(str(case["original"]))
        assert (first == second) == expected["sameAliasOnRepeatedSet"]
        assert len(alias_map) == expected["size"]

    if case["name"] == "entries-order":
        for original in case["originals"]:
            alias_map.set(str(original))
        entries = alias_map.entries()
        assert [original for original, _alias in entries] == expected["entryOriginals"]
        assert len(entries) == expected["size"]

    if case["name"] == "replace-restore":
        replaced = alias_map.replace(str(case["text"]), pattern=str(case["pattern"]))
        assert len(alias_map) == expected["registered"]
        assert replaced != case["text"]
        assert (alias_map.restore(replaced) == case["text"]) == expected["restoreRoundTrip"]

    if case["name"] == "allow-collision-option":
        alias = alias_map.set(str(case["original"]))
        assert len(alias.split("-")) == expected["aliasWordCount"]
        assert len(alias_map) == expected["size"]


@pytest.mark.parametrize(
    "case",
    DUPLICATES_FIXTURE["cases"],
    ids=_case_id,
)
def test_conformance_duplicates(case: Mapping[str, Any]) -> None:
    duplicates = detect_duplicates(case["text"], pattern=case["pattern"])

    assert [(duplicate.id, duplicate.count) for duplicate in duplicates] == [
        (expected["id"], expected["count"]) for expected in case["expected"]
    ]


def test_conformance_wordlist() -> None:
    fixture = WORDLIST_FIXTURE

    assert len(WORDLIST) == fixture["expectedLength"]
    assert hashlib.sha256(" ".join(WORDLIST).encode()).hexdigest() == fixture["sha256"]

    for index, word in fixture["samples"].items():
        assert WORDLIST[int(index)] == word

    pattern = re.compile(fixture["wordPattern"])
    assert all(pattern.fullmatch(word) for word in WORDLIST)
    assert (len(set(WORDLIST)) == len(WORDLIST)) == fixture["unique"]
    assert (WORDLIST == tuple(sorted(WORDLIST))) == fixture["sorted"]
    assert isinstance(WORDLIST, tuple)
