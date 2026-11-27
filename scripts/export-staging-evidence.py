#!/usr/bin/env python3
"""Validate sanitized staging results and export four small review images.

Full-resolution PNGs remain in the normal Actions artifact. Compact JPEGs and the
manifest are also carried in check notices so restricted review workspaces can
retrieve evidence through api.github.com without granting CI repository-write access.
Only explicitly named post-login synthetic screenshots are eligible; no state/logs.
"""
import base64
import hashlib
import json
import os
import sys
from pathlib import Path

PROFILES = ('ar-desktop', 'ar-mobile', 'fr-desktop', 'fr-mobile')
CHECKS = (
    'https_proxy_hsts_csp_nosniff_no_store', 'development_preview_endpoint_absent',
    'bootstrap_required_without_token_403', 'wizard_201_anonymous_handoff_duplicate_409',
    'production_host_cookie_secure_httponly_strict', 'organization_edit_saved_through_https_spa',
    'authenticated_write_without_csrf_403', 'document_uploaded_through_https_spa',
    'session_and_organization_survive_api_restart', 'stored_document_bytes_survive_restart_sha256',
    'anonymous_document_access_401', 'one_organization_user_administrator_after_restart',
    'persisted_data_protection_keys_encrypted', 'logout_revokes_current_and_pre_restart_session',
    'production_budget_authorization_matrix',
)


def read_results(root):
    results = []
    for profile in PROFILES:
        path = root / profile / 'result.json'
        if path.is_symlink() or path.resolve().parent.parent != root.resolve():
            raise ValueError('Evidence must stay inside its profile directory')
        result = json.loads(path.read_text())
        if result.get('profile') != profile or result.get('status') != 'PASS':
            raise ValueError('Every staging profile must have passed')
        if result.get('environment') != 'Production':
            raise ValueError('Production mode is required')
        if any(result.get('checks', {}).get(check) is not True for check in CHECKS):
            raise ValueError('Missing or failed staging check')
        # Explicit allowlist: never export unexpected cookie/password/log fields.
        allowed = ('profile', 'sourceHead', 'testedCheckout', 'run', 'environment', 'database',
                   'proxy', 'viewport', 'checks', 'tlsBoundary', 'scope', 'syntheticDocumentSha256',
                   'status', 'browser', 'budgetEvidence')
        if set(result) - set(allowed):
            raise ValueError('Unexpected evidence field')
        if set(result['checks']) != set(CHECKS):
            raise ValueError('Unexpected check field')
        results.append(result)
    if len({r['sourceHead'] for r in results}) != 1 or len({r['testedCheckout'] for r in results}) != 1:
        raise ValueError('Mixed source revisions are not evidence for a single build')
    return results


def notice(name, payload):
    data = json.dumps(payload, separators=(',', ':'))
    if len(data.encode()) > 60000:
        raise ValueError('Compact evidence exceeds check annotation limit')
    # Workflow command escaping; never interpolate arbitrary titles.
    data = data.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    print(f'::notice title=PG-STAGING-{name}::{data}', flush=True)


def main(root):
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        raise RuntimeError('Evidence export is CI-only')
    from PIL import Image
    results = read_results(root)
    manifest = {'mode': 'disposable Production HTTPS staging', 'profiles': results, 'images': []}
    for profile in PROFILES:
        source = root / profile / '05-profile-after-restart.png'
        if source.is_symlink() or source.resolve().parent.parent != root.resolve():
            raise ValueError('Invalid screenshot path')
        target = root / profile / 'review.jpg'
        with Image.open(source) as image:
            image = image.convert('RGB')
            image.thumbnail((960, 844))
            for quality in (65, 50, 35, 20):
                image.save(target, 'JPEG', quality=quality, optimize=True)
                if target.stat().st_size < 40000:
                    break
        content = target.read_bytes()
        if len(content) >= 40000:
            raise ValueError('Review image too large')
        digest = hashlib.sha256(content).hexdigest()
        manifest['images'].append({'profile': profile, 'file': f'{profile}/review.jpg', 'sha256': digest})
        notice(profile, {'profile': profile, 'sha256': digest, 'imageBase64': base64.b64encode(content).decode()})
    (root / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    notice('manifest', manifest)


if __name__ == '__main__':
    main(Path(sys.argv[1]))
