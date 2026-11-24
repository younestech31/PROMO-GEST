# Phase 1 — Visual and practical acceptance, round 2 (handoff brief for the Google AI Studio workspace)

**Status of this file:** handoff brief. It does **not** change any product status by itself, and no row in it is evidence until an executor has actually run it and the result register in §10 is filled in.

**Why round 2 exists.** Round 1 (PR #238 brief, PR #240 result register) closed the suspension review queue with 10/10 in Arabic RTL and 10/10 in French LTR on the Vite in-memory preview. That run recorded two defects, and `main` has since changed in ways that need their own visual re-check:

| Change on `main` | Commit | What it invalidates in round 1 |
|---|---|---|
| `requestInFlight` moved inside the `pollHealth` effect | `c1b10a9` (was `813bd48`) | Round 1 defect (1) — the preview-entry button that could stay hidden — is fixed in code but **has never been re-verified in a browser** |
| `package-lock.json` regenerated, four script modes restored | `c1b10a9` | Nothing visual; it only means the preview now installs cleanly with `npm ci` |

**Owner split (unchanged).** UI/visual implementation and manual bilingual acceptance are delegated to Google AI Studio by Product Owner direction. Domain, Application, API policy, schema and CI remain with this repository. This round is **verification and evidence only**: no app code, permission, schema, migration or deployment change is authorized by it.

---

## 0. Paste this into the Google AI Studio workspace

> You are the acceptance executor for the PROMO GEST Phase 1 visual and practical acceptance, **round 2**. Read `docs/PHASE-1-VISUAL-ACCEPTANCE-ROUND-2-BRIEF.md` from the repository and execute it exactly.
>
> Non-negotiables:
> 1. Run the **disposable Vite in-memory preview only** — `PROMOGEST_VITE_ONLY=1`, `http://127.0.0.1:5173`. Never write "Staging verified", "API verified", "PostgreSQL 18 verified", or "production verified". No `.NET`, no `psql`, no Cloud SQL in this round.
> 2. Execute the work packages **in the order W9 → W1 → W2 → W3 → W4 → W5 → W6 → W7 → W10 → W8**. W8 (first-run setup wizard) destroys demo access, so it runs last, on a freshly restarted server.
> 3. Each work package runs **Arabic RTL first, then French LTR**, with a fresh in-memory re-seed between the two locales.
> 4. Two viewports for every layout claim: `1440×900` and `390×844`.
> 5. Report **PASS / FAIL / BLOCKED per check**, never a summary instead of a row. Quote failing strings verbatim.
> 6. Change **no repository file** other than the result register (§10 of the brief), the screenshot files, and — if asked — nothing else. Do not commit, do not push, do not open a PR, do not touch migrations, permissions or configuration defaults.
> 7. Use **fictional data only**. Never capture real personal data, cookies, tokens, or `.env` contents in a screenshot.
> 8. Do not "test" the things §9 forbids. A PASS produced there is worse than no evidence.
>
> Deliverable: the filled §10 register (per-check table, defects with locale + viewport + verbatim string + screenshot path), the screenshot files, the SHA or archive identity of the workspace you ran, and the exact commands you used to start the server.

---

## 1. Task census — what actually still needs visual or practical verification

This is the review the round is built on: every Phase 1 item whose evidence is gated on a human or browser observation, and an honest verdict on whether *this* environment can move it.

| Task / requirement | Outstanding evidence | Runnable in the Vite preview? | Where it is covered |
|---|---|---|---|
| `P1-09` — users, roles and the single SYSTEM_ADMIN rule (`REQ-A05`) | Manual Arabic RTL / French LTR acceptance of the employee-account screen; the genuine Staging `SYSTEM_ADMIN` run and screenshot stay open regardless | **Yes** for the UI and the refusal behaviour | **W2** |
| `P1-10` — suspension review queue (`REQ-E0x`, ADR-0018) | Round 1 passed 10/10; **defect (1) fix unverified**; defect (2) is a parity gap, not testable here | **Yes** for the regression, **no** for the denial case | **W1**, **W6** |
| `P1-15` / `REQ-B03` — project members, capabilities, at least one ProjectManager | Manual bilingual acceptance of the project-access screen, including the last-manager refusal | **Yes** — the preview returns `409 PROJECT_LAST_MANAGER_REQUIRED` | **W3** |
| `P1-17` / `REQ-A09` — the user's own language preference persists | SPA wiring **and** acceptance | **No** — the SPA does not call `PUT /api/auth/preferred-language` at all (`handleLanguageChange` only updates local state) and the preview middleware does not implement the route. This is an **implementation gap, not a verification task**; do not attempt it, do not score it | §9 |
| `P1-19` / `REQ-A10` — account-security sessions screen | The screen itself, the IP/User-Agent privacy warning, bilingual acceptance | **No** — no `/api/auth/sessions` caller exists in the SPA. Implementation first | §9 |
| `P1-11` — canonical phone normalization | Authorized on-premises preflight, rehearsal, restore and operator sign-off | **No** — real PostgreSQL 18 on organization hardware, per its runbook | §9 |
| `P1-36`, `P1-38` — Caddy HTTPS on real Linux/Windows staging | Staging TLS acceptance | **No** — needs the real staging hosts | §9 |
| `P1-01`, `P1-35` — municipalities / practitioner sign-offs | 1,541 practitioner sign-offs, `W30-R007`, `communesCount = 0` | **No** | §9 |
| `P1-02`, `P1-34` — blocked items | Branch protection, dependency decisions | **No** | §9 |
| `P0-A01`, `P0-A04` — Phase 0 first-run and logout resilience | Manual operator acceptance (`NOT_RUN`); the automated browser run already passed | **Partially** — the wizard *steps* and the abort-logout *warning* can be inspected visually here, but **never** recorded as P0 closure, which requires the real API + PostgreSQL 18 protocol | **W8**, **W10** |

Everything below W1–W10 is scoped to that census. Nothing in this brief can close `P1-09`, `P1-11`, `P1-17`, `P1-19`, `P1-36`, `P1-38`, `P1-01`, `P1-02`, `P1-34`, `P1-35`, `P0-A01` or `P0-A04`.

---

## 2. Environment

```bash
git fetch origin && git checkout main && git pull --ff-only   # main must be >= c1b10a9
npm ci
cd apps/local-web
env -u ASPNETCORE_URL -u SQL_HOST PROMOGEST_VITE_ONLY=1 npm run dev   # http://127.0.0.1:5173
```

- `PROMOGEST_VITE_ONLY=1` selects the in-memory contract preview. It must not be combined with `ASPNETCORE_URL` or any Cloud SQL variable — the preview policy refuses instead of guessing.
- For a hosted/external preview add `PROMOGEST_VITE_ALLOW_EXTERNAL=1` **together with exact** `PROMOGEST_VITE_ALLOWED_HOSTS` / `PROMOGEST_VITE_ALLOWED_ORIGINS`. Wildcards are rejected by `vitePreviewPolicy.ts`; never introduce them, and never set the flag without the exact allow-list (that combination is the W-series negative test in §9, not a workaround).
- **The in-memory store resets on every restart**, and everything you create disappears with it. Restart between locales if you want a genuinely clean state.
- The preview starts **uninitialized**: the first screen is the first-run wizard, and that wizard carries the «الدخول إلى مساحة المعاينة» / «Ouvrir l’espace de démonstration» entry. Using that entry creates the disposable demo organization and signs you in. Manually initializing the wizard instead makes demo access unavailable until you restart the server — this is why **W8 runs last**.

## 3. Seeding

### 3.1 Demo workspace and a project in commercialization

Enter through the preview button, or call `GET /api/auth/preview-session`. The demo project is `30000000-0000-0000-0000-000000000003` (`DEMO-16-001`). Save this as `/tmp/seed_round2.py` and run it with `python3` (stdlib only):

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
print('session', call('GET', '/api/auth/preview-session')[0])
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

### 3.2 A second employee, for the project-team checks (W3)

Create one employee with the role set that carries `projects.access.manage` (use the roles list from `GET /api/users/roles`; do not guess a code). Record the username, the role codes, and whether the temporary password had to be changed on first login.

### 3.3 Documents (W7)

Prepare **two disposable files** in `/tmp`: one small PDF under 1 MiB and one file larger than the 25 MiB limit the preview enforces (`MAX_DOCUMENT_BYTES`). Their bytes are stored in the preview container's local filesystem only.

---

## 4. What "PASS" means here

A check passes only when the executor **saw** the described state, and can say where. "It should be there because the code says so" is a FAIL/`BLOCKED` with a comment, not a PASS. If a string differs from the anchor quoted in the tables below, record the string you actually saw — the anchors come from `apps/local-web/src/core/localization/translations.ts` and may lag behind the workspace you are given.

---

## 5. Work packages

Every work package: Arabic RTL first, then French LTR, each at `1440×900` and `390×844`, with the screen path and the clicked element recorded per check.

### W9 — Shell, bidi, layout and keyboard (run first; unblocks every other claim)

Path: preview entry screen → workspace → each top-level section.

| # | Check | How to observe |
|---|---|---|
| W9-1 | `document.documentElement.lang` and `dir` flip to `ar`/`rtl` and `fr`/`ltr` with the language switch | DevTools console |
| W9-2 | No horizontal page overflow at either viewport: `document.documentElement.scrollWidth === window.innerWidth` on every top-level screen | console, both locales |
| W9-3 | Wide tables scroll **inside** their container, not the page (`overflow-x-auto` region) | visual + console measure |
| W9-4 | Bidi hygiene: reference codes, GUIDs, dates, amounts and phone numbers stay readable and unclipped inside RTL; no doubled punctuation or stray direction marks in LTR | visual, quote any offender |
| W9-5 | Keyboard only: `Tab` reaches nav → language switch → primary action on each screen; the `:focus-visible` ring is visible (record `outlineStyle`/`outlineWidth` from the console) | keyboard |
| W9-6 | 200 % browser zoom at `1440×900`: no clipped labels, no overlapping controls | visual |
| W9-7 | The active nav item is distinguishable without relying on colour alone | visual, both locales |
| W9-8 | Dates render in the locale's convention and the same instant appears identically in both locales (only the format changes) | console + visual |

### W1 — Entry regression: the round-1 defect (1) must be gone

Server freshly started, store uninitialized.

| # | Check | Expected |
|---|---|---|
| W1-1 | Cold load of `http://127.0.0.1:5173/` — how long until «الدخول إلى مساحة المعاينة» / «Ouvrir l’espace de démonstration» is clickable | Visible within a few seconds, **without** a `visibilitychange` event and **without** waiting 60 s |
| W1-2 | Same, with `React.StrictMode` dev double-mount in effect (default dev build) | The button still appears; no console error |
| W1-3 | Five consecutive hard reloads (cache disabled) | Button appears every time; record the delays |
| W1-4 | `GET /health/ready` in the console shows `previewMode: true` before the button is clickable | True |
| W1-5 | Clicking it signs you in and lands on the workspace with projects listed | True |
| W1-6 | Reload while signed in | Session is restored, no flash of the wizard, no error |

This work package is the only evidence that `c1b10a9` fixed the defect. Do not describe it as a Staging or API result.

### W2 — `P1-09`: employees, roles and the single System Administrator (`REQ-A05`)

Path: workspace → «حسابات الموظفين» / «Comptes Employés».

| # | Check | Arabic (RTL) anchor | French (LTR) anchor |
|---|---|---|---|
| W2-1 | Screen title and subtitle | «إدارة حسابات الموظفين» | «Gestion des comptes employés» |
| W2-2 | Table headers | «اسم المستخدم»، «الاسم الكامل»، «الأدوار الوظيفية»، «الحالة»، «آخر دخول»، «الإجراءات» | Identifiant, Nom complet, Rôles, Statut, Dernière connexion, Actions |
| W2-3 | Create employee | «إضافة موظف جديد» → all required fields marked, save refuses an empty required field with a bilingual message | «Nouvel employé» |
| W2-4 | Temporary-password notice is shown on creation | «كلمة المرور التي تدخلها مؤقتة لمدة 24 ساعة…» | «Le mot de passe saisi est temporaire pendant 24 heures…» |
| W2-5 | New employee appears with «يتطلب تغيير كلمة المرور» badge | present | badge equivalent |
| W2-6 | Deactivate / reactivate that employee | «تعطيل» → «تفعيل», status pill changes, an audit row appears | Désactiver / Activer |
| W2-7 | The System Administrator cannot be deactivated | Refusal is shown in the UI (`CANNOT_DEACTIVATE_SYSTEM_ADMIN`); row shows «مدير النظام الوحيد» | Refusal shown; «Admin Système Unique» |
| W2-8 | Sign in as the new employee (after the forced password change) | Navigation shows only permitted sections; «حسابات الموظفين» is absent or blocked, and a direct attempt is refused in-language | Same restriction, French wording |
| W2-9 | Reset-password flow | «تعيين كلمة مرور» modal, temp-password notice repeated | «Réinitialiser mot de passe» |

Record the exact role codes you assigned — the acceptance is about the screen, not about inventing a permission matrix.

### W3 — `P1-15` / `REQ-B03`: project team and the last-ProjectManager refusal

Path: «دليل المشاريع» / «Annuaire des Projets» → project → «صلاحيات المشروع» / access management.

| # | Check | Expected |
|---|---|---|
| W3-1 | Access modal title | «إدارة صلاحيات الوصول للمشروع» / French equivalent |
| W3-2 | Member list shows name, project role, and the four capability flags | Present and legible in both locales |
| W3-3 | Assign the §3.2 employee as `ProjectManager` with at least one capability | Row appears with the new role; success feedback in-language |
| W3-4 | Change that member to a non-manager role **while a second manager exists** | Allowed |
| W3-5 | Remove/demote until only one `ProjectManager` remains, then attempt to demote that last one | **Refused**: `409 PROJECT_LAST_MANAGER_REQUIRED`, message visible and localized; the row is unchanged after reload |
| W3-6 | The refusal is not silent | No success toast; an error appears next to the control that triggered it |
| W3-7 | Audit trail | A `PROJECT_MEMBER_ASSIGNED` / access-change entry is visible in «سجل التدقيق الأمني» / «Journal d’Audit» after the change |

W3-5 is the only check that proves the invariant from the outside. If the preview shows a success instead of a refusal, that is a **FAIL** and a defect with the response body.

### W4 — Module C: property structure

Path: project → «العمارات والوحدات» / «Structure & lots».

| # | Check | Expected |
|---|---|---|
| W4-1 | Modal title and tabs | «الهيكل العقاري للمشروع» / French equivalent |
| W4-2 | Buildings, floors, units render with codes and statuses | Both locales, no clipped Arabic building names |
| W4-3 | Create a building → floor → unit (fictional names) | Each appears without a manual refresh |
| W4-4 | Unit status change | «تحديث الحالة» changes the pill; the sales-workflow notice «الحجز والبيع والتسليم تُدار عبر مسار البيع والعقارات…» remains visible and truthful (no direct sale from here) |
| W4-5 | Validation | Empty/invalid required field refused in-language |
| W4-6 | RTL table alignment at `390×844` | No overlap; horizontal scroll confined |

### W5 — Module D: parties and project customers (CRM)

Path: «دليل الأطراف» / «Répertoire Tiers», and project → «الزبائن والمهتمون» / «Clients & CRM».

| # | Check | Expected |
|---|---|---|
| W5-1 | Party directory loads with fictional parties; search/filter works | Both locales |
| W5-2 | Create a project customer with a fictional name and phone | Saved; appears in the list |
| W5-3 | Invalid phone | Refused with «أدخل رقم هاتف صحيحاً يحتوي على 7 إلى 15 رقماً.» / «Saisissez un numéro de téléphone valide de 7 à 15 chiffres.» |
| W5-4 | Duplicate customer in the same project | Refused with a localized duplicate message; record the code |
| W5-5 | Customer detail: status, preferred language, notes | Render correctly in RTL and LTR |
| W5-6 | Add an interaction/contact record | Appears in the timeline with localized date |
| W5-7 | The customer's **own** preferred language does not change the operator UI language | UI stays in the operator's chosen language |

### W6 — Module E: reservations, plus the round-1 queue regression

Path: project → «الحجوزات الداخلية» / «Réservations», with the §3.1 seed.

| # | Check | Expected |
|---|---|---|
| W6-1 | Review queue still matches round 1 | Amber panel «طابور مراجعة التعليق» / «File de revue de suspension», badge `2`, six columns |
| W6-2 | Record one review | Badge `2 → 1`, register shows «روجع في …» / «Revu le …» |
| W6-3 | No side effects after review | Hold still `Active`, unit still `Reserved`, project still `Suspended` |
| W6-4 | Cancel-hold flow (separate reservation) | Confirmation carries the concurrency stamp; cancellation is explicit and localized; the unit returns to `AvailableForSale` |
| W6-5 | New hold on a `Suspended` project | **Do not score this.** The preview does not enforce `PROJECT_NOT_COMMERCIALIZABLE`; record what happened as an observation only (see §9) |
| W6-6 | Modules F / G / H / I / J remain planned placeholders | No fake data, no conflicting claims of implemented features |

### W7 — Module K: documents

Path: project → documents.

| # | Check | Expected |
|---|---|---|
| W7-1 | Upload the small PDF | Listed with name, size, uploader, localized timestamp |
| W7-2 | Download it back | Byte-identical to what you uploaded (compare hashes) |
| W7-3 | Upload the >25 MiB file | Refused with a clear localized size message; **no** partial row |
| W7-4 | Unsupported extension (e.g. `.exe`) | Refused with a localized message — record the actual rule you observe, do not assume one |
| W7-5 | Delete or replace, if offered | Localized confirmation; list updates |
| W7-6 | RTL/LTR table and long file names | No clipping or overlap at both viewports |

### W10 — Connectivity resilience and audit cross-check

| # | Check | Expected |
|---|---|---|
| W10-1 | With the workspace open, switch DevTools to **Offline** and trigger an action | A localized banner/warning appears; no silent data loss; the failed action is reported in-language |
| W10-2 | Back online, retry | Action succeeds without a reload; banner clears |
| W10-3 | Reload while offline | A clear localized message, not a blank page |
| W10-4 | Abort a logout, if the flow allows it (preview only) | The session stays active and a localized warning with retry appears — **observation only**, never P0-A04 closure |
| W10-5 | «سجل التدقيق الأمني» / «Journal d’Audit» | Contains the events your run produced (login, user change, member assignment, review, access denials); time, actor, event, severity, summary columns all localized |
| W10-6 | Audit table at `390×844` | Horizontal scroll confined; severity badges legible in RTL |

### W8 — First-run setup wizard (run last, on a freshly restarted server)

| # | Check | Expected |
|---|---|---|
| W8-1 | Fresh server → first screen is the wizard, not the workspace | True |
| W8-2 | Wizard is fully localized in both locales, including field labels and validation messages | True; quote any untranslated string as a defect |
| W8-3 | Required-field validation | Refuses empty/invalid input in-language |
| W8-4 | Initialize with **fictional** organization data (fictional legal name, fictional fiscal identifiers) | Handoff to the login screen; the organization name is shown |
| W8-5 | Resubmitting setup | Refused with `SETUP_ALREADY_INITIALIZED`-style message in-language; no second organization |
| W8-6 | Demo entry after manual initialization | Unavailable, with an honest message instead of a silent failure — **observation only**; P0-A01 stays `NOT_RUN` |

---

## 6. Evidence to capture

- One screenshot per failing or notable check, named `<work-package>-<check>-<locale>-<viewport>.png`, e.g. `W3-5-ar-1440.png`. Round 1 stayed within six screenshots; this round needs fewer, targeted ones — do not photograph every passing row.
- Full-page screenshots only when the claim is about layout; otherwise crop to the panel under test.
- Include the console output for W9-2, W9-5 and W1-1..4.
- Record the identity of the workspace you ran: the commit SHA if `.git` is present, otherwise the archive name/date and how it was obtained. Never claim a SHA you could not resolve.
- Demo/fictional data only. No cookies, tokens, `.env` values or personal data in any image.

## 7. What to return

1. The filled register (§10), one row per check, `PASS` / `FAIL` / `BLOCKED` / `NOT APPLICABLE`, per locale.
2. A defect list: check id, locale, viewport, the exact string or element, the expected vs observed state, screenshot path, and severity (blocks the task / cosmetic).
3. The startup commands, the environment values used, and the workspace identity.
4. Anything the brief told you not to test but which looked wrong anyway — as an observation, clearly separated from the scored rows.

## 8. Honesty rules — do not relax these

- This is the **Vite in-memory preview**. It is not Staging, not the ASP.NET Core 10 API, not PostgreSQL 18, and not the production login path. Never write "verified", "accepted", or "closed" on that basis for any task.
- No status moves on the strength of this round alone: `P1-09` stays `In Review / Pending`, `P1-10` stays `In Progress / Pending`, `P1-11`, `P1-15`, `P1-17`, `P1-19`, `P1-36`, `P1-38` stay as they are, `P1-01`/`P1-35` stay `Deferred / Pending`, `P1-02`/`P1-34` stay `Blocked`, Phase 1 stays `IN_PROGRESS`, Phases 2–5 stay locked.
- A PASS on W2 does not close `P1-09`: its genuine `SYSTEM_ADMIN` Staging run and screenshot remain outstanding.
- A PASS on W1 does not close `P1-10`: `P1-09` still gates it.
- Do not derive product claims from the preview's convenience behaviours (session bootstrap, demo admin, seeded data).

## 9. Out of scope, and the one thing that must not be scored

| Item | Why |
|---|---|
| `P1-17` / `REQ-A09` language persistence | The SPA never calls `PUT /api/auth/preferred-language`; `handleLanguageChange` only updates local state, and the preview has no such route. Implementation gap, not a verification task |
| `P1-19` / `REQ-A10` sessions screen | No `/api/auth/sessions` caller in the SPA; nothing to look at until it exists |
| `P1-11` phone normalization | Authorized on-premises PostgreSQL 18 runbook; requires organization hardware, approval, backup and restore evidence |
| `P1-36`, `P1-38` Caddy HTTPS | Real Linux/Windows staging hosts |
| `P1-01`, `P1-35` reference data | 1,541 practitioner sign-offs; `W30-R007`; `communesCount = 0` |
| `P1-02`, `P1-34` | Blocked items; branch protection and dependency decisions |
| Real-API / Cloud SQL acceptance (Phase 0 §2) | A separate protocol with distinct migration/runtime identities and a disposable database. Not this round |
| **ADR-0018 denial on a suspended project** | `dev-api-middleware.ts` does **not** enforce `PROJECT_NOT_COMMERCIALIZABLE`, so the real API's `409` cannot be observed here. A PASS would be misleading — record it as an observation only (see W6-5) |

**Also out of scope:** every configuration negative test (e.g. `PROMOGEST_VITE_ALLOW_EXTERNAL` without an exact allow-list, `PROMOGEST_VITE_ONLY` combined with `ASPNETCORE_URL`) belongs to the repository's own unit tests; do not "fix" the policy to make a check pass.

---

## 10. Result register

**State: `AWAITING RUN`.** Nothing in this section is evidence until an executor has filled it in, dated it, and attached the screenshots. Round 1's register is §10 of `docs/P1-10-VISUAL-ACCEPTANCE-BRIEF.md`; this section is its successor for the W-series.

| Field | Value |
|---|---|
| Run date | _pending_ |
| Executor + environment | _pending_ |
| Workspace identity (SHA or archive) | _pending_ |
| Startup commands | _pending_ |
| Viewports | _pending_ |
| W9 shell | _pending_ |
| W1 entry regression (round-1 defect 1) | _pending_ |
| W2 `P1-09` users & roles | _pending_ |
| W3 `P1-15` / `REQ-B03` project team | _pending_ |
| W4 Module C structure | _pending_ |
| W5 Module D customers | _pending_ |
| W6 Module E reservations + queue regression | _pending_ |
| W7 Module K documents | _pending_ |
| W10 connectivity + audit | _pending_ |
| W8 setup wizard | _pending_ |
| Defects found | _pending_ |
| Statuses kept | `P1-09` `In Review / Pending`, `P1-10` `In Progress / Pending`, `P1-11`/`P1-15`/`P1-17`/`P1-19`/`P1-36`/`P1-38` unchanged, Phase 1 `IN_PROGRESS`, Phases 2–5 locked |

### How the repository owner will record the result

When the register comes back:

1. This file's §10 is filled in from the returned table, row by row, with failures quoted verbatim — never summarised.
2. `docs/P1-10-VISUAL-ACCEPTANCE-BRIEF.md` §10 gets a one-line cross-reference for the queue regression (W6-1..3) and for the round-1 defect closure (W1).
3. `docs/CURRENT-STATE-BASELINE.md`, `docs/REQUIREMENT-TRACEABILITY.md` and the Notion task pages are updated **in a separate baseline re-point commit**, because their claim block must move to the merge base of that PR. Anything that failed keeps its status `Pending`.
4. Any FAIL becomes a defect with an owner and is routed as its own task; it is not absorbed into a passing summary.
