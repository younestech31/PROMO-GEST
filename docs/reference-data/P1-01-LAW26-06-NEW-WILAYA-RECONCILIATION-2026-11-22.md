# P1-01 — Law 26-06 new-wilaya membership cross-check (11 wilayas)

**Audit date:** 2026-11-22  
**Scope:** 108 uploaded commune-candidate rows assigned to the 11 newly listed wilayas (codes 59–69), cross-checked against the territorial membership lists added to Law 84-09 by Law 26-06 and the supplementary JO61/2026 APC electoral schedule.  
**Disposition:** partial source reconciliation; candidate records remain unapproved.

## 1. Controlling legal source and limits

The official Arabic Journal Officiel No.25, dated 5 April 2026, publishes Law 26-06 of 4 April 2026. Article 3 states the national baseline of 69 wilayas and 1,541 communes (printed p.4). The amended Law 84-09 text then inserts the new-wilaya commune-membership lists in Article 52 bis, numbered items 10–20, printed pp.9–11.

| Law 84-09 amended list item | Wilaya named in the law | Archive-local code (not official) | Official 26-206/JO58 code | Uploaded commune rows |
|---:|---|---:|---:|---:|
| 10 | Aflou | 59 | 59 | 12 |
| 11 | Barika | 63 | 60 | 8 |
| 12 | El Kantara | 62 | 61 | 5 |
| 13 | Bir El Ater | 65 | 62 | 4 |
| 14 | El Aricha | 61 | 63 | 4 |
| 15 | Ksar Chellala | 67 | 64 | 6 |
| 16 | Ain Oussara | 68 | 65 | 10 |
| 17 | Messaad | 69 | 66 | 8 |
| 18 | Ksar El Boukhari | 66 | 67 | 21 |
| 19 | Bou Saada | 64 | 68 | 23 |
| 20 | El Abiodh Sidi Cheikh | 60 | 69 | 7 |
| **Total** | **11 wilayas** | — | — | **108** |

The Article 52 bis item numbers (10–20) are not the official Wilaya codes. The authoritative official codes are fixed by Presidential Decree 26-206 (JO40/2026, Art.1) and independently repeated in the JO58/2026 register annex, printed p.9: Aflou 59, Barika 60, El Kantara 61, Bir El Ater 62, El Aricha 63, Ksar Chellala 64, Ain Oussara 65, Messaad 66, Ksar El Boukhari 67, Bou Saada 68 and El Abiodh Sidi Cheikh 69. Those are also the JO61 Annex II new-Wilaya headings. The uploaded archive misassigns the Wilaya codes for ten of these eleven names (only Aflou/59 matches); its wilaya_code values are archive-local identifiers, not official code assertions. All comparisons in this reconciliation are by Wilaya name, never by the uploaded code. See [the code-mapping correction audit](P1-01-UPLOADED-WILAYA-CODE-MAPPING-CORRECTION-2026-11-22.md).

**Important legal boundary:** JO61/2026 Decree 26-282 is an APC/APW electoral constituency and seat schedule. Organic Law 21-01 Article 124 allows an electoral constituency to consist of part of a commune, one commune, or several communes. Therefore, even where an Annex II table has the same number of rows as the territorial list, row equality alone is not proof of a one-to-one legal commune identity. JO25/2026 is the controlling territorial membership source for this comparison.

## 2. Count reconciliation

The uploaded ZIP contains 108 commune rows across the 11 new wilayas. The statutory Article 52 bis items 10–20 also enumerate 108 commune names across those 11 wilayas. **All 11 per-wilaya row counts match the statutory count.**

This is a useful count control, not an identity result. Two of the 11 wilaya groups contain substantive name-set discrepancies, despite matching counts.

## 3. Name comparison method and summary

The comparison was made by joining on the named wilaya, not the numeric JO61 heading. French names were compared after case folding, accent/diacritic removal, and removal of whitespace and punctuation. This strict normalization deliberately does not reorder words or treat similar-sounding names as identical. Potential spelling/transliteration variants were then listed separately for human review; they are not silently merged.

| Wilaya | Law list count | Uploaded count | Exact normalized name matches | Potential variants | Unmatched names in each list |
|---|---:|---:|---:|---:|---:|
| Aflou | 12 | 12 | 12 | 0 | 0 |
| Barika | 8 | 8 | 7 | 1 | 0 |
| El Kantara | 5 | 5 | 4 | 1 | 0 |
| Bir El Ater | 4 | 4 | 3 | 1 | 0 |
| El Aricha | 4 | 4 | 3 | 1 | 0 |
| Ksar Chellala | 6 | 6 | 3 | 3 | 0 |
| Ain Oussara | 10 | 10 | 8 | 2 | 0 |
| Messaad | 8 | 8 | 7 | 1 | 0 |
| Ksar El Boukhari | 21 | 21 | 16 | 5 | 0 |
| Bou Saada | 23 | 23 | 15 | 4 | 4 |
| El Abiodh Sidi Cheikh | 7 | 7 | 3 | 1 tentative alias | 3 |
| **Total** | **108** | **108** | **81** | **20** | **7 legal-list-only + 7 uploaded-only** |

The “potential variants” column is a review queue, not an acceptance count. The 81 strict normalized matches and 20 candidate variants together suggest 101 likely name pairings; none has received a practitioner sign-off through this audit. The seven names present only in the statute and seven present only in the uploaded group require resolution against primary source and administrative lineage before deciding whether they represent parent transfer, changed scope, a name variant, or erroneous grouping.

### 3.1 Potential spelling/order variants requiring review

| Wilaya | Statutory/JO61 text-layer reading | Uploaded reading | Note |
|---|---|---|---|
| Barika | Abdelkader Azil | Azil Abedelkader | Word order and spelling differ |
| El Kantara | Djemourah | Djemorah | Vowel/transliteration variant |
| Bir El Ater | El Ogla El Melha | El Ogla El Malha | Vowel/transliteration variant |
| El Aricha | El Bouihi | Bouihi | Leading article omitted in uploaded name |
| Ksar Chellala | Zmalet El Emir Abdelkader | Zmalet El Emir Abdelkade | Uploaded value appears truncated |
| Ksar Chellala | Hammadia | Hamadia | Consonant/vowel variant |
| Ksar Chellala | Serguine | Serghine | Consonant variant |
| Ain Oussara | Ain Ouessara | Ain Oussera | Vowel/transliteration variant |
| Ain Oussara | Sidi Ladjel | Sidi Laadjel | Vowel/transliteration variant |
| Messaad | Faid El Botma | Faidh El Botma | Transliteration variant |
| Ksar El Boukhari | Ouled Maaref | Ouled Emaaraf | Transliteration variant |
| Ksar El Boukhari | Sidi Damed | Sidi Demed | Vowel/transliteration variant |
| Ksar El Boukhari | Chahbounia | Chabounia | Vowel/transliteration variant |
| Ksar El Boukhari | Oum El Djallil | Oum El Djellil | Vowel/transliteration variant |
| Ksar El Boukhari | Boughezoul | Boughzoul | Consonant/transliteration variant |
| Bou Saada | Mouhamed Boudiaf | Mohamed Boudiaf | Given-name spelling variant |
| Bou Saada | Ain El Meleh | Ain El Melh | Vowel/transliteration variant |
| Bou Saada | Ain Errich | Ain Rich | Vowel/transliteration variant |
| Bou Saada | Oultem | Oulteme | Trailing-vowel variant |
| El Abiodh Sidi Cheikh | El Abiodh Sidi Cheikh | Labiodh Sidi Cheikh | Tentative main-name/alias candidate; do not merge without evidence |

### 3.2 Bou Saada — four unresolved names on each side

The statutory Article 52 bis item 19 list (23 entries) contains four names not found in uploaded wilaya code 64:

- Khoubana
- M'Cif
- El Houamed
- Djebel Messaad

Uploaded wilaya code 64 contains four names not found in that statutory list:

- M'tarfa
- Maadid
- Maarif
- Sidi Hadjeres

The other 15 are exact normalized matches; four additional pairs are listed above as potential spelling variants. The matching total of 23 does not resolve the four-versus-four set difference.

### 3.3 El Abiodh Sidi Cheikh — three unresolved names on each side

The statutory Article 52 bis item 20 list contains seven names. Three are exact normalized matches with uploaded wilaya code 60: Arbaouat, Boussemghoun and Chellala. A fourth possible correspondence is statutory “El Abiodh Sidi Cheikh” versus uploaded “Labiodh Sidi Cheikh”; this remains a tentative alias candidate, not an accepted match.

Statutory names not found in the uploaded group:

- Ain El Orak
- El Bnoud
- El Meharra

Uploaded names not found in the statutory group:

- Brezina
- Cheguig
- Ghassoul

The equal count of seven on each side therefore masks three unresolved names on each side, even if the tentative main-name alias is eventually confirmed.

## 4. JO61 Annex II cross-check

The French searchable-text rendering of JO61 Annex II confirms the following new-wilaya electoral-table row counts by name:

| JO61 Annex II heading | Wilaya | Electoral-table rows | Total APC seats |
|---:|---|---:|---:|
| 59 | Aflou | 12 | 186 |
| 60 | Barika | 8 | 140 |
| 61 | El Kantara | 5 | 71 |
| 62 | Bir El Ater | 4 | 74 |
| 63 | El Aricha | 4 | 58 |
| 64 | Ksar Chellala | 6 | 106 |
| 65 | Ain Oussara | 10 | 184 |
| 66 | Messaad | 8 | 138 |
| 67 | Ksar El Boukhari | 21 | 325 |
| 68 | Bou Saada | 23 | 369 |
| 69 | El Abiodh Sidi Cheikh | 7 | 97 |
| **Total** | **11 wilayas** | **108** | **1,748** |

The 108 row count matches both the uploaded count and the statutory counts for the 11 territories. Seat totals are electoral seat allocations, not commune counts. The JO61 names for Bou Saada and El Abiodh Sidi Cheikh reproduce the same substantive name-set discrepancy against the uploaded archive described above. This confirms that the issue is not simply caused by comparing the uploaded administrative code with JO61's different heading number. It still does not turn an electoral district into a legal commune record.

**Source limitation:** the JO61 Arabic/French binary copies in .tmp-joradp have the previously recorded SHA-256 hashes and Git blob identifiers. The row-level French text used in this bounded comparison was available as a searchable PDF text-layer reproduction. Page-image screenshot attempts for JO61 returned Cache miss; no visual page-image review of JO61 is claimed. The full 69-wilaya Annex II enumeration and its bilingual row-level reconciliation remain open under P1-35.

## 5. Transitional administration and effective dates

Law 26-06's amended transitional Article 54 provides for original-wilaya authorities to continue exercising their functions as needed while the executive structures and services of the new wilayas are installed and organized, with powers transferred progressively and no later than **31 December 2026**. The accompanying Articles 55 and 57 address the existing wilayas' 2026 budget/appropriations during the transition.

These transition provisions are a warning not to infer the effective date of a particular commune parent/name/coding record from the existence of a new wilaya or an electoral heading. Do not populate valid_from from these aggregate transition rules. A qualified Algerian legal reviewer must decide the precise legal event and effective-time semantics for each disputed row.

## 6. Evidence quality and unresolved controls

- JO25/2026 is the official Arabic Gazette PDF. The statutory list text for Article 52 bis items 10–20 is searchable in the PDF text layer. Printed page 11 (including the end of the Bou Saada list and all seven El Abiodh Sidi Cheikh entries) was visually inspected. The screenshot service returned Cache miss for printed pages 9–10; therefore, those two pages remain text-layer-only in this pass.
- JO25/2026 Article 3's 69/1,541 total on printed p.4 was previously visually checked in the Arabic and French official editions.
- JO61/2026 Annex II new-wilaya entries were text-layer checked; no JO61 page-image visual review is claimed because screenshot requests returned Cache miss.
- The uploaded ZIP's 69/591/1,541 structure and its SHA-256 fingerprints are recorded in P1-01-UPLOADED-DATASET-AUDIT-2026-11-22.md.
- The statutory count equality and JO61 row equality are arithmetic controls only; they do not approve a name, code, legal parent, or date.

## 7. Disposition

Keep the uploaded data as **candidate-only comparison material**. Route the 7 Bou Saada / El Abiodh unmatched candidate names and their 7 statutory counterparts, plus the 20 spelling/order variants, to the P1-01 source-decision queue. Preserve each source spelling verbatim. Do not substitute a guessed alias, infer a parent, alter the 1,541-row ledger, or populate valid_from.

All 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE; no commune import; communesCount=0; P1-01 remains In Progress/Pending; P1-02 remains Blocked.

## 8. Sources

- [Official JORADP JO25/2026 Arabic PDF — Law 26-06](https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf) (Article 3, printed p.4; amended Law 84-09 Article 52 bis, items 10–20, printed pp.9–11; transitional Articles 54, 55 and 57, printed pp.11–12).
- [Official JORADP JO25/2026 French PDF — Law 26-06](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf) (official counterpart; the relevant pp.9–11 French image/text extraction was not available in this pass).
- [Official JORADP JO61/2026 French PDF — Decree 26-282](https://www.joradp.dz/FTP/jo-francais/2026/F2026061.pdf) (Annex II new-wilaya sections, printed pp.31–35; searchable text was obtained from a reproduction, not visually page-inspected).
- [Official JORADP JO61/2026 Arabic PDF — Decree 26-282](https://www.joradp.dz/FTP/jo-arabe/2026/A2026061.pdf).
- [Organic Law 21-01 — JO17/2021](https://www.joradp.dz/FTP/jo-francais/2021/F2021017.pdf), Article 124, printed p.18.
