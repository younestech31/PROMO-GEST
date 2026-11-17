# P1-01 — Third-party candidate dataset audit

**Audit date:** 17 November 2026  
**Scope:** read-only inspection of public community datasets. No third-party data was copied into the PROMO GEST operational reference, API, database, or seed files.

## Executive result

Two public repositories advertise 1,541 communes and the 69-Wilaya 2026 structure. One is the source of the other repository's commune-to-Wilaya assignment, so they are **not independent confirmations**.

The `islam-re` CSV has 1,541 data rows, 69 consecutive Wilaya codes (01–69), and 1,541 unique (Wilaya code + Latin commune name) keys. Its CSV rows are not legal four-digit commune-register codes. Its README states the data follows Law 26-06 / JO No. 25, and its MIT licence allows inspection and reuse subject to the licence; this audit does not redistribute that data.

Against the `JO Article 2026.md` transcription in the **same repository**, the 21 Wilayas explicitly named in Articles 7, 9, 11, 16, 17, 18, 21, 30, 32, 36 and 52 bis 10–20 match:
- 10 parent Wilayas: 296 commune names and counts;
- 11 new Wilayas: 108 commune names and counts;
- total: **404/404** listed names match after Unicode accent, punctuation, apostrophe, case and whitespace normalization (word order retained), with zero missing names, extra names or within-Wilaya duplicate keys in that comparison.

This is a useful candidate-quality signal for the 2026 legal composition. It is **not independent legal verification**: both the CSV and the JO article transcription are published in the same community repository; the original JORADP PDF page images were not visually verified in this pass. The remaining **1,137 rows across the other 48 Wilaya codes** were not individually reconciled against their complete effective legal instrument chain. This does not produce the 1,541-row legal-provenance concordance required by P1-01.

## Candidate A — islam-re/Algeria-wilayas

- Repository: https://github.com/islam-re/Algeria-wilayas
- Main branch commit inspected: `bfb29814117d11a6a101fa07c38911f6675b748b` (2026-07-30).
- Licence: MIT (`LICENSE` blob `0b6a7edecef8f74a3d64b4fc3475656a9a787321`).
- Candidate data: `csv/wilaya-commune/wilaya-commune.csv`, blob SHA `84c911da4f12a33dddd0451b424249c594f1864d`.
- Law transcription: `JO Article 2026.md`, blob SHA `73d32b1c211ea06211cdf8d69f14630811f62d0e`.
- Measured: 1,541 rows; 69 Wilaya codes; 1,541 unique (code, Latin commune name) keys; no duplicate key detected; selected 21-Wilaya comparison as detailed in the CSV.
- Schema fields: Wilaya code, Arabic/ASCII Wilaya names, Arabic/ASCII commune names. It does not provide the four-digit legal commune-register identifier, seat of municipality, legal interval, instrument/page provenance per row, or a verified source PDF hash.
- The 48 other Wilaya groups (1,137 rows) remain unchecked against the full historical legal chain in this audit.

## Candidate B — riadh2002/algeria-69-wilayas-1541-communes

- Repository: https://github.com/riadh2002/algeria-69-wilayas-1541-communes
- Main branch commit inspected: `5daab758b59c1421f38180b7e8bc83830a7612fc` (2026-08-14).
- Licence: MIT according to its README; its `NOTICE` attributes the Wilaya assignment, Latin/Arabic Wilaya names and reproduced JO article to Candidate A. It explicitly uses Candidate A for the commune-to-Wilaya assignment, so it is not a second independent assignment source.
- Candidate data: `data/communes.csv`, blob SHA `1368db5d4d4d1f12c8f02226a182de9bc450cc54`.
- Measured: 1,541 rows; 1,541 unique internal IDs; 1,541 unique five-digit post codes. Its README itself says 70 postal-code prefixes do not match the current Wilaya code; the `post_code` must not be treated as the Wilaya code or the statutory four-digit commune code.
- Three concrete internal field-identity conflicts are recorded in [the mismatch CSV](P1-01-THIRD-PARTY-FIELD-MISMATCHES.csv):
  1. Candidate internal ID 131, Wilaya 60: Latin `Metkaouak` vs Arabic `عزيل عبد القادر`, while the law transcription lists `Abdelkader Azil`.
  2. Candidate internal ID 1028, Wilaya 68: Latin `Oued Chair` vs Arabic `محمد بوضياف`, while the law transcription lists `Mouhamed Boudiaf`.
  3. Candidate internal ID 1033, Wilaya 68: Latin `Ouled Atia` vs Arabic `منعة`, while the law transcription lists `Menaâ`.
- These are candidate-file field mismatches, not independent proof of the authoritative registered labels. Keep the records excluded until the primary legal texts and official bilingual source names are reconciled.

## Additional variants requiring official review

- Candidate B spells Chihani Arabic as `شهانى`; Candidate A and the ONS 2021 table text layer use `شحاني`.
- Candidate B spells Raml Souk Arabic as `رمل سوق`; Candidate A and the ONS 2021 table text layer use `رمل السوق`.
- These are variants requiring official bilingual adjudication; this audit does not label them as legal errors.

## Evidence and reproducibility limits

1. The 21-Wilaya cross-check compares the CSV to the JO article transcription stored beside it in Candidate A; it does not compare directly to all 21 scanned official Gazette pages.
2. Page-image checks for JO25, JO44/1985, JO23/1998, JO58/2026 and ONS 2021 returned cache/download failures during the current audit. No visual-verification claim is made for them.
3. The exact original JORADP/ONS PDF bytes were not available in the working runtime, so source PDF SHA-256 values were not calculated.
4. No full historical code lineage, seat-of-commune crosswalk, effective-date interval or practitioner sign-off is delivered by either community dataset.
5. The comparison normalization removes diacritics/accents and punctuation differences, lowercases text, normalizes apostrophes and whitespace, but preserves token order. A normalized match is not a legal adjudication of the preferred spelling.

## PROMO GEST decision

- Do not import either third-party CSV/JSON/SQL file into PROMO GEST.
- Do not use five-digit postal codes or third-party row IDs as statutory administrative identifiers.
- Do not use either candidate as sole authority for Arabic names, seats, four-digit legal codes or effective dates.
- Candidate A may be used as a **discrepancy-discovery aid only**, and Candidate B as a **cross-field anomaly discovery aid only**, until their records are reconciled against primary legal evidence.
- P1-01 remains **In Progress / Pending**; P1-02 remains **Blocked**; `communesCount = 0` and `PendingOfficialVerification` remain unchanged.
