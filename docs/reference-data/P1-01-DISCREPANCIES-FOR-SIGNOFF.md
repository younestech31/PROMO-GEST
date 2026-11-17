# P1-01 — Legal Provenance and Discrepancy Sign-off Pack

**Prepared:** 17 November 2026  
**Phase / priority:** Phase 1 / P1  
**Operational task:** P1-01 — official-source audit for the 1,541-commune administrative reference  
**Status:** REVIEW PACK PREPARED — NOT LEGALLY APPROVED  
**Current technical boundary:** no commune records imported; `communesCount = 0`; API state remains `PendingOfficialVerification`.

## 1. Decision requested from the qualified reviewer

Review and sign a dated decision on the legal source chain and disputed source assertions below. The proposed candidate `3514` for Chabet El Ameur is not approved by this pack. The reviewer must explicitly decide whether the later French JO No. 23/1998 entry `3614` is a printing/transcription error or a valid later code, after examining the original Arabic and French page images and the applicable instruments.

The reviewer must also confirm:
- the complete list of register amendment instruments and effective dates to apply to the 1,541-row baseline;
- the exact Arabic/French commune-label pairings;
- the distinction between commune labels, four-digit register codes and administrative seats;
- source-row identities and parent-Wilaya relationships, including any historical transfers;
- whether any intervening instruments not yet inventoried must be applied.

This is an evidence pack for review, not legal advice and not a substitute for the reviewer's professional judgment.

## 2. What is established at text-extraction level

1. Law No. 26-06, JO No. 25 dated 5 April 2026, establishes the 69-Wilaya / 1,541-commune national baseline and revised legal parent composition.
2. Decree No. 26-206, JO No. 40 dated 3 June 2026, identifies new Wilaya names and seats for codes 59–69. Decree No. 26-208 addresses assets/liabilities transition and must not be treated as proof that every local service or registry has transferred.
3. Decree No. 85-20 establishes the `Répertoire des collectivités territoriales` and the legal code structure. The initial register annex was published through the interministerial order of 22 June 1985 in JO No. 44 dated 23 October 1985.
4. The French JO No. 58/2026 text states that the 5 May 2026 order modifies and completes the 1985 register annex. The JO58 annex shows three separate columns: communes, register codes, and seats.
5. JO58 declares 296 commune entries across ten affected existing-Wilaya sections and 108 entries across the eleven new-Wilaya sections, for 404 entries in 21 sections. The remaining 48 Wilayas are represented as unchanged. This is a delta scope count, not a full 1,541-row register.
6. The 8 February 1986 order in JO No. 11/1986 is an identified amendment to the 1985 register. Its extracted annex lists four commune/code/seat rows.
7. The 21 March 1998 order in JO No. 23/1998 updates the Grand-Alger Governorate and Wilayas of Blida, Boumerdès and Tipaza. The French Boumerdès section on printed page 11 lists Chabet El Ameur as `3614`.
8. The official school-establishment annexes in JO No. 49/1996 include Chabet El Ameur under Boumerdès code `3514` (printed pages 9 and 15 in the French text layer). These are independent official cross-checks, not territorial-register amendments.

## 3. Chabet El Ameur — discrepancy for decision

| Source | Extracted statement | Evidentiary role |
|---|---|---|
| Initial register, order 22 June 1985, JO No. 44, printed p. 1069, French | Chabet El Ameur — `3514` | Direct assertion in the initial territorial-register annex |
| School-establishment directory, JO No. 49/1996, printed p. 15, French | Boumerdès (35), Chabet El Ameur — `3514` | Official corroborating cross-check; not a register amendment |
| Register amendment, order 21 March 1998, JO No. 23, printed p. 11, French | Chabet El Ameur — `3614` | Direct conflicting assertion in a later register amendment |

**Current proposed treatment:** preserve both official source assertions verbatim. Treat `3514` as the stronger candidate because it appears in the original register and the 1996 official directory; do not make it canonical until the qualified reviewer accepts the full legal chain and verifies the 1998 Arabic and French page images.

**Updated extraction and cross-check caveat:** the JO No. 44/1985 text layer returns `Chihani 3624` and `Raml Souk 3624`. The ONS *Code Géographique National* text layer shows Chihani as W.=36/C.=14 (derived 3614) and Raml Souk as W.=36/C.=24 (derived 3624), consistent with the owner's separately reported visual reading of Chihani as 3614. This suggests a JO44 extraction/order anomaly, but it does not prove what the original page image shows. The ONS file itself has a material edition-date conflict: its cover says `JUIN 2021`, while its introduction cites an order dated 12 September 2021. Its pages 49–50 were not visually reviewed and the exact PDF bytes/hash are unavailable. Do not claim the primary image has been resolved, and do not treat the ONS cross-check as a legal amendment.

Local or operational lists that sequentially renumber Boumerdès communes and show Chabet El Ameur as `3513` are not accepted as the territorial-register code. The 1985 text layer assigns `3513` to Tidjelabine and `3514` to Chabet El Ameur.

### Additional official code cross-check — ONS table (qualified)

The ONS *Code Géographique National* text layer lists:
- Boumerdès: `CHAABET EL AMEUR`, W.=35, C.=14 (derived 3514), Arabic `شعبة العامر`, printed p. 49;
- El Tarf: `CHIHANI`, W.=36, C.=14 (derived 3614), Arabic `شحاني`, printed p. 50;
- El Tarf: `RAML SOUK`, W.=36, C.=24 (derived 3624), Arabic `رمل السوق`, printed p. 50.

The W./C. composition follows Article 3 of Decree 85-20. This later official table supports 3514 for Chabet and the owner's reported 3614 reading for Chihani, and distinguishes Raml Souk as 3624. It remains a cross-check, not a register amendment. Its cover is dated June 2021 while its introduction cites the 12 September 2021 register order; resolve this publication/version-date conflict. The ONS page images and exact PDF hash remain outstanding. Full evidence and row-by-row treatment are in `P1-01-CODE-LINEAGE-CROSSCHECKS.md` and `.csv`.

## 4. JO58 — table scope and parsing risk

The French JO58 text layer exposes these affected existing-Wilaya sections:

| Wilaya code | Count |
|---:|---:|
| 03 | 12 |
| 05 | 53 |
| 07 | 22 |
| 12 | 24 |
| 13 | 49 |
| 14 | 36 |
| 17 | 18 |
| 26 | 43 |
| 28 | 24 |
| 32 | 15 |
| **Total** | **296** |

The eleven new Wilayas 59–69 contain 108 declared entries. Combined printed entries: 404. This count does not include unchanged tables as rows and does not complete the national crosswalk.

The source schema requires three independent fields:
- `commune_name_source`
- `legal_register_code_source`
- `administrative_seat_source`

Never merge the seat into the commune-name or alias field. Examples in the French text layer include:
- Oued M’Zi, code 5911 → seat Madna El Grada;
- Abdelkader Azil, code 6003 → seat Layadate;
- Djezzar, code 6006 → seat Merabtine;
- Gourrigueur, code 1216 → seat Satha;
- Djouab, code 2637 → seat Nacerddine;
- Arbaouat, code 3209 → seat Arba Fougani.

The supplied audit reports that a local `pdftotext` run can reverse apparent column order on JO58 printed page 22 between the Barika and Bir El Ater tables. This exact local parser output has not been independently reproduced in this audit. The JORADP text-layer rendering reviewed here associates `El Ogla El Melha / 6203 / Ain Zeguig` in that order. No fixed regex based only on extracted positional order is approved. Inspect the page image and preserve table coordinates/cell positions.

Arabic JO58 pages 21–25 need direct image inspection due reported legacy-font mapping and broken line order. No Arabic JO58 row is marked visually verified.

## 5. Source chain to complete

| Instrument | Known publication | Work required |
|---|---|---|
| Decree 85-20 (2 Feb 1985) | JO No. 06, 3 Feb 1985 | Confirm articles governing codes and update semantics from both editions |
| Order 22 June 1985 | JO No. 44, 23 Oct 1985, pp. 1052–1073 | Extract full initial register and verify visual table layout |
| Order 8 Feb 1986 | JO No. 11, 12 Mar 1986, p. 280 | Apply four listed register changes and retain old assertions |
| Order 21 Mar 1998 | JO No. 23, 19 Apr 1998, pp. 9–11 | Reconcile Grand-Alger / Blida / Boumerdès / Tipaza; verify Arabic JO23 table |
| Order 12 Sep 2021 | JO No. 79, 17 Oct 2021 | Reconcile codes 49–58 and all affected parent-Wilaya tables; inventory unchanged references |
| Law 26-06 | JO No. 25, 5 Apr 2026 | Establish legal parent composition and the 69/1,541 baseline |
| Decree 26-206 | JO No. 40, 3 Jun 2026 | Establish Wilaya 59–69 names and seats |
| Decree 26-208 | JO No. 40, 3 Jun 2026 | Keep asset/liability transition distinct from legal hierarchy and operational authority |
| Order 5 May 2026 | JO No. 58, 12 Aug 2026 | Apply 404 printed updates and unchanged references; visually inspect pp. 9–25 in both languages |

The reviewed archive search did not identify a 1996 amendment to the territorial register. The JO No. 49/1996 school-directory reference is not such an amendment. Do not treat the absence of a 1996 register amendment in the current search as an exhaustive negative legal opinion. Determine whether any reference to “1996” in prior project notes is a mistaken year for the 1986 order or points to another instrument.

Potential additional instruments listed in prior project research (including local boundary/name amendments) still need a complete authoritative inventory and a decision on whether they change this register’s row identity, code, parent, name, or seat.

## 6. Visual inspection protocol

Complete and record each of the following:
- JO58/2026 French edition, printed pages 9–25;
- JO58/2026 Arabic edition, printed pages 9–25;
- JO23/1998 French edition, printed page 11;
- JO23/1998 Arabic edition, printed page 11;
- JO44/1985 French and Arabic pages around the Boumerdès and El Tarf register tables, especially the Chabet El Ameur / Chihani entries.

For each inspection, record source URL, edition/language, JO issue, printed page, PDF page index, commune row, code cell, seat cell, reviewer, date, and screenshot/crop hash. Keep the original source PDF bytes immutable. Compute SHA-256 from the exact downloaded original PDF bytes; no hash is entered in this pack because the source binaries were not available in the working runtime when this pack was prepared.

## 7. Required output before P1-01 can be closed

- A complete 1,541-row concordance covering all 69 Wilayas, not a partial delta file and not a public GitHub dataset treated as legal authority.
- For every row: source instrument, JO issue/date, printed page, source language, commune label, four-digit code, seat where specified, parent Wilaya, effective interval, extraction method, source hash and review status.
- A versioned alias table preserving each verbatim source variant separately from any canonical label.
- Reconciliation checks for duplicates, omissions, conflicting codes, parent changes and effective-date overlaps.
- An immutable source archive and reproducible import manifest with SHA-256 hashes.
- A signed qualified Algerian legal/practitioner decision for every material open discrepancy, including Chabet El Ameur.
- A release/rollback plan before any future database or application import.

## 8. Reviewer decision record

**Reviewer full name:** __________________________________________

**Professional qualification / capacity:** ___________________________

**Organization / bar / professional body (if applicable):** _____________

**Documents and editions reviewed:** ______________________________

**Chabet El Ameur decision:**  
[ ] 3514 accepted as the applicable canonical code  
[ ] 3614 accepted as the applicable canonical code  
[ ] Other / requires further instrument: ___________________________

**Reasoned basis and effective date:**  
________________________________________________________________  
________________________________________________________________

**Other unresolved reservations:**  
________________________________________________________________  
________________________________________________________________

**Decision date:** ___________________  **Signature / stamp:** ___________________

## 9. PROMO GEST implementation boundary

This pack does not authorize commune import or code changes. Keep the existing 69-Wilaya catalogue only; maintain `communesCount = 0` and `PendingOfficialVerification`. P1-01 remains In Progress / Pending. P1-02 remains Blocked until the complete concordance and qualified sign-off are accepted. No schema, migration, application code, production data, or Google AI Studio Cloud SQL data is changed by this pack.
