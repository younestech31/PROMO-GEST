# PROMO GEST

Local-first, self-hosted, multi-user ERP for Algerian real-estate development organizations (*promoteurs immobiliers*). The target product is a modular ERP with organization-wide modules and a contextual project workspace; the current implementation status is tracked in `docs/ROADMAP.md`.

## Product and architecture

- **Deployment:** one local application server and one PostgreSQL 18 database per organization.
- **Data boundary:** company, employee, customer, project, financial, contractual and document data remain on the organization's own server. Cloud services are not production data stores.
- **Application:** ASP.NET Core 10 Web API + React 19 SPA, served same-origin by the local API.
- **Database:** PostgreSQL 18, with separate provisioning, migration-owner and restricted runtime identities.
- **Localization:** Arabic (RTL) and French (LTR), DZD, Algerian geography and administrative reference data.
- **Architecture:** modular monolith with explicit business-module boundaries; no premature microservices.

Read these documents before making architectural or data-model changes:

1. [System architecture](docs/ARCHITECTURE.md)
2. [Enterprise module boundaries and master-data ownership](docs/ERP-MODULE-ARCHITECTURE.md)
3. [Project navigation and active-context UX](docs/PROJECT-NAVIGATION-UX.md)
4. [Security model](docs/SECURITY.md)
5. [Database design and trust boundaries](docs/DATABASE-DESIGN.md)
6. [Product milestones and delivery gates](docs/ROADMAP.md)
7. [Current repository foundation audit](docs/FOUNDATION-AUDIT-2026-11.md)

## Technology stack

- **Frontend:** React 19, TypeScript strict mode, Vite, Tailwind CSS v4, locally bundled fonts.
- **Backend:** ASP.NET Core Web API / .NET 10 LTS, C#.
- **Persistence:** EF Core 10 and Npgsql.
- **Database:** PostgreSQL 18, single-tenant per organization.
- **Local document storage:** filesystem storage with database metadata and integrity checks.
- **Tests:** Node.js test runner, xUnit, and PostgreSQL 18 integration tests.

## Repository layout

- `apps/local-web/` — React + TypeScript frontend and Vite preview middleware.
- `src/PromoGest.Api/` — ASP.NET Core API and static SPA host.
- `src/PromoGest.Application/` — application use cases, authorization orchestration and repository ports.
- `src/PromoGest.Domain/` — business entities, invariants, enums and domain exceptions.
- `src/PromoGest.Contracts/` — typed HTTP request and response contracts.
- `src/PromoGest.Infrastructure/` — EF Core, PostgreSQL migrations, repositories, security and local file storage.
- `tests/` — domain, application and PostgreSQL integration tests.
- `deploy/` — Windows/Linux service, reverse proxy and PostgreSQL provisioning configuration.
- `scripts/` — production builds and backup/restore/verification scripts.
- `docs/` — architecture decisions, operating procedures, module specifications, audits and delivery roadmap.

## Canonical development and verification commands

**Use the repository root** for all Node.js commands. The authoritative npm lockfile is the root `package-lock.json`; do not run a separate `npm install` from `apps/local-web`.

### Frontend

```bash
npm ci --no-audit --no-fund
npm run lint
npm test
npm run build
```

The root scripts run the TypeScript strict check, the `node:test` suite, and the Vite production build into `apps/local-web/dist`.

### Backend — .NET 10

```bash
dotnet build src/PromoGest.sln --configuration Release
dotnet test tests/PromoGest.Domain.Tests/PromoGest.Domain.Tests.csproj --configuration Release
dotnet test tests/PromoGest.Application.Tests/PromoGest.Application.Tests.csproj --configuration Release
```

### PostgreSQL 18 integration tests

Use an isolated disposable test database. The integration suite provisions databases through the dedicated test provisioner, applies migrations as the migration owner, and exercises HTTP/database operations as the restricted runtime identity.

```bash
dotnet test tests/PromoGest.IntegrationTests/PromoGest.IntegrationTests.csproj --configuration Release
```

Configure `PROMOGEST_TEST_DB_CONNECTION` only for an isolated PostgreSQL 18 test instance. Never point test automation at an organization database or the existing Google AI Studio preview data.

### Production artifact build (build machine only)

- Windows: `./scripts/build-production.ps1`
- Linux: `./scripts/build-production.sh`

These scripts compile the frontend, copy the verified static output into `src/PromoGest.Api/wwwroot`, run the relevant .NET checks, and publish a self-contained API executable. This is a build operation, not authorization to install or deploy the artifact.

## Development preview versus database-backed testing

Running the root Vite development server without `ASPNETCORE_URL` uses an **in-memory development API**. It is useful for frontend workflow previews only. Its data is ephemeral and it does not prove PostgreSQL persistence, production authentication, database authorization or migrations.

For a database-backed development session, use the documented Cloud SQL development connection script and inspect its logs and health response. Cloud SQL is optional development infrastructure only; it is not the local-first production architecture. Do not run migrations against an existing preview database unless a separate backup and explicit operational approval are in place.

## Delivery rules

- Work on isolated feature branches and reviewed pull requests; do not push directly to `main`.
- Do not deploy hosted builds or install a production artifact without explicit approval.
- Do not alter existing Cloud SQL or organization data as part of source-code testing.
- Every business module needs explicit data ownership, server-side authorization, lifecycle rules, audit coverage, regression tests, and an operational acceptance scenario.
