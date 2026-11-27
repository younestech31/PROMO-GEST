"""Offline checks: P1-10 disposable-only guard and documentary review invariants."""
import os
import unittest
from unittest.mock import patch

from commercialization_review import CHECKS, preserved_hold, run_commercialization_review


class CommercializationReviewTests(unittest.TestCase):
    def test_check_identifiers_are_unique_and_explicit(self):
        self.assertEqual(len(CHECKS), 7)
        self.assertEqual(len(set(CHECKS)), 7)

    def test_review_invariants_exclude_only_documentary_fields(self):
        keys = ('id', 'projectId', 'propertyUnitId', 'projectCustomerId', 'status',
                'expiresAtUtc', 'closedAtUtc', 'closedByUserId', 'closeReason')
        before = {key: key for key in keys}
        after = {**before, 'reviewRequiredAtUtc': 'queued', 'reviewCompletedAtUtc': 'now',
                 'concurrencyStamp': 'new', 'isAwaitingReview': False}
        self.assertEqual(preserved_hold(before), preserved_hold(after))
        for key in keys:
            with self.subTest(key=key):
                self.assertNotEqual(preserved_hold(before), preserved_hold({**after, key: 'changed'}))

    def test_rejects_non_disposable_targets_before_browser_network_or_filesystem(self):
        valid = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'p0_ar_desktop'}
        for changes, base, lang, device in (
            ({'GITHUB_ACTIONS': 'false'}, 'http://127.0.0.1:5173', 'ar', 'desktop'),
            ({'PGDATABASE': 'organization'}, 'http://127.0.0.1:5173', 'ar', 'desktop'),
            ({'PGHOST': 'remote'}, 'http://127.0.0.1:5173', 'ar', 'desktop'),
            ({}, 'https://external.example.invalid', 'ar', 'desktop'),
            ({}, 'http://127.0.0.1:5173', 'fr', 'mobile'),
            ({}, 'http://127.0.0.1:5173', 'en', 'desktop'),
        ):
            with self.subTest(changes=changes, base=base), \
                    patch.dict(os.environ, {**valid, **changes}, clear=True), \
                    patch('commercialization_review.mutation') as network:
                with self.assertRaises(RuntimeError):
                    run_commercialization_review(None, base, lang, device, None)
                network.assert_not_called()


if __name__ == '__main__':
    unittest.main()
