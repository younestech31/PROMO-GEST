# Phase 1 — Visual and practical acceptance, round 3 (handoff brief for the Google AI Studio workspace)

**Purpose.** Round 2 recorded 52 PASS / 11 FAIL, but a source review afterwards showed that five of those rows could not be proved by the preview at all: three were preview-parity gaps and one was mis-specified. This round re-executes the rows that are now honestly testable and closes the gap between what the preview does and what the product does.

**What this round may change:** verdicts on the checks listed in §5, with verbatim evidence.
**What this round may not change:** any release gate, any task status, or the classification of a parity gap into a product defect. `P1-09` stays `In Review / Pending` and `P1-10` stays `In Progress / Pending` no matter what comes back.

---

## 0. Paste this into the Google AI Studio workspace

> You are executing round 3 of the Phase 1 visual and practical acceptance for the PROMO GEST repository.
> Read §1 to §4 first. Execute every work package in §5 in **Arabic RTL first, then French LTR**, with a fresh re-seed between locales.
> The preview now enforces the same forced-password-change flow and the same customer phone rule as the ASP.NET Core API, so those rows are finally observable — do not skip them.
> Quote every failure verbatim, in the language it appeared in, and attach a screenshot for every scored row. Never summarise a failure, never mark a row PASS without a screenshot, and never mark a row you did not run.
> If a step cannot be executed in this environment, write `BLOCKED` and the reason. Do not invent evidence.

---

## 1. What changed since round 2

| Change | Where | What it means for this round |
|---|---|---|
| The demo entry marks the installation initialized | `apps/local-web/src/app/App.tsx` (`handlePreviewLogin`) | `W1-5` is fixed **in code**; this round is its first browser test |
| A refused route keeps its localized refusal | `App.tsx` (`AppContentRouter`), `routeRegistry.ts` | `W2-8b` is fixed **in code**; the refusal must now stay on screen with a «المساحة» / «Espace» action |
| The active nav item is marked without colour | `ErpShellLayout.tsx` | `W9-7` is fixed **in code**; check `aria-current`, the 2 px inline-start rule, and the heavier weight |
| The unique-administrator wording is visible text | `technical-admin/pages/UsersManagementView.tsx` | `W2-7` — the label must read «مدير النظام الوحيد» / «Admin Système Unique» without hovering |
| **Preview parity: forced password change** | `apps/local-web/dev-api-middleware.ts` | A created employee now starts with `mustChangePasswordAtNextLogin: true` and a 24-hour deadline, `POST /api/auth/change-password` exists and behaves like `AuthService.ChangePasswordAsync`, and an administrator reset re-flags the account. `W2-5` and `W2-8a` are **now testable** |
| **Preview parity: customer phone** | `dev-api-middleware.ts` | A phone whose digits fall outside 7–15 is refused with `400 CUSTOMER_PHONE_INVALID`. `W5-3` is **now testable** |
| Repository hygiene guard | `scripts/check-repository-hygiene.py` | Not visual; it only means the branch you receive installs cleanly |

Nothing else in the product changed. The English audit severity/summary strings, the native HTML5 validation tooltips, and the offline reload behaviour are **unchanged defects** — verify them as failures unless they now pass, and do not excuse them.

---

## 2. Environment

- `PROMOGEST_VITE_ONLY=1` on `http://127.0.0.1:5173`, Chromium, `1440×900` and `390×844`.
- Development build (`React.StrictMode` double-mount is active and must stay active).
- This is the **Vite in-memory preview**, not ASP.NET Core 10, not PostgreSQL 18, not staging. Say so in every evidence line.
- Arabic RTL first (`dir="rtl"`), then French LTR (`dir="ltr"`), each with a fresh re-seed (§3).

---

## 3. Seeding (per locale)

1. Complete the first-run wizard: organization name, wilaya `16`, default language = the locale under test, administrator account with a password of at least 10 characters.
2. From `مساحة المؤسسة` / `Espace Organisation` → **المستخدمون** / **Utilisateurs**, create **two** employees:
   - `karim.dir` (password `TempPass#2026`), no roles — this account also serves `W2-8b`;
   - `nadia.com` (password `TempPass#2026`), no roles.
3. Create one project in `التسويق` / `Commercialisation` with a code such as `DEMO-3-001`.
4. Add one building, one floor and at least two units so that a reservation can be attempted.
5. Add two customers to the project: one individual, one legal entity (see `W5-3`).
6. Upload a small PDF and a small image as project documents; keep one file larger than 25 MB and one `.exe` ready for `W7`.
7. Create one `Suspended` project (or suspend the demo project) for `W6-5` — observation only.
8. **Do not** skip the first login of `karim.dir`: it now triggers the forced password-change screen. Change its password to `NewPass#2026x` on that first login, record `W2-8a`, and use the new password for the rest of the run. Do the same for `nadia.com` when it first appears.

---

## 4. What `PASS` means here

- The behaviour you expected is visible in a screenshot **and** the console value that proves it, in the locale under test.
- A row that ends in `PASS` in one locale and `FAIL` in the other is recorded as **FAIL** with both results.
- A row that the preview structurally cannot exercise is recorded as `PARITY` (the reason must cite the file), never as `PASS`.
- Nothing in this round closes `P1-09`, `P1-10`, `P0-A01` or `P0-A04`.

---

## 5. Work packages

### W1 — Preview entry (regression of round-2 `W1-5`)

| # | Check | Expected |
|---|---|---|
| W1-1 | Cold load, click «الدخول إلى مساحة المعاينة» / «Ouvrir l’espace de démonstration» | Land on the workspace with the project list; **no reload**, no return to the wizard |
| W1-2 | Same, three consecutive hard reloads with cache disabled | Same result every time; record how long the button takes to become clickable |
| W1-3 | `GET /api/auth/preview-session` in the network panel | `200`, and the wizard never reappears after the click |
| W1-4 | After the entry, `document.documentElement.dir` | `rtl` in Arabic, `ltr` in French (the shell, not the wizard) |
| W1-5 | Reload the browser **after** the entry | Workspace or login card, never the first-run wizard |

### W2 — Users, roles and the single `SYSTEM_ADMIN` rule

| # | Check | Expected |
|---|---|---|
| W2-1 | Create `karim.dir` with a 10-character password | `201`, row appears, no console error |
| W2-2 | Create an employee with a 9-character password | Localized refusal, no row created |
| W2-3 | Create a second `SYSTEM_ADMIN` | Localized refusal, `SINGLE_SYSTEM_ADMIN_ONLY`, audit row written |
| W2-4 | Deactivate then activate `nadia.com` | Both succeed, audit rows written |
| W2-5 | Newly created employee row, before its first login | Badge «يتطلب تغيير كلمة المرور» / «Doit changer le mot de passe» is **visible** |
| W2-6 | Deactivate `demo.admin` | No deactivate control is offered for the system administrator (by design) |
| W2-7 | `demo.admin` row label | «مدير النظام الوحيد» / «Admin Système Unique» visible **without hovering** |
| W2-8a | First login as `karim.dir` with the temporary password | Forced password-change screen; wrong current password refused; a password shorter than 10 characters refused; the same password refused; a valid new password accepted; then the login card appears with «تم تغيير كلمة المرور» / «Mot de passe modifié» |
| W2-8b | After changing the password, sign in as `karim.dir` and open `/admin/users` directly in the address bar | A **localized refusal stays on screen** with a «المساحة» / «Espace» action; no silent bounce; no admin content rendered |
| W2-9 | Console, on the refusal screen | Record `document.activeElement`, whether the URL stays `/admin/users`, and whether the audit screen shows any `ACCESS_DENIED` row (**expected: none — record it as a failure of `W10-5`, not of `W2-8b`**) |

**Do not** report `W2-8b` as a route leak. `canAccessRoute` gates the route; what this round checks is the visibility of the refusal.

### W5 — Customers and phone validation (regression of round-2 `W5-3`)

| # | Check | Expected |
|---|---|---|
| W5-1 | Save a customer with phone `123` | Refusal with «أدخل رقم هاتف صحيحاً يحتوي على 7 إلى 15 رقماً.» / «Saisissez un numéro de téléphone valide de 7 à 15 chiffres.»; no row created |
| W5-2 | Same with `0555 12 34 56` | Saved, rendered identically in both locales |
| W5-3 | Same with a 16-digit number and with letters (`abc12345`) | Both refused with the same localized message |
| W5-4 | Edit an existing customer and set the phone to `12` | Refused on update as well; the stored value is unchanged |

### W9 — Shell, bidi, layout and keyboard

| # | Check | Expected |
|---|---|---|
| W9-1 | Active nav item in both locales | `aria-current="page"` on the active button, a visible 2 px inline-start rule, heavier weight; inactive items show no rule and nothing shifts by two pixels |
| W9-2 | No horizontal overflow on the ten top-level screens at `1440×900` and `390×844` | `document.documentElement.scrollWidth === window.innerWidth` |
| W9-3 | Keyboard only: `Tab` through nav → language switch → primary action | `:focus-visible` ring visible on each stop; record `outlineStyle`/`outlineWidth` |
| W9-4 | 200 % zoom at `1440×900` | No clipped labels, no overlapping controls |
| W9-5 | Bidi hygiene in RTL | Reference codes, GUIDs, dates, amounts and phones readable and unclipped; no doubled punctuation |

### W4 / W8 — Native HTML5 validation (unchanged defect, expected FAIL)

| # | Check | Expected |
|---|---|---|
| W4-1 | Submit an empty «إضافة مبنى» / «Ajouter un bâtiment» form | Record the exact tooltip text. Chromium renders it in the **browser UI language**, so an English tooltip is a product defect (the form does not suppress native validation), not a browser quirk |
| W8-1 | Empty wizard submit and the password strength hint | Record the exact strings (`chars`, `10–128 chars`, `Please fill out this field.`) if they persist |

### W7 — Documents

| # | Check | Expected |
|---|---|---|
| W7-1 | Upload a small PDF and a small image | Accepted, listed with size and date |
| W7-2 | Upload a file larger than 25 MB | Refused with the localized size message |
| W7-3 | Upload a `.exe` | Refused with the localized type message |
| W7-4 | Download an uploaded document | Same bytes; file name preserved |

### W6 — Reservation and ADR-0018

| # | Check | Expected |
|---|---|---|
| W6-1 | Reserve a unit on the `Commercialisation` project | Succeeds; unit becomes reserved |
| W6-2 | Cancel the reservation | Succeeds; unit available again |
| W6-3 | Suspension review queue | Rows render with the explicit «التسجيل ليس موافقة» / “not an approval” notice |

### W10 — Resilience and audit visibility

| # | Check | Expected |
|---|---|---|
| W10-1 | Abort `POST /api/auth/logout` (network offline) | Localized warning, session stays active, retry offered |
| W10-2 | Reload while offline | Record what the browser shows. `chrome-error://chromewebdata/` is **not** an application screen — record it exactly as it appears |
| W10-3 | Audit log in Arabic | Severity and summary columns: record every string that is still English, and every bidi inversion, verbatim |
| W10-4 | Visit `/admin/users` as an employee without `users.manage`, then open the audit log as the administrator | Record whether any access-denial row exists. **Expected: none** — that gap is open and is not fixed by this round |

---

## 6. Parity precheck already performed on the repository side (not visual evidence)

These were verified against the Vite middleware with `curl` on the branch that carries this brief, so the round does not have to discover them the hard way. They are **fixture behaviour, not product evidence**, and they close nothing:

| Behaviour | Observed |
|---|---|
| Create employee → `mustChangePasswordAtNextLogin` | `true`, deadline `now + 24 h` |
| `POST /api/auth/change-password` with a wrong current password | `401 PASSWORD_CURRENT_INVALID` |
| … with a 5-character password | `400 PASSWORD_TOO_SHORT` |
| … with the current password again | `400 PASSWORD_REUSE_NOT_ALLOWED` |
| … with a valid new password | `204`, sessions dropped, old cookie → `401 AUTH_REQUIRED`, old password → `401 AUTH_INVALID_CREDENTIALS`, new password → `200` with the flag cleared |
| Administrator password reset | Flag and 24-hour deadline restored |
| Customer phone `123` / `0555 12 34 56` | `400 CUSTOMER_PHONE_INVALID` / `201` |

If any of these behaves differently in the browser, that is a real finding — record it against `W2-8a` or `W5-3`.

---

## 7. Explicitly out of scope (do not test, do not score)

- `P1-17` / `REQ-A09` (language preference persistence) and `P1-19` / `REQ-A10` (account-security sessions screen): **implementation gaps**, the SPA calls neither route.
- `P1-11` (phone normalization), `P1-36` / `P1-38` (staging TLS), `P1-01` / `P1-35` (practitioner sign-offs), `P1-02` / `P1-34` (blocked items): need real hosts, real data or real signatures.
- `P1-15` / `REQ-B03`: implemented, not verified — this round may re-observe the last-manager `409` but cannot close it.
- ADR-0018 server-side denial (`PROJECT_NOT_COMMERCIALIZABLE`): the preview does not enforce it. It stays an observation (`W6-5`), never a test.
- CSRF, real cookies, lockout escalation across restarts, `.NET` middleware behaviour, PostgreSQL 18 state, and anything involving real credentials.

---

## 8. What to return

1. One row per check, per locale: `ID | locale | viewport | PASS/FAIL/PARITY/BLOCKED | observed (verbatim) | expected | screenshot path | console values`.
2. The totals, computed by you, and the run window in UTC.
3. Every console error with its full text.
4. The screenshots, named `<ID>-<locale>-<viewport>.png`.
5. One short paragraph per failed row explaining what a user would see.

---

## 9. How the repository will record the result

- The register is filled from your table **verbatim**; no failure is summarised away.
- A `FAIL` on `W1-5`, `W2-5`, `W2-7`, `W2-8a`, `W2-8b` or `W9-7` reopens that defect with your evidence attached.
- `PARITY` rows stay parity rows; they are not converted into defects by this round.
- `P1-09` stays `In Review / Pending`, `P1-10` stays `In Progress / Pending`, `P0-A01` / `P0-A04` stay `NOT_RUN`, Phase 1 stays `IN_PROGRESS`, and Phases 2–5 stay locked until a real ASP.NET Core 10 + PostgreSQL 18 acceptance exists.
