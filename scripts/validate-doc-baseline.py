#!/usr/bin/env python3
"""Keep the documented PROMO GEST baseline truthful across the canonical documents.

The repository already records a "current checkpoint" block at the top of every
governing document. Twice on 23 November 2026 those blocks were left describing a
superseded ``main`` merge (PR #228 stale after PR #230; PR #223 stale inside the
decision log). Reviewers had no mechanical way to notice.

This check does two independent things.

1. Offline consistency (always): every canonical document must open with a
   ``## Current ... checkpoint`` heading, must state exactly one claimed ``main``
   SHA, and all canonical documents must agree on that SHA, on its merge PR
   number, and on the checkpoint date. A document that presents two different
   SHAs as current fails.

2. Branch-base agreement (when ``--main-ref`` is supplied and the docs changed):
   a pull request that edits a canonical document must describe the ``main``
   commit its branch was actually built on (the merge base). This is what turns
   "please remember to re-synchronize" into an enforced rule.

Exit codes: 0 = consistent, 1 = drift found, 2 = usage/environment error.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

SHA_RE = re.compile(r"\b([0-9a-f]{40})\b")
PR_RE = re.compile(r"PR\s*#(\d+)")
DATE_RE = re.compile(r"—\s*(\d{1,2} [A-Z][a-z]+ \d{4})\s*$")
CURRENT_HEADING_RE = re.compile(r"^## Current .*checkpoint.*$", re.MULTILINE)
HISTORICAL_HEADING_RE = re.compile(r"^## Historical", re.MULTILINE)
CLAIM_MARKERS = ("Verified live source", "Current verified main SHA")

#: Documents that carry the authoritative baseline. Adding a document here makes
#: the rule apply to it; the list is intentionally explicit so a new document
#: cannot silently escape the check.
CANONICAL_DOCS = (
    "docs/CURRENT-STATE-BASELINE.md",
    "docs/DEVELOPMENT-WORKFLOW.md",
    "docs/DECISION-LOG.md",
    "docs/MASTER-BLUEPRINT.md",
    "docs/MASTER-ROADMAP.md",
    "docs/MODULE-CATALOG.md",
    "docs/QUALITY-AND-RELEASE-GATES.md",
    "docs/REQUIREMENT-TRACEABILITY.md",
    "docs/SECURITY-AND-PERMISSIONS.md",
)


@dataclass(frozen=True)
class Claim:
    """What one canonical document says about the live ``main``."""

    path: str
    heading: str
    date: str | None
    sha: str
    pr: str | None


class Drift(Exception):
    """A documentation baseline inconsistency."""


class EnvironmentProblem(Exception):
    """The check could not run; this must be fixed rather than ignored."""


def _current_prefix(text: str) -> str:
    """Return the part of the document before its first historical block."""
    match = HISTORICAL_HEADING_RE.search(text)
    return text[: match.start()] if match else text


def parse_claim(root: Path, relative: str) -> Claim:
    path = root / relative
    if not path.is_file():
        raise Drift(f"{relative}: canonical document is missing")
    text = path.read_text(encoding="utf-8")
    prefix = _current_prefix(text)

    heading_match = CURRENT_HEADING_RE.search(prefix)
    if not heading_match:
        raise Drift(
            f"{relative}: the first checkpoint must be a '## Current ... checkpoint' "
            "heading before any '## Historical' section"
        )
    heading = heading_match.group(0).strip()
    if prefix.strip().splitlines()[0].strip() != heading:
        raise Drift(f"{relative}: the current checkpoint must be the document's opening heading")

    date_match = DATE_RE.search(heading)
    date = date_match.group(1) if date_match else None
    if date is None:
        raise Drift(f"{relative}: the current checkpoint heading must end with '— <day month year>'")

    claimed: list[tuple[str, str | None]] = []
    for line in prefix.splitlines():
        if not any(marker in line for marker in CLAIM_MARKERS):
            continue
        shas = set(SHA_RE.findall(line))
        if len(shas) != 1:
            found = ", ".join(sorted(shas)) or "none"
            raise Drift(f"{relative}: baseline claim must cite exactly one SHA (found {found})")
        pr_match = PR_RE.search(line)
        claimed.append((shas.pop(), pr_match.group(1) if pr_match else None))

    if not claimed:
        raise Drift(
            f"{relative}: the current checkpoint states no baseline; add a 'Verified live source' "
            "or 'Current verified main SHA' line"
        )
    if len({sha for sha, _ in claimed}) != 1:
        distinct = ", ".join(sorted({sha for sha, _ in claimed}))
        raise Drift(f"{relative}: conflicting current baselines inside one document ({distinct})")
    prs = {pr for _, pr in claimed if pr}
    if len(prs) > 1:
        raise Drift(f"{relative}: conflicting merge PR numbers inside one document ({sorted(prs)})")

    return Claim(
        path=relative,
        heading=heading,
        date=date,
        sha=claimed[0][0],
        pr=next(iter(prs)) if prs else None,
    )


def check_agreement(claims: list[Claim]) -> Claim:
    """Return the agreed claim or raise on any cross-document disagreement."""
    shas = sorted({claim.sha for claim in claims})
    if len(shas) > 1:
        detail = "\n".join(f"  {claim.path}: {claim.sha}" for claim in claims)
        raise Drift(f"canonical documents disagree on the live main SHA:\n{detail}")

    dates = sorted({claim.date for claim in claims if claim.date})
    if len(dates) > 1:
        detail = "\n".join(f"  {claim.path}: {claim.date}" for claim in claims)
        raise Drift(f"canonical documents disagree on the checkpoint date:\n{detail}")

    prs = sorted({claim.pr for claim in claims if claim.pr})
    if len(prs) > 1:
        detail = "\n".join(f"  {claim.path}: PR #{claim.pr}" for claim in claims)
        raise Drift(f"canonical documents disagree on the merge PR:\n{detail}")

    return claims[0]


def _git_probe(root: Path, *args: str) -> bool:
    completed = subprocess.run(
        ["git", "-C", str(root), *args],
        check=False,
        capture_output=True,
        text=True,
    )
    return completed.returncode == 0


def _git(root: Path, *args: str) -> str:
    completed = subprocess.run(
        ["git", "-C", str(root), *args],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        raise Drift(f"git {' '.join(args)} failed: {completed.stderr.strip()}")
    return completed.stdout.strip()


def check_branch_base(root: Path, main_ref: str, canonical: Claim) -> str:
    """Enforce that a docs-touching branch describes the main commit it was cut from."""
    if not _git_probe(root, "rev-parse", "--verify", "--quiet", f"{main_ref}^{{commit}}"):
        raise EnvironmentProblem(
            f"cannot resolve '{main_ref}'; fetch the main branch with full history "
            f"(actions/checkout with fetch-depth: 0) or pass a valid ref"
        )

    head = _git(root, "rev-parse", "HEAD")
    merge_base = _git(root, "merge-base", main_ref, "HEAD")
    if merge_base == head:
        return f"skipped branch-base check: HEAD is the tip of {main_ref}"

    changed = [
        name
        for name in _git(root, "diff", "--name-only", f"{merge_base}..HEAD").splitlines()
        if name in CANONICAL_DOCS
    ]
    if not changed:
        return "skipped branch-base check: no canonical document changed on this branch"

    if canonical.sha != merge_base:
        raise Drift(
            "documented baseline does not match the main commit this branch was built on:\n"
            f"  documented:  {canonical.sha}\n"
            f"  merge base:  {merge_base} ({main_ref})\n"
            f"  changed:     {', '.join(changed)}\n"
            "Re-synchronize the current checkpoint to the merge base before pushing."
        )
    return f"branch base matches the documented baseline ({merge_base})"


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
        default=None,
        help="git ref of the main branch; enables the branch-base agreement check",
    )
    parser.add_argument("--quiet", action="store_true", help="print only failures")
    args = parser.parse_args(argv)

    try:
        claims = [parse_claim(args.root, relative) for relative in CANONICAL_DOCS]
        canonical = check_agreement(claims)
        note = (
            check_branch_base(args.root, args.main_ref, canonical)
            if args.main_ref
            else "skipped branch-base check: no --main-ref supplied"
        )
    except Drift as drift:
        print(f"DOCUMENTATION BASELINE DRIFT: {drift}", file=sys.stderr)
        return 1
    except EnvironmentProblem as problem:
        print(f"DOCUMENTATION BASELINE CHECK CANNOT RUN: {problem}", file=sys.stderr)
        return 2

    if not args.quiet:
        for claim in claims:
            pr = f"PR #{claim.pr}" if claim.pr else "no PR cited"
            print(f"ok  {claim.path}: {claim.sha} ({pr}, {claim.date})")
        print(f"Documented baseline consistent across {len(claims)} canonical documents: {canonical.sha}")
        print(note)
    return 0


if __name__ == "__main__":
    sys.exit(main())
