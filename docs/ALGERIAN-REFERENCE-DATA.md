# Algerian administrative reference data

**Current legal baseline checked:** 16 November 2026  
**Purpose:** authoritative reference for Wilaya codes in organization and project records  
**Status:** 69 bilingual Wilaya records are server-owned and exposed by `GET /api/reference/administrative-units`; setup, organization-profile and project selectors consume that endpoint (PR #59). The 1,541-commune catalogue remains unimported and requires separate source reconciliation.

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

The application stores a Wilaya code and preserves the bilingual display string in organization/project records. The server-owned `AlgerianAdministrativeReference` resolves the canonical bilingual name and validates code/name consistency. `GET /api/reference/administrative-units` publishes the versioned 69-Wilaya catalogue; PR #59 makes first-run setup, organization-profile editing and project create/update forms consume the endpoint and submit the canonical server-provided name. The commune/municipality field remains free text because no verified 1,541-commune catalogue is loaded.

The current project form also accepts municipality as free text. There is no complete, versioned, authoritative code-to-commune mapping in the repository. Therefore:
- Do not describe the current location model as a complete Algerian administrative reference database.
- The next reference-data slice must extend the existing server-owned catalogue with the official 1,541 communes, effective-dated parent relationships, bilingual labels and separately reviewed transitional operational-authority mappings. Do not create separate manually maintained copies in setup, projects, API and preview.
- UI dropdowns should consume the server-owned catalogue or a checked-in versioned reference dataset; never maintain separate manually edited copies in setup, projects, API and preview.
- Historical project addresses must remain preserved as entered; canonical location references should be additive and support migration/reconciliation.

## 5. Change control

Any later changes to Wilaya or commune names/codes require:
1. An official primary source or a validated government reference dataset.
2. Arabic and French labels reviewed together.
3. A version/effective-date note.
4. Domain, API, frontend, preview and integration regression tests.
5. A decision on how existing installations receive the reference-data update without silently changing saved business records.


## 6. Commune register source and code semantics

Law 26-06 (JO No. 25, 5 April 2026) establishes the national total of 69 Wilayas and 1,541 communes. Decree 26-206 (JO No. 40, 3 June 2026) identifies the new Wilaya names and seats. For the amended commune register, use the interministerial order dated 5 May 2026 and published in **JO No. 58 on 12 August 2026**: [official French edition](https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026058.pdf) · [official Arabic edition](https://www.joradp.dz/FTP/jo-arabe/2026/A2026058.pdf).

The JO58 annex has separate `COMMUNES`, `NUMEROS DE CODE`, and `SIEGES` columns. The four-digit register code and administrative seat are not interchangeable. For example, the extracted text lists `Abdelkader Azil` as commune code `6003` with seat `Layadate`, and `Oued M’Zi` as code `5911` with seat `Madna El Grada`. The relevant JO58 annex screenshots returned `Cache miss`; these examples remain text-extraction observations pending visual page verification and qualified review.

Do not substitute a public repository's row ID, `code_commune`, ONS/geographic identifier, OSM relation ID, or postal code for the official four-digit commune-register code. Postal identifiers may retain an older Wilaya prefix after a legal parent-Wilaya change. Keep the stable internal PROMO GEST UUID as the record identity, while each source-backed external code and its effective interval remain separate, versioned attributes.

No candidate GitHub dataset is currently approved as the canonical 1,541-row register. See the source-by-source findings in [REFERENCE-DATA-GOVERNANCE.md](REFERENCE-DATA-GOVERNANCE.md), section 8.4. The commune catalogue remains unimported until the complete row-level crosswalk, source-page visual checks, effective dates, and qualified review are accepted.
