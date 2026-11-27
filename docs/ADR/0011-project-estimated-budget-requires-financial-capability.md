# ADR 0011 — Project Estimated Budget Requires Explicit Financial Capability

- **Status:** Accepted; implementation merged through PR #80; automated application/PostgreSQL/preview coverage exists. P1-05 manual Arabic/French Staging acceptance remains pending. The four-profile browser scenario and its verification record are tracked in [P1-05 browser acceptance](../P1-05-BUDGET-BROWSER-ACCEPTANCE.md).
- **Date:** 17 November 2026
- **Decision owners:** PROMO GEST Product Owner and engineering
- **Scope:** project summary/list/detail, project create/update contracts, project member responses, React project directory, and Vite-only development preview

## Context

The project directory and ProjectDto exposed EstimatedBudgetDzd to every user who could see a project. The existing ProjectMember.CanViewFinancials capability was enforced for documents in the Financial category, but its applicability to the project-level estimated budget had not been decided. Project management and financial visibility are distinct responsibilities: a Project Manager may need to maintain non-financial master data without being entitled to view or change a financial estimate, while a Finance Controller may need to read the estimate without being entitled to edit project master data.

The Product Owner explicitly confirmed on 17 November 2026 that the estimate must only be available to users who hold the relevant permission.

## Decision

1. **Classification:** Project.EstimatedBudgetDzd is restricted project financial data, not an unrestricted project-summary field.
2. **Read scope:** the current actor must have an explicit ProjectMember row for the target project with CanViewFinancials == true. This applies to every role, including SYSTEM_ADMIN and ProjectManager; neither role receives an implicit bypass. A system administrator can read it only when explicitly assigned as a project member with this capability.
3. **Write scope:** changing the amount requires all of:
   - an active actor;
   - projects.manage;
   - explicit membership as ProjectManager; and
   - CanViewFinancials == true on that same membership.
   A Finance Controller or other financial reader without Project Manager scope is read-only for this field.
4. **Non-financial master-data updates:** a Project Manager without CanViewFinancials may still update other project master data by sending EstimatedBudgetDzd: null. The application preserves the persisted amount. Any numeric amount supplied without the financial capability is rejected with HTTP 403 and an ACCESS_DENIED audit event.
5. **Project creation:** the existing non-administrator creation flow continues to create the creator's explicit Project Manager membership with its existing capabilities, including CanViewFinancials. SYSTEM_ADMIN has no project membership at creation, so it may create a project with a zero initial estimate only; a non-zero amount is rejected until a financial-authorized member is explicitly assigned and updates it through the normal guarded workflow.
6. **Response contract and UI:** project responses represent the budget as nullable. API list/detail/create/update/member responses return the numeric value only when the requesting actor has the explicit capability; otherwise the JSON field is null. The React project directory renders a dash for a redacted value and hides the budget editor. UI checks are affordances only; the API remains authoritative.
7. **Preview parity:** the Vite-only in-memory development API applies the same explicit capability rule, masks every project DTO response, rejects unauthorized budget writes, and preserves the stored amount when a null value is submitted.
8. **Audit:** a successful list/detail response that exposes the amount records PROJECT_FINANCIALS_VIEWED. Existing PROJECT_CREATED / PROJECT_UPDATED events audit authorized writes; denied amount writes record ACCESS_DENIED.

## Consequences

- Project visibility and budget visibility remain separate. A ProjectMember may see the project without seeing its estimated budget.
- Financial visibility alone does not authorize a user to edit the project or its budget.
- No role grant, new global permission, schema change, or data migration is introduced. The existing per-project capability is reused.
- The C# DTO and TypeScript contract use a nullable budget value to distinguish redaction from a real zero estimate.
- Existing installations retain their current project values; no backfill or automatic budget change is performed.
- Project-wide financial totals, financial indicators, and cross-project financial dashboards remain out of scope until separately specified and authorized.

## Verification requirements

- Application tests cover explicitly authorized and unauthorized members, SYSTEM_ADMIN without membership, Project Manager without financial capability, finance-only reader, non-member, null-preserving general update, denied numeric tampering, and read/denial audit events.
- PostgreSQL 18 end-to-end tests exercise the same API behavior, including membership flag changes and persistence of the unchanged amount.
- Vite preview tests cover DTO redaction, null-preserving update behavior, actual login/CSRF, role membership, and read/write boundaries.
- Frontend type-check/build and .NET 10 / PostgreSQL 18 / Windows CI must pass on the PR head.
- Manual Arabic RTL / French LTR browser acceptance is still required before marking P1-05 Done or classifying the end-to-end UX as verified.

## Non-goals

- No production database, Google AI Studio Cloud SQL, credentials, deployment, or data are changed.
- No production migration or backfill is required.
- No automatic financial permission is granted to existing Project Managers.
- No broader redesign of project workspace or financial reporting is included.
