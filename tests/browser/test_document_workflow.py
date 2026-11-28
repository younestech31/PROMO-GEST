"""Offline fail-closed guards only; real document assertions execute in CI browsers."""
import os
import unittest
from unittest.mock import patch

from document_workflow import run_document_workflow


class DocumentWorkflowSafetyTests(unittest.TestCase):
    def test_non_fixture_targets_rejected_before_io(self):
        valid = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'p0_ar_desktop'}
        for env, base, fixture in (
            ({}, 'http://127.0.0.1:5173', 'phase0'),
            ({**valid, 'PGDATABASE': 'organization'}, 'http://127.0.0.1:5173', 'phase0'),
            ({**valid, 'PGHOST': 'remote'}, 'http://127.0.0.1:5173', 'phase0'),
            (valid, 'https://external.example.invalid', 'phase0'),
            (valid, 'http://127.0.0.1:5173', 'unknown'),
            (valid, 'https://staging.promogest.test:8443', 'staging'),
        ):
            with self.subTest(base=base, env=env), patch.dict(os.environ, env, clear=True):
                with self.assertRaisesRegex(RuntimeError, 'disposable four-profile CI fixture'):
                    run_document_workflow(None, None, base, 'ar', 'desktop', None, None, fixture=fixture)

    def test_malformed_project_id_rejected_before_io(self):
        env = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'p0_ar_desktop'}
        with patch.dict(os.environ, env, clear=True), self.assertRaises(ValueError):
            run_document_workflow(None, None, 'http://127.0.0.1:5173', 'ar', 'desktop', None, 'invalid')


if __name__ == '__main__':
    unittest.main()
