"""P1-06 bounded real project-settings navigation matrix on disposable CI only.

No intercepted API or duplicate router. Native prompts are browser-controlled:
reload and close are dismissed, never described as custom Save/Discard dialogs.
"""
import json
import traceback
import uuid


def run_navigation_dirty_settings(admin_ctx, actor_ctx, p06_page, base, lang, device,
                                  out, project_id, *, fixture='phase0'):
    from project_budget import mutation, require_budget_fixture, update_payload
    require_budget_fixture(base, lang, device, fixture)
    project_id = str(uuid.UUID(project_id))
    from playwright.sync_api import expect

    api = admin_ctx.request
    url = '/api/projects/' + project_id
    settings_url = base + '/projects/' + project_id + '/settings'
    overview_url = base + '/projects/' + project_id + '/overview'
    original_response = api.get(url)
    assert original_response.status == 200
    original = original_response.json()
    original_name = original['nameFr']
    checks = {}
    errors = []

    def on_error(_):
        errors.append(True)

    p06_page.on('pageerror', on_error)
    stay = 'البقاء هنا' if lang == 'ar' else 'Rester ici'
    discard = 'تجاهل التغييرات والمتابعة' if lang == 'ar' else 'Abandonner et continuer'
    save = 'حفظ والمتابعة' if lang == 'ar' else 'Enregistrer et continuer'
    dialog_title = 'توجد تغييرات غير محفوظة' if lang == 'ar' else 'Modifications non enregistrées'
    guard = p06_page.get_by_role('dialog', name=dialog_title, exact=True)
    editor = p06_page.locator('#ws-name-fr')
    draft = f'QA navigation {lang} {device}'
    marker = '__p106DirtySettingsDocument'

    def stored_name():
        response = api.get(url)
        assert response.status == 200
        return response.json()['nameFr']

    def sidebar(label):
        if device == 'mobile':
            p06_page.get_by_role('button', name='Open menu', exact=True).click()
        p06_page.get_by_role('navigation', name='Main navigation', exact=True).get_by_role(
            'button', name=label, exact=True).click()

    def expect_dirty():
        expect(p06_page).to_have_url(settings_url)
        expect(editor).to_have_value(draft)
        assert p06_page.evaluate('key => window[key] === true', marker)

    def switch_to(code):
        p06_page.locator('header button').filter(has=p06_page.locator('kbd')).click()
        switcher = p06_page.get_by_role('dialog')
        switcher.get_by_role('searchbox').fill(code)
        row = switcher.get_by_role('button').filter(has_text=code)
        expect(row).to_have_count(1)
        row.click()
        expect(guard).to_be_visible()
        expect_dirty()

    try:
        # A second real project belonging to this actor: no fabricated project ID.
        other_payload = update_payload(original, 0)
        other_payload.pop('expectedConcurrencyStamp')
        other_code = 'QA-NAV-' + uuid.uuid4().hex[:12].upper()
        other_payload.update({'code': other_code, 'nameAr': 'مشروع اختبار التنقل',
                              'nameFr': 'Projet QA navigation'})
        other = mutation(actor_ctx.request, 'post', '/api/projects', other_payload)
        assert other.status == 201
        other_id = str(uuid.UUID(other.json()['id']))
        assert other_id != project_id
        checks['real_second_project_created_in_disposable_fixture'] = True

        p06_page.goto(settings_url)
        expect(editor).to_be_enabled()
        p06_page.evaluate('key => { window[key] = true; }', marker)
        editor.fill(draft)
        sidebar('ملخص المشروع' if lang == 'ar' else 'Synthèse projet')
        expect(guard).to_be_visible()
        expect_dirty()
        guard.get_by_role('button', name=stay, exact=True).last.click()
        expect(guard).to_have_count(0)
        expect_dirty()
        assert stored_name() == original_name
        sidebar('ملخص المشروع' if lang == 'ar' else 'Synthèse projet')
        expect(guard).to_be_visible()
        guard.get_by_role('button', name=discard, exact=True).click()
        expect(p06_page).to_have_url(overview_url)
        assert stored_name() == original_name
        assert p06_page.evaluate('key => window[key] === true', marker)
        sidebar('الإعدادات والفريق' if lang == 'ar' else 'Paramètres & équipe')
        expect(editor).to_have_value(original_name)
        checks['internal_section_stay_preserves_draft_discard_resets_without_write'] = True

        editor.fill(draft)
        switch_to(other_code)
        guard.get_by_role('button', name=stay, exact=True).last.click()
        expect(guard).to_have_count(0)
        expect_dirty()
        assert stored_name() == original_name
        checks['project_switch_stay_preserves_original_project_and_draft'] = True

        # Real Chromium beforeunload prompts: dismiss to retain the dirty document.
        # The user-gesture requirement has already been met by real form/button clicks.
        with p06_page.expect_event('dialog', predicate=lambda value: value.type == 'beforeunload') as reload_prompt:
            p06_page.evaluate('() => { window.setTimeout(() => window.location.reload(), 0); }')
        reload_prompt.value.dismiss()
        expect_dirty()
        with p06_page.expect_event('dialog', predicate=lambda value: value.type == 'beforeunload') as close_prompt:
            p06_page.close(run_before_unload=True)
        close_prompt.value.dismiss()
        assert not p06_page.is_closed()
        expect_dirty()
        assert stored_name() == original_name
        checks['native_reload_and_close_dismiss_preserve_dirty_document'] = True

        switch_to(other_code)
        p06_page.screenshot(path=out / 'p1-06-dirty-project-switch.png')
        with p06_page.expect_response(lambda response: response.request.method == 'PUT'
                                      and response.url == base + url) as saved:
            guard.get_by_role('button', name=save, exact=True).click()
        assert saved.value.status == 200
        expect(p06_page).to_have_url(base + '/projects/' + other_id + '/overview')
        assert stored_name() == draft
        assert p06_page.evaluate('key => window[key] === true', marker)
        checks['project_switch_save_persists_original_before_mounting_other_project'] = True

        # Return through the actual switcher to prove keyed workspace draft isolation.
        p06_page.locator('header button').filter(has=p06_page.locator('kbd')).click()
        switcher = p06_page.get_by_role('dialog')
        switcher.get_by_role('searchbox').fill(original['code'])
        switcher.get_by_role('button').filter(has_text=original['code']).click()
        expect(p06_page).to_have_url(overview_url)
        sidebar('الإعدادات والفريق' if lang == 'ar' else 'Paramètres & équipe')
        expect(editor).to_have_value(draft)
        checks['return_to_original_project_reconstructs_persisted_settings'] = True

        draft += ' logout'
        editor.fill(draft)
        logout = 'تسجيل الخروج' if lang == 'ar' else 'Déconnexion'

        def request_logout():
            if device == 'mobile' and p06_page.get_by_role('button', name='Open menu', exact=True).count():
                p06_page.get_by_role('button', name='Open menu', exact=True).click()
            p06_page.get_by_role('button', name=logout, exact=True).click()
            expect(guard).to_be_visible()
            expect_dirty()

        request_logout()
        guard.get_by_role('button', name=stay, exact=True).last.click()
        expect(guard).to_have_count(0)
        expect_dirty()
        assert actor_ctx.request.get('/api/auth/me').status == 200
        assert stored_name() != draft
        checks['logout_stay_retains_authenticated_session_and_unsaved_draft'] = True
        request_logout()
        p06_page.screenshot(path=out / 'p1-06-dirty-logout.png')
        with p06_page.expect_response(lambda response: response.request.method == 'PUT'
                                      and response.url == base + url) as saved_logout:
            with p06_page.expect_response('**/api/auth/logout') as logged_out:
                guard.get_by_role('button', name=save, exact=True).click()
        assert saved_logout.value.status == 200 and logged_out.value.status == 204
        expect(p06_page.locator('#login-username')).to_be_visible()
        assert actor_ctx.request.get('/api/auth/me').status == 401
        assert stored_name() == draft
        checks['logout_save_persists_settings_and_revokes_real_session'] = True
        assert not errors
        checks['no_uncaught_page_errors'] = True
    except Exception as error:
        for frame in traceback.extract_tb(error.__traceback__):
            if frame.filename.endswith('/navigation_dirty_settings.py'):
                print(f'::error file=tests/browser/navigation_dirty_settings.py,line={frame.lineno}::'
                      f'P1-06 {lang}/{device}: {type(error).__name__}', flush=True)
        raise
    finally:
        # Admin may restore general data but must send null for hidden financials.
        # Preserve the current concurrency stamp and every field except our test name.
        current = api.get(url)
        assert current.status == 200
        if current.json()['nameFr'] != original_name:
            payload = update_payload(current.json(), None)
            payload['nameFr'] = original_name
            restored = mutation(api, 'put', url, payload)
            assert restored.status == 200
        assert stored_name() == original_name
        p06_page.remove_listener('pageerror', on_error)

    checks['original_fixture_name_restored_with_fresh_stamp_and_null_budget'] = True
    (out / 'navigation-dirty-settings.json').write_text(json.dumps({
        'scope': 'P1-06 bounded settings internal/project/logout and native-dismiss navigation',
        'fixture': fixture, 'language': lang, 'device': device, 'checks': checks,
        'limits': 'Native Chromium reload/close dismissed, not OS crash/recovery or custom save prompts. '
                  'Embedded forms and logout Discard not covered by this helper. '
                  'Second synthetic project remains only in the disposable CI database.',
    }, indent=2) + '\n')
