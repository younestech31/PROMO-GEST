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


## Troubleshooting a real API request failure

The frontend is served by Vite in AI Studio, but when `ASPNETCORE_URL` is configured the Vite server proxies `/api` and `/health` to the real ASP.NET Core process. The presence of a Vite `/src/...` script URL does not mean API requests are handled by the in-memory Vite simulator.

- A non-JSON `403` from Google Frontend is a preview-host/proxy response, not necessarily an ASP.NET Core authorization or CSRF decision. The frontend currently retries a mutating non-JSON `403` once after refreshing the CSRF token.
- A subsequent JSON `500` with the API security headers means the request reached the ASP.NET Core pipeline. `ExceptionHandlingMiddleware` writes the exception stack to the backend log and returns only a generic `INTERNAL_ERROR` response. The response body alone cannot identify the root cause.
- When running `npm run dev:cloudsql`, the API process writes stdout/stderr to a temporary `/tmp/promogest-cloudsql-api.*.log` file. While the runner is still active, find and inspect the newest file from a second terminal:

  ```bash
  LOG_FILE="$(ls -t /tmp/promogest-cloudsql-api.*.log 2>/dev/null | head -n 1)"
  test -n "$LOG_FILE" && tail -n 160 "$LOG_FILE"
  ```

- When using `npm run dev` with `scripts/dev-with-local-api.sh`, inspect `/tmp/promogest-api-dev.log` instead.
- Correlate the backend entry with the request timestamp and the `traceparent` trace ID returned by the API. Look for `Unhandled exception while processing POST /api/projects/.../customers`.
- Verify that the browser sends the `promogest_session` cookie (or the in-memory preview bearer header when using the Vite-only demo). Check `GET /api/auth/me` in the same browser session. Do not paste session cookies, bearer tokens, CSRF tokens, passwords, or real customer data into issue reports.
- `GET /health/ready` confirms database connectivity and basic initialization only; it does not check EF migration status. The `dev:cloudsql` runner must complete its `--migrate` step using the separate `SQL_ADMIN_USER` identity before the API is considered schema-ready.

Do not fix this failure by disabling CSRF, weakening authentication, exposing the API publicly, or granting broad database privileges. Identify the server exception first.

## Production boundary

- Production keeps the organization's local PostgreSQL 18 connection string.
- Cloud SQL environment variables are rejected outside Development.
- Production build and installation scripts remain unchanged.
- No Firebase Authentication, Firestore, Cloud Run deployment, or cloud file storage is added.
- Do not publish the AI Studio app as a production service as part of this test.

For Npgsql Unix socket semantics, see [Npgsql connection-string parameters](https://www.npgsql.org/doc/connection-string-parameters.html). For the AI Studio integration workflow and its Cloud SQL location behavior, see [Google Cloud SQL documentation](https://docs.cloud.google.com/sql/docs/postgres/ai-assisted-coding-and-cloud-sql).
