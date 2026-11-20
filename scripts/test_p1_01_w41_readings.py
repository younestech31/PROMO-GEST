import unittest

from p1_01_w41_readings import SLICE, read, validate


class W41EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.rows = read(SLICE)

    def test_missing_or_duplicate_position(self):
        for rows in (self.rows[:-1], self.rows + [self.rows[0]]):
            with self.assertRaises(ValueError):
                validate(rows)

    def test_codes_not_silently_normalized(self):
        for pos in ('W41-12', 'W41-15', 'W42-29'):
            with self.subTest(pos=pos), self.assertRaisesRegex(ValueError, 'code_ar'):
                validate([dict(r, code_ar=r['code_fr']) if r['jo44_assertion_id'].endswith(pos) else r
                          for r in self.rows])

    def test_incorrect_image_and_swapped_key(self):
        for field in ('ar_image', 'working_row_key'):
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, field):
                validate([dict(self.rows[0], **{field: self.rows[-1][field]}), *self.rows[1:]])


if __name__ == '__main__':
    unittest.main()
