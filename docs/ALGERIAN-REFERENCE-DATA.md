# Algerian administrative reference data

**Current legal baseline checked:** 15 November 2026  
**Purpose:** authoritative reference for Wilaya codes in organization and project records  
**Status:** the code accepts codes 01–69; municipality/commune mapping remains a separate data-governance task.

## 1. Legal source and implementation decision

The official Journal of the Republic of Algeria, issue 40 dated 3 June 2026, publishes Presidential Decree No. 26-206 of 25 May 2026. Article 1 completes the list of Wilaya names and seats with the new Wilayas numbered 59–69. The decree cites Law No. 26-06 of 4 April 2026, which amends the territorial division law.

Official primary sources:

- Arabic Journal officiel, No. 40 (3 June 2026), Decree 26-206, Article 1: https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf
- French Journal officiel, No. 40 (3 June 2026), Decree 26-206, Article 1: https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf

The official text lists the following new Wilayas:

| Code | Arabic official name | French official name |
|---:|---|---|
| 59 | أفلو | Aflou |
| 60 | بريكة | Barika |
| 61 | القنطرة | El Kantara |
| 62 | بئر العاتر | Bir El Ater |
| 63 | العريشة | El Aricha |
| 64 | قصر الشلالة | Ksar Chellala |
| 65 | عين وسارة | Aïn Oussera |
| 66 | مسعد | Messaad |
| 67 | قصر البخاري | Ksar El Boukhari |
| 68 | بوسعادة | Bou Saâda |
| 69 | الأبيض سيدي الشيخ | El Abiodh Sidi Cheikh |

## 2. Transitional administration

Decree 26-208 (26 May 2026) provides for the division of assets and liabilities between mother Wilayas and new Wilayas. Its Article 2 sets a deadline of **31 December 2026** for the relevant property/asset operations and the end of fiscal year 2026 for financial operations.

Product implications:
- Accept the new legal codes and names in records from the current legal baseline.
- Do not infer that every commune, address, administrative office, tax office, title registry or permit authority has completed its transfer merely because a new Wilaya code exists.
- Do not rewrite historical records or automatically change existing project locations during the transitional period.
- Preserve the code that was valid when the business record was created, and keep administrative-reference versions effective-dated when more detailed commune/authority data are introduced.

## 3. Current implementation in PROMO GEST

The current source branch adds the 11 new entries to `apps/local-web/src/utils/algerianFormat.ts`, updates the domain validator in `OrganizationSettings.IsValidAlgerianWilayaCode` to accept two-digit codes 01–69, updates project-domain validation and preview/setup validators, and adds regression tests for code 69 and rejection of code 70.

This change is code/data only. It does not require a database schema migration: the existing Wilaya code column already stores two-digit values and the name field can store the bilingual display string.

## 4. Known limitations and next data-design step

The current application stores `wilayaCode` and `wilayaName` as separate fields. The frontend supplies a bilingual display string, while the API/domain currently validates the code range and that the name is nonblank. It does **not yet resolve the canonical bilingual Wilaya name from the code on the server**.

The current project form also accepts municipality as free text. There is no complete, versioned, authoritative code-to-commune mapping in the repository. Therefore:
- Do not describe the current location model as a complete Algerian administrative reference database.
- The next reference-data design should introduce a single server-owned catalogue for Wilaya code, canonical Arabic/French names, effective dates, and authorized commune references when official commune data and transfer status are verified.
- UI dropdowns should consume the server-owned catalogue or a checked-in versioned reference dataset; never maintain separate manually edited copies in setup, projects, API and preview.
- Historical project addresses must remain preserved as entered; canonical location references should be additive and support migration/reconciliation.

## 5. Change control

Any later changes to Wilaya or commune names/codes require:
1. An official primary source or a validated government reference dataset.
2. Arabic and French labels reviewed together.
3. A version/effective-date note.
4. Domain, API, frontend, preview and integration regression tests.
5. A decision on how existing installations receive the reference-data update without silently changing saved business records.
