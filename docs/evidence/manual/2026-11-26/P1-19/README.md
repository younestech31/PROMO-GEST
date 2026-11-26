# P1-19 — Self-Service Active Sessions & Selective Revocation

1. **Task ID & Canonical Reference:** `P1-19` — `src/PromoGest.Api/Controllers/AuthController.cs`, `apps/local-web/src/modules/auth/components/SessionsSecurityModal.tsx` / `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` (external Notion page blocked by login wall in unauthenticated container; executed against repository implementation).
2. **Tested Commit SHA:** `a4e1f6daa828d01d481900f1051dcc335da7e25` (cryptographically verified via SHA-256 against GitHub `main` HEAD; workspace has no `.git` / `NO_GIT`).
3. **Environment & Browser:** Real ASP.NET Core 10 (`PromoGest.Api.dll`, `Development` mode, `http://127.0.0.1:5155`) + Vite real-API proxy (`PROMOGEST_VITE_ONLY=0`, `http://127.0.0.1:4173`) + isolated disposable PostgreSQL 18.6 database `promogest_qa_p1`; `headless Chromium` (`playwright-cli` 0.1.22).
4. **Ordered Execution Steps (all 4 profiles: `ar-desktop` 1440×900, `ar-mobile` 390×844, `fr-desktop` 1440×900, `fr-mobile` 390×844):**
   1. Kept Session A authenticated as `qa.site` and signed into a separate Chromium session (Session B) as `qa.site` with a distinct synthetic User-Agent (`PROMO-GEST-QA-DeviceB/2.0 (Android; Mobile)`).
   2. On Session A (`ar-desktop` `1440×900`), clicked `الجلسات النشطة` to open `SessionsSecurityModal`. Verified `GET /api/auth/sessions` JSON returned active sessions with zero secret/token keys (`tokenHash`, `securityStamp`, `opaqueToken`, `token`, `passwordHash` absent), `role="note"` privacy notice (`"تنبيه الخصوصية..."`) visible, and `هذا الجهاز` badge shown on current session.
   3. Clicked `إنهاء الجلسة` on Session B: `POST /api/auth/sessions/{id}/revoke` returned `204 No Content`. Session A remained authenticated (`GET /api/auth/me` -> `200`). Checked Session B: `GET /api/auth/me` returned `401`, and reloading Session B returned immediately to the sign-in screen.
   4. Resized Session A to `ar-mobile` (`390×844`), opened the mobile navigation drawer and `الجلسات النشطة`: verified responsive stacking with `armOverflow === false`.
   5. Switched `qa.site` to French (`fr-desktop` `1440×900`, `PUT /api/auth/preferred-language` -> `200`) and opened `Sessions actives`: verified French privacy notice (`"Confidentialité..."`), `Cet appareil` badge, and `Révoquer la session` / `Déconnecter cet appareil` actions.
   6. Resized to `fr-mobile` (`390×844`, `frmOverflow === false`), clicked `Déconnecter cet appareil`: confirmed the in-modal confirmation prompt (`Confirmer la déconnexion` / `Annuler`) appeared. Clicked `Annuler` -> verified session stayed active (`GET /api/auth/me` -> `200`). Clicked `Déconnecter cet appareil` -> `Confirmer la déconnexion`: `POST /api/auth/sessions/{id}/revoke` returned `204`, signed out to the login view, and subsequent `GET /api/auth/me` returned `401`.
5. **Acceptance Criteria Results:**
   - Privacy warning (`role="note"`) displayed in AR RTL & FR LTR (`1440×900` and `390×844`) with zero token/hash exposure in `GET /api/auth/sessions`: **PASS**
   - Selective revocation of another session (`204`) invalidates target session (`401`) while keeping current session active (`200`): **PASS**
   - Self-session revocation confirmation prompt Cancel preserves session (`200`), Confirm signs out and invalidates session (`204` -> `401`): **PASS**
   - Zero horizontal overflow in `390×844` AR RTL and FR LTR modals: **PASS**
6. **Captured Genuine Browser Screenshots (synthetic data only):**
   - `p1_19_ard_sessions_modal.png` (`ar-desktop` 1440×900, active sessions modal with privacy notice, current badge, and remote session)
   - `p1_19_arm_sessions_modal.png` (`ar-mobile` 390×844, active sessions after remote revocation)
   - `p1_19_frd_sessions_modal.png` (`fr-desktop` 1440×900, French LTR sessions modal)
   - `p1_19_frm_confirm_self_logout.png` (`fr-mobile` 390×844, French self-logout confirmation prompt)
7. **Sanitized API & Database Query Results:**
   - `GET /api/auth/sessions` -> `200 OK` (no `token`, `tokenHash`, `opaqueToken`, or `securityStamp` fields).
   - `POST /api/auth/sessions/{id}/revoke` (other & self) -> `204 No Content`; revoked sessions returned `401` on `/api/auth/me`.
   - PG18 `user_sessions`: confirmed revoked rows stamped with `revoked_at_utc`.
8. **Sanitized Audit & Console Observations:**
   - `audit_logs`: recorded `AUTH_SESSION_REVOKED_BY_USER` (`Security`) for both `"User 'qa.site' revoked another session."` and `"User 'qa.site' revoked the current session and signed out."`.
   - Zero uncaught `pageerror` exceptions; console errors were strictly the expected `401 Unauthorized` responses after session revocation.
9. **Deviations / Environment Limits:**
   - External Notion page `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` requires interactive login (`BLOCKED` in unauthenticated container).
   - Executed against disposable local container PostgreSQL 18.6 (`promogest_qa_p1`), not Staging/production infrastructure.
10. **Automated vs. Manual Execution Distinction:**
    - Executed interactively via `playwright-cli` against real ASP.NET Core 10 + PostgreSQL 18.6 for commit `a4e1f6daa828d01d481900f1051dcc335da7e25`; distinct from automated tests.
