# PROMO GEST — Requirement Traceability Matrix

**Document Role:** End-to-end engineering traceability table linking every PROMO GEST requirement (Domains **A–L** + Operations) to its domain entity, application service, API route, UI screen, authorization rule, tests, release gates, and verified `Current State` at commit `ec8769a5f778429cad0fec8f35d59f84f93b049d` (PR #34, CI Run `43710844749`).  
**Status Legend:** Uses strictly the 6 states in [MASTER-BLUEPRINT.md](MASTER-BLUEPRINT.md) (`IMPLEMENTED_AND_VERIFIED`, `IMPLEMENTED_NOT_VERIFIED`, `PARTIALLY_IMPLEMENTED`, `PLANNED`, `BLOCKED`, `DEPRECATED`).  
**Important Note on Verification Evidence:** GitHub Actions Run `43710844749` passed `frontend` (`24/24` tests, `tsc`, build) while `backend-and-postgres` failed compilation at `PostgresEndToEndTests.cs:1072` (`CS7036`). Therefore, items backed only by `Domain.Tests`/`Application.Tests` pass locally cleanly, whereas items requiring full PG18 E2E or missing unit/API tests reflect `IMPLEMENTED_NOT_VERIFIED` / `PARTIALLY_IMPLEMENTED` / `BLOCKED` honestly.

---

## 1. Domain A — Organization, Governance & Administration

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-A01` | One-time first-run organization & single System Administrator setup | A | `OrganizationSettings`, `User`, `Role` | `SetupService` | `GET /api/setup/status`, `POST /api/setup/initialize` | `FirstRunSetupWizard.tsx` | Anonymous only before init + CSRF; serializable TX | `DomainInvariantTests`, `ApplicationSecurityAndFoundationTests` (`FirstRunSetup_*`), `PostgresEndToEndTests` *(blocked by CS7036)* | `G1–G4`, `G7`, `G8` | `IMPLEMENTED_AND_VERIFIED` *(PG18 CI re-run blocked by CS7036)* |
| `REQ-A02` | Cookie session login, CSRF token issuance, session restore, logout | A | `User`, `UserSession` | `AuthService` (`Pbkdf2PasswordHasher`, `CryptoSessionTokenGenerator`) | `GET /api/auth/csrf`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | `LoginScreen.tsx`, `ErpShellLayout.tsx` | HTTP-only `SameSite=Strict` `promogest_session` + `X-CSRF-TOKEN` | `DomainInvariantTests` (lockout), `ApplicationSecurityAndFoundationTests` (`Authentication_*`), `PostgresEndToEndTests` *(CS7036)* | `G1`, `G3`, `G4`, `G7`, `G8` | `IMPLEMENTED_AND_VERIFIED` |
| `REQ-A03` | Organization profile read view (RC, NIF, NIS, Wilaya, currency DZD) | A | `OrganizationSettings` | `SetupService` (`GetStatusAsync`) | `GET /api/setup/status` | `OrganizationProfileView.tsx`, `OverviewView.tsx` | Authenticated / Setup status | `ApplicationSecurityAndFoundationTests` | `G1`, `G8` | `IMPLEMENTED_AND_VERIFIED` |
| `REQ-A04` | Organization profile edit after installation | A | `OrganizationSettings` | *(Missing)* | *(Planned: `PUT /api/organization`)* | `OrganizationProfileView.tsx` *(read-only today)* | `org.manage` *(seeded only, unenforced)* | None | `G1–G6`, `G8` | `PARTIALLY_IMPLEMENTED` |
| `REQ-A05` | Employee/user account lifecycle & role assignment (protect single SysAdmin) | A | `User`, `Role`, `UserRole`, `UserSession` | `UserManagementService` | `GET /api/users/roles`, `GET/POST/PUT /api/users`, `PATCH /api/users/{id}/status`, `POST /api/users/{id}/reset-password` | `UsersManagementView.tsx` | `users.read`, `users.manage` (`SYSTEM_ADMIN` protected) | `DomainInvariantTests`, `ApplicationSecurityAndFoundationTests` (`UserManagement_*`, `InactiveUser_*`), `PostgresEndToEndTests` *(CS7036)* | `G1–G8` | `IMPLEMENTED_AND_VERIFIED` |
| `REQ-A06` | Offline CLI SysAdmin unlock & password recovery (no internet/email) | A | `User`, `UserSession`, `AuditLog` | `AdminRecoveryService` | CLI: `--unlock-admin`, `--reset-admin-password` | None (server CLI only) | Local OS admin host access | `ApplicationSecurityAndFoundationTests` (`AdminRecoveryService_*`) | `G1`, `G6`, `G10` | `IMPLEMENTED_AND_VERIFIED` |
| `REQ-A07` | Immutable audit log query & fail-closed persistence | A | `AuditLog` | `AuditQueryService`, `EfAuditLogger` | `GET /api/audit` | `AuditLogView.tsx` | `audit.read` | `DomainInvariantTests`, `ApplicationSecurityAndFoundationTests` (`AuditFailure_*`, `InactiveUser_And_UnauthorizedAuditAccess_*`), `PostgresEndToEndTests` *(CS7036)* | `G2`, `G3`, `G6`, `G7` | `IMPLEMENTED_AND_VERIFIED` |
| `REQ-A08` | Versioned Algerian Administrative Reference catalogue (69 Wilayas + 1,541 communes) | A | `AdministrativeUnit`, `AdministrativeReferenceSnapshot` *(planned)* | *(Planned)* | *(Planned: `GET /api/reference/administrative-units`)* | `FirstRunSetupWizard.tsx`, `ProjectsAccessView.tsx` *(Wilaya 01–69)* | Public authenticated reference read; `org.manage` import | `validation.test.ts` (Wilaya `01–69`), `DomainInvariantTests` *(note: preview setup regex still `01-58`)* | `G1`, `G2`, `G8`, Practitioner sign-off (`ADR-0010`) | `PARTIALLY_IMPLEMENTED` |

---

## 2. Domain B — Real Estate Projects & Project Membership

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-B01` | List & view authorized real-estate projects with dynamic building/unit counts | B | `Project`, `ProjectMember` | `ProjectService` | `GET /api/projects`, `GET /api/projects/{projectId}` | `ProjectsAccessView.tsx`, `OverviewView.tsx` | `projects.read` + explicit `ProjectMember` | `ApplicationSecurityAndFoundationTests` (`ProjectAuthorization_*`, `ProjectListAndDetail_*`), `PostgresEndToEndTests` *(CS7036)* | `G1`, `G3`, `G7`, `G8` | `IMPLEMENTED_AND_VERIFIED` |
| `REQ-B02` | Create & update projects (Wilaya 01–69, DZD budget, immutable code, CAS concurrency) | B | `Project` | `ProjectService` | `POST /api/projects`, `PUT /api/projects/{projectId}` | `ProjectsAccessView.tsx` | `projects.manage` (+ membership on update) | `DomainInvariantTests` (`Project_*`), `ApplicationSecurityAndFoundationTests` (`ProjectUpdates_*`), `PostgresEndToEndTests` *(CS7036)* | `G1–G8` | `IMPLEMENTED_AND_VERIFIED` |
| `REQ-B03` | Assign/update/remove `ProjectMember` capabilities (`CanManageConstruction`, `CanManageSales`, `CanManageDocuments`, last-PM guard) | B | `ProjectMember` | `ProjectService` | `PUT /api/projects/{projectId}/members`, `DELETE /api/projects/{projectId}/members/{userId}` | `ProjectsAccessView.tsx` | `projects.manage` | `DomainInvariantTests`, `ApplicationSecurityAndFoundationTests`, `PostgresEndToEndTests` *(CS7036)* | `G1`, `G3`, `G5`, `G6`, `G7` | `IMPLEMENTED_AND_VERIFIED` |

---

## 3. Domain C — Physical Structure & Property Units

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-C01` | Read building → floor → property unit tree per project | C | `Building`, `BuildingFloor`, `PropertyUnit` | `ProjectStructureService` | `GET /api/projects/{projectId}/structure` | `ProjectStructureModal.tsx` | `projects.read` + `ProjectMember` | `ApplicationSecurityAndFoundationTests` (`ProjectStructure_*`), `PostgresEndToEndTests` *(CS7036)* | `G3`, `G7`, `G8` | `IMPLEMENTED_AND_VERIFIED` |
| `REQ-C02` | Create & edit individual buildings, floors, and units (gross/net m², rooms) | C | `Building`, `BuildingFloor`, `PropertyUnit` | `ProjectStructureService` | `POST/PUT .../buildings`, `POST/PUT .../floors`, `POST/PUT .../units` | `ProjectStructureModal.tsx` | `projects.read` + `ProjectMember` (`CanManageConstruction \|\| ProjectManager`) *(note: `projects.structure.manage` not checked yet)* | `DomainInvariantTests` (`PropertyUnit_UpdateDetails*`), `ApplicationSecurityAndFoundationTests`, `PostgresEndToEndTests` *(CS7036)* | `G1–G8` | `IMPLEMENTED_AND_VERIFIED` *(authz alignment in Phase 1)* |
| `REQ-C03` | Controlled physical status transition (`Planned -> UnderConstruction -> AvailableForSale \| Withdrawn`; blocks direct `Reserved`/`Sold`/`Delivered`) | C | `PropertyUnit` | `ProjectStructureService` | `PUT .../units/{unitId}/status` | `ProjectStructureModal.tsx` | `CanManageConstruction \|\| ProjectManager` + CAS | `DomainInvariantTests` (`PropertyUnit_EnforcesForwardLifecycle*`, `PropertyUnit_RequiresSalesWorkflow*`), `PostgresEndToEndTests` *(CS7036)* | `G1`, `G5`, `G6`, `G7` | `IMPLEMENTED_AND_VERIFIED` |
| `REQ-C04` | Bulk floor/unit generation, unit base commercial pricing, orientation | C | `PropertyUnit` *(planned fields)* | *(Planned)* | *(Planned)* | *(Planned)* | `projects.structure.manage` | None | `G1–G8` | `PLANNED` |

---

## 4. Domain D — Counterparties (Party), Customers & CRM

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-D01` | Organization-wide `Party` directory listing & canonical identity update (PR #34 C2) | D | `Party` (`parties`) | `PartyDirectoryService` | `GET /api/parties`, `PUT /api/parties/{partyId}` | Not exposed directly in standalone view yet (`apiClient` helpers exist) | `customers.read` / `customers.write` *(lacks audit on denial & has `previousKind` bug)* | `PartyDomainTests` (4 domain tests); **zero Application tests**; **zero E2E tests** (`CS7036` blocks integration build) | `G1`, `G3`, `G5`, `G6`, `G7`, `G8` | `BLOCKED` / `IMPLEMENTED_NOT_VERIFIED` |
| `REQ-D02` | Project-scoped customer registry creation & updates linked to `Party` | D | `ProjectCustomer`, `Party` | `ProjectCustomerService` | `GET/POST /api/projects/{projectId}/customers`, `GET /.../customers/{id}`, `PUT /.../customers/{id}` | `ProjectCustomerRegistryModal.tsx` | `customers.read` / `customers.write` + `CanManageSales` | `ProjectCustomerDomainTests` (12 tests); **broken `PostgresEndToEndTests.cs:1072` (`CS7036`)**; sync gap on `PUT /parties/{id}` | `G1–G8` | `BLOCKED` / `IMPLEMENTED_NOT_VERIFIED` |
| `REQ-D03` | Customer CRM interaction & follow-up timeline | D | `CustomerInteraction` | `ProjectCustomerService` | `POST /api/projects/{projectId}/customers/{id}/interactions` | `ProjectCustomerRegistryModal.tsx` | `customers.write` + `CanManageSales` | `ProjectCustomerDomainTests`, `PostgresEndToEndTests` *(CS7036)* | `G1`, `G3`, `G6`, `G7` | `IMPLEMENTED_NOT_VERIFIED` |
| `REQ-D04` | Single source of truth for `Party` names/kinds (retire dual columns on `project_customers`) | D | `Party`, `ProjectCustomer` | `PartyDirectoryService`, `ProjectCustomerService` | Existing `/api/parties` + `/api/projects/{id}/customers` | `ProjectCustomerRegistryModal.tsx` | Existing CRM permissions | Phase 1 schema & sync tests *(required)* | `G2`, `G5`, `G7` | `PLANNED` *(Phase 1)* |
| `REQ-D05` | Multi-channel contacts, sensitive fiscal/ID vault (`NIN`, `CNI`, `NIF`, `NIS`, `RC`), legal representatives & human-approved manual merge | D | `PartyContactPoint`, `PartyIdentifier`, `PartyRepresentative`, `PartyMergeRecord` *(planned)* | *(Planned)* | *(Planned: `/api/parties/{id}/identifiers`, `/representatives`, `/merge`)* | *(Planned)* | `parties.identity.manage` (`SYSTEM_ADMIN` seeded; PO role review open) | None | `G1–G8` | `PLANNED` |
| `REQ-D06` | Organization `Employee` master decoupled from optional `User` login (`ADR-0009`) | D | `Employee` *(planned)* | *(Planned)* | *(Planned: `/api/employees`)* | *(Planned)* | `users.manage` / future HR role | None | `G1–G7` | `PLANNED` |

---

## 5. Domain E — Commercial Operations & Internal Unit Holds

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-E01` | Create Internal Unit Hold (`AvailableForSale -> Reserved`, unique partial active index, due date) | E | `ProjectSalesReservation`, `PropertyUnit` | `ProjectSalesReservationService` | `GET /api/projects/{id}/reservations`, `GET .../reservations/{resId}`, `POST .../reservations` | `ProjectSalesReservationsModal.tsx` | `reservations.read`, `reservations.write` + `CanManageSales` *(preview lacks reservations)* | `DomainInvariantTests` (3 reservation tests); `PostgresEndToEndTests` *(blocked by CS7036)*; zero `Application.Tests` | `G1–G8` | `IMPLEMENTED_NOT_VERIFIED` |
| `REQ-E02` | Cancel Internal Unit Hold & automatic due expiry (`Reserved -> AvailableForSale`) | E | `ProjectSalesReservation`, `PropertyUnit` | `ProjectSalesReservationService` | `POST .../reservations/{resId}/cancel` *(expiry handled automatically on read/service; no `/expire` endpoint)* | `ProjectSalesReservationsModal.tsx` | `reservations.write` + `CanManageSales` | `DomainInvariantTests`, `PostgresEndToEndTests` *(CS7036)* | `G1–G8` | `IMPLEMENTED_NOT_VERIFIED` |

---

## 6. Domain F — Contracts, Commitments & Legal Deeds (`PLANNED`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-F01` | Statutory Reservation Contract (Law 11-04 Art. 27/32/33; FGCMPI escrow reference — distinct from internal hold) | F | `SalesContract` *(type: StatutoryReservation)*, `ContractBuyerShare`, `DocumentLink` *(planned)* | *(Planned)* | *(Planned: `/api/projects/{id}/contracts`)* | *(Planned)* | `contracts.read`, `contracts.manage` *(seeded; not wired)* | None | `G1–G8`, Legal Sign-Off | `PLANNED` |
| `REQ-F02` | VSP Contract (*Vente sur Plan* — Law 11-04 & Decree 13-431 prereqs, permits, FGCMPI guarantee, co-buyers 100%, Art. 36 check) | F | `SalesContract`, `ContractVersion`, `ContractBuyerShare` *(planned)* | *(Planned)* | *(Planned)* | *(Planned)* | `contracts.manage` | None | `G1–G8`, Legal Sign-Off | `PLANNED` |
| `REQ-F03` | Completed Property Sale / *Acte Notarié* + Contract Addendum / *Cession* / *Résiliation* workflows | F | `SalesContract`, `ContractVersion` *(planned)* | *(Planned)* | *(Planned)* | *(Planned)* | `contracts.manage` (with Legal + Commercial review) | None | `G1–G8`, Legal Sign-Off | `PLANNED` |

---

## 7. Domain G — Installments, Collections & Treasury in DZD (`PLANNED`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-G01` | Versioned payment obligation schedule linked to ContractVersion & milestone triggers | G | `PaymentObligation` *(planned)* | *(Planned)* | *(Planned: `/api/projects/{id}/obligations`)* | *(Planned)* | `payments.read`, `payments.manage` *(seeded; not wired)* | None | `G1–G8`, CPA + Legal Sign-Off | `PLANNED` |
| `REQ-G02` | Record confirmed DZD receipts (cashbox/bank/check), allocations, FGCMPI escrow separation, and non-destructive refunds/reversals | G | `PaymentReceipt`, `PaymentAllocation`, `RefundOrReversal`, `TreasuryAccount` *(planned)* | *(Planned)* | *(Planned: `/api/projects/{id}/receipts`, `/treasury`)* | *(Planned)* | `payments.manage` (SoD vs commercial creator) | None | `G1–G8`, CPA Sign-Off | `PLANNED` |

---

## 8. Domain H — Construction Works & Chantier Tracking (`PLANNED`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-H01` | Technical project lots, contractor contracts (`Party`), *attachements*, and interim payment situations | H | `WorkLot`, `ContractorAgreement`, `WorkSituation` *(planned)* | *(Planned)* | *(Planned: `/api/projects/{id}/works`)* | *(Planned)* | `works.read`, `works.manage` *(seeded; not wired)* | None | `G1–G8` | `PLANNED` |
| `REQ-H02` | Formal `ConstructionMilestoneEvidence` submission & acceptance unlocking VSP billing obligations | H | `ConstructionMilestoneEvidence`, `DocumentLink` *(planned)* | *(Planned)* | *(Planned: `/api/projects/{id}/milestones`)* | *(Planned)* | `works.manage` + verifier approval | None | `G1–G8`, Legal Sign-Off | `PLANNED` |

---

## 9. Domain I — Procurement, Suppliers & Inventory (`PLANNED`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-I01` | Supplier directory (`Party`), purchase requests/orders, delivery receipts, warehouse/site stock movements (`IN`/`OUT`/`TRANSFER`), invoice matching | I | `SupplierProfile`, `PurchaseOrder`, `DeliveryNote`, `StockItem`, `StockMovement` *(planned)* | *(Planned)* | *(Planned: `/api/procurement`, `/api/inventory`)* | *(Planned)* | *(Planned Phase 3C permissions)* | None | `G1–G8` | `PLANNED` |

---

## 10. Domain J — Algerian SCF Accounting & Tax (`PLANNED`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-J01` | SCF chart of accounts (Classes 1–7), fiscal periods & closing locks, balanced double-entry journal postings & *extourne* reversals | J | `ScfAccount`, `FiscalPeriod`, `ScfJournalEntry`, `ScfJournalLine` *(planned)* | *(Planned)* | *(Planned: `/api/accounting/journals`, `/periods`)* | *(Planned)* | `accounting.read`, `accounting.manage` *(seeded; not wired)* | None | `G1–G8`, CPA Sign-Off | `PLANNED` |
| `REQ-J02` | Separated `TaxEvent` generation (Finance Law 2025 Art. 59 TVA collection trigger; Finance Law 2026 Art. 53 9% vs 19%) | J | `TaxEvent` *(planned)* | *(Planned)* | *(Planned: `/api/accounting/tax-events`)* | *(Planned)* | `accounting.read`, `accounting.manage` | None | `G1–G8`, CPA Sign-Off | `PLANNED` |

---

## 11. Domain K — Document Management & Archiving (`K-Min` & `K-Full`)

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-K01` | Upload, list, and integrity-verified download (`SHA-256`) of local project files | K (`K-Min` base) | `StoredFile` (`stored_files`) | `ProjectDocumentService`, `LocalFileStorageService` | `GET/POST /api/projects/{id}/documents`, `GET .../documents/{fileId}/download` | `ProjectDocumentsModal.tsx` | `files.read` / `files.write` + `CanManageDocuments` | `PostgresEndToEndTests` *(CS7036)*; zero `Application.Tests` | `G1–G8`, `G10` | `IMPLEMENTED_NOT_VERIFIED` |
| `REQ-K02` | Metadata update/soft-archive & structured entity linking (`DocumentLink` to Hold, Contract, ContractVersion, MilestoneEvidence, Receipt, Party KYC) | K (`K-Min` finish) | `StoredFile`, `DocumentLink` *(planned)* | `ProjectDocumentService` *(extension)* | *(Planned: `PUT/DELETE .../documents/{fileId}`, entity document routes)* | *(Planned links in domain modals)* | `files.write` + domain-specific permission isolation | None | `G1–G8` | `PLANNED` *(Required pre-Phase 2)* |
| `REQ-K03` | Cross-module enterprise archival (Procurement/Stock/SCF vouchers), retention rules, legal hold & cold archive export | K (`K-Full`) | `StoredFile`, `DocumentLink`, `RetentionPolicy` *(planned)* | *(Planned)* | *(Planned)* | *(Planned)* | Role-scoped archive permissions | None | `G1–G8`, `G10` | `PLANNED` *(Phase 5)* |

---

## 12. Domain L & Operations — Reporting, Packaging, Security & Recovery

| Requirement ID | Business Workflow | Module | Domain Entity | Application Service | API Endpoint | Frontend View | Permission | Tests | Release Gate | Current State |
|---|---|---|---|---|---|---|---|---|---|---|
| `REQ-L01` | Operational project/audit summary views (`OverviewView`, `AuditLogView`) | L | `Project`, `AuditLog` | `ProjectService`, `AuditQueryService` | `GET /api/projects`, `GET /api/audit` | `OverviewView.tsx`, `AuditLogView.tsx` | `projects.read`, `audit.read` | `ApplicationSecurityAndFoundationTests` | `G3`, `G8` | `PARTIALLY_IMPLEMENTED` |
| `REQ-L02` | Commercial pipeline, arrears aging, VSP variance & SCF offline PDF/CSV/XLSX exports | L | Read projections *(planned)* | *(Planned)* | *(Planned: `/api/reports/*`)* | *(Planned)* | Role-scoped reporting permissions | None | `G1–G8` | `PLANNED` |
| `REQ-OPS01` | Local PostgreSQL 18 3-role isolation, health probes, DPAPI / PKCS#12 Data Protection, static `wwwroot` bundle, backup/restore verification | Ops | N/A (`00-init-db.sql`, `DataProtectionConfiguration.cs`) | `HealthChecks`, backup scripts | `GET /health/live`, `GET /health/ready`; `scripts/verify-backup-restore.sh`, `backup-promogest.ps1` | Offline disconnected banner (`ConnectionIndicator.tsx`, `sw.js`) | Least-privilege `promogest_app`; owner `promogest_owner` | `WindowsDpapiMachineScopeTests`, `LinuxCertificateDataProtectionTests`, `serviceWorkerShell.test.ts` *(CI windows/PG18 blocked by `CS7036`)* | `G2`, `G7`, `G8`, `G10` | `PARTIALLY_IMPLEMENTED` / `BLOCKED` *(pending CI rebuild after CS7036)* |
