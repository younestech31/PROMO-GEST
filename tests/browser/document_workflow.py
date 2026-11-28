"""Merged P1-06 document workflow + protected router acceptance on disposable CI only.

Reuses budget actors (no new login/grant). One synthetic upload is retained only
in the runner's disposable database. Only the post-upload GET is fault-injected;
the upload, retry, download and independent reads use the actual API/storage.
"""
import hashlib
import json
import traceback
import uuid
from urllib.parse import urlsplit

from project_budget import require_budget_fixture


def run_document_workflow(admin_ctx, reader_ctx, base, lang, device, out, project_id, *, fixture='phase0'):
    require_budget_fixture(base, lang, device, fixture)  # before all IO/imports
    project_id = str(uuid.UUID(project_id))
    from playwright.sync_api import expect

    endpoint = '/api/projects/' + project_id + '/documents'
    filename = 'qa-document-workflow.txt'
    content = b'PROMO GEST disposable document workflow acceptance\n'
    description = 'QA searchable description'
    checks = {}
    writes = []
    errors = []
    page = admin_ctx.new_page()
    reader = reader_ctx.new_page()
    page.on('pageerror', lambda _: errors.append(True))
    reader.on('pageerror', lambda _: errors.append(True))
    posts = []
    fail_read = False

    def observe(request):
        if urlsplit(request.url).path == endpoint and request.method == 'POST':
            posts.append(True)  # no request data, IDs, cookies or credentials in evidence

    def inject(route):
        nonlocal fail_read
        request = route.request
        if request.method == 'POST':
            fail_read = True
            route.continue_()
        elif request.method == 'GET' and fail_read:
            fail_read = False
            route.abort('internetdisconnected')
        else:
            route.continue_()

    page.on('request', observe)
    try:
        initial = admin_ctx.request.get(endpoint)
        assert initial.status == 200
        initial_ids = {item['id'] for item in initial.json()}
        page.goto(base + '/projects/' + project_id + '/documents')
        search = page.get_by_role('searchbox', name=(
            'بحث في الوثائق المحملة' if lang == 'ar' else 'Rechercher dans les documents chargés'), exact=True)
        category = page.get_by_label(
            'تصفية تصنيف الوثائق' if lang == 'ar' else 'Filtrer par catégorie de document', exact=True)
        draft = page.get_by_label(
            'وصف مختصر (اختياري)' if lang == 'ar' else 'Description (facultative)', exact=True)
        expect(search).to_be_visible()
        draft.fill(description)
        page.locator('#project-document-file').set_input_files({
            'name': filename, 'mimeType': 'text/plain', 'buffer': content,
        })
        pattern = '**' + endpoint
        page.route(pattern, inject)
        with page.expect_response(lambda r: r.request.method == 'POST'
                                  and urlsplit(r.url).path == endpoint) as uploaded:
            page.get_by_role('button', name='رفع الوثيقة' if lang == 'ar' else 'Téléverser', exact=True).click()
        assert uploaded.value.status == 201
        file_id = str(uuid.UUID(uploaded.value.json()['id']))
        expect(page.get_by_role('status').filter(has_text=filename)).to_be_visible()
        retry = page.get_by_role('button', name=(
            'إعادة تحميل الوثائق' if lang == 'ar' else 'Recharger les documents'), exact=True)
        expect(retry).to_be_visible()
        expect(draft).to_have_value('')
        retry.click()
        row = page.get_by_role('article').filter(has_text=filename)
        expect(row).to_have_count(1)
        expect(retry).to_have_count(0)
        assert len(posts) == 1
        page.unroute(pattern, inject)
        checks['real_upload_201_acknowledged_despite_injected_list_failure_read_retry_no_replay'] = True

        persisted = admin_ctx.request.get(endpoint)
        assert persisted.status == 200
        assert {item['id'] for item in persisted.json()} == initial_ids | {file_id}
        stored = next(item for item in persisted.json() if item['id'] == file_id)
        assert stored['sha256Checksum'].lower() == hashlib.sha256(content).hexdigest()
        checks['independent_list_exactly_one_new_document_and_checksum'] = True

        search.fill(description)
        expect(row).to_have_count(1)
        category.select_option('Financial')
        expect(row).to_have_count(0)
        expect(page.get_by_text('لا توجد وثائق تطابق البحث والتصفية.' if lang == 'ar'
                                else 'Aucun document ne correspond aux filtres.', exact=True)).to_be_visible()
        page.get_by_role('button', name='مسح التصفية' if lang == 'ar' else 'Effacer les filtres', exact=True).click()
        expect(search).to_have_value('')
        expect(category).to_have_value('')
        expect(row).to_have_count(1)
        checks['loaded_description_search_category_no_match_and_reset'] = True
        with page.expect_download() as download:
            row.get_by_role('button', name='تنزيل' if lang == 'ar' else 'Télécharger', exact=True).click()
        assert download.value.suggested_filename == filename
        assert download.value.failure() is None
        assert hashlib.sha256(__import__('pathlib').Path(download.value.path()).read_bytes()).digest() == hashlib.sha256(content).digest()
        checks['actual_ui_download_bytes_match_uploaded_sha256'] = True
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        page.screenshot(path=out / 'p1-06-document-workflow.png', full_page=True)
        checks['document_view_no_horizontal_overflow'] = True

        # Finance actor has files.read membership but no canManageDocuments. This
        # exercises existing Other access, not a new P1-08 policy decision.
        reader.on('request', lambda r: writes.append(True) if '/api/' in r.url
                  and r.method not in ('GET', 'HEAD', 'OPTIONS') else None)
        reader.goto(base + '/projects/' + project_id + '/documents')
        read_row = reader.get_by_role('article').filter(has_text=filename)
        expect(read_row).to_have_count(1)
        expect(reader.locator('#project-document-file')).to_have_count(0)
        expect(reader.get_by_text('لديك صلاحية المطالعة فقط. لا تملك صلاحية رفع وثائق لهذا المشروع.'
                                 if lang == 'ar' else 'Accès en lecture seule : vous ne pouvez pas ajouter de documents à ce projet.', exact=True)).to_be_visible()
        with reader.expect_download() as read_download:
            read_row.get_by_role('button', name='تنزيل' if lang == 'ar' else 'Télécharger', exact=True).click()
        assert read_download.value.failure() is None
        checks['existing_authorized_reader_download_without_upload_form'] = True

        me = reader_ctx.request.get('/api/auth/me')
        assert me.status == 200
        user = me.json()['user']
        assert user['isSystemAdministrator'] is False
        assert not {'users.manage', 'parties.directory.read'} & set(user['permissions'])
        for path, notice in (
            ('/admin/users', 'ليس لديك صلاحية الوصول إلى هذه الشاشة الإدارية.' if lang == 'ar'
             else 'Vous n’êtes pas autorisé à accéder à cet écran d’administration.'),
            ('/organization/parties', 'ليس لديك صلاحية الاطلاع على دليل الأطراف المركزي' if lang == 'ar'
             else 'Vous ne disposez pas du droit de consultation du répertoire des tiers'),
        ):
            requested = []
            def protected_request(request):
                if urlsplit(request.url).path in ('/api/users', '/api/parties'):
                    requested.append(True)
            reader.on('request', protected_request)
            try:
                reader.goto(base + path)
                expect(reader.get_by_role('alert').filter(has_text=notice)).to_be_visible()
                expect(reader.get_by_role('main').locator('table, form')).to_have_count(0)
                assert not requested
            finally:
                reader.remove_listener('request', protected_request)
        checks['actual_router_denies_admin_and_party_views_without_mount_or_protected_fetch'] = True
        assert not writes and not errors
        checks['reader_no_mutation_and_no_uncaught_errors'] = True
        (out / 'document-workflow.json').write_text(json.dumps({
            'profile': lang + '-' + device, 'status': 'PASS', 'checks': checks,
            'scope': 'Automated disposable ' + fixture + '; not institution/operator acceptance',
        }, indent=2) + '\n')
    except Exception as error:
        for frame in traceback.extract_tb(error.__traceback__):
            if frame.filename.endswith('/document_workflow.py'):
                print(f'::error file=tests/browser/document_workflow.py,line={frame.lineno}::'
                      f'P1-06 documents {lang}/{device}: {type(error).__name__} in {frame.name}', flush=True)
        raise
    finally:
        page.close()
        reader.close()
