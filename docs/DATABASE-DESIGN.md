# PROMO GEST — Database Design (PostgreSQL 18)

## 1. Database ownership and trust boundaries

PROMO GEST is a **single-tenant, local-first ERP**. Each organization operates its own PostgreSQL 18 database on its premises. The database is the authoritative source for organization, employee, project, inventory, audit, and (in later milestones) commercial records.

Three database identities have separate responsibilities:

- **Provisioning / maintenance identity**: creates databases and database roles, and performs explicitly authorized backup/restore administration. It is not used by the running application.
- **`promogest_owner`**: owns the application's database objects and applies EF Core schema migrations. It is used only by the explicit maintenance/migration operation.
- **`promogest_app`**: the runtime identity used by ASP.NET Core. It must not own the database, create databases, create/alter schema objects, or apply migrations.

Never put the migration-owner or provisioning credentials in the Windows service or Linux systemd runtime environment. Never grant the runtime identity broad predefined PostgreSQL roles such as `pg_read_all_data`, `pg_write_all_data`, or administrative monitoring roles as a shortcut around the reviewed table grants. Verify effective privileges and inherited memberships on every installation, not only direct ACL entries.

Google AI Studio Cloud SQL is a **development/test integration only**. It is not the production data architecture and must contain fictional test data only. The customer's production organization and customer data remain on the organization's own local server.

## 2. Current schema

All primary keys use UUIDs. Foreign keys, unique indexes, check constraints, and optimistic concurrency stamps enforce important invariants in PostgreSQL as well as in application services.

| Table | Responsibility |
|---|---|
| `organization_settings` | One initialized legal entity per local installation: legal identity, Algerian registration/tax identifiers, Wilaya, address, default language, and DZD currency |
| `users` | Employee accounts, password hashes, activation/lockout state, security stamp, and the single System Administrator flag |
| `roles` | System and functional role definitions with Arabic and French labels |
| `permissions` | Fine-grained permission catalog |
| `role_permissions` | Many-to-many role-to-permission assignments |
| `user_roles` | User-to-role assignments and assignment metadata |
| `user_sessions` | Hashed opaque session tokens, security stamps, expiry/revocation state, and bounded client metadata |
| `projects` | Real-estate project master data, Wilaya/commune, land/title and permit references, project status, estimated budget, and planned counts |
| `project_members` | Project-scoped membership, project role, and granular financial, sales, construction, and document capabilities |
| `buildings` | Registered buildings belonging to a project; unique normalized code within that project |
| `building_floors` | Floors belonging to a building; unique floor number within that building |
| `property_units` | Apartments, shops, parking spaces, offices, and storage units belonging to a floor; unique normalized unit number within that floor |
| `audit_logs` | Append-only security, authentication, administration, project, and structure event history |
| `system_settings` | Local installation settings |
| `stored_files` | Local document metadata including category, optional description, scope, project/uploader references, byte length, and SHA-256 checksum; file contents remain on local disk |

### Key integrity rules

- `organization_settings` is a singleton, uses DZD, and supports the application languages `ar` and `fr`.
- Usernames and normalized email addresses are unique. A partial unique index permits **at most one** user flagged as System Administrator; a database trigger protects the last active flagged administrator against direct SQL deactivation, demotion, or deletion. Console-only recovery remains the supported recovery path.
- Project codes are unique after normalization. Project budgets and planned building/unit counts cannot be negative.
- A project cannot contain duplicate normalized building codes. A building cannot contain duplicate floor numbers. A floor cannot contain duplicate normalized unit numbers.
- A floor is owned by a building; a unit is owned by a floor. Deleting a building/floor cascades to its child rows at the database relationship level, while application workflows intentionally do not currently expose destructive structure deletion.
- Unit gross/net areas cannot be negative; net area cannot exceed gross area; rooms count is bounded. Reserved, sold, and delivered statuses are reserved for the future sales workflow and cannot be reached through the basic structure maintenance flow.
- Project, building, floor, and unit records use concurrency stamps for version-aware updates.
- `audit_logs` is append-only. PostgreSQL rejects UPDATE/DELETE/TRUNCATE attempts, and the runtime role is restricted to SELECT/INSERT on that table.
- Stored document binaries are not PostgreSQL blobs. They are saved beneath the configured local storage root and referenced by checksum-verified metadata.
- Project documents are scoped to a project and retrieved by both project ID and file ID; an API caller cannot use a document identifier from another project to bypass the membership check.
- The current document categories are `Legal`, `LandAndTitle`, `Permits`, `Plans`, `Engineering`, `Commercial`, `Financial`, `Correspondence`, and `Other`. The database check constraint keeps the category vocabulary consistent.
- The `stored_files.category` migration backfills existing metadata rows as `Other`, then removes the temporary column default so all new records must provide a valid category. No existing file bytes or metadata rows are deleted.

**Planned counts and actual counts are different measures.** `projects.planned_blocks_count` and `projects.planned_units_count` are planning targets. Actual building/unit totals are read from `buildings` and `property_units` through their floor/building relationship; they must never overwrite the planned targets.

## 3. Application access and authorization

All database access is performed through EF Core repositories and parameterized queries. The API authenticates users through opaque server-side sessions and enforces project membership/permissions before project and structure access.

The runtime role receives only the DML privileges required by the application. Migration and audit-trigger ownership remains outside the runtime account. The integration test workflow provisions separate provisioning, migration-owner, and runtime identities and exercises migrations and business requests under the corresponding identities.

A direct table grant is not a complete privilege review: inherited role memberships can increase effective access. Check `pg_roles`, `pg_auth_members`, `has_database_privilege`, `has_schema_privilege`, and `has_table_privilege` during installation acceptance.

## 4. Migration workflow

The EF Core migration history currently includes:

1. `20261113000001_InitialFoundation`
2. `20261113000002_HardeningConstraintsAndAuditImmutability`
3. `20261113000003_SystemAdministratorInvariant`
4. `20261113000004_AuditLogRuntimePermissions`
5. `20261114090000_ProjectStructureFoundation`

The model snapshot is maintained alongside the migrations and must remain synchronized with `AppDbContext`.

Schema changes are **not applied automatically by the normal runtime service**. A deliberate operator/deployment step runs the API with `--migrate`, supplying `PROMOGEST_MIGRATE_DB_CONNECTION` for `promogest_owner`. The Cloud SQL development integration may supply its separate migration identity through its development-only configuration. The API runtime then starts with `promogest_app`.

Before any production migration:

1. Take a verified database and local-file backup using the documented backup procedure.
2. Confirm the target database and migration identity explicitly.
3. Apply only the reviewed pending migrations.
4. Verify the applied migration history, effective runtime privileges, and health checks.
5. Keep the migration-owner credential out of the application service configuration.

Do not rerun migrations, alter schema, or change Cloud SQL role membership as part of ordinary UI troubleshooting.

## 5. Backup, restore, and offline boundaries

A recoverable installation consists of a consistent PostgreSQL dump, local document storage, the Data Protection key ring, sanitized configuration, and a SHA-256 manifest. Restore and verification use a provisioning identity for the scratch database, `promogest_owner` for database objects, and `promogest_app` only for runtime access checks. See [Backup and Restoration Procedures](./BACKUP-AND-RESTORE.md).

The server and database remain authoritative. Browser storage is limited to static application-shell assets; it is not a disconnected business database. No financial, contractual, reservation, authorization, or inventory mutation is queued for later replay. See [Offline & LAN-First Operation](./OFFLINE-OPERATION.md).
