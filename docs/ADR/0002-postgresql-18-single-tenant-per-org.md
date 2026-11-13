# ADR-0002: PostgreSQL 18 Single-Tenant Database Per Organization

## Status
Accepted

## Context
Financial transactions, unit reservations, and authorization rules require ACID transactions, explicit CHECK/UNIQUE constraints, and zero cross-tenant data mixing.

## Decision
Each installation provisions a dedicated PostgreSQL 18 database (`promogest`) with UUID keys, explicit constraints, EF Core migrations, and partial unique indexes (such as `ux_users_single_system_admin`).

## Consequences
- Authoritative single source of truth on the local server.
- Browser IndexedDB is explicitly prohibited from acting as a primary business database.
