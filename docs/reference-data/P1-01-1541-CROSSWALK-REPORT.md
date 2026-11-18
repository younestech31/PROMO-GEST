# P1-01 — 1,541-row working crosswalk and official-source reconciliation checkpoint

**Prepared:** 18 November 2026  
**Operational task:** P1-01 — official-source audit for the 1,541-commune administrative reference  
**State:** WORKING CROSSWALK BUILT — NOT LEGALLY APPROVED  
**Import boundary:** no commune records imported; the application remains at `communesCount = 0` / `PendingOfficialVerification`. P1-01 remains In Progress / Pending; P1-02 remains Blocked.

## 1. Deliverables created in this branch

- [P1-01-WORKING-CROSSWALK-1541.csv](P1-01-WORKING-CROSSWALK-1541.csv) — one row for each of the 1,541 candidate commune names, with bilingual candidate labels, candidate parent Wilaya, the Law 26-06 article relationship, JO58 French-text-layer code and seat data for all 108 communes in Wilayas 59–69, and explicit per-field evidence states.
- [P1-01-JO58-NEW-WILAYAS-108-REGISTER-EXTRACT.csv](P1-01-JO58-NEW-WILAYAS-108-REGISTER-EXTRACT.csv) — separate row-level transcription of the JO58 French PDF text layer for all 108 communes in the 11 new Wilayas. Commune name, four-digit register code and seat are kept as distinct source columns.
- [this report](P1-01-1541-CROSSWALK-REPORT.md) — reproducible methodology, counts, blockers and import boundary.

## 2. Primary legal sources and source roles

1. **Law No. 26-06**, dated 4 April 2026, Official Journal No. 25, 5 April 2026. Article 3 states 69 Wilayas / 1,541 communes. Articles 7, 9, 11, 16, 17, 18, 21, 30, 32 and 36 enumerate the composition of ten existing Wilayas, and Articles 52 bis 10–20 enumerate the eleven new-Wilaya compositions. French official edition: https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf ; Arabic official edition: https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf.
2. **Decree No. 85-20**, Official Journal No. 6, 3 February 1985, especially Articles 3–4. The official four-digit commune register code is mutable: its first two digits identify the Wilaya, the last two identify the commune within it; a transfer to another Wilaya requires a new code and the old code is not reallocated. This is why an internal candidate row key or public dataset ID is not the legal identity. French official edition: https://www.joradp.dz/FTP/jo-francais/1985/F1985006.PDF.
3. **Interministerial order of 5 May 2026**, published in JO No. 58, 12 August 2026. It modifies/completes the 22 June 1985 territorial register. The French annex has separate columns for communes, code numbers and seats. French official edition: https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026058.pdf ; Arabic official edition: https://www.joradp.dz/FTP/jo-arabe/2026/A2026058.pdf.
4. **Interministerial order of 12 September 2021**, published in JO No. 79, 17 October 2021, is a separate register amendment for the 2019 reform. French official edition: https://www.joradp.dz/FTP/jo-francais/2021/F2021079.pdf.
5. **Interministerial orders of 22 June 1985 (JO44/1985), 8 February 1986 (JO11/1986), and 21 March 1998 (JO23/1998)** remain part of the register source chain. The code-lineage evidence pack keeps several conflicts from these instruments open; this crosswalk does not adjudicate them.

## 3. Candidate input — deliberately not a legal source

The 1,541 bilingual candidate rows were taken from the pinned public repository `islam-re/Algeria-wilayas`, commit `bfb29814117d11a6a101fa07c38911f6675b748b`, file `json/wilaya-commune/wilaya-commune.json`. The source commit and path are written into every row. It is a convenience candidate list, not the official territorial register: its own schema has no register code, no administrative seat, no valid-time interval, and no JORADP row-level provenance. The generated `working_row_key` is a local workpaper key only, not a canonical identifier.

A different public 2026 dataset was also inspected; its README has a different assignment of Wilaya codes 60–69 from the official JO58 Wilaya-code list. It was excluded from this crosswalk.

## 4. Deterministic checks performed

| Check | Result |
|---|---:|
| Candidate Wilaya groups | 69 |
| Candidate commune rows | 1541 |
| Unique Wilaya codes | 69 |
| Law 26-06 explicitly enumerated affected/new Wilayas | 21 |
| Rows in those 21 candidate groups | 404 |
| Names enumerated in the corresponding Law 26-06 articles | 404 |
| Groups with exact normalized French-name set match | 21/21 |
| JO58 French-text-layer rows transcribed across 21 affected Wilayas | 404 |
| New-Wilaya rows (codes 59–69) | 108 |
| Existing-Wilaya changed rows | 296 |
| Rows joined to candidate rows by normalized French label | 399/404 |
| Unresolved JO58-to-candidate label variants | 5 |
| Four-digit JO58 codes with matching two-digit Wilaya prefix | 404/404 |
| Duplicate JO58 codes across the 404-row extraction | 0 |

The machine-readable Law 26-06 list input was the pinned third-party transcription `islam-re/Algeria-wilayas` / `bfb29814117d11a6a101fa07c38911f6675b748b` / `JO Article 2026.md`. Its 404 French list entries were cross-checked against the official French JO25 PDF pages 4–9; the page images were reviewed in this session. Arabic JO25 page images were available only for printed pages 4–6. The code records the third-party transcription blob SHA below so that this input is not mistaken for an official JORADP download.

Name normalization is limited to Unicode normalization, case, diacritic, punctuation and whitespace handling. It does not assert that two source strings are the same legal identity. No Arabic labels are normalized or inferred. The comparison is a set comparison per Wilaya article, not proof of the full amendment lineage.

### 4.1 Law 26-06 composition comparison

| Wilaya code | Law article | Candidate count | Law article count | Set result |
|---:|---|---:|---:|---|
| 03 | 7 | 12 | 12 | MATCH |
| 05 | 9 | 53 | 53 | MATCH |
| 07 | 11 | 22 | 22 | MATCH |
| 12 | 16 | 24 | 24 | MATCH |
| 13 | 17 | 49 | 49 | MATCH |
| 14 | 18 | 36 | 36 | MATCH |
| 17 | 21 | 18 | 18 | MATCH |
| 26 | 30 | 43 | 43 | MATCH |
| 28 | 32 | 24 | 24 | MATCH |
| 32 | 36 | 15 | 15 | MATCH |
| 59 | 52 bis 10 | 12 | 12 | MATCH |
| 60 | 52 bis 11 | 8 | 8 | MATCH |
| 61 | 52 bis 12 | 5 | 5 | MATCH |
| 62 | 52 bis 13 | 4 | 4 | MATCH |
| 63 | 52 bis 14 | 4 | 4 | MATCH |
| 64 | 52 bis 15 | 6 | 6 | MATCH |
| 65 | 52 bis 16 | 10 | 10 | MATCH |
| 66 | 52 bis 17 | 8 | 8 | MATCH |
| 67 | 52 bis 18 | 21 | 21 | MATCH |
| 68 | 52 bis 19 | 23 | 23 | MATCH |
| 69 | 52 bis 20 | 7 | 7 | MATCH |

The 21 groups contain 404 rows (10 pre-existing Wilayas / 11 newly created Wilayas). The remaining 1137 candidate rows sit in 48 Wilayas not enumerated as newly composed in these Law 26-06 articles. Their absence from those 21 lists is not a complete validation against the current register; each still requires reconciliation against the inherited 1985 register and amendments.

## 5. JO58 108-row French register extraction

The separate [404-row consolidated JO58 extract](P1-01-JO58-REGISTER-EXTRACT-404.csv) combines [108 new-Wilaya rows](P1-01-JO58-NEW-WILAYAS-108-REGISTER-EXTRACT.csv) and [296 existing-Wilaya rows](P1-01-JO58-EXISTING-WILAYAS-296-REGISTER-EXTRACT.csv). It records the French text-layer values in the three JO58 annex columns. The records preserve:
- the commune label from the register column;
- the exact four-digit code as printed in the text layer;
- the administrative seat as a separate field;
- JO58 printed page, order date and publication date;
- text-layer evidence state and pending visual / Arabic review.

The 404-row count comprises 296 entries across the ten existing-Wilaya sections and 108 entries across the eleven new-Wilaya sections. The new-Wilaya counts are 59:12, 60:8, 61:5, 62:4, 63:4, 64:6, 65:10, 66:8, 67:21, 68:23, 69:7. The ten existing-Wilaya counts are 03:12, 05:53, 07:22, 12:24, 13:49, 14:36, 17:18, 26:43, 28:24, 32:15. All extracted code values are four digits, carry the corresponding Wilaya prefix, and are unique within the 404-row text-layer extract. 399/404 source rows could be joined to candidate rows by normalized French label. Five rows remain unjoined: JO58 “Chen iguel” / 6714 vs candidate “Cheniguel”; “El O uinet” / 6719 vs “El Ouinet”; “Bouhilat” / 0560 vs “Boulhilat”; “Fellaucène” / 1320 vs “Fellaoucene”; and the JO58 text-layer form “Dehahnа” / 2830 vs candidate “Dehahna”. The last string contains a visually confusable Unicode character in the captured text layer. All five are listed in [P1-01-JO58-NAME-RECONCILIATION-EXCEPTIONS.csv](P1-01-JO58-NAME-RECONCILIATION-EXCEPTIONS.csv); no fuzzy link or forced code/seat binding is made. **Do not yet treat these rows as visually transcribed or practitioner-approved**: the JORADP page-image requests for JO58 annex pages return Cache miss in the current review session. The legal effective-from date is not filled merely from the order date or publication date.

## 6. Critical limitations — this workpaper is not the final legal concordance

1. The French JO25 pages 4–9 were reviewed through the official PDF text and page screenshots. The Arabic JO25 screenshots were available only for printed pages 4–6; page-image requests for later pages returned Cache miss. Thus the full row-by-row Arabic/French label pairing is not approved.
2. JO58 pages for the new-Wilaya section were text-layer extracted only. Their original page images and the corresponding Arabic annex have not been visually verified. The 108 rows have blank PDF SHA-256 fields because the exact original PDF bytes were not obtained in this pass. JO58 image review remains pending for every extracted page, so the exact cell transcription and the two Wilaya 67 string variants still require visual adjudication.
3. The JO58 register delta contains 296 entries across ten pre-existing Wilaya sections; all 296 code/seat text-layer rows are now transcribed. Three source-label variants in this slice remain unjoined. The source names are not assumed equivalent to the candidate names. This pass records the law membership and candidate rows but does not claim that delta extraction complete.
4. The inherited 48-Wilaya register rows (1,137 candidate rows) require a full row-level join against JO44/1985 and all intervening register amendments, including JO11/1986, JO23/1998 and JO79/2021, plus any additional amendments identified by exhaustive legal search.
5. The full amendment inventory is not yet legally certified exhaustive. Territorial composition/limits decrees (including 1992, 1993, 2006 and 2021 instruments) must remain separate from code-register amendments. Locality/mechta transfers do not themselves prove a commune code change.
6. Historical disputes remain open, including Chabet El Ameur (JO44/1985 / JO23/1998 3514 vs 3614 text-layer conflict) and Chihani (JO44 repeated 3624 text-layer anomaly vs later ONS W./C. cross-checks). No canonical correction is selected here.
7. Arabic source name variants, Latin transcription variants, duplicate names across different Wilayas, historical renames and source-specific ordering need row-level reconciliation. A matching name string is not enough to merge legal identities.
8. A qualified Algerian legal / territorial-administration practitioner must sign the source hierarchy, code lineage, valid-time interpretation, disputed rows and final 1,541-row completeness report.

## 7. Do-not-cross boundary

- No commune records are imported into PostgreSQL or production.
- No application/API/schema/migration or Google AI Studio Cloud SQL changes are part of this evidence-only slice.
- No canonical code, effective date, Arabic spelling or historical identity is inferred where the official source does not establish it.
- Do not mark P1-01 Done and do not unblock P1-02 from this workpaper alone.

## 8. Next evidence slices

1. Review all 404 JO58 table rows against the original French and Arabic page images; resolve the five name differences and preserve the three-column row cell provenance.
2. Acquire original Arabic/French PDFs, compute SHA-256 on exact downloaded bytes, and visually review JO58 printed pages 9–25 in both editions.
3. Reconcile the 1,137 unchanged candidate rows in 48 Wilayas against the prior 1985 register and full register amendment chain.
4. Build a row-level source assertion ledger for all 1,541 units, including effective-dated parent/code/name assertions, seat provenance, aliases and conflicts.
5. Resolve JO44/1985 and JO23/1998 code-lineage conflicts, ONS 2021 date inconsistency, and the Chihani source anomaly without overwriting source assertions.
6. Run deterministic completeness, uniqueness, parent, code and temporal-interval checks; produce the final exceptions register.
7. Obtain qualified Algerian practitioner adjudication and signed acceptance before marking P1-01 Done or starting P1-02.

## 9. Reproducibility inputs

- Candidate JSON blob SHA: `1aba9bc954bf43328ca54081f0448f613b72604e`
- Law transcription markdown blob SHA: `73d32b1c211ea06211cdf8d69f14630811f62d0e`
- JO58 extracted record count: 404 (108 new-Wilaya + 296 existing-Wilaya)
- Main workpaper SHA / PR: to be recorded after commit and CI.
