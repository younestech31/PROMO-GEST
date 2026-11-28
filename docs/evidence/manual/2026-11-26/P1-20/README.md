# P1-20 — Explicit Project Switcher & Navigation Chrome

1. **Task ID & Canonical Reference:** `P1-20` — `apps/local-web/src/app/ErpShellLayout.tsx`, `apps/local-web/src/modules/module-b-projects/components/ProjectSwitcherModal.tsx`, `apps/local-web/src/shared/components/ProjectIdentityStrip.tsx`, `apps/local-web/src/app/App.tsx` / `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` (external Notion page blocked by login wall in unauthenticated container; executed against repository implementation).
2. **Recorded source baseline (metadata corrected 27 November):** `a4e1f6daa8828d01d481900f1051dcc335da7e25` — sole parent of evidence-deposit commit `73a06493241876c35b9f20b2a93ff4d52b3ae909`, confirmed through GitHub API. This establishes the deposit's parent, not the exact checkout of the reported NO_GIT execution. The original unsupported claim is preserved in the correction below.
3. **Environment & Browser:** Real ASP.NET Core 10 (`PromoGest.Api.dll`, `Development` mode, `http://127.0.0.1:5155`) + Vite real-API proxy (`PROMOGEST_VITE_ONLY=0`, `http://127.0.0.1:4173`) + isolated disposable PostgreSQL 18.6 database `promogest_qa_p1`; `headless Chromium` (`playwright-cli` 0.1.22).
4. **Ordered Execution Steps (all 4 profiles: `ar-desktop` 1440×900, `ar-mobile` 390×844, `fr-desktop` 1440×900, `fr-mobile` 390×844):**
   1. Signed in as `qa.pm` (`PROJECT_DIRECTOR`, 28 authorized projects) in `ar-desktop` (`1440×900`, clean forms). Verified single header `<kbd>Ctrl+K</kbd>` switcher button (`headerCtrlKCount === 1`).
   2. Clicked the header switcher button to open `مبدّل المشروع الصريح`, pressed `Escape`: verified modal closed and focus restored back to the header button (`focusBackToHeader === true`).
   3. Navigated to `/projects` (`دليل المشاريع`), focused `<input type="search">`, pressed `Control+k`: verified modal did **not** hijack input (`openedInsideInput === 0`).
   4. Opened switcher, typed `QA-P1-002`: verified live server query `GET /api/projects?q=QA-P1-002` returned `200 OK` (`1` result), selected `QA-P1-002`, verified `/projects/<p2_id>/overview` loaded with `aria-current="page"` on `ملخص المشروع`.
   5. Clicked `تثبيت` in `ProjectIdentityStrip`: `localStorage` persisted `pinnedProjectIds`, **observed defect**: button text stayed `تثبيت` immediately after click (`pinBtnAfterImmediate === "تثبيت"`) until a route re-render occurred because `App.tsx` updates `localStorage` without triggering React state.
   6. Switched to `QA-P1-003` and then `QA-P1-001`, then pressed `Control+k`: switcher showed `المشروع المفتوح حالياً` (`QA-P1-001`) and `المشاريع المثبتة` (`QA-P1-002`), **observed defect**: `المشاريع المفتوحة مؤخراً` did **not** appear (`recentVisibleCount === 0`) because `pushRecentProject` is not wired into navigation transitions in `App.tsx`.
   7. Tested `ar-mobile` (`390×844`, `armOverflow === false`): opened mobile drawer via `Open menu`, verified active project nav + `aria-current="page"`, closed drawer cleanly via `Close navigation menu` backdrop.
   8. Switched to French (`fr-desktop` `1440×900`): verified active sidebar `Synthèse projet` (`aria-current="page"`), header button `QA-P1-001 · Résidence Yasmine 1 Ctrl+K`, and switcher `Projets épinglés` group.
   9. Tested `fr-mobile` (`390×844`, `frmOverflow === false`): verified breadcrumbs (`Organisation > Projets > QA-P1-001 > Aperçu projet`), identity strip (`Épingler`, `Annuaire`), and clicking `Annuaire` returned to `/projects`.
5. **Acceptance Criteria Results:**
   - Single `Ctrl+K` header trigger, input-focus suppression, `Escape` focus restoration, and live server `?q=` search: **PASS**
   - Sidebar `aria-current="page"`, breadcrumbs, identity strip, and mobile drawer open/close (`390×844` zero overflow): **PASS**
   - Pinned project immediate button state update & automatic `recentProjectIds` runtime tracking: **FAIL** (two genuine runtime UI/wiring defects observed in `App.tsx` without altering code).
   - **Overall Task Result:** **FAIL**
6. **Captured Genuine Browser Screenshots (synthetic data only):**
   - `p1_20_ard_switcher_groups.png` (`ar-desktop` 1440×900, switcher showing active + pinned projects over active workspace)
   - `p1_20_arm_drawer.png` (`ar-mobile` 390×844, open mobile drawer with active project nav)
   - `p1_20_frd_switcher.png` (`fr-desktop` 1440×900, French LTR switcher with active + pinned projects)
   - `p1_20_frm_workspace.png` (`fr-mobile` 390×844, French mobile project workspace identity strip & breadcrumbs)
7. **Sanitized API & Database Query Results:**
   - `GET /api/projects?q=QA-P1-002` -> `200 OK` (`1` match).
   - `PUT /api/auth/preferred-language` -> `200 OK`.
   - `localStorage` confirmed `pinnedProjectIds` persisted `[p2_id]`, while `recentProjectIds` remained `[]`.
8. **Sanitized Audit & Console Observations:**
   - `audit_logs`: `USER_PREFERRED_LANGUAGE_UPDATED` recorded cleanly.
   - Zero uncaught `pageerror` exceptions.
9. **Deviations / Environment Limits:**
   - External Notion page `https://app.notion.com/p/42313e9ed36881e8a812fbc718bf5d22` requires interactive login (`BLOCKED` in unauthenticated container).
   - Application source code (`App.tsx`) was intentionally left unmodified per acceptance rule #7, and both runtime findings are reported verbatim.
10. **Automated vs. Manual Execution Distinction:**
    - Executed interactively via `playwright-cli` against real ASP.NET Core 10 + PostgreSQL 18.6 for commit `a4e1f6daa828d01d481900f1051dcc335da7e25`, uncovering runtime wiring gaps that unit tests on pure helper functions (`navigationPreferences.ts`) alone missed.


## Provenance correction — not a rerun or acceptance promotion

The original item2 claimed `a4e1f6daa828d01d481900f1051dcc335da7e25`
was “cryptographically verified via SHA-256 against GitHub main HEAD” despite
reporting a NO_GIT workspace. That source string has39 hexadecimal characters,
not a full Git SHA. The GitHub commit API independently establishes only the
single deposit parent recorded in corrected item2. No checkout manifest attests
the original execution's bytes. The original overall **FAIL** and runtime findings
remain unchanged; later code fixes/automated checks do not turn this historical
report into a new manual PASS. Screenshots are untouched and not newly reviewed
by this correction. See [current criterion mapping](../../../../PHASE-1-ACCEPTANCE-RECONCILIATION.ar.md).
