# PROMO GEST — Requirement Traceability Matrix

**Document Role:** End-to-end engineering traceability table linking every PROMO GEST requirement (Domains **A–L** + Operations) to its domain entity, application service, API route, UI screen, authorization rule, tests, release gates, and verified `Current State` at last code-changing source commit `23f019de7c787c0f93b5b7f0b5cec69992ff087a`, re-run by main CI #541 at audit start (`43764687600`). Main commit inspected at audit start: `14428830eb0b81beedecc2136ba65fdf68a23266`.  
**Status Legend (Strict 6-State Taxonomy):**  
- `IMPLEMENTED_AND_VERIFIED`: Code exists AND passed automated verification in the audited repository baseline.  
- `IMPLEMENTED_NOT_VERIFIED`: Code exists in workspace, but automated build/integration/E2E verification failed or could not run.  
- `PARTIALLY_IMPLEMENTED`: Part of the module/feature exists (backend or UI only, or preview/API drift).  
- `PLANNED`: Designed in architecture docs; zero production implementation in `src/` or `apps/local-web/`.  
- `BLOCKED`: Cannot move forward until a specific defect or prerequisite gate is resolved.  
- `DEPRECATED`: Legacy pattern superseded by transition.  
*Note: Every requirement row below uses **exactly one** status value. Blockers and test failures are recorded explicitly in the Notes/Evidence column, never combined into hyphenated status tokens.*

---

## 1. Domain A — Organization, Governance & Administration

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-A01` | One-time first-run organization & single System Administrator setup | A | `OrganizationSettings`, `User`, `Role` | `SetupService` | `GET /api/setup/status`, `POST /api/setup/initialize` | `FirstRunSetupWizard.tsx` | Anonymous (pre-init) + CSRF; serializable TX | `DomainInvariantTests`, `ApplicationSecurityAndFoundationTests` (`FirstRunSetup_*`) | `G1–G4`, `G8` | `IMPLEMENTED_NOT_VERIFIED` | Build and PG18 integration execution pass in CI #541; manual first-run wizard RTL/LTR browser review remains outstanding. |
| `REQ-A02` | Cookie session login, CSRF token issuance, session restore, logout | A | `User`, `UserSession` | `AuthService` (`Pbkdf2PasswordHasher`, `CryptoSessionTokenGenerator`) | `GET /api/auth/csrf`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | `LoginScreen.tsx`, `ErpShellLayout.tsx` | Auth: HTTP-only `SameSite=Strict` `promogest_session` + `X-CSRF-TOKEN` | `DomainInvariantTests`, `ApplicationSecurityAndFoundationTests` (`Authentication_*`) | `G1`, `G3`, `G4`, `G8` | `IMPLEMENTED_NOT_VERIFIED` | CSRF, login, session and restart integration tests execute successfully in CI #531; real preview-origin cookie behavior and browser review remain open. |
| `REQ-A03` | Organization profile data delivery (RC, NIF, NIS, Wilaya, currency DZD) | A | `OrganizationSettings` | `AuthService` (`Me`), `SetupService` | `GET /api/auth/me` *(delivers full organization summary via `SessionResponse.Organization` & `OrganizationSummaryResponse`); `GET /api/setup/status` delivers basic setup state* | `ErpShellLayout.tsx`, `OrganizationProfileView.tsx` | `[Authorize]` (`GET /api/auth/me`) / Anonymous (`GET /api/setup/status`) | `ApplicationSecurityAndFoundationTests` | `G1`, `G8` | `IMPLEMENTED_NOT_VERIFIED` | Application tests and full session organization-summary delivery build pass in CI #531; manual organization-profile/browser review remains separate. |
| `REQ-A04` | Organization profile edit after installation | A | `OrganizationSettings` | *(Missing)* | *(Planned: `PUT /api/organization`)* | `OrganizationProfileView.tsx` *(read-only today)* | `org.manage` *(seeded, not enforced)* | None | `G1–G6`, `G8` | `PARTIALLY_IMPLEMENTED` | View is read-only; backend update endpoint is planned. |
| `REQ-A05` | Employee/user account lifecycle & role assignment (protect single SysAdmin) | A | `User`, `Role`, `UserRole`, `UserSession` | `UserManagementService` | `GET /api/users/roles`, `GET/POST/PUT /api/users`, `PATCH /api/users/{id}/status`, `POST /api/users/{id}/reset-password` | `UsersManagementView.tsx` | `users.read`, `users.manage` (`SYSTEM_ADMIN` protected) | `DomainInvariantTests`, `ApplicationSecurityAndFoundationTests` (`UserManagement_*`) | `G1–G8` | `IMPLEMENTED_NOT_VERIFIED` | Application and PostgreSQL 18 suites pass in CI #531 for the tested user lifecycle and single-System-Administrator safeguards. |
| `REQ-A06` | Offline CLI SysAdmin unlock & password recovery (no internet/email) | A | `User`, `UserSession`, `AuditLog` | `AdminRecoveryService` | CLI: `--unlock-admin`, `--reset-admin-password` | None (server CLI only) | Local OS admin host access | `ApplicationSecurityAndFoundationTests` (`AdminRecoveryService_*`) | `G1`, `G6`, `G10` | `IMPLEMENTED_AND_VERIFIED` | Verified by application test suite. |
| `REQ-A07` | Immutable audit log query & fail-closed persistence | A | `AuditLog` | `AuditQueryService`, `EfAuditWriter` | `GET /api/audit` | `AuditLogView.tsx` | `audit.read` | `DomainInvariantTests`, `ApplicationSecurityAndFoundationTests` (`AuditFailure_*`) | `G2`, `G3`, `G6` | `IMPLEMENTED_NOT_VERIFIED` | Audit authorization, fail-closed write behavior and PostgreSQL audit immutability tests pass in CI #531. |
| `REQ-A08` | Versioned Algerian Administrative Reference catalogue (69 Wilayas + 1,541 communes) | A | `AdministrativeUnit`, `AdministrativeReferenceSnapshot` *(planned)* | *(Planned)* | *(Planned: `GET /api/reference/administrative-units`)* | `FirstRunSetupWizard.tsx`, `ProjectsAccessView.tsx` *(Wilaya 01–69)* | Public authenticated reference read; `org.manage` import | `validation.test.ts` (Wilaya `01–69`), `DomainInvariantTests` | `G1`, `G2`, `G8`, Practitioner sign-off (`ADR-0010`) | `PARTIALLY_IMPLEMENTED` | Wilaya UI selectors updated; full 1,541-commune dataset integration planned. |

---

## 2. Domain B — Real Estate Projects & Project Membership

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-B01` | List & view authorized real-estate projects with dynamic building/unit counts | B | `Project`, `ProjectMember` | `ProjectService` | `GET /api/projects`, `GET /api/projects/{projectId}` | `ProjectsAccessView.tsx`, `OverviewView.tsx` | `projects.read` + explicit `ProjectMember` scope | `ApplicationSecurityAndFoundationTests` (`ProjectAuthorization_*`, `ProjectListAndDetail_*`) | `G1`, `G3`, `G8` | `IMPLEMENTED_NOT_VERIFIED` | Application and PostgreSQL 18 integration suites pass in CI #531; manual bilingual browser review remains outstanding. |
| `REQ-B02` | Create & update projects (Wilaya 01–69, DZD budget, immutable code, CAS concurrency) | B | `Project` | `ProjectService` | `POST /api/projects`, `PUT /api/projects/{projectId}` | `ProjectsAccessView.tsx` | `projects.manage` (+ membership on update) | `DomainInvariantTests` (`Project_*`), `ApplicationSecurityAndFoundationTests` (`ProjectUpdates_*`) | `G1–G8` | `IMPLEMENTED_NOT_VERIFIED` | Application and PostgreSQL 18 integration suites pass in CI #531; manual bilingual browser review remains outstanding. |
| `REQ-B03` | Assign/update/remove `ProjectMember` capabilities (`CanManageConstruction`, `CanManageSales`, `CanManageDocuments`, last-PM guard) | B | `ProjectMember` | `ProjectService` | `PUT /api/projects/{projectId}/members`, `DELETE /api/projects/{projectId}/members/{userId}` | `ProjectsAccessView.tsx` | `projects.access.manage` | `DomainInvariantTests`, `ApplicationSecurityAndFoundationTests` | `G1`, `G3`, `G5`, `G6` | `IMPLEMENTED_NOT_VERIFIED` | Application and PostgreSQL 18 integration suites pass in CI #531; manual bilingual browser review remains outstanding. Uses `projects.access.manage` permission. |

---

## 3. Domain C — Physical Structure & Property Units

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-C01` | Read building → floor → property unit tree per project | C | `Building`, `BuildingFloor`, `PropertyUnit` | `ProjectStructureService` | `GET /api/projects/{projectId}/structure` | `ProjectStructureModal.tsx` | `projects.read` + `ProjectMember` | `ApplicationSecurityAndFoundationTests` (`ProjectStructure_*`) | `G3`, `G8` | `IMPLEMENTED_NOT_VERIFIED` | Application and PostgreSQL 18 integration suites pass in CI #531; manual bilingual browser review remains outstanding. |
| `REQ-C02` | Create & edit individual buildings, floors, and units (gross/net m², rooms) | C | `Building`, `BuildingFloor`, `PropertyUnit` | `ProjectStructureService` | `POST/PUT .../buildings`, `POST/PUT .../floors`, `POST/PUT .../units` | `ProjectStructureModal.tsx` | `projects.read` + `ProjectMember` (`CanManageConstruction \|\| ProjectManager`) | `DomainInvariantTests`, `ApplicationSecurityAndFoundationTests` | `G1–G8` | `IMPLEMENTED_NOT_VERIFIED` | Application and PostgreSQL 18 integration suites pass in CI #531; manual bilingual browser review remains outstanding. |
| `REQ-C03` | Controlled physical status transition (`Planned -> UnderConstruction -> AvailableForSale \| Withdrawn`; blocks direct `Reserved`/`Sold`/`Delivered`) | C | `PropertyUnit` | `ProjectStructureService` | `PUT .../units/{unitId}/status` | `ProjectStructureModal.tsx` | `CanManageConstruction \|\| ProjectManager` + CAS | `DomainInvariantTests` (`PropertyUnit_EnforcesForwardLifecycle*`), `ApplicationSecurityAndFoundationTests` | `G1`, `G5`, `G6` | `IMPLEMENTED_NOT_VERIFIED` | Domain, Application and PostgreSQL 18 integration checks pass in CI #531; manual browser review remains outstanding. |
| `REQ-C04` | Bulk floor/unit generation, unit base commercial pricing, orientation | C | `PropertyUnit` *(planned fields)* | *(Planned)* | *(Planned)* | *(Planned)* | `projects.structure.manage` | None | `G1–G8` | `PLANNED` | Designed in roadmap; implementation pending. |

---

## 4. Domain D — Counterparties (Party), Customers & CRM

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-D01` | Organization-wide `Party` directory search & canonical identity update | D | `Party` (`parties`) | `PartyDirectoryService` | `GET /api/parties` (uses `parties.directory.read`), `PUT /api/parties/{partyId}` (uses `parties.identity.manage`) | API helpers and customer-registry Party lookup; no standalone directory view | `parties.directory.read` / `parties.identity.manage` | `PartyDomainTests`, `ApplicationSecurityAndFoundationTests`, PostgreSQL 18 E2E | `G1`, `G3`, `G5`, `G6`, `G8` | `PARTIALLY_IMPLEMENTED` | PRs #35–#38 verify concurrency, security-denial audit, identity-collision rejection and synchronization of linked project-customer mirrors in CI #531. Standalone directory UI remains unimplemented. |
| `REQ-D02` | Project-scoped customer registry creation & updates linked to `Party` | D | `ProjectCustomer`, `Party` | `ProjectCustomerService` | `GET/POST /api/projects/{projectId}/customers`, `GET /.../customers/{id}`, `PUT /.../customers/{id}` | `ProjectCustomerRegistryModal.tsx` | `customers.read` / `customers.manage` + `CanManageSales` | `ProjectCustomerDomainTests`, `ApplicationSecurityAndFoundationTests`, PostgreSQL 18 E2E | `G1–G8` | `IMPLEMENTED_NOT_VERIFIED` | CI #531 verifies create/update, shared Party linkage across projects, identity collision rejection, synchronized mirrors and stale-token conflicts; manual registry browser review remains outstanding. |
| `REQ-D03` | Customer CRM interaction & follow-up timeline | D | `CustomerInteraction` | `ProjectCustomerService` | `POST /api/projects/{projectId}/customers/{id}/interactions` | `ProjectCustomerRegistryModal.tsx` | `customers.manage` + `CanManageSales` | `ProjectCustomerDomainTests`, PostgreSQL 18 E2E | `G1`, `G3`, `G6` | `IMPLEMENTED_NOT_VERIFIED` | Interaction creation and reload are exercised by the green CI #531 PostgreSQL 18 workflow; browser interaction review remains outstanding. |
| `REQ-D04` | Single source of truth for `Party` names/kinds (retire dual columns on `project_customers`) | D | `Party`, `ProjectCustomer` | `PartyDirectoryService`, `ProjectCustomerService` | Existing `/api/parties` + `/api/projects/{id}/customers` | `ProjectCustomerRegistryModal.tsx` | Existing CRM permissions | Phase 1 schema & sync tests *(required)* | `G2`, `G5`, `G7` | `PLANNED` | Canonical Party identity is now synchronized to transitional project-customer mirrors and collision-checked (PR #38). Physical retirement of duplicate columns remains Phase 1 migration work. |
| `REQ-D05` | Multi-channel contacts, sensitive fiscal/ID vault (`NIN`, `CNI`, `NIF`, `NIS`, `RC`), legal representatives & human-approved manual merge | D | `PartyContactPoint`, `PartyIdentifier`, `PartyRepresentative`, `PartyMergeRecord` *(planned)* | *(Planned)* | *(Planned: `/api/parties/{id}/identifiers`, `/representatives`, `/merge`)* | *(Planned)* | `parties.identity.manage` (`SYSTEM_ADMIN` seeded) | None | `G1–G8` | `PLANNED` | Designed in roadmap. |
| `REQ-D06` | Organization `Employee` master decoupled from optional `User` login (`ADR-0009`) | D | `Employee` *(planned)* | *(Planned)* | *(Planned: `/api/employees`)* | *(Planned)* | `users.manage` / future HR role | None | `G1–G7` | `PLANNED` | Designed in roadmap. |

---

## 5. Domain E — Commercial Operations & Internal Unit Holds

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-E01` | Create Internal Unit Hold (`AvailableForSale -> Reserved`, unique partial active index, due date) | E | `ProjectSalesReservation`, `PropertyUnit` | `ProjectSalesReservationService` | `GET /api/projects/{id}/reservations`, `GET .../reservations/{resId}`, `POST .../reservations` | `ProjectSalesReservationsModal.tsx` | `sales.reservations.read`, `sales.reservations.manage` + `CanManageSales` | `DomainInvariantTests`, PostgreSQL 18 E2E | `G1–G8` | `IMPLEMENTED_NOT_VERIFIED` | CI #531 PG18 E2E verifies create/read/list, active uniqueness and concurrent single-winner behavior; manual sales UI review remains outstanding. |
| `REQ-E02` | Cancel Internal Unit Hold & automatic due expiry (`Reserved -> AvailableForSale`) | E | `ProjectSalesReservation`, `PropertyUnit` | `ProjectSalesReservationService` | `POST .../reservations/{resId}/cancel` | `ProjectSalesReservationsModal.tsx` | `sales.reservations.manage` + `CanManageSales` | `DomainInvariantTests`, PostgreSQL 18 E2E | `G1–G8` | `IMPLEMENTED_NOT_VERIFIED` | CI #531 PG18 E2E exercises cancellation/unit release, concurrent cancellation cleanup and expiry processing; browser workflow review remains outstanding. |

---

## 6. Domain F — Contracts, Commitments & Legal Deeds (`PLANNED`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-F01` | Statutory Reservation Contract (Law 11-04 Art. 27/32/33; FGCMPI escrow reference) | F | `SalesContract`, `ContractBuyerShare`, `DocumentLink` *(planned)* | *(Planned)* | *(Planned: `/api/projects/{id}/contracts`)* | *(Planned)* | `contracts.manage` (**PLANNED — NOT SEEDED**) | None | `G1–G8`, Legal Sign-Off | `PLANNED` | Future permission `contracts.manage` is not among the 18 seeded permissions. |
| `REQ-F02` | VSP Contract (*Vente sur Plan* — Law 11-04 & Decree 13-431 prereqs, permits, FGCMPI guarantee) | F | `SalesContract`, `ContractVersion`, `ContractBuyerShare` *(planned)* | *(Planned)* | *(Planned)* | *(Planned)* | `contracts.manage` (**PLANNED — NOT SEEDED**) | None | `G1–G8`, Legal Sign-Off | `PLANNED` | Future requirement. |
| `REQ-F03` | Completed Property Sale / *Acte Notarié* + Contract Addendum / *Cession* / *Résiliation* | F | `SalesContract`, `ContractVersion` *(planned)* | *(Planned)* | *(Planned)* | *(Planned)* | `contracts.manage` (**PLANNED — NOT SEEDED**) | None | `G1–G8`, Legal Sign-Off | `PLANNED` | Future requirement. |

---

## 7. Domain G — Installments, Collections & Treasury in DZD (`PLANNED`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-G01` | Versioned payment obligation schedule linked to ContractVersion & milestone triggers | G | `PaymentObligation` *(planned)* | *(Planned)* | *(Planned: `/api/projects/{id}/obligations`)* | *(Planned)* | `payments.manage` (**PLANNED — NOT SEEDED**) | None | `G1–G8`, CPA + Legal Sign-Off | `PLANNED` | Future permission `payments.manage` is not seeded. |
| `REQ-G02` | Record confirmed DZD receipts, allocations, FGCMPI escrow separation, refunds/reversals | G | `PaymentReceipt`, `PaymentAllocation`, `RefundOrReversal`, `TreasuryAccount` *(planned)* | *(Planned)* | *(Planned: `/api/projects/{id}/receipts`, `/treasury`)* | *(Planned)* | `payments.manage` (**PLANNED — NOT SEEDED**) | None | `G1–G8`, CPA Sign-Off | `PLANNED` | Future requirement. |

---

## 8. Domain H — Construction Works & Chantier Tracking (`PLANNED`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-H01` | Technical project lots, contractor agreements, *attachements*, interim payment situations | H | `WorkLot`, `ContractorAgreement`, `WorkSituation` *(planned)* | *(Planned)* | *(Planned: `/api/projects/{id}/works`)* | *(Planned)* | `works.manage` (**PLANNED — NOT SEEDED**) | None | `G1–G8` | `PLANNED` | Future permission `works.manage` is not seeded. |
| `REQ-H02` | Formal `ConstructionMilestoneEvidence` submission & acceptance unlocking VSP billing | H | `ConstructionMilestoneEvidence`, `DocumentLink` *(planned)* | *(Planned)* | *(Planned: `/api/projects/{id}/milestones`)* | *(Planned)* | `works.manage` (**PLANNED — NOT SEEDED**) | None | `G1–G8`, Legal Sign-Off | `PLANNED` | Future requirement. |

---

## 9. Domain I — Procurement, Suppliers & Inventory (`PLANNED`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-I01` | Supplier directory (`Party`), POs, delivery notes, warehouse/site stock ledger (`IN`/`OUT`/`TRANSFER`) | I | `SupplierProfile`, `PurchaseOrder`, `DeliveryNote`, `StockItem`, `StockMovement` *(planned)* | *(Planned)* | *(Planned: `/api/procurement`, `/api/inventory`)* | *(Planned)* | Procurement permissions (**PLANNED — NOT SEEDED**) | None | `G1–G8` | `PLANNED` | Future requirement. |

---

## 10. Domain J — Algerian SCF Accounting & Tax (`PLANNED`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-J01` | SCF chart of accounts (Classes 1–7), fiscal periods/locks, balanced double-entry journals & *extourne* | J | `ScfAccount`, `FiscalPeriod`, `ScfJournalEntry`, `ScfJournalLine` *(planned)* | *(Planned)* | *(Planned: `/api/accounting/journals`, `/periods`)* | *(Planned)* | `accounting.manage` (**PLANNED — NOT SEEDED**) | None | `G1–G8`, CPA Sign-Off | `PLANNED` | Future permission `accounting.manage` is not seeded. |
| `REQ-J02` | Separated `TaxEvent` tracking (Finance Law 2025 Art. 59 TVA; Finance Law 2026 Art. 53 9% vs 19%) | J | `TaxEvent` *(planned)* | *(Planned)* | *(Planned: `/api/accounting/tax-events`)* | *(Planned)* | `accounting.manage` (**PLANNED — NOT SEEDED**) | None | `G1–G8`, CPA Sign-Off | `PLANNED` | Future requirement. |

---

## 11. Domain K — Document Management & Archiving (`K-Min` & `K-Full`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-K01` | Upload, list, and integrity-verified download (`SHA-256`) of local project files | K (`K-Min` base) | `StoredFile` (`stored_files`) | `ProjectDocumentService`, `LocalFileStorageService` | `GET/POST /api/projects/{id}/documents`, `GET .../documents/{fileId}/download` | `ProjectDocumentsModal.tsx` | `files.read` / `files.write` + `CanManageDocuments` | PostgreSQL 18 E2E | `G1–G8`, `G10` | `IMPLEMENTED_NOT_VERIFIED` | CI #531 exercises upload, listing, checksum, download, cache headers and invalid file-signature/type rejection; manual browser review and full K-Min metadata/link lifecycle remain outstanding. |
| `REQ-K02` | Metadata update/soft-archive & structured entity linking (`DocumentLink`) | K (`K-Min` finish) | `StoredFile`, `DocumentLink` *(planned)* | `ProjectDocumentService` *(extension)* | *(Planned: `PUT/DELETE .../documents/{fileId}`)* | *(Planned)* | `files.write` + domain permission isolation | None | `G1–G8` | `PLANNED` | Required pre-Phase 2. |
| `REQ-K03` | Cross-module enterprise archival (Procurement/Stock/SCF vouchers), retention, legal hold | K (`K-Full`) | `StoredFile`, `DocumentLink`, `RetentionPolicy` *(planned)* | *(Planned)* | *(Planned)* | *(Planned)* | Role-scoped archive permissions | None | `G1–G8`, `G10` | `PLANNED` | Scheduled in Phase 5. |

---

## 12. Domain L & Operations — Reporting, Packaging, Security & Recovery

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Status | Notes & Verification Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-L01` | Operational project/audit summary views (`OverviewView`, `AuditLogView`) | L | `Project`, `AuditLog` | `ProjectService`, `AuditQueryService` | `GET /api/projects`, `GET /api/audit` | `OverviewView.tsx`, `AuditLogView.tsx` | `projects.read`, `audit.read` | `ApplicationSecurityAndFoundationTests` | `G3`, `G8` | `IMPLEMENTED_NOT_VERIFIED` | Application and PostgreSQL 18 test suites pass in CI #531 for the tested project/audit query paths; full reporting scope and manual browser review remain outstanding. |
| `REQ-L02` | Commercial pipeline, arrears aging, VSP variance & SCF offline exports | L | Read projections *(planned)* | *(Planned)* | *(Planned: `/api/reports/*`)* | *(Planned)* | Role-scoped reporting permissions | None | `G1–G8` | `PLANNED` | Designed in roadmap. |
| `REQ-OPS01` | Local PostgreSQL 18 3-role isolation, health probes, Data Protection, static `wwwroot`, backup/restore drills | Ops | N/A (`00-init-db.sql`, `DataProtectionConfiguration.cs`) | `HealthChecks`, backup scripts | `GET /health/live`, `GET /health/ready`; backup scripts | `App.tsx`, operation-level auth/setup error handling, Service Worker cache policy | Least-privilege `promogest_app` | `WindowsDpapiMachineScopeTests`, `LinuxCertificateDataProtectionTests`, PostgreSQL 18 restore drill | `G2`, `G7`, `G8`, `G10` | `IMPLEMENTED_NOT_VERIFIED` | CI #531 confirms PostgreSQL 18 integration, Linux/Windows publish, Data Protection recovery, and database/storage restore drill. The UI does not use a global disconnected banner; API and health responses are network-only and carry `Cache-Control: no-store` centrally. Customer-site installation and manual offline/browser UX review remain separate release checks. |
