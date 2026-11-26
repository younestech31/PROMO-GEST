# P0-A01 — First-Run Initialization & Second-Initialization Rejection

1. **Task ID & Canonical Reference:** `P0-A01` — `docs/PHASE-0-MANUAL-ACCEPTANCE.md` (§5A, §4) / `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` (external Notion page blocked by login wall in unauthenticated container; canonical local repository specification executed).
2. **Tested Commit SHA:** `a4e1f6daa828d01d481900f1051dcc335da7e25` (cryptographically verified via SHA-256 against GitHub `main` HEAD; workspace has no `.git` / `NO_GIT`).
3. **Environment & Browser:** Real ASP.NET Core 10 (`PromoGest.Api.dll`, `Development` mode, `http://127.0.0.1:5155`) + Vite real-API proxy (`PROMOGEST_VITE_ONLY=0`, `http://127.0.0.1:4173`) + 4 separate fresh empty disposable PostgreSQL 18.6 databases (`promogest_qa_p0_ard`, `promogest_qa_p0_arm`, `promogest_qa_p0_frd`, `promogest_qa_p0_frm`) with distinct migration (`SQL_ADMIN_USER`) and runtime (`SQL_USER`) identities; `headless Chromium` (`playwright-cli` 0.1.22).
4. **Ordered Execution Steps (per profile: `ar-desktop` 1440×900, `ar-mobile` 390×844, `fr-desktop` 1440×900, `fr-mobile` 390×844):**
   1. Verified empty PostgreSQL 18 schema (`organization_settings=0`, `users=0`, `user_roles[SYSTEM_ADMIN]=0`).
   2. Opened `/`, selected locale (`العربية` / `Français`), verified `html[lang]` and `html[dir]` (`rtl` / `ltr`) and zero horizontal overflow on mobile.
   3. Filled synthetic organization and single `SYSTEM_ADMIN` (`qaadmin`, `qa.admin@example.invalid`) details and submitted `POST /api/setup/initialize`.
   4. Verified transition to `#login-username` with localized completion banner and organization legal name visible, and verified `GET /api/auth/me` returned `401` (setup did not issue an authenticated session cookie).
   5. Re-submitted `POST /api/setup/initialize` with valid CSRF header; confirmed rejection `409 SETUP_ALREADY_INITIALIZED`.
   6. Verified PostgreSQL 18 counts (`1 | 1 | 1`) and explicitly signed in via login form (`POST /api/auth/login` -> `200`).
5. **Acceptance Criteria Results:**
   - Empty DB starts with 0 organizations / 0 users / 0 `SYSTEM_ADMIN`: **PASS** (all 4 profiles)
   - Setup succeeds once (`201`) and transitions to login without issuing a session cookie (`GET /api/auth/me` `401`): **PASS** (all 4 profiles)
   - Bilingual completion notice + organization legal name displayed on login handoff: **PASS** (all 4 profiles)
   - Second `POST /api/setup/initialize` rejected with `409 SETUP_ALREADY_INITIALIZED`: **PASS** (all 4 profiles)
   - DB post-setup state remains `1` organization / `1` user / `1` `SYSTEM_ADMIN`: **PASS** (all 4 profiles)
   - Explicit sign-in with newly created `SYSTEM_ADMIN` succeeds (`200`), zero JS/page errors: **PASS** (all 4 profiles)
6. **Captured Genuine Browser Screenshots (synthetic data only):**
   - `p0_a01_ard_wizard.png`, `p0_a01_ard_handoff.png` (`ar-desktop` 1440×900)
   - `p0_a01_arm_wizard.png`, `p0_a01_arm_handoff.png` (`ar-mobile` 390×844)
   - `p0_a01_frd_wizard.png`, `p0_a01_frd_handoff.png` (`fr-desktop` 1440×900)
   - `p0_a01_frm_wizard.png`, `p0_a01_frm_handoff.png` (`fr-mobile` 390×844)
7. **Sanitized API & Database Query Results:**
   - Pre-init counts (all 4 DBs): `orgs=0, users=0, admins=0`.
   - `POST /api/setup/initialize` -> `201 Created`; `GET /api/auth/me` -> `401 Unauthorized`; duplicate `POST /api/setup/initialize` -> `409 Conflict` (`{"code":"SETUP_ALREADY_INITIALIZED"}`); `POST /api/auth/login` -> `200 OK`.
   - Post-init counts (all 4 DBs): `orgs=1, users=1, admins=1`.
8. **Sanitized Audit & Console Observations:**
   - `audit_logs`: `SETUP_INITIALIZED` (`OrganizationSettings`, `"Installation initialized for 'PROMO GEST QA <PROFILE>' with single System Administrator 'qaadmin'."`) and `AUTH_LOGIN_SUCCESS` (`UserSession`, `"User 'qaadmin' signed in."`).
   - Zero uncaught `pageerror` or application `console.error` events (only expected `401` on initial unauthenticated `/api/auth/me` check).
9. **Deviations / Environment Limits:**
   - External Notion page `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` requires interactive login (`BLOCKED` in unauthenticated container); test steps were taken from canonical `docs/PHASE-0-MANUAL-ACCEPTANCE.md`.
   - Performed in disposable local container PostgreSQL 18 databases rather than external Staging/production hardware.
10. **Automated vs. Manual Execution Distinction:**
    - This run executed interactively via `playwright-cli` directly on isolated disposable PostgreSQL 18 instances for `a4e1f6daa828d01d481900f1051dcc335da7e25`; it is distinct from GitHub Actions CI `tests/browser/phase0.py`.
