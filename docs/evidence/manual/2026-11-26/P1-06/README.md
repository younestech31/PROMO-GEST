# P1-06 — Unsaved Changes Detection & Navigation Guard

1. **Task ID & Canonical Reference:** `P1-06` — `apps/local-web/src/app/App.tsx`, `apps/local-web/src/shared/hooks/useUnsavedGuard.ts`, `apps/local-web/src/modules/module-b-projects/pages/ProjectWorkspaceView.tsx` / `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` (external Notion page blocked by login wall in unauthenticated container; executed against repository implementation and Phase 1 criteria).
2. **Recorded source baseline (metadata corrected 27 November):** `a4e1f6daa8828d01d481900f1051dcc335da7e25` — parent of evidence-deposit commit `73a06493241876c35b9f20b2a93ff4d52b3ae909`, verified through GitHub API. The NO_GIT execution report cannot independently establish byte-for-byte checkout identity; see correction below.
3. **Environment & Browser:** Real ASP.NET Core 10 (`PromoGest.Api.dll`, `Development` mode, `http://127.0.0.1:5155`) + Vite real-API proxy (`PROMOGEST_VITE_ONLY=0`, `http://127.0.0.1:4173`) + isolated disposable PostgreSQL 18.6 database `promogest_qa_p1`; `headless Chromium` (`playwright-cli` 0.1.22).
4. **Ordered Execution Steps (all 4 profiles: `ar-desktop` 1440×900, `ar-mobile` 390×844, `fr-desktop` 1440×900, `fr-mobile` 390×844):**
   1. Signed in as `qaadmin` (`SYSTEM_ADMIN`) on `/organization/profile` in Arabic RTL (`1440×900`), entered Edit mode, modified `#organization-tradeName` to `"QA P1-06 Draft AR"`.
   2. Clicked the same route (`ملف المؤسسة`): verified zero `ConfirmDialog` (`sameRouteDialogs === 0`).
   3. Clicked `دليل المشاريع`: verified `ConfirmDialog` (`توجد تغييرات غير محفوظة`) opened; clicked Stay (`البقاء هنا`): verified URL stayed `/organization/profile` and unsaved draft remained intact.
   4. Resized to `390×844` (`ar-mobile`, `scrollWidth <= innerWidth`), opened mobile menu, clicked `دليل المشاريع`, verified responsive stacked modal, clicked Discard (`تجاهل التغييرات والمتابعة`): verified navigation to `/projects` and draft did not persist.
   5. Returned to `/organization/profile`, edited `#organization-tradeName` to `"PROMO GEST QA — TRADE AR"`, triggered guard and clicked Save & Continue (`حفظ والمتابعة`): verified `PUT /api/organization` `200`, navigation completed to `/projects`, and value persisted across full reload and in PostgreSQL `organization_settings.trade_name`.
   6. Switched `qaadmin` to French LTR (`lang="fr"`, `dir="ltr"`), repeated same-route non-blocking check, `Modifications non enregistrées` modal, `Rester ici`, mobile `390×844` layout, and `Abandonner et continuer`.
   7. Signed in as `qa.pm` (`PROJECT_DIRECTOR` / `ProjectManager` on `QA-P1-001`) at `/projects/<p1_id>/settings`, typed into `#ws-municipality` with physical keystrokes (sticky user activation), triggered `reload()`: verified browser `beforeunload` modal fired (`"beforeunload" dialog`), dismissed modal (`dialog-dismiss`), and verified route stayed on `/settings` with unsaved text intact.
   8. In French LTR on `/projects/<p1_id>/settings`, edited `#ws-municipality` to `"Alger Centre QA"`, clicked `Synthèse projet`, selected `Enregistrer et continuer`: verified `PUT /api/projects/<p1_id>` `200`, navigation to `/projects/<p1_id>/overview`, persistence across reload, and `QA-P1-001` PostgreSQL `municipality = 'Alger Centre QA'`.
5. **Acceptance Criteria Results:**
   - Same-route navigation is never blocked (`sameRouteDialogs === 0` in AR & FR): **PASS**
   - In-app `ConfirmDialog` (`توجد تغييرات غير محفوظة` / `Modifications non enregistrées`) offers Stay / Discard / Save & Continue across `1440×900` and `390×844` without overflow: **PASS**
   - Stay keeps route & draft; Discard drops draft & navigates; Save & Continue executes `PUT`, persists to PostgreSQL 18, and completes navigation: **PASS**
   - Native browser `beforeunload` prompt fires on dirty reload/unload and preserves unsaved input when dismissed: **PASS**
6. **Captured Genuine Browser Screenshots (synthetic data only):**
   - `p1_06_ard_dialog.png` (`ar-desktop` 1440×900), `p1_06_arm_dialog.png` (`ar-mobile` 390×844), `p1_06_ard_saved.png` (`ar-desktop` persisted org profile)
   - `p1_06_frd_dialog.png` (`fr-desktop` 1440×900), `p1_06_frm_dialog.png` (`fr-mobile` 390×844), `p1_06_frd_project_saved.png` (`fr-desktop` persisted project overview)
7. **Sanitized API & Database Query Results:**
   - `PUT /api/organization` -> `200 OK`; PostgreSQL `SELECT trade_name FROM organization_settings;` -> `PROMO GEST QA — TRADE AR`.
   - `PUT /api/projects/<p1_id>` -> `200 OK`; PostgreSQL `SELECT code, municipality FROM projects WHERE code='QA-P1-001';` -> `QA-P1-001 | Alger Centre QA`.
8. **Sanitized Audit & Console Observations:**
   - Zero uncaught `pageerror` or unexpected `console.error` events (only expected `401` on initial unauthenticated `/api/auth/me` probe before cookie restoration).
   - Chromium requires sticky user activation (real click/keystroke, not solely programmatic value fill) before showing the native `beforeunload` prompt, confirmed during interactive typing + `reload()`.
9. **Deviations / Environment Limits:**
   - External Notion page `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` requires interactive login (`BLOCKED` in unauthenticated container).
   - Executed against disposable local container PostgreSQL 18.6 (`promogest_qa_p1`), not Staging/production infrastructure.
10. **Automated vs. Manual Execution Distinction:**
    - Reported interactive `playwright-cli` execution against real ASP.NET Core 10 + PostgreSQL 18.6, with recorded source baseline corrected as above; distinct from automated unit/CI suites (`npm test`, `tests/browser/phase0.py`). The following reconciliation is not a new execution.

## Source and image reconciliation — 27 November 2026

The original 39-character source string `a4e1f6daa828d01d481900f1051dcc335da7e25`
is malformed. The original assertion “cryptographically verified via SHA-256 against
GitHub main HEAD” is not independently supportable for a NO_GIT workspace and is
withdrawn, not upgraded into proof by correcting the spelling. GitHub API confirms
the evidence deposit has exactly one parent, the 40-character baseline above.
All six PNG Git blobs match that deposit; SHA-256, sizes and image dimensions are
recorded in [the reconciliation index](reconciliation-2026-11-27.json).

All six original images were reopened, not recaptured: AR/FR desktop/mobile
confirmations show Save / Discard / Stay within their viewports; AR desktop saved
profile shows the recorded synthetic trade name; FR desktop project overview shows
`Alger Centre QA`. The old header switcher visible in those images belongs to the
original capture, not the current application baseline. Images illustrate UI state;
API/SQL persistence and beforeunload assertions remain reported observations, not
facts independently inferred from PNGs. No image depicts native unload, failed-save
transport handling, revoked access or a new-source execution. The failed-save CI
regression and remaining full P1-06 acceptance are tracked separately in
[the current inventory](../../../../P1-06-NAVIGATION-ACCEPTANCE.md).
