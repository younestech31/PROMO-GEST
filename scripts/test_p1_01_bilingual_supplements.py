import unittest

from p1_01_bilingual_supplements import (
    FLAGGED_QUEUE_102,
    POST_1985_READINGS,
    read_csv,
    validate_flagged_queue_readings,
    validate_post_1985_readings,
)


class BilingualSupplementsTests(unittest.TestCase):
    def setUp(self):
        self.flagged_rows = read_csv(FLAGGED_QUEUE_102)
        self.post_rows = read_csv(POST_1985_READINGS)

    def test_flagged_queue_covers_exact_102_rows(self):
        stats = validate_flagged_queue_readings(self.flagged_rows)
        self.assertEqual(stats['q110_total'], 110)
        self.assertEqual(stats['prior_covered_in_q110'], 8)
        self.assertEqual(stats['supplement_rows'], 102)

    def test_flagged_queue_rejects_missing_or_duplicate_rows(self):
        for mutated in (self.flagged_rows[:-1], self.flagged_rows + [self.flagged_rows[0]]):
            with self.assertRaises(ValueError):
                validate_flagged_queue_readings(mutated)

    def test_flagged_queue_preserves_4907_misprint_and_pending_signoff(self):
        with self.assertRaisesRegex(ValueError, 'code_ar'):
            validate_flagged_queue_readings([
                dict(r, code_ar='3907') if r['jo44_assertion_id'] == 'JO44-1985-W39-07' else r
                for r in self.flagged_rows
            ])
        with self.assertRaisesRegex(ValueError, 'PENDING'):
            validate_flagged_queue_readings([
                dict(self.flagged_rows[0], practitioner_signoff_status='APPROVED'),
                *self.flagged_rows[1:],
            ])

    def test_flagged_queue_rejects_png_sha256_mismatch(self):
        with self.assertRaisesRegex(ValueError, 'sha256'):
            validate_flagged_queue_readings([
                dict(self.flagged_rows[0], ar_image_png_sha256='0' * 64),
                *self.flagged_rows[1:],
            ])

    def test_post_1985_readings_validates_all_38_records(self):
        stats = validate_post_1985_readings(self.post_rows)
        self.assertEqual(stats['total_records'], 38)
        self.assertEqual(stats['BILINGUAL_FR_AR_PNG_VERIFIED'], 23)
        self.assertEqual(stats['PRIMARY_RENAME_ACT_NOT_IN_CACHE'], 8)

    def test_post_1985_rejects_fabricated_image_or_approved_status(self):
        with self.assertRaisesRegex(ValueError, 'sha256'):
            validate_post_1985_readings([
                dict(self.post_rows[0], fr_image_png_sha256='f' * 64),
                *self.post_rows[1:],
            ])
        with self.assertRaisesRegex(ValueError, 'PENDING'):
            validate_post_1985_readings([
                dict(self.post_rows[0], practitioner_signoff_status='APPROVED'),
                *self.post_rows[1:],
            ])


if __name__ == '__main__':
    unittest.main()
