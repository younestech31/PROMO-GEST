# ADR-0003: Same-Origin Static React SPA Served by ASP.NET Core

## Status
Accepted

## Context
Running a separate Node.js frontend server in production adds operational complexity, CORS surface area, and runtime footprint on customer premises.

## Decision
`apps/local-web` compiles via Vite into static HTML/JS/CSS/font assets copied into `src/PromoGest.Api/wwwroot/`. ASP.NET Core serves both the static SPA and `/api/*` + `/health/*` from the same origin.

## Consequences
- Single production process (`PromoGest.Api`) on the customer server.
- Zero Node.js runtime requirement in production.
- Strict SameSite=Strict HTTP-only cookies work cleanly without CORS complexity.
