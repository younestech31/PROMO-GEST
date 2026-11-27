"""Offline P1-17 guarded fixture and narrow mutation payload tests."""
import os
import unittest
from unittest.mock import patch

from language_preferences import preference_payload, prepare_language, verify_language


class LanguageFixtureTests(unittest.TestCase):
    def test_payload_uses_authoritative_user_stamp_not_organization_stamp(self):
        session = {'user': {'concurrencyStamp': 'user-version', 'preferredLanguage': 'ar'},
                   'organization': {'concurrencyStamp': 'organization-version', 'defaultLanguage': 'ar'}}
        self.assertEqual(preference_payload(session, 'fr'), {
            'preferredLanguage': 'fr', 'expectedConcurrencyStamp': 'user-version'})
        self.assertEqual(session['user']['preferredLanguage'], 'ar')
        self.assertEqual(session['organization']['defaultLanguage'], 'ar')

    def test_missing_user_stamp_is_not_replaced_by_organization_stamp(self):
        with self.assertRaises(KeyError):
            preference_payload({'user': {}, 'organization': {'concurrencyStamp': 'wrong'}}, 'fr')

    def test_both_phases_reject_non_disposable_targets_before_io(self):
        valid = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1',
                 'PGDATABASE': 'stg_ar_desktop', 'STAGING_DP_ENCRYPTED': 'true',
                 'STAGING_BASE_URL': 'https://staging.promogest.test:8443'}
        for changes in ({'GITHUB_ACTIONS': 'false'}, {'PGDATABASE': 'organization'},
                        {'PGHOST': 'remote'}, {'STAGING_DP_ENCRYPTED': 'false'},
                        {'STAGING_BASE_URL': 'https://external.example.invalid'}):
            with self.subTest(changes=changes), patch.dict(os.environ, {**valid, **changes}, clear=True):
                with self.assertRaises(RuntimeError):
                    prepare_language(None, None, valid['STAGING_BASE_URL'], 'ar', 'desktop',
                                     None, None, None, None, None)
                with self.assertRaises(RuntimeError):
                    verify_language(None, None, valid['STAGING_BASE_URL'], 'ar', 'desktop', None, None, None)


if __name__ == '__main__':
    unittest.main()
