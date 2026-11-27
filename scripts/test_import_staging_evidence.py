#!/usr/bin/env python3
import base64
import copy
import hashlib
import importlib.util
import json
import unittest
from unittest.mock import patch
import tempfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('staging_import', Path(__file__).with_name('import-staging-evidence.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SHA = 'a' * 40


class StagingImportTests(unittest.TestCase):
    def setUp(self):
        data = b'\xff\xd8\xff synthetic JPEG fixture'
        digest = hashlib.sha256(data).hexdigest()
        self.annotations = [{'title': f'PG-STAGING-{profile}:1:1', 'message': json.dumps({
            'profile': profile, 'sha256': digest, 'imageBase64': base64.b64encode(data).decode(),
        })} for profile in module.PROFILES]
        # A real historical manifest exercises backward-compatible staging fields.
        fixture = Path(__file__).resolve().parents[1] / 'docs/evidence/staging-2026-11-27/manifest.json'
        profiles = json.loads(fixture.read_text())['profiles']
        for profile in profiles:
            profile['sourceHead'] = SHA
        manifest = {
            'mode': 'disposable Production HTTPS staging',
            'profiles': profiles,
            'images': [{'profile': profile, 'file': f'{profile}/review.jpg', 'sha256': digest}
                       for profile in module.PROFILES],
        }
        self.manifest = manifest
        self.set_manifest(manifest)

    def set_manifest(self, manifest):
        self.annotations = [a for a in self.annotations if not a['title'].startswith('PG-STAGING-manifest:')]
        text = json.dumps(manifest)
        parts = [text[i:i + 3000] for i in range(0, len(text), 3000)]
        self.annotations += [{'title': f'PG-STAGING-manifest:{i}:{len(parts)}', 'message': part}
                             for i, part in enumerate(parts, 1)]

    def test_imports_complete_matching_evidence(self):
        _, images = module.decode_evidence(self.annotations, SHA)
        self.assertEqual(set(images), set(module.PROFILES))

    def test_reassembles_out_of_order_chunks_and_rejects_missing_piece(self):
        record = self.annotations.pop(0)
        message = record['message']
        pieces = [message[:30], message[30:]]
        for index, piece in enumerate(pieces, 1):
            self.annotations.append({'title': f'PG-STAGING-ar-desktop:{index}:2', 'message': piece})
        self.assertEqual(len(module.decode_evidence(list(reversed(self.annotations)), SHA)[1]), 4)
        self.annotations.pop()
        with self.assertRaisesRegex(ValueError, 'Missing evidence chunk'):
            module.decode_evidence(self.annotations, SHA)

    def test_missing_or_duplicate_annotations_are_rejected(self):
        for records in (self.annotations[:-1], self.annotations + [self.annotations[0]]):
            with self.assertRaises(ValueError):
                module.decode_evidence(records, SHA)

    def test_wrong_source_is_rejected(self):
        with self.assertRaises(ValueError):
            module.decode_evidence(self.annotations, 'b' * 40)

    def test_modified_image_is_rejected(self):
        record = json.loads(self.annotations[0]['message'])
        record['imageBase64'] = base64.b64encode(b'\xff\xd8\xff altered').decode()
        self.annotations[0]['message'] = json.dumps(record)
        with self.assertRaisesRegex(ValueError, 'integrity'):
            module.decode_evidence(self.annotations, SHA)

    def test_manifest_cannot_escape_output_directory(self):
        self.manifest['images'][0]['file'] = '../../private.json'
        self.set_manifest(self.manifest)
        with self.assertRaisesRegex(ValueError, 'path'):
            module.decode_evidence(self.annotations, SHA)

    def test_all_archived_suites_remain_valid(self):
        root = Path(__file__).resolve().parents[1] / 'docs/evidence'
        paths = sorted(root.glob('*/manifest.json'))
        self.assertGreaterEqual(len(paths), 4)
        for path in paths:
            with self.subTest(path=path):
                manifest = json.loads(path.read_text())
                module.validate_manifest(manifest, manifest['profiles'][0]['sourceHead'])

    def test_rejects_missing_failed_or_non_boolean_language_checks(self):
        root = Path(__file__).resolve().parents[1] / 'docs/evidence/p1-17-production-2026-11-27/manifest.json'
        original = json.loads(root.read_text())
        for value in (False, 1, 'true', None):
            with self.subTest(value=value):
                manifest = copy.deepcopy(original)
                checks = manifest['profiles'][0]['languageEvidence']
                checks[next(iter(checks))] = value
                with self.assertRaises(ValueError):
                    module.validate_manifest(manifest, manifest['profiles'][0]['sourceHead'])
        for key in ('languageEvidence', 'sessionEvidence', 'organizationEvidence', 'checks'):
            manifest = copy.deepcopy(original)
            del manifest['profiles'][0][key]
            with self.assertRaises(ValueError):
                module.validate_manifest(manifest, manifest['profiles'][0]['sourceHead'])

    def test_rejects_unexpected_fields_and_mixed_run_or_checkout(self):
        for key, value in (('cookies', 'private'), ('run', '99'),
                           ('testedCheckout', 'b' * 40), ('testedCheckout', 'invalid')):
            with self.subTest(key=key, value=value):
                manifest = copy.deepcopy(self.manifest)
                manifest['profiles'][0][key] = value
                self.set_manifest(manifest)
                with self.assertRaises(ValueError):
                    module.decode_evidence(self.annotations, SHA)

    def test_rejects_unknown_suite_and_suite_downgrade(self):
        manifest = copy.deepcopy(self.manifest)
        manifest['mode'] = 'unrecognized'
        with self.assertRaises(ValueError):
            module.validate_manifest(manifest, SHA)
        manifest['mode'] = 'disposable Production HTTPS language'
        with self.assertRaises(ValueError):
            module.validate_manifest(manifest, SHA)

    def test_rejects_extra_fields_in_image_records(self):
        record = json.loads(self.annotations[0]['message'])
        record['cookies'] = 'private'
        self.annotations[0]['message'] = json.dumps(record)
        with self.assertRaisesRegex(ValueError, 'schema'):
            module.decode_evidence(self.annotations, SHA)

    def test_wrong_requested_run_is_rejected_before_creating_output(self):
        run = {'conclusion': 'success', 'head_repository': {'full_name': module.REPOSITORY},
               'head_sha': SHA}
        jobs = {'jobs': [{'name': '.NET 10 and PostgreSQL 18 least-privilege tests',
                          'id': 123, 'conclusion': 'success'}]}
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / 'evidence'
            with patch.object(module, 'api', side_effect=[run, jobs, self.annotations]), \
                 patch('sys.argv', ['import-staging-evidence.py', '--run', '1', '--out', str(out)]):
                with self.assertRaisesRegex(ValueError, 'run identity'):
                    module.main()
            self.assertFalse(out.exists())

    def test_unrelated_annotations_are_ignored(self):
        annotations = copy.deepcopy(self.annotations)
        annotations.append({'title': 'Unrelated test warning', 'message': 'not JSON'})
        self.assertEqual(len(module.decode_evidence(annotations, SHA)[1]), 4)


if __name__ == '__main__':
    unittest.main()
