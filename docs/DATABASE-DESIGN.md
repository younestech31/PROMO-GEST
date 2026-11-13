# PROMO GEST — Database Design (PostgreSQL 18)

## 1. Core Principles
- **Single-tenant per organization**: Every installation provisions its own dedicated `promogest` PostgreSQL 18 database owned by a least-privilege role (`promogest_app`).
- **UUID primary keys** across all domain and security tables.
- **Database-enforced integrity**: Primary keys, foreign keys with explicit `ON DELETE` rules (`Restrict` on `projects.created_by_user_id`, `stored_files.project_id`, `stored_files.uploaded_by_user_id`, `user_roles.role_id`), unique indexes, check constraints, and optimistic concurrency tokens (`concurrency_stamp`).
- **Parameterized access only**: All queries execute through EF Core LINQ / parameterized SQL. Dynamic SQL from user input is prohibited.
- **Append-only audit trail**: PostgreSQL trigger `trg_audit_logs_immutable` (`prevent_audit_log_mutation()`) blocks all `UPDATE` and `DELETE` statements on `audit_logs` with `ERRCODE = '42501'`.

## 2. Initial Domain & Security Schema

| Table | Purpose | Key Constraints & Indexes |
|---|---|---|
| `organization_settings` | Legal & Algerian fiscal identity (NIF, NIS, RC, AI, Wilaya 01..58, Capital DZD) | `ux_organization_settings_singleton` + `CHECK (singleton_guard = 1)`, `CHECK (currency_code = 'DZD')`, `CHECK (default_language IN ('ar','fr'))`, `CHECK (share_capital_dzd IS NULL OR share_capital_dzd >= 0)` |
| `users` | Independent employee accounts & System Admin | `ux_users_normalized_username`, `ux_users_normalized_email`, `CHECK (char_length(username) >= 3)`, **partial unique index** `ux_users_single_system_admin` (`WHERE is_system_administrator = true`) |
| `roles` | System & functional roles (AR/FR labels) | `ux_roles_code` |
| `permissions` | Fine-grained permission catalog | `ux_permissions_code` |
| `role_permissions` | Role-to-permission mapping | Composite PK `(role_id, permission_id)` |
| `user_roles` | User-to-role assignment with audit metadata | Composite PK `(user_id, role_id)`, `FK` to `users` & `roles` (`Restrict` on role delete) |
| `user_sessions` | Server-side opaque session tracking | `ux_user_sessions_token_hash`, `ix_user_sessions_user_id`, `security_stamp` verification |
| `projects` | Algerian real estate projects | `ux_projects_normalized_code`, `ix_projects_wilaya_code`, `ix_projects_created_by_user_id`, `FK` to `users(id)` (`Restrict`), `CHECK (estimated_budget_dzd >= 0)` |
| `project_members` | Project-level user access & granular flags | `ux_project_members_project_user`, `ix_project_members_user_id`, flags (`can_view_financials`, `can_manage_sales`, `can_manage_construction`, `can_manage_documents`) |
| `audit_logs` | Immutable security & administrative audit trail | `ix_audit_logs_occurred_at_utc`, `ix_audit_logs_event_type`, `metadata_json (jsonb)`, `trg_audit_logs_immutable` |
| `system_settings` | Local installation configuration key-value store | `ux_system_settings_key` |
| `stored_files` | Metadata & SHA-256 checksums for local filesystem documents | `ux_stored_files_relative_path`, `CHECK (size_bytes > 0)`, `ix_stored_files_project_id`, `ix_stored_files_uploaded_by_user_id`, `FK` to `projects(id)` & `users(id)` (`Restrict`) |

## 3. File Storage vs Database Blobs
Business documents (land titles, building permits, contracts, IDs) are **never** stored as large binary blobs inside PostgreSQL rows. `LocalFileStorageService` writes files into structured year/month directories under `Storage:RootDirectory`, computes an incremental `SHA-256` checksum, guards against path traversal, and persists only metadata and checksums in `stored_files`.

## 4. Migrations Workflow
Migrations live in `src/PromoGest.Infrastructure/Persistence/Migrations/`:
- `20261113000001_InitialFoundation` + Designer metadata
- `20261113000002_HardeningConstraintsAndAuditImmutability` + Designer metadata
- `AppDbContextModelSnapshot` (kept strictly synchronized with `AppDbContext.OnModelCreating` so EF Core 10 `HasPendingModelChanges()` stays false)
- On startup, `Program.cs` runs `await dbContext.Database.MigrateAsync()` and idempotently seeds roles/permissions (`DbInitializer.SeedRolesAndPermissionsAsync`). No default admin user or password is ever seeded.
