"""Fast Python API-contract checks; no Chromium, network, API or database execution.

Run with CI's pinned Playwright environment before the four-profile browser flow.
Checking the actual Page class catches misspelled convenience methods that Python
syntax compilation and unrestricted mocks cannot catch.
"""
import ast
import inspect
import unittest
from pathlib import Path

from playwright.sync_api import Page


def check_page_calls(source):
    calls = []
    for node in ast.walk(ast.parse(source)):
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and isinstance(node.func.value, ast.Name) and node.func.value.id == 'p06_page'):
            continue
        name = node.func.attr
        method = getattr(Page, name, None)
        if not callable(method):
            raise ValueError(f'Unsupported Page method: {name}')
        # The bounded slice contains no starred calls; fail rather than silently skip them.
        if any(isinstance(arg, ast.Starred) for arg in node.args) or any(
                keyword.arg is None for keyword in node.keywords):
            raise ValueError('Starred Page calls require explicit contract review')
        inspect.signature(method).bind(
            None, *[object() for _ in node.args],
            **{keyword.arg: object() for keyword in node.keywords},
        )
        calls.append(name)
    return calls


class NavigationPlaywrightContractTests(unittest.TestCase):
    def test_actual_navigation_slice_uses_supported_page_methods_and_signatures(self):
        source = Path(__file__).with_name('phase0.py').read_text()
        calls = check_page_calls(source)
        self.assertIn('expect_event', calls)
        self.assertIn('expect_response', calls)
        self.assertIn('route', calls)
        self.assertIn('unroute', calls)
        self.assertIn('go_back', calls)
        self.assertIn('go_forward', calls)

    def test_revocation_slice_uses_supported_page_methods_and_signatures(self):
        source = Path(__file__).with_name('navigation_revocation.py').read_text()
        calls = check_page_calls(source)
        for name in ('goto', 'get_by_role', 'evaluate', 'wait_for_function',
                     'expect_response', 'screenshot', 'remove_listener'):
            self.assertIn(name, calls)

    def test_dirty_settings_slice_uses_supported_page_methods_and_signatures(self):
        source = Path(__file__).with_name('navigation_dirty_settings.py').read_text()
        calls = check_page_calls(source)
        for name in ('goto', 'get_by_role', 'evaluate', 'close', 'is_closed',
                     'expect_event', 'expect_response', 'screenshot', 'remove_listener'):
            self.assertIn(name, calls)

    def test_embedded_slice_uses_supported_page_methods_and_signatures(self):
        source = Path(__file__).with_name('navigation_embedded.py').read_text()
        calls = check_page_calls(source)
        for name in ('goto', 'get_by_role', 'evaluate', 'close', 'is_closed',
                     'expect_event', 'go_back', 'go_forward', 'wait_for_function',
                     'wait_for_load_state', 'screenshot', 'remove_listener'):
            self.assertIn(name, calls)

    def test_nonexistent_failed_request_convenience_method_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Unsupported Page method'):
            check_page_calls('p06_page.expect_request_failed(lambda request: True)')

    def test_invalid_keyword_is_rejected(self):
        with self.assertRaises(TypeError):
            check_page_calls("p06_page.expect_event('requestfailed', invalid_keyword=True)")

    def test_other_objects_are_not_incorrectly_treated_as_pages(self):
        self.assertEqual(check_page_calls('unrelated.custom_method()'), [])


if __name__ == '__main__':
    unittest.main()
