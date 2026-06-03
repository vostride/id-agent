from __future__ import annotations

import hashlib
import math
import re

from id_agent import WORDLIST


def test_wordlist_has_exact_size() -> None:
    assert len(WORDLIST) == 4096


def test_wordlist_words_are_short_lowercase_ascii() -> None:
    pattern = re.compile(r"^[a-z]{3,6}$")

    for word in WORDLIST:
        assert pattern.fullmatch(word)


def test_wordlist_is_sorted_and_unique() -> None:
    assert WORDLIST == tuple(sorted(WORDLIST))
    assert len(set(WORDLIST)) == len(WORDLIST)


def test_wordlist_count_is_power_of_two() -> None:
    assert math.log2(len(WORDLIST)).is_integer()


def test_wordlist_matches_js_canonical_hash() -> None:
    assert WORDLIST[0] == "aal"
    assert WORDLIST[-1] == "went"
    assert (
        hashlib.sha256(" ".join(WORDLIST).encode()).hexdigest()
        == "b95c87d8d435c1033228ff65283afdc73e882029ba6b5e139d199303b2f39fb6"
    )
