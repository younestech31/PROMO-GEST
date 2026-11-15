# ADR 0007 — Support the 69-Wilaya Algerian territorial baseline

- **Status:** Accepted and implemented in PR #25 (merged to `main` on 15 November 2026)
- **Date:** 15 November 2026
- **Scope:** organization and project location codes

## Context

The application originally accepted only Wilaya codes 01–58. Law No. 26-06 of 4 April 2026 and Presidential Decree No. 26-206 of 25 May 2026 add 11 new Wilayas, numbered 59–69. The decree and names appear in Official Journal No. 40 dated 3 June 2026.

## Decision

- The domain and UI accept two-digit Wilaya codes 01–69.
- The frontend catalogue includes Arabic and French display names for the 11 new Wilayas as published in the Official Journal.
- Code 70 and other out-of-range values are rejected.
- This is a reference-data compatibility update, not a database schema migration.
- Existing saved records are not rewritten or automatically reallocated.

## Transitional caution

Executive Decree No. 26-208 of 26 May 2026 sets administrative asset/liability transfer deadlines through 31 December 2026 (property-related) and the end of fiscal year 2026 (financial operations). The code/name availability of a new Wilaya must not be interpreted as proof that all municipality, land registry, tax, permit or administrative-office mappings have already transferred.

A future commune-level catalogue must use verified official data, effective dates and a reviewed historical-record migration strategy.

## Implementation references

- Frontend catalogue: `apps/local-web/src/utils/algerianFormat.ts`
- Domain validator: `OrganizationSettings.IsValidAlgerianWilayaCode`
- Project validation: `Project.Create` and `Project.UpdateDetails`
- Regression tests: frontend catalog/validation tests and domain invariant tests
- Full data governance note: `docs/ALGERIAN-REFERENCE-DATA.md`

## Official sources

- Arabic Official Journal No. 40 (3 June 2026), Decree 26-206, Article 1 (codes 59–69) and Decree 26-208, Article 2: https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf
- French Official Journal No. 40 (3 June 2026), Decree 26-206, Article 1 (codes 59–69) and Decree 26-208, Article 2: https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf
