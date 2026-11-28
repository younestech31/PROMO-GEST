"""Offline embedded-navigation target/UUID guard and canonical label checks."""
import os
from pathlib import Path
import unittest
from unittest.mock import patch

from navigation_embedded import run_navigation_embedded


class EmbeddedNavigationSafetyTests(unittest.TestCase):
    def test_rejects_non_disposable_targets_before_io(self):
        valid = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'p0_ar_desktop'}
        for env, base, fixture in (
            ({}, 'http://127.0.0.1:5173', 'phase0'),
            ({**valid, 'PGDATABASE': 'organization'}, 'http://127.0.0.1:5173', 'phase0'),
            ({**valid, 'PGHOST': 'remote'}, 'http://127.0.0.1:5173', 'phase0'),
            (valid, 'https://external.example.invalid', 'phase0'),
            (valid, 'http://127.0.0.1:5173', 'unknown'),
            (valid, 'https://staging.promogest.test:8443', 'staging'),
        ):
            with self.subTest(env=env, base=base, fixture=fixture), patch.dict(os.environ, env, clear=True):
                with self.assertRaisesRegex(RuntimeError, 'disposable four-profile CI fixture'):
                    run_navigation_embedded(None, base, 'ar', 'desktop', None, None, fixture=fixture)

    def test_rejects_malformed_ids_before_io(self):
        valid = {'GITHUB_ACTIONS': 'true', 'PGHOST': '127.0.0.1', 'PGDATABASE': 'p0_ar_desktop'}
        with patch.dict(os.environ, valid, clear=True), self.assertRaises(ValueError):
            run_navigation_embedded(None, 'http://127.0.0.1:5173', 'ar', 'desktop', None, 'not-a-uuid')

    def test_mobile_drawer_uses_its_backdrop_not_covered_header_toggle(self):
        shell = (Path(__file__).resolve().parents[2] / 'apps/local-web/src/app/ErpShellLayout.tsx').read_text()
        helper = Path(__file__).with_name('navigation_embedded.py').read_text()
        self.assertIn('aria-label="Close navigation menu"', shell)
        self.assertIn("name='Close navigation menu', exact=True).click()", helper)
        self.assertNotIn("name='Close menu', exact=True).click()", helper)
        self.assertNotIn('force=True', helper)

    def test_native_leave_is_preceded_by_observable_app_guard_stay(self):
        import ast
        tree = ast.parse(Path(__file__).with_name('navigation_embedded.py').read_text())
        arm = next(node for node in ast.walk(tree)
                   if isinstance(node, ast.FunctionDef) and node.name == 'arm_native_leave')
        calls = [node.func.id for node in ast.walk(arm)
                 if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)]
        self.assertIn('sidebar', calls)
        self.assertIn('expect_guard', calls)
        # Both native actions must follow the explicit guard handshake, not fill alone.
        tries = [node for node in ast.walk(tree) if isinstance(node, ast.Try)]
        body = next(node.body for node in tries if any(
            isinstance(stmt, ast.Assign) and any(isinstance(target, ast.Name)
                and target.id == 'native_phase' for target in stmt.targets) for stmt in node.body))
        found = 0
        for index, node in enumerate(body):
            if isinstance(node, ast.With) and any(
                isinstance(item.context_expr, ast.Call)
                and isinstance(item.context_expr.func, ast.Attribute)
                and item.context_expr.func.attr == 'expect_event'
                and item.context_expr.args and isinstance(item.context_expr.args[0], ast.Constant)
                and item.context_expr.args[0].value == 'dialog' for item in node.items):
                call = body[index - 2]
                self.assertIsInstance(call, ast.Expr)
                self.assertEqual(call.value.func.id, 'arm_native_leave')
                found += 1
        self.assertEqual(found, 2)

    def test_embedded_project_switch_uses_real_switcher_and_preserves_no_write_boundary(self):
        helper = Path(__file__).with_name('navigation_embedded.py').read_text()
        for contract in (
            "api.get('/api/projects', params={'q': 'QA-NAV-'})",
            "p06_page.locator('header button').filter(has=p06_page.locator('kbd')).click()",
            "switcher.get_by_role('searchbox').fill(code)",
            "switcher.get_by_role('button').filter(has_text=code)",
            "row.first.click()",
            "section + '_embedded_project_switch_stay_preserves_draft'",
            "section + '_embedded_project_switch_discard_navigates_without_write'",
            "assert snapshot() == baseline",
            "assert not writes",
        ):
            self.assertIn(contract, helper)
        self.assertNotIn("force=True", helper)
        self.assertNotIn("page.route(", helper)

    def test_uses_canonical_embedded_route_labels(self):
        registry = (Path(__file__).resolve().parents[2] / 'apps/local-web/src/app/routeRegistry.ts').read_text()
        helper = Path(__file__).with_name('navigation_embedded.py').read_text()
        for label in ('الهيكل العقاري', 'Structure & lots', 'الزبائن والمهتمون', 'Clients & CRM',
                      'الحجوزات الداخلية', 'Réservations', 'الوثائق (K-Min)', 'Documents'):
            self.assertIn(label, registry)
            self.assertIn(label, helper)


if __name__ == '__main__':
    unittest.main()
