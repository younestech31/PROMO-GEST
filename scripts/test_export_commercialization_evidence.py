#!/usr/bin/env python3
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('commercial_export', Path(__file__).with_name('export-commercialization-evidence.py'))
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)


class CommercializationExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for profile in export.PROFILES:
            lang, device = profile.split('-')
            directory = self.root / profile
            directory.mkdir()
            (directory / 'result.json').write_text(json.dumps({
                'language': lang, 'profile': device, 'commit': 'b' * 40, 'run': '123',
                'mode': 'automated real-browser; not manual acceptance',
                'P1_10': {key: True for key in export.CHECKS},
                'browser': '157.0.1', 'viewport': {'width': 390, 'height': 844} if device == 'mobile'
                else {'width': 1440, 'height': 900}, 'unrelated': 'must not be exported',
            }))

    def test_complete_four_profiles_and_only_allowlisted_fields(self):
        results = export.read_results(self.root, 'a' * 40)
        self.assertEqual(len(results), 4)
        for result in results:
            self.assertEqual(set(result), {'profile', 'sourceHead', 'testedCheckout', 'run',
                                           'checks', 'browser', 'viewport'})
            self.assertEqual(result['sourceHead'], 'a' * 40)

    def test_incomplete_failed_or_mixed_results_rejected(self):
        path = self.root / 'fr-mobile/result.json'
        original = json.loads(path.read_text())
        for key, value in (('P1_10', {}), ('P1_10', {k: 1 for k in export.CHECKS}),
                           ('commit', 'c' * 40), ('run', '456'), ('language', 'ar'),
                           ('browser', 'unsafe string'), ('viewport', {})):
            with self.subTest(key=key, value=value):
                path.write_text(json.dumps({**original, key: value}))
                with self.assertRaises(ValueError):
                    export.read_results(self.root, 'a' * 40)
        path.unlink()
        with self.assertRaises(FileNotFoundError):
            export.read_results(self.root, 'a' * 40)

    def test_symlinks_and_invalid_source_rejected(self):
        path = self.root / 'ar-mobile/result.json'
        path.unlink()
        path.symlink_to(self.root / 'ar-desktop/result.json')
        with self.assertRaises(ValueError):
            export.read_results(self.root, 'a' * 40)
        with self.assertRaises(ValueError):
            export.read_results(self.root, 'not-a-sha')

    def test_notice_transport_bounded_and_separate_from_production(self):
        with contextlib.redirect_stdout(io.StringIO()) as output:
            export.notice('manifest', {'test': 'a' * 6000})
        lines = output.getvalue().splitlines()
        self.assertEqual(len(lines), 3)
        self.assertTrue(all(line.startswith('::notice title=PG-P1-10-manifest:') for line in lines))
        with self.assertRaises(ValueError):
            export.notice('manifest', {'test': 'a' * 30000})

    def test_export_rejects_non_ci_before_io(self):
        with patch.dict('os.environ', {}, clear=True):
            with self.assertRaises(RuntimeError):
                export.main(None, 'manifest')


if __name__ == '__main__':
    unittest.main()
