# ADR 0010 — Versioned, effective-dated Algerian administrative references

- **Status:** Accepted architecture direction; canonical commune-data import is pending an authoritative, reviewed dataset.
- **Date:** 15 November 2026
- **Scope:** Wilaya and commune references in organization and project records.

## Context

The current application accepts Wilaya codes 01–69 but still stores Wilaya names as supplied display strings and municipality names as free text. It has no complete versioned commune catalogue and does not resolve canonical bilingual labels from the code on the server.

Law No. 26-06 (Official Journal No. 25, 5 April 2026) establishes 69 Wilayas and 1,541 communes. Decree No. 26-206 (Official Journal No. 40, 3 June 2026) publishes the names and seats of Wilayas 59–69. Decree No. 26-208 addresses transfer of assets and liabilities between original and new Wilayas and sets specific completion deadlines for property and financial operations.

## Decision

1. Treat the official 69-Wilaya/1,541-commune division as the current legal reference baseline.
2. Keep the existing 01–69 validator; do not claim that it is a complete commune catalogue.
3. Introduce a server-owned, bilingual, versioned and effective-dated administrative-unit catalogue before replacing free-text commune input.
4. Preserve original project and organization location snapshots. New canonical IDs are additive and nullable during migration.
5. Keep legal jurisdiction and operational authority as separate concepts.
6. Represent historical parent changes with validity intervals; never rewrite historical contracts, permits or project locations because the current parent/name changed.
7. Reject unsupported code/name combinations in new canonical requests. The client is not trusted to author canonical labels.
8. Do not load or publish a commune dataset until all relationships and labels have been validated against an official source and reconciled to the 1,541-commune legal baseline.

## Consequences

- The current release can continue using 69 codes while legacy free-text communes remain visible.
- A future catalogue update can preserve historical reporting and explain which territorial baseline applied at the time.
- A complete dataset and import pipeline are prerequisites to removing the free-text compatibility path.
- The transition schedule in Decree 26-208 must not be generalized into assumptions about the operational readiness of every local office.

## Verification gate

Follow [Algerian Administrative Reference-Data Governance](../REFERENCE-DATA-GOVERNANCE.md). The implementation PR must include official source/version metadata, Arabic/French review, dataset-count and hierarchy tests, server-side mismatch rejection, historical-record preservation tests and a rollback plan.
