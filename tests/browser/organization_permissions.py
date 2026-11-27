"""P1-09 real Production SPA acceptance, exclusively on guarded disposable CI databases.

Temporarily grants org.manage to VIEWER in this disposable database only. No shipped
role catalogue or migration is changed; revoke in finally, including failed runs.
Evidence contains synthetic UI and boolean outcomes, never credentials or sessions.
"""
import json
import secrets
import subprocess

from project_budget import mutation, require_budget_fixture


def organization_payload(org, name):
    keys = ('tradeName', 'legalForm', 'nif', 'nis', 'tradeRegisterNumber', 'taxArticleNumber',
            'shareCapitalDzd', 'wilayaCode', 'wilayaName', 'address', 'phone', 'email', 'defaultLanguage')
    return {**{key: org.get(key) for key in keys}, 'legalName': name,
            'expectedConcurrencyStamp': org['concurrencyStamp']}


def sql(statement):
    return subprocess.check_output(['psql', '-XqAt', '-v', 'ON_ERROR_STOP=1', '-c', statement],
                                   text=True).strip()


GRANT = """INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.code='VIEWER' AND p.code='org.manage' RETURNING role_id"""
REVOKE = """DELETE FROM role_permissions rp USING roles r, permissions p
WHERE rp.role_id=r.id AND rp.permission_id=p.id AND r.code='VIEWER' AND p.code='org.manage'"""


def run_organization_permissions(browser, admin_ctx, base, lang, device, viewport, out):
    # Must be first: no SQL, filesystem, browser or API access before target validation.
    require_budget_fixture(base, lang, device, 'staging')
    from playwright.sync_api import expect

    edit = 'تعديل ملف المؤسسة' if lang == 'ar' else 'Modifier le profil de l’organisation'
    save = 'حفظ التغييرات' if lang == 'ar' else 'Enregistrer les modifications'
    username = 'qa.organization.viewer'
    temporary = 'Tmp9!' + secrets.token_urlsafe(16)
    personal = 'New9!' + secrets.token_urlsafe(16)
    created = mutation(admin_ctx.request, 'post', '/api/users', {
        'username': username, 'fullName': 'QA Organization Viewer',
        'email': username + '@example.invalid', 'phone': None,
        'password': temporary, 'preferredLanguage': lang, 'roleCodes': ['VIEWER'],
    })
    assert created.status == 201
    user_id = created.json()['id']
    # UUID supplied by the real API; validate before use in the read-only audit query.
    import uuid
    user_id = str(uuid.UUID(user_id))
    checks = {}
    errors = []
    ctx = browser.new_context(base_url=base, viewport=viewport, ignore_https_errors=True)
    try:
        login = mutation(ctx.request, 'post', '/api/auth/login', {
            'usernameOrEmail': username, 'password': temporary,
        })
        assert login.status == 200
        assert mutation(ctx.request, 'post', '/api/auth/change-password', {
            'currentPassword': temporary, 'newPassword': personal,
        }).status == 204
        page = ctx.new_page()
        page.on('pageerror', lambda _: errors.append(True))

        def login_ui():
            page.goto(base)
            page.locator('#login-username').fill(username)
            page.locator('#login-password').fill(personal)
            with page.expect_response('**/api/auth/login') as response:
                page.locator('button[type=submit]').click()
            assert response.value.status == 200
            user = response.value.json()['user']
            assert user['isSystemAdministrator'] is False and user['isActive'] is True
            page.goto(base + '/organization/profile')
            expect(page.locator('html')).to_have_attribute('dir', 'rtl' if lang == 'ar' else 'ltr')
            return user

        # Log out password-rotation session, then exercise real SPA authentication.
        assert mutation(ctx.request, 'post', '/api/auth/logout', {}).status == 204
        user = login_ui()
        assert 'org.manage' not in user['permissions']
        org = ctx.request.get('/api/auth/me').json()['organization']
        expect(page.get_by_role('main').get_by_text(org['legalName'], exact=True)).to_be_visible()
        expect(page.get_by_role('button', name=edit, exact=True)).to_have_count(0)
        denied = mutation(ctx.request, 'put', '/api/organization', organization_payload(org, 'must not persist'))
        assert denied.status == 403 and denied.json()['code'] == 'FORBIDDEN_ORGANIZATION_MANAGE'
        assert ctx.request.get('/api/auth/me').json()['organization'] == org
        page.screenshot(path=out/'org-01-readonly.png', full_page=True)
        checks['non_admin_without_org_manage_readonly_api_403_no_mutation'] = True
        assert sql("SELECT count(*) FROM audit_logs WHERE actor_user_id='" + user_id
                   + "' AND event_type='ACCESS_DENIED' AND target_entity_type='OrganizationSettings'") != '0'
        checks['denial_audited'] = True

        # Fixture-only permission: fail rather than overwrite any pre-existing grant.
        assert sql("SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id=rp.role_id "
                   "JOIN permissions p ON p.id=rp.permission_id "
                   "WHERE r.code='VIEWER' AND p.code='org.manage'") == '0'
        try:
            uuid.UUID(sql(GRANT))  # Exactly one role/permission pair must exist.
            assert mutation(ctx.request, 'post', '/api/auth/logout', {}).status == 204
            user = login_ui()
            assert 'org.manage' in user['permissions']
            assert 'organization.manage' not in user['permissions']
            page.get_by_role('button', name=edit, exact=True).click()
            name = f'QA authorized organization {lang}-{device}'
            page.locator('#organization-legalName').fill(name)
            with page.expect_response('**/api/organization') as saved:
                page.get_by_role('button', name=save, exact=True).click()
            assert saved.value.status == 200
            expect(page.get_by_role('status')).to_be_visible()
            page.reload()
            expect(page.get_by_role('main').get_by_text(name, exact=True)).to_be_visible()
            assert ctx.request.get('/api/auth/me').json()['organization']['legalName'] == name
            page.screenshot(path=out/'org-02-authorized-saved.png', full_page=True)
            checks['non_admin_with_org_manage_spa_save_reload_persists'] = True
            assert sql("SELECT count(*) FROM audit_logs WHERE actor_user_id='" + user_id
                       + "' AND event_type='ORGANIZATION_PROFILE_UPDATED'") != '0'
            checks['authorized_update_audited'] = True
        finally:
            sql(REVOKE)
        # Existing session must not retain write access after the grant is removed.
        current = ctx.request.get('/api/auth/me').json()['organization']
        denied = mutation(ctx.request, 'put', '/api/organization', organization_payload(current, 'revoked'))
        assert denied.status == 403 and denied.json()['code'] == 'FORBIDDEN_ORGANIZATION_MANAGE'
        assert ctx.request.get('/api/auth/me').json()['organization'] == current
        page.reload()
        expect(page.get_by_role('main').get_by_text(current['legalName'], exact=True)).to_be_visible()
        expect(page.get_by_role('button', name=edit, exact=True)).to_have_count(0)
        checks['revocation_enforced_existing_session_api_and_spa'] = True
        assert not errors
        (out/'organization-permissions.json').write_text(json.dumps({
            'profile': f'{lang}-{device}', 'status': 'PASS', 'checks': checks,
            'scope': 'P1-09 disposable Production HTTPS; temporary VIEWER grant revoked',
        }, indent=2) + '\n')
    finally:
        ctx.close()
