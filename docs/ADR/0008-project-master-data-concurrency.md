# ADR 0008 — Project master-data optimistic concurrency

- **Status:** Accepted and implemented in PR #27 (merged to `main` on 15 November 2026)
- **Date:** 15 November 2026
- **Scope:** project master-data edits and project-membership changes
- **Decision owners:** PROMO GEST product and engineering

## Context

The `Project` aggregate already inherited a `ConcurrencyStamp` from `BaseEntity`. EF Core mapped the field to `projects.concurrency_stamp` as a concurrency token. However, the HTTP `ProjectDto` and `UpdateProjectRequest` did not expose a version contract.

The update service loaded the latest row, then applied the values submitted by the edit form. A user who kept an old form open could therefore overwrite a colleague's newer changes without knowing that the source version was stale. EF's token could detect two simultaneous SQL updates only when both requests had loaded the same version; it could not detect an old browser form that fetched the row later through the service.

## Decision

Project master-data updates use an explicit compare-and-swap contract:

1. `ProjectDto` returns the current `ConcurrencyStamp`.
2. The client retains that exact version while editing.
3. `UpdateProjectRequest` must include `ExpectedConcurrencyStamp`.
4. The application compares the expected stamp with the loaded project before applying any submitted field changes.
5. A missing or stale token returns HTTP 409 with code `PROJECT_CONCURRENCY_CONFLICT`. No submitted field is applied.
6. EF Core's existing database concurrency-token check remains enabled. If two requests read the same stamp before either commits, the database update predicate allows only one winner; the loser returns HTTP 409 with code `CONCURRENCY_CONFLICT`.
7. The client does not silently retry with a newly fetched token. A conflict must be visible so the user can compare the latest project data with their unsaved values and decide what to reapply.

The version advances when project master-data details are changed. It also advances when project membership is added or removed because those operations change the Project aggregate. The in-memory Vite preview follows the same contract, including version advancement for successful updates and membership add/remove.

This decision applies to project master data. Buildings, floors, property units, customers and reservations retain their own concurrency tokens and domain-specific update contracts; this ADR does not collapse those records into one global project lock.

## User experience

- Arabic and French edit forms send the version returned by the project API.
- A stale submission leaves the form's entered values visible and reports that the save was rejected.
- The application does not replace the user's form values with a newer server copy or automatically resubmit them.
- The user must review the latest project version and deliberately reconcile changes before another save.

## Database and migration impact

No migration was required. The `projects.concurrency_stamp` column and EF Core `IsConcurrencyToken()` mapping were already present. This change only completes the contract and applies the existing persistence invariant across API and preview layers.

No Cloud SQL or organization data was changed as part of this work.

## Verification

Merged PR: [#27 — prevent stale master-data overwrites](https://github.com/younestech31/PROMO-GEST/pull/27)

Automated coverage includes:

- Application test: a stale `ExpectedConcurrencyStamp` returns `PROJECT_CONCURRENCY_CONFLICT` and leaves the latest project values/version unchanged.
- PostgreSQL integration test: an update changes the returned stamp; a second submission with the prior stamp receives HTTP 409 and does not overwrite the saved project.
- PostgreSQL integration race: two requests based on the same version produce exactly one successful update and one conflict.
- Vite preview helper and HTTP tests: same-version update succeeds and rotates the stamp; stale reuse receives HTTP 409.
- Frontend strict TypeScript checks and all application tests.

CI evidence:
- PR run: https://github.com/younestech31/PROMO-GEST/actions/runs/43692616371
- Branch run: https://github.com/younestech31/PROMO-GEST/actions/runs/43692610919

Both runs passed all three jobs: frontend checks/build/static hosting, .NET 10 plus PostgreSQL 18 least-privilege integration and restore, and Windows publish/PowerShell validation.

## Consequences

Positive:
- An edit form can no longer overwrite a newer project master-data version without explicit user awareness.
- Competing writes have a deterministic single-winner result.
- Project membership changes invalidate stale project forms consistently.
- Production API and Vite preview exercise the same version contract.

Trade-offs:
- Older external clients that call project update without `ExpectedConcurrencyStamp` are rejected. The supported ERP UI now sends the field.
- The user must review and manually reconcile a conflict instead of relying on automatic last-write-wins behavior.
- This version token protects only fields within the Project aggregate; each separate business aggregate still requires its own concurrency policy.

## References

- EF Core concurrency handling: https://learn.microsoft.com/en-us/ef/core/saving/concurrency
- OWASP Authorization Cheat Sheet (deny by default and server-side enforcement): https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
