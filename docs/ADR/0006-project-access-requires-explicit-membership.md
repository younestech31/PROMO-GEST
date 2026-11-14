# ADR 0006 — Project access requires explicit membership

- **Status:** Proposed for acceptance with foundation remediation PR
- **Date:** 15 November 2026
- **Decision owners:** PROMO GEST product and engineering
- **Scope:** all project-owned business records and project administration

## Context

The application has organization-level roles such as Project Director and fine-grained permission codes such as `projects.manage`, `projects.structure.manage`, `customers.manage`, and `sales.reservations.manage`.

Earlier application services treated some organization-level permissions (especially `projects.manage`) as a substitute for project membership. As a result, an employee with a project-management permission could read or mutate records in a project to which they had never been assigned. This contradicted the product's explicit rule that access to each project is granted deliberately by project assignment.

The earlier integration test encoded that bypass by expecting a non-member Project Director to update a project and add a building.

## Decision

Authorization for project-owned data is the intersection of:

1. an active authenticated identity;
2. the required action permission (or an explicit System Administrator technical override); and
3. explicit membership in the target project, unless the user has a separately defined, audited organization-wide resource scope.

A global role or permission grants an action capability, **not an implicit project scope**.

For ordinary project members:
- Project reads require membership and the relevant read permission.
- Project master-data edits require the project-management action permission and Project Manager membership.
- Structure changes require membership and the project construction capability (or Project Manager role, according to the current role contract).
- Customer and reservation changes require membership, the relevant module permission, and the sales capability (or Project Manager role).
- Document upload requires membership, the document capability, and the file permissions.
- Team assignment/removal requires membership as Project Manager plus the team-management permission.

The System Administrator remains a separate technical role and may bypass membership for support/recovery. This does not make the System Administrator a business approver or accountant.

## Lifecycle rules

- When a non-administrator creates a project, the server explicitly creates a Project Manager membership for that creator in the same application operation. The creator can then find and open the project through the member-filtered list.
- A project must not lose its last Project Manager through ordinary team-management operations. Reassign another Project Manager before demotion/removal.
- A project created by the technical System Administrator is not automatically assigned a business owner. A business Project Manager must be explicitly assigned before routine business work begins.
- Role and permission evaluation is performed on the server for each request. Frontend hiding, recent projects, favorites, route IDs and cached state are not authorization.

## Consequences

Positive:
- The authorization contract matches the user's explicit resource-scope rule.
- Cross-project IDOR risk is reduced across project details, structure, customers, documents and reservations.
- Project creation no longer leaves the non-admin creator unable to see the project they just created.
- Authorization can be tested with clear member / non-member / read-only / revoked-member cases.

Trade-offs:
- A Project Director or other privileged employee must be assigned to each project they are to access, unless an explicit organization-wide scope is later designed.
- Existing installations should be checked for projects with no active business Project Manager. Any reconciliation must be additive and audited; do not assign managers automatically without an authorized business decision.
- A role-only "global project access" permission is deliberately not supported.

## Verification requirements

- Non-member with global `projects.manage` still receives 403 for project details, master-data changes, structure, customers, documents and reservations.
- Member with correct action permission and project capability succeeds.
- Read-only member can read only the allowed resource and cannot mutate.
- Revoked member loses access immediately on the next API request.
- Creator is explicitly present in the newly created project's member list.
- Last Project Manager cannot be demoted or removed through normal team operations.
- Test both the ASP.NET Core API and the in-memory preview middleware; behavior must not diverge.

## References

- OWASP Authorization Cheat Sheet: deny by default, least privilege, and validate permissions on every request — https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- NIST RBAC project: roles group permissions but do not replace resource-level scope — https://csrc.nist.gov/projects/role-based-access-control
