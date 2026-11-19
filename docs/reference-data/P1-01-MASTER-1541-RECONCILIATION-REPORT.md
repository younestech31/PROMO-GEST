# P1-01 — Master 1,541-Commune Legal Verification & Bilingual Audit Report

**Status:** `PENDING_PRACTITIONER_SIGNOFF` (`P1-01` **In Progress**; `P1-02` **Blocked**)  
**Database / Runtime Guardrail:** `communesCount = 0`, `PendingOfficialVerification` unchanged; no unapproved candidate data imported into PostgreSQL or application code.  
**Audit Date:** 2026-11-19  
**Companion Ledger:** `docs/reference-data/P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv` (**1,541** rows, 1-to-1 bijection)  
**Automated CI Check:** `scripts/validate-p1-01-master-ledger.py`

---

## 1. Executive Summary & Bijection Closure (1,541 / 1,541)

This report and its companion CSV ledger (`P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv`) close the full-population reconciliation between:
1. All **1,541** historical commune entries in the 22 June 1985 founding register (**JO44/1985**, `F1985044.PDF`, 48 Wilaya sections), excluding **`1600 — Ville d'Alger`** (`P1-01-JO44-1985-W16-ALGER-1600-SPECIAL-ASSERTION.csv`), which is preserved separately as an urban-community / governorate special entry and not counted in 1,541 communes.
2. All **1,541** current candidate commune entries across **69 Wilayas** in the working crosswalk (`P1-01-WORKING-CROSSWALK-1541.csv`, derived from `islam-re/Algeria-wilayas`).

### Original French Name-Only Triage Closure
All 1,541 historical assertions from the initial unlinked French-name-only triage (`P1-01-JO44-TO-CANDIDATE-FRENCH-NAME-ONLY-COMPARISON-2026-11-19.md`) are deterministically resolved into a verified **1-to-1 bijection** (1,541 unique `jo44_assertion_id` ↔ 1,541 unique `working_row_key` ↔ 1,541 unique `proposed_canonical_code`):

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
- **JO58/2026 (`F2026058.pdf` / `A2026058.pdf`):** **404 / 404** communes across 21 Law 26-06 recomposed/new Wilaya articles linked, with **all 17 Arabic annex pages (pp. 9–25)** visually inspected on PNG renders.

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
3. **`4112` (`W41-R021 Merahna`, `A1985044.PDF` p.1637):** Prints **`مراهنة`** with misprinted code **`4012`** instead of `4112`.
4. **`4115` (`W41-R014 M'daourouche`, `A1985044.PDF` p.1637):** Prints **`مداوروش`** with misprinted code **`1415`** instead of `4115`.
5. **`4229` (`W16-R024 Staoueli`, `A1985044.PDF` p.1637):** Prints **`سطاوالي`** with misprinted duplicate code **`4228`** (duplicating `4228 Chéraga` directly above it; later assigned `1645` in `JO23/1998`).

---

## 3. Critical Candidate Dataset Arabic Corruptions Caught (`DO NOT IMPORT VERBATIM`)

Comparison against visually inspected **`A2026058.pdf` (pp. 9–25)**, **`A2021079.pdf` (pp. 15–22)**, **`A1998023.PDF` (pp. 9–14)**, and **`A1985044.PDF`** exposed **75** Candidate Arabic anomalies in `P1-01-WORKING-CROSSWALK-1541.csv` (`islam-re/Algeria-wilayas`), including **20 severe semantic/permutation corruptions** that would corrupt official database records if imported verbatim:

### 3.1 Nine-Commune Arabic Permutation Cycle in Wilaya 26 (Médéa)
In `P1-01-WORKING-CROSSWALK-1541.csv`, 9 communes of Wilaya `26` have rotated/swapped Arabic labels across rows; `A2026058.pdf` pp. 18–19 establishes the true official Arabic for all 9:
- `W26-R025` (`2616 El Hamdania`): Candidate `الحوضان` → Official JO58 AR p.18 **`الحمدانية`**
- `W26-R026` (`2601 Medea`): Candidate `مزغنة` → Official JO58 AR p.18 **`المدية`**
- `W26-R029` (`2602 Ouzera`): Candidate `المدية` → Official JO58 AR p.18 **`وزرة`**
- `W26-R032` (`2607 El Omaria`): Candidate `الحمدانية` → Official JO58 AR p.18 **`العمارية`**
- `W26-R033` (`2624 Baata`): Candidate `وزرة` → Official JO58 AR p.18 **`بعطة`**
- `W26-R035` (`2661 Sedraia`): Candidate `بعطة` → Official JO58 AR p.19 **`سدراية`**
- `W26-R036` (`2611 Mezghenna`): Candidate `العمارية` → Official JO58 AR p.18 **`مزغنة`**
- `W26-R040` (`2626 Sidi Naamane`): Candidate `سدراية` → Official JO58 AR p.18 **`سيدي نعمان`**
- `W26-R043` (`2653 Deux Bassins`): Candidate `سيدي نعمان` → Official JO58 AR p.19 **`الحوضان`**

### 3.2 Eleven Severe Arabic Corruptions / Lexical Substitutions in New Wilayas W60–W68
- `W60-R006` (`6003 Abdelkader Azil`): Candidate `عبد القادر عزيز` → Official JO58 AR p.21 **`عبد القادر عزيل`**
- `W61-R004` (`6104 El Outaya`): Candidate `الوتیة` → Official JO58 AR p.22 / JO79 AR p.16 **`الوطاية`**
- `W65-R005` (`6505 Sidi Ladjel`): Candidate `سيدي لخضر` → Official JO58 AR p.23 **`سيدي لعجال`**
- `W65-R008` (`6506 Had Sahary`): Candidate `حاضرة` → Official JO58 AR p.23 **`حد الصحاري`**
- `W67-R005` (`6706 Kef Lakhdar`): Candidate `الكاف الأحمر` *(lit. "Red" instead of "Green"!)* → Official JO58 AR p.23 **`الكاف الأخضر`**
- `W67-R008` (`6705 Bouaiche`): Candidate `بوطاط` → Official JO58 AR p.23 **`البواعيش`**
- `W67-R019` (`6721 Saneg`): Candidate `السناقصة` → Official JO58 AR p.24 **`السانق`**
- `W68-R007` (`6808 Ouled Slimane`): Candidate `أولاد سلامة` → Official JO58 AR p.24 **`أولاد سليمان`**
- `W68-R009` (`6809 El Houamed`): Candidate `الحمادين` → Official JO58 AR p.25 **`الحوامد`**
- `W68-R011` (`6811 Zarzour`): Candidate `الزرق` → Official JO58 AR p.25 **`الزرزور`**
- `W68-R017` (`6817 Menaa`): Candidate `مضاء` → Official JO58 AR p.25 **`مناعة`**

### 3.3 Other Candidate Formatting & Orthographic Flags (55 rows)
- **Broken punctuation:** `W27-R002` (`2721 Hassiane`) has unclosed parenthesis `الحسيان (بني ياحي`.
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
   - Progressive administrative transfer completed by **`2026-12-31`** (Law `26-06` Art. 54; Decree `26-208` Art. 2 asset/financial close);
   - FY 2026 budgets continue under mother Wilayas through **`2026-12-31`** (Law `26-06` Art. 55);
   - Occupation fees/financial allocation/2027 budget rules effective **`2027-01-01`** (Decree `26-208` Art. 5–8); plus Art. 13 litigation/continuity transition rules.

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
