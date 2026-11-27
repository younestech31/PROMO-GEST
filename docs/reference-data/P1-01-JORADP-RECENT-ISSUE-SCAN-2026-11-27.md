# P1-01 — JORADP source review: Afernou, Ouargla seat/boundary chronology and recent-issue scan

**Audit date:** 27 November 2026  
**Repository base:** `562d6340fd10a55d4124d287e082a91709222bf5` (`main` at branch creation)  
**Disposition:** bounded documentation/evidence update only; not legal approval and not a 1,541-row acceptance.

## 1. Purpose and scope

This pass closes Arabic page-image review gaps for Afernou (1992) and Oued El Meraâ (2006), distinguishes the 2005 Hassi-Messaoud chief-lieu seat relocation from the 2006 locality-parent transfer, and checks the latest available November 2026 Official Journal issues for a later amendment to the 1985 territorial-register order.

It does not re-transcribe the national register, approve candidate commune names/codes, decide temporal validity, change application code or schema, or import operational reference data.

## 2. Decree 92-412 — Afernou (Jijel), both editions visually checked

**Official instrument:** Executive Decree No. 92-412 dated 14 November 1992, published in JO No. 82 on 15 November 1992, printed French page 1723.

- French official issue: [F1992082.PDF](https://www.joradp.dz/FTP/jo-francais/1992/F1992082.PDF), printed p. 1723, PDF zero-based index 6.
- Arabic official issue: [A1992082.pdf](https://www.joradp.dz/FTP/Jo-Arabe/1992/A1992082.pdf), printed p. 2100, PDF zero-based index 9.

The page images in both editions were visually inspected. The Arabic locality label is **أفرنو**. The decree transfers the locality from Selma Benziada to Ziama Mansouriah in Jijel.

**Evidence limits:** the Arabic PDF bytes were not downloaded and SHA-256-fingerprinted in this pass; no Arabic binary checksum is claimed. Only the existing French-PDF SHA-256 remains recorded in the assertion CSV. The audit establishes the decree's stated locality transfer; it does not establish a subsequent four-digit Decree 85-20 code, a legal effective-from date for the transfer, a commune-level unit identity, or an operational-authority transition.

The CSV row `DECR-92-412-AFERNOU` was updated with the Arabic verbatim label, both page-image review states and explicit page locators in its notes. The `valid_from`, code and practitioner-review fields remain blank/pending.


## 3. Ouargla — distinguish the 2005 chief-lieu seat location from the 2006 locality-parent transfer

The official Arabic and French editions show two related but legally distinct events at Oued El Meraâ. They must remain separate in P1-01.

### A. Decree 05-127 / JO29/2005, Article 6 — administrative-seat relocation

Executive Decree 05-127 of 24 April 2005, published in JO29/2005, declares Hassi-Messaoud a major-risk zone. Article 6 transfers the seat of the chief-lieu of Hassi-Messaoud to the place called Oued El Meraâ, located inside the territory of Hassi Ben Abdallah.

Both official page images were inspected:
- French edition, printed p.13 / PDF zero-based index 12: [F2005029.pdf](https://www.joradp.dz/FTP/jo-francais/2005/F2005029.pdf).
- Arabic edition, printed p.16 / PDF zero-based index 15: [A2005029.PDF](https://www.joradp.dz/FTP/jo-arabe/2005/A2005029.PDF).

Arabic wording identifies the seat of Hassi Messaoud and the destination as **وادي المرعى**, located within the territory of Hassi Ben Abdallah. The instrument changes the location of the commune chief-lieu seat; it does not itself transfer Oued El Meraâ's territorial parent to Hassi Messaoud or state a four-digit commune register code.

### B. Decree 06-256 / JO49/2006, Article 1 — locality-parent transfer

Executive Decree 06-256 of 30 July 2006, published in JO49/2006 on 2 August 2006, later modifies the territorial composition of Hassi Messaoud and Hassi Ben Abdellah. Article 1 states that the locality Oued El Meraâ, previously attached to Hassi Ben Abdellah, is integrated into the territory of Hassi Messaoud.

Both official page images were inspected:
- French edition, printed p.4 / PDF zero-based index 3: [F2006049.pdf](https://www.joradp.dz/FTP/jo-francais/2006/F2006049.pdf).
- Arabic edition, printed p.4 / PDF zero-based index 3: [A2006049.pdf](https://www.joradp.dz/FTP/jo-arabe/2006/A2006049.pdf).

The Arabic source locality label is **وادي المرعى**. The existing French PDF byte hash remains recorded in the territorial-change CSV; no Arabic PDF byte hash was captured in this pass.

**Interpretation boundary:** the 2005 act establishes the new chief-lieu seat location while that place is inside Hassi Ben Abdallah; the 2006 act establishes the later locality-parent transfer into Hassi Messaoud. Neither page authorizes the audit to infer a four-digit Decree 85-20 code, a legally adjudicated valid_from date, or a separate operational-service handover date. Both CSV assertions retain blank code/valid-time fields and pending practitioner review.


## 4. Decree 21-128 / JO26/2021 and the 1984 chief-lieu seat order

### A. Decree 21-128 / JO26/2021 — composition/limits, not the code register

Executive Decree 21-128 of 29 March 2021, published on 7 April 2021, modifies the territorial-composition table attached to Decree 84-365. Article 1 addresses eight existing Wilayas (01, 07, 08, 11, 30, 33, 39 and 47) and adds the ten Wilayas 49–58 created under Law 19-12. The French annex headings include 49 Timimoun, 50 Bordj Badji Mokhtar, 51 Ouled Djellal, 52 Béni Abbès, 53 In Salah, 54 In Guezzam, 55 Touggourt, 56 Djanet, 57 El Meghaier and 58 El Meniaâ.

- Official French JORADP edition: [F2021026.pdf](https://www.joradp.dz/FTP/jo-francais/2021/F2021026.pdf), Decree and annex pages 5–16 visually inspected.
- Arabic official JORADP edition: [A2021026.pdf](https://www.joradp.dz/FTP/jo-arabe/2021/A2021026.pdf), pages 5–17 visually inspected directly from the JORADP-hosted PDF. The final printed page 17 contains Wilayas 56 Djanet, 57 El Meghaier and 58 El Meniaâ. The repository already records a historical SHA-256 for A2021026.pdf, but no fresh checksum was calculated from downloaded bytes in this pass.

**Interpretation boundary:** this decree concerns territorial composition/limits, not the four-digit Decree 85-20 commune register or chief-lieu seats. Its annex was not transcribed row by row in this pass. The French and Arabic page images were visually inspected from JORADP-hosted official PDFs, but this pass did not recalculate or compare PDF-byte SHA-256 values and did not complete row-by-row bilingual adjudication. Preserve the decree separately from the interministerial register order published in JO79/2021. Do not infer current codes, seats, effective dates or parent links from Wilaya headings alone.

### B. June 1984 chief-lieu seat order / JO41/1984 — sampled French visual review

The 2 June 1984 interministerial order sets the chief-lieu seats in a separate column from commune names. The official French PDF [F1984041.pdf](https://www.joradp.dz/FTP/Jo-Francais/1984/F1984041.pdf) was text-reviewed; selected printed table pages 1030, 1044, 1045 and 1048 were visually inspected. These samples confirm the commune/seat distinction but are not a complete annex transcription or a row-by-row reconciliation.

The Arabic JORADP edition was not visually reviewed in this pass. The JO11/1986 amendment cites a further order dated 13 May 1985 modifying the June 1984 seat order; its standalone issue/page and full annex remain unlocated. Do not infer its effects from the recital.

### C. Source-population clarification for JO44/1985

The French searchable-text extraction of the original JO44/1985 register is complete for all 48 original Wilaya sections and 1,541 commune rows, with the separate 1600 Ville d'Alger special assertion excluded from that count. The 975 figure is the residual source-lineage/reconciliation bucket across 30 Wilayas; it is **not** 975 rows still missing from the original JO44 extraction. Historical 78/975 and similar figures in the inventory's 18 November sections are incremental dated checkpoints, not current population totals. Full legal amendment lineage, bilingual row-level evidence and practitioner adjudication remain open.

## 5. Recent Official Journal scan — issues 77 to 82

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

## 6. Source-handling and architecture rules

1. The latest located territorial-register amendment remains the 5 May 2026 interministerial order published in JO58/2026; it amends the 1985 register and is not a self-contained re-publication of all 1,541 communes.
2. Law 26-06 / JO25/2026 supplies the 69-Wilaya / 1,541-commune statutory total and changed legal composition; it must be read with the 1985 register and intervening instruments.
3. Decree 26-253 / JO52/2026 lists communes assigned to each Daira Chief for the relevant operational/service purpose. It is not a consolidated legal commune-to-Wilaya register and does not establish a four-digit commune code.
4. Tourism zones, protected areas, special zones, finance, and judicial jurisdiction must be modelled as distinct geographic/administrative concepts, not silently conflated with commune identity, territorial parentage, or register code.
5. Olostep is a discovery/extraction aid only. The evidence source is the official JORADP instrument and its printed page; OCR/Markdown output cannot override the original page image.

## 7. Outstanding work and safety boundary

- The 2005 and 2006 Arabic/French page images were checked, but PDF-byte SHA-256 values for the inspected 2005 editions and the Arabic 2006 edition were not captured. This is a binary-provenance gap, not an outstanding page-image review.
- Recalculate/compare SHA-256 for the official JO26/2021 Arabic and French PDF binaries; complete row-by-row bilingual transcription and reconciliation for Decree 21-128. The 2 June 1984 chief-lieu seat order still needs its Arabic annex review and full transcription.
- All 1,541 master-ledger practitioner sign-offs remain `PENDING`; W30-R007 remains `NEEDS_EVIDENCE`; no commune data is imported; `communesCount = 0` and `PendingOfficialVerification` remain unchanged.
- No production database, Cloud SQL, application runtime, API contract, schema, migration, or deployed environment was changed.
