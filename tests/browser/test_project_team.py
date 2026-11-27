"""Offline P1-15 target guard, narrow payload and SQL identifier tests."""
import os
import runpy
from pathlib import Path
import unittest
from unittest.mock import patch

from project_team import audit_counts, member_payload, run_project_team

USER_ID = '10000000-0000-0000-0000-000000000001'


class ProjectTeamTests(unittest.TestCase):
    def test_payload_changes_only_requested_membership_with_no_financial_grant(self):
        self.assertEqual(member_payload(USER_ID, 'ProjectManager'), {
            'userId': USER_ID, 'roleInProject': 'ProjectManager', 'canViewFinancials': False,
            'canManageSales': False, 'canManageConstruction': False, 'canManageDocuments': False,
        })

    def test_exporter_uses_exact_same_named_checks_and_scope(self):
        from project_team import CHECKS, SCOPE
        schema = runpy.run_path(str(Path(__file__).resolve().parents[2] / 'scripts/export-staging-evidence.py'))
        self.assertEqual(CHECKS, schema['TEAM_CHECKS'])
        self.assertEqual(SCOPE, schema['TEAM_SCOPE'])

    def test_invalid_uuid_rejected_before_sql(self):
        with patch('project_team.subprocess.check_output') as sql:
            for invalid in ("x' OR true; --", '', 'not-a-uuid'):
                with self.assertRaises(ValueError):
                    audit_counts(invalid)
                with self.assertRaises(ValueError):
                    member_payload(invalid, 'ProjectManager')
            sql.assert_not_called()

    def test_rejects_non_disposable_targets_before_io(self):
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
            with self.subTest(changes=changes, base=base), \
                    patch.dict(os.environ, {**valid, **changes}, clear=True), \
                    patch('project_team.audit_counts') as sql:
                with self.assertRaises(RuntimeError):
                    run_project_team(None, None, base, lang, device, None, None)
                sql.assert_not_called()


if __name__ == '__main__':
    unittest.main()
