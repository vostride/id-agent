from __future__ import annotations

import tarfile
import zipfile
from email.parser import Parser
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - Python 3.10 fallback
    tomllib = None  # type: ignore[assignment]

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
EXPECTED_NAME = "id-agent"
EXPECTED_REQUIRES_PYTHON = ">=3.10"
FORBIDDEN_WHEEL_PARTS = {
    ".planning",
    ".pytest_cache",
    ".ruff_cache",
    "__pycache__",
    "node_modules",
    "tests",
}
REQUIRED_README_MARKERS = (
    "npm install id-agent",
    "pnpm add id-agent",
    "pip install id-agent",
    "uv add id-agent",
    "import { idAgent } from 'id-agent'",
    "from id_agent import generate",
    "idAgent.from",
    "generate_deterministic",
    "createAliasMap",
    "AliasMap",
    "detectDuplicates",
    "detect_duplicates",
    "wordCount",
    "word_count",
)


def main() -> None:
    expected_version = _expected_version()
    wheel_path = _single_artifact("id_agent-*.whl")
    sdist_path = _single_artifact("id_agent-*.tar.gz")

    _validate_wheel(wheel_path, expected_version)
    _validate_sdist(sdist_path, expected_version)

    print("python package validation passed")


def _expected_version() -> str:
    text = (ROOT / "pyproject.toml").read_text(encoding="utf-8")
    if tomllib is None:
        return _expected_version_from_project_table(text)

    pyproject = tomllib.loads(text)
    version = pyproject.get("project", {}).get("version")
    if not isinstance(version, str) or not version:
        raise AssertionError("expected project.version in pyproject.toml")
    return version


def _expected_version_from_project_table(text: str) -> str:
    in_project = False
    versions: list[str] = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line == "[project]":
            in_project = True
            continue
        if in_project and line.startswith("["):
            break
        if in_project and line.startswith("version"):
            key, separator, value = line.partition("=")
            if key.strip() == "version" and separator:
                versions.append(value.strip().strip('"'))

    if len(versions) != 1 or not versions[0]:
        raise AssertionError("expected exactly one project.version in pyproject.toml")
    return versions[0]


def _single_artifact(pattern: str) -> Path:
    matches = sorted(DIST.glob(pattern))
    if len(matches) != 1:
        raise AssertionError(f"expected exactly one {pattern} artifact, found {len(matches)}")
    return matches[0]


def _validate_wheel(wheel_path: Path, expected_version: str) -> None:
    with zipfile.ZipFile(wheel_path) as wheel:
        names = set(wheel.namelist())
        metadata_name = _single_wheel_metadata_name(names)
        metadata_text = wheel.read(metadata_name).decode("utf-8")
        metadata = Parser().parsestr(metadata_text)

    _assert_equal(metadata["Name"], EXPECTED_NAME, "Name")
    _assert_equal(metadata["Version"], expected_version, "Version")
    _assert_equal(metadata["Requires-Python"], EXPECTED_REQUIRES_PYTHON, "Requires-Python")
    _assert_no_runtime_dependencies(metadata.get_all("Requires-Dist", []))
    _assert_readme_markers(metadata.get_payload(), "wheel METADATA")

    _assert_contains(names, "id_agent/__init__.py")
    _assert_contains(names, "id_agent/_wordlist.py")
    _assert_contains(names, "id_agent/py.typed")
    _assert_wheel_license_included(names)
    _assert_no_forbidden_wheel_files(names)


def _single_wheel_metadata_name(names: set[str]) -> str:
    metadata_names = sorted(name for name in names if name.endswith(".dist-info/METADATA"))
    if len(metadata_names) != 1:
        raise AssertionError(
            f"expected exactly one wheel METADATA file, found {len(metadata_names)}"
        )
    return metadata_names[0]


def _assert_no_runtime_dependencies(requires_dist: list[str]) -> None:
    runtime_dependencies = [entry for entry in requires_dist if "extra ==" not in entry]
    if runtime_dependencies:
        raise AssertionError(f"unexpected runtime Requires-Dist entries: {runtime_dependencies}")


def _assert_no_forbidden_wheel_files(names: set[str]) -> None:
    leaked = sorted(
        name for name in names if any(part in FORBIDDEN_WHEEL_PARTS for part in Path(name).parts)
    )
    if leaked:
        raise AssertionError(f"unexpected files in wheel: {', '.join(leaked)}")


def _validate_sdist(sdist_path: Path, expected_version: str) -> None:
    with tarfile.open(sdist_path) as sdist:
        names = set(sdist.getnames())
        pkg_info_text = _read_sdist_text(sdist, names, "PKG-INFO")
        readme_text = _read_sdist_text(sdist, names, "README.md")
        pkg_info = Parser().parsestr(pkg_info_text)

    _assert_sdist_contains(names, "pyproject.toml")
    _assert_sdist_contains(names, "README.md")
    _assert_sdist_contains(names, "LICENSE")
    _assert_sdist_contains(names, "src/id_agent/__init__.py")
    _assert_sdist_contains(names, "src/id_agent/py.typed")
    _assert_sdist_contains(names, "tests/test_wordlist.py")
    _assert_equal(pkg_info["Name"], EXPECTED_NAME, "sdist Name")
    _assert_equal(pkg_info["Version"], expected_version, "sdist Version")
    _assert_readme_markers(pkg_info.get_payload(), "sdist PKG-INFO")
    _assert_readme_markers(readme_text, "sdist README.md")


def _assert_contains(names: set[str], expected: str) -> None:
    if expected not in names:
        raise AssertionError(f"missing expected wheel file: {expected}")


def _assert_wheel_license_included(names: set[str]) -> None:
    license_names = sorted(
        name for name in names if ".dist-info/licenses/" in name and name.endswith("/LICENSE")
    )
    if not license_names:
        raise AssertionError("missing wheel dist-info license file ending in LICENSE")


def _assert_sdist_contains(names: set[str], expected_suffix: str) -> None:
    if not any(name.endswith(f"/{expected_suffix}") or name == expected_suffix for name in names):
        raise AssertionError(f"missing expected sdist file: {expected_suffix}")


def _read_sdist_text(sdist: tarfile.TarFile, names: set[str], expected_suffix: str) -> str:
    matches = sorted(
        name for name in names if name.endswith(f"/{expected_suffix}") or name == expected_suffix
    )
    if len(matches) != 1:
        raise AssertionError(
            f"expected exactly one sdist {expected_suffix} file, found {len(matches)}"
        )
    extracted = sdist.extractfile(matches[0])
    if extracted is None:
        raise AssertionError(f"could not read sdist file: {matches[0]}")
    return extracted.read().decode("utf-8")


def _assert_readme_markers(text: str, source: str) -> None:
    missing = [marker for marker in REQUIRED_README_MARKERS if marker not in text]
    if missing:
        raise AssertionError(f"{source} missing README markers: {', '.join(missing)}")


def _assert_equal(actual: str | None, expected: str, field: str) -> None:
    if actual != expected:
        raise AssertionError(f"expected {field}: {expected}, got {actual}")


if __name__ == "__main__":
    main()
