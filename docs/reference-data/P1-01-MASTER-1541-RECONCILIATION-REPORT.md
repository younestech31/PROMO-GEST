# P1-01 — Master 1,541-Commune Legal Verification & Bilingual Audit Report

**Status:** `PENDING_PRACTITIONER_SIGNOFF` (`P1-01` **In Progress**; `P1-02` **Blocked**)  
**Database / Runtime Guardrail:** `communesCount = 0`, `PendingOfficialVerification` unchanged; no unapproved candidate data imported into PostgreSQL or application code.  
**Audit Date:** 2026-11-20  
**Companion Ledger:** `docs/reference-data/P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv` (**1,541** rows with unique candidate row keys and JO44 assertion IDs; all proposals remain unapproved)  
**Automated CI Checks:** `scripts/validate-p1-01-master-ledger.py`, `scripts/validate-p1-01-jo44-arabic-page-images.py`, `scripts/p1_01_decision_book.py`, and `scripts/test_p1_01_decision_book.py` (structural/source linkage and review-workbook integrity only; not legal approval).


## Official 2026 territorial count and bilingual electoral cross-check — 22 November 2026

### Primary statutory source — JO25/2026, Law 26-06

The official Journal Officiel No.25 dated **5 April 2026** publishes Law **26-06 of 4 April 2026**, amending Law 84-09 on the territorial organization of the country. Article 3, printed page 4, states explicitly:

> Le nouveau découpage territorial du pays comprend soixante-neuf (69) wilayas et mille cinq cent quarante-et-une (1541) communes.

The same rule is present in the Arabic edition as المادة 3 on printed page 4. Both official page-4 images were visually inspected in this audit.

- French official PDF: https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf
- Arabic official PDF: https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf

**Legal interpretation:** JO25/2026, Law 26-06, Article 3 is the direct statutory authority for the national total of **69 wilayas / 1,541 communes**. Its amended Articles 7, 9, 11, 16, 17, 18, 21, 30, 32 and 36 provide specific territorial groupings of communes that must be read in context with the retained parts of Law 84-09.

### Supplementary electoral source — JO61/2026, Executive Decree 26-282

The official Journal Officiel No.61 is dated **26 August 2026** and publishes Executive Decree **26-282 of 24 August 2026**. Article 1, printed page 3, says the decree determines electoral constituencies and seats for the Assemblées populaires communales (APC) and Assemblées populaires de wilayas (APW) under Annexes I and II.

- Annex I, printed page 4 onward, numbers the APW electoral constituencies **01–69**, with a total of **2,855 APW seats**.
- Annex II, beginning on printed page 5, lists APC electoral constituencies and seat allocations grouped by wilaya headings **01–69**, ending with Wilaya 69 — El Abiodh Sidi Cheikh (printed page 34).
- Organic Law **21-01, Article 124** (JO17/2021, printed p.18) says an electoral constituency may be formed from **part of a commune, one commune, or several communes**. Decree 26-282 expressly invokes Article 124(3), together with Articles 187 and 189. Accordingly, an Annex II APC electoral-constituency row is not automatically a one-to-one legal commune row: a district may split a commune or combine several communes. Algiers also has a distinct urban-arrondissement organization. Annex II is therefore an **electoral-constituency/seat schedule**, not itself the statute establishing legal commune existence, official name, legal parent, boundary or effective date. Official JO17/2021 French source: https://www.joradp.dz/FTP/jo-francais/2021/F2021017.pdf (Article 124, printed p.18).
- The annex provides an important independent name/coverage and electoral-seat cross-check for P1-01, but its rows have **not yet been fully enumerated and reconciled** against the 1,541-row master ledger. Do not claim 1,541/1,541 row-level coverage from the 69 wilaya headings alone.

### Repository copies and binary provenance

The two user-supplied JO61 editions are currently stored under the temporary source cache `.tmp-joradp/` on GitHub `main`. The French file was added first; the Arabic commit is its child.

| Edition | Repository path | Adding commit | Git blob SHA | Bytes | PDF SHA-256 |
|---|---|---|---|---:|---|
| Arabic | `.tmp-joradp/A2026061.pdf` | `c73ede555f929054eef55e011196a78e4c724117` | `9a15a0f67398b29a44d09b7fe14fe658f8c48a5b` | 277,968 | `3af55003ac604e5197d78c1592e7db654d5851a02d317518ec14176110a92318` |
| French | `.tmp-joradp/F2026061.pdf` | `8ff19fc54740f4b2d538b3ccd254a964f5d3fd4c` | `501b0a7d846fdac81bc029d29b29e5f7b3ccc8bc` | 295,624 | `ff296821cdf6ba6bc4d4d315a27c13adf02d4a24b20f0f02202eb06b3ddd54bd` |

The SHA-256 values above were computed over the exact base64-decoded GitHub blob bytes; the SHA-256 implementation was checked against the standard `abc` test vector. GitHub reports both adding commits as signature-verified. The two PDF-only commits were added directly to `main`, rather than by PR, while branch protection was disabled; they changed no application/runtime, schema, migration or business-data files. The live `main` ref at source intake was `c73ede555f929054eef55e011196a78e4c724117`.

### Evidence boundaries and P1-01 disposition

- JO25/2026 Article 3: official Arabic and French page 4 visually inspected; legal total 69/1,541 verified.
- JO61/2026: exact repository PDF bytes and hashes recorded; text-layer extraction confirms issue number/date, Decree 26-282 and Annex I/II structure. Attempts to screenshot the GitHub PDF URLs and the available PDF text mirror returned `Cache miss`; **no JO61 page-image visual review is claimed**.
- Complete row-level bilingual extraction and parity checks for JO61 Annex II remain open under P1-35. The exact count of electoral constituency rows, uniqueness, omissions, duplicates and correspondence to the P1-01 ledger must be demonstrated before claiming a completed cross-check.
- All **1,541** master-ledger practitioner sign-offs remain `PENDING`; W30-R007 remains `NEEDS_EVIDENCE`; no `valid_from` or reviewer decision is inferred; `communesCount = 0`; no commune import is authorized; P1-01 remains In Progress / Pending and P1-02 remains Blocked.


---

> **Evidence-scope and CI clarification — 19 November 2026:** The master validator is now explicitly run by the frontend CI job. Its automated checks cover workpaper structure, unique row-key/source-ID populations, counts, decision-class partitions, preservation of flagged anomalies and pending sign-off; they do not independently prove legal identity, semantic correctness of every cross-register row pairing, visual page inspection, OCR interpretation or practitioner acceptance. In the ledger's primary_source_verification_scope, 841 rows are recorded with only JO44 French text-layer extraction and no additional primary visual scope; 27 rows carry the explicit JO44 Arabic spot-verification marker. Separately scoped JO58/JO79/JO23/JO11 visual checks cover their linked records and can overlap. Therefore this workpaper must not be described as 1,541/1,541 fully bilingual page-image verified rows. The 75 candidate Arabic anomaly flags are all routed to explicit practitioner decision; all 1,541 sign-offs remain PENDING.

> **Supplementary JO44 bilingual image-reading evidence — 20 November 2026 (PR #146):** The repository now contains `P1-01-JO44-BILINGUAL-IMAGE-READINGS-51.csv` and its Arabic guide, recording 51 bounded image-reading observations: all 21 historical Ouargla rows, all 26 Oran rows, and four priority/conflict rows (Tabelbala, Chabet El Ameur, Chihani, and Raml Souk). Arabic and French page-image locators, printed page references, commune readings and seat readings are kept separate. This is a separate supplement; it is **not** a 1,541-row bilingual transcription, not a second independent reviewer certificate, and not legal adjudication. The CI validator checks the supplement population, key/source linkage, page locators and image-file presence; it does not decide whether each human-read character is legally canonical. The older `primary_source_verification_scope` figures (841 JO44 French-text-layer-only rows and 27 rows explicitly marked JO44 Arabic spot-verification) remain the values recorded in the master ledger and are not recalculated merely by adding this sidecar.

> **Ouargla/Touggourt temporal conflict — 20 November 2026:** `P1-01-OUARGLA-TOUGGOURT-2019-2021.csv` compares all 21 historical rows. The French source lists 7 communes under Ouargla and 14 under Touggourt in JO78/2019; the JO79/2021 register lists 8 under Ouargla and 13 under Touggourt. Twenty group placements align across those endpoints; only `W30-R007` El Borma differs. Ordinance 21-03, article 2 (JO22/2021), explains that change: amended article 34 includes El Borma as Ouargla item 8 and article 52 bis 6 lists 13 Touggourt communes. Law 22-01 approves the ordinance. Its decision-book work status is `NEEDS_EVIDENCE`, proposed code remains `3021`, `valid_from` and review outcome remain empty, and the master ledger's practitioner sign-off remains `PENDING`. See `P1-01-EL-BORMA-TIMELINE.ar.md` for the distinct 2019 legal list, 2019–2020 competence transition, May 2021 daira schedule, asset/liability transition, and September 2021 register layers. No effective date is inferred.

> **Official SGG publication-rule clarification — 21 November 2026:** The 2nd edition (August 2024) of the Algerian Government Secretariat's *Guide d’Élaboration des Textes Juridiques* distinguishes Article 78(2) of the Constitution (laws and regulations are opposable only after official publication) from Article 4 of the Civil Code (which the guide describes for laws, including the one-full-day local daïra receipt/stamp rule). JO79/2021 identifies the 12 September 2021 instrument as an **interministerial arrêté**: Article 1 replaces the 1985 territorial-register annex and Article 2 orders publication; JO79 was published 17 October 2021. The guide's model for an interministerial arrêté is at printed p.92. This official guidance does not itself settle whether the Article 4 local receipt rule applies to Ordinance 21-03 for legal parentage, nor which distinct legal event `valid_from` should represent. Obtain a qualified Algerian legal determination; do not set the field or mark W30-R007 resolved from this guide alone. Source: [SGG Legal Drafting Guide, 2nd ed. (Aug 2024)](https://www.joradp.dz/TRV/F2024G02.pdf); [JO79/2021 French text](https://www.joradp.dz/FTP/jo-francais/2021/F2021079.pdf). PDF page-image capture returned `Cache miss`; this is text-layer evidence only, with no new PDF SHA-256.

> **W41 bilingual readings and historical collision controls — 20 November 2026 (PR #155):** `P1-01-JO44-W41-AND-COLLISION-CONTROLS-30.csv` contains the 26 historical W41 rows plus four cross-register controls (W14-15 Mahdia, W40-12 Djellal, W42-28 Chéraga and W42-29 Staouéli). The paired French/Arabic image locations cover printed pages 1071, 1059, 1070, 1636, 1637 and 1621; six PNG SHA-256 fingerprints are pinned by the validator (these are image hashes, not source-PDF hashes). The W41 Arabic and French printed codes agree in 24/26 rows. Two discrepancies remain explicitly preserved: historical W41-12 Merahna is French `4112` / Arabic print `4012`, and W41-15 M'Daourouche is French `4115` / Arabic print `1415`. The separate W42-29 Staouéli control preserves Arabic `4228` duplicating W42-28 Chéraga while the French print reads `4229`. The four controls are deliberately keyed to current candidate rows while retaining their historical JO44 assertion-Wilaya positions; current Wilaya identity must not be inferred from the old assertion prefix. Reading limits remain explicit for the last Arabic character in Souk Ahras and the Arabic seat reading for Haddada. The script `scripts/p1_01_w41_readings.py` and its tests verify population, row-key/source linkage, page references, six image fingerprints and preservation of code discrepancies; they do not decide canonical identity, infer a code correction or establish legal effective dates. This 26-row supplement is bounded evidence only, not full 1,541-row Arabic transcription, professional adjudication or sign-off. All 1,541 master-ledger practitioner sign-offs remain PENDING; no commune import is made.

> **ONS Code Géographique National 2008 — source-role clarification (20 November 2026):** The official ONS file [`code_geo.pdf`](https://www.ons.dz/IMG/pdf/code_geo.pdf) is headed `5ème Recensement Général de la Population et de l'Habitat — 2008` and `Code Géographique National`. Its extracted text presents the legacy 48-Wilaya codes 01–48 and bilingual commune tables with separate Wilaya (`W.`) and commune (`C.`) code components. It is therefore a valuable statistical/historical cross-check for pre-2026 commune labels and W./C. code composition, but it is **not** the current 69-Wilaya register and cannot alone establish 2026 parentage, current codes or effective dates. The PDF screenshot attempt returned `Cache miss`; the ONS observations remain text-layer-only and no source-PDF SHA-256 was captured. Pair the 2008 ONS evidence with the statutory 1985/1986/1998/2021 register lineage and the 2026 amendments; preserve disagreements verbatim for review.
>
> **JO58/2026 scope clarification:** The official issue identifies the interministerial order dated 5 May 2026 and published in JO No. 58 on 12 August 2026. Article 1 amends/completes the annex to the 22 June 1985 register order; the annex has separate commune, numeric-code and seat columns and explicit `sans changement` blocks. This is an amendment layer over the historical register, not a self-contained re-publication of all 1,541 rows. Keep signed date, publication date and legally confirmed effective-from date separate. The available French text layer is not a visual transcription; screenshot attempts for the relevant annex pages returned `Cache miss`.

> **1984-to-2026 commune-count endpoints — 20 November 2026:** ONS *Annuaire Statistique de l'Algérie* No. 35, Chapter I / Table 2, records 48 Wilayas and 1,541 communes under Law 84-09 of 4 February 1984 ([official ONS yearbook](https://www.ons.dz/IMG/pdf/territoire_2017.pdf)). Law 26-06, JO25/2026 Article 3, records 69 Wilayas and 1,541 communes ([official JORADP French PDF](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf)). The two documented endpoints therefore share the same national commune count while the Wilaya count changes from 48 to 69. Do not upgrade this endpoint comparison into a claim that every intervening administrative instrument left the total unchanged; that stronger historical claim requires the complete amendment inventory and dated source chain.

## 1. Executive Summary & Exhaustive Workpaper Linkage (1,541 / 1,541)## 1. Executive Summary & Exhaustive Workpaper Linkage (1,541 / 1,541)

This report and its companion CSV ledger (`P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv`) close the full-population reconciliation between:
1. All **1,541** historical commune entries in the 22 June 1985 founding register (**JO44/1985**, `F1985044.PDF`, 48 Wilaya sections), excluding **`1600 — Ville d'Alger`** (`P1-01-JO44-1985-W16-ALGER-1600-SPECIAL-ASSERTION.csv`), which is preserved separately as an urban-community / governorate special entry and not counted in 1,541 communes.
2. All **1,541** current candidate commune entries across **69 Wilayas** in the working crosswalk (`P1-01-WORKING-CROSSWALK-1541.csv`, derived from `islam-re/Algeria-wilayas`).

### Original French Name-Only Triage Closure
All 1,541 historical assertions from the initial unlinked French-name-only triage (`P1-01-JO44-TO-CANDIDATE-FRENCH-NAME-ONLY-COMPARISON-2026-11-19.md`) are now linked in a structurally exhaustive working ledger: 1,541 unique `jo44_assertion_id` values and 1,541 unique `working_row_key` values, with one distinct `proposed_canonical_code` field value per row. This proves population/key uniqueness, not by itself the legal correctness of every row pairing. The 1,541 distinct field values comprise 1,538 four-digit numeric proposals plus three explicit `PENDING_ADJUDICATION_*` tokens:

| Original Triage Category | Count | Disposition in Master Ledger |
| --- | ---: | --- |
| `SAME_WILAYA_967` | 967 | Audited for code continuity, intervening JO11/JO23/JO79/JO58 instruments, and Arabic parity |
| `DIFFERENT_WILAYA_149` | 149 | Verified across conserved partitions (`W01→49/50`, `W03→59`, `W05→60`, `W07→51/61`, `W08→52`, `W11→53/54`, `W12→62`, `W13→63`, `W14→64`, `W17→65/66`, `W26→67`, `W28→68`, `W30→55`, `W32→69`, `W33→56`, `W39→57`, `W47→58`, plus central `09/16/35/42` transfers); disambiguated duplicate homonyms (`El Haouita/Tadjemout`, `Khemis/Oued El Abtal`, etc.) |
| `MULTIPLE_CANDIDATE_HITS_63` | 63 | Disambiguated within Wilaya/partition groups via code lineage (`JO23`, `JO79`, `JO58`), seats, and Arabic checks (e.g., `4213 Sidi Amar → W42-R005`, `0419`, `3218`) |
| `NO_EXACT_HIT_362` | 362 | Resolved via visual PNG print fixes (`F1985044.PDF`), spacing/hyphen/apostrophe normalization, orthographic transliteration parity, JO11/JO23/JO79/JO58 code-anchored links, post-1985 rename decrees/arrêtés, and `W10` 4-way cluster analysis |
| **Total Reconciled Population** | **1,541** | **100% 1-to-1 bijection (`1,431` clean proposals + `110` explicit practitioner decision items)** |

### Cross-Register Coverage Verified
- **JO44/1985 (`F1985044.PDF` / `A1985044.PDF`):** **1,541 / 1,541** linked (`1600` kept separate).
- **JO11/1986 (`F1986011.PDF`):** **4 / 4** register deltas linked (`2407 Aïn Sandel`, `2656 Bir Ben Laabed`, `3434 Haraza`, `3919 Béni Guécha`).
- **JO23/1998 (`F1998023.PDF` / `A1998023.PDF`):** **142 / 142** Algiers/Blida/Boumerdès/Tipaza communes linked (+ `1600` Gouvernorat du Grand-Alger preserved separately; including the 14 annexations transferred to Wilaya `16` under codes `1634`–`1657`).
- **JO79/2021 (`F2021079.pdf` / `A2021079.pdf`):** **162 / 162** (`103` existing-Wilaya rows + `59` new-Wilaya W49–W58 rows) linked, including all **39** rows of `P1-01-JO79-ARABIC-EXCEPTION-RECONCILIATION.csv` transcribed verbatim from `A2021079.pdf` PNG pages 15–22.
- **JO58/2026 (`F2026058.pdf` / `A2026058.pdf`):** **404 / 404** communes across 21 Law 26-06 recomposed/new Wilaya articles linked, with **all 17 Arabic annex pages (pp. 9–25)** visually inspected on PNG renders. Page inspection does not certify independent row-by-row transcription. The 36 JO58 Arabic readings in the queue remain preliminary.

---

## 2. Primary Visual Scan Verification Findings

### 2.1 French `F1985044.PDF` Scan Corrections vs. Searchable-Text OCR Artifacts
Direct PNG inspection of `F1985044.PDF` pages proved that **18** anomalies in the JO44 CSVs were PDF OCR/text-layer artifacts while the printed 1985 Official Journal literally reads cleanly:
- **Commune names (15):** `0228` p.1053 `Labiod Medjadja` *(OCR: `Labi od Medjadja`)*; `0560` p.1055 `Boulhilat` *(OCR: `Boulh...iat`)*; `0607` p.1055 `Timzrit` *(OCR: `Tirmzrit`)*; `2830` p.1066 `Dehahna` *(OCR: `Dehanna`)*; `2946` p.1067 `Sidi Abdeldjebar` *(OCR: `Sidi Abdeljébar`)*; `3006` p.1067 `Balidat Ameur` *(OCR: `Balldat Ameur`)*; `3011` p.1067 `Sidi Khouiled` *(OCR: `Sidi Khoulled`)*; `3409` p.1068 `Bordj Ghdir` *(OCR: `Bordj Ghd(i)r`)*; `3505` p.1069 `Bordj Menaiel` *(OCR: `Bordj Menadel`)*; `4009` p.1070 `El Oueldja` *(OCR: `El Ouel dja`)*; `4103` p.1071 `Hanancha` *(OCR: `Han ancha`)*; `4119` p.1071 `Ouillen` *(OCR: `Quillen`)*; `4210` p.1071 `Aghbal` *(OCR: `Agnbal`)*; `4833` p.1074 `El Hassi` *(OCR: `El Hassl`)*; `4838` p.1074 `Ouled Sidi Mihoub` *(OCR: `Ouled Sidi M'houb`)*. *(Plus W37 p.1069 heading prints `WILAYA DE TINDOUF` with chipped `F`, OCR rendered `TINDOUE`.)*
- **Administrative seats (3):** `0518` p.1054 `Legridet` *(OCR: `Legride t`)*; `0650` p.1056 `Trouna` *(OCR: `T rouna`)*; `4110` p.1071 `Bir Louhouchi` *(OCR: `Bir Louhou chi`)*.
- *(Note: The JO44 verbatim extract CSVs checked by `validate-jo44-reference-extracts.py` are kept intact; scan corrections are recorded in `jo44_fr_visual_scan_correction`.)*

### 2.2 Arabic Primary Print Defects Discovered in `A1985044.PDF`
Visual PNG inspection of `A1985044.PDF` uncovered **5** original 1985 Arabic printing discrepancies / misprints:
1. **`4403` (`A1985044.PDF` p.1638):** Prints **`بومدفع`** (`Boumedfaa`), confirming French p.1072 `Moumedfa` was a 1985 French print/transliteration variant of `W44-R010 Boumedfaa`.
2. **`3907` (`W39-R009 Kouinine`, `A1985044.PDF` p.1636):** Prints **`كوينين`** with misprinted code **`4907`** instead of `3907`.
3. **`4112` (`W41-R021 Merahna`, `A1985044.PDF` p.1637):** Prints **`المراهنة`** with code **`4012`**; the French register prints `4112`. The code discrepancy remains pending.
4. **`4115` (`W41-R014 M'daourouche`, `A1985044.PDF` p.1637):** Prints **`مداوروش`** with misprinted code **`1415`** instead of `4115`.
5. **`4229` (`W16-R024 Staoueli`, `A1985044.PDF` p.1637):** Prints **`سطاوالي`** with misprinted duplicate code **`4228`** (duplicating `4228 Chéraga` directly above it; later assigned `1645` in `JO23/1998`).

---

## 3. Critical Candidate Dataset Arabic Corruptions Caught (`DO NOT IMPORT VERBATIM`)

Comparison against visually inspected **`A2026058.pdf` (pp. 9–25)**, **`A2021079.pdf` (pp. 15–22)**, **`A1998023.PDF` (pp. 9–14)**, and **`A1985044.PDF`** exposed **75** Candidate Arabic anomalies in `P1-01-WORKING-CROSSWALK-1541.csv` (`islam-re/Algeria-wilayas`), including **20 severe semantic/permutation corruptions** that would corrupt official database records if imported verbatim:

### 3.1 Nine-Commune Arabic Permutation Cycle in Wilaya 26 (Médéa)
In `P1-01-WORKING-CROSSWALK-1541.csv`, 9 communes of Wilaya `26` have rotated/swapped Arabic labels across rows; `A2026058.pdf` pp. 18–19 is the source cited for these nine preliminary readings:
- `W26-R025` (`2616 El Hamdania`): Candidate `الحوضان` → Preliminary JO58 AR p.18 **`الحمدانية`**
- `W26-R026` (`2601 Medea`): Candidate `مزغنة` → Preliminary JO58 AR p.18 **`المدية`**
- `W26-R029` (`2602 Ouzera`): Candidate `المدية` → Preliminary JO58 AR p.18 **`وزرة`**
- `W26-R032` (`2607 El Omaria`): Candidate `الحمدانية` → Preliminary JO58 AR p.18 **`العمارية`**
- `W26-R033` (`2624 Baata`): Candidate `وزرة` → Preliminary JO58 AR p.18 **`بعطة`**
- `W26-R035` (`2661 Sedraia`): Candidate `بعطة` → Preliminary JO58 AR p.19 **`سدراية`**
- `W26-R036` (`2611 Mezghenna`): Candidate `العمارية` → Preliminary JO58 AR p.18 **`مزغنة`**
- `W26-R040` (`2626 Sidi Naamane`): Candidate `سدراية` → Preliminary JO58 AR p.18 **`سيدي نعمان`**
- `W26-R043` (`2653 Deux Bassins`): Candidate `سيدي نعمان` → Preliminary JO58 AR p.19 **`الحوضان`**

### 3.2 Eleven Severe Arabic Corruptions / Lexical Substitutions in New Wilayas W60–W68
- `W60-R006` (`6003 Abdelkader Azil`): Candidate `عبد القادر عزيز` → Preliminary JO58 AR p.21 **`عبد القادر عزيل`**
- `W61-R004` (`6104 El Outaya`): Candidate `الوتیة` → Preliminary JO58 AR p.22 / JO79 AR p.16 **`الوطاية`**
- `W65-R005` (`6505 Sidi Ladjel`): Candidate `سيدي لخضر` → Preliminary JO58 AR p.23 **`سيدي لعجال`**
- `W65-R008` (`6506 Had Sahary`): Candidate `حاضرة` → Preliminary JO58 AR p.23 **`حد الصحاري`**
- `W67-R005` (`6706 Kef Lakhdar`): Candidate `الكاف الأحمر` *(lit. "Red" instead of "Green"!)* → Preliminary JO58 AR p.23 **`الكاف الأخضر`**
- `W67-R008` (`6705 Bouaiche`): Candidate `بوطاط` → Preliminary JO58 AR p.23 **`البواعيش`**
- `W67-R019` (`6721 Saneg`): Candidate `السناقصة` → Preliminary JO58 AR p.24 **`السانق`**
- `W68-R007` (`6808 Ouled Slimane`): Candidate `أولاد سلامة` → Preliminary JO58 AR p.24 **`أولاد سليمان`**
- `W68-R009` (`6809 El Houamed`): Candidate `الحمادين` → Preliminary JO58 AR p.25 **`الحوامد`**
- `W68-R011` (`6811 Zarzour`): Candidate `الزرق` → Preliminary JO58 AR p.25 **`الزرزور`**
- `W68-R017` (`6817 Menaa`): Candidate `مضاء` → Preliminary JO58 AR p.25 **`مناعة`**

### 3.3 Other Candidate Formatting & Orthographic Flags (55 rows)
- **Broken punctuation:** `W27-R002` (`2732 El Hassiane`) has unclosed parenthesis `الحسيان (بني ياحي`. The [Arabic JO44 image, printed p.1630](../../.tmp-joradp/jo44_ar_pdf30.png), right-hand Mostaganem table, last row, separates the commune (الحسيان) from its seat (بني ياحى); 2721 is a different commune. Do not repair the candidate by merely closing the parenthesis. This is historical evidence, not a current label approval.
- **Arabic kashida / tatweel (`ـ`) & extra whitespace:** 20 rows in `W15` + `W36-R017` (`الذرعـان`) contain Unicode tatweel characters; 7 rows contain leading or doubled spaces.
- **French label truncation/abbreviation:** `W04-R003` (`El Fedjoudj Boughrara Sa` vs `El Fedjoudj Boughrara Saoudi`), `W34-R034` (`B. B. Arreridj` vs `Bordj Bou Arréridj`).
- **Orthographic / article / `عمر` vs `عامر` variants:** Recorded in `candidate_arabic_anomaly_flag` (e.g., `W14-R006 سي` vs `سيدي`, `W32-R015` / `W42-R005` `سيدي عامر` vs `سيدي عمر`, `W63-R002 الگور` vs `القور`, `W68-R012 بودياف` vs `بوضياف`, `W53/W54/W11` `عين` vs `إن`).

---

## 4. Inter-Register Conflicts & Items Requiring Explicit Practitioner Decision (`110` Rows)

### 4.1 Hard Code & Parent Conflicts (`4` Blocking Rows)
1. **`W35-R023` — Chabet El Ameur (`3514` vs `3614`):** `JO44/1985` FR p.1069 & AR p.1634, `JO23/1998` AR p.13, `JO49/1996`, and ONS 2008/2021 all assert **`3514`** under Wilaya `35`; only `JO23/1998` FR p.11 misprinted **`3614`**. Ledger sets `PENDING_ADJUDICATION_3514_OR_3614` (recommended: `3514`).
2. **`W36-R016` — Chihani (`3614` vs `3624`) & `W36-R021` — Raml Souk (`3624`):** `JO44/1985` FR p.1069 printed `3624` for both `Chihani` (between `3613` and `3615`) and `Raml Souk` (`3624`), whereas `JO44/1985` AR p.1635 and ONS 2008/2021 both give **`3614`** for `Chihani` (`شهاني`) and **`3624`** for `Raml Souk` (`رمل السوق`). Ledger sets `PENDING_ADJUDICATION_3614_OR_3624` on `Chihani` (recommended: `3614`).
3. **`W08-R012` — Tabelbala (`5206` in Wilaya `52` vs Candidate `0812` in Wilaya `08`):** `JO79/2021` FR p.18 / AR p.20 explicitly places `Tabelbala / تبلبلة` under new Wilaya `52` (Béni Abbès) with code **`5206`**, directly conflicting with Candidate `W08-R012` under Wilaya `08` (Béchar). Ledger sets `PENDING_ADJUDICATION_5206_OR_0812` pending formal legal/parent adjudication for `P1-02`.

### 4.2 Wilaya 10 (Bouira) 4-Commune Historical Rename Cluster
Four JO44/1985 entries in conserved Wilaya `10` (`45` communes) pair via historical commune renames against four post-rename Candidate entries:
- `1008 Bezite (بزيت)` → `W10-R030 Ait Laaziz` *(JORADP administrative usage matches Bezite / Aït Laâziz)*
- `1020 El Morra (المرة)` → `W10-R010 El-Hakimia` *(JORADP administrative usage matches El Morra / El Hakimia)*
- `1043 Taourirt (تاوريرت)` → `W10-R019 Ath Mansour` *(JORADP administrative usage matches Taourirt / Ath Mansour)*
- `1044 El Madjen (الماجن)` → `W10-R031 El-Mokrani` *(JORADP administrative usage matches El Madjen / El Mokrani)*

All four remain explicitly flagged **`W10_4WAY_CLUSTER_DECREE_VERIFICATION_REQUIRED`** (`EXPLICIT_PRACTITIONER_DECISION_REQUIRED`) pending direct visual inspection of the underlying 1986–1992 JORADP rename decree/arrêté PDF pages.

### 4.3 Post-1985 Rename Chain & Remaining Conserved-Wilaya Residuals
- **`2427 Aïn Hessania → W24-R023 Houari Boumedienne`:** Executive Decree No. 93-12 of 12 Jan 1993 (`F1993003.pdf` p. 4 visually inspected).
- **`1604 Hamma-Anassers → W16-R003 Mohamed Belouzdad`:** Executive Decree No. 92-378 of 13 Oct 1992 (JORADP No. 75/1992, p. 1583; note `JO23/1998` still printed `Hamma-Annassers / حامة العناصر`).
- **Dated JORADP rename citations pending direct PDF PNG inspection (5):** `1556 Oued Ksari → W15-R045 Ait Yahia Moussa` (Arrêté 12 Nov 1989, JO 04/1990); `2503 El Haria → W25-R009 Ben Badis` (Decree 90-417, JO 01/1991); `2511 Aïn Kerma → W25-R011 Messaoud Boudjeriou` (Arrêté 15 Jul 1989); `2909 M'Hamid → W29-R047 Zelamta` (Arrêté 10 Jan 1990, rectif. 13 Jun 1990); `3814 Oued El Gharfa → W38-R021 Youssoufia` (Arrêté 17 Dec 1989).
- **Sole 1-of-1 conserved-Wilaya rename residuals (4):** `0225 Souk El Bagar → W02-R022 Sidi Abderrahmane`; `0609 Sidi Saïd → W06-R043 M'cisna`; `2419 Hammam Maskhoutine → W24-R008 Hammam Debagh`; `4007 Faïs → W40-R015 Taouzianat`.
- **Seat/Arabic-anchored & JO23/JO58 renames (11):** `0303 Mekhareg → Benacer Benchohra` (JO58); `0552 Nouader → Chir` (JO58); `1311 Chouly → Oued Lakhdar` (JO58); `1348 Souk El Khemis → Beni Khellad` (JO58); `1438 Ouled Djerad → Sidi Abderrahmane` (JO58); `1624 Bains Romains → Hammamet` (JO23); `1932 Oum Ladioul (seat Sokhna) → Hamam Soukhna`; `2613 Damiat → Tizi Mahdi` (JO58 seat); `2832 Zerarka → Khetouti Sed El Djir` (JO58); `2834 Oued Chair → Mouhamed Boudiaf` (JO58); `2839 Ouled Atia → Menaa` (JO58); `3618 Beni Amar (seat Chatt) → Echatt`; `4626 Tadmaya (seat Sidi Ourrach) → Sidi Ouriache`.

---

## 5. Temporal / Effective-Date Architecture Rules (No Universal Single Cutover Date)

For `P1-02` schema design, the ledger enforces **four distinct temporal authority classes** (`temporal_authority_rule_class`) and rejects assigning `2027-01-01` as a universal effective date:
1. **`INHERITED_JO44_1985_REGISTER_OR_INTERVENING_RENAME_DECREE` (860 rows):** Communes anchored on 22 June 1985 (`JO44/1985`, pub. `1985-10-23`), amended by `JO11/1986` (`1986-02-08`, pub. `1986-03-12`) or intervening 1986–1993 rename decrees/arrêtés.
2. **`JO23_1998_ALGIERS_GOVERNORATE_RECOMPOSITION_AND_ORD_2000_01` (142 rows):** Blida/Algiers/Boumerdès/Tipaza recomposition under `JO23/1998` (`1998-03-21`, pub. `1998-04-19`) and subsequent Ordinance `00-01` (`2000-03-01`) restoring Wilaya `16`.
3. **`JO79_2021_NEW_WILAYA_OR_TRANSFER_EFFECTIVE_2021_ONWARD` (135 rows excluding Biskra `07→61` / Djelfa / Laghouat / Béchar / Ouargla rows later recomposed in JO58):** New Wilayas `49`–`58` established under Law `19-12` and numbered in `JO79/2021` (`2021-09-12`, pub. `2021-10-17`).
4. **`LAW_26_06_AND_DECREE_26_208_PHASED_2026_2027_TRANSITION` (404 rows):** Wilayas `59`–`69` and the 10 modified mother Wilayas (`03, 05, 07, 12, 13, 14, 17, 26, 28, 32`) governed by Law `26-06` (pub. `2026-04-05`), `JO58/2026` (order `2026-05-05`, pub. `2026-08-12`), Executive Decree `26-206`, and Executive Decree `26-208` with phased milestones:
   - **Administrative competence transfer — Law `26-06`, Art. 54:** during the installation and organisation of new-Wilaya executive councils, mother-Wilaya authorities continue exercising the stated powers and obligations; mother-Wilaya Walis transfer them progressively no later than `2026-12-31`. This is an administrative handover deadline, not a municipality-parentage or commune-index-code effective date.
   - **Asset/liability partition — Executive Decree `26-208`, Art. 2:** patrimonial operations must be completed before `2026-12-31`, while financial operations are closed at the end of FY 2026. This is a separate implementation track under Law 84-09, Art. 56; do not merge it with the Art. 54 competence-transfer milestone.
   - FY 2026 budgets continue under mother Wilayas through **`2026-12-31`** (Law `26-06` Art. 55);
   - **Occupation-fee collection — Decree `26-208`, Art. 5:** collection is carried out from `2027-01-01` by the territorially concerned Wilaya. **Arts. 6–7** specify distribution/allocation calculations using taxable bases for initial FY 2027 budgets; **Art. 8** transfers ongoing or not-yet-launched equipment/investment programmes located in new Wilayas. These are distinct financial/operational consequences, not a blanket commune-code or parentage cutover date. **Art. 13** separately transfers litigation falling within the new Wilayas' territorial competence.


## 5.1 Separate legal events in the 2026 territorial reorganisation — evidence and field semantics

The `LAW_26_06_AND_DECREE_26_208_PHASED_2026_2027_TRANSITION` classification groups rows requiring multi-instrument reconciliation; it must **not** be read as assigning one universal effective date to every commune, parent Wilaya, or four-digit register code.

1. **Municipality composition / legal territorial structure — Law No. 26-06.** The law dated 4 April 2026 was published in JO No. 25 on 5 April 2026. Article 2 amends provisions in Law 84-09, including territorial-composition lists; Article 3 adds Articles 52 bis 10–20, which enumerate the communes composing the new Wilayas. Article 4 separately amends Articles 54, 55 and 57 on transition, administrative authority and budget execution. Article 6 orders publication. Official source: [JORADP JO25/2026, Law 26-06](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf), especially printed pp. 4–9. The page images for printed pp. 4 and 9 were visually checked in this review.
2. **New-Wilaya names and seats — Presidential Decree No. 26-206.** This decree, dated 25 May 2026 and published in JO No. 40 of 3 June 2026, completes Article 1 of Decree 84-79 by adding names and seats for Wilayas 59–69. Its Article 1 names each new Wilaya and its capital; Article 2 orders publication. It does not itself enumerate constituent communes or four-digit commune-index entries. Official source: [JORADP JO40/2026, Decree 26-206](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf), printed p. 5; the instrument was text-layer checked in this review.
3. **Administrative competence transition — Law 26-06, Article 54.** While new-Wilaya executive councils are being installed and organised, mother-Wilaya authorities continue to exercise the stated powers and obligations. Mother-Wilaya Walis transfer these progressively, no later than 31 December 2026. Article 55 separately continues execution by the mother Wilaya of budgets adopted for FY 2026 for the whole mother-Wilaya territory; Article 57 separately addresses State budget credits for FY 2026. These clauses concern administration and budget execution, not the date on which a commune legally belongs to a Wilaya or the effective date of its register code. Official source: [Law 26-06, JO25/2026](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf), printed p. 9; visually checked.
4. **Assets, liabilities, and related finance — Executive Decree No. 26-208.** The decree dated 26 May 2026 and published in JO No. 40 on 3 June 2026 is made under Article 56 of Law 84-09 and deals with sharing assets and liabilities between mother and new Wilayas. Article 2 requires patrimonial operations to be completed before 31 December 2026 and financial operations by the end of FY 2026. Article 5 says occupation fees are collected from 1 January 2027 by the territorially concerned Wilaya. Articles 6–7 prescribe distribution/allocation calculations using taxable bases for initial FY 2027 budgets; Article 8 transfers specified equipment/investment programmes; Article 13 transfers litigation within the new Wilayas' territorial competence. These provisions have their own scopes and dates; none states a universal effective date for all commune register codes. Official source: [JORADP JO40/2026, Decree 26-208](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf), printed p. 6; visually checked.
5. **Commune index / register layer — JO58/2026.** The existing repository extract records the interministerial order dated 5 May 2026 and published on 12 August 2026, amending the 1985 territorial-collectivity index annex. The 404-row extract comprises 296 existing-Wilaya and 108 new-Wilaya entries; its recorded `effective_date` field remains blank and every `practitioner_review_status` remains `PENDING`. The JO58 PDF itself could not be fetched by the public document viewer in this pass (`Cache miss`); rely on the repository's pinned source extract and image-review provenance, not a new direct PDF capture or newly computed PDF hash.

### Reconciliation of the 44 explicit practitioner-decision rows in this temporal class

A fresh deterministic cross-join was performed against the files on `main` (21 November 2026): `P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv`, `P1-01-PRACTITIONER-QUEUE-110.csv`, and `P1-01-JO58-REGISTER-EXTRACT-404.csv`.

- All **44/44** ledger rows classified `EXPLICIT_PRACTITIONER_DECISION_REQUIRED` within the 2026/2027 temporal class were found in the 110-row practitioner queue and linked to one JO58 extract row using the exact `working_row_key` / `candidate_crosswalk_row_key`.
- All **44/44** had `candidate_mapping_status = MATCHED_NORMALIZED`; the French candidate label and JO58 commune code matched between the ledger and JO58 extract; the queue's proposed review code and proposed parent-Wilaya code also matched the JO58 commune and Wilaya codes. These are internal crosswalk/proposal consistency results only, not final identity or legal approval.
- The queue's `official_arabic_verified_form` field contains **36** values explicitly marked `[PRELIMINARY: independent row-image review pending]` referencing JO58 pages; **one** row carries a JO79/2021 Arabic source reading; **seven** have no value in that field. The JO58 extract records Arabic-annex page-review metadata for pp. 9–25, but this does not turn the 36 preliminary readings into independently accepted row-level transcriptions or fill the seven blanks.
- All **44/44** JO58 `practitioner_review_status` fields are `PENDING`; all **44/44** queue sign-offs are `PENDING`; all **44/44** JO58 `effective_date` fields are blank. No review-code/parent proposal has been accepted through a practitioner decision.
- Source blob identifiers at the time of this audit: ledger `7aa1f8d6a55f5fe36c3711e92d5106380ca01383`; practitioner queue `701ca8c13692cb527a77a94851c39133e674ffa1`; JO58 404-row extract `445fad5b7b9a2a798cfa80d7062aee5fb40800fa`.

### Rule for `valid_from` and non-decisions

Do not set `valid_from` to `2026-04-05`, `2026-08-12`, `2026-12-31`, or `2027-01-01` merely because one of those is a law-publication date, register-publication date, transfer deadline, or finance milestone. A qualified Algerian practitioner must state separately which legal event and source controls (a) the legal composition/parent-Wilaya relationship, (b) the code-index assertion, and (c) transitional administrative authority. The existing SGG guide / Constitution Article 78(2) / Civil Code Article 4 distinction recorded above remains relevant; do not automatically apply the local daïra receipt rule to a regulatory ministerial arrêté or infer a `valid_from` semantic without that decision.

**Disposition remains unchanged:** all 1,541 master-ledger practitioner sign-offs are `PENDING`; the 110-row queue remains a review queue, not an import set; no code, parent, Arabic name, or date was accepted in this audit; `W30-R007` remains `NEEDS_EVIDENCE`; `P1-01` remains In Progress / Pending; `P1-02` remains Blocked; `communesCount = 0`.

---

## 6. Practitioner Verification Sign-Off Block (Must Remain Blank Until Reviewed)

- **Reviewer / Legal & Domain Practitioner Name:** `________________________________________`
- **Role / Qualification:** `________________________________________`
- **Review Date:** `____________________`
- **Adjudication Decisions:**
  - [ ] `3514` vs `3614` (`W35-R023 Chabet El Ameur`): `____________`
  - [ ] `3614` vs `3624` (`W36-R016 Chihani` & `W36-R021 Raml Souk`): `____________`
  - [ ] `5206` vs `0812` (`W08-R012 Tabelbala` parent Wilaya `52` vs `08`): `____________`
  - [ ] Approval of `A2026058` / `A2021079` / `A1998023` / `A1985044` official Arabic corrections overriding the 20 severe Candidate Arabic corruptions & 55 minor/formatting variants: `____________`
  - [ ] Approval / decree verification for `W10` 4-way Bouira cluster (`1008/1020/1043/1044`) & 1986–1993 post-1985 renames: `____________`
  - [ ] Approval to unblock **`P1-02`** dated canonical register migration & database seed: `____________`
- **Signature:** `________________________________________`
- **Overall Sign-Off Status:** **`PENDING`**


## 7. JO44 Arabic primary-image availability and page-locator mapping — 19 November 2026

A subsequent audit of the committed `.tmp-joradp/` artifacts found **29 consecutive Arabic PNG page images** for `A1985044.PDF`: `jo44_ar_pdf12.png` through `jo44_ar_pdf40.png`, corresponding to printed pages **1612–1640**. Each image is pinned by its Git blob SHA-1 in `P1-01-JO44-ARABIC-IMAGE-PAGE-MANIFEST-29.csv`. The source PDF byte-level SHA-256 has not been recaptured in this pass and remains explicitly `NOT_CAPTURED`.

Three companion workpapers were added:
- `P1-01-JO44-ARABIC-IMAGE-PAGE-MANIFEST-29.csv`: page index, printed page, image path/blob hash, ledger source-code position ranges (not a verbatim transcription of every Arabic printed code), visible print exceptions, page review state and source-PDF hash boundary.
- `P1-01-JO44-ARABIC-IMAGE-ROW-MAP-1541.csv`: all 1,541 JO44 assertion IDs and master-ledger keys linked to the Arabic page image associated with the ledger source-code position range. Every row is deliberately marked `PAGE_IMAGE_MAPPED_NOT_ROW_TRANSCRIBED`.
- `P1-01-JO44-ARABIC-WILAYA-COUNT-CONTROL-48.csv`: the 48 printed Wilaya header counts compared with the master ledger population.

The 48 Arabic printed header counts sum to **1,541**, and each printed Wilaya count matches the corresponding master-ledger row count (**48/48**). The mapping preserves the exact source-code anomaly: the French text-layer ledger has two W36 assertions carrying `3624` (Chihani and Raml Souk), whereas the Arabic page 1635 visibly prints Chihani as `3614` and Raml Souk as `3624`. The mapping therefore identifies the page associated with the ledger source-code position; it does not assert that the Arabic printed code equals the French text-layer code or decide the correct row identity/code. The separate `1600 — Ville d'Alger` special assertion is visible on page 1622 and remains outside the 1,541 commune population.

The Arabic images also visibly corroborate the previously recorded 1985 Arabic print discrepancies: W39 `3907` printed as `4907` (p.1636); W41 `4112` printed as `4012` and `4115` as `1415` (p.1637); W42 `4229` printed as duplicate `4228` (p.1637); and W44 `4403` name printed as `بومدفع` (p.1638). These observations are preserved as source-print facts, not automatic canonical corrections.

The distinction is mandatory: **all 29 source pages are present and visually inspected; all 1,541 ledger records have a page-level image locator; row-by-row Arabic name/code transcription, semantic bilingual pairing, complete legal lineage and qualified practitioner adjudication are not thereby completed**. The validator `scripts/validate-p1-01-jo44-arabic-page-images.py` checks image presence and Git blob hashes, ledger-code-position/page coverage, exact master-key linkage, header counts, disclosure of the visible print exceptions, the W36 duplicate, and the separate 1600 record. It intentionally preserves `PENDING` practitioner sign-off and does not certify legal identity.

No commune data are imported; `communesCount = 0`; P1-01 remains In Progress / Pending; P1-02 remains Blocked.

## 8. Project-owner authorization — full 1,541-commune population (19 November 2026)

The project owner explicitly instructed in the PROMO-GEST project conversation on 19 November 2026 that **all 1,541 communes are to be included, without exception**, and authorized the work to approve and integrate the full national population. The owner also self-declared specialist expertise. This records the instruction and its scope; the repository does not contain the owner's legal name, qualification evidence, authenticated in-application reviewer identity, or a cryptographic signature, so this conversational instruction must not be represented as a digitally signed practitioner certificate.

**Accepted scope of the instruction:** the national target population is the full 1,541 communes across 69 Wilayas. No candidate is to be omitted merely because it falls into a review/exception class. The full population is authorized for completion and eventual integration, subject to preserving source provenance and the correct historical/effective-dated relationship for each row.

**What this instruction does not authorize:** silently treating every current candidate field as correct; overwriting conflicting official code assertions; inventing Arabic spellings, transliterations, parent-Wilaya transfers, seats, or effective dates; deleting historical assertions; bypassing the source-ledger validators; or importing incomplete candidate data into PostgreSQL. This distinction matters because the current workpaper records 75 candidate-Arabic anomaly flags, 110 explicit-decision rows, and three unresolved canonical-code tokens (W08-R012, W35-R023, W36-R016). The candidate file contains known severe Arabic substitutions/permutations and must not be imported verbatim.

**Processing rule:** retain all 1,541 candidates in scope; resolve each incorrect or ambiguous attribute from the highest-ranking applicable official source; preserve original assertions and valid-time lineage; apply corrections through a reviewed, reproducible evidence record; and keep unresolved assertions explicit rather than guessing. A blanket population authorization is not a row-level transcription or a substitute for a source-backed code/parent/effective-date decision.

**System boundary:** this is a documentation/authorization record only. It does not alter practitioner_signoff_status (all 1,541 remain PENDING), decision classes, or the three pending-code tokens; it does not change API/runtime/schema or import/seed data. communesCount = 0 and PendingOfficialVerification remain until the complete, corrected, validated dataset is accepted through the Phase 1 gates. P1-01 remains In Progress / Pending and P1-02 remains Blocked until that evidence and the required authenticated review record are complete.

**Practitioner handoff:** [Arabic review guide and source-linked 110-case queue](P1-01-PRACTITIONER-QUEUE.ar.md). The queue tests the three recommendations together without replacing the pending tokens in the master ledger.

---

## 9. Q110 Complete Bilingual JO44 Coverage & Post-1985 Naming Addendum — 22 November 2026

> **Governance note:** The master ledger's existing `primary_source_verification_scope` counts (`841` JO44 French text-layer-only, `27` explicitly tagged JO44 Arabic spot-verified) remain unchanged and `P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv`, `P1-01-PRACTITIONER-QUEUE-110.csv`, and `P1-01-DECISION-BOOK-1541.csv` were **not** mutated. All `1,541` practitioner sign-offs remain `PENDING`, `P1-01` remains **In Progress**, `P1-02` remains **Blocked**, and `communesCount = 0`.

1. **Complete `110/110` Practitioner Queue JO44 Bilingual Visual Coverage:** [`P1-01-JO44-FLAGGED-QUEUE-BILINGUAL-READINGS.csv`](P1-01-JO44-FLAGGED-QUEUE-BILINGUAL-READINGS.csv) inspects and pins by **PNG SHA-256** all **102** Q110 rows not covered by `-51` (`3` in Q110) or `W41-30` (`5` in Q110), forming an exact `8 + 102 = 110/110` disjoint union enforced by `scripts/p1_01_bilingual_supplements.py` and `scripts/test_p1_01_bilingual_supplements.py`.
   - **Verified JO44 French single-page corrections (logged in supplement without altering master ledger):** W11 (`1101..1110`) → p.1057; W15 (`1505..1542`) → p.1059 and (`1545..1565`) / W16 (`1604, 1624`) → p.1060; `1932` → p.1062; `2419..2611` → p.1064; `2613..2664` → p.1065; `2732, 2807..2846` → p.1066; `3218` → p.1068; `3814` → p.1070.
   - **Verbatim print anomalies preserved:** `3907 Kouinine` retains Arabic misprint code `4907` (AR p.1636); `1549 Idjeur` preserves AR p.1622 seat `ايغرساسن` vs FR p.1060 `Iguer Majène`; `2707 Aïn Tadlès` (outside Q110) is additionally noted on `jo44_ar_pdf29.png` p.1629 as printing duplicate `2706`.
2. **Post-1985 Naming, Seat-Transfer & Boundary Acts (`38` records):** [`P1-01-POST-1985-NAMING-INSTRUMENTS-BILINGUAL-READINGS.csv`](P1-01-POST-1985-NAMING-INSTRUMENTS-BILINGUAL-READINGS.csv) records **`23`** `BILINGUAL_FR_AR_PNG_VERIFIED` instruments (including Chlef `W02-R022`, Béjaïa `W06-R043`, Guelma `W24-R008`, Bouira `W10-R019` Decree 90-379 & `W10-R031`, `JO24/1990` Mascara `Zelamta` rectificatif, `JO04/1990` `W15-R045`/`W38-R021`/`W29-R047`, `JO01/1991` Decree 90-417, `JO09/1991` Decrees 91-51/91-52, `JO75/1992` Decree 92-378, `JO01/1993` Decree 93-04, `JO03/1993` Decrees 93-11/93-12), **`4`** `AR_BODY_PNG_AND_EXISTING_FR_EXTRACTED` rows (`JO11/1986`: `2407`/`2656`/`3434` on AR p.401, `3919` on AR p.402), **`3`** partial-cache items (`3618` missing AR p.1685, `0707` missing FR p.269, `1539` Decree 91-62 missing pp.311/365), and **`8`** unlocated primary naming acts (`PRIMARY_RENAME_ACT_NOT_IN_CACHE`: `0552`, `1008`, `1020`, `1624`, `1932`, `4007`, `2834`, `2839`).
3. **Remaining blockers to close P1-01:** qualified practitioner review & signature (memorandum + Section 6), `valid_from` & `W30-R007` legal adjudication, the 8 unlocated primary naming acts + 3 missing body pages, Arabic page verification for `DECR-92-412` & `DECR-06-256`, and non-flagged 1985 row-level Arabic/French transcription where required by practitioner scope.


## Uploaded candidate dataset audit — 22 November 2026

A user-supplied archive containing `communes.csv`, `dairas.csv`, `wilayas.csv`, and `generate_db.py` was inspected and fingerprinted. The detailed bounded audit is recorded in [P1-01-UPLOADED-DATASET-AUDIT-2026-11-22.md](P1-01-UPLOADED-DATASET-AUDIT-2026-11-22.md).

- Structural validation found 69/69 unique wilayas, 591/591 unique dairas, and 1,541/1,541 unique communes; no missing commune→daira/wilaya references, cross-wilaya hierarchy mismatches, orphan dairas, duplicate Arabic/French names within a wilaya, or fully duplicated commune rows. All 1,541 commune `page_number` values are `N/A`.
- The generator pulls the upstream `el-amin-dev/algeria-wilayas-communes` JSON from the moving jsDelivr `@main` reference without an immutable source pin or input checksums. The upstream provenance expressly says that daira and commune identifiers are synthesized/library-assigned, not government identifiers, and that the daira→commune arrangement was regrouped from pre-2025 structure under the 69-wilaya map.
- The generated sequence identifiers must not be treated as ONS/legal codes. The blanket `26-253` attribution and `JO 52/2026` references for all 1,541 commune rows are not row-level legal provenance: Decree 26-253 amends the annexed list of communes administered by each Daira Chief under Decree 91-306; it is not the standalone legal basis for every commune's existence, identity, code, or lineage. Every commune row has `page_number=N/A`.
- Assigning `loi_creation=26-06` to all 69 wilayas conflates the current-map reform with the individual creation/legal lineage of each wilaya.
- Count equality with JO25/2026 Article 3 is a national-total check only, not row-by-row proof.

**Disposition:** preserve this archive only as a non-approved candidate set for name comparison/anomaly discovery. No ledger rows are approved or edited; no commune import; no official code, legal parent, or `valid_from` inferred. All 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE; `communesCount=0`; P1-01 In Progress/Pending; P1-02 Blocked.

Archive SHA-256: `dd35a4f9f44117c4f0fda7bc34277aa98b6cb874bed975f18c3c38665d1b79ae`. The per-file SHA-256 values and detailed findings are in the linked audit report.


## New-wilaya statutory membership cross-check — JO25/2026 — 22 November 2026

The uploaded archive's 108 candidate commune rows assigned to wilaya codes 59–69 were compared by wilaya name with Law 26-06's amended Law 84-09 Article 52 bis items 10–20 (JO25/2026, printed pp.9–11). Each of the 11 per-wilaya candidate row counts equals the corresponding statutory list count, for 108/108 in total. This is a count control only.

Strict normalized French-name comparison found 81 matches and 20 spelling/transliteration/order candidates. Two groups have substantive unresolved set differences:
- **Bou Saada (uploaded code 64, law list item 19):** statutory list-only names Khoubana, M'Cif, El Houamed and Djebel Messaad; uploaded-only names M'tarfa, Maadid, Maarif and Sidi Hadjeres.
- **El Abiodh Sidi Cheikh (uploaded code 60, law list item 20):** statutory list-only names Ain El Orak, El Bnoud and El Meharra; uploaded-only names Brezina, Cheguig and Ghassoul. “El Abiodh Sidi Cheikh” vs “Labiodh Sidi Cheikh” is a tentative alias candidate only.

The full table, all 20 potential variants, JO61 Annex II count comparison, source/image limitations and Article 54 transition caution are recorded in [P1-01-LAW26-06-NEW-WILAYA-RECONCILIATION-2026-11-22.md](P1-01-LAW26-06-NEW-WILAYA-RECONCILIATION-2026-11-22.md). The JO61 Annex II headings use a different numbering sequence from the uploaded administrative wilaya codes; join by wilaya name, not heading number. JO61 remains an electoral schedule under Organic Law 21-01 Article 124, not a one-row-per-commune legal register.

Disposition remains candidate-only. Do not alter the master ledger, accept a proposed name, infer legal parentage or valid_from, or import any commune. All 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE; communesCount=0; P1-01 In Progress/Pending; P1-02 Blocked.


## JO52/2026 operational-assignment scope and two confirmed candidate membership errors — 22 November 2026

A focused comparison of the user-supplied archive with official JO25/2026 and JO52/2026 shows that Decree 26-253 must not be treated as the territorial Commune→Wilaya register. Its title and Article 1 state that it amends the list of communes animated by each Daira Chief annexed to Decree 91-306. That is a Daira-Chief service-assignment list, distinct from the territorial membership lists in Law 26-06's amended Law 84-09.

**Confirmed candidate membership set errors:**
- Uploaded code 64 / Bou Saada: the statute's Article 52 bis 19 list has 23 communes. The upload has 23 rows, but omits Khoubana, M'Cif, El Houamed and Djebel Messaad, and instead assigns Sidi Hadjeres, Maadid, M'tarfa and Maarif to code 64. Law 26-06 Article 32 places those four latter communes in M'Sila. Candidate row locators: 64-001, 64-021, 64-022, 64-023.
- Uploaded code 60 / El Abiodh Sidi Cheikh: Article 52 bis 20 lists El Abiodh Sidi Cheikh, Aïn El Orak, Arbaouat, Boussemghoun, Chellala, El Bnoud and El Mehara. The upload has seven rows but omits Aïn El Orak, El Bnoud and El Mehara, and instead includes Brezina, Ghassoul and Cheguig. Article 36 places the latter three in El Bayadh. Candidate row locators: 60-001, 60-002, 60-006. 60-003 "Labiodh Sidi Cheikh" remains a tentative label variant, not an accepted canonical name.

**JO52 service-assignment evidence:** its Annex lists the 23 territorial Bou Saada communes across two Daira-Chief heading groups: 13 assignments under heading 67 (Ksar El Boukhari) and 10 under heading 68 (Bou Saada). The first group includes four seats/areas for Ouled Sidi Brahim, Sidi Ameur, Ain El Melh and Ben Srour, whose 13 named communes are all members of Article 52 bis 19. The second group names the other 10 legal Bou Saada communes. This is concrete evidence that the service list is not a one-to-one current territorial parent register. Law 26-06 Article 54 supplies transitional context, but its 31 December 2026 transfer deadline must not be turned into a commune-level valid_from date.

Detailed source scope, list composition, uploaded candidate IDs, page locators and the JO52 screenshot/cache limitation are in [P1-01-JO52-LEGAL-OPERATIONAL-MEMBERSHIP-AUDIT-2026-11-22.md](P1-01-JO52-LEGAL-OPERATIONAL-MEMBERSHIP-AUDIT-2026-11-22.md). The official JO52 text layer was read in Arabic and French; page-image screenshots returned Cache miss, so no visual page review is claimed. The official JO25 French text layers provide Article 32, Article 36 and Articles 52 bis 19–20. The existing ADR 0010 / Reference-Data Governance rule already separates legal territorial jurisdiction from operational authority; this audit supplies concrete evidence to retain that distinction.

**Disposition:** these are candidate-source exceptions, not approvals or corrections. Do not change the 1,541-row ledger, assign canonical aliases, populate valid_from, or import. All 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE; communesCount=0; P1-01/P1-35 In Progress/Pending; P1-02 Blocked.
