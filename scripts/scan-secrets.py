#!/usr/bin/env python3
"""Fail the build when a tracked file looks like it carries a live credential.

This is a deliberately small, dependency-free companion to GitHub secret scanning:
it runs on every CI job and on any workstation with Python 3, and it only reports
patterns that are unambiguous in this repository. Real secret scanning with push
protection still has to be enabled in the repository settings by an owner; that
step is recorded in docs/QUALITY-AND-RELEASE-GATES.md.

Exit codes: 0 = clean, 1 = findings, 2 = usage/environment error.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ALLOWLIST_PATH = REPO_ROOT / "scripts" / "secret-scan-allowlist.txt"

SKIP_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".pdf", ".zip", ".gz",
    ".tar", ".tgz", ".pfx", ".p12", ".cer", ".crt", ".der", ".dll", ".exe", ".so",
    ".dylib", ".woff", ".woff2", ".ttf", ".otf", ".mp3", ".mp4", ".sqlite", ".sqlite3",
    ".db", ".dmp", ".snk", ".pyc", ".pyo",
}

MAX_FILE_BYTES = 2 * 1024 * 1024

# Placeholders that are explicitly safe, including the values used by CI fixtures and
# documentation. A match is dropped when the captured secret consists only of these.
SAFE_PLACEHOLDER = re.compile(
    r"(?i)^(?:"
    r"<[^>]*>|\$\{[^}]*\}|\{\{[^}]*\}\}|%[A-Z0-9_]+%|"
    r".*(?:replace|change[_-]?me|placeholder|example|sample|dummy|fixture|redacted|"
    r"not[_-]?a[_-]?real|from-vault|secret-from-vault|do-not-backup|do-not-commit|"
    r"do-not-use|test[_-]?only|fake|mock|your[_-]).*"
    r")$"
)


def is_ignorable(value: str) -> bool:
    """Return True when a captured value is structurally a placeholder, not a secret."""

    candidate = value.strip().strip("'\"").rstrip(",.;:)]")
    if not candidate:
        return True
    # Interpolations and template syntax (shell, GitHub expressions, .NET formats).
    if any(character in candidate for character in "$%{}()<>;="):
        return True
    # A lowercase snake_case token is a variable or option name, not a credential.
    if re.fullmatch(r"[a-z][a-z0-9_]*", candidate):
        return True
    if SAFE_PLACEHOLDER.match(candidate):
        return True
    # Deliberately weak CI-only database passwords for the ephemeral PostgreSQL job.
    if re.fullmatch(r"(?i)(?:owner|app|postgres|promogest)[_-]?(?:pass|password)", candidate):
        return True
    return False


@dataclass(frozen=True)
class Rule:
    name: str
    pattern: re.Pattern[str]
    secret_group: int = 0
    # Value rules match `<name>=<value>`, so placeholder heuristics apply. Structural
    # rules (token shapes, key blocks) are high signal and are never downgraded.
    value_rule: bool = False


RULES = (
    Rule(
        "private-key-block",
        re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----"),
    ),
    Rule("aws-access-key-id", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    Rule(
        "github-token",
        re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b"),
    ),
    Rule("slack-token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{12,}\b")),
    Rule("google-api-key", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b")),
    Rule("stripe-secret-key", re.compile(r"\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b")),
    Rule(
        "json-web-token",
        re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b"),
    ),
    Rule(
        "connection-string-password",
        re.compile(
            r"(?i)\b(?:password|pwd)\s*=\s*(?P<secret>[^;'\"\s]{8,})",
        ),
        secret_group=1,
        value_rule=True,
    ),
    Rule(
        "generic-assignment",
        re.compile(
            r"(?i)\b(?:api[_-]?key|apikey|secret[_-]?key|client[_-]?secret|access[_-]?token|"
            r"auth[_-]?token|signing[_-]?key|encryption[_-]?key)\b\s*[:=]\s*[\"'](?P<secret>[^\"'\s]{12,})[\"']",
        ),
        secret_group=1,
        value_rule=True,
    ),
)


def tracked_files() -> list[Path]:
    completed = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
    )
    return [REPO_ROOT / name for name in completed.stdout.decode("utf-8").split("\0") if name]


def load_allowlist() -> list[re.Pattern[str]]:
    if not ALLOWLIST_PATH.exists():
        return []
    patterns: list[re.Pattern[str]] = []
    for raw in ALLOWLIST_PATH.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        patterns.append(re.compile(line))
    return patterns


def read_text(path: Path) -> str | None:
    try:
        if path.stat().st_size > MAX_FILE_BYTES:
            return None
    except OSError:
        return None
    try:
        data = path.read_bytes()
    except OSError:
        return None
    if b"\0" in data[:8192]:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return None


def scan(text: str, rules: tuple[Rule, ...]) -> list[tuple[Rule, int, str]]:
    findings: list[tuple[Rule, int, str]] = []
    for number, line in enumerate(text.splitlines(), start=1):
        for rule in rules:
            match = rule.pattern.search(line)
            if not match:
                continue
            secret = match.group(rule.secret_group)
            if rule.value_rule and is_ignorable(secret):
                continue
            findings.append((rule, number, secret))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--list",
        action="store_true",
        help="print the rules and allowlist that would be applied, then exit",
    )
    arguments = parser.parse_args()

    allowlist = load_allowlist()
    if arguments.list:
        print("Rules:")
        for rule in RULES:
            print(f"  - {rule.name}")
        print("Allowlisted path patterns:")
        for pattern in allowlist:
            print(f"  - {pattern.pattern}")
        return 0

    files = tracked_files()
    findings: list[str] = []
    scanned = 0
    for path in files:
        relative = path.relative_to(REPO_ROOT).as_posix()
        if path.suffix.lower() in SKIP_SUFFIXES:
            continue
        if any(pattern.search(relative) for pattern in allowlist):
            continue
        text = read_text(path)
        if text is None:
            continue
        scanned += 1
        for rule, line, secret in scan(text, RULES):
            masked = secret[:4] + "…" + secret[-2:] if len(secret) > 8 else "…"
            findings.append(f"{relative}:{line}: {rule.name} ({masked})")

    if findings:
        print("Potential secrets found in tracked files:")
        for finding in findings:
            print(f"  {finding}")
        print(
            "\nIf a finding is a test fixture or documentation placeholder, add a narrowly "
            "scoped pattern to scripts/secret-scan-allowlist.txt with a comment explaining why.",
            file=sys.stderr,
        )
        return 1

    print(f"Secret scan clean: {scanned} text files scanned, {len(allowlist)} allowlist patterns, {len(RULES)} rules.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except subprocess.CalledProcessError as error:  # pragma: no cover - environment failure
        print(f"Secret scan could not list tracked files: {error}", file=sys.stderr)
        sys.exit(2)
