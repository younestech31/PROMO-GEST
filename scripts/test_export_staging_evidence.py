#!/usr/bin/env python3
import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('staging_export', Path(__file__).with_name('export-staging-evidence.py'))
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)


class StagingEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for profile in export.PROFILES:
            directory = self.root / profile
            directory.mkdir()
            (directory / 'result.json').write_text(json.dumps({
                'profile': profile, 'status': 'PASS', 'environment': 'Production',
                'sourceHead': 'a' * 40, 'testedCheckout': 'b' * 40,
                'checks': {key: True for key in export.CHECKS},
            }))

    def change(self, key, value):
        path = self.root / 'ar-mobile/result.json'
        result = json.loads(path.read_text())
        result[key] = value
        path.write_text(json.dumps(result))

    def test_requires_all_four_profiles(self):
        self.assertEqual(len(export.read_results(self.root)), 4)
        (self.root / 'fr-mobile/result.json').unlink()
        with self.assertRaises(FileNotFoundError):
            export.read_results(self.root)

    def test_rejects_failed_incomplete_or_non_production_evidence(self):
        for key, value in (('status', 'FAIL'), ('environment', 'Development'), ('checks', {})):
            with self.subTest(key=key):
                self.change(key, value)
                with self.assertRaises(ValueError):
                    export.read_results(self.root)
                self.change(key, {'status': 'PASS', 'environment': 'Production',
                                 'checks': {k: True for k in export.CHECKS}}[key])

    def test_rejects_unexpected_sensitive_fields(self):
        self.change('cookies', ['synthetic sentinel; must never be exported'])
        with self.assertRaisesRegex(ValueError, 'Unexpected evidence field'):
            export.read_results(self.root)

    def test_rejects_mixed_revisions(self):
        self.change('sourceHead', 'c' * 40)
        with self.assertRaisesRegex(ValueError, 'Mixed source'):
            export.read_results(self.root)

    def test_rejects_symlinked_result(self):
        path = self.root / 'ar-mobile/result.json'
        target = self.root / 'ar-desktop/result.json'
        path.unlink()
        path.symlink_to(target)
        with self.assertRaises(ValueError):
            export.read_results(self.root)

    def test_notice_is_bounded_and_escaped(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            export.notice('manifest', {'synthetic': '100%\nline'})
        self.assertIn('100%25', output.getvalue())
        self.assertEqual(output.getvalue().count('\n'), 1)
        with self.assertRaises(ValueError):
            export.notice('manifest', {'data': 'x' * 60001})


if __name__ == '__main__':
    unittest.main()
