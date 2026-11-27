"""Offline safety checks: never contact a browser/API/database from this suite."""
import os
import unittest
from unittest.mock import patch

from navigation_revocation import run_navigation_revocation


class NavigationRevocationFixtureTests(unittest.TestCase):
    def test_rejects_non_disposable_targets_before_io(self):
        valid = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'p0_ar_desktop'}
        for env, base, lang, device, fixture in (
            ({}, 'http://127.0.0.1:5173', 'ar', 'desktop', 'phase0'),
            ({**valid, 'PGDATABASE': 'organization'}, 'http://127.0.0.1:5173', 'ar', 'desktop', 'phase0'),
            ({**valid, 'PGHOST': 'remote'}, 'http://127.0.0.1:5173', 'ar', 'desktop', 'phase0'),
            (valid, 'https://external.example.invalid', 'ar', 'desktop', 'phase0'),
            (valid, 'http://127.0.0.1:5173', 'fr', 'mobile', 'phase0'),
            (valid, 'http://127.0.0.1:5173', 'ar', 'desktop', 'unknown'),
            (valid, 'https://staging.promogest.test:8443', 'ar', 'desktop', 'staging'),
        ):
            with self.subTest(env=env, base=base, fixture=fixture), patch.dict(os.environ, env, clear=True):
                with self.assertRaisesRegex(RuntimeError, 'disposable four-profile CI fixture'):
                    run_navigation_revocation(None, None, None, base, lang, device, None, None, None,
                                              fixture=fixture)

    def test_valid_fixture_rejects_malformed_ids_before_any_io(self):
        env = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'p0_ar_desktop'}
        with patch.dict(os.environ, env, clear=True), self.assertRaises(ValueError):
            run_navigation_revocation(None, None, None, 'http://127.0.0.1:5173', 'ar', 'desktop',
                                      None, 'not-a-uuid', 'also-invalid')


if __name__ == '__main__':
    unittest.main()
