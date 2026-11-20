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

    evidence.update({
        'A05': 'temporary session sanitized; deep-link reload served SPA; business API 403 PASSWORD_CHANGE_REQUIRED; rotation 204; old cookie replay 401; personal password login 200',
    })
    (out/'result.json').write_text(json.dumps(evidence, indent=2) + '\n')
    employee_ctx.close()
    replay_ctx.dispose()
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
                    mode='automated real-browser; not manual acceptance')
    (out/'result.json').write_text(json.dumps(evidence, indent=2)+'\n')
    print(json.dumps(evidence))
    previous.dispose()
    browser.close()
