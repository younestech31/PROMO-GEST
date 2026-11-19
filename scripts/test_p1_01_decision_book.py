import csv
import tempfile
import unittest
from pathlib import Path

from p1_01_decision_book import initialize, validate


class DecisionBookTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.path = Path(tmp.name) / 'book.csv'
        self.source = {k: {'working_row_key': k, 'proposed_code': c}
                       for k, c in [('a', '0101'), ('b', '0102')]}
        initialize(self.path, self.source)

    def change(self, idx=0, **updates):
        with self.path.open() as f:
            data = list(csv.DictReader(f))
        data[idx].update(updates)
        with self.path.open('w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)

    def test_no_overwrite(self):
        self.change(work_status='NEEDS_EVIDENCE', open_question='Which page?')
        before = self.path.read_bytes()
        validate(self.path, self.source)
        with self.assertRaises(FileExistsError):
            initialize(self.path, self.source)
        self.assertEqual(before, self.path.read_bytes())

    def test_rejects_invalid_edits(self):
        for edits in [dict(working_row_key='unknown'), dict(working_row_key='b'), dict(proposed_code='bad'),
                      dict(work_status='APPROVED'), dict(work_status='DECISION_RECORDED'),
                      dict(review_code='0101'), dict(work_status='NEEDS_EVIDENCE')]:
            with self.subTest(edits=edits):
                self.path.unlink()
                initialize(self.path, self.source)
                self.change(**edits)
                with self.assertRaises(ValueError):
                    validate(self.path, self.source)

    def test_documented_decision_and_duplicate_code(self):
        edits = dict(work_status='DECISION_RECORDED', review_code='0101', review_parent='01',
                     review_name_ar='مثال', review_name_fr='Example', valid_from='2026-01-01',
                     decision_reason='Example only', evidence_reference='Test fixture',
                     reviewer='Test reviewer', review_date='2026-11-19')
        self.change(**edits)
        validate(self.path, self.source)
        self.change(1, **edits)
        with self.assertRaisesRegex(ValueError, 'code assigned to both'):
            validate(self.path, self.source)


if __name__ == '__main__':
    unittest.main()
