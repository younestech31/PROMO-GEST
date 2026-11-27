"""P1-19 Production HTTPS session UI acceptance on disposable CI targets only."""
import json
import uuid

from project_budget import mutation, require_budget_fixture
from organization_permissions import sql

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


def prepare_sessions(browser, base, lang, device, viewport, private, username, password):
    require_budget_fixture(base, lang, device, 'staging')
    # Two extra logins before restart; no new logins after restart, no limiter override.
    for role in ('other', 'current'):
        ctx = browser.new_context(base_url=base, viewport=viewport, ignore_https_errors=True,
                                  user_agent=f'PROMOGEST-P1-19-{role}-{lang}-{device}')
        try:
            response = mutation(ctx.request, 'post', '/api/auth/login', {
                'usernameOrEmail': username, 'password': password,
            })
            assert response.status == 200
            path = private / f'sessions-{role}.json'
            ctx.storage_state(path=str(path))
            path.chmod(0o600)
        finally:
            ctx.close()


def validate_inventory(response):
    assert response.status == 200
    rows = response.json()
    allowed = {'id', 'createdAtUtc', 'lastSeenAtUtc', 'expiresAtUtc', 'ipAddress', 'userAgent', 'isCurrentSession'}
    assert rows and all(set(row) == allowed for row in rows)
    assert len([row for row in rows if row['isCurrentSession']]) == 1
    for row in rows:
        uuid.UUID(row['id'])
    return rows


def run_session_security(browser, primary_ctx, base, lang, device, viewport, private, out):
    require_budget_fixture(base, lang, device, 'staging')
    from playwright.sync_api import expect
    contexts = []
    checks = {}
    errors = []
    try:
        for role in ('other', 'current'):
            contexts.append(browser.new_context(
                base_url=base, viewport=viewport, ignore_https_errors=True,
                storage_state=str(private / f'sessions-{role}.json'),
                user_agent=f'PROMOGEST-P1-19-{role}-{lang}-{device}'))
        other, current = contexts
        assert other.request.get('/api/auth/me').status == 200
        assert current.request.get('/api/auth/me').status == 200
        rows = validate_inventory(current.request.get('/api/auth/sessions'))
        # Keep an independent cookie jar: the UI clears its own cookie on current logout,
        # so checking that jar alone would not prove server-side replay rejection.
        replay = browser.new_context(base_url=base, ignore_https_errors=True,
                                     storage_state=current.storage_state())
        contexts.append(replay)
        assert replay.request.get('/api/auth/me').status == 200
        current_id = next(row['id'] for row in rows if row['isCurrentSession'])
        other_id = next(row['id'] for row in rows if row['userAgent'] == f'PROMOGEST-P1-19-other-{lang}-{device}')
        assert current_id != other_id
        checks[SESSION_CHECKS[0]] = True
        other_url = f'/api/auth/sessions/{other_id}/revoke'
        current_url = f'/api/auth/sessions/{current_id}/revoke'
        missing_csrf = current.request.post(other_url, data={'endCurrentSession': False})
        assert missing_csrf.status == 403 and missing_csrf.json()['code'] == 'CSRF_TOKEN_INVALID'
        assert other.request.get('/api/auth/me').status == 200
        checks[SESSION_CHECKS[1]] = True
        unconfirmed = mutation(current.request, 'post', current_url, {'endCurrentSession': False})
        assert unconfirmed.status == 409 and unconfirmed.json()['code'] == 'CURRENT_SESSION_CONFIRMATION_REQUIRED'
        assert current.request.get('/api/auth/me').status == 200
        checks[SESSION_CHECKS[2]] = True
        page = current.new_page()
        page.on('pageerror', lambda _: errors.append(True))
        page.goto(base + '/organization/profile')
        expect(page.locator('html')).to_have_attribute('lang', lang)
        expect(page.locator('html')).to_have_attribute('dir', 'rtl' if lang == 'ar' else 'ltr')
        if device == 'mobile':
            page.get_by_role('button', name='Open menu', exact=True).click()
        page.get_by_role('button', name='الجلسات النشطة' if lang == 'ar' else 'Sessions actives', exact=True).click()
        expect(page.get_by_role('note')).to_contain_text('تنبيه الخصوصية' if lang == 'ar' else 'Confidentialité')
        expect(page.get_by_role('note')).to_contain_text('IP')
        expect(page.get_by_role('note')).to_contain_text('لا تثبت موقعك الفعلي أو هويتك' if lang == 'ar'
                                                       else 'ne prouvent ni votre emplacement physique ni votre identité')
        target = page.locator('li').filter(has_text=f'PROMOGEST-P1-19-other-{lang}-{device}')
        expect(target).to_have_count(1)
        checks[SESSION_CHECKS[3]] = True
        page.screenshot(path=out/'sessions-01-inventory.png')
        with page.expect_response(lambda r: r.request.method == 'POST' and r.url.endswith(other_url)) as revoked:
            target.get_by_role('button', name='إنهاء الجلسة' if lang == 'ar' else 'Révoquer la session', exact=True).click()
        assert revoked.value.status == 204
        expect(target).to_have_count(0)
        assert other.request.get('/api/auth/me').status == 401
        remaining = validate_inventory(current.request.get('/api/auth/sessions'))
        assert all(row['id'] != other_id for row in remaining)
        assert current.request.get('/api/auth/me').status == 200
        checks[SESSION_CHECKS[4]] = True
        label = 'تسجيل الخروج من هذا الجهاز' if lang == 'ar' else 'Déconnecter cet appareil'
        confirmation = ('سيؤدي ذلك إلى تسجيل خروجك من هذا الجهاز. هل تريد المتابعة؟' if lang == 'ar'
                        else 'Cette action vous déconnectera de cet appareil. Voulez-vous continuer ?')
        requests = []
        page.on('request', lambda r: requests.append(True)
                if r.method == 'POST' and r.url.endswith('/revoke') else None)
        page.get_by_role('button', name=label, exact=True).click()
        expect(page.get_by_text(confirmation, exact=True)).to_be_visible()
        assert not requests
        # Mobile modal scrolls internally: CSS visibility alone can leave the prompt
        # below the captured viewport. Capture the actual on-screen confirmation.
        prompt = page.get_by_text(confirmation, exact=True)
        prompt.scroll_into_view_if_needed()
        expect(prompt).to_be_in_viewport()
        page.screenshot(path=out/'sessions-02-confirmation.png')
        page.get_by_role('button', name='إلغاء' if lang == 'ar' else 'Annuler', exact=True).click()
        expect(page.get_by_text(confirmation, exact=True)).to_have_count(0)
        assert not requests and current.request.get('/api/auth/me').status == 200
        checks[SESSION_CHECKS[5]] = True
        with page.expect_response(lambda r: r.request.method == 'POST' and r.url.endswith(current_url)) as own:
            page.get_by_role('button', name=label, exact=True).click()
            page.get_by_role('button', name='تأكيد تسجيل الخروج' if lang == 'ar'
                             else 'Confirmer la déconnexion', exact=True).click()
        assert own.value.status == 204
        expect(page.locator('#login-username')).to_be_visible()
        assert current.request.get('/api/auth/me').status == 401
        assert replay.request.get('/api/auth/me').status == 401
        assert other.request.get('/api/auth/me').status == 401
        checks[SESSION_CHECKS[6]] = True
        # IDs were validated as UUIDs before interpolation; read-only fixture audit inspection.
        for session_id in (current_id, other_id):
            assert sql("SELECT count(*) FROM audit_logs WHERE event_type='AUTH_SESSION_REVOKED_BY_USER' "
                       "AND target_entity_type='UserSession' AND target_entity_id='" + session_id + "'") == '1'
        assert primary_ctx.request.get('/api/auth/me').status == 200
        checks[SESSION_CHECKS[7]] = True
        assert not errors
        (out/'session-security.json').write_text(json.dumps({
            'profile': f'{lang}-{device}', 'status': 'PASS', 'checks': checks, 'scope': SCOPE,
        }, indent=2) + '\n')
    finally:
        for ctx in contexts:
            ctx.close()
