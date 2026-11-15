# PROMO GEST — Algerian Administrative Reference-Data Governance

**Legal baseline checked:** 15 November 2026.  
**Status:** The application accepts Wilaya codes 01–69; a canonical bilingual commune catalogue has not yet been implemented or approved.

## 1. Authoritative territorial baseline

Law No. 26-06 of 4 April 2026, published in Official Journal No. 25 dated 5 April 2026, amends Law No. 84-09 on the territorial organization. Article 3 states that the new territorial division contains 69 Wilayas and 1,541 communes.

Presidential Decree No. 26-206 of 25 May 2026, published in Official Journal No. 40 dated 3 June 2026, adds the names and seats of Wilayas 59–69:
- 59 — أفلو / Aflou
- 60 — بريكة / Barika
- 61 — القنطرة / El Kantara
- 62 — بئر العاتر / Bir El Ater
- 63 — العريشة / El Aricha
- 64 — قصر الشلالة / Ksar Chellala
- 65 — عين وسارة / Aïn Oussera
- 66 — مسعد / Messaad
- 67 — قصر البخاري / Ksar El Boukhari
- 68 — بوسعادة / Bou Saâda
- 69 — الأبيض سيدي الشيخ / El Abiodh Sidi Cheikh

Primary sources:
- Law 26-06, Official Journal No. 25, Arabic: https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf
- Law 26-06, Official Journal No. 25, French: https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf
- Decree 26-206 and Decree 26-208, Official Journal No. 40, Arabic: https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf
- Decree 26-206 and Decree 26-208, Official Journal No. 40, French: https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf

## 2. Important distinction about the transition period

Executive Decree No. 26-208 concerns the division of assets and liabilities between the original and newly created Wilayas. Article 2 requires completion before 31 December 2026 for property-related operations and by the end of fiscal year 2026 for financial operations.

This is a specific assets/liabilities transition. It must not be described as proof that every municipal register, land registry, tax office, permit authority, address system or service counter has already completed its transfer. The ERP must distinguish the legally defined Wilaya/commune association from the operational authority that handled a record at a particular date.

## 3. Current application gap

The current model stores:
- a Wilaya code;
- a Wilaya display name;
- a free-text municipality/commune name.

The domain currently validates the two-digit Wilaya range 01–69 and non-empty location labels. It does not resolve a canonical bilingual Wilaya name from the submitted code on the server. The project municipality remains free text. This is a 69-code compatibility baseline, not a complete national administrative gazetteer.

## 4. Target reference-data model

The eventual catalogue should be server-owned, versioned and effective-dated. A reference record should carry:
- stable internal UUID;
- official unit type (Wilaya, commune, and any later verified administrative level);
- official external code where one exists;
- Arabic and French official labels;
- parent administrative unit;
- valid-from and valid-to dates;
- source publication, article/page and source dataset version;
- import/verification status and review provenance.

Keep two concepts distinct:
1. **Legal/geographic jurisdiction:** which Wilaya and commune a location belongs to under a dated official territorial baseline.
2. **Operational authority:** which office/authority actually processed a permit, land-register operation, tax filing or administrative transaction on a particular date.

Do not invent commune codes, transliterations, boundary changes or office assignments. Do not infer a commune transfer solely from a new Wilaya capital/name list. A full bilingual commune dataset must be extracted from the official territorial law or a verified government dataset, reviewed and reconciled before it becomes selectable in production.

## 5. Historical-record preservation

Existing organization and project records contain free-text location snapshots. Preserve those original values.

The future migration should add nullable canonical reference IDs while keeping the original text and a source/verification state. A record can be linked to a canonical code only after the chosen code and effective date have been reviewed. Do not silently rewrite a historical project, contract, permit, land-title record or address when the current territorial catalogue changes.

When an administrative unit changes parent:
- retain the previous relationship with its validity interval;
- create the new relationship with its effective date;
- preserve both the recorded business address and the authority used for the transaction;
- make reports explicit about whether they use the current or historical territorial baseline.

## 6. API and UI ownership

The API/domain layer must own validation and canonical labels. The browser must not be authoritative for a Wilaya name, commune mapping or code. The API should return the reference-data version and bilingual labels to the UI.

During the compatibility period, the API may accept a legacy free-text value only as a clearly marked legacy snapshot. New canonical references should be validated server-side. The in-memory Vite preview must consume the same versioned data contract and must not maintain a divergent list.

## 7. Dataset acceptance checklist

Before adding a complete commune dataset:
1. Identify the exact official source edition and legal effective date.
2. Extract all 69 Wilaya–commune relationships from the authoritative text/data.
3. Verify the total count against the legal baseline of 1,541 communes, accounting for source-specific spelling/alias issues.
4. Review Arabic and French labels together.
5. Verify that no commune is duplicated, omitted or assigned to two current parents without a justified effective-date history.
6. Document any transitional authority mapping separately from the legal hierarchy.
7. Add deterministic import, validation and regression tests.
8. Add an update/rollback plan for installations with historical project records.

See [ADR 0010 — Versioned administrative reference data](ADR/0010-versioned-algerian-administrative-reference-data.md).
