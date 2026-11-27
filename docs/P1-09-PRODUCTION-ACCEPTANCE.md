# P1-09 — Production HTTPS organization permission acceptance

Date: 27 November 2026. Status: implementation ready; new real-stack CI execution pending.

## Scope and correction

PR #271 is merged as `daefdc107cd3eac0e877c26b984004b1fc55df3b`.
Its Production HTTPS rehearsal covered administrator editing but did not run the
non-administrator P1-09 permission matrix in Production. Development-mode evidence
already exists in `tests/browser/phase0.py`; this slice adds Production coverage.

`canManageOrganizationProfile` previously short-circuited on the administrator flag,
ignoring `isActive` for that one case. It now delegates to `hasPermission`, retaining
the active administrator bypass while denying null/inactive users. This aligns the
button predicate with the existing server authorization; no server policy changes.
The frontend regression explicitly covers inactive administrator and non-admin users,
active administrator, canonical permission, legacy permission denial and anonymous users.

## Real-stack scenario

`tests/browser/organization_permissions.py` runs after the existing budget matrix in
`staging.py`, against the published Production API, Caddy HTTPS and PostgreSQL 18:

1. Create a VIEWER through the real user API; complete mandatory password rotation.
2. Authenticate through the SPA as a non-administrator with no `org.manage`.
3. Verify Arabic RTL / French LTR, read-only profile, absent edit button, direct PUT
   403 `FORBIDDEN_ORGANIZATION_MANAGE`, unchanged profile and `ACCESS_DENIED` audit.
4. Temporarily grant canonical `org.manage` to VIEWER **only in this disposable CI DB**.
   Refuse to overwrite a pre-existing grant. Fresh real SPA login must expose the
   canonical permission (not `organization.manage`) without administrator status.
5. Edit and save through the actual form, reload, independently read persisted name,
   and verify `ORGANIZATION_PROFILE_UPDATED` audit for that actor.
6. Revoke the temporary grant in `finally`. Without logging out the existing session,
   PUT must again return 403 without mutation; SPA reload must hide editing controls.

Runs in all four existing AR/FR desktop/mobile profiles. Each produces two sanitized
screenshots (`org-01-readonly.png`, `org-02-authorized-saved.png`) and
`organization-permissions.json` in `staging-https-evidence`. The existing 15-check
staging manifest and historical screenshots remain unchanged; this additional matrix
is separately reported and must not be inferred from an old manifest's PASS.

The guard runs before any I/O: GitHub Actions, loopback PostgreSQL, exact
`stg_<ar|fr>_<desktop|mobile>` DB, fixed local HTTPS origin and encrypted Data Protection
fixture are mandatory. No operational permission catalogue, schema/migration, runtime
security setting, production/Cloud SQL database or deployment is changed. The shipped
Production login limiter remains ten; no limit increase or retry-on-denial is added.
Passwords/sessions and response bodies are never placed in evidence. Exception
reporting names only static source locations and exception classes.

## Verification log

- Local frontend tests: **117/117 PASS**, including the expanded organization predicate test.
- TypeScript check: **PASS** (`npm --prefix apps/local-web run lint`).
- New offline helper tests: **2/2 PASS**, nullable payload/stamp and rejection before SQL/browser/filesystem.
- Python compile: **PASS** for helper and staging runner.
- New Production browser results and screenshots: **PENDING CI execution**, not scored yet.
- PR #271 exact-main postmerge CodeQL [45992729724](https://github.com/younestech31/PROMO-GEST/actions/runs/45992729724): **SUCCESS 2/2**.
- PR #271 exact-main postmerge CI [45992729728](https://github.com/younestech31/PROMO-GEST/actions/runs/45992729728): **in progress at this checkpoint**.

## Gates

P1-09 remains In Review / Pending until new technical evidence is observed and reviewed.
No Notion status is advanced. This is developer-led isolated Linux technical acceptance,
not an institutional signature, organization workstation setup or Windows service test.
P1-10 retains its acceptance dependency; P1-08 policy is not inferred. P1-01/P1-35
remain Deferred/Pending; P1-02 stays Blocked; Phases 2–5 stay gated.
