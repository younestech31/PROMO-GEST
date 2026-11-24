# P1-10 — Visual acceptance brief (handoff to the Google AI Studio workspace)

**Status of this file:** working handoff brief, not yet committed. It exists so the Google AI Studio
workspace can execute the manual Arabic RTL / French LTR browser acceptance of the suspension review
queue and then update the result registers. Nothing here changes product status by itself.

**Owner split (unchanged):** UI/visual implementation and manual bilingual acceptance are delegated to
Google AI Studio by Product Owner direction. Domain/Application/API policy remains with this repository.
Manual acceptance is what still blocks `P1-09` (sequence 10, `In Review / Pending`) and therefore
`P1-10` verification (`In Progress / Pending`).

---

## 1. What must be visually accepted

The operator review queue added by **PR #237** (merge `5498e2e9e9040afb83054c11c13964ae29164093`) and
documented by **PR #238** (main `a580b561c113a14c5cb569760db3aaa8b9d98b0c`):

| Requirement | What the reviewer must see |
|---|---|
| Queue contains only reservations awaiting review | Amber panel «طابور مراجعة التعليق» / «File de revue de suspension» with a count badge; rows are `Active` holds that have `reviewRequiredAtUtc` and no `reviewCompletedAtUtc` |
| Explicit review action | Button «تمت المراجعة» / «Revue effectuée» opens an inline confirmation carrying the row's concurrency stamp |
| Review ≠ approval | The mandatory note states the review does not approve the hold and does not lift the suspension, change the reservation status, the unit, the end date, or the project status |
| Register parity | The register below the queue shows «بانتظار المراجعة» / «En attente de revue» before, and «روجع في …» / «Revu le …» after |
| Arabic RTL | Panel, table, icons, dates, and reference codes all render correctly in RTL |
| French LTR | Same content renders correctly in LTR |
| No side effects | After review: status stays `Active`, unit stays `Reserved`, project stays `Suspended`, the second hold stays in the queue |

Files under test: `apps/local-web/src/modules/module-e-reservations/pages/ProjectSalesReservationsModal.tsx`,
`.../review.ts`, `.../api/reservationsApi.ts`, `apps/local-web/src/core/localization/translations.ts`,
`apps/local-web/dev-api-middleware.ts` (preview parity only), test `apps/local-web/src/utils/reservationReview.test.ts`.

## 2. Run the disposable demo (no .NET, no PostgreSQL, no Staging)

```bash
git fetch origin && git checkout main && git pull --ff-only   # main must be >= a580b561
npm ci
cd apps/local-web
env -u ASPNETCORE_URL -u SQL_HOST PROMOGEST_VITE_ONLY=1 npm run dev   # http://127.0.0.1:5173
```

- `PROMOGEST_VITE_ONLY=1` starts the in-memory contract preview. It must not be combined with
  `ASPNETCORE_URL` or any Cloud SQL variable; the policy throws instead of guessing.
- For an external preview host, add `PROMOGEST_VITE_ALLOW_EXTERNAL=1` **with exact**
  `PROMOGEST_VITE_ALLOWED_HOSTS` / `PROMOGEST_VITE_ALLOWED_ORIGINS`. Wildcards are rejected by
  `vitePreviewPolicy.ts` and must never be introduced.
- The in-memory store resets on every restart. Re-run the seeding script below afterwards.

## 3. Seed a project that has holds awaiting review

The demo project starts as `UnderConstruction`. Under ADR-0018 only `Commercialization` allows new
holds, so the sequence is: Commercialization → create two holds → Suspended (which stamps the review
marker). Save as `/tmp/seed_review_queue.py` and run with `python3` (stdlib only):

```python
import json, urllib.request, urllib.error, http.cookiejar, os
BASE = os.environ.get('BASE', 'http://127.0.0.1:5173')
PROJECT = '30000000-0000-0000-0000-000000000003'
cj = http.cookiejar.CookieJar(); op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
csrf = {'v': None}
def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header('X-Forwarded-Proto', 'http')
    if data is not None: req.add_header('Content-Type', 'application/json')
    if csrf['v'] and method not in ('GET', 'HEAD'): req.add_header('X-CSRF-TOKEN', csrf['v'])
    try:
        with op.open(req) as r:
            tok = r.headers.get('X-CSRF-TOKEN')
            if tok: csrf['v'] = tok
            raw = r.read().decode(); return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or '{}')
def body(p, status):
    return {'nameAr': p['nameAr'], 'nameFr': p['nameFr'], 'wilayaCode': p['wilayaCode'],
            'wilayaName': p['wilayaName'], 'municipality': p['municipality'], 'address': p.get('address'),
            'landTitleReference': p.get('landTitleReference'), 'buildingPermitNumber': p.get('buildingPermitNumber'),
            'buildingPermitDate': p.get('buildingPermitDate'), 'status': status,
            'estimatedBudgetDzd': p.get('estimatedBudgetDzd'), 'plannedBlocksCount': p.get('plannedBlocksCount'),
            'plannedUnitsCount': p.get('plannedUnitsCount'), 'expectedConcurrencyStamp': p['concurrencyStamp']}
print('session', call('GET', '/api/auth/preview-session')[0])          # disposable demo admin
_, p = call('GET', '/api/projects/' + PROJECT)
print('commercialization', call('PUT', '/api/projects/' + PROJECT, body(p, 'Commercialization'))[0])
_, st = call('GET', '/api/projects/%s/structure' % PROJECT)
units = [u for b in st['buildings'] for f in b['floors'] for u in f['units'] if u['status'] == 'AvailableForSale']
_, custs = call('GET', '/api/projects/%s/customers' % PROJECT)
holder = next(c for c in custs if c['status'] != 'Archived')
for u in units[:2]:
    print('hold', call('POST', '/api/projects/%s/reservations' % PROJECT,
          {'propertyUnitId': u['id'], 'projectCustomerId': holder['id'],
           'expiresAtUtc': '2027-01-31T12:00:00.000Z'})[0])
_, p2 = call('GET', '/api/projects/' + PROJECT)
print('suspended', call('PUT', '/api/projects/' + PROJECT, body(p2, 'Suspended'))[0])
_, q = call('GET', '/api/projects/%s/reservations?reviewRequired=true' % PROJECT)
print('queue size', len(q))   # expected: 2
```

Expected audit trail: `PROJECT_RESERVATION_SUSPENSION_REVIEW_REQUIRED` (Security) and
`PROJECT_RESERVATION_REVIEW_QUEUE_VIEWED` after the modal loads (`GET /api/audit`).

## 4. Acceptance checklist — run it twice (Arabic first, then French)

Navigate: login screen → «الدخول إلى مساحة المعاينة» / «Ouvrir l’espace de démonstration» → Projects →
open the demo project → tab «الحجوزات الداخلية» / «Réservations».

| # | Check | Arabic (RTL) expected | French (LTR) expected |
|---|---|---|---|
| 1 | Queue panel title and badge | «طابور مراجعة التعليق» + count `2` | «File de revue de suspension» + `2` |
| 2 | Panel sub-note | «…المراجعة لا تعتمد الحجز ولا ترفع التعليق.» | «…La revue n’approuve pas la réservation et ne lève pas la suspension.» |
| 3 | Queue columns | المرجع الداخلي، الوحدة، الزبون، تاريخ الطلب، انتهاء الحجز، إجراء | Référence interne, Unité, Client, Demande, Expiration, Action |
| 4 | Rows | `HOLD-DEMO-16-001-001` / `…-002`, units `A-00-01` / `A-00-02` | same |
| 5 | Register state before | «بانتظار المراجعة» in the «المراجعة» column | «En attente de revue» |
| 6 | Review action opens confirmation | «تسجيل مراجعة الحجز …» + the not-an-approval note + «تأكيد تسجيل المراجعة» / «تراجع» | «Enregistrer la revue de …» + note + «Confirmer la revue» / «Retour» |
| 7 | After confirming | Badge drops to `1`; register row shows «روجع في …» | «Revu le …» |
| 8 | No side effects | Row's status still «نشط», unit still reserved, project still «معلّق», other hold still in queue | «Active», reserved, «Suspendu» |
| 9 | Bidirectional text hygiene | Reference codes, dates, and numbers stay readable inside RTL; no clipped or overlapped text | No stray RTL artifacts, no double spacing around punctuation |
| 10 | Layout at 390×844 and 1440×900 | Amber panel and table scroll horizontally instead of overflowing the page; focus ring visible by keyboard | same |

Also confirm the reverse promise: nothing in the UI claims the review approved, released, cancelled, or
re-priced anything, and no contract/payment/accounting screen changed as a result.

## 5. Evidence to capture

- Screenshots: `p1-10-queue-ar-desktop.png`, `p1-10-queue-ar-mobile.png`, `p1-10-review-done-ar.png`,
  and the three French equivalents. 1440×900 and 390×844 viewports.
- Demo/fictional data only; never capture real customer data, credentials, or cookies.
- Store under `docs/evidence/p1-10/` (or the existing `public/assets/aistudio/` convention) with
  descriptive names, and note the commit SHA the preview was built from.

## 6. What to update when the run finishes

1. `docs/CURRENT-STATE-BASELINE.md` — `P1-09` and `P1-10` rows: record the browser result, the SHA, the
   viewports, and where the screenshots live. Keep `P1-09` `In Review` until its own acceptance passes.
2. `docs/REQUIREMENT-TRACEABILITY.md` — move the review-queue evidence from "automated only" to
   "automated + bilingual browser acceptance" **only** for the items actually seen.
3. Notion:
   - `P1-10` — page id `41b13e9e-d368-812f-9085-cd0cbe3fc962`. Set **Verification State** from `Pending`
     to the verified value, add a `Callout` with the result, viewport sizes and screenshot paths, and
     update **Last Verified**. Change **Task Status** off `In Progress` only if every checklist row passed.
   - `P1-09` — page id `41b13e9e-d368-8138-9c11-d3952be5b837`. Same rule; do not close it on the strength
     of the review queue alone.
   - Append the raw PASS/FAIL table (row by row, with the failing row quoted verbatim) so failures are
     actionable instead of summarised away.
4. If any row fails, record it as a defect with the locale, viewport, the exact string or element, and a
   screenshot; leave the statuses `Pending` and send the list back.

## 7. Honesty rules (do not relax these)

- This is the **Vite in-memory preview**, not Staging, not the ASP.NET Core API, and not PostgreSQL 18.
  Never write "Staging verified" or "production verified" for this run.
- Domain/Application/PG18 behaviour is proven by CI, not by the browser. Do not claim local .NET test or
  database results from this environment.
- Phase 1 stays `IN_PROGRESS`; Phases 2–5 stay locked. `P1-11` operational acceptance stays pending.
- No permission, CSRF, schema, migration, or deployment change is part of a visual acceptance run.

## 8. Known gap to route as a follow-up (do not "test" it here)

`apps/local-web/dev-api-middleware.ts` enforces the review queue and review endpoint, but it does **not**
enforce the ADR-0018 commercialisation gate: it will accept `POST /api/projects/{id}/reservations` on a
`Suspended` project, whereas the real API returns `409 PROJECT_NOT_COMMERCIALIZABLE`. A denial test in the
preview would therefore produce a misleading PASS. File it as a separate preview-parity task.

## 9. What comes back to the repository owner

PASS/FAIL per checklist row for Arabic and French, screenshot paths, the SHA tested, any defect list, and
the updated register rows. With that, `P1-10` verification can move off `Pending` honestly — and only
then.

---

## 10. Result register — 24 November 2026

**Verdict:** the suspension review queue passed **10/10 criteria in Arabic RTL and 10/10 in French LTR** on the
disposable in-memory Vite preview. This is UI evidence only.

| Field | Value |
|---|---|
| Date | 24 November 2026 |
| Environment | Vite dev preview, `PROMOGEST_VITE_ONLY=1`, `http://127.0.0.1:5173`, Chromium |
| Source under test | workspace aligned with PR #237 (`5498e2e9e9040afb83054c11c13964ae29164093`) plus this brief; the executor's workspace had no `.git`, so the SHA is reported by the executor and not re-resolved from a checkout |
| Viewports | 1440×900 and 390×844 |
| Seeding | `Commercialization` → two holds → `Suspended`; `reviewRequired=true` returned 2 rows; the audit log showed `PROJECT_RESERVATION_SUSPENSION_REVIEW_REQUIRED`, `PROJECT_RESERVATION_REVIEW_QUEUE_VIEWED`, `PROJECT_RESERVATION_REVIEW_COMPLETED` |
| Criteria 1–5 — queue panel title and badge, not-an-approval notice, six columns, both rows, pre-review register state | PASS / PASS |
| Criteria 6–8 — review button and inline confirmation, post-review state, absence of side effects | PASS / PASS |
| Criterion 9 — bidirectional text hygiene for references, codes, dates and numbers | PASS / PASS |
| Criterion 10 — layout and keyboard focus at both viewports (`docScrollWidth === innerWidth`, scrolling confined to the table container, visible `:focus-visible` ring) | PASS / PASS |
| Evidence | `docs/evidence/p1-10/` — `p1-10-queue-ar-desktop.png`, `p1-10-queue-ar-mobile.png`, `p1-10-review-done-ar.png`, `p1-10-queue-fr-desktop.png`, `p1-10-queue-fr-mobile.png`, `p1-10-review-done-fr.png` |
| Supporting unit test | `apps/local-web/src/utils/reservationReview.test.ts` 4/4 PASS |

### Defects recorded, still open

1. **Login preview button can stay hidden under `React.StrictMode`.** On a cold load of the dev preview the
   «الدخول إلى مساحة المعاينة» / «Ouvrir l’espace de démonstration» button does not appear until a
   `visibilitychange` event or the 60-second health poll, even though `/health/ready` already reports
   `previewMode: true`. Root cause: `pollHealth` in `App.tsx` sets `requestInFlight.current = true` on the first
   StrictMode mount; that mount is then discarded without clearing the flag, and the second mount returns early
   at the `requestInFlight.current` guard while the first mount's result is dropped because `mounted` is false.
   Scope: dev preview only; the production login path is unaffected. Not fixed here.
2. **Preview parity gap (unchanged).** `dev-api-middleware.ts` does not enforce `PROJECT_NOT_COMMERCIALIZABLE`,
   so a denial test in the preview would be misleading. Still a separate follow-up.

### Status kept deliberately

`P1-09` stays `In Review / Pending` (its own Staging/operator acceptance is still outstanding), `P1-10` stays
`In Progress / Pending`, `P1-11` operational acceptance stays pending, Phase 1 stays `IN_PROGRESS`, and Phases 2–5
stay locked. The passing run is Vite-preview bilingual UI evidence; it is not Staging, API or PostgreSQL 18
evidence and it closes neither gate.
