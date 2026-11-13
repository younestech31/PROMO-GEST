# ADR-0001: Local-First Self-Hosted On-Premises Architecture

## Status
Accepted

## Context
Algerian real estate developers require strict confidentiality of buyer contracts, DZD payment schedules, fiscal identifiers (NIF/NIS/RC), and reliable daily office operations regardless of internet outages.

## Decision
Each customer organization runs an isolated, self-hosted server on its own premises: one ASP.NET Core (.NET 10 LTS) API + static React SPA + one PostgreSQL 18 instance + local filesystem storage, accessed over the office LAN. No shared cloud database, SaaS backend, or internet-dependent runtime service is permitted.

## Consequences
- Full operational continuity when internet connectivity drops.
- Zero external vendor lock-in or cloud data leakage.
- Requires on-premises installation, local LAN HTTPS, and regular local backup/restore verification.
