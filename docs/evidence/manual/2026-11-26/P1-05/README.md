# P1-05 — Project Budget Privacy & `CanViewFinancials` Enforcement

1. **Task ID & Canonical Reference:** `P1-05` — `src/PromoGest.Api/Controllers/ProjectsController.cs`, `src/PromoGest.Api/Services/ProjectService.cs`, `apps/local-web/src/modules/module-b-projects/pages/ProjectWorkspaceView.tsx` / `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` (external Notion page blocked by login wall in unauthenticated container; executed against repository implementation).
2. **Tested Commit SHA:** `a4e1f6daa828d01d481900f1051dcc335da7e25` (cryptographically verified via SHA-256 against GitHub `main` HEAD; workspace has no `.git` / `NO_GIT`).
3. **Environment & Browser:** Real ASP.NET Core 10 (`PromoGest.Api.dll`, `Development` mode, `http://127.0.0.1:5155`) + Vite real-API proxy (`PROMOGEST_VITE_ONLY=0`, `http://127.0.0.1:4173`) + isolated disposable PostgreSQL 18.6 database `promogest_qa_p1`; `headless Chromium` (`playwright-cli` 0.1.22).
4. **Ordered Execution Steps (all 4 profiles: `ar-desktop` 1440×900, `ar-mobile` 390×844, `fr-desktop` 1440×900, `fr-mobile` 390×844):**
   1. Signed in as `qa.pm` (`PROJECT_DIRECTOR`, assigned `ProjectManager` with `CanViewFinancials = true` on `QA-P1-001`), opened `/projects/<p1_id>/settings`, verified `#ws-budget` input visible, updated estimated budget from `245000000` to `250000000`, saved (`PUT /api/projects/<p1_id>` -> `200`).
   2. Reloaded `/projects/<p1_id>/overview` in `ar-desktop` (`1440×900`): verified formatted amount `250.000.000,00 دج`; switched to `fr-mobile` (`390×844`, `scrollWidth <= innerWidth`): verified `250 000 000,00 DZD`.
   3. Signed in as `qa.site` (`SITE_ENGINEER`, `CanViewFinancials = false` on `QA-P1-001`), opened `/projects` directory (`ar-desktop`), `/projects/<p1_id>/overview` in `ar-mobile` (`390×844`) and `fr-desktop` (`1440×900`), and `/projects/<p1_id>/settings`: verified numeric budget never rendered, masked indicator `—` with `"محجوب — صلاحية الاطلاع المالي غير مفعّلة."` / `"Masqué — droit financier requis sur le projet."` shown, and `#ws-budget` absent (`count === 0`).
   4. Verified `GET /api/projects`, `GET /api/projects/directory`, and `GET /api/projects/<p1_id>` for `qa.site` all returned `estimatedBudgetDzd: null`, and direct `PUT /api/projects/<p1_id>` with `estimatedBudgetDzd: 999999` returned `403 FORBIDDEN_PROJECT_UPDATE`.
   5. Signed in as `qaadmin` (`SYSTEM_ADMIN` without `ProjectManager` + `CanViewFinancials` membership on `QA-P1-001`): verified `GET /api/projects/<p1_id>` returned `estimatedBudgetDzd: null` and direct `PUT` attempting `estimatedBudgetDzd: 999999` returned `403 PROJECT_FINANCIAL_ACCESS_DENIED`.
   6. Queried PostgreSQL 18 `projects` and `audit_logs` to confirm `250000000.00` persisted, `PROJECT_FINANCIALS_VIEWED` recorded on authorized views, and `ACCESS_DENIED` recorded for unauthorized updates.
5. **Acceptance Criteria Results:**
   - Authorized user (`CanViewFinancials: true` + `ProjectManager`) views, edits, and persists project budget across AR/FR Desktop/Mobile: **PASS**
   - Unauthorized member (`qa.site`, `CanViewFinancials: false`) sees masked `—` indicator and zero `#ws-budget` edit input; API returns `estimatedBudgetDzd: null` across list/directory/detail endpoints: **PASS**
   - Direct unauthorized budget modification rejected server-side (`403 FORBIDDEN_PROJECT_UPDATE` for `qa.site`, `403 PROJECT_FINANCIAL_ACCESS_DENIED` for `qaadmin`) with `ACCESS_DENIED` audit log: **PASS**
   - Authorized financial viewing writes `PROJECT_FINANCIALS_VIEWED` audit entries: **PASS**
6. **Captured Genuine Browser Screenshots (synthetic data only):**
   - `p1_05_ard_pm_overview.png` (`ar-desktop` 1440×900, `qa.pm` authorized budget visible)
   - `p1_05_frm_pm_overview.png` (`fr-mobile` 390×844, `qa.pm` authorized budget visible, zero overflow)
   - `p1_05_arm_site_masked.png` (`ar-mobile` 390×844, `qa.site` masked budget)
   - `p1_05_frd_site_masked.png` (`fr-desktop` 1440×900, `qa.site` masked budget)
7. **Sanitized API & Database Query Results:**
   - `PUT /api/projects/<p1_id>` (`qa.pm`) -> `200 OK`; DB `SELECT code, estimated_budget_dzd FROM projects WHERE code='QA-P1-001';` -> `QA-P1-001 | 250000000.00`.
   - `qa.site` `GET /api/projects`, `/api/projects/directory`, `/api/projects/<p1_id>` -> `estimatedBudgetDzd: null`; `PUT` -> `403 FORBIDDEN_PROJECT_UPDATE`.
   - `qaadmin` `GET /api/projects/<p1_id>` -> `estimatedBudgetDzd: null`; `PUT` (`estimatedBudgetDzd: 999999`) -> `403 PROJECT_FINANCIAL_ACCESS_DENIED`.
8. **Sanitized Audit & Console Observations:**
   - `audit_logs`: `PROJECT_FINANCIALS_VIEWED` (`qa.pm`, `Viewed estimated budget for project 'QA-P1-001'.`), `ACCESS_DENIED` (`qa.site`, `Unauthorized project update attempt...`), `ACCESS_DENIED` (`qaadmin`, `Unauthorized estimated-budget update attempt...`).
   - Zero uncaught `pageerror` or unexpected console errors (only expected `403` network status for direct negative API probes).
9. **Deviations / Environment Limits:**
   - External Notion page `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` requires interactive login (`BLOCKED` in unauthenticated container).
   - Executed against disposable local container PostgreSQL 18.6 (`promogest_qa_p1`), not Staging/production infrastructure.
10. **Automated vs. Manual Execution Distinction:**
    - Executed interactively via `playwright-cli` against real ASP.NET Core 10 + PostgreSQL 18.6 for commit `a4e1f6daa828d01d481900f1051dcc335da7e25`; distinct from automated CI test runs.
