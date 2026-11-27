# P1-01 — JORADP recent-issue scan and Afernou bilingual source verification

**Audit date:** 27 November 2026  
**Repository base:** `562d6340fd10a55d4124d287e082a91709222bf5` (`main` at branch creation)  
**Disposition:** bounded documentation/evidence update only; not legal approval and not a 1,541-row acceptance.

## 1. Purpose and scope

This pass closes one explicit Arabic-source review gap in the territorial-change assertion ledger and checks the latest available November 2026 Official Journal issues for a later amendment to the 1985 territorial-register order.

It does not re-transcribe the national register, approve candidate commune names/codes, decide temporal validity, change application code or schema, or import operational reference data.

## 2. Decree 92-412 — Afernou (Jijel), both editions visually checked

**Official instrument:** Executive Decree No. 92-412 dated 14 November 1992, published in JO No. 82 on 15 November 1992, printed French page 1723.

- French official issue: [F1992082.PDF](https://www.joradp.dz/FTP/jo-francais/1992/F1992082.PDF), printed p. 1723, PDF zero-based index 6.
- Arabic official issue: [A1992082.pdf](https://www.joradp.dz/FTP/Jo-Arabe/1992/A1992082.pdf), printed p. 2100, PDF zero-based index 9.

The page images in both editions were visually inspected. The Arabic locality label is **أفرنو**. The decree transfers the locality from Selma Benziada to Ziama Mansouriah in Jijel.

**Evidence limits:** the Arabic PDF bytes were not downloaded and SHA-256-fingerprinted in this pass; no Arabic binary checksum is claimed. Only the existing French-PDF SHA-256 remains recorded in the assertion CSV. The audit establishes the decree's stated locality transfer; it does not establish a subsequent four-digit Decree 85-20 code, a legal effective-from date for the transfer, a commune-level unit identity, or an operational-authority transition.

The CSV row `DECR-92-412-AFERNOU` was updated with the Arabic verbatim label, both page-image review states and explicit page locators in its notes. The `valid_from`, code and practitioner-review fields remain blank/pending.

## 3. Recent Official Journal scan — issues 77 to 82

A targeted search for later acts amending the 22 June 1985 territorial-register order, together with review of the identified issue indexes/relevant text, found no such amendment in issues 77–82. Those issues cover 4–25 November 2026.

| Issue | Date | Relevant item identified | Relevance to P1-01 |
|---|---|---|---|
| 77/2026 | 4 Nov 2026 | Wilaya and commune contribution rates to the local solidarity/guarantee fund | Finance, not commune identity or register code |
| 78/2026 | 10 Nov 2026 | No register amendment identified in reviewed index | No new register delta |
| 79/2026 | 15 Nov 2026 | Decrees 26-354 (Casbah safeguarded-sector operation) and 26-355 (In Guezzam commercial free zone); Justice Ministry order establishes a section within Dréan tribunal jurisdiction, seated at Besbès and competent for Besbès, Zerizer and Asfour | Protected areas, special zones and judicial service catchment are distinct layers, not a commune register update |
| 80/2026 | 18 Nov 2026 | Decree 26-358 concerning tourist-expansion zones | Tourism-zone overlay; not commune/Wilaya membership |
| 81/2026 | 22 Nov 2026 | Interior Ministry order classifies the National Security cynotechnic centre; Education Ministry order updates directorate organization and names several new Wilayas | Administrative/service-organization references only; no commune identity, boundary or code change identified |
| 82/2026 | 25 Nov 2026 | Decrees 26-370 and 26-371 concern judicial territorial jurisdiction; Decree 26-380 creates a psychopedagogical centre in Achaacha, Wilaya of Mostaganem | Judicial jurisdictions and a facility location are separate overlays; neither is a commune register amendment |

Official issue PDFs:
- [JO77/2026](https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026077.pdf)
- [JO78/2026](https://www.joradp.dz/FTP/jo-francais/2026/F2026078.pdf)
- [JO79/2026](https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026079.pdf)
- [JO80/2026](https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026080.pdf)
- [JO81/2026](https://www.joradp.dz/FTP/jo-francais/2026/F2026081.pdf)
- [JO82/2026](https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026082.pdf)

**Negative-search qualification:** this is a bounded search based on index/search results and relevant text, not a page-by-page legal review of every item in every issue, not an exhaustive search of all JORADP archives, and not proof that no separately issued/unindexed act exists. The result should be rechecked before a future release or on receipt of a new instrument.

## 4. Source-handling and architecture rules

1. The latest located territorial-register amendment remains the 5 May 2026 interministerial order published in JO58/2026; it amends the 1985 register and is not a self-contained re-publication of all 1,541 communes.
2. Law 26-06 / JO25/2026 supplies the 69-Wilaya / 1,541-commune statutory total and changed legal composition; it must be read with the 1985 register and intervening instruments.
3. Decree 26-253 / JO52/2026 lists communes assigned to each Daira Chief for the relevant operational/service purpose. It is not a consolidated legal commune-to-Wilaya register and does not establish a four-digit commune code.
4. Tourism zones, protected areas, special zones, finance, and judicial jurisdiction must be modelled as distinct geographic/administrative concepts, not silently conflated with commune identity, territorial parentage, or register code.
5. Olostep is a discovery/extraction aid only. The evidence source is the official JORADP instrument and its printed page; OCR/Markdown output cannot override the original page image.

## 5. Outstanding work and safety boundary

- Arabic visual review for Decree 06-256 / JO49/2006 remains open.
- Full bilingual annex reconciliation for Decree 21-128 / JO26/2021 and the 2 June 1984 chief-lieu seat order remains open.
- All 1,541 master-ledger practitioner sign-offs remain `PENDING`; W30-R007 remains `NEEDS_EVIDENCE`; no commune data is imported; `communesCount = 0` and `PendingOfficialVerification` remain unchanged.
- No production database, Cloud SQL, application runtime, API contract, schema, migration, or deployed environment was changed.
