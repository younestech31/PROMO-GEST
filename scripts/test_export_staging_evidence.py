#!/usr/bin/env python3
import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('staging_export', Path(__file__).with_name('export-staging-evidence.py'))
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)


class StagingEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for profile in export.PROFILES:
            directory = self.root / profile
            directory.mkdir()
            (directory / 'result.json').write_text(json.dumps({
                'profile': profile, 'status': 'PASS', 'environment': 'Production',
                'sourceHead': 'a' * 40, 'testedCheckout': 'b' * 40,
                'checks': {key: True for key in export.CHECKS},
            }))

    def change(self, key, value):
        path = self.root / 'ar-mobile/result.json'
        result = json.loads(path.read_text())
        result[key] = value
        path.write_text(json.dumps(result))

    def organization_fixture(self):
        for profile in export.PROFILES:
            (self.root / profile / 'organization-permissions.json').write_text(json.dumps({
                'profile': profile, 'status': 'PASS',
                'checks': {key: True for key in export.ORGANIZATION_CHECKS},
                'scope': 'P1-09 disposable Production HTTPS; temporary VIEWER grant revoked',
            }))

    def test_organization_requires_complete_four_profile_evidence(self):
        self.organization_fixture()
        self.assertEqual(set(export.read_organization_results(self.root)), set(export.PROFILES))
        (self.root / 'fr-mobile/organization-permissions.json').unlink()
        with self.assertRaises(FileNotFoundError):
            export.read_organization_results(self.root)

    def test_organization_rejects_failures_extra_fields_and_wrong_identity(self):
        for key, value in (('status', 'FAIL'), ('checks', {}), ('profile', 'fr-mobile'),
                           ('cookies', 'must never export'), ('scope', 'unexpected')):
            with self.subTest(key=key):
                self.organization_fixture()
                path = self.root / 'ar-desktop/organization-permissions.json'
                result = json.loads(path.read_text())
                result[key] = value
                path.write_text(json.dumps(result))
                with self.assertRaises(ValueError):
                    export.read_organization_results(self.root)

    def test_organization_rejects_symlinked_result(self):
        self.organization_fixture()
        path = self.root / 'ar-mobile/organization-permissions.json'
        path.unlink()
        path.symlink_to(self.root / 'ar-desktop/organization-permissions.json')
        with self.assertRaises(ValueError):
            export.read_organization_results(self.root)

    def session_fixture(self):
        for profile in export.PROFILES:
            (self.root / profile / 'session-security.json').write_text(json.dumps({
                'profile': profile, 'status': 'PASS',
                'checks': {key: True for key in export.SESSION_CHECKS}, 'scope': export.SCOPE,
            }))

    def test_sessions_require_complete_four_profile_evidence(self):
        self.session_fixture()
        self.assertEqual(set(export.read_session_results(self.root)), set(export.PROFILES))
        (self.root / 'fr-mobile/session-security.json').unlink()
        with self.assertRaises(FileNotFoundError):
            export.read_session_results(self.root)

    def test_sessions_reject_failures_secret_fields_and_wrong_identity(self):
        for key, value in (('status', 'FAIL'), ('checks', {}), ('profile', 'fr-mobile'),
                           ('token', 'must never export'), ('scope', 'unexpected'),
                           ('checks', {k: False for k in export.SESSION_CHECKS})):
            with self.subTest(key=key):
                self.session_fixture()
                path = self.root / 'ar-desktop/session-security.json'
                result = json.loads(path.read_text())
                result[key] = value
                path.write_text(json.dumps(result))
                with self.assertRaises(ValueError):
                    export.read_session_results(self.root)

    def test_sessions_reject_symlinked_result(self):
        self.session_fixture()
        path = self.root / 'ar-mobile/session-security.json'
        path.unlink()
        path.symlink_to(self.root / 'ar-desktop/session-security.json')
        with self.assertRaises(ValueError):
            export.read_session_results(self.root)

    def language_fixture(self):
        for profile in export.PROFILES:
            (self.root / profile / 'language-preferences.json').write_text(json.dumps({
                'profile': profile, 'status': 'PASS',
                'checks': {key: True for key in export.LANGUAGE_CHECKS}, 'scope': export.LANGUAGE_SCOPE,
            }))

    def test_language_requires_complete_four_profile_evidence(self):
        self.language_fixture()
        self.assertEqual(set(export.read_language_results(self.root)), set(export.PROFILES))
        (self.root / 'fr-mobile/language-preferences.json').unlink()
        with self.assertRaises(FileNotFoundError):
            export.read_language_results(self.root)

    def test_language_rejects_failures_secret_fields_and_wrong_identity(self):
        for key, value in (('status', 'FAIL'), ('checks', {}), ('profile', 'fr-mobile'),
                           ('cookies', 'must never export'), ('scope', 'unexpected'),
                           ('checks', {k: False for k in export.LANGUAGE_CHECKS})):
            with self.subTest(key=key):
                self.language_fixture()
                path = self.root / 'ar-desktop/language-preferences.json'
                result = json.loads(path.read_text())
                result[key] = value
                path.write_text(json.dumps(result))
                with self.assertRaises(ValueError):
                    export.read_language_results(self.root)

    def test_language_rejects_symlinked_result(self):
        self.language_fixture()
        path = self.root / 'ar-mobile/language-preferences.json'
        path.unlink()
        path.symlink_to(self.root / 'ar-desktop/language-preferences.json')
        with self.assertRaises(ValueError):
            export.read_language_results(self.root)

    def team_fixture(self):
        for profile in export.PROFILES:
            (self.root / profile / 'project-team.json').write_text(json.dumps({
                'profile': profile, 'status': 'PASS',
                'checks': {key: True for key in export.TEAM_CHECKS}, 'scope': export.TEAM_SCOPE,
            }))

    def test_team_requires_all_four_profiles(self):
        self.team_fixture()
        self.assertEqual(set(export.read_team_results(self.root)), set(export.PROFILES))
        (self.root / 'fr-mobile/project-team.json').unlink()
        with self.assertRaises(FileNotFoundError):
            export.read_team_results(self.root)

    def test_team_rejects_failure_secrets_wrong_identity_and_non_boolean_checks(self):
        for key, value in (('status', 'FAIL'), ('checks', {}), ('profile', 'fr-mobile'),
                           ('cookies', 'must never export'), ('scope', 'unexpected'),
                           ('checks', {k: 1 for k in export.TEAM_CHECKS})):
            with self.subTest(key=key):
                self.team_fixture()
                path = self.root / 'ar-desktop/project-team.json'
                result = json.loads(path.read_text())
                result[key] = value
                path.write_text(json.dumps(result))
                with self.assertRaises(ValueError):
                    export.read_team_results(self.root)

    def test_team_rejects_symlinked_result(self):
        self.team_fixture()
        path = self.root / 'ar-mobile/project-team.json'
        path.unlink()
        path.symlink_to(self.root / 'ar-desktop/project-team.json')
        with self.assertRaises(ValueError):
            export.read_team_results(self.root)

    def test_requires_all_four_profiles(self):
        self.assertEqual(len(export.read_results(self.root)), 4)
        (self.root / 'fr-mobile/result.json').unlink()
        with self.assertRaises(FileNotFoundError):
            export.read_results(self.root)

    def test_rejects_failed_incomplete_or_non_production_evidence(self):
        for key, value in (('status', 'FAIL'), ('environment', 'Development'), ('checks', {})):
            with self.subTest(key=key):
                self.change(key, value)
                with self.assertRaises(ValueError):
                    export.read_results(self.root)
                self.change(key, {'status': 'PASS', 'environment': 'Production',
                                 'checks': {k: True for k in export.CHECKS}}[key])

    def test_rejects_unexpected_sensitive_fields(self):
        self.change('cookies', ['synthetic sentinel; must never be exported'])
        with self.assertRaisesRegex(ValueError, 'Unexpected evidence field'):
            export.read_results(self.root)

    def test_rejects_mixed_revisions(self):
        self.change('sourceHead', 'c' * 40)
        with self.assertRaisesRegex(ValueError, 'Mixed source'):
            export.read_results(self.root)

    def test_rejects_symlinked_result(self):
        path = self.root / 'ar-mobile/result.json'
        target = self.root / 'ar-desktop/result.json'
        path.unlink()
        path.symlink_to(target)
        with self.assertRaises(ValueError):
            export.read_results(self.root)

    def test_large_records_are_split_below_github_truncation_limit(self):
        output = io.StringIO()
        payload = {'synthetic': 'x' * 12000}
        with contextlib.redirect_stdout(output):
            export.notice('manifest', payload)
        lines = output.getvalue().splitlines()
        self.assertEqual(len(lines), 5)
        messages = [line.split('::', 2)[2] for line in lines]
        self.assertTrue(all(len(message) <= 3000 for message in messages))
        self.assertEqual(json.loads(''.join(messages)), payload)

    def test_notice_is_bounded_and_escaped(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            export.notice('manifest', {'synthetic': '100%\nline'})
        self.assertIn('100%25', output.getvalue())
        self.assertEqual(output.getvalue().count('\n'), 1)
        with self.assertRaises(ValueError):
            export.notice('manifest', {'data': 'x' * 30001})


if __name__ == '__main__':
    unittest.main()
