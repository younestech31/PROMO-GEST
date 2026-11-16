# ADR 0010 — Versioned, effective-dated Algerian administrative references

- **Status:** Accepted. The server-owned, versioned, bilingual 69-Wilaya subset and its UI consumption are implemented and verified in PR #59; the canonical 1,541-commune hierarchy/import remains pending authoritative extraction and review.
- **Date:** 16 November 2026
- **Scope:** Wilaya and commune references in organization and project records.

## Context

The application now stores a server-owned, versioned bilingual catalogue for the 69 Wilayas. `GET /api/reference/administrative-units` exposes it with its effective date and source metadata, and PR #59 connects first-run setup, organization profile and project forms to that endpoint. The domain validates Wilaya code/name pairs and the forms submit the canonical bilingual display name. Municipality/commune is still a free-text snapshot; the endpoint's commune dataset status is `PendingOfficialVerification` and its loaded commune count is zero. There is no complete versioned 1,541-commune catalogue yet.

Law No. 26-06 (Official Journal No. 25, 5 April 2026) establishes 69 Wilayas and 1,541 communes. Decree No. 26-206 (Official Journal No. 40, 3 June 2026) publishes the names and seats of Wilayas 59–69. Decree No. 26-208 addresses transfer of assets and liabilities between original and new Wilayas and sets specific completion deadlines for property and financial operations.

## Decision

1. Treat the official 69-Wilaya/1,541-commune division as the current legal reference baseline.
2. Keep the existing 01–69 validator; do not claim that it is a complete commune catalogue.
3. Maintain the implemented server-owned, bilingual, versioned and effective-dated Wilaya catalogue; extend it with the complete official commune hierarchy only after source reconciliation. Do not remove the free-text commune compatibility path until the 1,541-commune dataset is verified.
4. Preserve original project and organization location snapshots. New canonical IDs are additive and nullable during migration.
5. Keep legal jurisdiction and operational authority as separate concepts.
6. Represent historical parent changes with validity intervals; never rewrite historical contracts, permits or project locations because the current parent/name changed.
7. Reject unsupported code/name combinations in new canonical requests. The client is not trusted to author canonical labels.
8. Do not load or publish a commune dataset until all relationships and labels have been validated against an official source and reconciled to the 1,541-commune legal baseline.

## Consequences

- The current release uses the server-owned 69-Wilaya catalogue in setup, organization and project forms while legacy free-text communes remain visible.
- The API explicitly reports 0 loaded commune records and the pending verification state; the legal count of 1,541 is not represented as an imported dataset.
- A future commune-catalogue update can preserve historical reporting and explain which territorial baseline applied at the time.
- A complete dataset and import pipeline are prerequisites to removing the free-text compatibility path.
- The transition schedule in Decree 26-208 must not be generalized into assumptions about the operational readiness of every local office.

## Verification gate

Follow [Algerian Administrative Reference-Data Governance](../REFERENCE-DATA-GOVERNANCE.md). The Wilaya subset is verified by PR #59's PostgreSQL 18 API test and frontend preview-contract test. The remaining commune-import PR must include official source/version metadata, reconciled source codes, Arabic/French review, exact 1,541 count/hierarchy/uniqueness tests, server-side mismatch rejection, historical-record preservation tests and an additive migration/rollback plan.
