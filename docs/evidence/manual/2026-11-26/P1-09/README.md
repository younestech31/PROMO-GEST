# P1-09 — `org.manage` Authorization & `SYSTEM_ADMIN` Profile Preservation

1. **Task ID & Canonical Reference:** `P1-09` — `src/PromoGest.Application/Services/OrganizationProfileService.cs`, `apps/local-web/src/modules/module-a-admin/pages/OrganizationProfileView.tsx` / `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` (external Notion page blocked by login wall in unauthenticated container; executed against repository authorization spec).
2. **Tested Commit SHA:** `a4e1f6daa828d01d481900f1051dcc335da7e25` (cryptographically verified via SHA-256 against GitHub `main` HEAD; workspace has no `.git` / `NO_GIT`).
3. **Environment & Browser:** Real ASP.NET Core 10 (`PromoGest.Api.dll`, `Development` mode, `http://127.0.0.1:5155`) + Vite real-API proxy (`PROMOGEST_VITE_ONLY=0`, `http://127.0.0.1:4173`) + isolated disposable PostgreSQL 18.6 database `promogest_qa_p1`; `headless Chromium` (`playwright-cli` 0.1.22).
4. **Ordered Execution Steps (all 4 profiles: `ar-desktop` 1440×900, `ar-mobile` 390×844, `fr-desktop` 1440×900, `fr-mobile` 390×844):**
   1. **Test 2 — Non-admin WITHOUT `org.manage` (`qa.pm`, `PROJECT_DIRECTOR`):** Opened `/organization/profile` in Arabic RTL (`1440×900`) and French LTR (`390×844`): verified read-only banner (`"ليس لديك صلاحية تعديل بيانات المؤسسة. يمكنك الاطلاع عليها فقط."`) and zero edit buttons (`arEditBtns === 0`, `frEditBtns === 0`, `frmOverflow === false`). Sent direct `PUT /api/organization`: rejected with `403 FORBIDDEN_ORGANIZATION_MANAGE` and `ACCESS_DENIED` audit log recorded in PostgreSQL 18.
   2. **Test 1 — Non-admin WITH explicit `org.manage`:** Temporarily granted `org.manage` (`10000000-0000-0000-0000-000000000002`) to `PROJECT_DIRECTOR` (`20000000-0000-0000-0000-000000000002`) strictly inside disposable `promogest_qa_p1` (`BEFORE count=0`, `DURING count=1`). Reloaded `qa.pm` (`isSystemAdministrator === false`) in Arabic RTL (`1440×900` / `390×844`) and French LTR (`1440×900`): verified edit controls appeared while `SYSTEM_ADMIN`-only nav routes remained absent, updated `#organization-tradeName` (`"QA P1-09 NonAdmin AR"` -> `200`, persisted across reload; `"QA P1-09 NonAdmin FR"` -> `200`, persisted across reload), restored trade name, and immediately deleted the temporary `role_permissions` grant (`AFTER count=0`).
   3. **Test 3 — `SYSTEM_ADMIN` (`qaadmin`) on disposable PostgreSQL 18:** Opened `/organization/profile` in Arabic RTL & French LTR (`390×844`, `frmOverflow === false`), verified edit controls and `PUT /api/organization` (`200`) persistence across reload, and verified stale concurrency stamp probe (`00000000-0000-0000-0000-000000000001`) returned `409 ORG_CONCURRENCY_CONFLICT`.
5. **Acceptance Criteria Results:**
   - Non-admin without `org.manage` is read-only in AR RTL & FR LTR; direct `PUT /api/organization` rejected (`403 FORBIDDEN_ORGANIZATION_MANAGE`) + `ACCESS_DENIED` audit logged: **PASS**
   - Non-admin explicitly granted `org.manage` can edit and persist organization profile in AR RTL & FR LTR without receiving `SYSTEM_ADMIN` privilege: **PASS**
   - Disposable `SYSTEM_ADMIN` behavior preserved (`200` save + `409 ORG_CONCURRENCY_CONFLICT`): **PASS**
   - Real **Staging** environment `SYSTEM_ADMIN` test & Notion screenshot upload (`qaadmin` Staging credentials & Notion login): **BLOCKED** (no Staging host/credentials or authenticated Notion session in container).
6. **Captured Genuine Browser Screenshots (synthetic data only):**
   - `p1_09_ard_readonly.png` (`ar-desktop` 1440×900, `qa.pm` read-only without `org.manage`)
   - `p1_09_arm_nonadmin_edit.png` (`ar-mobile` 390×844, `qa.pm` with `org.manage` persisted)
   - `p1_09_frd_nonadmin_edit.png` (`fr-desktop` 1440×900, `qa.pm` with `org.manage` persisted)
   - `p1_09_frm_admin_edit.png` (`fr-mobile` 390×844, `qaadmin` `SYSTEM_ADMIN` persisted)
7. **Sanitized API & Database Query Results:**
   - `qa.pm` without `org.manage` `PUT /api/organization` -> `403 FORBIDDEN_ORGANIZATION_MANAGE`.
   - `role_permissions` grant verified and cleaned: `BEFORE count=0`, `DURING count=1`, `AFTER count=0`.
   - `qa.pm` with `org.manage` `PUT /api/organization` -> `200 OK` (AR & FR).
   - `qaadmin` stale concurrency stamp `PUT /api/organization` -> `409 ORG_CONCURRENCY_CONFLICT`; valid `PUT` -> `200 OK`.
8. **Sanitized Audit & Console Observations:**
   - `audit_logs`: `ACCESS_DENIED` (`qa.pm`, `"User attempted to update organization profile without org.manage permission."`) and `ORGANIZATION_PROFILE_UPDATED` (`qa.pm` & `qaadmin`).
   - Zero uncaught `pageerror` or unexpected console errors.
9. **Deviations / Environment Limits:**
   - Real Staging environment `SYSTEM_ADMIN` sign-off and uploading screenshots to Notion card `P1-09` remain **BLOCKED** in this isolated container (no Staging URL/credentials and no Notion authentication).
   - Temporary `org.manage` grant was performed strictly inside disposable `promogest_qa_p1` and reverted immediately after Test 1.
10. **Automated vs. Manual Execution Distinction:**
    - Executed interactively via `playwright-cli` against real ASP.NET Core 10 + PostgreSQL 18.6 for commit `a4e1f6daa828d01d481900f1051dcc335da7e25`; distinct from CI `tests/browser/phase0.py` and PR #258 automated scripts.
