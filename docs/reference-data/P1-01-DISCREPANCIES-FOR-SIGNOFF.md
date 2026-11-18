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
| Initial register, order 22 June 1985, JO No. 44, printed p. 1069 (FR) / p. 1634 (AR) | FR `Chabet El Ameur` — `3514`; AR `شعبة العامر` — `3514` | Direct assertion in initial territorial-register annex (visually verified in FR & AR PNG page scans) |
| School-establishment directory, JO No. 49/1996, printed p. 15, French | Boumerdès (35), Chabet El Ameur — `3514` | Official corroborating cross-check; not a register amendment |
| Register amendment, order 21 March 1998, JO No. 23, printed p. 13 (AR) vs p. 11 (FR) | AR `شعبة العامر` — `3514`; FR `Chabet El Ameur` — `3614` (between 3513 and 3515) | Direct intra-issue bilingual discrepancy in a later register amendment (visually verified in both FR & AR PNG page scans) |

**Current proposed treatment:** preserve both official source assertions verbatim. Visually inspected bilingual JO23/1998 PNG scans show that the Arabic edition (`A1998023.PDF`, printed p. 13) literally prints `شعبة العامر | 3514 | شعبة العامر` under Boumerdès (`35`), whereas the French edition (`F1998023.PDF`, printed p. 11) prints `3614` between `3513` and `3515`. Together with JO44/1985 (`3514` FR & AR), JO49/1996 (`3514`), and ONS 2008/2021 (`35`/`14`), `3514` is strongly supported, but **do not make it canonical** until the qualified practitioner signs the formal adjudication on the French vs. Arabic JO23/1998 conflict.

**Updated visual inspection finding — Chihani / Raml Souk (JO44/1985):** visual inspection of the scanned original pages resolves the source divergence between the two editions:
- `F1985044.PDF`, printed p. 1069 (PDF p. 25): the French print itself literally displays `Chihani | 3624 | Chihani` between `Dréan (3613)` and `Chebaïta Mokhtar (3615)`, duplicating `Raml Souk | 3624 | Raml Souk` at the bottom of the column. Thus `3624` in the French extraction was not an OCR error; it is printed on the French page.
- `A1985044.PDF`, printed p. 1635 (PDF p. 35): the Arabic print displays **`شهاني | 3614 | شهاني`** between `الذرعان (3613)` and `شبايطة مختار (3615)`, and `رمل السوق | 3624 | رمل السوق`. This aligns with the owner's separately reported reading of `3614` and with the ONS 2008 (`شهاني`, W=36/C=14) and ONS 2021 (`شحاني`, W=36/C=14) cross-checks.
- Preserve both the French (`3624`) and Arabic (`3614`) 1985 prints verbatim; practitioner adjudication remains required.

Local or operational lists that sequentially renumber Boumerdès communes and show Chabet El Ameur as `3513` are not accepted as the territorial-register code. Both the 1985 and 1998 French/Arabic page images assign `3513` to Tidjelabine (`تيجلبين`).

### Additional official code cross-check — ONS table (qualified)

The ONS *Code Géographique National* text layer lists:
- Boumerdès: `CHAABET EL AMEUR`, W.=35, C.=14 (derived 3514), Arabic `شعبة العامر`, printed p. 49;
- El Tarf: `CHIHANI`, W.=36, C.=14 (derived 3614), Arabic `شحاني`, printed p. 50;
- El Tarf: `RAML SOUK`, W.=36, C.=24 (derived 3624), Arabic `رمل السوق`, printed p. 50.

The W./C. composition follows Article 3 of Decree 85-20. The exact PDF bytes were retrieved and hashed (`ons_code_geo_2021.pdf`, SHA-256 `9d3a1d9f483e1a1a82924fc4e813c1a9703a720f059671d31efb7b6fd5f37fe4`), though Ghostscript page rendering hit embedded-font errors on its content streams and its cover (`JUIN 2021`) vs. introduction (`12 September 2021` order) date conflict remains open. Full evidence and row-by-row treatment are in `P1-01-CODE-LINEAGE-CROSSCHECKS.md` and `.csv`.

### Additional ONS historical cross-check — Code Géographique National 2008

The official ONS Code Géographique National accompanying the 5th General Population and Housing Census (2008) provides an independent bilingual W./C. table (`ons_code_geo_2008.pdf`, SHA-256 `5b7768f8df92cc2c16da04e8223c137bc22ad70d842fb3f1ac13ae4a7b629720`):

| Commune | Arabic printed label | W. | C. | Four-digit candidate from Article 3 | Printed page |
|---|---|---:|---:|---:|---:|
| CHAABET EL AMEUR | شعبة العامر | 35 | 14 | 3514 | 50 |
| CHIHANI | شهاني | 36 | 14 | 3614 | 51 |
| RAML SOUK | رمل سوق | 36 | 24 | 3624 | 51 |

This is official ONS geographic-reference evidence, not an amendment to the territorial register. ONS 2008 prints `شهاني` (matching the 1985 Arabic JORADP spelling), while ONS 2021 prints `شحاني`; preserve both source variants. Because embedded font streams in the ONS 2008/2021 PDFs failed Ghostscript rendering, their page images remain uninspected here and practitioner adjudication remains required.

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

The supplied audit reports that a local `pdftotext` run can reverse apparent column order on JO58 printed page 22 between the Barika and Bir El Ater tables. Direct visual inspection of rendered PNG page images for **both French (`F2026058.pdf`) and Arabic (`A2026058.pdf`) printed pages 9–25** establishes cleanly aligned 3-column tables (`COMMUNES | NUMEROS DE CODE | SIEGES` LTR in French; `البلدية | رقم البلدية | المقر` RTL in Arabic), with `El Ogla El Melha | 6203 | Ain Zeguig` (`العقلة المالحة | 6203 | عين زقيق`) on p. 22, `Djemourah | 6105 | Djemourah` (`جمورة | 6105 | جمورة`) on p. 22, `Cheniguel | 6714 | Cheniguel` (`شنيقل | 6714 | شنيقل`) and `El Ouinet | 6719 | El Ouinet` (`العوينات | 6719 | العوينات`) on p. 24, `Boulhilat | 0560 | Boulhilat` (`بولهيلات | 0560 | بولهيلات`) on p. 12, `Fellaoucène | 1320 | Mahrez` (`فلاوسن | 1320 | محرز` AR p. 14) on p. 15, and ASCII `Dehahna | 2830 | Dehahna` (`الدهاهنة | 2830 | الدهاهنة`) on p. 20. All 5 previously flagged JO58 name/page exceptions and 78 off-by-one page attributions in the workpaper extract have been corrected against the visually inspected pages.

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

## 6. Visual inspection & exact source SHA-256 record

Completed page-image PNG inspections (18 November 2026):
- **JO58/2026 French (`F2026058.pdf`) & Arabic (`A2026058.pdf`)**: all annex printed pages **9–25** visually reviewed in both editions (404 rows, 3-column alignments verified).
- **JO79/2021 French (`F2021079.pdf`, pp. 13–19) & Arabic (`A2021079.pdf`, pp. 15–22)**: visually reviewed for all 103 existing-Wilaya and 59 new-Wilaya rows (confirming e.g. `Djemorah 0720` / `جمورة`, `Beni Guecha 3919` / `بني قشة`, `Tabelbala 5206` / `تبلبلة`).
- **JO11/1986 French (`F1986011.PDF`, pp. 280–281, PDF pp. 16–17) & Arabic (`A1986011.PDF`, pp. 401–402, PDF pp. 25–26)**: visually reviewed all 4 amendment rows (`2407`, `2656`, `3434`, `3919`).
- **JO23/1998 French (`F1998023.PDF`, p. 11) & Arabic (`A1998023.PDF`, pp. 11, 13–14)**: visually reviewed Boumerdès table (`3514` Arabic vs `3614` French).
- **JO44/1985 French (`F1985044.PDF`, pp. 1065–1070, PDF pp. 21–26) & Arabic (`A1985044.PDF`, pp. 1631–1635, PDF pp. 31–35)**: visually reviewed Boumerdès, El Tarf, M'Sila, and El Oued tables (`3514` FR & AR; Chihani `3624` FR vs `3614` AR).

Exact SHA-256 checksums computed from the downloaded official PDF binaries:
- `F1984041.pdf`: `7094710ebdce9cd336c9898e5a35888cb7656831c474373959df5a5e3dbe92e3` | `A1984041.pdf`: `28ed5d373a2b8f943d10063924b5b91f045e9b66539dad6ad2c964c85ec554ec`
- `F1985006.PDF`: `402c46c62af42a222f997506cc32452dde08611baacf9a9437de7be037d60659` | `A1985006.PDF`: `afadc45a4acb13b0816bfcafdf713f71038c6b6f2f1d07a93fe0454c6b798bcc`
- `F1985044.PDF`: `bc9f42cbf3d7bb1fc576383ea8d7194d6ae7a06945003b5ede31581e9a48daf2` | `A1985044.PDF`: `a90f0306f236fea45956377b8eb5944c07f7e3b995db971edaf35fd6bff4bc59`
- `F1986011.PDF`: `49cfdbd7aafca943f3c39e33882a24e791ed7531ff251f5b627d9947d111904b` | `A1986011.PDF`: `3d26169e0094ecb115d034fbfc1ab4507910efb8916822b41247a2ca494d3072`
- `F1992082.PDF`: `f6cbbf779516a525030dde63c1f43470ed9ba6a81818dea4ca4f56301d35d4c3`
- `F1993003.pdf`: `3d2f5aebd8b59b35aa349d6803f092978bf3de661900f1c3f2569d7a28d278d3`
- `F1996049.PDF`: `45b015a90675863380fc36b864f1a25092c542d0029d4dfe724aaaceedecb7aa` | `A1996049.PDF`: `66e780a9725d9e1da4a31bfe7bb69e4c5074096c29a27ad23faa863d61f99220`
- `F1998023.PDF`: `e618f876aca7d27e7b60e0efe650343942c2b80e9c51e6425d4e223513ef5c8c` | `A1998023.PDF`: `50fb657098ac30e1ddc939483140b94fbb3a96413629898d871452d26d230362`
- `F2006049.pdf`: `30457eca5fdcb79937df35c2479373abf247f12bbaf8add685c0e7b0018b1320`
- `F2019078.pdf`: `5a31159713aa60e49a56e2fb1a22cd33c00432ddc0f3082200f84218cb22669d` | `A2019078.pdf`: `4a135bc50d460f9079ddfc361940592cbefc6406a562c81f745e1cd885464054`
- `F2021026.pdf`: `ef9be0a38a84996d9415c783b1cc568ec7be130d4fd87d06b3ae144a01bc7e9a` | `A2021026.pdf`: `50f8d7e861004e5f3f72eda872ffab0d38ff40244227907e0e891cb0fbac19d2`
- `F2021079.pdf`: `7ca010b9856fea63d4bd8c90cadaa088bbe0e9194d1e0f8edb64e507c57a984e` | `A2021079.pdf`: `288ea0da7013d8c18530a5b03c22a91cb25f40d9fe7ea7c356ecc0fc2b4433da`
- `F2026025.pdf`: `f6d7f5261e997e490d54a1a061648a5635d3263e1f19aed50e5cd1e5ad01e46f` | `A2026025.pdf`: `e21760367ac5ccf4bacc155873560460fddf5502c32af685aad459507ae48e87`
- `F2026040.pdf`: `7cc0cf26f944d20138b24f7894332f2cc4c5cba260dc2303d4ba75d8c8b8f9b0` | `A2026040.pdf`: `a4552b3ad93f79321093aef76ae3ca9733c0c63f6783a715afcd8ce13c943f6d`
- `F2026058.pdf`: `6a1e59f7c0e8396115657c6376dabeb3fa07543ac8a7036ee3003af6a415aad6` | `A2026058.pdf`: `b1f68aa2794b751b8234a8ff5f9c2dfc1479b996dced2620e9b6f254cf6a889c`
- `ons_code_geo_2008.pdf`: `5b7768f8df92cc2c16da04e8223c137bc22ad70d842fb3f1ac13ae4a7b629720`
- `ons_code_geo_2021.pdf`: `9d3a1d9f483e1a1a82924fc4e813c1a9703a720f059671d31efb7b6fd5f37fe4`

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

## 8A. Owner-directed proposed decisions — 18 November 2026

The project owner has stated in the project conversation that they are the qualified reviewer and will personally sign/approve the work. The following decision memorandum has been prepared for their signature: [P1-01 owner decision memorandum](P1-01-OWNER-DECISION-MEMORANDUM-2026-11-18.md).

- Chabet El Ameur: proposed canonical code 3514; retain French JO23/1998 printed 3614 as a translated-edition source discrepancy.
- Chihani / شهاني: proposed canonical code 3614 and Arabic label شهاني; retain French JO44/1985 printed 3624 as a translated-edition source discrepancy, and شحاني as a source-backed ONS spelling variant/alias.
- Ville d'Alger 1600: retain as a separate historical special/aggregate assertion; do not count or import it as a commune.
- Effective dates: distinguish legal publication, legal parentage, progressive transfer of administrative powers, FY2026 budget execution, assets/financial close, fee collection and litigation jurisdiction. Do not apply 2027-01-01 as a universal operational date.

**Formal signature status:** owner instruction received in chat; reviewer name, professional qualification/capacity, signature and stamp are not yet recorded in a signed artifact. Do not mark practitioner approval complete until the owner completes the signature fields in the memorandum or this section.

## 9. PROMO GEST implementation boundary

This pack does not authorize commune import or code changes. Keep the existing 69-Wilaya catalogue only; maintain `communesCount = 0` and `PendingOfficialVerification`. P1-01 remains In Progress / Pending. P1-02 remains Blocked until the complete concordance and qualified sign-off are accepted. No schema, migration, application code, production data, or Google AI Studio Cloud SQL data is changed by this pack.


## 10. JO79/2021 and JO58/2026 — dated parent/code transitions

The 2021 JO79 register and 2026 JO58 register preserve four exact normalized French-name parent/code changes:

| Commune | JO79/2021 source | JO58/2026 source |
|---|---|---|
| Branis | W07 / 0703 | W61 / 6103 |
| El Kantara | W07 / 0717 | W61 / 6101 |
| Aïn Zaâtout | W07 / 0718 | W61 / 6102 |
| El Outaya | W07 / 0719 | W61 / 6104 |

Visual inspection of both JO79/2021 (French p. 14 / Arabic p. 16) and JO58/2026 (French/Arabic p. 22) confirms that JO79 prints `Djemorah / 0720` (`جمورة / 0720`) while JO58 prints `Djemourah / 6105` (`جمورة / 6105`) — identical Arabic spelling with a one-letter French spelling shift (`o` → `ou`). Keep the French pair formally unlinked until practitioner sign-off approves the dated transition/alias. Preserve all old and new assertions as dated records; do not overwrite a commune's current parent/code.

A separate blocking parent discrepancy remains for Tabelbala: both JO79/2021 French (p. 18) and Arabic (p. 20, `تبلبلة | 5206 | تبلبلة`) place it in W52 with code `5206`, while the pinned candidate list places the label under W08 (`W08-R012`). No automatic re-parenting is authorized.

The JO79/2021 existing-Wilaya extract covers 103 source rows: 81 exact name-and-parent candidate links, four exact French-name parent-difference links, and 18 unresolved source-label rows. Both French (pp. 13–16) and Arabic (pp. 15–18) page scans for all 103 existing-Wilaya rows have now been visually inspected; practitioner adjudication remains pending.
