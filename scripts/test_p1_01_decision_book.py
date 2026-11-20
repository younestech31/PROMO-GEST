import csv
import tempfile
import unittest
from pathlib import Path

from p1_01_decision_book import DATA, indexed, initialize, proposals, validate


class DecisionBookTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.path = Path(tmp.name) / 'book.csv'
        self.source = {k: {'working_row_key': k, 'proposed_code': c, 'initial_question': ''}
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

    def test_round_six_questions_and_evidence(self):
        source = proposals()
        path = self.path.with_name('national.csv')
        initialize(path, source)
        records = indexed(path)
        self.assertEqual({k for k, r in records.items() if r['open_question']},
                         {'W08-R012', 'W35-R023', 'W36-R016', 'W30-R007'})
        borma = records['W30-R007']
        self.assertEqual(borma['work_status'], 'PENDING')
        self.assertEqual(borma['valid_from'], '')
        self.assertEqual(borma['proposed_code'], '3021')
        self.assertEqual(borma['conflict_printed_page_ar'],
                         'JO78/2019 art. 3 / 52 bis 6 pp.15-16 | JO79/2021 p.17 (Ouargla); p.21 (Touggourt)')
        for file, digest in zip(('A2019078.pdf', 'A2021079.pdf'), borma['conflict_source_pdf_sha256'].split(' | '), strict=True):
            manifest = (DATA / 'P1-01-DISCREPANCIES-FOR-SIGNOFF.md').read_text(encoding='utf-8')
            self.assertIn(f'`{file}`: `{digest}`', manifest)
            self.assertIn('/' + file, borma['conflict_source_ar_pdf'])
        self.path = path
        self.change(open_question='')
        with self.assertRaisesRegex(ValueError, 'retain initial question'):
            validate(path, source)

    def test_failed_initialization_leaves_destination_absent(self):
        path = self.path.with_name('new.csv')
        bad_source = {k: v.copy() for k, v in self.source.items()}
        bad_source['b']['unexpected'] = 'simulated mid-write failure'
        with self.assertRaises(ValueError):
            initialize(path, bad_source)
        self.assertFalse(path.exists())
        initialize(path, self.source)
        validate(path, self.source)

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
