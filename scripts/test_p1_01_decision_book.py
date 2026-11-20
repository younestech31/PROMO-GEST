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

    def test_ouargla_touggourt_comparison(self):
        comparison = indexed(DATA / 'P1-01-OUARGLA-TOUGGOURT-2019-2021.csv')
        master = indexed(DATA / 'P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv')
        self.assertEqual(set(comparison), {k for k, m in master.items() if m['jo44_wilaya_code'] == '30'})
        for article, count in [('34', 7), ('52 bis 6', 14)]:
            self.assertEqual(sorted(int(r['jo78_item']) for r in comparison.values() if r['jo78_article'] == article),
                             list(range(1, count + 1)))
        differences = set()
        for key, r in comparison.items():
            m = master[key]
            self.assertEqual((r['jo44_assertion_id'], r['jo44_code_fr'], r['jo79_wilaya'], r['jo79_code'], r['jo79_commune_fr']),
                             (m['jo44_assertion_id'], m['jo44_register_code_verbatim'], m['jo79_2021_wilaya'],
                              m['jo79_2021_code'], m['jo79_2021_commune_fr']))
            self.assertEqual(r['jo78_commune_fr'].replace('’', "'"), r['jo79_commune_fr'].replace('’', "'"))
            group = {'34': ('Ouargla', '30'), '52 bis 6': ('Touggourt', '55')}[r['jo78_article']]
            self.assertEqual(r['jo78_list_name'], group[0])
            self.assertEqual(r['jo79_fr_page'], {'30': '15', '55': '19'}[r['jo79_wilaya']])
            if r['jo79_wilaya'] != group[1]:
                differences.add(key)
                self.assertEqual(r['comparison'], 'DIFFERENT_GROUP_EXPLAINED_BY_21_03')
            else:
                self.assertEqual(r['comparison'], 'SAME_GROUP_ONLY')
            self.assertEqual((r['jo22_list_name'], r['jo79_wilaya']),
                             {'34': ('Ouargla', '30'), '52 bis 6': ('Touggourt', '55')}[r['jo22_amended_article']])
            self.assertEqual(int(r['jo22_item']), 8 if key == 'W30-R007' else int(r['jo78_item']))
        for art, count in [('34', 8), ('52 bis 6', 13)]:
            self.assertEqual(sorted(int(r['jo22_item']) for r in comparison.values() if r['jo22_amended_article'] == art),
                             list(range(1, count + 1)))
        self.assertEqual(comparison['W30-R007']['jo22_commune_fr'], 'El Borma')
        self.assertEqual(differences, {'W30-R007'})
        self.assertEqual(comparison['W30-R007']['jo78_item'], '14')

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
