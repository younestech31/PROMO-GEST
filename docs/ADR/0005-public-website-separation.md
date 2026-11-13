# ADR-0005: Strict Separation of Future Public Website from Local ERP Runtime

## Status
Accepted

## Context
Real estate developers often request a public brochure or buyer-inquiry website alongside internal ERP operations.

## Decision
Any future public website must be deployed as an entirely separate system outside the office LAN, never sharing the local ERP runtime process or the organization's authoritative PostgreSQL 18 database.

## Consequences
- The local ERP server remains isolated on the internal LAN with minimal attack surface.
- Public traffic spikes or web vulnerabilities cannot reach internal buyer contracts, DZD financial ledgers, or employee accounts.
