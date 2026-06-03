from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_ROOT.parent
DIST = PYTHON_ROOT / "dist"

IGNORED_BUILD_NAMES = {
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "build",
    "dist",
}


def main() -> None:
    readme_path = REPO_ROOT / "README.md"
    license_path = REPO_ROOT / "LICENSE"
    if not readme_path.is_file():
        raise FileNotFoundError(readme_path)
    if not license_path.is_file():
        raise FileNotFoundError(license_path)

    shutil.rmtree(DIST, ignore_errors=True)
    DIST.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="id-agent-python-build-") as temp_dir:
        staged_root = Path(temp_dir) / "python"
        shutil.copytree(PYTHON_ROOT, staged_root, ignore=_ignore_package_tree_entries)
        shutil.copy2(readme_path, staged_root / "README.md")
        shutil.copy2(license_path, staged_root / "LICENSE")
        _rewrite_staged_pyproject(staged_root / "pyproject.toml")

        subprocess.run(
            [sys.executable, "-m", "build", "--outdir", str(DIST)],
            cwd=staged_root,
            check=True,
        )


def _ignore_package_tree_entries(_directory: str, names: list[str]) -> set[str]:
    return {
        name
        for name in names
        if name in IGNORED_BUILD_NAMES
        or name.endswith(".egg-info")
        or name.endswith(".whl")
        or name.endswith(".tar.gz")
    }


def _rewrite_staged_pyproject(pyproject_path: Path) -> None:
    text = pyproject_path.read_text(encoding="utf-8")
    lines = text.splitlines()
    readme_replacements = 0
    for index, line in enumerate(lines):
        if line.startswith("readme = { text = "):
            lines[index] = 'readme = "README.md"'
            readme_replacements += 1
    if readme_replacements != 1:
        raise RuntimeError(
            "expected exactly one inline project.readme metadata entry, "
            f"found {readme_replacements}"
        )
    text = "\n".join(lines) + "\n"

    old_license = 'license = "MIT"'
    if old_license not in text:
        raise RuntimeError("expected project.license metadata was not found")
    text = text.replace(old_license, f'{old_license}\nlicense-files = ["LICENSE"]', 1)

    old_sdist_include = '  "/pyproject.toml",\n'
    if old_sdist_include not in text:
        raise RuntimeError("expected sdist include list was not found")
    text = text.replace(
        old_sdist_include,
        '  "/pyproject.toml",\n  "/README.md",\n  "/LICENSE",\n',
        1,
    )
    pyproject_path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
