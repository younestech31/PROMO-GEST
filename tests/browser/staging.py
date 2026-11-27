"""Developer-led disposable Production/HTTPS acceptance; not an on-premises signature."""
import hashlib
import json
import os
import secrets
import subprocess
import sys
import traceback
from pathlib import Path

from playwright.sync_api import expect, sync_playwright
from project_budget import mutation, run_project_budget
from organization_permissions import run_organization_permissions
from session_security import prepare_sessions, run_session_security
from language_preferences import prepare_language, verify_language
from project_team import run_project_team

BASE = 'https://staging.promogest.test:8443'
CONTENT = b'PROMO GEST synthetic staging document. No personal or business data.\n'


def organization_payload(org, name):
    keys = ('tradeName', 'legalForm', 'nif', 'nis', 'tradeRegisterNumber', 'taxArticleNumber',
            'shareCapitalDzd', 'wilayaCode', 'wilayaName', 'address', 'phone', 'email', 'defaultLanguage')
    return {**{key: org.get(key) for key in keys}, 'legalName': name,
            'expectedConcurrencyStamp': org['concurrencyStamp']}


def run(lang, device, phase):
    if (os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('PGHOST') != '127.0.0.1'
            or os.environ.get('PGDATABASE') != f'stg_{lang}_{device}'
            or os.environ.get('STAGING_BASE_URL') != BASE
            or lang not in ('ar', 'fr') or device not in ('desktop', 'mobile')
            or phase not in ('exercise', 'verify')):
        raise RuntimeError('Only the disposable Production HTTPS CI fixture is allowed')
    profile = f'{lang}-{device}'
    out = Path(os.environ['STAGING_EVIDENCE_DIR']) / profile
    out.mkdir(parents=True, exist_ok=True)
    private = Path(os.environ['STAGING_PRIVATE_DIR']) / profile
    state_path = private / 'browser-state.json'
    fixture_path = private / 'fixture.json'
    result_path = out / 'result.json'
    viewport = dict(width=390, height=844) if device == 'mobile' else dict(width=1440, height=900)
    result = json.loads(result_path.read_text()) if phase == 'verify' else {
        'profile': profile, 'sourceHead': os.environ['STAGING_SOURCE_SHA'],
        'testedCheckout': os.environ['GITHUB_SHA'], 'run': os.environ['GITHUB_RUN_ID'],
        'environment': 'Production', 'database': 'PostgreSQL 18 (disposable)',
        'proxy': os.environ['STAGING_PROXY_VERSION'], 'viewport': viewport, 'checks': {},
        'tlsBoundary': 'curl validates local CA; browser ignores trust for the disposable CA only',
        'scope': 'developer-led isolated Linux HTTPS staging rehearsal; not on-premises acceptance',
    }
    checks = result['checks']
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome')
        # Transport remains HTTPS; no browser/OS trust-distribution acceptance is claimed.
        ctx = browser.new_context(base_url=BASE, viewport=viewport, ignore_https_errors=True,
                                  storage_state=str(state_path) if phase == 'verify' else None)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda _: errors.append(True))
        response = ctx.request.get('/api/setup/status')
        assert response.status == 200
        assert response.headers['strict-transport-security'] == 'max-age=86400'
        assert response.headers['x-content-type-options'] == 'nosniff'
        assert "object-src 'none'" in response.headers['content-security-policy']
        assert 'no-store' in response.headers['cache-control']
        checks['https_proxy_hsts_csp_nosniff_no_store'] = True
        assert ctx.request.get('/api/auth/preview-session').status == 404
        checks['development_preview_endpoint_absent'] = True
        if phase == 'exercise':
            assert response.json()['isInitialized'] is False
            assert response.json()['requiresBootstrapToken'] is True
            password = 'Qa9!' + secrets.token_urlsafe(18)
            org_name = f'QA HTTPS Staging {profile}'
            setup = {
                'legalName': org_name, 'tradeName': None, 'legalForm': 'SARL',
                'wilayaCode': '16', 'wilayaName': 'الجزائر / Alger',
                'address': 'Synthetic staging address', 'defaultLanguage': lang,
                'adminUsername': 'staging.admin', 'adminFullName': 'QA Staging Administrator',
                'adminEmail': 'staging@example.invalid', 'adminPassword': password,
            }
            no_token = mutation(ctx.request, 'post', '/api/setup/initialize', setup)
            assert no_token.status == 403 and no_token.json()['code'] == 'SETUP_BOOTSTRAP_FORBIDDEN'
            checks['bootstrap_required_without_token_403'] = True
            page.goto(BASE)
            page.get_by_role('button', name='العربية' if lang == 'ar' else 'Français', exact=True).click()
            page.locator('#setup-defaultLang').select_option(lang)
            for key, value in {
                'legalName': org_name, 'address': setup['address'], 'adminUsername': setup['adminUsername'],
                'adminFullName': setup['adminFullName'], 'adminEmail': setup['adminEmail'],
                'adminPassword': password, 'confirmPassword': password,
                'bootstrapToken': os.environ['PROMOGEST_SETUP_TOKEN'],
            }.items():
                page.locator('#setup-' + key).fill(value)
            with page.expect_response('**/api/setup/initialize') as initialized:
                page.locator('button[type=submit]').click()
            assert initialized.value.status == 201
            expect(page.locator('#login-username')).to_be_visible()
            assert ctx.request.get('/api/auth/me').status == 401
            csrf = ctx.request.get('/api/auth/csrf').headers['x-csrf-token']
            duplicate = ctx.request.post('/api/setup/initialize', data=setup, headers={
                'X-CSRF-TOKEN': csrf, 'X-PROMOGEST-SETUP-TOKEN': os.environ['PROMOGEST_SETUP_TOKEN'],
            })
            assert duplicate.status == 409 and duplicate.json()['code'] == 'SETUP_ALREADY_INITIALIZED'
            checks['wizard_201_anonymous_handoff_duplicate_409'] = True
            page.screenshot(path=out/'01-login-handoff.png')
            page.locator('#login-username').fill(setup['adminUsername'])
            page.locator('#login-password').fill(password)
            with page.expect_response('**/api/auth/login') as login:
                page.locator('button[type=submit]').click()
            assert login.value.status == 200
            cookie = next(cookie for cookie in ctx.cookies(BASE) if cookie['name'] == '__Host-promogest_session')
            assert cookie['secure'] and cookie['httpOnly'] and cookie['path'] == '/'
            assert cookie['sameSite'] == 'Strict'
            assert not any(c['name'] == 'promogest_session' for c in ctx.cookies(BASE))
            checks['production_host_cookie_secure_httponly_strict'] = True
            # Real browser profile editing over the proxy, not a direct database fixture.
            page.goto(BASE + '/organization/profile')
            edit = 'تعديل ملف المؤسسة' if lang == 'ar' else 'Modifier le profil de l’organisation'
            page.get_by_role('button', name=edit, exact=True).click()
            saved_name = f'QA persisted HTTPS {profile}'
            page.locator('#organization-legalName').fill(saved_name)
            with page.expect_response('**/api/organization') as saved:
                page.get_by_role('button', name='حفظ التغييرات' if lang == 'ar'
                                 else 'Enregistrer les modifications', exact=True).click()
            assert saved.value.status == 200
            expect(page.get_by_role('status')).to_be_visible()
            assert ctx.request.get('/api/auth/me').json()['organization']['legalName'] == saved_name
            page.screenshot(path=out/'02-profile-saved.png')
            checks['organization_edit_saved_through_https_spa'] = True
            org = ctx.request.get('/api/auth/me').json()['organization']
            no_csrf = ctx.request.put('/api/organization', data=organization_payload(org, 'must not persist'))
            assert no_csrf.status == 403 and no_csrf.json()['code'] == 'CSRF_TOKEN_INVALID'
            checks['authenticated_write_without_csrf_403'] = True
            project_response = mutation(ctx.request, 'post', '/api/projects', {
                'code': f'STG-{lang.upper()}-{device.upper()}', 'nameAr': 'مشروع تجريبي معزول',
                'nameFr': 'Projet de staging isolé', 'wilayaCode': '16', 'wilayaName': 'الجزائر / Alger',
                'municipality': 'Dely Ibrahim', 'address': 'Synthetic staging address',
                'status': 'Planning', 'estimatedBudgetDzd': 0, 'plannedBlocksCount': 1, 'plannedUnitsCount': 1,
            })
            assert project_response.status == 201
            project_id = project_response.json()['id']
            assert project_response.json()['estimatedBudgetDzd'] is None
            page.goto(BASE + f'/projects/{project_id}/documents')
            page.locator('#project-document-file').set_input_files({
                'name': 'staging-proof.txt', 'mimeType': 'text/plain', 'buffer': CONTENT,
            })
            with page.expect_response(lambda r: r.request.method == 'POST'
                                      and r.url.endswith(f'/api/projects/{project_id}/documents')) as uploaded:
                page.get_by_role('button', name='رفع الوثيقة' if lang == 'ar' else 'Téléverser', exact=True).click()
            assert uploaded.value.status == 201
            file_id = uploaded.value.json()['id']
            page.locator('#project-document-file').wait_for()
            expect(page.get_by_text('staging-proof.txt', exact=True)).to_be_visible()
            page.screenshot(path=out/'03-document-uploaded.png')
            checks['document_uploaded_through_https_spa'] = True
            fixture_path.write_text(json.dumps({'organization': saved_name, 'projectId': project_id, 'fileId': file_id}))
            fixture_path.chmod(0o600)
            # The session preparer needs the same encryption proof as verify-phase helpers.
            # Assert actual persisted keys now; do not merely set the guard flag early.
            keys = list((private / 'keys').glob('*.xml'))
            assert keys and all('encryptedSecret' in key.read_text() for key in keys)
            os.environ['STAGING_DP_ENCRYPTED'] = 'true'
            prepare_sessions(browser, BASE, lang, device, viewport, private, setup['adminUsername'], password)
            prepare_language(browser, ctx, BASE, lang, device, viewport, private, out,
                             setup['adminUsername'], password)
            ctx.storage_state(path=str(state_path))
            state_path.chmod(0o600)
        else:
            fixture = json.loads(fixture_path.read_text())
            assert response.json()['isInitialized'] is True
            me = ctx.request.get('/api/auth/me')
            assert me.status == 200
            assert me.json()['organization']['legalName'] == fixture['organization']
            checks['session_and_organization_survive_api_restart'] = True
            project_id, file_id = fixture['projectId'], fixture['fileId']
            documents_url = f'/api/projects/{project_id}/documents'
            downloaded = ctx.request.get(documents_url + f'/{file_id}/download')
            assert downloaded.status == 200 and downloaded.body() == CONTENT
            assert 'no-store' in downloaded.headers['cache-control']
            checks['stored_document_bytes_survive_restart_sha256'] = True
            result['syntheticDocumentSha256'] = hashlib.sha256(CONTENT).hexdigest()
            anonymous = pw.request.new_context(base_url=BASE, ignore_https_errors=True)
            assert anonymous.get(documents_url).status == 401
            assert anonymous.get(documents_url + f'/{file_id}/download').status == 401
            anonymous.dispose()
            checks['anonymous_document_access_401'] = True
            counts = subprocess.check_output(['psql', '-XAtqc',
                "SELECT (SELECT count(*) FROM organization_settings), (SELECT count(*) FROM users), "
                "(SELECT count(*) FROM user_roles u JOIN roles r ON r.id=u.role_id WHERE r.code='SYSTEM_ADMIN')"],
                text=True).strip()
            assert counts == '1|1|1'
            checks['one_organization_user_administrator_after_restart'] = True
            assert os.environ.get('STAGING_DP_ENCRYPTED') == 'true'
            checks['persisted_data_protection_keys_encrypted'] = True
            verify_language(browser, ctx, BASE, lang, device, viewport, private, out)
            page.goto(BASE + f'/projects/{project_id}/documents')
            expect(page.get_by_text('staging-proof.txt', exact=True)).to_be_visible()
            expect(page.locator('html')).to_have_attribute('dir', 'rtl' if lang == 'ar' else 'ltr')
            page.screenshot(path=out/'04-document-after-restart.png')
            page.goto(BASE + '/organization/profile')
            expect(page.get_by_role('main').get_by_text(fixture['organization'], exact=True)).to_be_visible()
            page.screenshot(path=out/'05-profile-after-restart.png')
            result['budgetEvidence'] = run_project_budget(
                browser, ctx, BASE, lang, device, viewport, out, fixture='staging')
            checks['production_budget_authorization_matrix'] = True
            run_organization_permissions(browser, ctx, BASE, lang, device, viewport, out)
            run_project_team(browser, ctx, BASE, lang, device, viewport, out)
            run_session_security(browser, ctx, BASE, lang, device, viewport, private, out)
            if device == 'mobile':
                page.get_by_role('button', name='Open menu', exact=True).click()
            with page.expect_response('**/api/auth/logout') as logout:
                page.get_by_role('button', name='تسجيل الخروج' if lang == 'ar' else 'Déconnexion', exact=True).click()
            assert logout.value.status == 204
            expect(page.locator('#login-username')).to_be_visible()
            assert ctx.request.get('/api/auth/me').status == 401
            replay = pw.request.new_context(base_url=BASE, ignore_https_errors=True, storage_state=str(state_path))
            assert replay.get('/api/auth/me').status == 401
            replay.dispose()
            checks['logout_revokes_current_and_pre_restart_session'] = True
            result['status'] = 'PASS'
        assert not errors
        result['browser'] = browser.version
        result_path.write_text(json.dumps(result, indent=2) + '\n')
        browser.close()


if __name__ == '__main__':
    try:
        run(*sys.argv[1:])
    except Exception as error:
        # Static locations only: exception messages/call logs may include filled form secrets.
        for frame in traceback.extract_tb(error.__traceback__):
            filename = Path(frame.filename).name
            if filename in ('staging.py', 'organization_permissions.py', 'session_security.py', 'language_preferences.py', 'project_team.py'):
                print(f'::error file=tests/browser/{filename},line={frame.lineno}::'
                      f'Staging {type(error).__name__} in {frame.name}', flush=True)
        sys.exit(1)
