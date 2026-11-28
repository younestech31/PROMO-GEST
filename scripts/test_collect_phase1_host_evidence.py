"""Collector privacy/fail-closed behavior with synthetic files and injected HTTP/systemd.

These tests never contact a host, change a service or establish operator acceptance.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('collector', Path(__file__).with_name('collect-phase1-host-evidence.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class CollectorTests(unittest.TestCase):
    def test_rejects_http_credentials_paths_queries_and_invalid_ports(self):
        for value in ('http://server', 'https://user:secret@server', 'https://server/api',
                      'https://server/?token=secret', 'https://server/#secret', 'https://server:wrong'):
            with self.subTest(value=value), self.assertRaises(argparse.ArgumentTypeError):
                collector.origin(value)
        self.assertEqual(collector.origin('https://promogest.lan:8443/'), 'https://promogest.lan:8443')

    def test_http_absent_is_not_run(self):
        with patch.object(collector, 'request') as request:
            self.assertEqual(collector.http_checks(None)[0]['verdict'], 'NOT_RUN')
            request.assert_not_called()

    def test_tls_failure_never_passes(self):
        with patch.object(collector, 'request', return_value=None):
            self.assertEqual(collector.http_checks('https://private.invalid')[0]['verdict'], 'FAIL')

    def test_exact_readiness_and_security_headers(self):
        headers = {'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY',
                   'content-security-policy': "frame-ancestors 'none'", 'referrer-policy': 'no-referrer',
                   'permissions-policy': 'camera=()', 'strict-transport-security': 'max-age=86400'}
        responses = [(200, headers, b''), (200, {}, b'{"status":"Ready"}'), (404, {}, b''), (401, {}, b'')]
        with patch.object(collector, 'request', side_effect=responses):
            checks = collector.http_checks('https://private.invalid')
        self.assertTrue(all(item['verdict'] == 'OBSERVED_PASS' for item in checks))
        self.assertNotIn('private.invalid', json.dumps(checks))

    def test_redirect_login_html_zero_hsts_and_permissive_cors_fail(self):
        responses = [(302, {'strict-transport-security': 'max-age=0', 'set-cookie': 'secret'}, b'private'),
                     (200, {}, b'<html>login</html>'), (302, {}, b''),
                     (401, {'access-control-allow-origin': '*'}, b'')]
        with patch.object(collector, 'request', side_effect=responses):
            checks = collector.http_checks('https://private.invalid')
        self.assertTrue(all(item['verdict'] == 'FAIL' for item in checks))
        self.assertNotIn('secret', json.dumps(checks))
        self.assertNotIn('private', json.dumps(checks))

    def test_modes_symlinks_and_file_contents_not_read(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'env'
            path.write_text('PRIVATE_SENTINEL')
            path.chmod(0o640)
            self.assertTrue(collector.mode_check(path))
            self.assertFalse(collector.mode_check(path, private=True))
            path.chmod(0o600)
            self.assertTrue(collector.mode_check(path, private=True))
            path.chmod(0o644)
            self.assertFalse(collector.mode_check(path))
            link = Path(directory) / 'link'
            link.symlink_to(path)
            self.assertFalse(collector.mode_check(link))
            self.assertFalse(collector.mode_check(Path(directory)))
            self.assertFalse(collector.mode_check(Path(directory) / 'absent'))

    def test_systemctl_only_observes_and_rejects_wrong_state(self):
        with patch.object(collector.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, b'active\n')) as run:
            self.assertEqual(collector.service_check('promogest.service', 'is-active', b'active'), 'OBSERVED_PASS')
            self.assertEqual(run.call_args.args[0], ['systemctl', 'is-active', 'promogest.service'])
            self.assertEqual(collector.service_check('promogest.service', 'is-enabled', b'enabled'), 'FAIL')
        with patch.object(collector.subprocess, 'run', side_effect=FileNotFoundError):
            self.assertEqual(collector.service_check('promogest.service', 'is-active', b'active'), 'NOT_RUN')

    def test_report_never_grants_acceptance_or_runs_backup_without_opt_in(self):
        args = argparse.Namespace(base_url=None, ca_file=None, env_file='/private/env', passfile=None,
                                  offsite_dir='/private/offsite', backup_root='/private/backup', check_backup_freshness=False)
        with patch.object(collector, 'service_check', return_value='NOT_RUN'), patch.object(collector, 'mode_check', return_value=False), patch.object(collector.os.path, 'ismount', return_value=False), patch.object(collector.subprocess, 'run') as run:
            report = collector.collect(args)
        run.assert_not_called()
        self.assertEqual(report['phase1Acceptance'], 'NOT_GRANTED')
        self.assertNotIn('/private/', json.dumps(report))
        self.assertEqual(report['checks'][-1]['verdict'], 'NOT_RUN')
        self.assertGreater(len(report['independentGatesNotAccepted']), 5)

    def test_redirect_handler_refuses_redirects(self):
        self.assertIsNone(collector.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.invalid'))


if __name__ == '__main__':
    unittest.main()
