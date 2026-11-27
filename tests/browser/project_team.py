"""P1-15: actual Production HTTPS team UI, solely on disposable CI targets.

Reuses the two synthetic active budget actors; no extra login, role grant or secret.
Sequential last-manager protection only; PostgreSQL integration tests cover races.
"""
import json
import subprocess
import uuid

from project_budget import mutation, require_budget_fixture

CHECKS = (
    'admin_not_implicit_member_initial_manager_spa_assignment',
    'csrf_denial_preserves_membership',
    'sole_manager_removal_409_visible_no_mutation',
    'sole_manager_demotion_409_visible_no_mutation',
    'replacement_manager_spa_assignment_persists',
    'demotion_allowed_with_replacement_manager',
    'former_manager_revocation_and_remaining_manager_protection',
    'exact_success_audits_no_false_success_organization_unchanged',
)
SCOPE = 'P1-15 disposable Production HTTPS; sequential team management and last-manager protection'


def member_payload(user_id, role):
    return {'userId': str(uuid.UUID(user_id)), 'roleInProject': role,
            'canViewFinancials': False, 'canManageSales': False,
            'canManageConstruction': False, 'canManageDocuments': False}


def audit_counts(project_id):
    project_id = str(uuid.UUID(project_id))
    return subprocess.check_output(['psql', '-XqAt', '-v', 'ON_ERROR_STOP=1', '-c',
        "SELECT count(*) FILTER (WHERE event_type='PROJECT_MEMBER_ASSIGNED'), "
        "count(*) FILTER (WHERE event_type='PROJECT_MEMBER_REVOKED') "
        "FROM audit_logs WHERE target_entity_type='Project' AND target_entity_id='" + project_id + "'"],
        text=True).strip()


def run_project_team(browser, admin_ctx, base, lang, device, viewport, out):
    # Before filesystem, SQL, Playwright import or API I/O.
    require_budget_fixture(base, lang, device, 'staging')
    from playwright.sync_api import expect

    api = admin_ctx.request
    before_org = api.get('/api/auth/me').json()['organization']
    users_response = api.get('/api/users')
    assert users_response.status == 200
    users = users_response.json()
    actor_ids = []
    for name in ('qa.budget.director', 'qa.budget.finance'):
        matches = [u for u in users if u['username'] == name and u['isActive']]
        assert len(matches) == 1
        actor_ids.append(str(uuid.UUID(matches[0]['id'])))
    director_id, replacement_id = actor_ids
    code = f'QA-P1-15-{lang.upper()}-{device.upper()}'
    created = mutation(api, 'post', '/api/projects', {
        'code': code, 'nameAr': 'مشروع اختبار حماية آخر مدير',
        'nameFr': 'Projet QA protection du dernier chef', 'wilayaCode': '16',
        'wilayaName': 'الجزائر / Alger', 'municipality': 'Dely Ibrahim',
        'address': 'QA synthetic address', 'landTitleReference': None,
        'buildingPermitNumber': None, 'buildingPermitDate': None,
        'status': 'Planning', 'estimatedBudgetDzd': None,
        'plannedBlocksCount': 1, 'plannedUnitsCount': 1,
    })
    assert created.status == 201 and created.json()['members'] == []
    project_id = str(uuid.UUID(created.json()['id']))
    url = f'/api/projects/{project_id}'
    checks = {}
    errors = []
    page = admin_ctx.new_page()
    page.on('pageerror', lambda _: errors.append(True))
    manage = 'صلاحيات المشروع' if lang == 'ar' else 'Accès projet'
    title = 'إدارة صلاحيات الوصول للمشروع' if lang == 'ar' else 'Gestion des accès au projet'
    remove = 'سحب الصلاحية' if lang == 'ar' else 'Révoquer'
    assign_label = 'منح الصلاحية' if lang == 'ar' else "Attribuer l'accès"
    conflict = ('يجب أن يحتفظ المشروع بمدير مشروع واحد نشط على الأقل.' if lang == 'ar'
                else 'Le projet doit conserver au moins un chef de projet actif.')

    def members():
        response = api.get(url)
        assert response.status == 200
        return {m['userId']: m['roleInProject'] for m in response.json()['members']}

    def open_team():
        page.goto(base + '/projects')
        item = (page.get_by_role('article', name=code, exact=True) if device == 'mobile'
                else page.get_by_role('row').filter(has_text=code))
        expect(item).to_have_count(1)
        item.get_by_role('button', name=manage, exact=True).click()
        expect(page.get_by_role('heading', name=title, exact=True)).to_be_visible()
        expect(page.locator('html')).to_have_attribute('dir', 'rtl' if lang == 'ar' else 'ltr')
        return page.get_by_role('dialog')

    def assign(user_id, role, status=200):
        page.locator('#pm-user').select_option(user_id)
        page.locator('#pm-role').select_option(role)
        form = page.locator('form').filter(has=page.locator('#pm-user'))
        for checkbox in form.get_by_role('checkbox').all():
            checkbox.uncheck()
        with page.expect_response(lambda r: r.request.method == 'PUT' and r.url.endswith(url + '/members')) as saved:
            page.locator('form').filter(has=page.locator('#pm-user')).get_by_role(
                'button', name=assign_label, exact=True).click()
        assert saved.value.status == status
        payload = saved.value.request.post_data_json
        assert payload == member_payload(user_id, role)
        if status == 409:
            assert saved.value.json()['code'] == 'PROJECT_LAST_MANAGER_REQUIRED'
            expect(page.get_by_role('alert')).to_have_text(conflict)
        return saved.value

    def remove_actor(username, user_id, status):
        row = page.get_by_role('dialog').locator('div.px-4.py-3').filter(has_text=f'({username})')
        expect(row).to_have_count(1)
        with page.expect_response(lambda r: r.request.method == 'DELETE'
                                  and r.url.endswith(url + '/members/' + user_id)) as response:
            row.get_by_role('button', name=remove, exact=True).click()
        assert response.value.status == status
        if status == 409:
            assert response.value.json()['code'] == 'PROJECT_LAST_MANAGER_REQUIRED'
            expect(page.get_by_role('alert')).to_have_text(conflict)

    def capture(filename):
        # Small modal viewport can scroll the error offscreen after form submission.
        alert = page.get_by_role('alert')
        alert.scroll_into_view_if_needed()
        heading = page.get_by_role('heading', name=title, exact=True)
        heading.scroll_into_view_if_needed()
        expect(alert).to_be_in_viewport()
        expect(heading).to_be_in_viewport()
        page.screenshot(path=out / filename)

    try:
        open_team()
        assign(director_id, 'ProjectManager')
        assert members() == {director_id: 'ProjectManager'} and audit_counts(project_id) == '1|0'
        checks[CHECKS[0]] = True

        denied = api.delete(url + '/members/' + director_id)
        assert denied.status == 403
        assert members() == {director_id: 'ProjectManager'} and audit_counts(project_id) == '1|0'
        checks[CHECKS[1]] = True

        remove_actor('qa.budget.director', director_id, 409)
        assert members() == {director_id: 'ProjectManager'} and audit_counts(project_id) == '1|0'
        capture('team-01-remove-refused.png')
        checks[CHECKS[2]] = True

        assign(director_id, 'CommercialAgent', 409)
        assert members() == {director_id: 'ProjectManager'} and audit_counts(project_id) == '1|0'
        capture('team-02-demotion-refused.png')
        checks[CHECKS[3]] = True

        assign(replacement_id, 'ProjectManager')
        assert members() == {director_id: 'ProjectManager', replacement_id: 'ProjectManager'}
        open_team()  # Full navigation/reload; saved membership must be reconstructed.
        expect(page.get_by_role('dialog')).to_contain_text('qa.budget.finance')
        checks[CHECKS[4]] = True

        assign(director_id, 'CommercialAgent')
        assert members() == {director_id: 'CommercialAgent', replacement_id: 'ProjectManager'}
        checks[CHECKS[5]] = True
        remove_actor('qa.budget.director', director_id, 200)
        assert members() == {replacement_id: 'ProjectManager'}
        open_team()
        remove_actor('qa.budget.finance', replacement_id, 409)
        capture('team-03-replacement-protected.png')
        assert members() == {replacement_id: 'ProjectManager'}
        checks[CHECKS[6]] = True

        assert audit_counts(project_id) == '3|1'
        assert api.get('/api/auth/me').json()['organization'] == before_org
        assert not errors
        checks[CHECKS[7]] = True
        (out / 'project-team.json').write_text(json.dumps({
            'profile': f'{lang}-{device}', 'status': 'PASS', 'checks': checks, 'scope': SCOPE,
        }, indent=2) + '\n')
    finally:
        page.close()
