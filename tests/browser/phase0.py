"""Automated real-browser evidence, NOT a manual operator signature. CI loopback fixture only."""
import json
import os
import secrets
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = 'http://127.0.0.1:5173'
lang, device = sys.argv[1:]
assert lang in ('ar', 'fr') and device in ('mobile', 'desktop')
assert os.environ['PGDATABASE'] == f'p0_{lang}_{device}' and os.environ['PGHOST'] == '127.0.0.1'
out = Path(os.environ['RUNNER_TEMP']) / 'phase0-evidence' / f'{lang}-{device}'
out.mkdir(parents=True)
viewport = dict(width=390, height=844) if device == 'mobile' else dict(width=1440, height=900)


def counts():
    sql = """SELECT (SELECT count(*) FROM organization_settings), (SELECT count(*) FROM users),
             (SELECT count(*) FROM user_roles u JOIN roles r ON r.id=u.role_id WHERE r.code='SYSTEM_ADMIN')"""
    return subprocess.check_output(['psql', '-XAtqc', sql], text=True).strip()


def organization_update_payload(organization, legal_name):
    return {
        'legalName': legal_name,
        'tradeName': organization.get('tradeName'),
        'legalForm': organization['legalForm'],
        'nif': organization.get('nif'),
        'nis': organization.get('nis'),
        'tradeRegisterNumber': organization.get('tradeRegisterNumber'),
        'taxArticleNumber': organization.get('taxArticleNumber'),
        'shareCapitalDzd': organization.get('shareCapitalDzd'),
        'wilayaCode': organization['wilayaCode'],
        'wilayaName': organization['wilayaName'],
        'address': organization['address'],
        'phone': organization.get('phone'),
        'email': organization.get('email'),
        'defaultLanguage': organization['defaultLanguage'],
        'expectedConcurrencyStamp': organization['concurrencyStamp'],
    }


with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome')
    ctx = browser.new_context(base_url=BASE, viewport=viewport)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda _: errors.append(True))
    assert counts() == '0|0|0'
    assert ctx.request.get('/api/setup/status').json()['isInitialized'] is False
    page.goto(BASE)
    page.get_by_role('button', name='العربية' if lang == 'ar' else 'Français', exact=True).click()
    direction = 'rtl' if lang == 'ar' else 'ltr'
    expect(page.locator('html')).to_have_attribute('dir', direction)
    page.locator('#setup-defaultLang').select_option(lang)
    password = 'Qa9!' + secrets.token_urlsafe(18)
    fields = {'legalName': 'QA Synthetic Organization', 'address': 'QA fictitious address',
              'adminUsername': 'qaadmin', 'adminFullName': 'QA Administrator',
              'adminEmail': 'qa@example.invalid', 'adminPassword': password, 'confirmPassword': password}
    for key, val in fields.items():
        page.locator('#setup-' + key).fill(val)
    with page.expect_response('**/api/setup/initialize') as first:
        page.locator('button[type=submit]').click()
    assert first.value.status == 201
    expect(page.locator('#login-username')).to_be_visible()
    expect(page.get_by_role('status')).to_contain_text('اكتملت' if lang == 'ar' else 'initialisée')
    expect(page.get_by_text(fields['legalName'], exact=True)).to_be_visible()
    expect(page.locator('html')).to_have_attribute('lang', lang)
    page.screenshot(path=out/'01-login-handoff.png')
    assert ctx.request.get('/api/auth/me').status == 401
    duplicate = ctx.request.post('/api/setup/initialize', data=first.value.request.post_data_json,
                                 headers={'X-CSRF-TOKEN': first.value.request.headers['x-csrf-token']})
    assert duplicate.status == 409 and duplicate.json()['code'] == 'SETUP_ALREADY_INITIALIZED'
    assert counts() == '1|1|1'
    page.locator('#login-username').fill(fields['adminUsername'])
    page.locator('#login-password').fill(password)
    with page.expect_response('**/api/auth/login') as login:
        page.locator('button[type=submit]').click()
    assert login.value.status == 200
    # Independent client, same disposable session, held only in memory.
    previous = pw.request.new_context(base_url=BASE, storage_state=ctx.storage_state())
    assert previous.get('/api/auth/me').status == 200

    # A05: new employee temporary credentials are restricted until personal
    # password rotation; cover the real SPA flow on all AR/FR + desktop/mobile runs.
    admin_csrf = ctx.request.get('/api/auth/csrf')
    assert admin_csrf.status == 200
    admin_csrf_token = admin_csrf.headers.get('x-csrf-token')
    assert admin_csrf_token
    temporary_password = 'Tmp9!' + secrets.token_urlsafe(14)
    personal_password = 'New9!' + secrets.token_urlsafe(14)
    employee_username = 'qa.rotation'
    create_employee = ctx.request.post(
        '/api/users',
        data={
            'username': employee_username,
            'fullName': 'QA Temporary Employee',
            'email': 'qa.rotation@example.invalid',
            'phone': None,
            'password': temporary_password,
            'preferredLanguage': lang,
            'roleCodes': ['COMMERCIAL_MANAGER'],
        },
        headers={'X-CSRF-TOKEN': admin_csrf_token},
    )
    assert create_employee.status == 201, create_employee.text()
    employee_record = create_employee.json()
    assert employee_record['mustChangePasswordAtNextLogin'] is True
    assert employee_record['passwordChangeRequiredUntilUtc']

    employee_ctx = browser.new_context(base_url=BASE, viewport=viewport)
    employee_page = employee_ctx.new_page()
    employee_errors = []
    employee_page.on('pageerror', lambda _: employee_errors.append(True))
    employee_page.goto(BASE + '/admin/users')
    expect(employee_page.locator('#login-username')).to_be_visible()
    employee_page.locator('#login-username').fill(employee_username)
    employee_page.locator('#login-password').fill(temporary_password)
    with employee_page.expect_response('**/api/auth/login') as temporary_login:
        employee_page.locator('button[type=submit]').click()
    assert temporary_login.value.status == 200
    temporary_session = temporary_login.value.json()
    assert temporary_session['user']['mustChangePasswordAtNextLogin'] is True
    assert temporary_session['user']['roles'] == []
    assert temporary_session['user']['permissions'] == []
    assert temporary_session['organization']['nif'] is None
    assert temporary_session['organization']['legalName'] == ''

    change_title = (
        'يجب تغيير كلمة المرور المؤقتة'
        if lang == 'ar'
        else 'Changement du mot de passe temporaire obligatoire'
    )
    expect(employee_page.get_by_role('heading', name=change_title)).to_be_visible()
    expect(employee_page.locator('html')).to_have_attribute('dir', direction)

    # The restricted session must survive a browser reload on a client-side deep route.
    response = employee_page.goto(BASE + '/admin/users')
    assert response and response.status == 200
    employee_page.reload()
    expect(employee_page.get_by_role('heading', name=change_title)).to_be_visible()
    employee_page.screenshot(path=out/'04-temporary-password-required.png')

    blocked = employee_page.evaluate("""async () => {
      const response = await fetch('/api/projects', { credentials: 'include' });
      const payload = await response.json();
      return { status: response.status, code: payload.code };
    }""")
    assert blocked == {'status': 403, 'code': 'PASSWORD_CHANGE_REQUIRED'}

    cookies = employee_ctx.cookies(BASE)
    session_cookie = next(cookie['value'] for cookie in cookies if cookie['name'] == 'promogest_session')
    employee_page.locator('#temporary-current-password').fill(temporary_password)
    employee_page.locator('#personal-new-password').fill(personal_password)
    employee_page.locator('#confirm-personal-password').fill(personal_password)
    change_button = (
        'تغيير كلمة المرور'
        if lang == 'ar'
        else 'Changer le mot de passe'
    )
    with employee_page.expect_response('**/api/auth/change-password') as password_change:
        employee_page.get_by_role('button', name=change_button, exact=True).click()
    assert password_change.value.status == 204
    expect(employee_page.locator('#login-username')).to_be_visible()
    notice = (
        'تم تغيير كلمة المرور وإبطال الجلسات السابقة'
        if lang == 'ar'
        else 'Le mot de passe a été modifié et les anciennes sessions révoquées'
    )
    expect(employee_page.get_by_role('status')).to_contain_text(notice)
    assert employee_ctx.request.get('/api/auth/me').status == 401

    # A replay of the pre-change session cookie is invalidated server-side.
    replay_ctx = browser.new_context(base_url=BASE, extra_http_headers={'Cookie': f'promogest_session={session_cookie}'})
    assert replay_ctx.request.get('/api/auth/me').status == 401

    employee_page.locator('#login-username').fill(employee_username)
    employee_page.locator('#login-password').fill(personal_password)
    with employee_page.expect_response('**/api/auth/login') as personal_login:
        employee_page.locator('button[type=submit]').click()
    assert personal_login.value.status == 200
    permanent_session = personal_login.value.json()
    assert permanent_session['user']['mustChangePasswordAtNextLogin'] is False
    assert permanent_session['user']['permissions']
    expect(employee_page.locator('#login-username')).to_have_count(0)
    assert not employee_errors, 'Temporary-password browser flow reported an uncaught application error'

    # P1-09: exercise the real ASP.NET Core API and SPA on this isolated PG18 profile.
    profile_url = BASE + '/organization/profile'
    profile_title = 'ملف المؤسسة المحلي' if lang == 'ar' else "Identité de l'organisation"
    edit_button = 'تعديل ملف المؤسسة' if lang == 'ar' else 'Modifier le profil de l’organisation'
    save_button = 'حفظ التغييرات' if lang == 'ar' else 'Enregistrer les modifications'
    save_success = 'تم حفظ بيانات المؤسسة بنجاح.' if lang == 'ar' else "Les informations de l’organisation ont été enregistrées."
    read_only_notice = (
        'ليس لديك صلاحية تعديل بيانات المؤسسة. يمكنك الاطلاع عليها فقط.'
        if lang == 'ar'
        else 'Vous ne disposez pas de l’autorisation de modifier le profil de l’organisation.'
    )

    # SYSTEM_ADMIN retains the existing edit/save path.
    page.goto(profile_url)
    expect(page.get_by_role('heading', name=profile_title)).to_be_visible()
    expect(page.get_by_role('button', name=edit_button, exact=True)).to_be_visible()
    admin_org = ctx.request.get('/api/auth/me').json()['organization']
    admin_legal_name = f'QA SYSTEM_ADMIN {lang} Organization'
    page.get_by_role('button', name=edit_button, exact=True).click()
    page.locator('#organization-legalName').fill(admin_legal_name)
    with page.expect_response('**/api/organization') as admin_profile_update:
        page.get_by_role('button', name=save_button, exact=True).click()
    assert admin_profile_update.value.status == 200
    expect(page.get_by_role('status')).to_contain_text(save_success)
    expect(page.get_by_role('main').get_by_text(admin_legal_name, exact=True)).to_be_visible()
    page.screenshot(path=out/'p1-09-system-admin-edit-save.png')

    # A normal commercial user starts without org.manage and must remain read-only.
    assert permanent_session['user']['isSystemAdministrator'] is False
    assert 'org.read' in permanent_session['user']['permissions']
    assert 'org.manage' not in permanent_session['user']['permissions']
    employee_page.goto(profile_url)
    expect(employee_page.get_by_role('heading', name=profile_title)).to_be_visible()
    expect(employee_page.get_by_role('button', name=edit_button, exact=True)).to_have_count(0)
    expect(employee_page.get_by_text(read_only_notice, exact=True)).to_be_visible()
    employee_page.screenshot(path=out/'p1-09-read-only.png')

    csrf_response = employee_ctx.request.get('/api/auth/csrf')
    assert csrf_response.status == 200
    csrf_token = csrf_response.headers.get('x-csrf-token')
    assert csrf_token
    admin_org = ctx.request.get('/api/auth/me').json()['organization']
    denied_update = employee_ctx.request.put(
        BASE + '/api/organization',
        data=organization_update_payload(admin_org, 'QA forbidden non-admin update'),
        headers={'X-CSRF-TOKEN': csrf_token},
    )
    assert denied_update.status == 403, denied_update.text()
    assert denied_update.json()['code'] == 'FORBIDDEN_ORGANIZATION_MANAGE'

    # Test-only permission grant in this newly created CI database. No seeded/production role is changed.
    assert os.environ.get('GITHUB_ACTIONS') == 'true'
    assert os.environ['PGDATABASE'] == f'p0_{lang}_{device}'
    owner_env = os.environ.copy()
    owner_env.update({'PGUSER': 'promogest_owner', 'PGPASSWORD': 'owner_pass'})
    has_existing_test_grant = subprocess.check_output(
        [
            'psql', '-XAtqc',
            "SELECT count(*) FROM role_permissions rp "
            "JOIN roles r ON r.id=rp.role_id "
            "JOIN permissions p ON p.id=rp.permission_id "
            "WHERE r.code='COMMERCIAL_MANAGER' AND p.code='org.manage'",
        ],
        env=owner_env,
        text=True,
    ).strip()
    assert has_existing_test_grant == '0', 'CI fixture unexpectedly started with a COMMERCIAL_MANAGER org.manage grant'
    subprocess.run(
        [
            'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-c',
            "INSERT INTO role_permissions (role_id, permission_id) "
            "SELECT r.id, p.id FROM roles r CROSS JOIN permissions p "
            "WHERE r.code='COMMERCIAL_MANAGER' AND p.code='org.manage' "
            "ON CONFLICT (role_id, permission_id) DO NOTHING",
        ],
        env=owner_env,
        check=True,
        text=True,
        capture_output=True,
    )

    # A fresh login must resolve org.manage; the old read-only session is not reused.
    editor_ctx = browser.new_context(base_url=BASE, viewport=viewport)
    editor_page = editor_ctx.new_page()
    editor_page.goto(profile_url)
    expect(editor_page.locator('#login-username')).to_be_visible()
    editor_page.locator('#login-username').fill(employee_username)
    editor_page.locator('#login-password').fill(personal_password)
    with editor_page.expect_response('**/api/auth/login') as editor_login:
        editor_page.locator('button[type=submit]').click()
    assert editor_login.value.status == 200
    editor_session = editor_login.value.json()
    assert editor_session['user']['isSystemAdministrator'] is False
    assert 'org.manage' in editor_session['user']['permissions']
    assert 'organization.manage' not in editor_session['user']['permissions']
    editor_page.goto(profile_url)
    expect(editor_page.get_by_role('heading', name=profile_title)).to_be_visible()
    expect(editor_page.get_by_role('button', name=edit_button, exact=True)).to_be_visible()
    editor_legal_name = f'QA non-admin org.manage {lang}'
    editor_page.get_by_role('button', name=edit_button, exact=True).click()
    editor_page.locator('#organization-legalName').fill(editor_legal_name)
    with editor_page.expect_response('**/api/organization') as editor_profile_update:
        editor_page.get_by_role('button', name=save_button, exact=True).click()
    assert editor_profile_update.value.status == 200
    expect(editor_page.get_by_role('status')).to_contain_text(save_success)
    persisted_org = editor_ctx.request.get('/api/auth/me').json()['organization']
    assert persisted_org['legalName'] == editor_legal_name
    editor_page.screenshot(path=out/'p1-09-non-admin-org-manage-edit-save.png')
    editor_ctx.close()

    # P1-15: real SPA refusal paths for removing/demoting the last ProjectManager.
    # Existing PostgreSQL 18 integration tests cover concurrent request races; this browser
    # slice covers the bilingual operator feedback and prevents a false-success UI state.
    if device == 'desktop':
        p15_project_code = f'QA-P1-15-{lang.upper()}-{device.upper()}'
        p15_project_response = ctx.request.post(
            BASE + '/api/projects',
            data={
                'code': p15_project_code,
                'nameAr': 'مشروع اختبار حماية آخر مدير',
                'nameFr': 'Projet QA dernier chef de projet',
                'wilayaCode': '16',
                'wilayaName': 'الجزائر / Alger',
                'municipality': 'Dely Ibrahim',
                'address': 'QA fictitious address',
                'landTitleReference': None,
                'buildingPermitNumber': None,
                'buildingPermitDate': None,
                'status': 'Planning',
                'estimatedBudgetDzd': 0,
                'plannedBlocksCount': 1,
                'plannedUnitsCount': 1,
            },
            headers={'X-CSRF-TOKEN': admin_csrf_token},
        )
        assert p15_project_response.status == 201, p15_project_response.text()
        p15_project_id = p15_project_response.json()['id']

        # SystemAdmin creates the only membership; no automatic second manager is added.
        p15_initial_assignment = ctx.request.put(
            BASE + f'/api/projects/{p15_project_id}/members',
            data={
                'userId': employee_record['id'],
                'roleInProject': 'ProjectManager',
                'canViewFinancials': False,
                'canManageSales': False,
                'canManageConstruction': False,
                'canManageDocuments': False,
            },
            headers={'X-CSRF-TOKEN': admin_csrf_token},
        )
        assert p15_initial_assignment.status == 200, p15_initial_assignment.text()
        p15_last_manager_error = (
            'يجب أن يحتفظ المشروع بمدير مشروع واحد نشط على الأقل.'
            if lang == 'ar'
            else 'Le projet doit conserver au moins un chef de projet actif.'
        )
        manage_access_label = 'صلاحيات المشروع' if lang == 'ar' else 'Accès projet'
        access_modal_title = (
            'إدارة صلاحيات الوصول للمشروع'
            if lang == 'ar'
            else 'Gestion des accès au projet'
        )
        remove_member_label = 'سحب الصلاحية' if lang == 'ar' else 'Révoquer'
        assign_member_label = 'منح الصلاحية' if lang == 'ar' else "Attribuer l'accès"

        page.goto(BASE + '/projects')
        p15_row = page.get_by_role('row').filter(has_text=p15_project_code)
        expect(p15_row).to_have_count(1)
        p15_row.get_by_role('button', name=manage_access_label, exact=True).click()
        expect(page.get_by_role('heading', name=access_modal_title)).to_be_visible()
        expect(page.locator('#pm-user')).to_be_visible()
        expect(page.locator('#pm-role')).to_be_visible()

        # Attempting to remove the only ProjectManager is refused by the real API.
        with page.expect_response(
            lambda response: response.request.method == 'DELETE'
            and response.url.endswith(
                f'/api/projects/{p15_project_id}/members/{employee_record["id"]}'
            )
        ) as p15_remove_attempt:
            page.get_by_role('button', name=remove_member_label, exact=True).click()
        assert p15_remove_attempt.value.status == 409
        assert p15_remove_attempt.value.json()['code'] == 'PROJECT_LAST_MANAGER_REQUIRED'
        expect(page.get_by_role('alert')).to_contain_text(p15_last_manager_error)
        page.screenshot(path=out/'p1-15-last-manager-remove-refused.png')

        # Re-assigning that same member to a non-manager role is also refused.
        page.locator('#pm-user').select_option(employee_record['id'])
        page.locator('#pm-role').select_option('CommercialAgent')
        p15_membership_form = page.locator('form').filter(has=page.locator('#pm-user'))
        with page.expect_response(
            lambda response: response.request.method == 'PUT'
            and response.url.endswith(f'/api/projects/{p15_project_id}/members')
        ) as p15_demotion_attempt:
            p15_membership_form.get_by_role('button', name=assign_member_label, exact=True).click()
        assert p15_demotion_attempt.value.status == 409
        assert p15_demotion_attempt.value.json()['code'] == 'PROJECT_LAST_MANAGER_REQUIRED'
        expect(page.get_by_role('alert')).to_contain_text(p15_last_manager_error)

        # The project still has one ProjectManager; no false revocation/assignment audit was committed.
        p15_after_attempts = ctx.request.get(BASE + f'/api/projects/{p15_project_id}')
        assert p15_after_attempts.status == 200
        p15_members = p15_after_attempts.json()['members']
        assert len(p15_members) == 1
        assert p15_members[0]['userId'] == employee_record['id']
        assert p15_members[0]['roleInProject'] == 'ProjectManager'
        p15_audit_response = ctx.request.get(BASE + '/api/audit?limit=100')
        assert p15_audit_response.status == 200
        p15_project_audit = [
            entry for entry in p15_audit_response.json()
            if entry['targetEntityId'] == p15_project_id
        ]
        assert sum(entry['eventType'] == 'PROJECT_MEMBER_ASSIGNED' for entry in p15_project_audit) == 1
        assert sum(entry['eventType'] == 'PROJECT_MEMBER_REVOKED' for entry in p15_project_audit) == 0
        page.screenshot(path=out/'p1-15-last-manager-downgrade-refused.png')

        # Close the access modal before the shared Phase 0 logout checks below.
        # The close (X) button uses the localized users.cancel aria-label.
        cancel_label = 'إلغاء' if lang == 'ar' else 'Annuler'
        page.get_by_role('button', name=cancel_label, exact=True).first.click()
        expect(page.get_by_role('heading', name=access_modal_title)).to_have_count(0)


        p1_15_evidence = (
            'Desktop AR/FR real SPA: sole ProjectManager removal returned 409 PROJECT_LAST_MANAGER_REQUIRED '
            'with bilingual visible alert; assigning that same user to CommercialAgent also returned 409 '
            'with visible alert; API reload retained the sole ProjectManager; audit retained exactly one '
            'initial PROJECT_MEMBER_ASSIGNED and no PROJECT_MEMBER_REVOKED. Existing PG18 integration tests '
            'separately cover concurrent demotion/removal races, one winner/one 409 and atomic audit. '
            'Automated real-browser evidence only, not manual staging acceptance.'
        )
    else:
        p1_15_evidence = 'Not exercised on mobile: current project-directory mobile cards do not expose Manage Access. No mobile acceptance is claimed.'

    p1_09_evidence = (
        'SYSTEM_ADMIN browser edit/save 200; non-admin without org.manage read-only and API 403 '
        'FORBIDDEN_ORGANIZATION_MANAGE; isolated CI-only org.manage grant; fresh non-admin session '
        'edit/save 200 with API persistence; screenshots cover AR/FR desktop/mobile'
    )

    a05_evidence = 'temporary session sanitized; deep-link reload served SPA; business API 403 PASSWORD_CHANGE_REQUIRED; rotation 204; old cookie replay 401; personal password login 200'
    # P1-17: persist the authenticated user's own language preference through the real SPA.
    # P1-09 opened a second login for this same user; successful login rotates User.ConcurrencyStamp.
    # Reload once so the starting tab receives the authoritative current stamp before the happy path.
    employee_page.reload()
    expect(employee_page.locator('html')).to_have_attribute('lang', lang)
    p17_admin_before = ctx.request.get('/api/auth/me')
    assert p17_admin_before.status == 200
    p17_admin_session_before = p17_admin_before.json()
    p17_admin_user = p17_admin_session_before['user']
    p17_organization_default = p17_admin_session_before['organization']['defaultLanguage']
    p17_admin_preference = p17_admin_user['preferredLanguage']
    p17_employee_before = employee_ctx.request.get('/api/auth/me')
    assert p17_employee_before.status == 200
    p17_employee_session_before = p17_employee_before.json()
    assert p17_employee_session_before['user']['preferredLanguage'] == lang
    assert p17_employee_session_before['organization']['defaultLanguage'] == p17_organization_default

    p17_other_language = 'fr' if lang == 'ar' else 'ar'
    p17_other_button = 'Français' if p17_other_language == 'fr' else 'العربية'
    p17_original_button = 'Français' if lang == 'fr' else 'العربية'
    p17_direction = 'ltr' if p17_other_language == 'fr' else 'rtl'
    p17_language_switcher = employee_page.get_by_role('group', name='Language switcher')

    with employee_page.expect_response(
        lambda response: response.request.method == 'PUT'
        and response.url.endswith('/api/auth/preferred-language')
    ) as p17_first_save:
        p17_language_switcher.get_by_role('button', name=p17_other_button, exact=True).click()
    assert p17_first_save.value.status == 200, p17_first_save.value.text()
    p17_saved_session = p17_first_save.value.json()
    assert p17_saved_session['user']['preferredLanguage'] == p17_other_language
    assert p17_saved_session['organization']['defaultLanguage'] == p17_organization_default
    expect(employee_page.locator('html')).to_have_attribute('lang', p17_other_language)
    expect(employee_page.locator('html')).to_have_attribute('dir', p17_direction)
    p17_after_save = employee_ctx.request.get('/api/auth/me')
    assert p17_after_save.status == 200
    assert p17_after_save.json()['user']['preferredLanguage'] == p17_other_language
    assert p17_after_save.json()['organization']['defaultLanguage'] == p17_organization_default
    employee_page.screenshot(path=out/'p1-17-preference-saved.png')

    # Reload must reconstruct the shell locale from SessionResponse, not browser-only state.
    employee_page.reload()
    expect(employee_page.locator('html')).to_have_attribute('lang', p17_other_language)
    expect(employee_page.locator('html')).to_have_attribute('dir', p17_direction)

    # A completely new browser context has no prior cookies or storage; fresh login
    # must return the saved preference and the shell must apply it.
    p17_fresh_context = browser.new_context(base_url=BASE, viewport=viewport)
    p17_fresh_page = p17_fresh_context.new_page()
    p17_fresh_page.goto(BASE)
    expect(p17_fresh_page.locator('#login-username')).to_be_visible()
    p17_fresh_page.locator('#login-username').fill(employee_username)
    p17_fresh_page.locator('#login-password').fill(personal_password)
    with p17_fresh_page.expect_response('**/api/auth/login') as p17_fresh_login:
        p17_fresh_page.locator('button[type=submit]').click()
    assert p17_fresh_login.value.status == 200
    assert p17_fresh_login.value.json()['user']['preferredLanguage'] == p17_other_language
    assert p17_fresh_login.value.json()['organization']['defaultLanguage'] == p17_organization_default
    expect(p17_fresh_page.locator('html')).to_have_attribute('lang', p17_other_language)
    expect(p17_fresh_page.locator('html')).to_have_attribute('dir', p17_direction)
    p17_fresh_page.screenshot(path=out/'p1-17-fresh-login-preference.png')
    p17_page = p17_fresh_page
    p17_context = p17_fresh_context
    p17_language_switcher = p17_page.get_by_role('group', name='Language switcher')

    # Switch back to the original preference before exercising failure paths.
    with p17_page.expect_response(
        lambda response: response.request.method == 'PUT'
        and response.url.endswith('/api/auth/preferred-language')
    ) as p17_restore_original:
        p17_language_switcher.get_by_role('button', name=p17_original_button, exact=True).click()
    assert p17_restore_original.value.status == 200, p17_restore_original.value.text()
    assert p17_restore_original.value.json()['user']['preferredLanguage'] == lang
    expect(p17_page.locator('html')).to_have_attribute('lang', lang)
    expect(p17_page.locator('html')).to_have_attribute('dir', direction)
    p17_original_session = p17_context.request.get('/api/auth/me').json()
    assert p17_original_session['user']['preferredLanguage'] == lang

    # A network failure must not apply the requested locale or imply persistence.
    p17_failure_text = (
        'تعذر حفظ تفضيل اللغة. لم يتغير اختيارك المحفوظ؛ حاول مجدداً.'
        if lang == 'ar'
        else 'Impossible d’enregistrer la préférence linguistique. Le choix enregistré reste inchangé ; réessayez.'
    )
    p17_page.route(
        '**/api/auth/preferred-language',
        lambda route: route.abort('internetdisconnected'),
    )
    p17_language_switcher.get_by_role('button', name=p17_other_button, exact=True).click()
    expect(p17_page.get_by_role('alert')).to_contain_text(p17_failure_text)
    expect(p17_page.locator('html')).to_have_attribute('lang', lang)
    expect(p17_page.locator('html')).to_have_attribute('dir', direction)
    p17_after_network_failure = p17_context.request.get('/api/auth/me')
    assert p17_after_network_failure.status == 200
    assert p17_after_network_failure.json()['user']['preferredLanguage'] == lang
    assert p17_after_network_failure.json()['organization']['defaultLanguage'] == p17_organization_default
    p17_page.screenshot(path=out/'p1-17-network-failure-keeps-old-locale.png')
    p17_page.unroute('**/api/auth/preferred-language')

    # Change the persisted value behind the open tab. Its stale session stamp must
    # receive 409, refresh /api/auth/me, apply the server value, and show an error.
    p17_external_csrf = p17_context.request.get('/api/auth/csrf')
    assert p17_external_csrf.status == 200
    p17_external_token = p17_external_csrf.headers.get('x-csrf-token')
    assert p17_external_token
    p17_external_current = p17_context.request.get('/api/auth/me').json()
    p17_external_change = p17_context.request.put(
        '/api/auth/preferred-language',
        data={
            'preferredLanguage': p17_other_language,
            'expectedConcurrencyStamp': p17_external_current['user']['concurrencyStamp'],
        },
        headers={'X-CSRF-TOKEN': p17_external_token},
    )
    assert p17_external_change.status == 200, p17_external_change.text()
    assert p17_external_change.json()['user']['preferredLanguage'] == p17_other_language
    assert p17_external_change.json()['organization']['defaultLanguage'] == p17_organization_default
    p17_conflict_text = (
        'تعذر حفظ تفضيل اللغة. لم يتغير اختيارك المحفوظ؛ حاول مجدداً.'
        if p17_other_language == 'ar'
        else 'Impossible d’enregistrer la préférence linguistique. Le choix enregistré reste inchangé ; réessayez.'
    )
    with p17_page.expect_response(
        lambda response: response.request.method == 'PUT'
        and response.url.endswith('/api/auth/preferred-language')
    ) as p17_stale_save:
        p17_language_switcher.get_by_role('button', name=p17_other_button, exact=True).click()
    assert p17_stale_save.value.status == 409
    assert p17_stale_save.value.json()['code'] == 'USER_CONCURRENCY_CONFLICT'
    # App.tsx refreshes the authoritative session on 409 instead of retrying with a stale stamp.
    expect(p17_page.locator('html')).to_have_attribute('lang', p17_other_language)
    expect(p17_page.locator('html')).to_have_attribute('dir', p17_direction)
    expect(p17_page.get_by_role('alert')).to_contain_text(p17_conflict_text)
    p17_after_conflict = p17_context.request.get('/api/auth/me')
    assert p17_after_conflict.status == 200
    assert p17_after_conflict.json()['user']['preferredLanguage'] == p17_other_language
    assert p17_after_conflict.json()['organization']['defaultLanguage'] == p17_organization_default
    p17_page.screenshot(path=out/'p1-17-stale-concurrency-refresh.png')

    # A non-admin cannot change another user's profile/preference through user management.
    # The self-service endpoint has no target-user parameter; user-management remains
    # separately protected by users.manage and must not modify the SYSTEM_ADMIN account.
    p17_cross_user_attempt = p17_context.request.put(
        f"/api/users/{p17_admin_user['id']}",
        data={
            'fullName': p17_admin_user['fullName'],
            'email': p17_admin_user['email'],
            'phone': p17_admin_user.get('phone'),
            'preferredLanguage': p17_other_language,
            'roleCodes': p17_admin_user['roles'],
        },
        headers={'X-CSRF-TOKEN': p17_external_token},
    )
    assert p17_cross_user_attempt.status == 403, p17_cross_user_attempt.text()
    assert p17_cross_user_attempt.json()['code'] == 'FORBIDDEN_USER_MANAGEMENT'
    p17_admin_after_cross_user_attempt = ctx.request.get('/api/auth/me')
    assert p17_admin_after_cross_user_attempt.status == 200
    assert p17_admin_after_cross_user_attempt.json()['user']['preferredLanguage'] == p17_admin_preference
    assert p17_admin_after_cross_user_attempt.json()['organization']['defaultLanguage'] == p17_organization_default
    assert p17_admin_preference == lang
    assert p17_after_conflict.json()['user']['id'] == employee_record['id']
    p17_own_audit = ctx.request.get('/api/audit?limit=100')
    assert p17_own_audit.status == 200
    assert any(
        entry['eventType'] == 'ACCESS_DENIED'
        and entry['actorUserId'] == employee_record['id']
        for entry in p17_own_audit.json()
    )
    p17_1_17_evidence = (
        'Real ASP.NET Core + PostgreSQL 18 SPA browser checks in AR/FR and desktop/mobile: own language PUT 200; '
        'persisted value confirmed from /api/auth/me; reload and fresh browser login retained preference; '
        'Organization.DefaultLanguage remained unchanged; failed network request kept previous locale and showed '
        'localized failure; stale session stamp returned 409 USER_CONCURRENCY_CONFLICT then shell refreshed '
        '/api/auth/me; cross-user profile/preference update returned 403 FORBIDDEN_USER_MANAGEMENT and left '
        'SYSTEM_ADMIN preference unchanged. Automated CI evidence only, not manual Staging acceptance.'
    )


    # P1-19: exercise the real bilingual sessions-security modal and revoke flow.
    # Use the fresh employee session as the current device, and create a second
    # independent login with a distinct synthetic User-Agent for deterministic UI targeting.
    p19_language = p17_other_language
    p19_is_arabic = p19_language == 'ar'
    p19_direction = 'rtl' if p19_is_arabic else 'ltr'
    p19_secondary_user_agent = f'PROMOGEST-P1-19-QA-{lang}-{device}'
    p19_secondary_context = browser.new_context(
        base_url=BASE,
        viewport=viewport,
        user_agent=p19_secondary_user_agent,
    )
    p19_secondary_page = p19_secondary_context.new_page()
    p19_secondary_page.goto(BASE)
    expect(p19_secondary_page.locator('#login-username')).to_be_visible()
    p19_secondary_page.locator('#login-username').fill(employee_username)
    p19_secondary_page.locator('#login-password').fill(personal_password)
    with p19_secondary_page.expect_response('**/api/auth/login') as p19_secondary_login:
        p19_secondary_page.locator('button[type=submit]').click()
    assert p19_secondary_login.value.status == 200
    assert p19_secondary_login.value.json()['user']['preferredLanguage'] == p19_language
    expect(p19_secondary_page.locator('html')).to_have_attribute('lang', p19_language)
    expect(p19_secondary_page.locator('html')).to_have_attribute('dir', p19_direction)

    p19_sessions_before = p17_context.request.get('/api/auth/sessions')
    assert p19_sessions_before.status == 200, p19_sessions_before.text()
    p19_session_rows = p19_sessions_before.json()
    p19_current = [item for item in p19_session_rows if item['isCurrentSession']]
    p19_secondary = [
        item for item in p19_session_rows
        if item['userAgent'] == p19_secondary_user_agent
    ]
    assert len(p19_current) == 1
    assert len(p19_secondary) == 1
    p19_current_id = p19_current[0]['id']
    p19_secondary_id = p19_secondary[0]['id']
    assert p19_current_id != p19_secondary_id
    p19_session_json = p19_sessions_before.text().lower()
    assert 'tokenhash' not in p19_session_json
    assert 'securitystamp' not in p19_session_json
    assert 'opaquetoken' not in p19_session_json

    if device == 'mobile':
        p17_page.get_by_role('button', name='Open menu', exact=True).click()
    p19_open_sessions = 'الجلسات النشطة' if p19_is_arabic else 'Sessions actives'
    p19_title = p19_open_sessions
    p17_page.get_by_role('button', name=p19_open_sessions, exact=True).click()
    expect(p17_page.get_by_role('heading', name=p19_title, exact=True)).to_be_visible()
    expect(p17_page.locator('html')).to_have_attribute('lang', p19_language)
    expect(p17_page.locator('html')).to_have_attribute('dir', p19_direction)

    p19_privacy_prefix = (
        'تنبيه الخصوصية'
        if p19_is_arabic
        else 'Confidentialité'
    )
    p19_privacy_note = p17_page.get_by_role('note')
    expect(p19_privacy_note).to_be_visible()
    expect(p19_privacy_note).to_contain_text(p19_privacy_prefix)

    p19_secondary_row = p17_page.locator('li').filter(has_text=p19_secondary_user_agent)
    expect(p19_secondary_row).to_have_count(1)
    p19_secondary_revoke_label = (
        'إنهاء الجلسة'
        if p19_is_arabic
        else 'Révoquer la session'
    )
    p19_revoke_response_url = f'/api/auth/sessions/{p19_secondary_id}/revoke'
    with p17_page.expect_response(
        lambda response: response.request.method == 'POST'
        and response.url.endswith(p19_revoke_response_url)
    ) as p19_secondary_revoke:
        p19_secondary_row.get_by_role(
            'button',
            name=p19_secondary_revoke_label,
            exact=True,
        ).click()
    assert p19_secondary_revoke.value.status == 204, p19_secondary_revoke.value.text()
    expect(p19_secondary_row).to_have_count(0)
    assert p19_secondary_context.request.get('/api/auth/me').status == 401
    p19_sessions_after = p17_context.request.get('/api/auth/sessions')
    assert p19_sessions_after.status == 200
    p19_remaining = p19_sessions_after.json()
    assert not any(item['id'] == p19_secondary_id for item in p19_remaining)
    assert any(item['id'] == p19_current_id and item['isCurrentSession'] for item in p19_remaining)
    assert p17_context.request.get('/api/auth/me').status == 200
    p17_page.screenshot(path=out/'p1-19-other-session-revoked.png')

    # Ending the current device is a separate, explicitly confirmed action.
    p19_current_label = 'هذا الجهاز' if p19_is_arabic else 'Cet appareil'
    p19_current_revoke_label = (
        'تسجيل الخروج من هذا الجهاز'
        if p19_is_arabic
        else 'Déconnecter cet appareil'
    )
    p19_current_row = p17_page.locator('li').filter(has_text=p19_current_label)
    expect(p19_current_row).to_have_count(1)
    p19_revoke_requests = []
    p17_page.on(
        'request',
        lambda request: p19_revoke_requests.append(request)
        if request.method == 'POST' and request.url.endswith('/revoke')
        else None,
    )
    p19_current_row.get_by_role(
        'button',
        name=p19_current_revoke_label,
        exact=True,
    ).click()
    p19_confirmation = (
        'سيؤدي ذلك إلى تسجيل خروجك من هذا الجهاز. هل تريد المتابعة؟'
        if p19_is_arabic
        else 'Cette action vous déconnectera de cet appareil. Voulez-vous continuer ?'
    )
    expect(p17_page.get_by_text(p19_confirmation, exact=True)).to_be_visible()
    p17_page.screenshot(path=out/'p1-19-current-session-confirmation.png')
    assert not p19_revoke_requests, 'Current session must not be revoked before explicit confirmation'
    p19_cancel = 'إلغاء' if p19_is_arabic else 'Annuler'
    p17_page.get_by_role('button', name=p19_cancel, exact=True).click()
    expect(p17_page.get_by_text(p19_confirmation, exact=True)).to_have_count(0)
    assert p17_context.request.get('/api/auth/me').status == 200

    p19_confirm = 'تأكيد تسجيل الخروج' if p19_is_arabic else 'Confirmer la déconnexion'
    with p17_page.expect_response(
        lambda response: response.request.method == 'POST'
        and response.url.endswith(f'/api/auth/sessions/{p19_current_id}/revoke')
    ) as p19_current_revoke:
        p17_page.get_by_role('button', name=p19_current_revoke_label, exact=True).click()
        p17_page.get_by_role('button', name=p19_confirm, exact=True).click()
    assert p19_current_revoke.value.status == 204
    expect(p17_page.locator('#login-username')).to_be_visible()
    assert p17_context.request.get('/api/auth/me').status == 401
    assert p19_secondary_context.request.get('/api/auth/me').status == 401
    p19_secondary_context.close()
    p19_1_19_evidence = (
        'Real ASP.NET Core + PostgreSQL 18 browser flow in AR/FR and desktop/mobile: self-session inventory '\
        'returned current and separate device sessions without token/hash/SecurityStamp fields; privacy warning '\
        'was visible; revoking the selected other device returned 204 and invalidated its cookie while the '\
        'current session remained active; current-device logout required an explicit confirmation, cancel '\
        'preserved the session, and confirmed revocation returned 204 then /api/auth/me returned 401. '\
        'Automated CI evidence only, not authorized manual Staging acceptance.'
    )


    # P1-20: real-browser checks of the independent project-navigation chrome slice.
    # This fixture uses a fresh synthetic project visible to SYSTEM_ADMIN. It does not
    # select a different project from the switcher, and does not exercise dirty-form
    # navigation or revoked-membership cleanup (those remain dependent on P1-06 manual evidence).
    p20_project_code = f'QA-P1-20-{lang.upper()}-{device.upper()}'
    p20_csrf_response = ctx.request.get('/api/auth/csrf')
    assert p20_csrf_response.status == 200
    p20_csrf_token = p20_csrf_response.headers.get('x-csrf-token')
    assert p20_csrf_token
    p20_project_create = ctx.request.post(
        BASE + '/api/projects',
        data={
            'code': p20_project_code,
            'nameAr': 'مشروع اختبار توحيد التنقل',
            'nameFr': 'Projet QA navigation unifiée',
            'wilayaCode': '16',
            'wilayaName': 'الجزائر / Alger',
            'municipality': 'Dely Ibrahim',
            'address': 'QA fictitious address',
            'landTitleReference': None,
            'buildingPermitNumber': None,
            'buildingPermitDate': None,
            'status': 'Planning',
            'estimatedBudgetDzd': 0,
            'plannedBlocksCount': 1,
            'plannedUnitsCount': 1,
        },
        headers={'X-CSRF-TOKEN': p20_csrf_token},
    )
    assert p20_project_create.status == 201, p20_project_create.text()
    p20_project_id = p20_project_create.json()['id']
    page.goto(BASE + f'/projects/{p20_project_id}/overview')

    p20_identity_label = (
        'شريط هوية المشروع النشط'
        if lang == 'ar'
        else 'Bandeau d’identité du projet actif'
    )
    p20_identity = page.locator(f'section[aria-label="{p20_identity_label}"]')
    expect(p20_identity).to_be_visible()
    expect(p20_identity).to_contain_text(p20_project_code)

    # The persistent global header contains exactly one switcher entry point.
    p20_switcher_button = page.locator('header button').filter(has=page.locator('kbd'))
    expect(p20_switcher_button).to_have_count(1)
    expect(p20_switcher_button).to_be_visible()

    # The active-project section menu is a single sidebar navigation source,
    # not a second horizontal tab strip. On mobile, inspect it inside the drawer.
    if device == 'mobile':
        page.get_by_role('button', name='Open menu', exact=True).click()
    p20_sidebar = page.get_by_role('navigation', name='Main navigation', exact=True)
    expect(p20_sidebar).to_have_count(1)
    expect(p20_sidebar).to_be_visible()
    p20_active_project_label = 'المشروع النشط' if lang == 'ar' else 'Projet actif'
    expect(p20_sidebar.get_by_text(p20_active_project_label, exact=True)).to_be_visible()
    p20_overview_label = 'ملخص المشروع' if lang == 'ar' else 'Synthèse projet'
    expect(p20_sidebar.get_by_role('button', name=p20_overview_label, exact=True)).to_have_count(1)
    expect(page.get_by_role('tablist')).to_have_count(0)
    expect(page.get_by_role('tab')).to_have_count(0)

    # Preserve identity actions (pin and directory) without reintroducing a switcher.
    p20_pin_label = 'تثبيت' if lang == 'ar' else 'Épingler'
    p20_directory_label = 'دليل المشاريع' if lang == 'ar' else 'Annuaire'
    p20_pin_button = p20_identity.get_by_role('button', name=p20_pin_label, exact=True)
    expect(p20_pin_button).to_have_count(1)
    expect(p20_identity.get_by_role('button', name=p20_directory_label, exact=True)).to_have_count(1)
    expect(p20_identity.locator('button').filter(has=page.locator('kbd'))).to_have_count(0)
    page.screenshot(path=out/'p1-20-single-project-navigation-chrome.png')

    if device == 'mobile':
        page.get_by_role('button', name='Close navigation menu', exact=True).click()

    # Pin state must update in the same render after each local preference write.
    p20_unpin_label = 'إلغاء التثبيت' if lang == 'ar' else 'Désépingler'
    p20_pin_button.click()
    p20_unpin_button = p20_identity.get_by_role('button', name=p20_unpin_label, exact=True)
    expect(p20_unpin_button).to_be_visible()
    p20_preferences_after_pin = page.evaluate("""() => Object.keys(localStorage)
      .filter((key) => key.startsWith('promogest.navPrefs.v1.'))
      .map((key) => JSON.parse(localStorage.getItem(key) || '{}'))""")
    assert any(p20_project_id in prefs.get('pinnedProjectIds', []) for prefs in p20_preferences_after_pin), (
        'Pin action did not persist the project id'
    )
    p20_unpin_button.click()
    expect(p20_identity.get_by_role('button', name=p20_pin_label, exact=True)).to_be_visible()
    p20_preferences_after_unpin = page.evaluate("""() => Object.keys(localStorage)
      .filter((key) => key.startsWith('promogest.navPrefs.v1.'))
      .map((key) => JSON.parse(localStorage.getItem(key) || '{}'))""")
    assert all(p20_project_id not in prefs.get('pinnedProjectIds', []) for prefs in p20_preferences_after_unpin), (
        'Unpin action did not remove the project id from persisted preferences'
    )

    # Opening the modal is a UI-only inspection. Search focus, authorized project presence,
    # Escape close, and restored focus are checked before the explicit selection regression below.
    p20_switcher_button.click()
    p20_dialog_title = (
        'مبدّل المشروع الصريح'
        if lang == 'ar'
        else 'Sélecteur explicite de projet'
    )
    p20_dialog = page.get_by_role('dialog')
    expect(p20_dialog).to_be_visible()
    expect(p20_dialog.get_by_role('heading', name=p20_dialog_title, exact=True)).to_be_visible()
    p20_search = p20_dialog.get_by_role('searchbox')
    expect(p20_search).to_be_focused()
    expect(p20_dialog.get_by_text('تعرض هذه القائمة المشاريع المصرح لك بها من الخادم فقط.' if lang == 'ar' else 'Seuls les projets autorisés par le serveur sont affichés ici.', exact=True)).to_be_visible()
    expect(p20_dialog.get_by_text(p20_project_code, exact=True).first).to_be_visible()
    page.screenshot(path=out/'p1-20-single-project-switcher-modal.png')
    p20_search.press('Escape')
    expect(p20_dialog).to_have_count(0)
    expect(p20_switcher_button).to_be_focused()
    assert page.url.endswith(f'/projects/{p20_project_id}/overview')

    # The initial deep-link verification has already recorded this project; clear only
    # the recent list so the subsequent directory selection proves its own persistence path.
    page.evaluate("""() => Object.keys(localStorage)
      .filter((key) => key.startsWith('promogest.navPrefs.v1.'))
      .forEach((key) => {
        const prefs = JSON.parse(localStorage.getItem(key) || '{}');
        prefs.recentProjectIds = [];
        localStorage.setItem(key, JSON.stringify(prefs));
      })""")

    # The identity strip's directory affordance remains a separate browse destination.
    p20_identity.get_by_role('button', name=p20_directory_label, exact=True).click()
    expect(page).to_have_url(BASE + '/projects')
    p20_directory_title = (
        'المشاريع العقارية والتحكم في الوصول'
        if lang == 'ar'
        else "Projets immobiliers & Contrôle d'accès"
    )
    expect(page.get_by_role('heading', name=p20_directory_title, exact=True)).to_be_visible()
    expect(page.locator('header button').filter(has=page.locator('kbd'))).to_have_count(1)
    page.screenshot(path=out/'p1-20-project-directory-destination.png')

    # The global switcher remains available in the organization/project-directory workspace too.
    page.locator('header button').filter(has=page.locator('kbd')).click()
    p20_directory_dialog = page.get_by_role('dialog')
    expect(p20_directory_dialog.get_by_text(p20_project_code, exact=True)).to_be_visible()
    p20_browse_label = 'تصفح دليل المشاريع' if lang == 'ar' else 'Parcourir l’annuaire'
    p20_directory_dialog.get_by_role('button', name=p20_browse_label, exact=True).click()
    expect(p20_directory_dialog).to_have_count(0)
    expect(page).to_have_url(BASE + '/projects')

    # Selecting an authorized project from the directory must persist it as recent.
    page.locator('header button').filter(has=page.locator('kbd')).click()
    p20_select_dialog = page.get_by_role('dialog')
    p20_project_row = p20_select_dialog.get_by_role('button').filter(has_text=p20_project_code)
    expect(p20_project_row).to_be_visible()
    p20_project_row.click()
    expect(p20_select_dialog).to_have_count(0)
    expect(page).to_have_url(BASE + f'/projects/{p20_project_id}/overview')
    expect(p20_identity).to_contain_text(p20_project_code)
    p20_saved_preferences = page.evaluate("""() => Object.keys(localStorage)
      .filter((key) => key.startsWith('promogest.navPrefs.v1.'))
      .map((key) => JSON.parse(localStorage.getItem(key) || '{}'))""")
    assert any(p20_project_id in prefs.get('recentProjectIds', []) for prefs in p20_saved_preferences), (
        'Selecting a project did not persist it in recentProjectIds'
    )

    p20_1_20_evidence = (
        'Real ASP.NET Core + PostgreSQL 18 Chrome browser structural checks in AR/FR × desktop/mobile: '
        'exactly one global header switcher; one Main navigation source with one project overview entry; '
        'no tablist/tab role or duplicate horizontal section tabs; project identity strip retained Pin and '
        'Project Directory actions without a duplicate switcher; switcher modal showed the synthetic '
        'authorized project, focused the searchbox, closed with Escape and restored focus; pin/unpin '
        'updated immediately; selecting the authorized project from the directory persisted its id in '
        'recentProjectIds. Dirty-form navigation, revoked-membership cleanup and end-to-end authorization '
        'outcomes were deliberately not exercised; '
        'those remain provisional/dependent on P1-06 manual evidence. Automated CI evidence only.'
    )

    # P1-06: Back/Forward must preserve the history stack while a real form is dirty.
    p06_original_org = ctx.request.get('/api/auth/me').json()['organization']
    p06_original_legal_name = p06_original_org['legalName']
    p06_page = ctx.new_page()
    p06_page.goto(BASE)
    p06_navigation = p06_page.get_by_role('navigation', name='Main navigation')
    p06_profile_label = 'ملف المؤسسة' if lang == 'ar' else 'Profil Organisation'
    p06_projects_label = 'دليل المشاريع' if lang == 'ar' else 'Annuaire des Projets'
    p06_edit_label = 'تعديل ملف المؤسسة' if lang == 'ar' else 'Modifier le profil de l’organisation'
    p06_stay_label = 'البقاء هنا' if lang == 'ar' else 'Rester ici'
    p06_discard_label = 'تجاهل التغييرات والمتابعة' if lang == 'ar' else 'Abandonner et continuer'
    p06_save_label = 'حفظ والمتابعة' if lang == 'ar' else 'Enregistrer et continuer'
    if device == 'mobile':
        p06_page.get_by_role('button', name='Open menu', exact=True).click()
    p06_navigation.get_by_role('button', name=p06_profile_label, exact=True).click()
    expect(p06_page).to_have_url(BASE + '/organization/profile')
    if device == 'mobile':
        p06_page.get_by_role('button', name='Open menu', exact=True).click()
    p06_navigation.get_by_role('button', name=p06_projects_label, exact=True).click()
    expect(p06_page).to_have_url(BASE + '/projects')

    # Build a forward entry, return to the profile cleanly, then dirty it.
    p06_page.go_back()
    expect(p06_page).to_have_url(BASE + '/organization/profile')
    p06_page.get_by_role('button', name=p06_edit_label, exact=True).click()
    p06_forward_draft = f'{p06_original_legal_name} - P1-06 Forward {lang.upper()} {device.upper()}'
    p06_page.locator('#organization-legalName').fill(p06_forward_draft)

    # First Forward is blocked; Stay must keep the draft AND preserve the forward entry.
    p06_page.go_forward()
    p06_dialog = p06_page.get_by_role('dialog')
    expect(p06_dialog).to_be_visible()
    expect(p06_page).to_have_url(BASE + '/organization/profile')
    expect(p06_page.locator('#organization-legalName')).to_have_value(p06_forward_draft)
    p06_dialog.get_by_role('button', name=p06_stay_label, exact=True).click()
    expect(p06_dialog).to_have_count(0)
    expect(p06_page).to_have_url(BASE + '/organization/profile')
    p06_page.go_forward()
    expect(p06_dialog).to_be_visible()
    p06_dialog.get_by_role('button', name=p06_discard_label, exact=True).click()
    expect(p06_page).to_have_url(BASE + '/projects')
    assert ctx.request.get('/api/auth/me').json()['organization']['legalName'] == p06_original_legal_name, (
        'Discarding a dirty Forward navigation persisted the organization draft'
    )

    # Back is guarded independently; Save & Continue must commit the draft before moving back.
    p06_page.go_back()
    expect(p06_page).to_have_url(BASE + '/organization/profile')
    p06_page.get_by_role('button', name=p06_edit_label, exact=True).click()
    p06_back_save_draft = f'{p06_original_legal_name} - P1-06 Back Save {lang.upper()} {device.upper()}'
    p06_page.locator('#organization-legalName').fill(p06_back_save_draft)
    p06_page.go_back()
    expect(p06_dialog).to_be_visible()
    expect(p06_page).to_have_url(BASE + '/organization/profile')
    p06_dialog.get_by_role('button', name=p06_save_label, exact=True).click()
    expect(p06_page).to_have_url(BASE + '/')
    assert ctx.request.get('/api/auth/me').json()['organization']['legalName'] == p06_back_save_draft, (
        'Save & Continue did not persist the dirty Back-navigation draft'
    )

    # Restore the disposable CI organization fixture for subsequent checks.
    p06_restore_csrf = ctx.request.get('/api/auth/csrf')
    assert p06_restore_csrf.status == 200
    p06_restore_token = p06_restore_csrf.headers.get('x-csrf-token')
    assert p06_restore_token
    p06_current_org = ctx.request.get('/api/auth/me').json()['organization']
    p06_restore = ctx.request.put(
        BASE + '/api/organization',
        data=organization_update_payload(p06_current_org, p06_original_legal_name),
        headers={'X-CSRF-TOKEN': p06_restore_token},
    )
    assert p06_restore.status == 200, p06_restore.text()
    p06_page.screenshot(path=out/'p1-06-browser-history-guard.png')
    p06_page.close()
    p06_evidence = (
        'Real ASP.NET Core + PostgreSQL 18 browser flow in AR/FR desktop/mobile: dirty Forward navigation '
        'restored the current route without truncating the forward entry; Stay preserved the draft and a '
        'second Forward remained guardable; Discard navigated without persisting; dirty Back navigation '
        'offered Save & Continue and persisted before returning to the prior route. Automated CI evidence only.'
    )

    p17_fresh_context.close()
    employee_ctx.close()
    replay_ctx.close()
    if device == 'mobile':
        page.get_by_role('button', name='Open menu', exact=True).click()
    logout = page.get_by_role('button', name='تسجيل الخروج' if lang == 'ar' else 'Déconnexion', exact=True)
    page.route('**/api/auth/logout', lambda route: route.abort('internetdisconnected'))
    logout.click()
    if device == 'mobile' and page.get_by_role('button', name='Close navigation menu').is_visible():
        page.get_by_role('button', name='Close navigation menu').click()
    retry = page.get_by_role('button', name='إعادة المحاولة' if lang == 'ar' else 'Réessayer', exact=True)
    expect(retry).to_be_visible()
    expect(page.get_by_text('تعذّر تأكيد تسجيل الخروج' if lang == 'ar' else 'pas confirmé la déconnexion', exact=False)).to_be_visible()
    expect(page.locator('#login-username')).to_have_count(0)
    assert ctx.request.get('/api/auth/me').status == 200
    page.screenshot(path=out/'02-retry.png')
    page.unroute('**/api/auth/logout')
    with page.expect_response('**/api/auth/logout') as result:
        retry.click()
    assert result.value.status == 204
    expect(page.locator('#login-username')).to_be_visible()
    assert ctx.request.get('/api/auth/me').status == 401
    assert previous.get('/api/auth/me').status == 401
    page.goto(BASE + '/admin/users')
    page.reload()
    expect(page.locator('#login-username')).to_be_visible()
    page.screenshot(path=out/'03-protected-route.png')
    assert not errors, 'Browser reported an uncaught application error'
    evidence = dict(profile=device, language=lang, viewport=viewport, browser=browser.version,
                    commit=os.environ['GITHUB_SHA'], run=os.environ['GITHUB_RUN_ID'],
                    A01='201; anonymous login handoff; duplicate 409; counts org/user/admin-role 1/1/1; explicit login 200',
                    A04='unconfirmed logout retained session; retry 204; current and prior session 401; protected route returned to login',
                    A05=a05_evidence,
                    P1_09=p1_09_evidence,
                    P1_15=p1_15_evidence,
                    P1_17=p17_1_17_evidence,
                    P1_19=p19_1_19_evidence,
                    P1_20=p20_1_20_evidence,
                    mode='automated real-browser; not manual acceptance')
    (out/'result.json').write_text(json.dumps(evidence, indent=2)+'\n')
    print(json.dumps(evidence))
    previous.dispose()
    browser.close()
