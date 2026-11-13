# PROMO GEST

Local-first, self-hosted, multi-user ERP foundation for Algerian real estate development companies (*promoteurs immobiliers*).

## Stack
- **Frontend**: React 19, TypeScript (strict), Vite, Tailwind CSS v4, local bundled fonts (`@fontsource/ibm-plex-sans-arabic`, `@fontsource/plus-jakarta-sans`, `@fontsource/ibm-plex-mono`), Arabic (RTL default) & French (LTR)
- **Backend**: ASP.NET Core Web API (.NET 10 LTS, C#), Entity Framework Core, Npgsql
- **Database**: PostgreSQL 18 (single-tenant per organization)

## Repository Structure
- `apps/local-web/` — React + TypeScript frontend
- `src/PromoGest.Api/` — ASP.NET Core 10 Web API & static SPA host (`wwwroot/`)
- `src/PromoGest.Application/` — Application services, ports, validators
- `src/PromoGest.Domain/` — Domain entities, invariants, exceptions
- `src/PromoGest.Infrastructure/` — EF Core `AppDbContext`, migrations, PBKDF2-SHA512 security, local file storage
- `src/PromoGest.Contracts/` — Shared HTTP contracts
- `tests/` — Domain, Application, and PostgreSQL 18 Integration tests
- `deploy/` — Windows service, Caddy LAN HTTPS, PostgreSQL 18 init/config
- `scripts/` — Production build, backup, and restore verification scripts
- `docs/` — Architecture, Database, Security, Offline Operation, Installation, Backup/Restore, ADRs

## Verification Commands
### Frontend (Node.js build/test tooling)
```bash
cd apps/local-web
npm install
npm run lint
npm test
npm run build
```

### Backend & PostgreSQL 18 (.NET 10 LTS SDK + PostgreSQL 18)
```bash
dotnet build src/PromoGest.sln --configuration Release
dotnet test tests/PromoGest.Domain.Tests/PromoGest.Domain.Tests.csproj
dotnet test tests/PromoGest.Application.Tests/PromoGest.Application.Tests.csproj
# With Docker or PROMOGEST_TEST_DB_CONNECTION set to PostgreSQL 18:
dotnet test tests/PromoGest.IntegrationTests/PromoGest.IntegrationTests.csproj
```
