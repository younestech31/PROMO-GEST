# Google AI Studio Cloud SQL development integration

This integration lets the existing ASP.NET Core 10 API use the PostgreSQL 18 instance provisioned by the Google AI Studio **Cloud SQL & Auth** integration. It is a development and integration-test target only. It does not replace PROMO GEST's Local-First production database.

## Connection contract

Google AI Studio supplies these server-side environment variables:

- `SQL_HOST`: absolute Unix-domain socket directory (the value ends at the instance directory; do not append `.s.PGSQL.5432`).
- `SQL_DB_NAME`: Cloud SQL database name.
- `SQL_USER` and `SQL_PASSWORD`: restricted runtime API identity.
- `SQL_ADMIN_USER` and `SQL_ADMIN_PASSWORD`: separate migration identity.

The API builds Npgsql connection strings at runtime. Npgsql uses `Host=<socket-directory>;Port=5432` for the Unix-domain socket. Passwords are escaped by `NpgsqlConnectionStringBuilder`; they are never written to source files or emitted by the runner.

Cloud SQL is activated only when `SQL_HOST` is present and the ASP.NET Core environment is `Development`. If `SQL_HOST` is present outside Development, the API fails fast instead of silently using a cloud database. Without `SQL_HOST`, the existing `ConnectionStrings:DefaultConnection` path is unchanged.

## Run the real API behind Vite

The AI Studio preview container must have the **.NET 10 SDK** installed. The current Node-only preview environment may not include it.

Install it into the current user profile using Microsoft's official installer:

```bash
curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
bash /tmp/dotnet-install.sh --channel 10.0
export PATH="$HOME/.dotnet:$PATH"
dotnet --version
```

Then run from the repository root:

```bash
npm run dev:cloudsql
```

The runner:

1. Confirms all six Cloud SQL environment variables exist without printing their values.
2. Confirms the Unix socket is active.
3. Applies EF Core migrations and seeds system roles using `SQL_ADMIN_USER`.
4. Grants the runtime identity database connect/schema usage and table DML rights, excluding EF migration history. The immutable `audit_logs` table remains SELECT/INSERT only.
5. Sets default privileges for future tables and sequences created by the migration identity.
6. Starts the API using `SQL_USER`, checks `/health/ready`, then starts Vite on port 3000 with its existing `/api` and `/health` proxy.

The Vite proxy is already implemented in both `vite.config.ts` and `apps/local-web/vite.config.ts`; no duplicate proxy layer is needed.

## Data Protection and stored files

On Linux Development only, when no local Data Protection certificate is configured, ASP.NET Core uses an ephemeral in-memory key provider. Protected cookies become unreadable after the API process exits, so sign in again after restarting it. Linux Production still requires the configured PKCS#12 certificate and password; Windows continues to use machine-scope DPAPI.

The database persists in Cloud SQL, but uploaded file bytes continue to use the existing local `LocalFileStorageService`. They are not stored in Cloud SQL and may be lost when the AI Studio container is recycled. Do not use real customer, employee, property, contract, or financial records.

## Production boundary

- Production keeps the organization's local PostgreSQL 18 connection string.
- Cloud SQL environment variables are rejected outside Development.
- Production build and installation scripts remain unchanged.
- No Firebase Authentication, Firestore, Cloud Run deployment, or cloud file storage is added.
- Do not publish the AI Studio app as a production service as part of this test.

For Npgsql Unix socket semantics, see [Npgsql connection-string parameters](https://www.npgsql.org/doc/connection-string-parameters.html). For the AI Studio integration workflow and its Cloud SQL location behavior, see [Google Cloud SQL documentation](https://docs.cloud.google.com/sql/docs/postgres/ai-assisted-coding-and-cloud-sql).
