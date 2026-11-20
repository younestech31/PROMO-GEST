#!/usr/bin/env python3
"""Tests for scripts/scan-secrets.py.

The scanner is a security control, so its matching rules and its placeholder
exclusions are pinned here. Run with: python3 scripts/test_scan_secrets.py
"""

from __future__ import annotations

import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path

# Importing a hyphenated script must not leave __pycache__ inside the repository.
sys.dont_write_bytecode = True

MODULE_PATH = Path(__file__).resolve().parent / "scan-secrets.py"
SPEC = importlib.util.spec_from_file_location("promogest_secret_scan", MODULE_PATH)
assert SPEC and SPEC.loader
scanner = importlib.util.module_from_spec(SPEC)
# dataclasses resolve annotations through sys.modules during exec_module.
sys.modules[SPEC.name] = scanner
SPEC.loader.exec_module(scanner)


class DetectionTests(unittest.TestCase):
    def findings(self, text: str) -> list[str]:
        return [rule.name for rule, _, _ in scanner.scan(text, scanner.RULES)]

    def test_detects_github_token(self) -> None:
        token = "ghp_" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8"
        self.assertIn("github-token", self.findings(f'GITHUB_TOKEN = "{token}"'))

    def test_detects_aws_access_key(self) -> None:
        # Assembled at runtime so this file never contains a literal key-shaped string.
        example_key = "AKIA" + "IOSFODNN7EXAMPLE"
        self.assertIn("aws-access-key-id", self.findings(f"aws_access_key_id = {example_key}"))

    def test_detects_private_key_block(self) -> None:
        self.assertIn("private-key-block", self.findings("-----BEGIN RSA PRIVATE KEY-----"))

    def test_detects_json_web_token(self) -> None:
        token = (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
            ".eyJzdWIiOiIxMjM0NTY3ODkwIn0"
            ".dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
        )
        self.assertIn("json-web-token", self.findings(f"Authorization: Bearer {token}"))

    def test_detects_connection_string_password(self) -> None:
        self.assertIn(
            "connection-string-password",
            self.findings("Host=db;Database=promogest;Username=app;Password=S3cr3t!Value9"),
        )

    def test_detects_quoted_secret_assignment(self) -> None:
        self.assertIn(
            "generic-assignment",
            self.findings('client_secret: "9f8a7b6c5d4e3f2a1b0c"'),
        )


class PlaceholderTests(unittest.TestCase):
    def test_placeholders_are_ignored(self) -> None:
        samples = [
            "Host=db;Username=app;Password=<secret-from-vault>",
            "Host=db;Username=app;Password=$PGPASSWORD",
            "Host=db;Username=app;Password={0}",
            "Host=db;Username=app;Password=password",
            "Host=db;Username=app;Password=owner_pass",
            "Host=db;Username=app;Password=REPLACE_WITH_OWNER_SECRET",
            "Host=db;Username=app;Password=CHANGE_ME",
            'api_key = "your-api-key-here"',
            "PASSWORD=${DB_PASSWORD}",
        ]
        for sample in samples:
            with self.subTest(sample=sample):
                self.assertEqual([], scanner.scan(sample, scanner.RULES))

    def test_placeholder_detection_rejects_real_values(self) -> None:
        for value in ("9f8a7b6c5d4e3f2a", "Tr0ub4dor&3xample", "A1b2C3d4E5f6G7h8"):
            with self.subTest(value=value):
                self.assertFalse(scanner.is_ignorable(value))


class RepositoryTests(unittest.TestCase):
    def test_allowlist_entries_are_anchored(self) -> None:
        for pattern in scanner.load_allowlist():
            self.assertTrue(
                pattern.pattern.startswith("^"),
                f"allowlist pattern must be anchored: {pattern.pattern}",
            )

    def test_tracked_files_are_clean(self) -> None:
        completed = subprocess.run(
            [sys.executable, str(MODULE_PATH)],
            capture_output=True,
            text=True,
        )
        self.assertEqual(0, completed.returncode, completed.stdout + completed.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
