from __future__ import annotations

import id_agent
from id_agent import AliasMap, DuplicateResult, detect_duplicates

EXPECTED_PUBLIC_NAMES = {
    "generate",
    "generate_deterministic",
    "parse",
    "validate",
    "AliasMap",
    "detect_duplicates",
    "WORDLIST",
    "ParsedId",
    "ValidationResult",
    "DuplicateResult",
}


def test_public_exports_are_pythonic() -> None:
    assert set(id_agent.__all__) == EXPECTED_PUBLIC_NAMES


def test_js_style_names_are_not_public() -> None:
    forbidden_names = {
        "idAgent",
        "createAliasMap",
        "detectDuplicates",
        "wordCount",
        "allowCollision",
        "from_",
    }

    assert forbidden_names.isdisjoint(id_agent.__all__)
    for name in forbidden_names:
        assert not hasattr(id_agent, name)


def test_utility_exports_are_importable() -> None:
    alias_map = AliasMap(words=2)
    duplicate = detect_duplicates("id-a id-a", pattern=r"id-[a-z]")[0]

    assert alias_map.__class__.__name__ == "AliasMap"
    assert duplicate == DuplicateResult(id="id-a", count=2)


def test_exported_types_have_useful_names_and_repr() -> None:
    duplicate = DuplicateResult(id="task_red-fox", count=2)

    assert DuplicateResult.__name__ == "DuplicateResult"
    assert AliasMap.__name__ == "AliasMap"
    assert "DuplicateResult" in repr(duplicate)
