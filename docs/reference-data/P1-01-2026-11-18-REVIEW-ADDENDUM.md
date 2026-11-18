# P1-01 Review Addendum — 1985 Baseline, Algiers Historical Row, and 2026–2027 Transition

**Prepared:** 18 November 2026  
**Task:** P1-01 — official-source audit for the 1,541-commune administrative reference  
**Disposition:** Evidence and methodology clarification only. No canonical commune code is approved by this addendum.  
**Import boundary:** No commune records are imported; `communesCount = 0` / `PendingOfficialVerification`. P1-01 remains In Progress / Pending; P1-02 remains Blocked.

## 1. Executive disposition

The independent review identifies four useful corrections to the current P1-01 work plan:

1. The current `360/975` figure is not a valid measure of coverage of the complete 1985 register. The 975 figure came from an earlier residual-evidence partition of the 1,137 candidates outside the JO58 delta; it is not the total number of 1985 baseline rows still to be extracted. JO44 work already includes sections that overlap other evidence buckets.
2. The next historical-source control should be the complete 48-Wilaya JO44/1985 baseline, not only the previous 975-row residual bucket.
3. The JO44/1985 and JO23/1998 `1600 — Ville d'Alger` line is a historical special/aggregate entry and must not be counted as a 1,542nd commune. Preserve the source assertion separately from the 1,541 commune entities.
4. The 2026–2027 administrative transition has multiple legal dates and functions. It must not be represented by one universal operational-effective date of 1 January 2027.

These corrections do not change the technical or legal status: all 1,541 workpaper rows remain `PENDING` and `CANDIDATE_ONLY_NOT_APPROVED`; no commune import or canonical correction is authorized.

## 2. Correct the JO44/1985 extraction denominator

### 2.1 Existing extracts

The repository currently contains 13 bounded JO44/1985 French searchable-text extracts:

| Wilaya code | Section | Extracted rows |
|---:|---|---:|
| 01 | Adrar | 28 |
| 02 | Chlef | 35 |
| 03 | Laghouat | 24 |
| 04 | Oum El Bouaghi | 29 |
| 05 | Batna | 61 |
| 06 | Bejaia | 52 |
| 07 | Biskra | 33 |
| 08 | Bechar | 21 |
| 09 | Blida | 29 |
| 10 | Bouira | 45 |
| 11 | Tamanghasset | 10 |
| 12 | Tebessa | 28 |
| 31 | Oran | 26 |
| **Total** | **13 of the 48 original Wilaya sections** | **421** |

The Adrar tranche contains 28 unique assertion IDs and 28 unique four-digit codes in sequence 0101–0128. The Biskra tranche contains 33 unique assertion IDs and 33 unique four-digit codes in sequence 0701–0733. The Biskra source heading declares 33 communes; this is distinct from the 27 Biskra rows republished/changed in JO79/2021. All 421 rows remain historical source assertions, not verified current commune identities: the JO44 extracts are French searchable-text transcriptions only, not fully Arabic-paired, not candidate-joined as a complete historical crosswalk, and not practitioner-approved. The current 48-Wilaya control table contains 48 section rows; 24 official declared counts have been entered, summing to 702, and 24 remain to be transcribed. The partial sum is not the national total.

### 2.2 Retire 360/975 as the extraction progress ratio

The earlier 975-row figure was derived from a separate candidate-evidence partition (59 + 76 + 27 + 975 = 1,137). That partition is useful historical analysis but is not a disjoint denominator for extraction of every row in the original JO44/1985 register. Several extracted Wilaya sections intersect the later JO58/2026 or JO79/2021 evidence scope.

Accordingly:

- Keep the earlier `975` bucket in the historical notes as the former residual work-planning bucket.
- Do **not** report `360/975` or `615 remaining` as national JO44 source coverage.
- The new work-planning control is to enumerate and reconcile all 48 Wilaya sections in JO44/1985.
- The current extract coverage is 13 of 48 sections, leaving 35 original Wilaya tables to extract and reconcile. Do not infer a national remaining-row count from the 1,541 current-law total or the former 975 residual bucket. The full 1985 declared-count sum must first be established directly from all 48 official headings, and then compared against the 48 row extracts while excluding the historical `1600 — Ville d'Alger` special line.
- The 48-row control table records each Wilaya code, printed heading, official declared commune count, actual extracted rows, excluded special rows, printed page range, source checksum and separate FR/AR/visual/current-validity review statuses. As of this update, 24 declared counts have been transcribed (partial sum 702); the remaining 24 must still be captured and independently reconciled.

## 3. Legal treatment proposed for the bilingual code discrepancies

Decree No. 85-20, Article 3, establishes a four-digit commune code: the first two digits identify the Wilaya to which the commune is attached, and the last two identify the commune within that Wilaya. Article 4 requires the register to be updated for territorial changes and a new code to be assigned when a commune is transferred to another Wilaya; the former code is not reallocated.

The French JORADP editions are explicitly labelled `TRADUCTION FRANÇAISE`. This is strong evidence that the French publication is the translated edition, while the original edition is the primary text for resolving a discrepancy. The legal rule of precedence and the final row decisions nevertheless require the qualified Algerian reviewer to confirm; this engineering addendum does not itself issue a legal adjudication.

### 3.1 Chabet El Ameur — proposed reviewer decision: 3514

Evidence retained in the repository and official editions:

- JO44/1985 FR and AR list Chabet El Ameur / شعبة العامر with code `3514`.
- JO23/1998 AR prints شعبة العامر with code `3514`.
- JO23/1998 FR prints `3614` in the Boumerdes (35) table, between `3513` and `3515`.
- The printed French `3614` is structurally inconsistent with Article 3 of Decree 85-20 because its first two digits identify Wilaya 36, not Wilaya 35.
- ONS W./C. references also support 35/14, but remain corroborating geographic evidence rather than an amendment to the register.

**Recommendation for the sign-off sheet:** ask the practitioner to adopt `3514` as the applicable code if they confirm the Arabic original text governs this conflict. Preserve the French JO23/1998 assertion `3614` verbatim in an archival source-error/discrepancy note. Do not silently overwrite the source row or promote the candidate code to canonical before the signed decision.

### 3.2 Chihani / شهاني — proposed reviewer decision: 3614

Evidence retained in the repository and official editions:

- JO44/1985 AR prints شهاني with code `3614`.
- JO44/1985 FR prints `Chihani | 3624`, duplicating the `3624` code printed for Raml Souk in the same Wilaya 36 table.
- ONS 2008 supports شهاني with Wilaya/component code 36/14; ONS 2021 prints the spelling شحاني with 36/14. The ONS date/version inconsistency is separately preserved.

**Recommendation for the sign-off sheet:** ask the practitioner to adopt code `3614` and the Arabic original spelling `شهاني`, with `شحاني` stored as a source-backed spelling variant/search alias if the reviewer approves. Preserve the French `3624` assertion in the archival discrepancy note. Do not normalize the source documents or close this exception before sign-off.

These are proposed legal dispositions for a reviewer, not approved canonical values.

## 4. `1600 — Ville d'Alger`: preserve, but do not count as a commune

The official French JO44/1985 Wilaya d'Alger table declares **33 communes**, while listing `Ville d'Alger | 1600` before the numbered rows `1601` through `1633` (33 numbered commune entries). JO23/1998 declares **57 communes**, while listing the `1600` line before the numbered rows `1601` through `1657` (57 numbered commune entries).

The declared counts therefore match the sequential numbered communes and exclude the additional `1600 — Ville d'Alger` line. The line must be preserved as an explicit historical source record, but it must not be loaded as an extra commune or included in the national count of 1,541.

The 1 March 2000 Ordinance No. 2000-01 returns the administration of the Wilaya of Algiers and its communes to the ordinary rules applicable to Wilayas and communes, subject to provisions specific to the capital city. The 2000 instrument is part of the historical lineage; do not infer from it alone an exact record-level deletion date for the `1600` assertion. The reviewer must confirm the end-validity treatment of this historical special entry.

**Data treatment pending review:** preserve `1600` as a separate historical non-commune/special-entity assertion, outside the 1,541 commune set. Keep its source, dates and legal disposition separately traceable. Do not represent it as a current Commune entity.

## 5. Separate the 2026–2027 legal/operational timelines

Law No. 26-06 and Executive Decree No. 26-208 do not establish one universal date on which every administrative, budgetary, property and financial function moves to the new Wilayas.

| Dimension | Primary rule | PROMO GEST treatment |
|---|---|---|
| Statutory territorial composition | Law 26-06 sets the new Wilaya composition and amends the territorial framework. | Store legal parentage and its own source/effective interval separately. Have the practitioner confirm the applicable effective-date rule. |
| Transfer of administrative powers and service obligations | Law 26-06, Article 54: mother-Wilaya authorities continue to exercise the relevant powers during the installation period; Walis transfer them progressively, no later than 31 December 2026. | Do not assume all transfers occur on 1 January 2027. Record actual transfer dates by Wilaya and competence where evidenced. |
| 2026 budget execution | Law 26-06, Article 55: budgets voted for fiscal year 2026 for the full mother-Wilaya territory continue to be executed by the mother Wilaya. | Preserve fiscal-year executor separately from legal territory and the current operational service authority. |
| Asset/liability split | Decree 26-208, Article 2: property operations are to be completed before 31 December 2026; financial operations by the end of fiscal year 2026. | Track patrimonial and financial transition milestones separately. |
| Occupation fees for Wilaya public domain | Decree 26-208, Article 5: collection is by the concerned Wilaya from 1 January 2027. | Apply this date only to the specific fee category governed by Article 5; do not generalize it to all receipts or services. |
| 2027 budget allocations and investment programmes | Decree 26-208, Articles 6–8 provide for distribution by taxable bases and transfer of programmes located in new Wilaya territories. | Retain programme, asset, budget and beneficiary history with instrument-specific dates and attribution. |
| Litigation files | Decree 26-208, Article 13 transfers cases within the territorial jurisdiction of the new Wilayas. | Track case jurisdiction/transfer independently from commune parentage and ordinary service authority. |

**Architecture implication:** the canonical reference must not collapse legal Wilaya parentage, operational authority, fiscal-year budget executor, property/asset destination, fee-collection authority, and litigation jurisdiction into one `wilaya_id` or one `effective_from` field. Use distinct, source-backed temporal assertions. For dated real-estate contracts, permits, deeds and project records, the responsible authority must be derived from the relevant legal function and transaction date, not inferred solely from the current Wilaya label.

## 6. Revised P1-01 execution order

1. Build and validate the 48-Wilaya JO44/1985 control table. Prove the declared-count sum and actual extracted-row sum, explicitly excluding `1600 — Ville d'Alger` from the commune count.
2. Extract the 37 remaining JO44 sections, with French and Arabic page references, row-level commune/code/seat separation, PDF checksums, and page-image verification.
3. Join all 1985 source rows to the 1,541 candidate workpaper without fuzzy identity merges; retain source labels and aliases separately.
4. Apply the amendment chain chronologically, including JO11/1986, JO23/1998, the relevant Algiers 2000 instruments, JO79/2021, JO58/2026, and every additional amendment identified by the source inventory.
5. Resolve the 22 JO79/2021 existing-Wilaya exceptions (four exact-name/different-parent cases and 18 unresolved identity/label cases) with evidence, not automatic parent changes.
6. Obtain a dated qualified Algerian practitioner decision for Chabet El Ameur, Chihani/Raml Souk, `1600`, the full source hierarchy, every material effective date, and final 1,541-row completeness.

### Acceptance controls

- Exactly 1,541 approved commune identities after all sources are reconciled; no `1600` extra entity counted.
- 48/48 original JO44 Wilaya headings accounted for, with declared counts and actual row counts reconciled.
- No duplicate active four-digit register codes for the same valid-time interval; no gap, double parent or unrecorded transfer.
- Arabic/French labels and seats are source-backed and separately stored; no inferred aliases or silent normalization.
- Every code, name, parent and effective-date assertion carries source/page/provenance.
- All material discrepancy decisions are signed by the qualified reviewer.
- Only then can P1-01 be proposed for Done and P1-02 be unblocked. CI success or extraction volume alone is not acceptance.

## 7. Primary sources

- Decree No. 85-20, JO No. 06/1985, Article 3–4: [French original JORADP PDF (French translation edition)](https://www.joradp.dz/FTP/jo-francais/1985/F1985006.PDF) · [Arabic edition](https://www.joradp.dz/FTP/jo-arabe/1985/A1985006.PDF).
- Initial register, interministerial order of 22 June 1985, JO No. 44/1985: [French edition](https://www.joradp.dz/FTP/jo-francais/1985/F1985044.PDF) · [Arabic edition](https://www.joradp.dz/FTP/jo-arabe/1985/A1985044.PDF).
- Register amendment, order of 21 March 1998, JO No. 23/1998: [French edition](https://www.joradp.dz/FTP/jo-francais/1998/F1998023.PDF) · [Arabic edition](https://www.joradp.dz/FTP/jo-arabe/1998/A1998023.PDF).
- Ordinance No. 2000-01, JO No. 09/2000, page 3: [official issue page 2 / contents](https://www.joradp.dz/JO2000/2000/009/FP2.pdf) · [official issue page 3](https://www.joradp.dz/JO2000/2000/009/FP3.pdf).
- Law No. 26-06, JO No. 25/2026, Articles 54–55: [French translation edition](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf) · [Arabic edition](https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf).
- Executive Decree No. 26-208, JO No. 40/2026, Articles 2–13: [French translation edition](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf).

**Final status:** this addendum improves the evidence plan and records proposed reviewer questions. It does not approve a code, certify the full register, import reference data, change application code/schema, or unblock P1-02.
