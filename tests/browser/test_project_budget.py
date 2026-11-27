"""Offline tests for the CI-only budget fixture; no browser/database dependency."""
import os
import unittest
from unittest.mock import Mock, patch

from project_budget import mutation, require_budget_fixture, run_project_budget, update_payload


class BudgetFixtureTests(unittest.TestCase):
    def test_null_is_preserved_in_update_payload(self):
        project = {
            'concurrencyStamp': 'version-1', 'nameAr': 'اسم', 'nameFr': 'Nom',
            'wilayaCode': '16', 'wilayaName': 'Alger', 'municipality': 'Commune',
            'status': 'Planning', 'plannedBlocksCount': 1, 'plannedUnitsCount': 2,
            'estimatedBudgetDzd': 500, 'members': [{'userId': 'not-part-of-update'}],
        }
        payload = update_payload(project, None)
        self.assertIsNone(payload['estimatedBudgetDzd'])
        self.assertEqual(payload['expectedConcurrencyStamp'], 'version-1')
        self.assertEqual(payload['nameAr'], 'اسم')
        self.assertEqual(payload['plannedUnitsCount'], 2)
        self.assertNotIn('members', payload)
        self.assertNotIn('concurrencyStamp', payload)
        self.assertEqual(project['estimatedBudgetDzd'], 500)

    def test_zero_and_decimal_are_not_coerced_to_null(self):
        project = {'concurrencyStamp': 'version-2'}
        for amount in (0, 23456789.75):
            with self.subTest(amount=amount):
                self.assertEqual(update_payload(project, amount)['estimatedBudgetDzd'], amount)

    def test_mutation_uses_fresh_csrf_token(self):
        request = Mock()
        request.get.return_value.status = 200
        request.get.return_value.headers = {'x-csrf-token': 'test-only-token'}
        mutation(request, 'put', '/api/projects/test-id', {'estimatedBudgetDzd': None})
        request.get.assert_called_once_with('/api/auth/csrf')
        request.put.assert_called_once_with('/api/projects/test-id',
                                           data={'estimatedBudgetDzd': None},
                                           headers={'X-CSRF-TOKEN': 'test-only-token'})

    def test_mutation_stops_without_csrf(self):
        request = Mock()
        request.get.return_value.status = 200
        request.get.return_value.headers = {}
        with self.assertRaises(AssertionError):
            mutation(request, 'put', '/api/projects/test-id', {})
        request.put.assert_not_called()

    def test_accepts_only_explicit_encrypted_staging_fixture(self):
        env = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'stg_fr_mobile',
               'STAGING_BASE_URL': 'https://staging.promogest.test:8443', 'STAGING_DP_ENCRYPTED': 'true'}
        with patch.dict(os.environ, env, clear=True):
            require_budget_fixture(env['STAGING_BASE_URL'], 'fr', 'mobile', 'staging')
            for key, value in (('STAGING_DP_ENCRYPTED', 'false'), ('PGDATABASE', 'organization'),
                               ('STAGING_BASE_URL', 'https://external.example.invalid')):
                with self.subTest(key=key), patch.dict(os.environ, {key: value}):
                    with self.assertRaises(RuntimeError):
                        require_budget_fixture('https://staging.promogest.test:8443', 'fr', 'mobile', 'staging')

    def test_unknown_fixture_does_not_broaden_targets(self):
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1',
                                    'PGDATABASE': 'p0_ar_desktop'}, clear=True):
            with self.assertRaises(RuntimeError):
                require_budget_fixture('http://127.0.0.1:5173', 'ar', 'desktop', 'custom')

    def test_refuses_non_ci_or_non_disposable_targets_before_any_io(self):
        valid = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'p0_ar_desktop'}
        for env, base, lang, device in (
            ({}, 'http://127.0.0.1:5173', 'ar', 'desktop'),
            ({**valid, 'PGDATABASE': 'organization'}, 'http://127.0.0.1:5173', 'ar', 'desktop'),
            ({**valid, 'PGHOST': 'remote'}, 'http://127.0.0.1:5173', 'ar', 'desktop'),
            (valid, 'https://preview.example.invalid', 'ar', 'desktop'),
            (valid, 'http://127.0.0.1:5173', 'fr', 'mobile'),
            ({**valid, 'PGDATABASE': 'p0_en_desktop'}, 'http://127.0.0.1:5173', 'en', 'desktop'),
        ):
            with self.subTest(env=env, base=base, lang=lang, device=device):
                with patch.dict(os.environ, env, clear=True):
                    with self.assertRaisesRegex(RuntimeError, 'disposable four-profile CI fixture'):
                        # None deliberately fails immediately if the guard ever permits browser/API I/O.
                        run_project_budget(None, None, base, lang, device, None, None)


if __name__ == '__main__':
    unittest.main()
