# P1-01 — Historical register reconciliation supplement (JO79 existing Wilayas)

**Prepared:** 18 November 2026  
**State:** FR & AR VISUAL PNG VERIFIED (ALL 103 ROWS) — NOT LEGALLY APPROVED

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

All 103 rows were extracted from the official French (`F2021079.pdf`, SHA-256 `7ca010b9856fea63d4bd8c90cadaa088bbe0e9194d1e0f8edb64e507c57a984e`) and Arabic (`A2021079.pdf`, SHA-256 `288ea0da7013d8c18530a5b03c22a91cb25f40d9fe7ea7c356ecc0fc2b4433da`) JORADP editions, keeping commune name, code and seat as separate fields. Rendered PNG page images for **French printed pp. 13–16** and **Arabic printed pp. 15–18** have now been visually inspected across all 103 rows. Visual inspection does not substitute for qualified Algerian practitioner sign-off.

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

The fifth Biskra row, `Djemorah / 0720` (JO79 French p. 14) vs `Djemourah / 6105` (JO58 French p. 22), is now visually verified in both Arabic editions as sharing the exact same Arabic spelling **`جمورة`** (JO79 Arabic p. 16 `جمورة | 0720 | جمورة` vs JO58 Arabic p. 22 `جمورة | 6105 | جمورة`), isolating the difference to a one-letter French vowel shift (`o` → `ou`). Keep the French pair formally unlinked until practitioner sign-off approves the dated transition/alias.

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

## 6. Verification completed and required remaining evidence

1. *(Completed — 18 November 2026)* Exact PDF SHA-256 checksums computed for both French (`F2021079.pdf`) and Arabic (`A2021079.pdf`) JO79/2021 editions and JO58/2026 (`F2026058.pdf`, `A2026058.pdf`); all 103 existing-Wilaya rows visually PNG-inspected across JO79 French pp. 13–16 and Arabic pp. 15–18.
2. *(Completed for disputed sections)* JO44/1985 (Boumerdès/El Tarf/M'Sila/El Oued FR pp. 1065–1070 & AR pp. 1631–1635), JO11/1986 (pp. 280–281 FR & 401–402 AR), and JO23/1998 (Boumerdès FR p. 11 & AR p. 13) PNG-inspected.
3. Reconcile the 975 remaining rows across 30 unmodified Wilayas against the full JO44/1985 register and every applicable subsequent register amendment.
4. Complete temporal parent/code lineage, duplicate/omission checks and valid-time adjudication across all 1,541 units.
5. Qualified Algerian legal/territorial-administration practitioner review and dated sign-off.

P1-01 remains In Progress / Pending, P1-02 remains Blocked, and no commune data is imported.
