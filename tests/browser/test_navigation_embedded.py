"""Offline embedded-navigation target/UUID guard and canonical label checks."""
import os
from pathlib import Path
import unittest
from unittest.mock import patch

from navigation_embedded import run_navigation_embedded


class EmbeddedNavigationSafetyTests(unittest.TestCase):
    def test_rejects_non_disposable_targets_before_io(self):
        valid = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'p0_ar_desktop'}
        for env, base, fixture in (
            ({}, 'http://127.0.0.1:5173', 'phase0'),
            ({**valid, 'PGDATABASE': 'organization'}, 'http://127.0.0.1:5173', 'phase0'),
            ({**valid, 'PGHOST': 'remote'}, 'http://127.0.0.1:5173', 'phase0'),
            (valid, 'https://external.example.invalid', 'phase0'),
            (valid, 'http://127.0.0.1:5173', 'unknown'),
            (valid, 'https://staging.promogest.test:8443', 'staging'),
        ):
            with self.subTest(env=env, base=base, fixture=fixture), patch.dict(os.environ, env, clear=True):
                with self.assertRaisesRegex(RuntimeError, 'disposable four-profile CI fixture'):
                    run_navigation_embedded(None, base, 'ar', 'desktop', None, None, fixture=fixture)

    def test_rejects_malformed_ids_before_io(self):
        valid = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'p0_ar_desktop'}
        with patch.dict(os.environ, valid, clear=True), self.assertRaises(ValueError):
            run_navigation_embedded(None, 'http://127.0.0.1:5173', 'ar', 'desktop', None, 'not-a-uuid')

    def test_uses_canonical_embedded_route_labels(self):
        registry = (Path(__file__).resolve().parents[2] / 'apps/local-web/src/app/routeRegistry.ts').read_text()
        helper = Path(__file__).with_name('navigation_embedded.py').read_text()
        for label in ('الهيكل العقاري', 'Structure & lots', 'الزبائن والمهتمون', 'Clients & CRM',
                      'الحجوزات الداخلية', 'Réservations', 'الوثائق (K-Min)', 'Documents'):
            self.assertIn(label, registry)
            self.assertIn(label, helper)


if __name__ == '__main__':
    unittest.main()
