"""P1-05 / ADR-0011: real SPA + API budget boundaries on disposable CI databases.

Called by phase0.py for every AR/FR desktop/mobile profile. No SQL grants, mocks,
production targets, response dumps, passwords or cookies in evidence artifacts.
"""
import os
import secrets
import traceback

def mutation(request, method, url, payload):
    csrf = request.get('/api/auth/csrf')
    assert csrf.status == 200
    token = csrf.headers.get('x-csrf-token')
    assert token
    return getattr(request, method)(url, data=payload, headers={'X-CSRF-TOKEN': token})


def update_payload(project, budget):
    keys = (
        'nameAr', 'nameFr', 'wilayaCode', 'wilayaName', 'municipality', 'address',
        'landTitleReference', 'buildingPermitNumber', 'buildingPermitDate', 'status',
        'plannedBlocksCount', 'plannedUnitsCount',
    )
    return {
        **{key: project.get(key) for key in keys},
        'estimatedBudgetDzd': budget,
        'expectedConcurrencyStamp': project['concurrencyStamp'],
    }


def require_budget_fixture(base, lang, device, fixture):
    phase0 = (fixture == 'phase0' and base == 'http://127.0.0.1:5173'
              and os.environ.get('PGDATABASE') == f'p0_{lang}_{device}')
    staging = (fixture == 'staging' and base == 'https://staging.promogest.test:8443'
               and os.environ.get('STAGING_BASE_URL') == base
               and os.environ.get('STAGING_DP_ENCRYPTED') == 'true'
               and os.environ.get('PGDATABASE') == f'stg_{lang}_{device}')
    if (os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('PGHOST') != '127.0.0.1'
            or lang not in ('ar', 'fr') or device not in ('desktop', 'mobile')
            or not (phase0 or staging)):
        raise RuntimeError('P1-05 requires the disposable four-profile CI fixture')


def run_project_budget(browser, admin_ctx, base, lang, device, viewport, out, *, fixture='phase0'):
    # Two explicit runner-local fixtures only; never accept arbitrary staging/preview targets.
    require_budget_fixture(base, lang, device, fixture)

    from playwright.sync_api import expect

    contexts = []
    errors = []
    api = admin_ctx.request
    save = 'حفظ' if lang == 'ar' else 'Enregistrer'
    code = f'QA-P1-05-{lang.upper()}-{device.upper()}'
    amount = 12345678.5
    updated_amount = 23456789.75

    def create_actor(suffix, role):
        username = f'qa.budget.{suffix}'
        temporary = 'Tmp9!' + secrets.token_urlsafe(16)
        personal = 'New9!' + secrets.token_urlsafe(16)
        response = mutation(api, 'post', '/api/users', {
            'username': username, 'fullName': f'QA Budget {suffix}',
            'email': f'{username}@example.invalid', 'phone': None,
            'password': temporary, 'preferredLanguage': lang, 'roleCodes': [role],
        })
        assert response.status == 201
        user_id = response.json()['id']
        context = browser.new_context(base_url=base, viewport=viewport, ignore_https_errors=fixture == 'staging')
        contexts.append(context)
        login = mutation(context.request, 'post', '/api/auth/login', {
            'usernameOrEmail': username, 'password': temporary,
        })
        assert login.status == 200
        assert login.json()['user']['mustChangePasswordAtNextLogin'] is True
        rotation = mutation(context.request, 'post', '/api/auth/change-password', {
            'currentPassword': temporary, 'newPassword': personal,
        })
        assert rotation.status == 204
        actor_page = context.new_page()
        actor_page.on('pageerror', lambda _: errors.append(True))
        actor_page.goto(base)
        actor_page.locator('#login-username').fill(username)
        actor_page.locator('#login-password').fill(personal)
        with actor_page.expect_response('**/api/auth/login') as authenticated:
            actor_page.locator('button[type=submit]').click()
        assert authenticated.value.status == 200
        assert authenticated.value.json()['user']['mustChangePasswordAtNextLogin'] is False
        expect(actor_page.locator('#login-username')).to_have_count(0)
        return context, actor_page, user_id

    def get_project(request):
        response = request.get(project_url)
        assert response.status == 200
        return response.json()

    def assert_collections(request, expected_budget):
        response = request.get('/api/projects', params={'q': code})
        assert response.status == 200
        projects = response.json()
        assert len(projects) == 1 and projects[0]['id'] == project_id
        assert projects[0]['estimatedBudgetDzd'] == expected_budget
        directory = request.get('/api/projects/directory', params={'q': code, 'page': 1, 'pageSize': 1})
        assert directory.status == 200
        result = directory.json()
        assert result['totalCount'] == 1 and len(result['items']) == 1
        assert result['items'][0]['id'] == project_id
        assert result['items'][0]['estimatedBudgetDzd'] == expected_budget

    def assert_directory(actor_page, expected_budget):
        actor_page.goto(base + '/projects')
        if device == 'mobile':
            card = actor_page.get_by_role('article', name=code, exact=True)
            expect(card).to_have_count(1)
            budget_cell = card.locator('dd')
        else:
            row = actor_page.get_by_role('row').filter(has_text=code)
            expect(row).to_have_count(1)
            budget_cell = row.get_by_role('cell').nth(4)
        budget_cell.scroll_into_view_if_needed()
        expect(budget_cell).to_be_visible()
        if expected_budget is None:
            expect(budget_cell).to_have_text('—')
        else:
            formatted = actor_page.evaluate("""({amount, lang}) =>
              new Intl.NumberFormat(lang === 'ar' ? 'ar-DZ-u-nu-latn' : 'fr-DZ',
                {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount)
              + (lang === 'ar' ? ' دج' : ' DZD')""", {'amount': expected_budget, 'lang': lang})
            expect(budget_cell).to_have_text(formatted)
        expect(actor_page.locator('html')).to_have_attribute('dir', 'rtl' if lang == 'ar' else 'ltr')

    def assert_redacted_overview(actor_page):
        actor_page.goto(base + project_url.replace('/api', '', 1) + '/overview')
        notice = ('محجوب — صلاحية الاطلاع المالي غير مفعّلة.' if lang == 'ar'
                  else 'Masqué — droit financier requis sur le projet.')
        expect(actor_page.get_by_text(notice, exact=True)).to_be_visible()
        card = actor_page.get_by_text(notice, exact=True).locator('..')
        expect(card).to_contain_text('—')

    def assign(user_id, role, financial):
        response = mutation(api, 'put', project_url + '/members', {
            'userId': user_id, 'roleInProject': role, 'canViewFinancials': financial,
            'canManageSales': False, 'canManageConstruction': False, 'canManageDocuments': False,
        })
        assert response.status == 200
        return response.json()

    try:
        director_ctx, director_page, director_id = create_actor('director', 'PROJECT_DIRECTOR')
        finance_ctx, finance_page, finance_id = create_actor('finance', 'FINANCE_OFFICER')
        project_data = {
            'code': code, 'nameAr': 'مشروع اختبار سرية الميزانية',
            'nameFr': 'Projet QA confidentialité du budget', 'wilayaCode': '16',
            'wilayaName': 'الجزائر / Alger', 'municipality': 'Dely Ibrahim',
            'address': 'QA fictitious address', 'landTitleReference': None,
            'buildingPermitNumber': None, 'buildingPermitDate': None,
            'status': 'Planning', 'estimatedBudgetDzd': amount,
            'plannedBlocksCount': 1, 'plannedUnitsCount': 1,
        }
        # SYSTEM_ADMIN is not an implicit financial member, even at creation.
        refused_create = mutation(api, 'post', '/api/projects', project_data)
        assert refused_create.status == 403
        assert refused_create.json()['code'] == 'PROJECT_FINANCIAL_ACCESS_DENIED'
        created = mutation(director_ctx.request, 'post', '/api/projects', project_data)
        assert created.status == 201
        project = created.json()
        assert project['estimatedBudgetDzd'] == amount
        project_id = project['id']
        project_url = f'/api/projects/{project_id}'
        settings_url = base + f'/projects/{project_id}/settings'
        assert any(member['userId'] == director_id and member['roleInProject'] == 'ProjectManager'
                   and member['canViewFinancials'] for member in project['members'])

        # API redaction must hold for detail, legacy switcher list and paged directory.
        assert get_project(api)['estimatedBudgetDzd'] is None
        assert_collections(api, None)
        admin_page = admin_ctx.new_page()
        admin_page.on('pageerror', lambda _: errors.append(True))
        try:
            assert_directory(admin_page, None)
            admin_page.screenshot(path=out/'p1-05-admin-directory-redacted.png')
            assert_redacted_overview(admin_page)
            admin_page.screenshot(path=out/'p1-05-admin-overview-redacted.png')
            admin_page.goto(settings_url)
            expect(admin_page.locator('#ws-name-fr')).to_be_enabled()
            expect(admin_page.locator('#ws-budget')).to_have_count(0)
            tamper = mutation(api, 'put', project_url, update_payload(get_project(api), 0))
            assert tamper.status == 403
            assert tamper.json()['code'] == 'PROJECT_FINANCIAL_ACCESS_DENIED'
        finally:
            admin_page.close()

        # Before membership, a global finance role cannot discover this project.
        inaccessible = finance_ctx.request.get(project_url)
        assert inaccessible.status == 403
        assert inaccessible.json()['code'] == 'PROJECT_ACCESS_DENIED'
        outsider_list = finance_ctx.request.get('/api/projects', params={'q': code})
        assert outsider_list.status == 200 and outsider_list.json() == []
        outsider_directory = finance_ctx.request.get('/api/projects/directory', params={'q': code})
        assert outsider_directory.status == 200
        assert outsider_directory.json()['totalCount'] == 0
        assert outsider_directory.json()['items'] == []

        # An explicitly authorized manager can edit the decimal amount in the real SPA.
        assert_collections(director_ctx.request, amount)
        assert_directory(director_page, amount)
        director_page.goto(settings_url)
        expect(director_page.locator('#ws-budget')).to_have_value(str(amount))
        director_page.locator('#ws-budget').fill(str(updated_amount))
        with director_page.expect_response(
            lambda response: response.request.method == 'PUT' and response.url.endswith(project_url)
        ) as saved:
            director_page.get_by_role('button', name=save, exact=True).click()
        assert saved.value.status == 200
        assert saved.value.request.post_data_json['estimatedBudgetDzd'] == updated_amount
        assert saved.value.json()['estimatedBudgetDzd'] == updated_amount
        expect(director_page.get_by_role('status')).to_contain_text(
            'تم حفظ إعدادات المشروع بنجاح.' if lang == 'ar'
            else 'Les paramètres du projet ont été enregistrés.')
        director_page.reload()
        expect(director_page.locator('#ws-budget')).to_have_value(str(updated_amount))
        director_page.screenshot(path=out/'p1-05-authorized-manager-budget-saved.png')

        # Removing only the financial flag must redact data without blocking general edits.
        assert assign(director_id, 'ProjectManager', False)['estimatedBudgetDzd'] is None
        assert get_project(director_ctx.request)['estimatedBudgetDzd'] is None
        assert_collections(director_ctx.request, None)
        assert_directory(director_page, None)
        assert_redacted_overview(director_page)
        director_page.goto(settings_url)
        expect(director_page.locator('#ws-name-fr')).to_be_enabled()
        expect(director_page.locator('#ws-budget')).to_have_count(0)
        new_name = f'Projet QA budget conservé {lang} {device}'
        director_page.locator('#ws-name-fr').fill(new_name)
        with director_page.expect_response(
            lambda response: response.request.method == 'PUT' and response.url.endswith(project_url)
        ) as general_save:
            director_page.get_by_role('button', name=save, exact=True).click()
        assert general_save.value.status == 200
        assert general_save.value.request.post_data_json['estimatedBudgetDzd'] is None
        assert general_save.value.json()['estimatedBudgetDzd'] is None
        expect(director_page.get_by_role('status')).to_be_visible()
        director_page.reload()
        expect(director_page.locator('#ws-name-fr')).to_have_value(new_name)
        director_page.screenshot(path=out/'p1-05-non-financial-manager-general-save.png')
        # Zero is still a numeric write, not a magic value that bypasses authorization.
        for forbidden_amount in (0, 99999999):
            refused = mutation(director_ctx.request, 'put', project_url,
                               update_payload(get_project(director_ctx.request), forbidden_amount))
            assert refused.status == 403
            assert refused.json()['code'] == 'PROJECT_FINANCIAL_ACCESS_DENIED'

        # Explicit financial readership is not project-management authority.
        assert assign(finance_id, 'FinanceController', True)['estimatedBudgetDzd'] is None
        assert get_project(finance_ctx.request)['estimatedBudgetDzd'] == updated_amount
        assert_collections(finance_ctx.request, updated_amount)
        assert_directory(finance_page, updated_amount)
        finance_page.goto(settings_url)
        expect(finance_page.locator('#ws-name-fr')).to_be_disabled()
        expect(finance_page.locator('#ws-budget')).to_have_count(0)
        expect(finance_page.locator('form').filter(has=finance_page.locator('#ws-name-fr'))
               .get_by_role('button', name=save, exact=True)).to_have_count(0)
        refused = mutation(finance_ctx.request, 'put', project_url,
                           update_payload(get_project(finance_ctx.request), 99999999))
        assert refused.status == 403 and refused.json()['code'] == 'FORBIDDEN_PROJECT_UPDATE'
        finance_page.screenshot(path=out/'p1-05-financial-reader-read-only.png')
        # Independent authorized read proves null updates and all denied writes preserved storage.
        assert get_project(finance_ctx.request)['estimatedBudgetDzd'] == updated_amount
        assert get_project(finance_ctx.request)['nameFr'] == new_name

        # Read and denial audit events must name the actor/project, not disclose the amount.
        audit = api.get('/api/audit?limit=100')
        assert audit.status == 200
        entries = [entry for entry in audit.json() if entry['targetEntityId'] == project_id]
        for actor_id in (director_id, finance_id):
            assert any(entry['eventType'] == 'PROJECT_FINANCIALS_VIEWED'
                       and entry['actorUserId'] == actor_id for entry in entries)
            assert any(entry['eventType'] == 'ACCESS_DENIED'
                       and entry['actorUserId'] == actor_id for entry in entries)
        assert not errors, 'P1-05 browser reported an uncaught application error'
        return (
            'Real ASP.NET Core + PostgreSQL 18 Chrome: SYSTEM_ADMIN without membership cannot create '
            'a nonzero estimate or see/edit the budget; detail, list and paged directory redact to null; '
            'AR/FR UI displays a dash and hides the editor; financial ProjectManager saved a decimal '
            'budget and reload confirmed it; removing financial capability redacted responses and UI; '
            'general edit sent null and preserved the stored budget; zero/nonzero tampering returned 403; '
            'non-member finance role could not discover project; explicitly assigned finance reader '
            'could read but not edit; authorized independent read confirmed unchanged storage; '
            'financial-view and denial audits identify actors/project. Automated evidence only; '
            'not manual Staging acceptance.'
        )
    except Exception as error:
        # Publish only static source locations and exception type to check annotations.
        # Avoid response/request dumps or exception messages (which may contain form values).
        for frame in traceback.extract_tb(error.__traceback__):
            if frame.filename.endswith('/project_budget.py'):
                print(f'::error file=tests/browser/project_budget.py,line={frame.lineno}::'
                      f'P1-05 {lang}/{device}: {type(error).__name__} in {frame.name}', flush=True)
        raise
    finally:
        for context in contexts:
            context.close()
