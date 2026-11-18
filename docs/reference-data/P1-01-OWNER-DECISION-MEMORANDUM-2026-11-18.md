# P1-01 Owner Decision Memorandum — Proposed Canonical Code and Temporal Rules

**Date of owner instruction:** 18 November 2026  
**Task:** P1-01 — official-source audit for the 1,541-commune administrative reference  
**Decision status:** Owner has stated in the project conversation that they are the qualified reviewer and intend to sign/approve the work. The decisions below record that instruction and the recommended dispositions; the formal reviewer name, capacity details, dated signature and stamp are intentionally left blank for the owner's own completion. This document does not fabricate a signature.

## 1. Chabet El Ameur / شعبة العامر

**Proposed canonical current code:** `3514`  
**Historical/source note:** the French translation edition of JO23/1998 (printed p.11) prints `3614` in the Boumerdès (35) table, between 3513 and 3515. Preserve that literal printed value as a translated-edition typographical/source discrepancy; do not treat it as a valid commune code or canonical identifier. The Arabic original edition of JO23/1998 (printed p.13) and both 1985 register editions print `3514`; JO49/1996 and ONS W=35/C=14 provide corroboration. Decree 85-20 Article 3 requires the first two code digits to identify the Wilaya.

**Data decision to sign:** adopt `3514`; preserve `3614` in the source assertion / `source_erratum_note` with its exact instrument, edition, page and hash.

## 2. Chihani / شهاني

**Proposed canonical current code:** `3614`  
**Canonical Arabic label:** `شهاني`  
**Search/source-backed alias:** `شحاني` (ONS 2021 spelling; retain provenance and do not overwrite the legal source label).  
**Historical/source note:** the Arabic original JO44/1985 printed p.1635 gives `شهاني | 3614`. The French translation edition JO44/1985 printed p.1069 prints `Chihani | 3624`, duplicating the code printed for Raml Souk. Preserve the French printed assertion `3624` as a translated-edition source discrepancy, not as Chihani's canonical code. Raml Souk retains `3624`.

**Data decision to sign:** adopt code `3614` and canonical Arabic label `شهاني`; retain `شحاني` as a dated/provenance-backed alias and retain French `3624` as a source-error note.

## 3. Historical Algiers row `1600 — Ville d'Alger`

The JO44/1985 Wilaya d'Alger table declares 33 communes and lists 33 numbered commune codes 1601–1633, in addition to the historical line `1600 — Ville d'Alger`. JO23/1998 declares 57 communes and lists 57 numbered codes 1601–1657, again in addition to the 1600 line.

**Data decision to sign:** preserve `1600 — Ville d'Alger` as a separate historical special/aggregate territorial assertion. It is excluded from the 1,541 commune identity count and must not be imported as a commune. Record its historic source, legal basis and termination interval independently. Do not use the 2000-01 ordinance alone to infer an exact row-validity end date without verifying the operative article and its commencement rule.

## 4. Temporal and operational authority rules

Do not collapse the following into one `effective_from` date:

- Law No. 26-06: publication/legal composition reference date 5 April 2026 (JO25); the creation/composition of Wilayas and legal parent relationships must carry their own source and validity assertions.
- JO58/2026 interministerial order: order dated 5 May 2026, published 12 August 2026; register code/name/seat assertions require both instrument date and publication date. Do not infer that every administrative competence transferred on publication.
- Law 26-06 Article 54: transfer of powers is progressive and must be completed no later than 31 December 2026. Record the actual transfer date by Wilaya and competence where evidenced.
- Law 26-06 Article 55: execution of FY2026 budgets for the mother-Wilaya territory remains with the mother Wilaya.
- Executive Decree 26-208 Article 2: asset/property and financial transition milestones are distinct; record the relevant property-operation deadline and end-of-FY2026 financial close independently.
- Executive Decree 26-208 Article 5: 1 January 2027 is the start date for collection by the concerned successor Wilaya of the specific occupation fees for Wilaya public domain covered by that article. It is not a universal transfer date for every administrative power, receipt or service.

**Data decision to sign:** legal parentage, operational service authority, fiscal-year budget executor, property/asset attribution, fee-collection authority and litigation jurisdiction must be distinct source-backed temporal relationships. The responsible authority for a dated contract, project, permit or file must be resolved by transaction date and the relevant statutory function.

## 5. Approval boundary

These are the owner's stated intended decisions and the engineering recommendation for the signature sheet. They do not authorize marking all 1,541 candidate rows APPROVED, importing communes, changing production data, or unblocking P1-02. That requires the complete 1,541-row concordance, historical source chain, bilingual pairing, valid-time reconciliation, duplicate/omission tests, signed review record and release/rollback controls.

## 6. Owner's formal signature

Reviewer full name: __________________________________________

Professional qualification / capacity: ___________________________

Organization / professional body (if applicable): ________________

Date signed: ____________________

Signature / stamp: ____________________________________________

