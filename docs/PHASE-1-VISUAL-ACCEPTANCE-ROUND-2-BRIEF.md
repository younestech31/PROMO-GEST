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

**State: `EXECUTED (DISPOSABLE VITE IN-MEMORY PREVIEW ONLY)` — 2026-11-24.** Executed in order `W9 → W1 → W2 → W3 → W4 → W5 → W6 → W7 → W10 → W8` (Arabic RTL first, then French LTR on a freshly restarted server; W8 ran last on a freshly restarted uninitialized server in each locale).

| Field | Value |
|---|---|
| Run date | 2026-11-24 (`11:14–11:54 UTC`) |
| Executor + environment | Automated Chromium (`playwright-cli --browser=chromium`) against **disposable Vite in-memory preview only** (`PROMOGEST_VITE_ONLY=1`, `http://127.0.0.1:5173`, `environmentMode: "ViteDevContractPreview"`, `previewMode: true`). Not Staging, not ASP.NET Core 10 API, not PostgreSQL 18, not production. |
| Workspace identity | No `.git` directory present in `/app/applet` container workspace (pre-loaded workspace filesystem snapshot; no commit SHA resolvable). |
| Startup commands & env | `ASPNETCORE_URL="" SQL_HOST="" SQL_DB_NAME="" SQL_USER="" SQL_PASSWORD="" SQL_ADMIN_USER="" SQL_ADMIN_PASSWORD="" PROMOGEST_VITE_ONLY=1 ./node_modules/.bin/vite --config apps/local-web/vite.config.ts --port=5173` (restarted cleanly before AR W8, before FR pass, and before FR W8). |
| Viewports | `1440×900` (desktop), `390×844` (mobile), plus `720×450` (200% zoom at `1440×900` for `W9-6`). |
| W9 shell | AR: **7 PASS / 1 FAIL** (`W9-7`) · FR: **7 PASS / 1 FAIL** (`W9-7`) |
| W1 entry regression (round-1 defect 1) | AR: **5 PASS / 1 FAIL** (`W1-5` blocking) · FR: **5 PASS / 1 FAIL** (`W1-5` blocking) |
| W2 `P1-09` users & roles | AR: **6 PASS / 3 FAIL** (`W2-5`, `W2-7`, `W2-8`) · FR: **6 PASS / 3 FAIL** (`W2-5`, `W2-7`, `W2-8`) |
| W3 `P1-15` / `REQ-B03` project team | AR: **7 PASS / 0 FAIL** · FR: **7 PASS / 0 FAIL** |
| W4 Module C structure | AR: **5 PASS / 1 FAIL** (`W4-5`) · FR: **5 PASS / 1 FAIL** (`W4-5`) |
| W5 Module D customers | AR: **6 PASS / 1 FAIL** (`W5-3`) · FR: **6 PASS / 1 FAIL** (`W5-3`) |
| W6 Module E reservations + queue regression | AR: **5 PASS / 0 FAIL / 1 OBS** (`W6-5`) · FR: **5 PASS / 0 FAIL / 1 OBS** (`W6-5`) |
| W7 Module K documents | AR: **5 PASS / 0 FAIL / 1 N/A** (`W7-5`) · FR: **5 PASS / 0 FAIL / 1 N/A** (`W7-5`) |
| W10 connectivity + audit | AR: **3 PASS / 2 FAIL** (`W10-3`, `W10-5`) **/ 1 OBS** (`W10-4`) · FR: **3 PASS / 2 FAIL** (`W10-3`, `W10-5`) **/ 1 OBS** (`W10-4`) |
| W8 setup wizard | AR: **3 PASS / 2 FAIL** (`W8-2`, `W8-3`) **/ 1 OBS** (`W8-6`) · FR: **3 PASS / 2 FAIL** (`W8-2`, `W8-3`) **/ 1 OBS** (`W8-6`) |
| Defects found | **10 distinct defect patterns** observed across both locales (`W1-5` blocking, `W9-7`, `W2-5`, `W2-7`, `W2-8`, `W4-5`, `W5-3`, `W10-3`, `W10-5`, `W8-2`/`W8-3` + `W8-4` FR locale flip note). See defect table below. |
| Statuses kept | `P1-09` `In Review / Pending`, `P1-10` `In Progress / Pending`, `P1-11`/`P1-15`/`P1-17`/`P1-19`/`P1-36`/`P1-38` unchanged, `P1-01`/`P1-35` `Deferred / Pending`, `P1-02`/`P1-34` `Blocked`, `P0-A01`/`P0-A04` `NOT_RUN`, Phase 1 `IN_PROGRESS`, Phases 2–5 locked. |

### 10.1 Per-check result register (Arabic RTL & French LTR)

#### W9 — Shell, bidi, layout and keyboard

| Check | Path & control | Arabic (RTL) result & observation | French (LTR) result & observation |
|---|---|---|---|
| `W9-1` | Entry & workspace → header language group (`العربية` / `Français`) | **PASS** — `lang="ar"`, `dir="rtl"` confirmed on entry and workspace. | **PASS** — `lang="fr"`, `dir="ltr"` confirmed on entry and workspace after clicking `Français`. |
| `W9-2` | All 10 sidebar `<aside nav button>` screens (`1440×900`, `390×844`) | **PASS** — `scrollWidth === innerWidth` (`1440/1440`, `390/390`) on all 10 screens (see §10.2). | **PASS** — `scrollWidth === innerWidth` (`1440/1440`, `390/390`) on all 10 screens (see §10.2). |
| `W9-3` | Wide tables across `Territorial`, `HR`, `Rapports`, `Users`, `Audit` at `390×844` | **PASS** — All wide tables (`565/272`, `428/356`, `430/272`, `794/356`, `755/356`) scroll inside `.overflow-x-auto`. | **PASS** — All wide tables (`368/356`, `509/272`, `514/356`, `557/272`, `936/356`, `767/356`) scroll inside `.overflow-x-auto`. |
| `W9-4` | Bidi hygiene across workspace, modals, CRM, reservations, documents | **PASS** — `DEMO-16-001`, phone numbers, timestamps, `DZD`, SHA-256 hashes unclipped on workspace/CRM/reservations/docs. (Audit `التفاصيل` RTL bidi defect scored under `W10-5`.) | **PASS** — Codes, numbers, timestamps, `DZD`, and bilingual names render cleanly without stray marks. |
| `W9-5` | `Tab` traversal: nav → language switcher → primary action | **PASS** — Reaches nav (`2px solid`), `تسجيل الخروج`, project switcher (`1px auto`), `العربية`/`Français` (`2px solid`), `عرض الملف` (`1px auto`). | **PASS** — Reaches nav (`2px solid`), `Déconnexion`, `Changer de projet` (`1px auto`), `العربية`/`Français` (`2px solid`), `Voir le profil` (`1px auto`). |
| `W9-6` | Workspace at 200% zoom (`720×450` CSS px) | **PASS** — `720/720`, zero clipped or overlapping controls. | **PASS** — `720/720`, zero clipped or overlapping controls. |
| `W9-7` | Sidebar active nav item styling (`aside nav button`) | **FAIL** — Active button (`مساحة المؤسسة`) uses color classes only (`bg-teal-800 text-white`): `ariaCurrent: null`, `borderWidth: 0px`, `fontWeight: 500`, `::before/::after: none`. Evidence: `docs/evidence/p1-round-2/W9-7-ar-1440.png`. | **FAIL** — Active button (`Espace Organisation`) uses color classes only (`bg-teal-800 text-white`): `ariaCurrent: null`, `borderLeftWidth: 0px`, `fontWeight: 500`, `::before/::after: none`. Evidence: `docs/evidence/p1-round-2/W9-7-fr-1440.png`. |
| `W9-8` | Same-instant date rendering (`Audit` table first row) | **PASS** — Renders locale format `24‏/11‏/2026، 11:19 ص` (note: French uses 12h `AM` suffix). | **PASS** — Renders `24/11/2026 11:41 AM` (minor note: 12h `AM` suffix instead of 24h in `fr`). |

#### W1 — Entry regression (round-1 defect 1)

| Check | Path & control | Arabic (RTL) result & observation | French (LTR) result & observation |
|---|---|---|---|
| `W1-1` | Cold load `http://127.0.0.1:5173/` → preview button | **PASS** — «الدخول إلى مساحة المعاينة» visible & enabled in `1,729 ms` without `visibilitychange` or 60 s wait. | **PASS** — After `Français` switch on entry, «Ouvrir l’espace de démonstration» visible & enabled (`53 ms` post-load; reloads `568–1,046 ms`). |
| `W1-2` | Default dev `React.StrictMode` double-mount | **PASS** — Button renders cleanly; zero uncaught JS/page errors (only expected initial `401` on `/api/auth/me`). | **PASS** — Button renders cleanly; zero uncaught JS/page errors (only expected initial `401` on `/api/auth/me`). |
| `W1-3` | 5 consecutive cache-disabled hard reloads (`Network.setCacheDisabled`) | **PASS** — Enabled all 5 times: `1,180 ms`, `920 ms`, `1,137 ms`, `986 ms`, `1,142 ms`. | **PASS** — Enabled all 5 times: `612 ms`, `1,046 ms`, `568 ms`, `647 ms`, `607 ms` (resets to `ar` on uninitialized reload; switched to `Français`). |
| `W1-4` | `GET /health/ready` precedes clickable button | **PASS** — `previewMode: true`, `environmentMode: "ViteDevContractPreview"` observed before button clickable on cold load + all 5 reloads. | **PASS** — `previewMode: true`, `environmentMode: "ViteDevContractPreview"` observed before button clickable on all 5 reloads. |
| `W1-5` | Click preview entry button on fresh uninitialized server | **FAIL (BLOCKING)** — `GET /api/auth/preview-session` returned `200`, **but** UI stayed stuck on setup wizard («تهيئة مؤسسة الترقية العقارية») until manual reload. Evidence: `docs/evidence/p1-round-2/W1-5-ar-1440.png`. | **FAIL (BLOCKING)** — `GET /api/auth/preview-session` returned `200`, **but** UI stayed stuck on setup wizard («Initialisation de l'entreprise immobilière») until manual reload. Evidence: `docs/evidence/p1-round-2/W1-5-fr-1440.png`. |
| `W1-6` | Reload while signed in | **PASS** — Workspace restores directly (`المركز المحلي للمؤسسة`), `wizardVisible: false`. | **PASS** — Workspace restores directly without wizard flash (`wizardVisible: false`; language resets to `ar` per §9 `P1-17`). |

#### W2 — `P1-09`: employees, roles and single System Administrator (`REQ-A05`)

| Check | Path & control | Arabic (RTL) result & observation | French (LTR) result & observation |
|---|---|---|---|
| `W2-1` | Sidebar → «حسابات الموظفين» / «Comptes Employés» | **PASS** — Title «إدارة حسابات الموظفين». | **PASS** — Title «Gestion des comptes employés». |
| `W2-2` | Users table `thead th` | **PASS** — `["اسم المستخدم", "الاسم الكامل", "الأدوار الوظيفية", "الحالة", "آخر دخول", "الإجراءات"]`. | **PASS** — `["Identifiant", "Nom complet", "Rôles", "Statut", "Dernière connexion", "Actions"]`. |
| `W2-3` | Create modal (`إضافة موظف جديد` / `Nouvel employé`) empty submit | **PASS** — Required `*` fields marked; empty submit refused with localized Arabic errors. | **PASS** — Empty submit refused with French errors (`"L'identifiant doit contenir au moins 3 caractères."`, `"Le nom complet est obligatoire."`, `"Adresse e-mail invalide."`, `"Le mot de passe exige au moins 10 caractères, une majuscule, une minuscule et un chiffre."`). |
| `W2-4` | Temporary-password notice on creation | **PASS** — Shows exact «كلمة المرور التي تدخلها مؤقتة لمدة 24 ساعة…» notice. | **PASS** — Shows «Le mot de passe saisi est temporaire pendant 24 heures. L’employé doit le remplacer à sa première connexion avant tout accès aux données…». |
| `W2-5` | New employee (`karim.dir` / `nadia.com`, roles `COMMERCIAL_MANAGER, PROJECT_DIRECTOR`) shows temp-password badge | **FAIL** — Row created and listed (`karim.dir`), **but** no «يتطلب تغيير كلمة المرور» badge appeared. Evidence: `docs/evidence/p1-round-2/W2-5-ar-1440.png`. | **FAIL** — Row created and listed (`nadia.com`), **but** no password-change-required badge appeared. Evidence: `docs/evidence/p1-round-2/W2-5-fr-1440.png`. |
| `W2-6` | Deactivate / reactivate employee | **PASS** — `تعطيل` / `تفعيل` flipped status pill and logged `USER_DEACTIVATED` / `USER_ACTIVATED`. | **PASS** — `Désactiver` / `Activer` flipped status pill (`Actif` ↔ `Désactivé`) and logged audit events. |
| `W2-7` | `SYSTEM_ADMIN` row & deactivation refusal | **FAIL** — `demo.admin` row displays «مدير النظام» (not «مدير النظام الوحيد») and omits the «تعطيل» button, so `CANNOT_DEACTIVATE_SYSTEM_ADMIN` UI refusal cannot be triggered. Evidence: `docs/evidence/p1-round-2/W2-5-ar-1440.png`. | **FAIL** — `demo.admin` row displays `"Administrateur Système"` (not `"Admin Système Unique"`) and omits `Désactiver` (`["Modifier rôles", "Réinitialiser mot de passe"]`), so `CANNOT_DEACTIVATE_SYSTEM_ADMIN` UI refusal cannot be triggered. Evidence: `docs/evidence/p1-round-2/W2-5-fr-1440.png`. |
| `W2-8` | Sign in as new employee (`karim.dir` / `nadia.com`) + direct `/admin/users` visit | **FAIL** — (1) No forced password-change screen appeared after initial creation or password reset; (2) Sidebar hid admin sections, **but** direct URL `/admin/users` silently redirected to `/` with no in-language refusal notice. Evidence: `docs/evidence/p1-round-2/W2-8-ar-1440.png`. | **FAIL** — (1) No forced password-change screen appeared (`forcedPwScreen: 0`); (2) Sidebar hid admin sections, **but** direct URL `/admin/users` silently redirected to `/` with no in-language refusal notice. Evidence: `docs/evidence/p1-round-2/W2-8-fr-1440.png`. |
| `W2-9` | Reset password (`تعيين كلمة مرور` / `Réinitialiser mot de passe`) | **PASS** — Modal repeats 24h temp-password notice and persists reset (`USER_PASSWORD_RESET` audited; forced-change gap tracked in `W2-8`). | **PASS** — Modal repeats 24h temp-password notice and persists `NadiaReset#2026` (`USER_PASSWORD_RESET` audited; forced-change gap tracked in `W2-8`). |

#### W3 — `P1-15` / `REQ-B03`: project team and last-ProjectManager refusal

| Check | Path & control | Arabic (RTL) result & observation | French (LTR) result & observation |
|---|---|---|---|
| `W3-1` | Projects → `DEMO-16-001` → «صلاحيات المشروع» / «Accès projet» | **PASS** — Title «إدارة صلاحيات الوصول للمشروع». | **PASS** — Title `"Gestion des accès au projet"`. |
| `W3-2` | Member list fields & 4 capabilities | **PASS** — Displays full name, project role, and all 4 capability flags cleanly. | **PASS** — Displays `Nadia Benkhelifa (nadia.com)`, `Chef de Projet · Voir les finances / Gérer les ventes / Suivre les travaux / Gérer les documents locaux`. |
| `W3-3` | Assign §3.2 employee (`karim.dir` / `nadia.com`) as `ProjectManager` + capabilities | **PASS** — Row appears immediately with `ProjectManager` and 4 capabilities (note: list updates live without a separate toast). | **PASS** — `nadia.com` appears immediately as `Chef de Projet` with all 4 capabilities. |
| `W3-4` | Demote member while second `ProjectManager` (`amina.pm` / `youssef.pm`) exists | **PASS** — Second `ProjectManager` assigned, then demoted cleanly to `CommercialAgent` while first remained `ProjectManager`. | **PASS** — `youssef.pm` assigned as second `Chef de Projet`, then demoted cleanly to `Agent Commercial`. |
| `W3-5` | Attempt to demote last remaining `ProjectManager` | **PASS** — Refused `409 Conflict` (`PROJECT_LAST_MANAGER_REQUIRED`), banner `"يجب أن يحتفظ المشروع بمدير مشروع واحد نشط على الأقل."`, unchanged after reload, `390×844` `390/390`. Evidence: `docs/evidence/p1-round-2/W3-5-ar-1440.png`. | **PASS** — Refused `409 Conflict` (`PROJECT_LAST_MANAGER_REQUIRED`), banner `"Le projet doit conserver au moins un chef de projet actif."`, `nadia.com` unchanged after reload, `390×844` `390/390`. Evidence: `docs/evidence/p1-round-2/W3-5-fr-1440.png`. |
| `W3-6` | Refusal visibility | **PASS** — No success toast; red error banner rendered prominently at top of modal. | **PASS** — No success toast; red error banner rendered prominently at top of modal. |
| `W3-7` | Audit trail (`سجل التدقيق الأمني` / `Journal d’Audit`) | **PASS** — `PROJECT_MEMBER_ASSIGNED` entries visible in audit table. | **PASS** — `PROJECT_MEMBER_ASSIGNED` entries (`nadia.com` & `youssef.pm`) visible in audit table. |

#### W4 — Module C: property structure

| Check | Path & control | Arabic (RTL) result & observation | French (LTR) result & observation |
|---|---|---|---|
| `W4-1` | Projects → `DEMO-16-001` → «العمارات والوحدات» / «Bâtiments et unités» | **PASS** — Modal «الهيكل العقاري للمشروع» with Buildings / Floors / Units sections. | **PASS** — Modal `"Structure immobilière du projet"` with `Bâtiments` / `Étages` / `Unités immobilières`. |
| `W4-2` | Existing buildings/floors/units render | **PASS** — `BLOC-A`..`BLOC-C` and units render unclipped. | **PASS** — `BLOC-A`..`BLOC-C` (`6 Étages · En construction` / `Planifié`) render unclipped. |
| `W4-3` | Create Building → Floor → Unit (`BLOC-T` → `9` → `T-901`) | **PASS** — Each entity appeared immediately without manual refresh. | **PASS** — `BLOC-T · Bâtiment Test Est` → `9 · Étage 9 Test` → `T-901` each appeared immediately without refresh. |
| `W4-4` | Unit status change & sales-workflow notice | **PASS** — «تحديث الحالة» changed `T-901` (`مخططة` → `مسحوبة`); notice «الحجز والبيع والتسليم تُدار عبر مسار البيع والعقارات…» remained visible. | **PASS** — `Mettre à jour le statut` changed `T-901` (`En construction` → `Retiré`); notice `"La réservation, la vente et la livraison seront gérées par le circuit commercial et contractuel, et non depuis la structure immobilière."` remained visible. |
| `W4-5` | Empty required field validation (Building form) | **FAIL** — Relies on browser HTML5 `required` validation (`"Please fill out this field."` in English) instead of an in-language Arabic refusal. | **FAIL** — Relies on browser HTML5 `required` validation (`"Please fill out this field."` in English) instead of an in-language French refusal. |
| `W4-6` | Mobile layout (`390×844`) | **PASS** — `390/390`, zero overlap or horizontal page overflow. | **PASS** — `390/390`, clean stacked cards, zero overflow. |

#### W5 — Module D: parties and project customers (CRM)

| Check | Path & control | Arabic (RTL) result & observation | French (LTR) result & observation |
|---|---|---|---|
| `W5-1` | «دليل الأطراف» / «Répertoire Tiers» search | **PASS** — Directory loaded fictional parties; search filtered matches. | **PASS** — `"Répertoire central des tiers"` loaded; search input filtered cleanly. |
| `W5-2` | Create customer («الزبائن والمهتمون» / «Clients & prospects» → `إضافة` / `Ajouter`) | **PASS** — Created `نور الدين لعروسي` (`0550776655`). | **PASS** — Created `Samir Benali` (`0550778899`). |
| `W5-3` | Invalid phone `"123"` (`ياسين قاسمي` / `Karim Boudiaf`) | **FAIL** — Accepted and saved (`201 Created`, listed `ياسين قاسمي / 123`) instead of refusing with «أدخل رقم هاتف صحيحاً يحتوي على 7 إلى 15 رقماً.». Evidence: `docs/evidence/p1-round-2/W5-3-ar-1440.png`. | **FAIL** — Accepted and saved (`201 Created`, listed `Karim Boudiaf / 123`) instead of refusing with `"Saisissez un numéro de téléphone valide de 7 à 15 chiffres."`. Evidence: `docs/evidence/p1-round-2/W5-3-fr-1440.png`. |
| `W5-4` | Duplicate customer in same project | **PASS** — Refused `409 Conflict` (`CUSTOMER_DUPLICATE`), `"يوجد زبون بالاسم ورقم الهاتف نفسيهما في هذا المشروع."`. | **PASS** — Refused `409 Conflict` (`CUSTOMER_DUPLICATE`), `"Un client portant le même nom et le même numéro existe déjà dans ce projet."`. |
| `W5-5` | Customer detail view | **PASS** — Renders RTL (`نور الدين لعروسي · شخص طبيعي · مهتم / محتمل`); preferred language editable inside `تعديل البيانات`. | **PASS** — Renders LTR (`Samir Benali · Personne physique · Prospect`, `Téléphone : 0550778899`). |
| `W5-6` | Add interaction/contact record | **PASS** — Added `مكالمة تعريفية`; rendered in timeline with localized timestamp `24‏/11‏/2026، 11:30 ص`. | **PASS** — Added `Appel de présentation`; rendered in `Historique des communications (1)` with `Appel · 24 nov. 2026, 11:50`. |
| `W5-7` | Customer `preferredLanguage` independence + `390×844` | **PASS** — `preferredLanguage: 'fr'` kept operator UI `ar`/`rtl`; `390/390`. | **PASS** — `preferredLanguage: 'ar'` kept operator UI `fr`/`ltr`; `390/390`. |

#### W6 — Module E: reservations & round-1 queue regression (§3.1 seed)

| Check | Path & control | Arabic (RTL) result & observation | French (LTR) result & observation |
|---|---|---|---|
| `W6-1` | Projects → «الحجوزات» / «Réservations» | **PASS** — Amber panel «طابور مراجعة التعليق», badge `2`, 6 columns (`HOLD-DEMO-16-001-001`, `-002`). | **PASS** — Amber panel `"File de revue de suspension"`, badge `2`, 6 columns (`HOLD-DEMO-16-001-003`, `-004`). |
| `W6-2` | Record one review (two-click confirm) | **PASS** — «تمت المراجعة» → «تأكيد تسجيل المراجعة» decremented badge `2 → 1`; register stamped `روجع في 24‏/11‏/2026، 11:32 ص`. | **PASS** — `Revue effectuée` → `Confirmer la revue` decremented badge `2 → 1`; register stamped `Revu le 24 nov. 2026, 11:51`. |
| `W6-3` | No side effects after review | **PASS** — Reviewed hold remained `نشط`, unit remained `Reserved`, project remained `معلّق`. | **PASS** — Reviewed hold (`HOLD-DEMO-16-001-004`) remained `Active`, `A-00-02` remained `Reserved`, project remained `Suspendu`. |
| `W6-4` | Cancel separate unreviewed hold (`HOLD-…-002` AR / `HOLD-…-003` FR) | **PASS** — Cancellation sent `expectedConcurrencyStamp` + required reason (`تأكيد الإلغاء`); unit `A-00-02` returned to `AvailableForSale`. | **PASS** — Sent `{"reason":"Annulation test round 2 suite à suspension","expectedConcurrencyStamp":"ebb5ae3b-b230-40bc-ad20-2f0fbd45c927"}` (`200 OK`); hold flipped to `Annulée`, `A-00-01` returned to `Disponible à la vente`; `390×844` `390/390`. |
| `W6-5` | New hold form on `Suspended` project | **OBSERVATION ONLY (NOT SCORED)** — «إنشاء حجز» form remained enabled while project was `معلّق` (per §9, `dev-api-middleware.ts` does not enforce `PROJECT_NOT_COMMERCIALIZABLE`). | **OBSERVATION ONLY (NOT SCORED)** — `Créer une réservation` form remained enabled while project was `Suspendu`. |
| `W6-6` | Project workspace → Modules F / G / H / I / J | **PASS** — All five render planned placeholders (`مخطط / قيد التطوير`) with no conflicting feature claims. | **PASS** — All five (`F. Contrats`, `G. Finances`, `H. Chantier`, `I. Achats`, `J. Comptabilité`) render `Planifié / En préparation`. |

#### W7 — Module K: documents

| Check | Path & control | Arabic (RTL) result & observation | French (LTR) result & observation |
|---|---|---|---|
| `W7-1` | Projects → «وثائق المشروع» / «Documents» → upload `/tmp/test-small.pdf` | **PASS** — Listed `test-small.pdf`, `أخرى · 45 B`, uploader `مدير المعاينة التجريبية`, `24‏/11‏/2026، 11:33 ص`, `بصمة SHA-256`. | **PASS** — Listed `test-small.pdf`, `Autres · 45 B`, uploader `مدير المعاينة التجريبية`, `24 nov. 2026, 11:52`, `Empreinte SHA-256`. |
| `W7-2` | Click «تنزيل» / «Télécharger» | **PASS** — `200 OK`, SHA-256 `5a838678058f6de375e8635b5f2fea47a4e5f07cb1a882a44b10f39abc6f34ff` byte-identical to `/tmp/test-small.pdf`. | **PASS** — `200 OK`, SHA-256 `5a838678058f6de375e8635b5f2fea47a4e5f07cb1a882a44b10f39abc6f34ff` byte-identical to `/tmp/test-small.pdf`. |
| `W7-3` | Upload `/tmp/test-oversize.pdf` (`25.00 MB` > 25 MiB) | **PASS** — Refused `400`: `"حجم الملف يجب أن يكون أكبر من صفر ولا يتجاوز 25 ميغابايت."`, no partial row added (`2` rows unchanged). Evidence: `docs/evidence/p1-round-2/W7-3-ar-1440.png`. | **PASS** — Refused `400`: `"Le fichier doit être non vide et ne pas dépasser 25 Mo."`, no partial row added (`2` rows unchanged). Evidence: `docs/evidence/p1-round-2/W7-3-fr-1440.png`. |
| `W7-4` | Upload `/tmp/test-blocked.exe` | **PASS** — Refused `400`: `"امتداد الملف غير مسموح به."`; UI states rule: `"PDF وصور ومستندات Office وTXT وCSV · الحد الأقصى 25 MB"`, no partial row. Evidence: `docs/evidence/p1-round-2/W7-4-ar-1440.png`. | **PASS** — Refused `400`: `"L’extension du fichier n’est pas autorisée."`; UI states rule: `"PDF, images, Office, TXT, CSV · 25 MB maximum"`, no partial row. Evidence: `docs/evidence/p1-round-2/W7-4-fr-1440.png`. |
| `W7-5` | Delete or replace, if offered | **NOT APPLICABLE** — No delete or replace control is offered in the modal. | **NOT APPLICABLE** — No delete or replace control is offered in the modal. |
| `W7-6` | Long filename (`dossier-technique-residence-el-manar-tranche-02-lotissement-nord-alger-est-v2.pdf`) at `1440×900` & `390×844` | **PASS** — Wraps cleanly with zero overlap/clipping (`1440/1440`, `390/390`, `modalSW: 390`). | **PASS** — Wraps cleanly with zero overlap/clipping (`1440/1440`, `390/390`, `modalSW: 390`). |

#### W10 — Connectivity resilience and audit cross-check

| Check | Path & control | Arabic (RTL) result & observation | French (LTR) result & observation |
|---|---|---|---|
| `W10-1` | Offline action (`setOffline(true)`) | **PASS** — Org profile offline save showed `"تعذّر إتمام العملية حالياً. يرجى المحاولة مجدداً."` with form inputs intact; Documents `تحديث القائمة` showed `"تعذر تحميل وثائق المشروع."` (note: visible doc list cleared to `(0)` while offline). Evidence: `docs/evidence/p1-round-2/W10-1-ar-1440.png`. | **PASS** — Documents `Actualiser` offline showed `"Impossible de charger les documents du projet."` (note: visible doc list cleared to `(0)` while offline; no server data loss). Evidence: `docs/evidence/p1-round-2/W10-1-fr-1440.png`. |
| `W10-2` | Back online (`setOffline(false)`), retry without reload | **PASS** — Documents `تحديث القائمة` cleared the error banner and restored all `(3)` documents without reload. | **PASS** — Documents `Actualiser` cleared the error banner and restored all `(3)` documents without reload. |
| `W10-3` | Reload while offline (`page.reload()` with `setOffline(true)`) | **FAIL** — Browser hit `net::ERR_INTERNET_DISCONNECTED` (`chrome-error://chromewebdata/`) and displayed a blank page instead of a localized offline message. Evidence: `docs/evidence/p1-round-2/W10-3-ar-1440.png`. | **FAIL** — Browser hit `net::ERR_INTERNET_DISCONNECTED` (`chrome-error://chromewebdata/`) and displayed a blank page instead of a localized offline message. Evidence: `docs/evidence/p1-round-2/W10-3-fr-1440.png`. |
| `W10-4` | Abort logout (`POST /api/auth/logout` aborted) | **OBSERVATION ONLY (NOT SCORED)** — Session stayed active and displayed `"تعذّر تأكيد تسجيل الخروج من الخادم. بقيت الجلسة نشطة؛ تحقق من الاتصال ثم أعد المحاولة."` with `"إعادة المحاولة"`. | **OBSERVATION ONLY (NOT SCORED)** — Session stayed active and displayed `"Le serveur n’a pas confirmé la déconnexion. La session reste active ; vérifiez la connexion puis réessayez."` with `"Réessayer"`. |
| `W10-5` | «سجل التدقيق الأمني» / «Journal d’Audit» localization & completeness | **FAIL** — Headers localized (`التاريخ والوقت`, `الفاعل`, `الحدث`, `المستوى`, `التفاصيل`, `المصدر`) and run actions recorded (`85` rows), **but** `المستوى` (`"Info"`, `"Security"`) and `التفاصيل` remain untranslated English with RTL bidi punctuation inversion (e.g. `.'Listed 4 customer(s) in project 'DEMO-16-001`), and direct `/admin/users` visit emitted no access-denial event. Evidence: `docs/evidence/p1-round-2/W10-5-ar-1440.png`. | **FAIL** — Headers localized (`Horodatage`, `Acteur`, `Événement`, `Sévérité`, `Résumé`, `Adresse IP`) and run actions recorded (`96` rows), **but** `Sévérité` (`"Info"`, `"Security"`) and `Résumé` (`"Uploaded document..."`) remain English, and direct `/admin/users` visit emitted no access-denial event. Evidence: `docs/evidence/p1-round-2/W10-5-fr-1440.png`. |
| `W10-6` | Audit table at `390×844` | **PASS** — `390/390`, table (`tW: 931`, `scW: 356` AR; `tW: 944`, `scW: 356` FR) confined in `.overflow-x-auto`; severity badges legible. Evidence: `docs/evidence/p1-round-2/W10-6-ar-390.png`. | **PASS** — `390/390`, table (`tW: 944`, `scW: 356`) confined in `.overflow-x-auto`; severity badges legible. |

#### W8 — First-run setup wizard (freshly restarted uninitialized server)

| Check | Path & control | Arabic (RTL) result & observation | French (LTR) result & observation |
|---|---|---|---|
| `W8-1` | Fresh uninitialized server (`isInitialized: false`) → `http://127.0.0.1:5173/` | **PASS** — Renders first-run setup wizard (`تهيئة مؤسسة الترقية العقارية`), not workspace; `390/390` on `390×844`. | **PASS** — After `Français` switch, renders `"Initialisation de l'entreprise immobilière"`; `390/390` on `390×844`. |
| `W8-2` | Full localization of wizard labels, hints & messages | **FAIL** — Password-strength hint renders untranslated English `"chars"` (`0-9 · ✓ a-z · A-Z · chars 128–10` in RTL) alongside untranslated `sysadmin`/`contact@entreprise.dz` placeholders. Evidence: `docs/evidence/p1-round-2/W8-3-ar-1440.png`. | **FAIL** — Password-strength hint renders untranslated English `"chars"` (`· 10–128 chars · A-Z · ✓ a-z · 0-9`). Evidence: `docs/evidence/p1-round-2/W8-3-fr-1440.png`. |
| `W8-3` | Required-field & input validation | **FAIL** — Submitting with empty HTML5 `required` fields triggers English browser tooltip (`"Please fill out this field."`); custom JS validation (`"الاسم القانوني للمؤسسة مطلوب."`, `"كلمة المرور يجب أن تحتوي على 10 أحرف على الأقل..."`, `"تأكيد كلمة المرور غير مطابق."`) only surfaces when bypassing `required` (`novalidate`) or entering non-empty weak/mismatched values. Evidence: `docs/evidence/p1-round-2/W8-3-ar-1440.png`. | **FAIL** — Submitting with empty HTML5 `required` fields triggers English browser tooltip (`"Please fill out this field."`); custom JS validation (`"La raison sociale est obligatoire."`, `"Le mot de passe doit contenir au moins 10 caractères..."`, `"La confirmation du mot de passe ne correspond pas."`) only surfaces under `novalidate` or non-empty weak/mismatched values. Evidence: `docs/evidence/p1-round-2/W8-3-fr-1440.png`. |
| `W8-4` | Initialize with fictional organization data | **PASS** — Submitted `شركة الهضاب للترقية العقارية ذ.م.م` (AR) / `SARL Les Hauts Plateaux Promotion` (FR) with fictional fiscal IDs; handed off to Login showing the exact org name (minor note: when FR form kept `Langue par défaut` at `"العربية"`, login handoff switched UI back to Arabic). | **PASS** — Handed off to Login displaying `"SARL Les Hauts Plateaux Promotion"` (switched UI to `ar` matching default `Langue par défaut` option `العربية`). |
| `W8-5` | Resubmit setup (`/setup` navigation + `POST /api/setup/initialize`) | **PASS** — Navigating to `/setup` redirects to `/`; `POST /api/setup/initialize` with CSRF token returns `409` `{"code":"SETUP_ALREADY_INITIALIZED","message":"Installation has already been initialized."}` (note: API message is English). | **PASS** — Navigating to `/setup` redirects to `/`; `POST /api/setup/initialize` with CSRF token returns `409` `{"code":"SETUP_ALREADY_INITIALIZED","message":"Installation has already been initialized."}`. |
| `W8-6` | Demo entry after manual initialization | **OBSERVATION ONLY (NOT SCORED)** — Demo button remains visible & clickable on Login screen; clicking it triggers `409 PREVIEW_DEMO_NOT_AVAILABLE` displaying untranslated English `"Demo access is only available before a real organization is initialized in this preview server."` in both AR and FR. | **OBSERVATION ONLY (NOT SCORED)** — Same behavior: demo button stays clickable and displays English `"Demo access is only available before a real organization is initialized in this preview server."`. |

### 10.2 Console & measurement evidence (`W9-2`, `W9-5`, `W1-1..4`)

- **`W9-2` (`scrollWidth / innerWidth` across all 10 top-level routes):**
  - AR (`1440×900` / `390×844`): `مساحة المؤسسة` (`/` `1440/1440`, `390/390`), `دليل المشاريع` (`/projects` `1440/1440`, `390/390`), `دليل الأطراف` (`/organization/parties` `1440/1440`, `390/390`), `ملف المؤسسة` (`/organization/profile` `1440/1440`, `390/390`), `المرجع الإقليمي` (`/organization/territorial-reference` `1440/1440`, `390/390`), `سجل الموظفين (HR)` (`/organization/employees` `1440/1440`, `390/390`), `تقارير المحفظة` (`/reports` `1440/1440`, `390/390`), `حسابات الموظفين` (`/admin/users` `1440/1440`, `390/390`), `سجل التدقيق الأمني` (`/admin/audit` `1440/1440`, `390/390`), `التشخيص المحلي` (`/admin/diagnostics` `1440/1440`, `390/390`).
  - FR (`1440×900` / `390×844`): `Espace Organisation` (`1440/1440`, `390/390`), `Annuaire des Projets` (`1440/1440`, `390/390`), `Répertoire Tiers` (`1440/1440`, `390/390`), `Profil Organisation` (`1440/1440`, `390/390`), `Référentiel Territorial` (`1440/1440`, `390/390`), `Employés (RH)` (`1440/1440`, `390/390`), `Rapports Portefeuille` (`1440/1440`, `390/390`), `Comptes Employés` (`1440/1440`, `390/390`), `Journal d’Audit` (`1440/1440`, `390/390`), `Diagnostics Serveur` (`1440/1440`, `390/390`).
- **`W9-5` (`:focus-visible` via `Tab`):**
  - AR: sidebar nav buttons `outlineStyle: "solid", outlineWidth: "2px"` → `تسجيل الخروج` (`solid`, `2px`) → project switcher (`auto`, `1px`) → `العربية`/`Français` (`solid`, `2px`) → `عرض الملف` (`auto`, `1px`).
  - FR: sidebar nav buttons `outlineStyle: "solid", outlineWidth: "2px"` → `Changer le mot de passe` & `Déconnexion` (`solid`, `2px`) → `Changer de projet Ctrl+K` (`auto`, `1px`) → `العربية`/`Français` (`solid`, `2px`) → `Voir le profil` (`auto`, `1px`).
- **`W1-1..4` (Cold load + 5 cache-disabled hard reloads + `/health/ready`):**
  - AR: cold clickable `1,729 ms` (`lang: "ar"`, `dir: "rtl"`, `visibilityState: "visible"`); 5 cache-disabled reloads: `1,180 ms`, `920 ms`, `1,137 ms`, `986 ms`, `1,142 ms`; `/health/ready` returned `{"status":"Ready","databaseConnected":false,"isInitialized":false,"environmentMode":"ViteDevContractPreview","previewMode":true}` before button became clickable on cold load and all 5 reloads. Zero JS `pageerror`s; 2 expected `401` console entries per load from initial `/api/auth/me` check.
  - FR: cold ready `53 ms` after initial navigation (`lang: "fr"` after switch, `dir: "ltr"`); 5 cache-disabled reloads: `612 ms`, `1,046 ms`, `568 ms`, `647 ms`, `607 ms`; all 5 reloads verified `/health/ready` `previewMode: true`, `environmentMode: "ViteDevContractPreview"`.

### 10.3 Defects found (verbatim evidence)

| Defect / Check | Locale(s) | Viewport | Verbatim string / element | Expected vs observed | Screenshot | Severity |
|---|---|---|---|---|---|---|
| `W1-5` | AR, FR | `1440×900` | Button «الدخول إلى مساحة المعاينة» / «Ouvrir l’espace de démonstration» on `FirstRunSetupWizard` | Expected landing on workspace with projects listed after clicking preview entry; observed `GET /api/auth/preview-session` returned `200`, **but** UI stayed stuck on setup wizard («تهيئة مؤسسة الترقية العقارية» / «Initialisation de l'entreprise immobilière») until manual reload (`setupState.isInitialized` not updated in client state). | `docs/evidence/p1-round-2/W1-5-ar-1440.png`, `docs/evidence/p1-round-2/W1-5-fr-1440.png` | **Blocks task** |
| `W9-7` | AR, FR | `1440×900` | Active `<aside nav button>` (`مساحة المؤسسة` / `Espace Organisation`) | Expected active nav distinction without relying on color alone; observed `bg-teal-800 text-white` only (`ariaCurrent: null`, `borderWidth: 0px`, `fontWeight: 500`, `::before/::after: none`). | `docs/evidence/p1-round-2/W9-7-ar-1440.png`, `docs/evidence/p1-round-2/W9-7-fr-1440.png` | **Major** |
| `W2-5` | AR, FR | `1440×900` | Employee rows `karim.dir` (AR) / `nadia.com` (FR) in Users table | Expected «يتطلب تغيير كلمة المرور» / equivalent badge on newly created account; observed no badge (`mustChangePasswordAtNextLogin` not active in preview). | `docs/evidence/p1-round-2/W2-5-ar-1440.png`, `docs/evidence/p1-round-2/W2-5-fr-1440.png` | **Major** |
| `W2-7` | AR, FR | `1440×900` | `demo.admin` row in Users table | Expected «مدير النظام الوحيد» / `"Admin Système Unique"` and UI refusal `CANNOT_DEACTIVATE_SYSTEM_ADMIN`; observed row label «مدير النظام» / `"Administrateur Système"` and no `تعطيل` / `Désactiver` button to trigger UI refusal. | `docs/evidence/p1-round-2/W2-5-ar-1440.png`, `docs/evidence/p1-round-2/W2-5-fr-1440.png` | **Major** |
| `W2-8` | AR, FR | `1440×900` | Login as `karim.dir` / `nadia.com` + direct `/admin/users` navigation | Expected forced password-change flow and in-language refusal alert on `/admin/users`; observed direct workspace login with no forced change (`forcedPwScreen: 0`), and `/admin/users` silently redirected to `/` with zero refusal message. | `docs/evidence/p1-round-2/W2-8-ar-1440.png`, `docs/evidence/p1-round-2/W2-8-fr-1440.png` | **Blocks task** |
| `W4-5` | AR, FR | `1440×900` | Add Building form empty submit | Expected in-language refusal; observed browser HTML5 native `required` tooltip `"Please fill out this field."` in English. | — | **Minor** |
| `W5-3` | AR, FR | `1440×900` | Customers CRM add form (`ياسين قاسمي` / `Karim Boudiaf`, phone `"123"`) | Expected refusal with «أدخل رقم هاتف صحيحاً يحتوي على 7 إلى 15 رقماً.» / `"Saisissez un numéro de téléphone valide de 7 à 15 chiffres."`; observed `201 Created` saved and rendered `"123"` in customer list. | `docs/evidence/p1-round-2/W5-3-ar-1440.png`, `docs/evidence/p1-round-2/W5-3-fr-1440.png` | **Major** |
| `W10-3` | AR, FR | `1440×900` | Browser `page.reload()` while `setOffline(true)` | Expected clear localized offline message; observed `net::ERR_INTERNET_DISCONNECTED` (`chrome-error://chromewebdata/`) blank Chromium error screen. | `docs/evidence/p1-round-2/W10-3-ar-1440.png`, `docs/evidence/p1-round-2/W10-3-fr-1440.png` | **Major** |
| `W10-5` | AR, FR | `1440×900` | Audit log cells (`المستوى` / `Sévérité`, `التفاصيل` / `Résumé`) | Expected fully localized columns and access-denial logging; observed severity (`"Info"`, `"Security"`) and summaries (`"Listed 4 customer(s) in project 'DEMO-16-001'."`) untranslated in English, RTL bidi inversion (`.'Listed 4 customer(s)...`), and no access-denial event on `/admin/users` visit. | `docs/evidence/p1-round-2/W10-5-ar-1440.png`, `docs/evidence/p1-round-2/W10-5-fr-1440.png` | **Major** |
| `W8-2` / `W8-3` | AR, FR | `1440×900` | Setup wizard password hint & empty submit (`"chars 128–10"`, `"10–128 chars"`, `"Please fill out this field."`) | Expected full AR/FR localization and in-language empty validation; observed untranslated `"chars"` in password strength row and English HTML5 `"Please fill out this field."` on empty submit. | `docs/evidence/p1-round-2/W8-3-ar-1440.png`, `docs/evidence/p1-round-2/W8-3-fr-1440.png` | **Minor** |

### 10.4 Observations only (not scored, per §5 / §9)

- **`W6-5` (Observation only):** On `Suspended` project `DEMO-16-001`, the «إنشاء حجز» / «Créer une réservation» form controls remain enabled in the Vite preview (`dev-api-middleware.ts` does not enforce `PROJECT_NOT_COMMERCIALIZABLE`, per §9).
- **`W10-4` (Observation only):** Aborting `POST /api/auth/logout` kept the active session intact and showed localized warning banners (`"تعذّر تأكيد تسجيل الخروج من الخادم. بقيت الجلسة نشطة؛ تحقق من الاتصال ثم أعد المحاولة."` + `"إعادة المحاولة"` in AR; `"Le serveur n’a pas confirmé la déconnexion. La session reste active ; vérifiez la connexion puis réessayez."` + `"Réessayer"` in FR). Does **not** close `P0-A04`.
- **`W8-6` (Observation only):** After manual setup initialization (`W8-4`), the «الدخول إلى مساحة المعاينة» / «Ouvrir l’espace de démonstration» button remained visible and clickable on the login card and triggered `409 PREVIEW_DEMO_NOT_AVAILABLE` with untranslated English message `"Demo access is only available before a real organization is initialized in this preview server."`. Does **not** close `P0-A01`.
- **Minor UI/W8-4 observations:** In `W7` (`وثائق المشروع` / `Documents`), Chromium's native `<input type="file">` displays `"No file chosen Choose File"` in English; in `W8-4` (FR), submitting the wizard while `Langue par défaut` stayed `"العربية"` flipped the handoff login screen back to Arabic. All §9 out-of-scope items (`P1-17`, `P1-19`, `P1-11`, `P1-36`, `P1-38`, `P1-01`, `P1-02`, `P1-34`, `P1-35`, real-API/Cloud SQL, negative Vite policy tests) were intentionally not tested or scored.

### How the repository owner will record the result

When the register comes back:

1. This file's §10 is filled in from the returned table, row by row, with failures quoted verbatim — never summarised.
2. `docs/P1-10-VISUAL-ACCEPTANCE-BRIEF.md` §10 gets a one-line cross-reference for the queue regression (W6-1..3) and for the round-1 defect closure (W1).
3. `docs/CURRENT-STATE-BASELINE.md`, `docs/REQUIREMENT-TRACEABILITY.md` and the Notion task pages are updated **in a separate baseline re-point commit**, because their claim block must move to the merge base of that PR. Anything that failed keeps its status `Pending`.
4. Any FAIL becomes a defect with an owner and is routed as its own task; it is not absorbed into a passing summary.
