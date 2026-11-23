#!/usr/bin/env python3
"""Self-tests for ``scripts/validate-doc-baseline.py``.

Fixtures are built in temporary directories so the tests prove the rule, not the
current repository content. One test additionally asserts that the repository's
own canonical documents are consistent today.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "validate-doc-baseline.py"
REPO_ROOT = SCRIPT.parent.parent
sys.path.insert(0, str(SCRIPT.parent))

import importlib.util

spec = importlib.util.spec_from_file_location("validate_doc_baseline", SCRIPT)
assert spec and spec.loader
validator = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = validator
spec.loader.exec_module(validator)

CANONICAL = validator.CANONICAL_DOCS
GOOD_SHA = "a" * 40
OTHER_SHA = "b" * 40
HISTORICAL_SHA = "c" * 40
DATE = "23 November 2026"


def document(sha: str = GOOD_SHA, pr: int = 999, date: str = DATE) -> str:
    return (
        f"## Current operating checkpoint — PR #{pr} merged — {date}\n"
        "\n"
        f"- **Verified live source:** GitHub `main` = `{sha}`, the squash-merge SHA for "
        f"[PR #{pr}](https://example.invalid/pull/{pr}).\n"
        "- **State:** foundation only.\n"
        "\n"
        "---\n"
        "\n"
        "## Historical checkpoint — earlier merge (superseded) — 22 November 2026\n"
        "\n"
        f"- **Verified live source:** GitHub `main` = `{HISTORICAL_SHA}`, an older merge.\n"
    )


def write_docs(root: Path, overrides: dict[str, str] | None = None, sha: str = GOOD_SHA) -> None:
    overrides = overrides or {}
    for relative in CANONICAL:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(overrides.get(relative, document(sha=sha)), encoding="utf-8")


def run(args: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        check=False,
    )


class ConsistencyTests(unittest.TestCase):
    def test_repository_documents_are_consistent(self) -> None:
        completed = run([], REPO_ROOT)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("Documented baseline consistent", completed.stdout)

    def test_accepts_consistent_synthetic_set(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_docs(root)
            completed = run(["--root", str(root)], root)
            self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_detects_single_document_drift(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            stale = CANONICAL[-1]
            write_docs(root, overrides={stale: document(sha=OTHER_SHA)})
            completed = run(["--root", str(root)], root)
            self.assertEqual(completed.returncode, 1)
            self.assertIn("disagree on the live main SHA", completed.stderr)
            self.assertIn(stale, completed.stderr)

    def test_detects_conflicting_claims_inside_one_document(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            conflicting = document().replace(
                "- **State:** foundation only.\n",
                "- **State:** foundation only.\n"
                f"- **Verified live source:** GitHub `main` = `{OTHER_SHA}`, a second claim.\n",
                1,
            )
            write_docs(root, overrides={CANONICAL[0]: conflicting})
            completed = run(["--root", str(root)], root)
            self.assertEqual(completed.returncode, 1)
            self.assertIn("conflicting current baselines", completed.stderr)

    def test_detects_missing_current_heading(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_docs(
                root,
                overrides={
                    CANONICAL[0]: "## Historical checkpoint — only history — 22 November 2026\n"
                    f"\n- **Verified live source:** GitHub `main` = `{GOOD_SHA}`.\n"
                },
            )
            completed = run(["--root", str(root)], root)
            self.assertEqual(completed.returncode, 1)
            self.assertIn("## Current ... checkpoint", completed.stderr)

    def test_detects_missing_baseline_claim(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_docs(
                root,
                overrides={CANONICAL[0]: f"## Current operating checkpoint — nothing cited — {DATE}\n"},
            )
            completed = run(["--root", str(root)], root)
            self.assertEqual(completed.returncode, 1)
            self.assertIn("states no baseline", completed.stderr)

    def test_detects_date_disagreement(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_docs(root, overrides={CANONICAL[1]: document(date="20 November 2026")})
            completed = run(["--root", str(root)], root)
            self.assertEqual(completed.returncode, 1)
            self.assertIn("disagree on the checkpoint date", completed.stderr)

    def test_detects_merge_pr_disagreement(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_docs(root, overrides={CANONICAL[2]: document(pr=998)})
            completed = run(["--root", str(root)], root)
            self.assertEqual(completed.returncode, 1)
            self.assertIn("disagree on the merge PR", completed.stderr)


@unittest.skipUnless(shutil.which("git"), "git is required for branch-base tests")
class BranchBaseTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.env = {
            **os.environ,
            "GIT_AUTHOR_NAME": "Baseline Test",
            "GIT_AUTHOR_EMAIL": "baseline@example.invalid",
            "GIT_COMMITTER_NAME": "Baseline Test",
            "GIT_COMMITTER_EMAIL": "baseline@example.invalid",
            "GIT_CONFIG_NOSYSTEM": "1",
        }
        self.git("init", "-q", "-b", "main")
        self.git("config", "commit.gpgsign", "false")

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def git(self, *args: str) -> str:
        completed = subprocess.run(
            ["git", "-C", str(self.root), *args],
            capture_output=True,
            text=True,
            check=False,
            env=self.env,
        )
        if completed.returncode != 0:
            self.fail(f"git {' '.join(args)} failed: {completed.stderr}")
        return completed.stdout.strip()

    def commit(self, message: str) -> str:
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)
        return self.git("rev-parse", "HEAD")

    def test_requires_documented_baseline_to_match_merge_base(self) -> None:
        write_docs(self.root)
        base = self.commit("docs baseline")
        self.git("checkout", "-q", "-b", "feature")
        write_docs(self.root, sha=base)
        (self.root / CANONICAL[0]).write_text(
            document(sha=base) + "\n- Additional documentation change.\n", encoding="utf-8"
        )
        self.commit("docs: correct baseline")

        accepted = run(["--root", str(self.root), "--main-ref", "main"], self.root)
        self.assertEqual(accepted.returncode, 0, accepted.stderr)
        self.assertIn("branch base matches the documented baseline", accepted.stdout)

        write_docs(self.root, sha=OTHER_SHA)
        (self.root / CANONICAL[0]).write_text(
            document(sha=OTHER_SHA) + "\n- Drifted documentation change.\n", encoding="utf-8"
        )
        self.commit("docs: stale baseline")
        rejected = run(["--root", str(self.root), "--main-ref", "main"], self.root)
        self.assertEqual(rejected.returncode, 1)
        self.assertIn("does not match the main commit this branch was built on", rejected.stderr)

    def test_skips_when_no_canonical_document_changed(self) -> None:
        write_docs(self.root, sha=OTHER_SHA)
        self.commit("docs baseline (deliberately stale)")
        self.git("checkout", "-q", "-b", "feature")
        (self.root / "README.md").write_text("code change only\n", encoding="utf-8")
        self.commit("feat: unrelated change")

        completed = run(["--root", str(self.root), "--main-ref", "main"], self.root)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("no canonical document changed", completed.stdout)

    def test_skips_on_the_tip_of_main(self) -> None:
        write_docs(self.root, sha=OTHER_SHA)
        self.commit("docs baseline (deliberately stale)")

        completed = run(["--root", str(self.root), "--main-ref", "main"], self.root)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("HEAD is the tip", completed.stdout)

    def test_reports_unresolvable_main_ref(self) -> None:
        write_docs(self.root)
        self.commit("docs baseline")

        completed = run(["--root", str(self.root), "--main-ref", "does-not-exist"], self.root)
        self.assertEqual(completed.returncode, 2)
        self.assertIn("cannot resolve 'does-not-exist'", completed.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
