"""P1-10 / ADR-0018: existing runtime, real SPA review, disposable Phase-0 CI only.

No new accounts, SQL grants, response dumps, financial operations or production targets.
"""
from datetime import datetime, timedelta, timezone
import traceback

from project_budget import mutation, require_budget_fixture, update_payload

CHECKS = (
    'non_commercial_statuses_deny_new_holds_without_mutation',
    'commercialization_spa_creates_active_hold',
    'suspension_queues_without_cancellation_or_unit_release',
    'stale_review_conflicts_without_mutation',
    'spa_review_preserves_hold_expiry_unit_and_suspension',
    'completed_review_does_not_allow_new_holds',
    'review_and_denial_audits_identify_actor_and_target',
)


def preserved_hold(hold):
    """Only invariants that a documentary review must never change."""
    return {key: hold[key] for key in (
        'id', 'projectId', 'propertyUnitId', 'projectCustomerId', 'status',
        'expiresAtUtc', 'closedAtUtc', 'closedByUserId', 'closeReason',
    )}


def run_commercialization_review(admin_ctx, base, lang, device, out):
    # Must precede Playwright import, filesystem and network I/O.
    require_budget_fixture(base, lang, device, 'phase0')
    from playwright.sync_api import expect

    api = admin_ctx.request
    checks = {}
    page = None
    errors = []

    def read(url):
        response = api.get(url)
        assert response.status == 200
        return response.json()

    def write(method, url, payload, expected=200):
        response = mutation(api, method, url, payload)
        assert response.status == expected
        return response.json()

    try:
        project = write('post', '/api/projects', {
            'code': f'QA-P1-10-{lang.upper()}-{device.upper()}',
            'nameAr': 'مشروع اختبار تعليق التسويق', 'nameFr': 'Projet QA revue de suspension',
            'wilayaCode': '16', 'wilayaName': 'الجزائر / Alger', 'municipality': 'Dely Ibrahim',
            'address': 'QA synthetic address', 'landTitleReference': None,
            'buildingPermitNumber': None, 'buildingPermitDate': None,
            'status': 'Planning', 'estimatedBudgetDzd': 0,
            'plannedBlocksCount': 1, 'plannedUnitsCount': 2,
        }, 201)
        url = '/api/projects/' + project['id']
        structure_url = url + '/structure'
        structure = write('post', structure_url + '/buildings', {
            'code': 'A', 'nameAr': 'العمارة أ', 'nameFr': 'Bâtiment A', 'status': 'Planned',
        })
        floors_url = structure_url + '/buildings/' + structure['buildings'][0]['id'] + '/floors'
        structure = write('post', floors_url, {
            'floorNumber': 0, 'nameAr': 'الأرضي', 'nameFr': 'Rez-de-chaussée',
        })
        floor_id = structure['buildings'][0]['floors'][0]['id']
        for number in ('QA-001', 'QA-002'):
            write('post', floors_url + '/' + floor_id + '/units', {
                'unitNumber': number, 'unitType': 'Apartment', 'status': 'AvailableForSale',
                'grossAreaSquareMeters': 100, 'netAreaSquareMeters': 90, 'roomsCount': 3,
            })
        customer = write('post', url + '/customers', {
            'customerType': 'Individual', 'displayName': 'QA Synthetic Prospect',
            'contactPerson': None, 'phone': '0550123456', 'email': None, 'address': None,
            'preferredLanguage': lang, 'source': 'Referral', 'identityDocumentStoredFileId': None,
        }, 201)

        def units():
            return {u['unitNumber']: u for b in read(structure_url)['buildings']
                    for f in b['floors'] for u in f['units']}

        expiry = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        payload = {'propertyUnitId': units()['QA-001']['id'],
                   'projectCustomerId': customer['id'], 'expiresAtUtc': expiry}

        def set_status(status):
            body = update_payload(read(url), None)
            body['status'] = status
            return write('put', url, body)

        def deny_new_hold():
            before = read(url + '/reservations')
            before_units = units()
            denied = mutation(api, 'post', url + '/reservations', payload)
            assert denied.status == 409 and denied.json()['code'] == 'PROJECT_NOT_COMMERCIALIZABLE'
            assert read(url + '/reservations') == before
            assert units() == before_units

        for status in ('Planning', 'UnderConstruction', 'Delivered', 'Suspended'):
            set_status(status)
            deny_new_hold()
        checks[CHECKS[0]] = True
        set_status('Commercialization')

        page = admin_ctx.new_page()
        page.on('pageerror', lambda _: errors.append(True))
        route = base + url.replace('/api', '', 1) + '/reservations'
        page.goto(route)
        expect(page.locator('html')).to_have_attribute('lang', lang)
        expect(page.locator('html')).to_have_attribute('dir', 'rtl' if lang == 'ar' else 'ltr')
        create = page.get_by_role('button', name='إنشاء حجز' if lang == 'ar' else 'Créer une réservation', exact=True)
        expect(create).to_be_enabled()
        page.get_by_label('الوحدة المتاحة *' if lang == 'ar' else 'Unité disponible *', exact=True).select_option(payload['propertyUnitId'])
        with page.expect_response(lambda r: r.url.endswith('/reservations') and r.request.method == 'POST') as created:
            create.click()
        assert created.value.status == 201
        hold = created.value.json()
        assert hold['status'] == 'Active' and hold['isAwaitingReview'] is False
        assert units()['QA-001']['status'] == 'Reserved'
        checks[CHECKS[1]] = True

        set_status('Suspended')
        queued = read(url + '/reservations?reviewRequired=true')
        assert len(queued) == 1 and queued[0]['id'] == hold['id']
        pending = queued[0]
        assert pending['reviewRequiredAtUtc'] and pending['isAwaitingReview'] is True
        assert preserved_hold(pending) == preserved_hold(hold)
        assert units()['QA-001']['status'] == 'Reserved'
        checks[CHECKS[2]] = True
        review_url = url + '/reservations/' + hold['id'] + '/review'
        stale = mutation(api, 'post', review_url, {'expectedConcurrencyStamp': hold['concurrencyStamp']})
        assert stale.status == 409 and stale.json()['code'] == 'CONCURRENCY_CONFLICT'
        assert read(url + '/reservations?reviewRequired=true') == queued
        checks[CHECKS[3]] = True

        page.reload()
        review = page.get_by_role('button', name='تمت المراجعة' if lang == 'ar' else 'Revue effectuée', exact=True)
        expect(review).to_have_count(1)
        review.click()
        confirm = page.get_by_role('button', name='تأكيد تسجيل المراجعة' if lang == 'ar' else 'Confirmer la revue', exact=True)
        confirm.scroll_into_view_if_needed()
        expect(confirm).to_be_in_viewport()
        page.screenshot(path=out/'p1-10-review-confirmation.png')
        with page.expect_response('**/review') as reviewed:
            confirm.click()
        assert reviewed.value.status == 200
        completed = reviewed.value.json()
        assert completed['reviewCompletedAtUtc'] and completed['isAwaitingReview'] is False
        assert completed['reviewRequiredAtUtc'] == pending['reviewRequiredAtUtc']
        assert preserved_hold(completed) == preserved_hold(hold)
        assert read(url)['status'] == 'Suspended' and units()['QA-001']['status'] == 'Reserved'
        assert read(url + '/reservations?reviewRequired=true') == []
        page.reload()
        empty = page.get_by_text('لا توجد حجوزات بانتظار المراجعة.' if lang == 'ar'
                                 else 'Aucune réservation en attente de revue.', exact=True)
        expect(empty).to_be_visible()
        empty.scroll_into_view_if_needed()
        page.screenshot(path=out/'p1-10-review-completed.png')
        checks[CHECKS[4]] = True

        payload['propertyUnitId'] = units()['QA-002']['id']
        deny_new_hold()
        checks[CHECKS[5]] = True
        entries = read('/api/audit?limit=100')
        actor_id = read('/api/auth/me')['user']['id']
        review_events = [e for e in entries if e['eventType'] == 'PROJECT_RESERVATION_REVIEW_COMPLETED'
                         and e['targetEntityId'] == hold['id']]
        assert len(review_events) == 1 and review_events[0]['actorUserId'] == actor_id
        assert any(e['eventType'] == 'PROJECT_RESERVATION_DENIED'
                   and e['targetEntityId'] == project['id'] and e['actorUserId'] == actor_id for e in entries)
        checks[CHECKS[6]] = True
        assert not errors
        assert set(checks) == set(CHECKS) and all(value is True for value in checks.values())
        return checks
    except Exception as error:
        for frame in traceback.extract_tb(error.__traceback__):
            if frame.filename.endswith('/commercialization_review.py'):
                print(f'::error file=tests/browser/commercialization_review.py,line={frame.lineno}::'
                      f'P1-10 {lang}/{device}: {type(error).__name__} in {frame.name}', flush=True)
        raise
    finally:
        if page is not None:
            page.close()
