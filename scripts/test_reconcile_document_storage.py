#!/usr/bin/env python3
import importlib.util
import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('reconcile-document-storage.py')


class ReconcileDocumentStorageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.storage = self.base / 'storage'
        self.storage.mkdir()
        self.manifest = self.base / 'references.json'
        self.manifest.write_text('[]', encoding='utf-8')

    def write_manifest(self, rows):
        self.manifest.write_text(json.dumps(rows), encoding='utf-8')

    def run_scan(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT), '--manifest', str(self.manifest),
                               '--storage', str(self.storage), *map(str, args)],
                              capture_output=True, text=True, check=False)

    def test_reports_counts_and_private_report_without_deleting(self):
        (self.storage / 'project').mkdir()
        (self.storage / 'project' / 'matched.txt').write_bytes(b'ab')
        (self.storage / 'project' / 'wrong.txt').write_bytes(b'bad')
        (self.storage / 'project' / 'orphan.txt').write_bytes(b'private')
        self.write_manifest([{'path': 'project/matched.txt', 'size': 2},
                             {'path': 'project/wrong.txt', 'size': 2},
                             {'path': 'project/missing.txt', 'size': 1}])
        report = self.base / 'report.json'
        result = self.run_scan('--report', report)
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertNotIn('project/', result.stdout + result.stderr)
        summary = json.loads(result.stdout)
        self.assertEqual(summary['counts'], {'missing': 1, 'unreferenced': 1, 'size_mismatch': 1, 'unsafe_entries': 0})
        findings = json.loads(report.read_text())['findings']
        self.assertEqual(findings['missing'], ['project/missing.txt'])
        self.assertEqual(findings['unreferenced'], ['project/orphan.txt'])
        self.assertEqual(findings['size_mismatch'], ['project/wrong.txt'])
        self.assertEqual(stat.S_IMODE(report.stat().st_mode), 0o600)
        self.assertEqual((self.storage / 'project' / 'orphan.txt').read_bytes(), b'private')

    def test_clean_and_empty(self):
        self.assertEqual(self.run_scan().returncode, 0)
        (self.storage / 'match').write_bytes(b'123')
        self.write_manifest([{'path': 'match', 'size': 3}])
        result = self.run_scan()
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)['references'], 1)

    def test_rejects_invalid_manifest_and_never_reports_paths(self):
        cases = [
            [{'path': '../secret', 'size': 1}], [{'path': '/secret', 'size': 1}],
            [{'path': 'a//secret', 'size': 1}], [{'path': 'a\\secret', 'size': 1}],
            [{'path': 'secret', 'size': True}], [{'path': 'secret', 'size': 0}],
            [{'path': 'secret', 'size': 1, 'other': 4}],
            [{'path': 'secret', 'size': 1}, {'path': 'secret', 'size': 1}],
        ]
        for rows in cases:
            with self.subTest(rows=rows):
                self.write_manifest(rows)
                result = self.run_scan()
                self.assertEqual(result.returncode, 2)
                self.assertNotIn('secret', result.stdout + result.stderr)
                self.assertEqual(result.stdout, '')

    def test_symlinks_are_not_followed_and_are_flagged(self):
        outside = self.base / 'outside'
        outside.mkdir()
        (outside / 'secret').write_bytes(b'ab')
        (self.storage / 'linked-dir').symlink_to(outside, target_is_directory=True)
        (self.storage / 'linked-file').symlink_to(outside / 'secret')
        self.write_manifest([{'path': 'linked-dir/secret', 'size': 2}, {'path': 'linked-file', 'size': 2}])
        report = self.base / 'report.json'
        result = self.run_scan('--report', report)
        self.assertEqual(result.returncode, 1)
        findings = json.loads(report.read_text())['findings']
        self.assertEqual(findings['unsafe_entries'], ['linked-dir', 'linked-file'])
        self.assertEqual(findings['missing'], ['linked-dir/secret', 'linked-file'])
        self.assertEqual(findings['unreferenced'], [])
        self.assertEqual((outside / 'secret').read_bytes(), b'ab')

    def test_symlink_root_is_rejected(self):
        alias = self.base / 'alias'
        alias.symlink_to(self.storage, target_is_directory=True)
        self.storage = alias
        self.assertEqual(self.run_scan().returncode, 2)
        self.storage = str(alias) + '/'
        self.assertEqual(self.run_scan().returncode, 2)

    def test_report_cannot_overwrite_or_live_inside_storage(self):
        existing = self.base / 'existing'
        existing.write_text('do not overwrite')
        self.assertEqual(self.run_scan('--report', existing).returncode, 2)
        self.assertEqual(existing.read_text(), 'do not overwrite')
        self.assertEqual(self.run_scan('--report', self.storage / 'report.json').returncode, 2)
        self.assertFalse((self.storage / 'report.json').exists())
        alias = self.base / 'alias'
        alias.symlink_to(self.storage, target_is_directory=True)
        self.assertEqual(self.run_scan('--report', alias / 'report.json').returncode, 2)

    def test_manifest_cannot_be_inside_storage_even_through_alias(self):
        self.manifest = self.storage / 'references.json'
        self.manifest.write_text('[]', encoding='utf-8')
        self.assertEqual(self.run_scan().returncode, 2)
        alias = self.base / 'manifest-alias'
        alias.symlink_to(self.manifest)
        self.manifest = alias
        self.assertEqual(self.run_scan().returncode, 2)

    def test_missing_storage_and_invalid_json_fail_closed(self):
        self.manifest.write_text('{', encoding='utf-8')
        self.assertEqual(self.run_scan().returncode, 2)
        self.manifest.write_text('[]', encoding='utf-8')
        self.storage = self.base / 'missing'
        result = self.run_scan()
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, '')

    def test_enumeration_errors_fail_closed(self):
        spec = importlib.util.spec_from_file_location('storage_reconciliation', SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        def fail_walk(*args, **kwargs):
            kwargs['onerror'](PermissionError('sensitive-path'))
            return iter(())

        with patch.object(module.os, 'fwalk', fail_walk):
            with self.assertRaises(module.ScanError):
                module.reconcile(str(self.storage), {})

    @unittest.skipUnless(hasattr(os, 'mkfifo'), 'requires POSIX FIFO support')
    def test_non_regular_files_are_flagged_without_reading(self):
        os.mkfifo(self.storage / 'pipe')
        result = self.run_scan()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(json.loads(result.stdout)['counts']['unsafe_entries'], 1)


if __name__ == '__main__':
    unittest.main()
