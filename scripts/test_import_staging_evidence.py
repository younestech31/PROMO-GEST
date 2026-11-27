#!/usr/bin/env python3
import base64
import copy
import hashlib
import importlib.util
import json
import unittest
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
        manifest = {
            'profiles': [{'profile': profile, 'status': 'PASS', 'sourceHead': SHA} for profile in module.PROFILES],
            'images': [{'profile': profile, 'file': f'{profile}/review.jpg', 'sha256': digest}
                       for profile in module.PROFILES],
        }
        self.annotations.append({'title': 'PG-STAGING-manifest:1:1', 'message': json.dumps(manifest)})

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
        manifest = json.loads(self.annotations[-1]['message'])
        manifest['images'][0]['file'] = '../../private.json'
        self.annotations[-1]['message'] = json.dumps(manifest)
        with self.assertRaisesRegex(ValueError, 'path'):
            module.decode_evidence(self.annotations, SHA)

    def test_unrelated_annotations_are_ignored(self):
        annotations = copy.deepcopy(self.annotations)
        annotations.append({'title': 'Unrelated test warning', 'message': 'not JSON'})
        self.assertEqual(len(module.decode_evidence(annotations, SHA)[1]), 4)


if __name__ == '__main__':
    unittest.main()
