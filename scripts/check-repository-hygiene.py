#!/usr/bin/env python3
"""Catch the two repository regressions that keep turning ``main`` red.

Both have now happened twice, from commits authored outside a git checkout:

1. **Executable bits dropped.** Files committed as mode ``100644`` that the base
   branch ships as ``100755``. The first time (``25ee778``) this broke
   ``scripts/test_check-backup-freshness.sh`` with ``Permission denied`` and took
   the ``.NET 10 and PostgreSQL 18`` job down; the second time (``27b687f``) it
   did the same again.
2. **Lockfile desync.** ``package-lock.json`` losing the devDependency entries that
   ``package.json`` still declares, so ``npm ci`` refuses to run:
   ``Missing: @biomejs/biome@2.6.8``, ``jsdom``, ``axe-core``, ``@types/jsdom``.

The mode rule compares against the merge base rather than enforcing a global
"everything is 755" policy, because most scripts here are invoked as
``python3 scripts/x.py`` or ``bash scripts/x.sh`` and deliberately keep 644. Only a
*drop* relative to the base branch is a regression.

Exit codes: 0 = clean, 1 = regression found, 2 = the check could not run.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

EXECUTABLE_MODE = "100755"
REGULAR_MODE = "100644"


class Regression(Exception):
    """A repository-level regression that must fail the build."""


class EnvironmentProblem(Exception):
    """The check could not run; this is a defect in the pipeline, not the diff."""


def parse_ls_tree(output: str) -> dict[str, str]:
    """Map path -> mode from ``git ls-tree -r`` output."""
    modes: dict[str, str] = {}
    for line in output.splitlines():
        if not line.strip():
            continue
        meta, _, path = line.partition("\t")
        parts = meta.split()
        if len(parts) < 3 or not path:
            raise EnvironmentProblem(f"unexpected git ls-tree line: {line!r}")
        modes[path] = parts[0]
    return modes


def lost_executable_bits(base: dict[str, str], current: dict[str, str]) -> list[str]:
    """Return the files that were executable in the base and are not any more."""
    regressed = []
    for path, mode in sorted(base.items()):
        if mode != EXECUTABLE_MODE:
            continue
        if path not in current:
            continue  # deleted on purpose; deletion is not a mode regression
        if current[path] != EXECUTABLE_MODE:
            regressed.append(path)
    return regressed


def lockfile_problems(package: dict, lock: dict) -> list[str]:
    """Return every way the lockfile fails to match package.json.

    Deliberately structural rather than a full semver resolution: the failure this
    guards against is an entry disappearing, not a range being hard to satisfy.
    """
    problems: list[str] = []
    packages = lock.get("packages")
    if not isinstance(packages, dict):
        return ["package-lock.json has no 'packages' map (npm lockfileVersion < 2?)"]
    root = packages.get("")
    if not isinstance(root, dict):
        return ["package-lock.json has no root package entry ('packages[\"\"]')"]

    for section in ("dependencies", "devDependencies"):
        declared = package.get(section) or {}
        locked = root.get(section) or {}
        for name, spec in sorted(declared.items()):
            if name not in locked:
                problems.append(
                    f"{section}.{name} is declared in package.json but missing from the "
                    "lockfile root entry"
                )
                continue
            if locked[name] != spec:
                problems.append(
                    f"{section}.{name} is {spec!r} in package.json but {locked[name]!r} in the lockfile"
                )
            entry = packages.get(f"node_modules/{name}")
            if not isinstance(entry, dict):
                problems.append(
                    f"{section}.{name} has no resolved node_modules/{name} entry in the lockfile"
                )
                continue
            if not entry.get("version"):
                problems.append(f"node_modules/{name} entry in the lockfile has no version")
    return problems


def run_git(root: Path, *args: str) -> str:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as error:  # pragma: no cover - environment guard
        raise EnvironmentProblem(f"git is not available: {error}") from error
    except subprocess.CalledProcessError as error:
        raise EnvironmentProblem(
            f"git {' '.join(args)} failed: {error.stderr.strip() or error.returncode}"
        ) from error
    return completed.stdout


def tree_modes(root: Path, ref: str) -> dict[str, str]:
    return parse_ls_tree(run_git(root, "ls-tree", "-r", ref))


def index_modes(root: Path) -> dict[str, str]:
    output = run_git(root, "ls-files", "--stage")
    modes: dict[str, str] = {}
    for line in output.splitlines():
        if not line.strip():
            continue
        meta, _, path = line.partition("\t")
        parts = meta.split()
        if len(parts) < 3 or not path:
            raise EnvironmentProblem(f"unexpected git ls-files line: {line!r}")
        modes[path] = parts[0]
    return modes


def check_repository(root: Path, main_ref: str) -> list[str]:
    """Return human-readable problems; empty means clean."""
    problems: list[str] = []

    regressed = lost_executable_bits(tree_modes(root, main_ref), index_modes(root))
    for path in regressed:
        problems.append(
            f"{path} is {EXECUTABLE_MODE} in {main_ref} but {REGULAR_MODE} here; "
            "restore it with: chmod +x <file> && git update-index --chmod=+x <file>"
        )

    package_path = root / "package.json"
    lock_path = root / "package-lock.json"
    if not package_path.is_file() or not lock_path.is_file():
        raise EnvironmentProblem("package.json or package-lock.json is missing")
    package = json.loads(package_path.read_text(encoding="utf-8"))
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    problems.extend(lockfile_problems(package, lock))

    return problems


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="repository root (default: the parent of this script)",
    )
    parser.add_argument(
        "--main-ref",
        default="origin/main",
        help="git ref to compare executable bits against (default: origin/main)",
    )
    parser.add_argument("--quiet", action="store_true", help="print only failures")
    args = parser.parse_args(argv)

    try:
        problems = check_repository(args.root, args.main_ref)
    except (Regression, EnvironmentProblem) as problem:
        print(f"REPOSITORY HYGIENE CHECK CANNOT RUN: {problem}", file=sys.stderr)
        return 2

    if problems:
        print("REPOSITORY HYGIENE REGRESSION:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1

    if not args.quiet:
        print(
            "Repository hygiene clean: no executable bit lost against "
            f"{args.main_ref}, and package-lock.json matches package.json."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
