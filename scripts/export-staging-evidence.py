#!/usr/bin/env python3
"""Validate sanitized staging results and export four small review images.

Full-resolution PNGs remain in the normal Actions artifact. Compact JPEGs and the
manifest are also carried in check notices so restricted review workspaces can
retrieve evidence through api.github.com without granting CI repository-write access.
Only explicitly named post-login synthetic screenshots are eligible; no state/logs.
"""
import argparse
import base64
import hashlib
import json
import os
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


ORGANIZATION_CHECKS = (
    'non_admin_without_org_manage_readonly_api_403_no_mutation', 'denial_audited',
    'non_admin_with_org_manage_spa_save_reload_persists', 'authorized_update_audited',
    'revocation_enforced_existing_session_api_and_spa',
)


def read_organization_results(root):
    results = {}
    for profile in PROFILES:
        path = root / profile / 'organization-permissions.json'
        if path.is_symlink() or path.resolve().parent.parent != root.resolve():
            raise ValueError('Invalid organization evidence path')
        result = json.loads(path.read_text())
        if (set(result) != {'profile', 'status', 'checks', 'scope'}
                or result['profile'] != profile or result['status'] != 'PASS'
                or set(result['checks']) != set(ORGANIZATION_CHECKS)
                or any(value is not True for value in result['checks'].values())
                or result['scope'] != 'P1-09 disposable Production HTTPS; temporary VIEWER grant revoked'):
            raise ValueError('Incomplete or unexpected organization evidence')
        results[profile] = result['checks']
    return results


SESSION_CHECKS = (
    'pre_restart_sessions_survive_and_inventory_has_no_secrets',
    'csrf_required_for_selective_revocation',
    'current_session_requires_api_confirmation',
    'bilingual_privacy_notice_and_session_inventory',
    'other_session_revoked_replay_denied_current_preserved',
    'cancel_current_revocation_sends_no_request',
    'confirmed_current_revocation_logs_out_replay_denied',
    'both_revocations_audited_primary_session_preserved',
)
SCOPE = 'P1-19 disposable Production HTTPS; pre-restart sessions, selective and current revocation'


def read_session_results(root):
    results = {}
    for profile in PROFILES:
        path = root / profile / 'session-security.json'
        if path.is_symlink() or path.resolve().parent.parent != root.resolve():
            raise ValueError('Invalid session evidence path')
        result = json.loads(path.read_text())
        if (set(result) != {'profile', 'status', 'checks', 'scope'}
                or result['profile'] != profile or result['status'] != 'PASS'
                or set(result['checks']) != set(SESSION_CHECKS)
                or any(value is not True for value in result['checks'].values())
                or result['scope'] != 'P1-19 disposable Production HTTPS; pre-restart sessions, selective and current revocation'):
            raise ValueError('Incomplete or unexpected session evidence')
        results[profile] = result['checks']
    return results


LANGUAGE_CHECKS = (
    'spa_preference_saved_without_organization_default_change',
    'reload_and_fresh_login_apply_saved_preference',
    'csrf_denial_preserves_preference',
    'network_failure_preserves_locale_and_shows_alert',
    'stale_stamp_409_refreshes_authoritative_locale',
    'preference_survives_api_restart',
    'original_locale_restored_organization_default_unchanged',
    'successful_preference_updates_audited',
)
LANGUAGE_SCOPE = 'P1-17 disposable Production HTTPS; own preference persistence and failure recovery'


def read_language_results(root):
    results = {}
    for profile in PROFILES:
        path = root / profile / 'language-preferences.json'
        if path.is_symlink() or path.resolve().parent.parent != root.resolve():
            raise ValueError('Invalid language evidence path')
        result = json.loads(path.read_text())
        if (set(result) != {'profile', 'status', 'checks', 'scope'}
                or result['profile'] != profile or result['status'] != 'PASS'
                or set(result['checks']) != set(LANGUAGE_CHECKS)
                or any(value is not True for value in result['checks'].values())
                or result['scope'] != LANGUAGE_SCOPE):
            raise ValueError('Incomplete or unexpected language evidence')
        results[profile] = result['checks']
    return results


TEAM_CHECKS = (
    'admin_not_implicit_member_initial_manager_spa_assignment',
    'csrf_denial_preserves_membership',
    'sole_manager_removal_409_visible_no_mutation',
    'sole_manager_demotion_409_visible_no_mutation',
    'replacement_manager_spa_assignment_persists',
    'demotion_allowed_with_replacement_manager',
    'former_manager_revocation_and_remaining_manager_protection',
    'exact_success_audits_no_false_success_organization_unchanged',
)
TEAM_SCOPE = 'P1-15 disposable Production HTTPS; sequential team management and last-manager protection'


def read_team_results(root):
    results = {}
    for profile in PROFILES:
        path = root / profile / 'project-team.json'
        if path.is_symlink() or path.resolve().parent.parent != root.resolve():
            raise ValueError('Invalid team evidence path')
        result = json.loads(path.read_text())
        if (set(result) != {'profile', 'status', 'checks', 'scope'}
                or result['profile'] != profile or result['status'] != 'PASS'
                or set(result['checks']) != set(TEAM_CHECKS)
                or any(value is not True for value in result['checks'].values())
                or result['scope'] != TEAM_SCOPE):
            raise ValueError('Incomplete or unexpected team evidence')
        results[profile] = result['checks']
    return results


def notice(name, payload):
    data = json.dumps(payload, separators=(',', ':'))
    if len(data.encode()) > 30000:
        raise ValueError('Compact evidence exceeds check annotation limit')
    # The check-annotations API truncates runner notice messages to 4096 characters.
    # Carry bounded 3000-character pieces, numbered so import fails closed on any loss.
    parts = [data[i:i + 3000] for i in range(0, len(data), 3000)]
    for index, part in enumerate(parts, 1):
        escaped = part.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
        print(f'::notice title=PG-STAGING-{name}:{index}:{len(parts)}::{escaped}', flush=True)


def main(root, record=None, suite='staging'):
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        raise RuntimeError('Evidence export is CI-only')
    if suite not in ('staging', 'organization', 'sessions', 'language', 'team'):
        raise ValueError('Unknown evidence suite')
    from PIL import Image
    results = read_results(root)
    if suite in ('organization', 'sessions', 'language', 'team'):
        organization = read_organization_results(root)
        for result in results:
            result['organizationEvidence'] = organization[result['profile']]
    if suite in ('sessions', 'language', 'team'):
        sessions = read_session_results(root)
        for result in results:
            result['sessionEvidence'] = sessions[result['profile']]
    if suite in ('language', 'team'):
        language = read_language_results(root)
        for result in results:
            result['languageEvidence'] = language[result['profile']]
    if suite == 'team':
        teams = read_team_results(root)
        for result in results:
            result['teamEvidence'] = teams[result['profile']]
    manifest = {'mode': 'disposable Production HTTPS ' + suite, 'profiles': results, 'images': []}
    for profile in PROFILES:
        filename = {'staging': '05-profile-after-restart.png',
                    'organization': 'org-02-authorized-saved.png',
                    'sessions': 'sessions-02-confirmation.png',
                    'language': 'language-04-after-restart.png',
                    'team': 'team-03-replacement-protected.png'}[suite]
        source = root / profile / filename
        if source.is_symlink() or source.resolve().parent.parent != root.resolve():
            raise ValueError('Invalid screenshot path')
        target = root / profile / 'review.jpg'
        with Image.open(source) as image:
            image = image.convert('RGB')
            image.thumbnail((960, 844))
            for quality in (65, 50, 35, 20):
                image.save(target, 'JPEG', quality=quality, optimize=True)
                if target.stat().st_size < 20000:
                    break
        content = target.read_bytes()
        if len(content) >= 20000:
            raise ValueError('Review image too large')
        digest = hashlib.sha256(content).hexdigest()
        manifest['images'].append({'profile': profile, 'file': f'{profile}/review.jpg', 'sha256': digest})
        if record == profile:
            notice(profile, {'profile': profile, 'sha256': digest, 'imageBase64': base64.b64encode(content).decode()})
    (root / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if record == 'manifest':
        notice('manifest', manifest)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('--record', choices=(*PROFILES, 'manifest'))
    parser.add_argument('--suite', choices=('staging', 'organization', 'sessions', 'language', 'team'), default='staging')
    args = parser.parse_args()
    main(args.root, args.record, args.suite)
