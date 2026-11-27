# P1-15 — Production HTTPS project team acceptance

Date: 27 November 2026. Status: **new real-stack execution pending**.

## Scope and mobile correction

The existing Development real-stack scenario in `tests/browser/phase0.py` verifies
sole-manager refusal on desktop only. Mobile cards lacked the existing Manage Access
action, so the earlier record correctly made no mobile claim. This slice adds that
same action to mobile cards, using the unchanged `canManageProjectAccess` predicate
and the same modal-opening handler as desktop. It adds no permission or API bypass.

`tests/browser/project_team.py` exercises the real shipped SPA/API in the existing
four-profile disposable Production HTTPS fixture. It runs after the budget suite and
reuses its two synthetic active actors, without another login or a new account. The
Production login limiter remains unchanged. No SQL grants, migrations, seeded policy,
new service or operational-data changes. SQL is read-only and scoped to a UUID-validated
synthetic project; fixture validation precedes all I/O.

## Eight named checks per profile

1. SYSTEM_ADMIN is not implicitly assigned a project membership. Create a synthetic
   project, then assign the first ProjectManager through the actual access form with
   all four capability flags false (including finance).
2. DELETE without CSRF returns 403; membership and successful-audit counts unchanged.
3. Actual SPA removal of the only manager returns 409 `PROJECT_LAST_MANAGER_REQUIRED`,
   localized visible alert, no mutation and no false successful audit.
4. Actual SPA reassignment of that manager to CommercialAgent returns the same 409
   and visible alert, with unchanged membership and success counts.
5. Assign the replacement ProjectManager through the form; full navigation/reload
   reconstructs the saved two-member team.
6. Demotion of the first manager succeeds only once the replacement exists.
7. Revocation of the former manager succeeds; after full navigation, removing the
   replacement (now sole manager) is again refused, without mutation.
8. Exactly three `PROJECT_MEMBER_ASSIGNED` and one `PROJECT_MEMBER_REVOKED` events
   exist for the synthetic project; denied operations produce no false success.
   The organization summary/default language remains unchanged; no uncaught JS errors.

These are **sequential** operator checks. Concurrent demotion/removal races are covered
by existing real PostgreSQL integration tests, not newly claimed by this browser slice.
SYSTEM_ADMIN manages the team here; non-admin project-manager authorization and inactive
account behavior are not newly scored. A browser test does not prove operator approval.

## Evidence and verification

- Local frontend **118/118 PASS**, including mobile/desktop shared gate/handler guard.
- New helper **4/4 PASS**: guarded target, narrow payload, SQL UUID and check-list parity.
- Exporter **19/19**, importer **14/14 PASS**; Python compilation, TypeScript/build/lint
  ratchet pass. Real Production execution and actual screenshots **pending CI**.
- Explicit `--suite team` requires all prior baseline/organization/session/language
  groups plus eight team assertions/profile. Existing suite semantics remain unchanged.
- Three actual PNGs/profile are planned: sole-manager removal refusal, demotion refusal,
  and replacement-manager protection. Export uses `team-03-replacement-protected.png`.
  Alert and heading must both be within the viewport before capture (including mobile).
  No new screenshot is claimed until executed, imported and visually reviewed.
- Result JSON contains only profile, PASS, named booleans and a static scope. No user IDs,
  cookies, passwords, raw response dumps or SQL output are published in that file.
- TLS boundary unchanged: curl validates the disposable local CA; Chrome ignores trust
  for that fixture CA only. No institution certificate distribution is inferred.

PR #276 merged as `f3d675d13372acb5805d04a5ae9bf6bc869fbdbc` after final PR-head CI
46014381828 passed 4/4 and CodeQL 46014381535 passed 2/2. Exact-main CI 46034527006
passed 4/4 and CodeQL 46034527163 passed 2/2 on that exact merged SHA.

P1-15 remains In Review / Pending in existing tracking. Existing owner-policy,
institution-local/operator requirements, P1-10 dependency and phase gates remain
unchanged. No Notion state, institutional signature or deployment is changed.

## Initial execution correction

CI 46035154510 reached the new Production scenario but rejected project creation:
the helper incorrectly used `null` for the create contract's non-null decimal budget.
This is distinct from the intentionally nullable update/redaction contract. The fixture
now uses the existing SYSTEM_ADMIN zero-budget creation path, matching Development
coverage and the shipped API, with no authorization relaxation. That failed run is not
accepted evidence; the corrected full matrix must pass before results are scored.
