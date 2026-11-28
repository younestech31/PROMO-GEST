#!/usr/bin/env python3
"""Read-only Linux host observations, NOT a Phase 1 acceptance or migration tool.

Does not source environment files, authenticate, change services, run SQL, restore
backups, follow HTTP redirects or disable TLS verification. Output contains only
static check IDs/verdicts, no hostnames, file contents, paths, cookies or logs.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import ssl
import stat
import subprocess
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPSHandler, HTTPRedirectHandler, ProxyHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def origin(value):
    parsed = urlsplit(value)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or parsed.path not in ('', '/') or parsed.query or parsed.fragment):
        raise argparse.ArgumentTypeError('Supply an HTTPS origin only, without credentials, path, query or fragment')
    try:
        parsed.port
    except ValueError:
        raise argparse.ArgumentTypeError('Invalid HTTPS port') from None
    return value.rstrip('/')


def request(base, path, ca_file=None, foreign_origin=False):
    # Bypass environment proxy configuration; operator explicitly selects the LAN
    # origin. No user cookies/auth and no forwarded-proto/Host spoofing.
    context = ssl.create_default_context(cafile=ca_file)
    opener = build_opener(ProxyHandler({}), HTTPSHandler(context=context), NoRedirect())
    headers = {'Origin': 'https://promogest-untrusted.invalid'} if foreign_origin else {}
    try:
        with opener.open(Request(base + path, headers=headers), timeout=10) as response:
            return response.status, {k.lower(): v for k, v in response.headers.items()}, response.read(65537)
    except HTTPError as error:
        return error.code, {k.lower(): v for k, v in error.headers.items()}, b''
    except (URLError, OSError, ValueError):
        return None


def result(task, check, verdict):
    return {'task': task, 'check': check, 'verdict': verdict}


def http_checks(base, ca_file=None):
    if not base:
        return [result('P1-14/36/38', 'trusted_https_origin', 'NOT_RUN')]
    checks = []
    root = request(base, '/', ca_file)
    if root is None:
        return [result('P1-14/36/38', 'trusted_https_origin', 'FAIL')]
    status, headers, _ = root
    def record(name, condition):
        checks.append(result('P1-14/36/38', name, 'OBSERVED_PASS' if condition else 'FAIL'))
    record('https_root_200_no_redirect', status == 200)
    record('nosniff', headers.get('x-content-type-options', '').lower() == 'nosniff')
    record('frame_denied', headers.get('x-frame-options', '').upper() == 'DENY')
    record('csp_frame_ancestors_none', "frame-ancestors 'none'" in headers.get('content-security-policy', ''))
    record('referrer_policy', headers.get('referrer-policy', '').lower() == 'no-referrer')
    record('permissions_policy_present', bool(headers.get('permissions-policy')))
    import re
    hsts = re.search(r'(?:^|;)\s*max-age=(\d+)\s*(?:;|$)', headers.get('strict-transport-security', ''), re.I)
    record('hsts_positive_max_age', hsts is not None and int(hsts.group(1)) > 0)
    ready = request(base, '/health/ready', ca_file)
    healthy = False
    if ready is not None and ready[0] == 200 and len(ready[2]) <= 65536:
        try:
            healthy = json.loads(ready[2]).get('status') == 'Ready'
        except (ValueError, AttributeError):
            pass
    record('readiness_reports_ready', healthy)
    preview = request(base, '/api/auth/preview-session', ca_file)
    record('preview_session_get_404', preview is not None and preview[0] == 404)
    cors = request(base, '/api/auth/me', ca_file, foreign_origin=True)
    record('foreign_origin_unauthenticated_read_no_allow_origin',
           cors is not None and cors[0] in (401, 403) and 'access-control-allow-origin' not in cors[1])
    # Do not log in merely to collect a cookie. Existing authenticated operator
    # workflow must separately establish cookie flags, CSRF and upload limits.
    return checks


def mode_check(path, *, owner_root=False, private=False):
    try:
        info = Path(path).lstat()
        return (stat.S_ISREG(info.st_mode) and not stat.S_ISLNK(info.st_mode)
                and (not owner_root or info.st_uid == 0)
                and info.st_mode & (0o177 if private else 0o137) == 0)
    except OSError:
        return False


def service_check(unit, action, expected):
    try:
        response = subprocess.run(['systemctl', action, unit], capture_output=True, timeout=10, check=False)
        return 'OBSERVED_PASS' if response.returncode == 0 and response.stdout.strip() == expected else 'FAIL'
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        return 'NOT_RUN'


def collect(args):
    checks = http_checks(args.base_url, args.ca_file)
    for unit in ('promogest.service', 'caddy.service', 'promogest-backup.timer', 'promogest-backup-verify.timer'):
        for action, expected in (('is-active', b'active'), ('is-enabled', b'enabled')):
            checks.append(result('P1-16/25', unit + '_' + action, service_check(unit, action, expected)))
    checks.append(result('P1-16', 'env_file_regular_root_owned_mode_0640_or_stricter',
                         'OBSERVED_PASS' if mode_check(args.env_file, owner_root=True) else 'FAIL'))
    checks.append(result('P1-16', 'passfile_regular_mode_0600_or_stricter',
                         ('OBSERVED_PASS' if mode_check(args.passfile, private=True) else 'FAIL')
                         if args.passfile else 'NOT_RUN'))
    independent = False
    try:
        independent = (Path(args.offsite_dir).resolve() != Path(args.backup_root).resolve()
                       and os.path.ismount(args.offsite_dir)
                       and os.stat(args.offsite_dir).st_dev != os.stat(args.backup_root).st_dev)
    except OSError:
        pass
    checks.append(result('P1-25', 'offsite_distinct_mounted_filesystem', 'OBSERVED_PASS' if independent else 'FAIL'))
    # Execute only the existing checksum/freshness reader; never backup/restore or
    # source the secret env file. Explicit arguments override inherited bypasses.
    if args.check_backup_freshness:
        env = {**os.environ, 'PROMOGEST_BACKUP_ROOT': args.backup_root,
               'PROMOGEST_BACKUP_OFFSITE_DIR': args.offsite_dir,
               'PROMOGEST_BACKUP_MIN_OFFSITE_COPIES': '1', 'PROMOGEST_BACKUP_MAX_AGE_HOURS': '26'}
        try:
            command = ['bash', str(Path(__file__).with_name('check-backup-freshness.sh'))]
            completed = subprocess.run(command, env=env, stdout=subprocess.DEVNULL,
                                       stderr=subprocess.DEVNULL, timeout=300, check=False)
            verdict = 'OBSERVED_PASS' if completed.returncode == 0 else 'FAIL'
        except (OSError, subprocess.TimeoutExpired):
            verdict = 'NOT_RUN'
    else:
        verdict = 'NOT_RUN'
    checks.append(result('P1-25', 'existing_backup_checksum_and_freshness', verdict))
    return {
        'schemaVersion': 1, 'collectedAtUtc': datetime.now(timezone.utc).isoformat(),
        'scope': 'Read-only Linux host observations; no authenticated or destructive probes',
        'phase1Acceptance': 'NOT_GRANTED', 'checks': checks,
        'independentGatesNotAccepted': [
            'P1-08 explicit document category owner policy',
            'P1-11 actual read-only preflight, drift/collision resolution, restore rehearsal and authorized migration',
            'P1-14 actual AI Studio sharing/Origin/ingress (LAN origin is not a substitute)',
            'P1-36/38 authenticated secure cookie, CSRF, upload boundaries and restart acceptance',
            'P1-25 actual offsite restore drill and alert/operator response',
            'Windows host acceptance (this collector observes Linux only)',
            'P1-05 institution/legal/release-scope decision',
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', type=origin, help='Explicit authorized LAN HTTPS origin; no redirects or insecure TLS')
    parser.add_argument('--ca-file', help='Trusted LAN CA PEM; TLS verification is never disabled')
    parser.add_argument('--env-file', default='/etc/promogest/promogest.env', help='Stat only; never read/sourced')
    parser.add_argument('--passfile', help='Stat only; never read')
    parser.add_argument('--backup-root', default='/var/backups/promogest')
    parser.add_argument('--offsite-dir', default='/mnt/promogest-offsite')
    parser.add_argument('--check-backup-freshness', action='store_true', help='Run existing read-only checksum/freshness checker')
    args = parser.parse_args()
    try:
        report = collect(args)
    except (OSError, ValueError, ssl.SSLError):
        # Do not emit exception messages containing hostnames or local paths.
        parser.exit(2, 'Unable to collect observations; check local prerequisites privately.\n')
    print(json.dumps(report, indent=2))
    return 0 if all(item['verdict'] == 'OBSERVED_PASS' for item in report['checks']) else 1


if __name__ == '__main__':
    raise SystemExit(main())
