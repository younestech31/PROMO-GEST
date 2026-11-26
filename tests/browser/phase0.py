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
                    mode='automated real-browser; not manual acceptance')
    (out/'result.json').write_text(json.dumps(evidence, indent=2)+'\n')
    print(json.dumps(evidence))
    previous.dispose()
    browser.close()
