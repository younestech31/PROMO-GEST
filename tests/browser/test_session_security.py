"""Offline P1-19 fixture guard and privacy-schema tests."""
import os
import unittest
from unittest.mock import Mock, patch

from session_security import prepare_sessions, run_session_security, validate_inventory


class SessionSecurityTests(unittest.TestCase):
    def test_guard_rejects_before_any_io_for_both_phases(self):
        valid = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1',
                 'PGDATABASE': 'stg_ar_desktop', 'STAGING_DP_ENCRYPTED': 'true',
                 'STAGING_BASE_URL': 'https://staging.promogest.test:8443'}
        for changes in ({'GITHUB_ACTIONS': 'false'}, {'PGDATABASE': 'organization'},
                        {'PGHOST': 'remote'}, {'STAGING_DP_ENCRYPTED': 'false'},
                        {'STAGING_BASE_URL': 'https://external.example.invalid'}):
            with self.subTest(changes=changes), patch.dict(os.environ, {**valid, **changes}, clear=True):
                with self.assertRaises(RuntimeError):
                    prepare_sessions(None, valid['STAGING_BASE_URL'], 'ar', 'desktop', None, None, None, None)
                with self.assertRaises(RuntimeError):
                    run_session_security(None, None, valid['STAGING_BASE_URL'], 'ar', 'desktop', None, None, None)

    def inventory(self):
        return [{'id': '00000000-0000-0000-0000-000000000001', 'createdAtUtc': 'synthetic',
                 'lastSeenAtUtc': 'synthetic', 'expiresAtUtc': 'synthetic', 'ipAddress': None,
                 'userAgent': 'Synthetic test browser', 'isCurrentSession': True}]

    def response(self, rows):
        response = Mock(status=200)
        response.json.return_value = rows
        return response

    def test_accepts_exact_public_inventory_schema(self):
        rows = self.inventory()
        self.assertEqual(validate_inventory(self.response(rows)), rows)

    def test_rejects_secret_or_unexpected_inventory_fields(self):
        for key in ('token', 'tokenHash', 'opaqueToken', 'securityStamp', 'unexpected'):
            with self.subTest(key=key):
                rows = self.inventory()
                rows[0][key] = 'must not export'
                with self.assertRaises(AssertionError):
                    validate_inventory(self.response(rows))

    def test_rejects_missing_or_ambiguous_current_session(self):
        for rows in ([], [{**self.inventory()[0], 'isCurrentSession': False}], self.inventory() * 2):
            with self.subTest(rows=len(rows)), self.assertRaises(AssertionError):
                validate_inventory(self.response(rows))

    def test_rejects_unsafe_session_id_before_audit_query(self):
        rows = self.inventory()
        rows[0]['id'] = "invalid' identifier"
        with self.assertRaises(ValueError):
            validate_inventory(self.response(rows))


if __name__ == '__main__':
    unittest.main()
