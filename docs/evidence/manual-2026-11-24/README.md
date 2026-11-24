# Manual Browser Evidence — 24 November 2026

**Environment:** Vite-only preview (`PROMOGEST_VITE_ONLY=1`) on loopback, Node 24, Playwright Chromium.  
**Scope:** Visual and functional checks for P1-10 (reservation review queue) + language/viewport matrix + project/reservations screens.  
**Operator:** Automated capture script (`scripts/capture-manual-evidence.mjs`) driven against a fresh preview session.  
**Data:** Fictional demo organization and project only (`DEMO-16-001`). No production data.

## Captured screenshots

| File | Description |
|------|-------------|
| `01-setup-wizard-ar-desktop.png` | First-run setup wizard, Arabic RTL, desktop 1440×900 |
| `02-workspace-home-ar-desktop.png` | Organization home / local center after entering preview, Arabic |
| `03-project-overview-ar-desktop.png` | Project overview for DEMO-16-001 (Les Sables d'Or) |
| `04-reservations-queue-ar-desktop.png` | Reservations screen + empty review queue (P1-10), Arabic desktop |
| `05-after-create-hold-ar-desktop.png` | After successfully creating one active hold (HOLD-DEMO-16-001-001) |
| `06-reservations-queue-fr-desktop.png` | Same screen after language switch to French LTR |
| `07-reservations-queue-ar-mobile.png` | Arabic mobile viewport (390×844) |
| `08-reservations-queue-fr-mobile.png` | French mobile viewport |

## Observed results

- Setup wizard and preview entry work correctly in Arabic RTL.
- Project navigation and module list render as expected.
- **P1-10 review queue panel** is present, correctly titled in both languages, shows count badge, and displays the empty-state message when no holds require review.
- Creating a reservation/hold via the UI succeeds; the new row appears in the history table with status Active / نشط.
- Language switch (العربية ↔ Français) updates `dir`, labels, and layout immediately without page reload.
- Mobile layout remains usable; queue panel and form stack correctly.
- Queue remains empty (expected) because the project status was not changed to Suspended in this run. Full review-queue population requires the project to be suspended (see P1-10 brief).

## Limitations of this run

- Vite-only / in-memory preview API (no real PostgreSQL / ASP.NET Core). Some domain rules that exist only on the real API are not exercised.
- No forced-password-change or multi-user session tests (those require the full Phase 0 kit + disposable databases).
- Screenshots are visual evidence only; they do not replace the CI Playwright suite in `tests/browser/phase0.py`.

## How to re-run

```bash
PROMOGEST_VITE_ONLY=1 npx vite --host 127.0.0.1 --port 5173 &
node scripts/capture-manual-evidence.mjs
```
