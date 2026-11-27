"""Offline guard/payload regression; no Playwright or PostgreSQL needed."""
import os
import unittest
from unittest.mock import patch

from organization_permissions import organization_payload, run_organization_permissions


class OrganizationFixtureTests(unittest.TestCase):
    def test_payload_preserves_nullable_fields_and_uses_expected_stamp(self):
        org = {'legalName': 'Before', 'concurrencyStamp': 'version-1',
               'shareCapitalDzd': 0, 'nif': None, 'currencyCode': 'DZD'}
        payload = organization_payload(org, 'After')
        self.assertEqual(payload['legalName'], 'After')
        self.assertEqual(payload['expectedConcurrencyStamp'], 'version-1')
        self.assertEqual(payload['shareCapitalDzd'], 0)
        self.assertIsNone(payload['nif'])
        self.assertNotIn('currencyCode', payload)
        self.assertNotIn('concurrencyStamp', payload)
        self.assertEqual(org['legalName'], 'Before')

    def test_rejects_non_disposable_targets_before_sql_browser_or_filesystem(self):
        valid = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1',
                 'PGDATABASE': 'stg_ar_desktop', 'STAGING_DP_ENCRYPTED': 'true',
                 'STAGING_BASE_URL': 'https://staging.promogest.test:8443'}
        for changes, base, lang, device in (
            ({'GITHUB_ACTIONS': 'false'}, valid['STAGING_BASE_URL'], 'ar', 'desktop'),
            ({'PGDATABASE': 'organization'}, valid['STAGING_BASE_URL'], 'ar', 'desktop'),
            ({'PGHOST': 'remote'}, valid['STAGING_BASE_URL'], 'ar', 'desktop'),
            ({'STAGING_DP_ENCRYPTED': 'false'}, valid['STAGING_BASE_URL'], 'ar', 'desktop'),
            ({}, 'https://external.example.invalid', 'ar', 'desktop'),
            ({}, valid['STAGING_BASE_URL'], 'fr', 'mobile'),
            ({}, valid['STAGING_BASE_URL'], 'en', 'desktop'),
        ):
            with self.subTest(changes=changes, base=base, lang=lang, device=device):
                with patch.dict(os.environ, {**valid, **changes}, clear=True), \
                        patch('organization_permissions.sql') as sql:
                    with self.assertRaises(RuntimeError):
                        run_organization_permissions(None, None, base, lang, device, None, None)
                    sql.assert_not_called()


if __name__ == '__main__':
    unittest.main()
