# P1-17 — Preferred Language Persistence & Authorization Boundary

1. **Task ID & Canonical Reference:** `P1-17` — `src/PromoGest.Api/Controllers/AuthController.cs`, `apps/local-web/src/shared/components/LanguageSwitcher.tsx` / `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` (external Notion page blocked by login wall in unauthenticated container; executed against repository implementation).
2. **Tested Commit SHA:** `a4e1f6daa828d01d481900f1051dcc335da7e25` (cryptographically verified via SHA-256 against GitHub `main` HEAD; workspace has no `.git` / `NO_GIT`).
3. **Environment & Browser:** Real ASP.NET Core 10 (`PromoGest.Api.dll`, `Development` mode, `http://127.0.0.1:5155`) + Vite real-API proxy (`PROMOGEST_VITE_ONLY=0`, `http://127.0.0.1:4173`) + isolated disposable PostgreSQL 18.6 database `promogest_qa_p1`; `headless Chromium` (`playwright-cli` 0.1.22).
4. **Ordered Execution Steps (all 4 profiles: `ar-desktop` 1440×900, `ar-mobile` 390×844, `fr-desktop` 1440×900, `fr-mobile` 390×844):**
   1. Signed in as non-admin `qa.sales` (`COMMERCIAL_MANAGER`, initial `preferred_language = 'ar'`, org `default_language = 'ar'`).
   2. In `ar-desktop` (`1440×900`), simulated offline/network abort on `PUT /api/auth/preferred-language` while clicking `Français`: language remained `"ar"`, `role="alert"` banner displayed `"تعذر حفظ تفضيل اللغة. لم يتغير اختيارك المحفوظ؛ حاول مجدداً."`.
   3. Unrouted abort and clicked `Français` (`fr-desktop` `1440×900`): `PUT /api/auth/preferred-language` returned `200`, UI switched to `lang="fr"` / `dir="ltr"`, and persisted across full page reload. Verified in PG18 that `users.preferred_language = 'fr'` for `qa.sales` while `organization_settings.default_language` remained `'ar'`.
   4. Simulated offline/network abort in `fr-desktop` while clicking `العربية`: language remained `"fr"`, `role="alert"` banner displayed `"Impossible d’enregistrer la préférence linguistique. Le choix enregistré reste inchangé ; réessayez."`.
   5. Opened a fresh clean browser context (`fr-mobile` `390×844`, `overflow === false`), signed in cleanly as `qa.sales`: workspace immediately rendered in French (`lang="fr"`, `dir="ltr"`, heading `"Console locale de l'organisation"`).
   6. Switched back to `العربية` in `ar-mobile` (`390×844`, `overflow === false`): `PUT /api/auth/preferred-language` returned `200`, restored `lang="ar"` / `dir="rtl"` and persisted across reload and in PG18.
   7. Tested stale `expectedConcurrencyStamp` (`00000000-0000-0000-0000-000000000001`) on `PUT /api/auth/preferred-language` -> `409 Conflict` (`USER_CONCURRENCY_CONFLICT`).
   8. Tested cross-user write authorization from `qa.sales` sending a valid payload to `PUT /api/users/<qaadmin_id>` -> `403 Forbidden` (`FORBIDDEN_USER_MANAGEMENT`).
5. **Acceptance Criteria Results:**
   - Language persistence (`ar` <-> `fr`) stored per user without mutating `organization_settings.default_language`: **PASS**
   - Clean fresh browser login restores persisted `preferredLanguage` immediately on mobile & desktop: **PASS**
   - Offline/network failure rolls back/keeps previous selection and shows localized `role="alert"` in AR & FR: **PASS**
   - Optimistic concurrency (`409 USER_CONCURRENCY_CONFLICT`) & cross-user boundary (`403 FORBIDDEN_USER_MANAGEMENT`): **PASS**
   - Zero horizontal overflow in `390×844` AR RTL and FR LTR: **PASS**
6. **Captured Genuine Browser Screenshots (synthetic data only):**
   - `p1_17_ard_offline_alert.png` (`ar-desktop` 1440×900, Arabic offline failure alert keeping AR selection)
   - `p1_17_frd_switched.png` (`fr-desktop` 1440×900, persisted French LTR workspace)
   - `p1_17_frm_fresh_login.png` (`fr-mobile` 390×844, fresh login restoring French LTR with zero overflow)
   - `p1_17_arm_restored.png` (`ar-mobile` 390×844, restored Arabic RTL workspace with zero overflow)
7. **Sanitized API & Database Query Results:**
   - `PUT /api/auth/preferred-language` (`fr`, then `ar`) -> `200 OK`; stale Guid stamp -> `409 Conflict` (`USER_CONCURRENCY_CONFLICT`).
   - `PUT /api/users/<qaadmin_id>` as `qa.sales` -> `403 Forbidden` (`FORBIDDEN_USER_MANAGEMENT`).
   - PG18: `users.preferred_language` toggled `'ar' -> 'fr' -> 'ar'` for `qa.sales`, while `organization_settings.default_language` stayed `'ar'`.
8. **Sanitized Audit & Console Observations:**
   - `audit_logs`: `USER_PREFERRED_LANGUAGE_UPDATED` (`Info`) for both `'ar' -> 'fr'` and `'fr' -> 'ar'`; `ACCESS_DENIED` (`Security`, `"Unauthorized user management operation 'UpdateEmployee' by 'qa.sales'."`) recorded for cross-user probe.
   - Zero uncaught `pageerror`s; expected console network error logged only during intentional offline-abort test.
9. **Deviations / Environment Limits:**
   - External Notion page `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` requires interactive login (`BLOCKED` in unauthenticated container).
   - Offline abort was tested via Playwright network route abort rather than disconnecting host loopback.
10. **Automated vs. Manual Execution Distinction:**
    - Executed interactively via `playwright-cli` against real ASP.NET Core 10 + PostgreSQL 18.6 for commit `a4e1f6daa828d01d481900f1051dcc335da7e25`; distinct from automated tests.
