from __future__ import annotations

import pytest

from id_agent import generate_deterministic


def test_deterministic_default_fixture_matches_js() -> None:
    assert generate_deterministic("hello") == "grad-abies-pace-rob-vera-axis-prep-akin"


def test_deterministic_namespace_fixture_matches_js() -> None:
    assert (
        generate_deterministic("hello", namespace="acme")
        == "reen-fault-adet-crew-frame-ardu-roon-sla"
    )


def test_deterministic_word_count_fixture_matches_js() -> None:
    assert generate_deterministic("hello", words=3) == "grad-abies-pace"


def test_deterministic_prefix_fixture_matches_js() -> None:
    assert (
        generate_deterministic("hello", prefix="task")
        == "task_grad-abies-pace-rob-vera-axis-prep-akin"
    )


def test_deterministic_test_input_fixture_matches_js() -> None:
    assert generate_deterministic("test") == "vai-wend-reject-antic-infer-kay-rise-banner"


def test_deterministic_combined_options_fixture_matches_js() -> None:
    assert (
        generate_deterministic("test", namespace="ns1", words=5, prefix="job")
        == "job_slug-scious-rik-token-grown"
    )


def test_deterministic_rejects_empty_namespace_like_js_runtime() -> None:
    with pytest.raises(ValueError, match="zero-length namespace"):
        generate_deterministic("hello", namespace="")


def test_deterministic_rejects_invalid_input() -> None:
    with pytest.raises(ValueError):
        generate_deterministic("")
    with pytest.raises(TypeError):
        generate_deterministic(123)  # type: ignore[arg-type]


def test_deterministic_reuses_generation_option_validation() -> None:
    with pytest.raises(ValueError):
        generate_deterministic("hello", words=17)
    with pytest.raises(ValueError):
        generate_deterministic("hello", prefix="TASK")
