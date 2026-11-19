# P1-01 — JO44/1985 final eight sections: French searchable-text cross-check

**Audit date:** 19 November 2026  
**Evidence type:** manual row-by-row comparison against the searchable text layer of the official French JORADP PDF; not a page-image review.  
**Primary source:** [Journal officiel de la République algérienne, 24th year, No. 44, 23 October 1985 — official JORADP French PDF](https://www.joradp.dz/FTP/jo-francais/1985/F1985044.PDF)  
**Instrument:** Interministerial order of 22 June 1985 fixing the register of territorial collectivities established under Article 1 of Decree No. 85-20 of 2 February 1985.  
**Source SHA-256 recorded in the extracts:** `bc9f42cbf3d7bb1fc576383ea8d7194d6ae7a06945003b5ede31581e9a48daf2`.

## Scope

This check covers the eight JO44/1985 sections added by PR #134. The three source columns — commune label, register code and administrative seat — were kept distinct. Each source CSV was compared to the corresponding official French searchable-text table. The extracted values match the searchable text for all **253 rows**. This is not a pixel/image verification and does not certify the underlying printed glyphs.

| Wilaya | Section count | Register-code span | Printed page(s) in extract | Searchable-text observation |
|---|---:|---|---|---|
| 39 — El Oued | 30 | 3901–3930 | 1070 | The PDF text order places the continuation rows 3920–3930 before the primary 3901–3919 block; the CSV restores ascending code order without changing the extracted source values. |
| 40 — Khenchela | 21 | 4001–4021 | 1070 | 21 rows; commune and seat columns remain separate. |
| 41 — Souk Ahras | 26 | 4101–4126 | 1071 | 26 rows; source spellings and seat strings are preserved literally. |
| 42 — Tipaza | 42 | 4201–4242 | 1071 | 42 rows; register codes are sequential. |
| 43 — Mila | 32 | 4301–4332 | 1071 (first 4 rows), 1072 (remaining 28) | The page break falls after 4304; the extract retains per-row printed-page attribution. |
| 44 — Aïn Defla | 36 | 4401–4436 | 1072 | The searchable text emits the continuation block 4409–4436 before the primary heading and rows 4401–4408; the CSV restores ascending code order. |
| 46 — Aïn Témouchent | 28 | 4601–4628 | 1073 | 28 rows; source forms and the seat column are not normalised. |
| 48 — Relizane | 38 | 4801–4838 | 1073 (first 21 rows), 1074 (remaining 17) | Page 1074 presents two separately labelled tables, “Partie gauche” and “Partie droite”; the CSV preserves the source rows in ascending register-code order. |
| **Total** | **253** |  | **1070–1074** |  |

## Literal forms intentionally preserved

The following source strings may look unusual, but they are present in the official searchable text and are retained rather than silently corrected:

- W40: `Kais`, `Ain Touila`, `El Ouel dja`.
- W41: `Han ancha`, `Bir Louhou chi`, and seat/name pairs such as `Tiffech / Salah Dib`, `Quillen / Bou Kebch`.
- W42: `Agnbal`, seat `Loudalouze`, and `Béni Milleuk / Bouyamine`.
- W43: `Amira Arras / Tassaf(t)`, `Derradji Bousselah / Merouana`, and `Elayadi Barbès / Elayadi`.
- W46: `Chaâbet El Ham / Chaabet El Ham` and `Tadmaya / Sidi Ourrach`.
- W48: `Souk El Haad`, `El Hassl`, and `Ben daoud / Bendaoud`.

These are source-transcription observations only. This audit does not infer modern spellings, identity equivalence, code corrections or current legal validity.

## Structural checks on the eight merged CSV extracts

Independent read-back of the eight files on main confirmed:
- 253 data rows in total, matching the eight declared section counts.
- Each section's assertion IDs and row order are consecutive.
- Each section's four-digit register codes are consecutive within its Wilaya prefix and agree with the declared span above.
- Every row carries the same 64-character SHA-256 shown above.
- The recorded printed-page values follow the page distribution in the table.
- The source rows retain the disposition `HISTORICAL_SOURCE_ASSERTION_ONLY_NOT_APPROVED`, visual status `NOT_VISUALLY_VERIFIED`, Arabic-pair status `NOT_REVIEWED_IN_THIS_SLICE`, candidate join status `NOT_JOINED_TO_CANDIDATE_CROSSWALK`, and current legal-effect status `PENDING_LATER_AMENDMENT_AND_VALID_TIME_RECONCILIATION`.

The strengthened validator introduced in [PR #134](https://github.com/younestech31/PROMO-GEST/pull/134) also checks the official PDF URL and source SHA-256 in every row of the 48-Wilaya control file, in addition to the extract structure and provenance.

## Explicit limitations and next acceptance gates

1. **Visual source inspection is not complete.** The web PDF screenshot service returned `Cache miss` for the official PDF page request. A direct binary download was not available in this review environment. Accordingly, none of these 253 rows is marked visually verified.
2. **Arabic pairing is not complete.** The official [JORADP Arabic archive calendar for 1985](https://www.joradp.dz/JRN/ZA1985.htm) lists issue No. 44 in the October 1985 sequence. However, the calendar link exposed to this review resolved to a generic PDF icon rather than the issue file, and the expected direct Arabic PDF path (`/FTP/jo-arabe/1985/A1985044.pdf`) was inaccessible. This review therefore confirms the archive entry but does not claim to have read or paired the Arabic tables. No secondary-hosted copy was used as a legal substitute. Arabic labels must be paired from an authenticated official Arabic source before candidate approval.
3. **Later legal lineage is not adjudicated.** The 1985 register is a historical source assertion. Later amendments, new-Wilaya arrangements, legal parentage, transition of operational authority and effective dates still require their own source-by-source reconciliation.
4. **No candidate identity or current-validity decision is made.** Matching French text, code sequence and section totals does not prove that a 1985 row is a current commune identity.
5. **No data was imported.** `communesCount = 0`; all 1,541 workpaper candidates remain unapproved; P1-01 stays In Progress / Pending and P1-02 stays Blocked.

**Outcome:** the final eight JO44 French searchable-text extracts pass this additional text-layer cross-check and structural read-back. The evidence level is improved, but P1-01 is not complete and no legal approval is inferred.
