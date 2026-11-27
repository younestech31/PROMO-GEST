"""P1-17 isolated Production HTTPS preference persistence and failure recovery.

The network failure case deliberately aborts one browser request; every other flow
uses the real SPA/API/PostgreSQL. No mocked success, login-limit override or seed change.
"""
import json
import uuid

from organization_permissions import sql
from project_budget import mutation, require_budget_fixture

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
SCOPE = 'P1-17 disposable Production HTTPS; own preference persistence and failure recovery'
URL = '/api/auth/preferred-language'


def preference_payload(session, language):
    return {'preferredLanguage': language, 'expectedConcurrencyStamp': session['user']['concurrencyStamp']}


def assert_locale(page, language):
    from playwright.sync_api import expect
    expect(page.locator('html')).to_have_attribute('lang', language)
    expect(page.locator('html')).to_have_attribute('dir', 'rtl' if language == 'ar' else 'ltr')


def failure_text(language):
    return ('تعذر حفظ تفضيل اللغة. لم يتغير اختيارك المحفوظ؛ حاول مجدداً.' if language == 'ar'
            else 'Impossible d’enregistrer la préférence linguistique. Le choix enregistré reste inchangé ; réessayez.')


def prepare_language(browser, admin_ctx, base, lang, device, viewport, private, out, username, password):
    require_budget_fixture(base, lang, device, 'staging')
    from playwright.sync_api import expect
    other = 'fr' if lang == 'ar' else 'ar'
    checks = {}
    errors = []
    contexts = []
    # Use the existing actor: preserve the baseline singleton-user check. The new
    # fresh login occurs before restart, not in the verify phase's bounded login budget.
    page = admin_ctx.new_page()
    page.on('pageerror', lambda _: errors.append(True))
    try:
        page.goto(base + '/organization/profile')
        initial = admin_ctx.request.get('/api/auth/me').json()
        assert initial['user']['preferredLanguage'] == lang
        organization = initial['organization']

        def switch(actor_page, language):
            with actor_page.expect_response(lambda r: r.request.method == 'PUT' and r.url.endswith(URL)) as saved:
                actor_page.get_by_role('group', name='Language switcher').get_by_role(
                    'button', name='العربية' if language == 'ar' else 'Français', exact=True).click()
            return saved.value

        saved = switch(page, other)
        assert saved.status == 200
        assert saved.json()['user']['preferredLanguage'] == other
        assert saved.json()['organization'] == organization
        assert_locale(page, other)
        assert admin_ctx.request.get('/api/auth/me').json()['user']['preferredLanguage'] == other
        checks[LANGUAGE_CHECKS[0]] = True
        page.reload()
        assert_locale(page, other)
        fresh = browser.new_context(base_url=base, viewport=viewport, ignore_https_errors=True)
        contexts.append(fresh)
        fresh_page = fresh.new_page()
        fresh_page.on('pageerror', lambda _: errors.append(True))
        fresh_page.goto(base)
        fresh_page.locator('#login-username').fill(username)
        fresh_page.locator('#login-password').fill(password)
        with fresh_page.expect_response('**/api/auth/login') as logged:
            fresh_page.locator('button[type=submit]').click()
        assert logged.value.status == 200
        assert logged.value.json()['user']['preferredLanguage'] == other
        assert logged.value.json()['organization'] == organization
        expect(fresh_page.locator('#login-username')).to_have_count(0)
        fresh_page.goto(base + '/organization/profile')
        assert_locale(fresh_page, other)
        fresh_page.screenshot(path=out/'language-01-fresh-login.png')
        checks[LANGUAGE_CHECKS[1]] = True
        assert switch(fresh_page, lang).status == 200
        assert_locale(fresh_page, lang)
        current = fresh.request.get('/api/auth/me').json()
        denied = fresh.request.put(URL, data=preference_payload(current, other))
        assert denied.status == 403 and denied.json()['code'] == 'CSRF_TOKEN_INVALID'
        assert fresh.request.get('/api/auth/me').json()['user']['preferredLanguage'] == lang
        checks[LANGUAGE_CHECKS[2]] = True
        fresh_page.route('**' + URL, lambda route: route.abort('internetdisconnected'))
        try:
            fresh_page.get_by_role('group', name='Language switcher').get_by_role(
                'button', name='العربية' if other == 'ar' else 'Français', exact=True).click()
            expect(fresh_page.get_by_role('alert')).to_contain_text(failure_text(lang))
            assert_locale(fresh_page, lang)
            assert fresh.request.get('/api/auth/me').json()['user']['preferredLanguage'] == lang
            fresh_page.screenshot(path=out/'language-02-network-failure.png')
        finally:
            fresh_page.unroute('**' + URL)
        checks[LANGUAGE_CHECKS[3]] = True
        # Keep this tab's old stamp; change the server state through the real API.
        authoritative = fresh.request.get('/api/auth/me').json()
        changed = mutation(fresh.request, 'put', URL, preference_payload(authoritative, other))
        assert changed.status == 200
        conflict = switch(fresh_page, other)
        assert conflict.status == 409 and conflict.json()['code'] == 'USER_CONCURRENCY_CONFLICT'
        assert_locale(fresh_page, other)
        expect(fresh_page.get_by_role('alert')).to_contain_text(failure_text(other))
        assert fresh.request.get('/api/auth/me').json()['organization'] == organization
        fresh_page.screenshot(path=out/'language-03-conflict-refresh.png')
        checks[LANGUAGE_CHECKS[4]] = True
        state = private / 'language-state.json'
        fresh.storage_state(path=str(state))
        state.chmod(0o600)
        fixture = private / 'language-fixture.json'
        fixture.write_text(json.dumps({'checks': checks, 'organization': organization}))
        fixture.chmod(0o600)
        assert not errors
    finally:
        page.close()
        for context in contexts:
            context.close()


def verify_language(browser, admin_ctx, base, lang, device, viewport, private, out):
    require_budget_fixture(base, lang, device, 'staging')
    from playwright.sync_api import expect
    other = 'fr' if lang == 'ar' else 'ar'
    fixture = json.loads((private/'language-fixture.json').read_text())
    checks = fixture['checks']
    ctx = browser.new_context(base_url=base, viewport=viewport, ignore_https_errors=True,
                              storage_state=str(private/'language-state.json'))
    errors = []
    try:
        page = ctx.new_page()
        page.on('pageerror', lambda _: errors.append(True))
        page.goto(base + '/organization/profile')
        assert_locale(page, other)
        me = ctx.request.get('/api/auth/me')
        assert me.status == 200
        session = me.json()
        assert session['user']['preferredLanguage'] == other
        assert session['organization'] == fixture['organization']
        expect(page.get_by_role('heading', name='ملف المؤسسة المحلي' if other == 'ar'
                                else "Identité de l'organisation", exact=True)).to_be_visible()
        expect(page.get_by_role('main').get_by_text(fixture['organization']['legalName'], exact=True)).to_be_visible()
        page.screenshot(path=out/'language-04-after-restart.png')
        checks[LANGUAGE_CHECKS[5]] = True
        with page.expect_response(lambda r: r.request.method == 'PUT' and r.url.endswith(URL)) as restored:
            page.get_by_role('group', name='Language switcher').get_by_role(
                'button', name='العربية' if lang == 'ar' else 'Français', exact=True).click()
        assert restored.value.status == 200
        assert_locale(page, lang)
        page.reload()
        assert_locale(page, lang)
        primary = admin_ctx.request.get('/api/auth/me').json()
        assert primary['user']['preferredLanguage'] == lang
        assert primary['organization'] == fixture['organization']
        checks[LANGUAGE_CHECKS[6]] = True
        user_id = str(uuid.UUID(session['user']['id']))
        assert sql("SELECT count(*) FROM audit_logs WHERE event_type='USER_PREFERRED_LANGUAGE_UPDATED' "
                   "AND actor_user_id='" + user_id + "' AND target_entity_id='" + user_id + "'") == '4'
        checks[LANGUAGE_CHECKS[7]] = True
        assert not errors
        (out/'language-preferences.json').write_text(json.dumps({
            'profile': f'{lang}-{device}', 'status': 'PASS', 'checks': checks, 'scope': SCOPE,
        }, indent=2) + '\n')
    finally:
        ctx.close()
