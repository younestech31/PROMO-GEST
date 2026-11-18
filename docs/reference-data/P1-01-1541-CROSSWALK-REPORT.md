# P1-01 — 1,541-row working crosswalk and official-source reconciliation checkpoint

**Prepared:** 18 November 2026  
**Operational task:** P1-01 — official-source audit for the 1,541-commune administrative reference  
**State:** WORKING CROSSWALK BUILT — NOT LEGALLY APPROVED  
**Import boundary:** no commune records imported; the application remains at `communesCount = 0` / `PendingOfficialVerification`. P1-01 remains In Progress / Pending; P1-02 remains Blocked.

> **Evidence-quality correction — JO79 Arabic exception workpaper:** the 39-row `P1-01-JO79-ARABIC-EXCEPTION-RECONCILIATION.csv` must be treated as an exception index only. The Arabic label/seat transcription previously written into that file was not independently reproduced from the primary Arabic PDF during this pass. The correction branch clears those unverified source-label values and records them as pending transcription from `A2021079.pdf`. Candidate Arabic strings remain candidate data only, not evidence of the JO79 printed text. The repository's other JO79 extract files state that their page images were previously reviewed; that does not substitute for a reproducible row-level Arabic transcription in this exception workpaper. No JO79 Arabic-based identity decision is approved by that file until the primary issue is re-transcribed and checked.

> **Methodology correction — 19 November 2026:** The historical `360/975` figure below is a legacy residual-evidence planning bucket, not the denominator for complete JO44/1985 baseline extraction. The repository now records **742 numbered French text-layer rows across 21 of the 48 original Wilaya sections** (W01–W18, W31, W35 and W36); **27 section tables remain**. The W16 `1600 — Ville d'Alger` special assertion is held separately and excluded from numbered commune rows. The 48-Wilaya control now contains **48/48 official declared heading counts**, summing to **1,541** (the earlier subtotal 1,224 plus 317 across the ten previously blank headings). This is an aggregate heading-count reconciliation only: it does not establish that the 1985 rows are the 2026 current entities, nor does it reconcile every name/code/parent/effective date. No commune is approved or imported. Do not report the former `360/975` and `615 remaining` values as national JO44 extraction coverage. See [P1-01 review addendum](P1-01-2026-11-18-REVIEW-ADDENDUM.md).

## 1. Deliverables created in this branch

- [P1-01-WORKING-CROSSWALK-1541.csv](P1-01-WORKING-CROSSWALK-1541.csv) — one row for each of the 1,541 bilingual candidate names, carrying the pinned candidate source, Law 26-06 membership result, JO58 code/seat values where a source label was safely joined, and explicit row-level evidence states.
- [P1-01-JO58-NEW-WILAYAS-108-REGISTER-EXTRACT.csv](P1-01-JO58-NEW-WILAYAS-108-REGISTER-EXTRACT.csv) — 108 JO58 French text-layer rows for the eleven new Wilayas.
- [P1-01-JO58-EXISTING-WILAYAS-296-REGISTER-EXTRACT.csv](P1-01-JO58-EXISTING-WILAYAS-296-REGISTER-EXTRACT.csv) — 296 JO58 French text-layer rows for ten existing Wilayas.
- [P1-01-JO58-REGISTER-EXTRACT-404.csv](P1-01-JO58-REGISTER-EXTRACT-404.csv) — consolidated 404-row JO58 extract with separate commune-name, register-code and seat fields, candidate-row mapping status and provenance.
- [P1-01-JO58-NAME-RECONCILIATION-EXCEPTIONS.csv](P1-01-JO58-NAME-RECONCILIATION-EXCEPTIONS.csv) — the five source-label variants kept unresolved and unlinked.
- [P1-01-JO44-1985-W01-ADRAR-TEXT-EXTRACT-28.csv](P1-01-JO44-1985-W01-ADRAR-TEXT-EXTRACT-28.csv) — 28 French text-layer rows for Wilaya 01 Adrar, printed p.1053; structurally validated (28 unique row IDs and register codes 0101–0128), but Arabic pairing, visual review, amendment reconciliation and practitioner approval remain pending.
- [P1-01-JO44-1985-W07-BISKRA-TEXT-EXTRACT-33.csv](P1-01-JO44-1985-W07-BISKRA-TEXT-EXTRACT-33.csv) — 33 French text-layer rows for Wilaya 07 Biskra, printed p.1056; declared source total 33 and codes 0701–0733. It preserves the 1985 baseline separately from 2021/2026 parent/code transfers; Arabic pairing and visual page review remain pending.
- [P1-01-JO23-1998-ALGIERS-BLIDA-BOUMERDES-TIPAZA-REGISTER-EXTRACT.csv](P1-01-JO23-1998-ALGIERS-BLIDA-BOUMERDES-TIPAZA-REGISTER-EXTRACT.csv) — 142 commune assertions in the JO23/1998 French searchable text layer (W16=57, W09=25, W35=32, W42=28), plus a separate 1600 Ville d'Alger historical special row excluded from the commune count. All source rows remain unapproved; page-image/Arabic pairing and 1985/2000 lineage reconciliation remain pending.
- [P1-01-JO44-1985-W13-TLEMCEN-TEXT-EXTRACT-53.csv](P1-01-JO44-1985-W13-TLEMCEN-TEXT-EXTRACT-53.csv) — 53 French searchable-text rows for Wilaya 13 Tlemcen, printed p.1058, codes 1301–1353; visual review and Arabic pairing pending.
- [P1-01-JO44-1985-W14-TIARET-TEXT-EXTRACT-42.csv](P1-01-JO44-1985-W14-TIARET-TEXT-EXTRACT-42.csv) — 42 French searchable-text rows for Wilaya 14 Tiaret, printed p.1059, codes 1401–1442; visual review and Arabic pairing pending.
- [P1-01-JO44-1985-W15-TIZI-OUZOU-TEXT-EXTRACT-67.csv](P1-01-JO44-1985-W15-TIZI-OUZOU-TEXT-EXTRACT-67.csv) — 67 French searchable-text rows for Wilaya 15 Tizi Ouzou, printed pp.1059–1060, codes 1501–1567; visual review and Arabic pairing pending.
- [P1-01-JO44-1985-W16-ALGER-COMMUNES-33-EXTRACT.csv](P1-01-JO44-1985-W16-ALGER-COMMUNES-33-EXTRACT.csv) — 33 numbered commune assertions for Wilaya 16 Alger, codes 1601–1633, French searchable-text extract. The separate 1600 aggregate/special assertion is not counted as a commune.
- [P1-01-JO44-1985-W16-ALGER-1600-SPECIAL-ASSERTION.csv](P1-01-JO44-1985-W16-ALGER-1600-SPECIAL-ASSERTION.csv) — literal 1600 `Ville d'Alger` historic special row, stored separately and excluded from the 33 numbered communes and the 1,541 commune count.
- [P1-01-JO44-1985-W17-DJELFA-TEXT-EXTRACT-36.csv](P1-01-JO44-1985-W17-DJELFA-TEXT-EXTRACT-36.csv) — 36 French searchable-text assertions for Wilaya 17 Djelfa, codes 1701–1736, printed pp.1060–1061. Page-image review, Arabic pairing, amendment lineage, candidate joins and practitioner approval remain pending.
- [P1-01-JO44-1985-W18-JIJEL-TEXT-EXTRACT-28.csv](P1-01-JO44-1985-W18-JIJEL-TEXT-EXTRACT-28.csv) — 28 French searchable-text assertions for Wilaya 18 Jijel, codes 1801–1828, printed pp.1061–1062. Page-image review, Arabic pairing, amendment lineage, candidate joins and practitioner approval remain pending.
- [P1-01-JO44-1985-W35-BOUMERDES-TEXT-EXTRACT-38.csv](P1-01-JO44-1985-W35-BOUMERDES-TEXT-EXTRACT-38.csv) — 38 French historical source assertions for Wilaya 35 Boumerdes, codes 3501–3538, printed pp.1068–1069. The official p.1068 page image confirms the heading and first three rows; remaining p.1069 rows are searchable-text-only and await visual review. Arabic pairing, JO23/1998 and later lineage, candidate joins and practitioner approval remain pending.
- [P1-01-JO44-1985-W36-EL-TARF-TEXT-EXTRACT-24.csv](P1-01-JO44-1985-W36-EL-TARF-TEXT-EXTRACT-24.csv) — 24 French text-layer source assertions for Wilaya 36 El Tarf, printed p.1069. The table preserves the literal duplicate code `3624` for Chihani and Raml Souk and the absence of `3614` in the French edition. Existing sign-off material records the Arabic page reading `شهاني | 3614`; row-level Arabic transcription, current validity, candidate join and practitioner adjudication remain pending.
- [P1-01-JO79-2021-EXISTING-WILAYAS-103-REGISTER-EXTRACT.csv](P1-01-JO79-2021-EXISTING-WILAYAS-103-REGISTER-EXTRACT.csv) — 103 source rows in eight existing Wilayas; the repository marks both FR and AR page-image review as completed.
- [P1-01-JO79-ARABIC-EXCEPTION-RECONCILIATION.csv](P1-01-JO79-ARABIC-EXCEPTION-RECONCILIATION.csv) — 39 old/new-Wilaya JO79 exceptions with Arabic register labels, candidate Arabic labels and row-level match assessment; formal mapping status remains pending.
- [P1-01-OWNER-DECISION-MEMORANDUM-2026-11-18.md](P1-01-OWNER-DECISION-MEMORANDUM-2026-11-18.md) — proposed owner decisions and temporal rules, with signature fields intentionally blank.
- [this report](P1-01-1541-CROSSWALK-REPORT.md) — reproducible method, deterministic checks, blockers and import boundary.

## 1A. JO44/1985 heading-count and extraction controls — refreshed 19 November 2026

The 48-Wilaya control now contains **48/48 official declared heading counts**, with a total of **1,541** across the 48 headings. The ten values newly transcribed from the official French searchable-text headings are W17 Djelfa 36; W18 Jijel 28; W21 Skikda 38; W28 M'Sila 47; W29 Mascara 47; W30 Ouargla 21; W32 El Bayadh 22; W33 Illizi 6; W34 Bordj Bou Arreridj 34; and W48 Relizane 38. Their subtotal is 317; together with the previously recorded 1,224 this equals 1,541. This proves arithmetic consistency of the JO44 heading totals with the national number, but not current entity identity, bilingual row completeness, valid-time lineage, or legal approval.

The table-extraction denominator remains separate: **21/48 sections extracted (742 numbered French text-layer rows)** and **27** section tables remain. The W16 `1600 — Ville d'Alger` historical special assertion remains separate and excluded. W35 Boumerdes has 38 rows (3501–3538); only its p.1068 heading and first three rows were visually reviewed, and the remaining p.1069 entries remain searchable-text-only. W36 El Tarf has 24 extracted rows (3601–3624 as printed), but the French table contains only 23 distinct code strings: `3624` appears for both Chihani and Raml Souk, while `3614` is absent. The previously reviewed Arabic source is recorded in the sign-off pack as `شهاني | 3614`; no canonical correction is selected. The new W36 extract explicitly preserves both source assertions and leaves row-level Arabic transcription, current validity, candidate matching and practitioner review pending.

### W36 El Tarf — 19 November 2026

The official French JO44/1985 text layer declares 24 communes and lists 24 name/code/seat assertions. The new CSV preserves all 24 source rows verbatim; structural checks returned 24 unique assertion IDs, 23 distinct printed code values and one duplicate (`3624`), used for both Chihani and Raml Souk. Code `3614` is absent from the French table. The existing sign-off pack records prior visual review of the Arabic printed p.1635 as `شهاني | 3614` and `رمل السوق | 3624`; this does not authorize correcting the French source row or asserting a complete Arabic row-level crosswalk. The French page image was not re-rendered during this pass because the JORADP page-image endpoint returned a cache miss; the extract is explicitly marked as a searchable-text transcription with prior visual review recorded in the sign-off material. No code, identity or effective date is approved. [Official JO44/1985 French issue](https://www.joradp.dz/FTP/jo-francais/1985/F1985044.PDF).

### W17 Djelfa and W18 Jijel — 19 November 2026

Two adjacent sections were transcribed from the French JO44/1985 searchable text layer: W17 Djelfa declares 36 rows with codes 1701–1736, and W18 Jijel declares 28 rows with codes 1801–1828. The extracts preserve all 64 commune-name/code/seat assertions as separate fields, with source page references (Djelfa pp.1060–1061; Jijel pp.1061–1062). Structural checks confirm 36/36 and 28/28 unique assertion IDs and unique sequential code values. The page-image screenshot service returned cache misses for PDF pages 1060–1062, so no fresh visual review is claimed; these rows remain French text-layer only, without Arabic row pairing or candidate joins, and require full amendment/current-validity reconciliation and practitioner review.

Newly transcribed from the official French JO44/1985 searchable-text headings in the preceding tranche: W13 Tlemcen 53; W15 Tizi Ouzou 67; W19 Sétif 60; W20 Saïda 16; W22 Sidi Bel Abbès 52; W23 Annaba 12; W24 Guelma 34; W25 Constantine 12; W26 Médéa 64 (the heading count was already recorded and is retained); W27 Mostaganem 32; W39 El Oued 30; W42 Tipaza 42; W43 Mila 32. These are heading-count assertions only. They do not constitute row extraction, page-image visual review, Arabic original pairing, candidate joins, or practitioner approval. Source: official [JORADP JO44/1985 French issue](https://www.joradp.dz/FTP/jo-francais/1985/F1985044.PDF).

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
| Rows joined to candidate rows by normalized French label | 404/404 (after visual PNG fix of 5 capture errors) |
| Unresolved JO58-to-candidate label variants | 0 (5 prior capture errors resolved by image check) |
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

## 5. JO58 404-row French register extraction

The separate [404-row consolidated JO58 extract](P1-01-JO58-REGISTER-EXTRACT-404.csv) combines [108 new-Wilaya rows](P1-01-JO58-NEW-WILAYAS-108-REGISTER-EXTRACT.csv) and [296 existing-Wilaya rows](P1-01-JO58-EXISTING-WILAYAS-296-REGISTER-EXTRACT.csv). It records the French text-layer values in the three JO58 annex columns. The records preserve:
- the commune label from the register column;
- the exact four-digit code as printed in the text layer;
- the administrative seat as a separate field;
- JO58 printed page, order date and publication date;
- text-layer evidence state and pending visual / Arabic review.

The 404-row count comprises 296 entries across the ten existing-Wilaya sections and 108 entries across the eleven new-Wilaya sections. The new-Wilaya counts are 59:12, 60:8, 61:5, 62:4, 63:4, 64:6, 65:10, 66:8, 67:21, 68:23, 69:7. The ten existing-Wilaya counts are 03:12, 05:53, 07:22, 12:24, 13:49, 14:36, 17:18, 26:43, 28:24, 32:15. All extracted code values are four digits, carry the corresponding Wilaya prefix, and are unique within the 404-row extract. Direct visual inspection of rendered PNG page images for **all printed pp. 9–25 in both French (`F2026058.pdf`, SHA-256 `6a1e59f7c0e8396115657c6376dabeb3fa07543ac8a7036ee3003af6a415aad6`) and Arabic (`A2026058.pdf`, SHA-256 `b1f68aa2794b751b8234a8ff5f9c2dfc1479b996dced2620e9b6f254cf6a889c`)** verified all 404 rows, corrected 78 off-by-one `printed_page` attributions (`0532..0561` p. 12, `1327..1353` p. 16, `1432..1442` p. 18, `2648..2663` p. 20, `6601..6608` p. 23), and resolved all 5 prior transcription/text-capture variants (`6714` prints `Cheniguel` / `شنيقل`; `6719` prints `El Ouinet` / `العوينات`; `0560` prints `Boulhilat` / `بولهيلات` on p. 12; `1320` prints `Fellaoucène` / `فلاوسن` AR p. 14; `2830` prints ASCII `Dehahna` / `الدهاهنة`), plus diacritics/spacing on seats `1330 Arbouz` and `2656 Zoudj El Beïda`. As a result, all 404/404 JO58 French rows join to candidate rows under label normalization while preserving both Arabic/French source variants and [the exceptions audit log](P1-01-JO58-NAME-RECONCILIATION-EXCEPTIONS.csv). Practitioner sign-off and legal effective-date adjudication remain **pending**.

## 6. Critical limitations — this workpaper is not the final legal concordance

1. Law 26-06 JO25 official PDFs (`F2026025.pdf`, SHA-256 `f6d7f5261e997e490d54a1a061648a5635d3263e1f19aed50e5cd1e5ad01e46f`; `A2026025.pdf`, SHA-256 `e21760367ac5ccf4bacc155873560460fddf5502c32af685aad459507ae48e87`) and JO58 official PDFs are retrieved and hashed, and JO58 printed pp. 9–25 are visually inspected in both languages; however, a formal row-by-row Arabic-to-French legal identity certification across all 1,541 rows still awaits practitioner sign-off.
2. The JO58 404-row extract now records the verified `F2026058.pdf` SHA-256 and visual PNG review status across both languages, while `effective_date` and `practitioner_review_status` remain deliberately `PENDING`.
3. Completing the 404-row visual & SHA-256 verification resolves prior PDF extraction defects, not legal acceptance of the full national register.
4. The inherited 48-Wilaya register rows (1,137 candidate rows) require a full row-level join against JO44/1985 and all intervening register amendments, including JO11/1986, JO23/1998 and JO79/2021, plus any additional amendments identified by exhaustive legal search.
5. The full amendment inventory is not yet legally certified exhaustive. Territorial composition/limits decrees (including 1992, 1993, 2006 and 2021 instruments) must remain separate from code-register amendments. Locality/mechta transfers do not themselves prove a commune code change.
6. Historical disputes remain open, including Chabet El Ameur (`JO44/1985` `3514` FR/AR and `JO23/1998` Arabic p. 13 `3514` vs. `JO23/1998` French p. 11 `3614`) and Chihani (`JO44/1985` French p. 1069 `3624` duplicate vs. `JO44/1985` Arabic p. 1635 `3614` and ONS W./C. `36/14`). No canonical correction is selected without practitioner sign-off.
7. Arabic source name variants (e.g. `الدهاهنة` vs candidate `دهاهنة`, `شهاني` vs `شحاني`), Latin transcription variants, duplicate names across different Wilayas, historical renames and source-specific ordering need row-level reconciliation.
8. A qualified Algerian legal / territorial-administration practitioner must sign the source hierarchy, code lineage, valid-time interpretation, disputed rows and final 1,541-row completeness report.

## 7. Do-not-cross boundary

- No commune records are imported into PostgreSQL or production.
- No application/API/schema/migration or Google AI Studio Cloud SQL changes are part of this evidence-only slice.
- No canonical code, effective date, Arabic spelling or historical identity is inferred where the official source does not establish it.
- Do not mark P1-01 Done and do not unblock P1-02 from this workpaper alone.

## 8. Next evidence slices

1. *(Completed — see Section 5)* All 404 JO58 table rows across printed pp. 9–25 have been visually PNG-reviewed in both French and Arabic, resolving the 5 prior extraction variants and 78 off-by-one page numbers.
2. *(Completed for retrieved corpus)* Original Arabic/French JORADP and ONS PDFs were downloaded and SHA-256 hashed (`P1-01-DISCREPANCIES-FOR-SIGNOFF.md` §6); practitioner review of the full archive remains pending.
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


## 5C. JO79/2021 — 103 historical rows in eight existing Wilayas

The separate 103-row JO79/2021 extract covers W01, W07, W08, W11, W30, W33, W39 and W47. It yields 81 exact normalized name-and-parent matches, four exact French-name matches to current candidate rows under a different parent, and 18 unresolved label/identity rows. Four exact parent/code changes are Branis 0703→6103, El Kantara 0717→6101, Aïn Zaâtout 0718→6102, and El Outaya 0719→6104. Visual inspection of both JO79 French pp. 13–16 & Arabic pp. 15–18 and JO58 French/Arabic p. 22 establishes that Arabic prints identically as `جمورة` (`0720` → `6105`), while French prints `Djemorah` (JO79) vs `Djemourah` (JO58); the French pairing remains unlinked pending practitioner sign-off.

See [the 103-row historical extract](P1-01-JO79-2021-EXISTING-WILAYAS-103-REGISTER-EXTRACT.csv), [the exceptions list](P1-01-JO79-2021-EXISTING-WILAYAS-EXCEPTIONS.csv), and [the Biskra-to-W61 transition controls](P1-01-JO79-TO-JO58-2026-BISKRA-PARENT-TRANSFER-CONTROLS.csv).

## 5D. JO79/2021 — visual verification of 59 new-Wilaya register rows

The separate [59-row JO79 new-Wilaya extract](P1-01-JO79-2021-WILAYAS-49-58-59-REGISTER-EXTRACT.csv) covers Wilayas 49–58 with these declared counts: 49:10, 50:2, 51:6, 52:10, 53:3, 54:2, 55:13, 56:2, 57:8 and 58:3. It retains 59 commune names, 59 four-digit register codes and 59 seat values as distinct fields. 42/59 rows have exact normalized French-label joins to a candidate row in the same Wilaya; 17 remain unlinked and must not be fuzzy-merged.

All 59 rows are now visually verified in both French (`F2021079.pdf`, SHA-256 `7ca010b9856fea63d4bd8c90cadaa088bbe0e9194d1e0f8edb64e507c57a984e`, printed pp. 17–19, PDF indices 16–18) and Arabic (`A2021079.pdf`, SHA-256 `288ea0da7013d8c18530a5b03c22a91cb25f40d9fe7ea7c356ecc0fc2b4433da`, printed pp. 19–22).

The Tabelbala row remains a material candidate-parent conflict: both JO79 French (p. 18) and Arabic (p. 20, `تبلبلة | 5206 | تبلبلة`) place Tabelbala in W52 with code `5206`, while the candidate row `W08-R012` is under W08. Bilingual visual verification confirms what the official pages print; qualified practitioner sign-off remains required before closing P1-01 or authorizing any import.

## 10. JO44/1985 — first bounded inherited-register tranche

The new [W31 Oran 26-row JO44/1985 source extract](P1-01-JO44-1985-W31-ORAN-TEXT-EXTRACT-26.csv) captures the French text-layer table on printed p. 1068. The source declares 26 entries; deterministic read-back confirms 26 rows, 26 unique four-digit codes, and a 31 prefix on each. Commune labels, four-digit code strings, and administrative seats remain separate fields.

This is a raw historical-source tranche, not a join to the 1,541-row candidate workpaper and not a current/effective legal concordance. The source page was not visually verified in this pass (Cache miss), the Arabic row pairing is pending, and the existing repository PDF checksum was referenced rather than recalculated. The 975-row JO44 planning tranche is therefore only partially advanced: 26 rows transcribed, 949 still outstanding, plus later-amendment, temporal, parent-lineage and practitioner review.

No commune records were imported; P1-01 remains In Progress / Pending and P1-02 remains Blocked.
## 11. JO44/1985 — W06 Bejaia 52-row source tranche

The new [W06 Bejaia 52-row extract](P1-01-JO44-1985-W06-BEJAIA-TEXT-EXTRACT-52.csv) transcribes the original-register table from the official French JO44/1985 searchable text layer: 49 rows on printed p. 1055 and 3 continuation rows on p. 1056. All 52 four-digit codes are unique and carry prefix `06`; commune, code and administrative seat are kept as independent columns.

The extract preserves source strings `Tirmzrit` (0607) and seat `T rouna` (0650) pending image/bilingual verification. The relevant page-image requests returned `Cache miss`; Arabic pairing is not established. The existing PDF checksum is referenced from the repository inventory rather than recomputed. No candidate join, current code/effective date, parent lineage, later-amendment conclusion or legal approval is asserted.

With the W31 Oran extract, 78/975 planned JO44 rows are now transcribed; 897 remain, subject to full national row-count reconciliation. P1-01 remains In Progress / Pending, P1-02 remains Blocked, and no commune rows are imported.

## 12. JO44/1985 — three additional original-register sections (109 rows)

Added [W02 Chlef (35)](P1-01-JO44-1985-W02-CHLEF-TEXT-EXTRACT-35.csv), [W04 Oum El Bouaghi (29)](P1-01-JO44-1985-W04-OUM-EL-BOUAGHI-TEXT-EXTRACT-29.csv), and [W10 Bouira (45)](P1-01-JO44-1985-W10-BOUIRA-TEXT-EXTRACT-45.csv), extracted from the official French searchable text layer on printed pp. 1053, 1054 and 1057 respectively. The source declares 35, 29 and 45 entries; codes span 0201–0235, 0401–0429 and 1001–1045. Each CSV retains separate source commune, register code and seat fields with provenance/evidence status.

These rows are not image-verified, not Arabic-paired, not joined to candidate identities and not adjudicated for current validity, effective dates, parent history or later register amendments. `Labi od Medjadja` (W02 code 0228) is preserved verbatim from the text layer and remains a source-string anomaly, not a canonical label.

Together with W31 Oran (26) and W06 Bejaia (52), the bounded JO44 extracts total 187/975 planned rows; 788 remain, subject to full national row-count reconciliation. P1-01 remains In Progress / Pending; P1-02 remains Blocked; no commune data is imported.

## 13. JO44/1985 — three further original-register sections (106 rows)

Added [W03 Laghouat (24)](P1-01-JO44-1985-W03-LAGHOUAT-TEXT-EXTRACT-24.csv), [W05 Batna (61)](P1-01-JO44-1985-W05-BATNA-TEXT-EXTRACT-61.csv), and [W08 Bechar (21)](P1-01-JO44-1985-W08-BECHAR-TEXT-EXTRACT-21.csv), extracted from the official French JO44/1985 searchable text layer on printed pp.1053–1054, pp.1054–1055 and p.1056, respectively. The official table declares 24, 61 and 21 entries; codes span 0301–0324, 0501–0561 and 0801–0821.

Each 24-column CSV retains commune name, register code and administrative seat separately, with row-level source page and evidence status. Apparent Batna text-layer strings `Legride t` (0518) and `Boulh...iat` / `Boulh...at` (0560) are preserved verbatim for visual/Arabic verification.

These rows are not visually page-verified, not Arabic-row-paired, not joined to candidate identities, and not adjudicated for current validity, effective dates, parent lineage or later amendment effects. They remain historical source assertions only.

Together with W31 Oran (26), W06 Bejaia (52), W02 Chlef (35), W04 Oum El Bouaghi (29) and W10 Bouira (45), bounded JO44 extracts now total 293/975 planned rows; 682 remain subject to full national reconciliation. P1-01 stays In Progress / Pending; P1-02 stays Blocked; no commune records are imported.

## 14. JO44/1985 — three additional original-register sections (67 rows)

Added [W09 Blida (29)](P1-01-JO44-1985-W09-BLIDA-TEXT-EXTRACT-29.csv), [W11 Tamanghasset (10)](P1-01-JO44-1985-W11-TAMANGHASSET-TEXT-EXTRACT-10.csv), and [W12 Tebessa (28)](P1-01-JO44-1985-W12-TEBESSA-TEXT-EXTRACT-28.csv), extracted from the official French JO44/1985 searchable text layer on printed pp.1057–1058, p.1058 and p.1058, respectively. Codes span 0901–0929, 1101–1110 and 1201–1228.

Each 24-column CSV stores commune, code and seat separately and includes the printed page per row. W09 has 13 rows on p.1057 and 16 on p.1058; the other two sections are on p.1058. Distinct seat strings such as `Ben Chabane` (for Ben Khellil) and `Larbaa` (for Larbaâ) are retained literally.

These sections are not visually page-verified or Arabic-row-paired. They are not candidate-joined or adjudicated for current-validity/effective dates, parent lineage or later amendment effects. The PDF SHA is reused from the repository inventory, not recomputed.

Together with the eight earlier sections, bounded JO44 text extraction would total 360/975 planned rows; 615 remain subject to national row-count reconciliation. This branch remains a source-evidence proposal until PR CI and merge.
