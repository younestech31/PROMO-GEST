# P0-A04 — Logout, Server-Side Session Revocation & Unconfirmed Retry Behavior

1. **Task ID & Canonical Reference:** `P0-A04` — `docs/PHASE-0-MANUAL-ACCEPTANCE.md` (§5A, §4) / `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` (external Notion page auth-walled in container; canonical repository specification executed).
2. **Recorded source baseline (metadata corrected 27 November):** `a4e1f6daa8828d01d481900f1051dcc335da7e25` — parent of evidence-deposit commit `73a06493241876c35b9f20b2a93ff4d52b3ae909`. The NO_GIT execution report cannot independently establish byte-for-byte checkout identity; see correction below.
3. **Environment & Browser:** Real ASP.NET Core 10 (`http://127.0.0.1:5155`) + Vite real-API proxy (`PROMOGEST_VITE_ONLY=0`, `http://127.0.0.1:4173`) + 4 fresh PostgreSQL 18.6 disposable databases (`promogest_qa_p0_ard`, `promogest_qa_p0_arm`, `promogest_qa_p0_frd`, `promogest_qa_p0_frm`); `headless Chromium` (`playwright-cli` 0.1.22).
4. **Ordered Execution Steps (all 4 profiles `ar-desktop`, `ar-mobile`, `fr-desktop`, `fr-mobile`):**
   1. Signed in explicitly as `qaadmin` (`POST /api/auth/login` `200`). Verified `localStorage.length === 0` and `sessionStorage.length === 0` (no bearer/session token in Web Storage).
   2. Cloned an independent in-memory browser context holding the pre-logout session cookie and confirmed `GET /api/auth/me` returned `200`.
   3. Simulated unreachable logout endpoint (`net::ERR_INTERNET_DISCONNECTED` on `POST /api/auth/logout`) and clicked Sign Out (`تسجيل الخروج` / `Déconnexion`).
   4. Verified authenticated shell remained visible (`#login-username` absent), `GET /api/auth/me` remained `200`, and localized warning banner + Retry button (`إعادة المحاولة` / `Réessayer`) were shown.
   5. Restored network and clicked Retry; confirmed `POST /api/auth/logout` returned `204 No Content`, UI cleared to `#login-username`, `GET /api/auth/me` returned `401`.
   6. Replayed the pre-logout session from the independent in-memory context against `GET /api/auth/me` and `GET /api/projects` -> both returned `401`.
   7. Navigated to protected route `/admin/users` and performed full browser reload -> returned to login screen.
   8. Verified PostgreSQL `user_sessions` (`revoked_sessions=1 / total_sessions=1`) and `audit_logs` (`AUTH_LOGOUT`).
5. **Acceptance Criteria Results:**
   - Unconfirmed/failed logout retains authenticated UI + active server session (`200`) and offers Retry: **PASS** (all 4 profiles)
   - Confirmed Retry logout (`204`) clears UI session and returns `401` on `/api/auth/me`: **PASS** (all 4 profiles)
   - Pre-logout session cookie replay rejected with `401` on `/api/auth/me` and `/api/projects`: **PASS** (all 4 profiles)
   - Protected route visit & reload after logout forces login screen: **PASS** (all 4 profiles)
   - Server-side `user_sessions` revocation & `AUTH_LOGOUT` audit row persisted: **PASS** (all 4 profiles)
   - No tokens stored in `localStorage`/`sessionStorage`: **PASS**
6. **Captured Genuine Browser Screenshots (synthetic data only):**
   - `p0_a04_ard_offline_retry.png`, `p0_a04_ard_post_logout.png`
   - `p0_a04_arm_offline_retry.png`, `p0_a04_arm_post_logout.png`
   - `p0_a04_frd_offline_retry.png`, `p0_a04_frd_post_logout.png`
   - `p0_a04_frm_offline_retry.png`, `p0_a04_frm_post_logout.png`
7. **Sanitized API & Database Query Results:**
   - During simulated disconnect: `GET /api/auth/me` -> `200`.
   - On Retry: `POST /api/auth/logout` -> `204`.
   - Post-logout & replay context: `GET /api/auth/me` -> `401`, `GET /api/projects` -> `401`.
   - PostgreSQL `user_sessions` (all 4 DBs): `total_sessions=1, revoked_sessions=1`.
8. **Sanitized Audit & Console Observations:**
   - `audit_logs`: `AUTH_LOGOUT` (`UserSession`, `"User 'qaadmin' signed out."`).
   - Zero cookies, CSRF values, or secrets captured.
9. **Deviations / Environment Limits:**
   - Notion checklist page unreachable due to sign-in wall (`BLOCKED` for external Notion text); canonical repository protocol executed.
10. **Automated vs. Manual Execution Distinction:**
    - Executed interactively on disposable PostgreSQL 18 instances for `a4e1f6daa8828d01d481900f1051dcc335da7e25`, separate from CI `tests/browser/phase0.py`.

## Metadata reconciliation — 27 November 2026

The original report used `a4e1f6daa828d01d481900f1051dcc335da7e25` (39 characters, not a full SHA).
The corrected baseline above is the GitHub/git-verified sole parent of the evidence-deposit
commit; this corrects source metadata, not a rerun or independent cryptographic attestation
of the NO_GIT execution workspace. Original screenshot pixels are unchanged.
Recorded interactive acceptance remains PASS for the scope above; Notion is Done / Verified
with Last Verified 26 November. No named human signature, physical-device test, Production-mode
run or institution-host approval is asserted. See [reconciliation](../../../../ROADMAP-RECONCILIATION-2026-11-27.ar.md).
