#!/usr/bin/env python3
"""Self-tests for ``scripts/check-repository-hygiene.py``.

The fixtures are dictionaries and temporary git repositories, so each test proves a
rule rather than the state of this checkout. One test additionally runs the checker
against the real repository to prove the wiring works.
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "check-repository-hygiene.py"
REPO_ROOT = SCRIPT.parent.parent

spec = importlib.util.spec_from_file_location("check_repository_hygiene", SCRIPT)
assert spec and spec.loader
hygiene = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = hygiene
spec.loader.exec_module(hygiene)


def package_json(**dev_dependencies) -> dict:
    return {"dependencies": {}, "devDependencies": dev_dependencies}


def lock_for(package: dict, *, drop: tuple[str, ...] = (), without_entry: tuple[str, ...] = ()) -> dict:
    declared = dict(package.get("devDependencies") or {})
    for name in drop:
        declared.pop(name, None)
    packages = {
        "": {
            "name": "promo-gest-workspace",
            "version": "0.0.0",
            "dependencies": dict(package.get("dependencies") or {}),
            "devDependencies": declared,
        }
    }
    for name, spec_value in (package.get("devDependencies") or {}).items():
        if name in drop or name in without_entry:
            continue
        packages[f"node_modules/{name}"] = {"version": spec_value.lstrip("^~=>"), "resolved": "x"}
    return {"lockfileVersion": 3, "packages": packages}


class LostExecutableBitsTest(unittest.TestCase):
    def test_a_drop_from_755_to_644_is_reported(self) -> None:
        base = {"scripts/check.sh": "100755"}
        current = {"scripts/check.sh": "100644"}
        self.assertEqual(
            hygiene.lost_executable_bits(base, current), ["scripts/check.sh"]
        )

    def test_644_files_are_left_alone(self) -> None:
        # Most scripts here are run as `python3 scripts/x.py` and stay 644 by design.
        base = {"scripts/helper.py": "100644"}
        current = {"scripts/helper.py": "100644"}
        self.assertEqual(hygiene.lost_executable_bits(base, current), [])

    def test_gaining_an_executable_bit_is_not_a_regression(self) -> None:
        base = {"scripts/new.sh": "100644"}
        current = {"scripts/new.sh": "100755"}
        self.assertEqual(hygiene.lost_executable_bits(base, current), [])

    def test_a_deleted_file_is_not_a_mode_regression(self) -> None:
        base = {"scripts/gone.sh": "100755"}
        current: dict[str, str] = {}
        self.assertEqual(hygiene.lost_executable_bits(base, current), [])

    def test_an_unchanged_755_file_passes(self) -> None:
        base = {"scripts/keep.sh": "100755"}
        current = {"scripts/keep.sh": "100755"}
        self.assertEqual(hygiene.lost_executable_bits(base, current), [])


class LockfileTest(unittest.TestCase):
    def test_a_consistent_lockfile_passes(self) -> None:
        package = package_json(**{"@biomejs/biome": "2.6.8", "jsdom": "31.0.1"})
        self.assertEqual(hygiene.lockfile_problems(package, lock_for(package)), [])

    def test_a_dropped_dev_dependency_is_reported(self) -> None:
        # This is the exact 25ee778 / 27b687f regression.
        package = package_json(**{"@biomejs/biome": "2.6.8", "jsdom": "31.0.1"})
        lock = lock_for(package, drop=("@biomejs/biome",))
        problems = hygiene.lockfile_problems(package, lock)
        self.assertTrue(any("@biomejs/biome" in problem for problem in problems), problems)

    def test_a_missing_node_modules_entry_is_reported(self) -> None:
        package = package_json(**{"axe-core": "4.14.1"})
        lock = lock_for(package, without_entry=("axe-core",))
        problems = hygiene.lockfile_problems(package, lock)
        self.assertTrue(any("axe-core" in problem for problem in problems), problems)

    def test_a_changed_spec_is_reported(self) -> None:
        package = package_json(**{"lucide-react": "1.79.0"})
        lock = lock_for(package)
        lock["packages"][""]["devDependencies"]["lucide-react"] = "0.546.0"
        problems = hygiene.lockfile_problems(package, lock)
        self.assertTrue(any("lucide-react" in problem for problem in problems), problems)

    def test_a_lockfile_without_packages_map_is_reported(self) -> None:
        problems = hygiene.lockfile_problems(package_json(), {"lockfileVersion": 1})
        self.assertTrue(any("packages" in problem for problem in problems), problems)


class RealRepositoryTest(unittest.TestCase):
    def test_the_checker_passes_on_this_checkout(self) -> None:
        completed = subprocess.run(
            [sys.executable, str(SCRIPT), "--main-ref", "HEAD", "--quiet"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(
            completed.returncode,
            0,
            f"checker failed against this checkout:\n{completed.stdout}\n{completed.stderr}",
        )

    def test_a_real_mode_regression_is_caught_in_a_temporary_repository(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "scripts").mkdir()
            script = root / "scripts" / "check.sh"
            script.write_text("#!/usr/bin/env bash\nexit 0\n", encoding="utf-8")
            (root / "package.json").write_text(
                json.dumps({"dependencies": {}, "devDependencies": {}}), encoding="utf-8"
            )
            (root / "package-lock.json").write_text(
                json.dumps(
                    {"lockfileVersion": 3, "packages": {"": {"dependencies": {}, "devDependencies": {}}}}
                ),
                encoding="utf-8",
            )

            def git(*args: str) -> None:
                subprocess.run(["git", *args], cwd=root, check=True, capture_output=True)

            git("init", "--quiet")
            git("config", "user.email", "test@example.com")
            git("config", "user.name", "Test")
            git("add", "-A")
            subprocess.run(
                ["git", "update-index", "--chmod=+x", "scripts/check.sh"],
                cwd=root,
                check=True,
                capture_output=True,
            )
            git("commit", "--quiet", "-m", "base")
            base = subprocess.run(
                ["git", "rev-parse", "HEAD"], cwd=root, check=True, capture_output=True, text=True
            ).stdout.strip()

            # The regression: rewrite the file through a path that loses the mode.
            script.write_text("#!/usr/bin/env bash\nexit 0\n", encoding="utf-8")
            script.chmod(0o644)
            git("update-index", "--chmod=-x", "scripts/check.sh")
            git("commit", "--quiet", "-am", "drop the executable bit")

            problems = hygiene.check_repository(root, base)
            self.assertTrue(
                any("scripts/check.sh" in problem for problem in problems), problems
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
