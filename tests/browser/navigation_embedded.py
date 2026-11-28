"""P1-06: actual C/D/E/K embedded drafts -> App navigation guard on CI fixtures.

No API mutation or permission grant. Existing administrator session is retained;
logout Stay is cancelled, native tab close closes only the extra test page.
"""
import json
import traceback
import uuid


def run_navigation_embedded(admin_ctx, base, lang, device, out, project_id, *, fixture='phase0'):
    from project_budget import require_budget_fixture
    require_budget_fixture(base, lang, device, fixture)
    project_id = str(uuid.UUID(project_id))
    from playwright.sync_api import expect

    api = admin_ctx.request
    prefix = '/api/projects/' + project_id
    overview_url = base + '/projects/' + project_id + '/overview'
    definitions = (
        ('structure', 'الهيكل العقاري', 'Structure & lots'),
        ('customers', 'الزبائن والمهتمون', 'Clients & CRM'),
        ('reservations', 'الحجوزات الداخلية', 'Réservations'),
        ('documents', 'الوثائق (K-Min)', 'Documents'),
    )
    stay = 'البقاء هنا' if lang == 'ar' else 'Rester ici'
    discard = 'تجاهل التغييرات والمتابعة' if lang == 'ar' else 'Abandonner et continuer'
    save = 'حفظ والمتابعة' if lang == 'ar' else 'Enregistrer et continuer'
    title = 'توجد تغييرات غير محفوظة' if lang == 'ar' else 'Modifications non enregistrées'
    marker = '__p106EmbeddedDocument'
    checks = {}
    writes = []
    errors = []

    def snapshot():
        result = {}
        for section, _, _ in definitions:
            response = api.get(prefix + '/' + section)
            assert response.status == 200
            result[section] = response.json()
        return result

    baseline = snapshot()
    identity_before = api.get('/api/auth/me')
    assert identity_before.status == 200
    organization = identity_before.json()['organization']

    # The preceding dirty-settings helper creates exactly one second project
    # through the real ProjectManager API, in this same disposable profile only.
    # Resolve it from the server list so this test never invents a project ID.
    original_response = api.get(prefix)
    assert original_response.status == 200
    original_code = original_response.json()['code']
    candidates_response = api.get('/api/projects', params={'q': 'QA-NAV-'})
    assert candidates_response.status == 200
    candidates = [
        row for row in candidates_response.json()
        if row.get('id') != project_id and str(row.get('code', '')).startswith('QA-NAV-')
    ]
    assert len(candidates) == 1
    other_project = candidates[0]
    other_project_id = str(uuid.UUID(other_project['id']))
    other_project_code = other_project['code']
    other_overview_url = base + '/projects/' + other_project_id + '/overview'

    def on_request(request):
        if '/api/' in request.url and request.method not in ('GET', 'HEAD', 'OPTIONS'):
            # Static boolean only, never record URL/body/cookies/file contents.
            writes.append(True)

    def on_error(_):
        errors.append(True)

    for section, arabic_label, french_label in definitions:
        p06_page = admin_ctx.new_page()
        p06_page.on('request', on_request)
        p06_page.on('pageerror', on_error)
        guard = p06_page.get_by_role('dialog', name=title, exact=True)
        section_url = base + '/projects/' + project_id + '/' + section
        draft = '2030-01-02T12:34' if section == 'reservations' else 'QA P1-06 embedded draft'

        def sidebar(label):
            if device == 'mobile':
                p06_page.get_by_role('button', name='Open menu', exact=True).click()
            p06_page.get_by_role('navigation', name='Main navigation', exact=True).get_by_role(
                'button', name=label, exact=True).click()

        def switch_project(code):
            # Use the real shell project switcher and server-filtered result.
            p06_page.locator('header button').filter(has=p06_page.locator('kbd')).click()
            switcher = p06_page.get_by_role('dialog')
            switcher.get_by_role('searchbox').fill(code)
            # Project buttons expose a composed accessible name (code, project
            # name, wilaya, municipality and status), not the code alone. The same
            # project can also appear in Recent and All; filter its visible text and
            # choose one real row without bypassing Playwright actionability.
            row = switcher.get_by_role('button').filter(has_text=code)
            expect(row.first).to_be_visible()
            row.first.click()

        def editor():
            if section == 'structure':
                field = p06_page.locator('#structure-building-code')
                if not field.count():
                    p06_page.get_by_role('button', name=(
                        'إضافة عمارة' if lang == 'ar' else 'Ajouter un bâtiment'), exact=True).click()
                return field
            if section == 'customers':
                field = p06_page.get_by_label(
                    'الاسم الكامل أو التسمية القانونية *' if lang == 'ar'
                    else 'Nom complet ou raison sociale *', exact=True)
                if not field.count():
                    p06_page.get_by_role('button', name='إضافة' if lang == 'ar' else 'Ajouter', exact=True).click()
                return field
            if section == 'reservations':
                return p06_page.locator('input[type="datetime-local"]')
            return p06_page.get_by_label(
                'وصف مختصر (اختياري)' if lang == 'ar' else 'Description (facultative)', exact=True)

        def expect_guard():
            expect(guard).to_be_visible()
            expect(guard.get_by_role('button', name=save, exact=True)).to_have_count(0)
            expect(p06_page).to_have_url(section_url)
            expect(editor()).to_have_value(draft)
            assert p06_page.evaluate('key => window[key] === true', marker)

        def arm_native_leave():
            # Filling an input only proves child state. Observe the real App guard
            # and complete a user click before asking Chromium to unload, especially
            # after a fresh reload. No sleeps, synthetic beforeunload or retries.
            p06_page.evaluate('key => { window[key] = true; }', marker)
            editor().fill(draft)
            sidebar('ملخص المشروع' if lang == 'ar' else 'Synthèse projet')
            expect_guard()
            guard.get_by_role('button', name=stay, exact=True).last.click()
            expect(guard).to_have_count(0)
            expect(editor()).to_have_value(draft)

        native_phase = 'navigation'
        try:
            p06_page.goto(overview_url)
            sidebar(arabic_label if lang == 'ar' else french_label)
            expect(p06_page).to_have_url(section_url)
            field = editor()
            expect(field).to_be_enabled()
            initial_value = field.input_value()
            assert initial_value != draft

            # Project switching from each embedded C/D/E/K draft must reach the
            # App guard. Embedded forms intentionally have no shell Save callback.
            p06_page.evaluate('key => { window[key] = true; }', marker)
            field.fill(draft)
            native_phase = 'embedded_project_switch_stay'
            switch_project(other_project_code)
            expect_guard()
            guard.get_by_role('button', name=stay, exact=True).last.click()
            expect(guard).to_have_count(0)
            expect(p06_page).to_have_url(section_url)
            expect(field).to_have_value(draft)
            assert snapshot() == baseline
            assert not writes
            checks[section + '_embedded_project_switch_stay_preserves_draft'] = True

            native_phase = 'embedded_project_switch_discard'
            switch_project(other_project_code)
            expect_guard()
            guard.get_by_role('button', name=discard, exact=True).click()
            expect(guard).to_have_count(0)
            expect(p06_page).to_have_url(other_overview_url)
            assert p06_page.evaluate('key => window[key] === true', marker)
            assert snapshot() == baseline
            assert not writes
            assert api.get('/api/auth/me').status == 200
            checks[section + '_embedded_project_switch_discard_navigates_without_write'] = True

            native_phase = 'embedded_project_switch_return'
            switch_project(original_code)
            expect(p06_page).to_have_url(overview_url)
            sidebar(arabic_label if lang == 'ar' else french_label)
            expect(p06_page).to_have_url(section_url)
            field = editor()
            expect(field).not_to_have_value(draft)
            assert snapshot() == baseline
            assert not writes
            checks[section + '_return_from_embedded_project_switch_reopens_clean_draft'] = True

            # Continue with the existing internal navigation/logout/history checks.
            p06_page.evaluate('key => { window[key] = true; }', marker)
            field.fill(draft)
            sidebar('ملخص المشروع' if lang == 'ar' else 'Synthèse projet')
            expect_guard()
            p06_page.screenshot(path=out / f'p1-06-embedded-{section}-guard.png')
            guard.get_by_role('button', name=stay, exact=True).last.click()
            expect(guard).to_have_count(0)
            expect(field).to_have_value(draft)
            checks[section + '_internal_stay_and_no_false_save'] = True

            # Logout must be guarded even though this embedded editor cannot be saved
            # by the shell. Stay must not revoke the shared administrator session.
            if device == 'mobile':
                p06_page.get_by_role('button', name='Open menu', exact=True).click()
            p06_page.get_by_role('button', name=(
                'تسجيل الخروج' if lang == 'ar' else 'Déconnexion'), exact=True).click()
            expect_guard()
            guard.get_by_role('button', name=stay, exact=True).last.click()
            expect(guard).to_have_count(0)
            assert api.get('/api/auth/me').status == 200
            expect(field).to_have_value(draft)
            if device == 'mobile':
                # The open drawer overlays the header toggle; use its visible backdrop,
                # not the covered "Close menu" header button (no forced clicks).
                p06_page.get_by_role('button', name='Close navigation menu', exact=True).click()
            checks[section + '_logout_stay_keeps_session_and_draft'] = True

            # Exercise real App history restoration, not a synthetic popstate event.
            p06_page.go_back()
            expect_guard()
            guard.get_by_role('button', name=stay, exact=True).last.click()
            expect(guard).to_have_count(0)
            p06_page.go_back()
            expect_guard()
            guard.get_by_role('button', name=discard, exact=True).click()
            expect(p06_page).to_have_url(overview_url)
            assert p06_page.evaluate('key => window[key] === true', marker)
            p06_page.go_forward()
            expect(p06_page).to_have_url(section_url)
            field = editor()
            expect(field).not_to_have_value(draft)
            if section != 'reservations':
                expect(field).to_have_value(initial_value)
            assert snapshot() == baseline
            checks[section + '_back_stay_discard_forward_resets_without_write'] = True

            # Accept browser-native Leave on reload: new document, same server data,
            # fresh embedded draft. This is not a custom Save/Discard dialog.
            arm_native_leave()
            native_phase = 'reload_leave'
            with p06_page.expect_event('dialog', predicate=lambda value: value.type == 'beforeunload') as reload_prompt:
                p06_page.evaluate('() => { window.setTimeout(() => window.location.reload(), 0); }')
            reload_prompt.value.accept()
            p06_page.wait_for_function('key => window[key] !== true', arg=marker)
            p06_page.wait_for_load_state('domcontentloaded')
            expect(p06_page).to_have_url(section_url)
            field = editor()
            expect(field).not_to_have_value(draft)
            assert not p06_page.evaluate('key => window[key] === true', marker)
            checks[section + '_native_reload_leave_resets_draft_not_storage'] = True

            arm_native_leave()
            native_phase = 'tab_close_leave'
            with p06_page.expect_event('dialog', predicate=lambda value: value.type == 'beforeunload') as close_prompt:
                p06_page.close(run_before_unload=True)
            with p06_page.expect_event('close'):
                close_prompt.value.accept()
            assert p06_page.is_closed()
            assert snapshot() == baseline
            checks[section + '_native_tab_close_leave_closes_only_test_page'] = True
        except Exception as error:
            for frame in traceback.extract_tb(error.__traceback__):
                if frame.filename.endswith('/navigation_embedded.py'):
                    print(f'::error file=tests/browser/navigation_embedded.py,line={frame.lineno}::'
                          f'P1-06 {section} {lang}/{device}: {type(error).__name__}; '
                          f'stage={native_phase}; page_closed={p06_page.is_closed()}', flush=True)
            raise
        finally:
            p06_page.remove_listener('request', on_request)
            p06_page.remove_listener('pageerror', on_error)
            if not p06_page.is_closed():
                p06_page.close()

    assert not writes and not errors
    assert api.get('/api/auth/me').status == 200
    assert api.get('/api/auth/me').json()['organization'] == organization
    assert snapshot() == baseline
    checks['all_four_collections_unchanged_and_no_page_api_mutations'] = True
    checks['administrator_session_and_organization_preserved_no_pageerror'] = True
    (out / 'navigation-embedded.json').write_text(json.dumps({
        'scope': 'P1-06 C/D/E/K embedded drafts: project switch Stay/Discard, internal/history/logout Stay, Back Discard, native Leave',
        'fixture': fixture, 'language': lang, 'device': device, 'checks': checks,
        'limits': 'Incomplete drafts only; no embedded save is falsely offered. Native Chromium Leave, '
                  'not OS crash/recovery. Logout Discard and the remaining protected-view mapping stay separate.',
    }, indent=2) + '\n')
