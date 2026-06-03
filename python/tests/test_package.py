from __future__ import annotations

from importlib import metadata

import pytest

import id_agent


def test_package_imports() -> None:
    assert id_agent.__all__


def test_distribution_metadata_after_install() -> None:
    try:
        package_metadata = metadata.metadata("id-agent")
    except metadata.PackageNotFoundError:
        pytest.skip("id-agent distribution metadata is unavailable without installing the package")

    assert package_metadata["Name"] == "id-agent"
