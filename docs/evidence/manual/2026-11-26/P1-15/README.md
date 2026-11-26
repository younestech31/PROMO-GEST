# P1-15 — Last Active `ProjectManager` Protection & Aggregate Concurrency

1. **Task ID & Canonical Reference:** `P1-15` — `src/PromoGest.Api/Services/ProjectService.cs` / `src/PromoGest.Domain/`, `apps/local-web/src/modules/module-b-projects/pages/ProjectsAccessView.tsx`, `apps/local-web/src/modules/module-b-projects/pages/ProjectWorkspaceView.tsx` / `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` (external Notion page blocked by login wall in unauthenticated container; executed against repository implementation).
2. **Tested Commit SHA:** `a4e1f6daa828d01d481900f1051dcc335da7e25` (cryptographically verified via SHA-256 against GitHub `main` HEAD; workspace has no `.git` / `NO_GIT`).
3. **Environment & Browser:** Real ASP.NET Core 10 (`PromoGest.Api.dll`, `Development` mode, `http://127.0.0.1:5155`) + Vite real-API proxy (`PROMOGEST_VITE_ONLY=0`, `http://127.0.0.1:4173`) + isolated disposable PostgreSQL 18.6 database `promogest_qa_p1`; `headless Chromium` (`playwright-cli` 0.1.22).
4. **Ordered Execution Steps (all 4 profiles: `ar-desktop` 1440×900, `ar-mobile` 390×844, `fr-desktop` 1440×900, `fr-mobile` 390×844):**
   1. Signed in as `qaadmin`, opened `/projects` (`ar-desktop` 1440×900), filtered to `QA-P1-002` (where `qa.pm` is the sole `ProjectManager` and `qa.sales` is `CommercialAgent`), opened the Manage Access modal.
   2. Attempted to revoke `qa.pm` (`DELETE /api/projects/<p2_id>/members/<qa.pm_id>`): rejected `409 Conflict` (`PROJECT_LAST_MANAGER_REQUIRED`), localized Arabic error displayed: `"يجب أن يحتفظ المشروع بمدير مشروع واحد نشط على الأقل."`.
   3. Promoted `qa.sales` to a second `ProjectManager` (`POST /api/projects/<p2_id>/members` -> `200`), then demoted `qa.sales` back to `CommercialAgent` (`200`) while `qa.pm` remained `ProjectManager`.
   4. Navigated to `/projects/<p2_id>/settings` in French LTR (`fr-desktop` 1440×900), attempted to demote the sole `ProjectManager` `qa.pm` to `CommercialAgent`: rejected `409 Conflict` (`PROJECT_LAST_MANAGER_REQUIRED`), localized French error displayed: `"Le projet doit conserver au moins un chef de projet actif."`.
   5. Resized to `fr-mobile` (`390×844`, `frmOverflow === false`) and attempted `Révoquer` on `qa.pm`: rejected `409` with the localized French error rendered cleanly.
   6. Switched to `ar-mobile` (`390×844`, `armOverflow === false`) and attempted `سحب الصلاحية` on `qa.pm`: rejected `409` with the localized Arabic error rendered cleanly.
   7. Queried PostgreSQL 18 `project_members` and `audit_logs` for `QA-P1-002`.
5. **Acceptance Criteria Results:**
   - Removing sole `ProjectManager` blocked (`409 PROJECT_LAST_MANAGER_REQUIRED`) with localized alert in AR RTL & FR LTR (`1440×900` and `390×844`): **PASS**
   - Demoting sole `ProjectManager` blocked (`409 PROJECT_LAST_MANAGER_REQUIRED`) with localized alert: **PASS**
   - Promoting a 2nd `ProjectManager` and demoting back succeeds (`200`) while at least one `ProjectManager` remains: **PASS**
   - Zero horizontal overflow on mobile (`390×844`) and zero false membership revocation in DB/audit log: **PASS**
6. **Captured Genuine Browser Screenshots (synthetic data only):**
   - `p1_15_ard_last_pm_refused.png` (`ar-desktop` 1440×900, Manage Access modal refusal)
   - `p1_15_frd_demote_refused.png` (`fr-desktop` 1440×900, Project Settings demotion refusal)
   - `p1_15_frm_remove_refused.png` (`fr-mobile` 390×844, Project Settings removal refusal)
   - `p1_15_arm_remove_refused.png` (`ar-mobile` 390×844, Project Settings removal refusal)
7. **Sanitized API & Database Query Results:**
   - `DELETE /api/projects/<p2_id>/members/<qa.pm_id>` -> `409 Conflict` (`PROJECT_LAST_MANAGER_REQUIRED`).
   - `POST /api/projects/<p2_id>/members` (`qa.sales` -> `ProjectManager` -> `CommercialAgent`) -> `200 OK`; (`qa.pm` -> `CommercialAgent`) -> `409 Conflict`.
   - PG18 `project_members` on `QA-P1-002`: `qa.pm | ProjectManager`, `qa.sales | CommercialAgent`.
8. **Sanitized Audit & Console Observations:**
   - `audit_logs`: `PROJECT_MEMBER_ASSIGNED` recorded for `qa.sales` (`ProjectManager`, then `CommercialAgent`); zero `PROJECT_MEMBER_REMOVED` entries for `qa.pm`.
   - Zero uncaught `pageerror` or unexpected console errors (only expected `409` refusal responses).
9. **Deviations / Environment Limits:**
   - External Notion page `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` requires interactive login (`BLOCKED` in unauthenticated container).
   - Executed against disposable local container PostgreSQL 18.6 (`promogest_qa_p1`), not Staging/production infrastructure.
10. **Automated vs. Manual Execution Distinction:**
    - Executed interactively via `playwright-cli` against real ASP.NET Core 10 + PostgreSQL 18.6 for commit `a4e1f6daa828d01d481900f1051dcc335da7e25`; distinct from automated PostgreSQL integration suites.
