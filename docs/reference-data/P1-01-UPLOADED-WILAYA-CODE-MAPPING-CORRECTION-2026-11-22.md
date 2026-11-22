# P1-01 — Correct official Wilaya-code mapping in the uploaded 2026 candidate archive

**Audit date:** 22 November 2026  
**Evidence baseline:** main a01fc8f315e15d4ece87c536e681b815d3f373b5  
**Input:** user-supplied archive fingerprint dd35a4f9f44117c4f0fda7bc34277aa98b6cb874bed975f18c3c38665d1b79ae  
**Disposition:** critical source-data defect confirmed; archive remains candidate-only and must not be imported.

## 1. Authoritative official code sequence

Two official sources establish the 2026 numeric codes for the 11 new Wilayas:

- Presidential Decree **26-206 of 25 May 2026**, JO40/2026, Article 1, which amends Decree 84-79 and expressly assigns codes 59–69 to the new Wilayas.
- JO58/2026, Annex titled **“Liste des wilayas / Numéros de code”**, printed p.9, which independently publishes the same name/code pairs with the 2026 territorial-register amendment.

| Official Wilaya code | Official Wilaya name | Code in uploaded wilayas.csv | Name attached to that uploaded code | Uploaded commune rows | Uploaded daira rows | Result |
|---:|---|---:|---|---:|---:|---|
| 59 | Aflou | 59 | Aflou | 12 | 5 | **Code/name pair matches** |
| 60 | Barika | 63 | Barika | 8 | 3 | Mismatched code |
| 61 | El Kantara | 62 | El Kantara | 5 | 3 | Mismatched code |
| 62 | Bir El Ater | 65 | Bir El Ater | 4 | 2 | Mismatched code |
| 63 | El Aricha | 61 | El Aricha | 4 | 2 | Mismatched code |
| 64 | Ksar Chellala | 67 | Ksar Chellala | 6 | 3 | Mismatched code |
| 65 | Aïn Oussara | 68 | Ain Oussara | 10 | 4 | Mismatched code |
| 66 | Messaad | 69 | Messaad | 8 | 2 | Mismatched code |
| 67 | Ksar El Boukhari | 66 | Ksar El Boukhari | 21 | 6 | Mismatched code |
| 68 | Bou Saada | 64 | Bou Saada | 23 | 11 | Mismatched code |
| 69 | El Abiodh Sidi Cheikh | 60 | El Abiodh Sidi Cheikh | 7 | 5 | Mismatched code |
| **Total** | **11 Wilayas** | — | — | **108** | **46** | **10 of 11 new-Wilaya codes are wrong in the upload** |

The uploaded CSV gets the **name of each Wilaya** but attaches the wrong official numeric code to ten of the eleven names. Only Aflou (59) matches. This is a systematic code-assignment defect, not an uncertainty about transliteration or legal parentage.

## 2. Why the finding is definitive

Decree 26-206 Article 1 (JO40/2026) states the new-Wilaya mapping explicitly:
- 59 Aflou
- 60 Barika
- 61 El Kantara
- 62 Bir El Ater
- 63 El Aricha
- 64 Ksar Chellala
- 65 Aïn Oussara
- 66 Messaad
- 67 Ksar El Boukhari
- 68 Bou Saada
- 69 El Abiodh Sidi Cheikh

JO58/2026's official French register annex, printed page 9, independently lists exactly the same pairs in its WILAYAS / NUMEROS DE CODE table. The row-level JO58 108-commune extract already stored in this repository also uses those codes and links the names to the P1-01 candidate workpaper rows using the official sequence. The official code order must not be inferred from the order in the uploaded wilayas.csv, from a third-party JSON source, or from the Article 52 bis item number.

## 3. Propagation into the uploaded CSVs and generator

The uploaded generate_db.py downloads upstream JSON from a moving jsDelivr @main reference and writes the upstream wilaya_code into the uploaded CSVs. It then generates:
- daira IDs as <wilaya_code>-<sequence> (for example 60-01);
- commune IDs as <wilaya_code>-<sequence> (for example 60-001).

Those generated identifiers inherit the incorrect code/name association. Within the affected ten new-Wilaya groups:
- **10/11** uploaded Wilaya code/name pairs are inconsistent with Decree 26-206 and the JO58 code list.
- **46** daira rows are grouped under those affected uploaded Wilaya code/name pairs; their sequence identifiers are synthetic, not official Daira codes.
- **96** commune rows in the ten mismatched groups inherit the wrong uploaded Wilaya code prefix, and their sequence identifiers are synthetic. Aflou contributes the remaining 12 of the 108 new-Wilaya rows and is the sole matching code/name pair.
- The 108 uploaded rows remain internally count-consistent (12+8+5+4+4+6+10+8+21+23+7 = 108), but count equality does not validate the associated Wilaya code.

The upload's 1,541-row and 591-row structural checks do not detect this defect because their internal hierarchy consistently repeats the same incorrect source mapping. The code values must not be used as official administrative identifiers, permanent PROMO-GEST identities, or evidence of parentage.

## 4. Correction to earlier candidate-group findings

The previous P1-01 notes correctly compared candidate groups by their **Wilaya names**, but some shorthand such as “uploaded code 64 / Bou Saada” and “uploaded code 60 / El Abiodh Sidi Cheikh” could be mistaken for official Wilaya codes. They are **upload-local group keys only**. The official codes are:
- Bou Saada = **68**, not 64.
- El Abiodh Sidi Cheikh = **69**, not 60.
- Ksar Chellala = **64**, not 67.
- Barika = **60**, not 63.
- El Kantara = **61**, not 62.
- Bir El Ater = **62**, not 65.
- El Aricha = **63**, not 61.
- Aïn Oussara = **65**, not 68.
- Messaad = **66**, not 69.
- Ksar El Boukhari = **67**, not 66.

The name-set discrepancies previously identified for the upload groups labelled Bou Saada and El Abiodh Sidi Cheikh remain valid **when matched by Wilaya name**:
- Upload group labelled Bou Saada (local wilaya_code=64) has 4 candidate names assigned in Law 26-06 to M'Sila and lacks 4 names in the statutory Bou Saada list. Its official Wilaya code is 68.
- Upload group labelled El Abiodh Sidi Cheikh (local wilaya_code=60) has 3 candidate names assigned in Law 26-06 to El Bayadh and lacks 3 names in the statutory El Abiodh Sidi Cheikh list. Its official Wilaya code is 69.

The local candidate IDs such as 64-001 and 60-006 are locators inside the supplied archive only. They are not government commune codes and their prefixes must not be construed as official Wilaya parents.

## 5. Corrected candidate-only disposition

1. Preserve the exact uploaded ZIP and CSV fingerprints as audit evidence; do not edit the files in place or silently remap their sequence identifiers.
2. Do not reuse the uploaded ten new-Wilaya code/name pairs, daira IDs, commune IDs, or generated parents as official reference data.
3. If this archive is ever used as a name-discovery aid, resolve each row by source-backed Wilaya **name and legal statutory membership**, then independently reconcile the official code from Decree 26-206 and JO58. Never join by the uploaded code.
4. Treat the JO58 108-row official register extract and its recorded bilingual page-image review as the relevant official code/name/seat source layer; its practitioner-review and effective-date fields remain pending. Do not infer valid_from merely from the order date or publication date.
5. Keep the JO52 Daira-Chief assignment schedule separate from territorial parentage; it does not validate the archive's generated daira identifiers.
6. No candidate correction or import is authorised by this audit. The PROMO-GEST master legal ledger is not overwritten.

## 6. PROMO-GEST status

- P1-01 remains **In Progress / Pending**.
- P1-35 remains **In Progress / Pending** until the full bilingual row-level Annex II reconciliation and legal interpretation are complete.
- P1-02 remains **Blocked** pending P1-01 acceptance.
- All 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE.
- communesCount = 0; no commune import.
- No production data, database, runtime, API, schema, or migration was changed.

## 7. Official sources

- [JORADP JO40/2026 French — Presidential Decree 26-206, Article 1](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf).
- [JORADP JO40/2026 Arabic — Presidential Decree 26-206, Article 1](https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf).
- [JORADP JO58/2026 French — official Wilaya name/code table, printed p.9, and 2026 register annex](https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026058.pdf).
- [JORADP JO58/2026 Arabic](https://www.joradp.dz/FTP/jo-arabe/2026/A2026058.pdf).
- [JORADP JO25/2026 French — Law 26-06 and amended territorial membership lists](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf).
