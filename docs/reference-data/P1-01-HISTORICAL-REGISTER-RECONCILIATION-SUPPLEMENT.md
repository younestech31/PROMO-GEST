# P1-01 — Historical register reconciliation supplement (JO79 existing Wilayas)

**Prepared:** 18 November 2026  
**State:** FRENCH TEXT-LAYER RECONCILIATION — NOT LEGALLY APPROVED

## 1. Scope

This supplement expands the JO79/2021 source chain for the eight existing-Wilaya tables, separately from the 59 new-Wilaya records (49–58). The row-level extract is `P1-01-JO79-2021-EXISTING-WILAYAS-103-REGISTER-EXTRACT.csv`; the unlinked rows are in `P1-01-JO79-2021-EXISTING-WILAYAS-EXCEPTIONS.csv`; the specific Biskra-to-W61 comparison is in `P1-01-JO79-TO-JO58-2026-BISKRA-PARENT-TRANSFER-CONTROLS.csv`.

## 2. Row counts and source-page coverage

| JO79 Wilaya | Declared rows in extract | Printed page(s) |
|---:|---:|---|
| 01 Adrar | 16 | 13 |
| 07 Biskra | 27 | 13–14 |
| 08 Béchar | 11 | 14 |
| 11 Tamenghasset | 5 | 15 |
| 30 Ouargla | 8 | 15 |
| 33 Illizi | 4 | 15 |
| 39 El Oued | 22 | 16 |
| 47 Ghardaïa | 10 | 16 |
| **Total** | **103** | |

All 103 rows were transcribed from the official French JORADP PDF text layer, keeping commune name, code and seat as separate fields. Page-image attempts for printed pages 13–16 returned Cache miss; none of these rows is labelled visually verified. The Arabic edition was unavailable in this pass. Exact original PDF bytes were not obtained, so all JO79 PDF SHA-256 fields remain blank.

## 3. Deterministic candidate reconciliation

- 81 exact normalized French-name matches under the same current candidate Wilaya.
- 4 exact normalized French-name matches where the current candidate row is now under W61 rather than historical W07.
- 17 possible name variants are shown only as review leads and remain unlinked.
- 1 source label has no identified candidate row.
- Thus 85/103 rows have exact normalized label joins (including four cross-parent joins); 18/103 remain unresolved. A normalized text join is a workpaper relationship, not legal identity adjudication.

The four exact W07-to-W61 source pairs are:

| Commune | JO79/2021 | JO58/2026 |
|---|---|---|
| Branis | W07 / 0703 | W61 / 6103 |
| El Kantara | W07 / 0717 | W61 / 6101 |
| Aïn Zaâtout | W07 / 0718 | W61 / 6102 |
| El Outaya | W07 / 0719 | W61 / 6104 |

The fifth Biskra row, Djemorah / 0720, is not exactly matched to JO58's Djemourah / 6105. Do not merge it or create an alias until the Arabic row and original page cell are reviewed.

## 4. Source-coverage arithmetic for the 1,137 rows outside JO58/2026

The source coverage plan now separates:
- 59 JO79/2021 entries for newly created Wilayas 49–58;
- 76 entries across seven older Wilaya tables in JO79 (01, 08, 11, 30, 33, 39, 47), not subsequently modified by JO58/2026;
- 27 Biskra entries in JO79, historical for 2021 and superseded for current values by JO58/2026;
- 975 rows in 30 remaining older Wilaya sections requiring JO44/1985 and applicable register amendments.

Total: 59 + 76 + 27 + 975 = 1,137. These are source-coverage buckets, not a final legal-acceptance count.

## 5. Parent/code conflicts and historical lineage

- JO79/2021 directly places Tabelbala in W52 / 5206, whereas the pinned candidate list places Tabelbala under W08 (candidate key W08-R012). W52 has 9 candidate rows versus 10 in JO79; W08 has 12 versus 11. Preserve the conflict and do not re-parent automatically.
- The W07-to-W61 transitions are explicit old/new register assertions; the four exact French name matches have different four-digit codes as required by the register's code semantics. They must be stored as historical versions, not overwritten.
- Djemorah/Djemourah remains a source-label/identity issue.
- Beni Guecha / Ben Guecha / Béni Guécha appears in JO79/2021, the candidate list and JO11/1986 respectively with code 3919. Preserve all verbatim source labels; no alias has been approved.

## 6. Required remaining evidence

1. Arabic JO79 and JO58 page-level row pairing, exact page/cell capture, and original PDF SHA-256.
2. Visual review of JO79 pages 13–16 and JO44/1985, JO11/1986, JO23/1998 pages that contain the unresolved rows.
3. Reconcile the 975 remaining rows against JO44/1985 plus every applicable subsequent register amendment.
4. Complete temporal parent/code lineage, duplicate/omission checks and valid-time adjudication.
5. Qualified Algerian legal/territorial-administration practitioner review.

P1-01 remains In Progress / Pending, P1-02 remains Blocked, and no commune data is imported.
