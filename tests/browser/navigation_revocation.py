"""P1-06: real membership revocation and SPA cache/preference cleanup.

Reuses budget actors on its two explicit disposable CI fixtures; no extra login,
mocked API, SQL mutation or runtime-policy change. No IDs or secrets in JSON.
"""
import json
import traceback
import uuid


def run_navigation_revocation(admin_ctx, actor_ctx, p06_page, base, lang, device,
                              out, project_id, replacement_id, *, fixture='phase0'):
    # Lazy import avoids a module cycle with the budget fixture caller.
    from project_budget import mutation, require_budget_fixture
    require_budget_fixture(base, lang, device, fixture)
    project_id = str(uuid.UUID(project_id))
    replacement_id = str(uuid.UUID(replacement_id))
    from playwright.sync_api import expect

    api = admin_ctx.request
    actor = actor_ctx.request.get('/api/auth/me')
    assert actor.status == 200
    actor_id = str(uuid.UUID(actor.json()['user']['id']))
    assert actor_id != replacement_id
    project_url = f'/api/projects/{project_id}'
    overview_url = base + f'/projects/{project_id}/overview'
    original = actor_ctx.request.get(project_url)
    assert original.status == 200
    code = original.json()['code']
    before_org = api.get('/api/auth/me').json()['organization']
    preference_key = 'promogest.navPrefs.v1.' + actor_id
    checks = {}
    errors = []

    def on_error(_):
        errors.append(True)

    p06_page.on('pageerror', on_error)

    def assign(user_id, role, financial):
        response = mutation(api, 'put', project_url + '/members', {
            'userId': user_id, 'roleInProject': role, 'canViewFinancials': financial,
            'canManageSales': False, 'canManageConstruction': False,
            'canManageDocuments': False,
        })
        assert response.status == 200

    def preferences():
        return p06_page.evaluate(
            "key => JSON.parse(localStorage.getItem(key) || '{}')", preference_key)

    identity = p06_page.get_by_role('region', name=(
        'شريط هوية المشروع النشط' if lang == 'ar' else 'Bandeau d’identité du projet actif'), exact=True)
    replacement_changed = False
    try:
        p06_page.goto(overview_url)
        expect(identity).to_be_visible()
        identity.get_by_role('button', name='تثبيت' if lang == 'ar' else 'Épingler', exact=True).click()
        expect(identity.get_by_role('button', name=(
            'إلغاء التثبيت' if lang == 'ar' else 'Désépingler'), exact=True)).to_be_visible()
        p06_page.wait_for_function(
            "({key, id}) => JSON.parse(localStorage.getItem(key) || '{}').recentProjectIds?.includes(id)",
            arg={'key': preference_key, 'id': project_id},
        )
        before_preferences = preferences()
        assert project_id in before_preferences['pinnedProjectIds']
        assert project_id in before_preferences['recentProjectIds']
        # The entire cleanup sequence below must use the SAME mounted App/document.
        p06_page.evaluate('window.__p106SameDocument = true')
        if device == 'mobile':
            p06_page.get_by_role('button', name='Open menu', exact=True).click()
        p06_page.get_by_role('navigation', name='Main navigation', exact=True).get_by_role(
            'button', name='مساحة المؤسسة' if lang == 'ar' else 'Espace Organisation', exact=True).click()
        expect(p06_page).to_have_url(base + '/')
        cached_project = p06_page.locator('main').get_by_role('button').filter(has_text=code)
        expect(cached_project).to_have_count(1)
        checks['real_pin_recent_and_cached_card_before_revocation'] = True

        # Keep last-manager protection intact, then revoke through the real admin API.
        assign(replacement_id, 'ProjectManager', True)
        replacement_changed = True
        revoked = mutation(api, 'delete', project_url + '/members/' + actor_id, None)
        assert revoked.status == 200
        denied = actor_ctx.request.get(project_url)
        assert denied.status == 403 and denied.json()['code'] == 'PROJECT_ACCESS_DENIED'
        checks['real_membership_revoked_with_replacement_manager'] = True

        # Cached navigation is deliberately still present until the server revalidates it.
        with p06_page.expect_response(lambda response: response.request.method == 'GET'
                                      and response.url == base + project_url) as verification:
            cached_project.click()
        assert verification.value.status == 403
        expect(p06_page).to_have_url(base + '/')
        expect(identity).to_have_count(0)
        expect(cached_project).to_have_count(0)
        assert p06_page.evaluate('window.__p106SameDocument === true')
        checks['server_denial_forces_home_and_removes_same_app_cached_card'] = True

        after_preferences = preferences()
        for field in ('pinnedProjectIds', 'recentProjectIds'):
            assert after_preferences[field] == [
                value for value in before_preferences[field] if value != project_id]
        checks['pin_recent_removed_without_deleting_other_preferences'] = True
        listing = actor_ctx.request.get('/api/projects', params={'q': code})
        assert listing.status == 200 and listing.json() == []
        directory = actor_ctx.request.get('/api/projects/directory', params={'q': code})
        assert directory.status == 200 and directory.json()['totalCount'] == 0
        assert directory.json()['items'] == []
        assert actor_ctx.request.get('/api/auth/me').status == 200
        checks['revoked_actor_stays_authenticated_but_cannot_discover_project'] = True
        assert api.get('/api/auth/me').json()['organization'] == before_org
        checks['organization_unchanged'] = True
        assert not errors
        checks['no_uncaught_page_errors'] = True
        p06_page.screenshot(path=out / 'p1-06-revoked-project-cleanup.png')
    except Exception as error:
        for frame in traceback.extract_tb(error.__traceback__):
            if frame.filename.endswith('/navigation_revocation.py'):
                print(f'::error file=tests/browser/navigation_revocation.py,line={frame.lineno}::'
                      f'P1-06 {lang}/{device}: {type(error).__name__}', flush=True)
        raise
    finally:
        # Restore original budget fixture capabilities, even when an assertion fails.
        # Re-add the original manager BEFORE demoting the replacement.
        if replacement_changed:
            assign(actor_id, 'ProjectManager', False)
            assign(replacement_id, 'FinanceController', True)
        p06_page.remove_listener('pageerror', on_error)

    # Positive control after regrant; reload allowed ONLY after same-document cleanup proof.
    p06_page.goto(overview_url)
    expect(identity).to_be_visible()
    assert actor_ctx.request.get(project_url).status == 200
    checks['restored_membership_can_open_again'] = True
    (out / 'navigation-revocation.json').write_text(json.dumps({
        'scope': 'P1-06 real membership revocation; same-document SPA cache and pin/recent cleanup',
        'fixture': fixture, 'language': lang, 'device': device, 'checks': checks,
        'limits': 'Automated disposable CI only; screenshot is after cleanup, not proof of HTTP denial by itself.',
    }, indent=2) + '\n')
