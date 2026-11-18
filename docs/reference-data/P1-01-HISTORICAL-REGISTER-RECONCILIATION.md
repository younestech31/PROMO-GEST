# P1-01 — Historical register reconciliation checkpoint (1985–2021)

**Prepared:** 18 November 2026  
**State:** PARTIAL SOURCE RECONCILIATION — NOT LEGALLY APPROVED  
**Scope of this slice:** JO11/1986 four-row amendment; JO79/2021 register rows for newly created Wilayas 49–58; candidate distribution controls and unresolved label/parent discrepancies.

## 1. Source hierarchy and legally distinct layers

- **Decree No. 85-20 (2 February 1985):** creates the territorial register and defines the four-digit commune-code structure and transfer rules. Article 3 says the first two digits identify the Wilaya and the last two the commune; Article 4 requires a new code when a commune is transferred to another Wilaya and does not reallocate an old code. Official French PDF: https://www.joradp.dz/FTP/jo-francais/1985/F1985006.PDF.
- **Interministerial order 22 June 1985, JO 44, published 23 October 1985:** initial 48-Wilaya commune/code/seat register. Full French PDF: https://www.joradp.dz/FTP/jo-francais/1985/F1985044.PDF. The original table is available in the official PDF text layer, but page screenshots for the relevant annex could not be fetched in this review; no source row is called visually verified here.
- **Interministerial order 8 February 1986, JO 11, published 12 March 1986:** Article 1 expressly replaces four register rows in the annex of the 22 June 1985 order. Official French PDF: https://www.joradp.dz/FTP/jo-francais/1986/F1986011.PDF.
- **Interministerial order 21 March 1998, JO 23, published 19 April 1998:** modifies the 1985 register for the Grand-Alger Governorate and Wilayas 09, 35 and 42. Official French PDF: https://www.joradp.dz/FTP/jo-francais/1998/F1998023.PDF. It directly prints Chabet El Ameur = 3614 in the Boumerdès (35) table; preserve the prefix conflict.
- **Interministerial order 12 September 2021, JO 79, published 17 October 2021:** modifies and completes the 1985 register. It explicitly publishes all entries for new Wilayas 49–58 and updates tables for eight pre-existing Wilayas (01, 07, 08, 11, 30, 33, 39, 47), while several other Wilaya sections are declared unchanged. Official French PDF: https://www.joradp.dz/FTP/jo-francais/2021/F2021079.pdf.
- **Law 26-06 / JO 25 (2026) and JO 58/2026:** change the legal composition for 21 Wilaya sections and print the 404-row register delta already documented in the current 404-row extract. JO58 supersedes prior row assertions for those 21 affected sections, not for the 48 other sections.

**Do not collapse these source families:** amendments to the 1984 territorial-composition framework and seat-setting orders can affect locality composition or seats without themselves establishing a four-digit register-code change. The 1992/1993/2006/2021 territorial-composition instruments in the separate amendment inventory remain distinct from the Decree 85-20 register chain.

## 2. JO11/1986 — four direct register replacement assertions

The official French text of JO11/1986 prints the following rows, with three independent fields:

| Wilaya | Commune as printed | Code | Seat as printed | JO page |
|---:|---|---:|---|---:|
| 24 | Aïn Sandel | 2407 | Aïn Souda | 280 |
| 26 | Bir Ben Laabed | 2656 | Zoudj El Beida | 280 |
| 34 | Haraza | 3434 | Fédala | 281 |
| 39 | Béni Guécha | 3919 | Béni Guécha | 281 |

The amendment is dated 8 February 1986 and published in JO No. 11 on 12 March 1986. It also cites the order of 13 May 1985 modifying the annex of the 2 June 1984 order that set commune chief-lieu seats. This citation establishes the prior instrument's existence and subject; the exact standalone JO publication of that 13 May 1985 order has not yet been located. The 1986 page images and Arabic-edition rows remain unverified because the screenshot / Arabic PDF fetches returned Cache miss or were inaccessible.

Two JO11 labels do not exactly join to the pinned 1,541-row candidate text: “Bir Ben Laabed” vs candidate “Bir Ben Abed”, and “Béni Guécha” vs “Ben Guecha”. They remain in the historical exceptions file and are not fuzzy-linked. Aïn Sandel and Haraza join by normalized French label only; this workpaper join is not legal-identity sign-off.

## 3. JO79/2021 — newly created Wilayas 49–58

The official JO79 annex declares the following ten Wilayas and 59 commune rows:

| Wilaya | Official name | JO79 declared communes | Candidate rows in same Wilaya | Exact normalized French joins |
|---:|---|---:|---:|---:|
| 49 | Timimoun | 10 | 10 | 9 |
| 50 | Bordj Badji Mokhtar | 2 | 2 | 2 |
| 51 | Ouled Djellal | 6 | 6 | 5 |
| 52 | Béni Abbès | 10 | 9 | 9 |
| 53 | In Salah | 3 | 3 | 0 |
| 54 | In Guezzam | 2 | 2 | 0 |
| 55 | Touggourt | 13 | 13 | 9 |
| 56 | Djanet | 2 | 2 | 1 |
| 57 | El Meghaier | 8 | 8 | 5 |
| 58 | El Meniaâ | 3 | 3 | 2 |
| **Total** | 10 new Wilayas | **59** | **58** | **42** |

The new-Wilaya extract keeps commune name, four-digit register code and administrative seat in separate columns. The source text layer contains 59 rows; 42 join by exact normalized French label to a same-Wilaya candidate row. Seventeen source rows remain unlinked due to label variation or a missing same-Wilaya candidate row. The 59 JO79/2021 new-Wilaya rows are spread over printed pages 17–19: Wilayas 49–51 on p.17, 52–54 on p.18, and 55–58 on p.19. All 59 rows were visually checked against the official French PDF page images, with commune, register-code and seat columns read separately. The row-level extract now records PDF page indices 16–18 and corrects the printed-page attribution for Wilayas 55 and 56 from 18 to 19. This is French-edition visual verification only; Arabic row pairing and exact PDF SHA-256 remain pending.

### 3.1 Confirmed parent-Wilaya candidate discrepancy: Tabelbala

JO79/2021 lists **Tabelbala** in Wilaya **52** (Béni Abbès), code **5206**, seat **Tabelbala**. The pinned third-party candidate file contains a row labelled Tabelbala, but assigns it to Wilaya **08** (Béchar), candidate key `W08-R012`. It does not have a Tabelbala row in candidate Wilaya 52, which has 9 candidate rows versus the 10 rows declared by JO79. Candidate Wilaya 08 has 12 rows while JO79's Béchar section declares 11. This reciprocal 1-row count difference is consistent with the explicit JO79 source assignment; it is a blocking parent mismatch in the candidate dataset, not a basis for automatic migration. Preserve the candidate row as found, preserve the JO79 assertion 52/5206 separately, and do not change project IDs or source parents without the full temporal lineage, dependent-record impact and practitioner review.

### 3.2 Candidate name variants

Other JO79 text strings that do not exactly match the candidate source include (among others) Ksar Keddour/Ksar Kaddour, Ras El Miaâd/Ras El Miad, In Ghar/Inghar, Foggaret Ezzaouia/Foggaret Ezzoua, Tin Zaouatine/Tin Zouatine, Blidat Ameur/Blidet Amor, Tamacine/Temacine, M’Naguar/M'naguer, El Allia/El Alia, Bordj El Haouasse/Bordj El Haouass, El Meghaier/El-M'ghaier, Tendla/Tenedla and Oum Toyour/Oum Touyour. The exceptions CSV records each source value and any candidate possibility without auto-linking. This list is not an adjudicated alias list.

## 4. Correct split of the 1,137 rows outside the JO58 delta

The 1,137 candidate rows not in the 404 JO58 2026 delta are not all “1985 unchanged rows”. The current source chain divides them by evidence family:

- **59** official register entries for Wilayas 49–58 from JO79/2021 (the candidate text currently has 58 in those ten Wilayas; Tabelbala is the proven parent mismatch).
- **76** entries in seven pre-existing Wilaya tables re-published by JO79/2021 and not later changed in the 2026 JO58 delta (Wilayas 01, 08, 11, 30, 33, 39, 47).
- **27** entries in the JO79/2021 Biskra table are historical evidence for 2021; Biskra is among the JO58/2026 affected existing-Wilaya sections, so the JO58 2026 rows supersede that 2021 table for current register values.
- The remaining **975** rows across the other 30 original Wilayas need the initial JO44/1985 register plus any applicable 1986, 1998 and other verified amendments, with row-level source and bilingual reconciliation. Some of these Wilayas also have territorial-composition or seat instruments that must be handled separately from register-code changes.

These buckets sum to 1,137 (59 + 76 + 27 + 975). This is a source-coverage plan, not yet a certified final-code count.

## 5. Historical code conflicts still open

- **Chabet El Ameur:** JO44/1985 French text layer prints 3514 in Boumerdès; JO23/1998 French text layer prints 3614 in the Boumerdès (35) table, creating a direct source conflict and a code-prefix inconsistency. ONS 2008/2021 geographic references support 35/14 => 3514, but are corroborating sources, not register amendments. No canonical correction is selected.
- **Chihani:** JO44/1985 French text layer prints 3624 for Chihani and also prints 3624 for Raml Souk in the same El Tarf annex. ONS 2008/2021 W./C. cross-checks give Chihani 36/14 => 3614 and Raml Souk 36/24 => 3624. Treat the duplicate JO44 text-layer observation as unresolved, not a visually confirmed typo. No canonical correction is selected.
- **Béni Guécha:** JO44/1985 list and JO11/1986 amendment are separate assertions; JO11/1986 sets seat Béni Guécha for code 3919; JO79/2021 subsequently lists the commune as Beni Guecha / 3919. Candidate text “Ben Guecha” is a source-label variant, not a basis for changing the identity.

## 6. Current status and import boundary

- P1-01 remains **In Progress / Pending** until all 1,541 source rows, exact source binaries/checksums, bilingual pairings, effective-dated relationships, open discrepancy adjudication and qualified Algerian practitioner approval are complete.
- P1-02 remains **Blocked**.
- No commune records are imported; no database schema, production data or Google AI Studio Cloud SQL data is changed.
- Page-image review for JO44/1985 and JO11/1986 remains pending. JO79/2021 French printed pages 17–19 are now visually checked for all 59 new-Wilaya rows; the 103-row existing-Wilaya extract on printed pages 13–16 remains text-layer-only. Arabic row pairing for both JO79 extracts remains pending.
