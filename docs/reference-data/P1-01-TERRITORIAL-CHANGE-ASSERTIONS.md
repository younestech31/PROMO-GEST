# P1-01 — Territorial change assertion ledger

**Prepared:** 17 November 2026  
**Purpose:** preserve individually identified territorial-composition, locality-parent and commune-name assertions in a machine-readable form without conflating them with the separate four-digit commune-register code/seat chain.  
**Status:** a bounded research ledger; not an exhaustive amendment inventory, not a legal opinion, and not the canonical 1,541-commune catalogue.

## Contents

`P1-01-TERRITORIAL-CHANGE-ASSERTIONS.csv` contains six source assertions:

- Decree 92-412 (JO 82/1992): the locality Afernou moves from Selma Benziada to Ziama Mansouriah (Jijel).
- Decree 93-11 (JO 03/1993): the mechtas Béni Amrous, Ahela and Azekar move from Kanoua to Charaia (Skikda), recorded as three separate locality assertions.
- Decree 93-12 (JO 03/1993): the commune name Aïn Hassainia changes to Houari Boumediene (Guelma).
- Decree 06-256 (JO 49/2006): the locality Oued El Meraâ moves from Hassi Ben Abdellah to Hassi Messaoud (Ouargla).

The broader inventory of the 2 June 1984 chief-lieu seat order and Decree 21-128 (2021) remains in [P1-01-TERRITORIAL-AMENDMENT-INVENTORY.md](P1-01-TERRITORIAL-AMENDMENT-INVENTORY.md). Those instruments are not flattened into individual rows here because their complete annexes have not been transcribed and reconciled in this pass.

## Evidence boundary

- For Decrees 93-11 and 93-12 (`JO 03/1993`), both French printed page 4 (`F1993003_pg04.png`) and Arabic printed page 5 (`A1993003_pg05.png`) have now been visually inspected (22 November 2026 supplement): Arabic source labels `بني عمروس`, `أهلية`, `أزقار` (transferred from `قنواع` to `الشرايع`), and `عين حساينية` → `هواري بومدين` are transcribed verbatim and fingerprinted by PNG SHA-256 in `P1-01-POST-1985-NAMING-INSTRUMENTS-BILINGUAL-READINGS.csv`. This records page-image readings by the audit process, not independent review by a legal practitioner.
- **Decree 92-412 (`JO 82/1992`) — bilingual page-image verification completed 27 November 2026:** the French official printed page 1723 and Arabic printed page 2100 were visually inspected. The Arabic source label for the transferred locality is `أفرنو`; the official text moves it from Selma Benziada to Ziama Mansouriah (Jijel). The Arabic PDF page locator is zero-based index 9; the French locator is index 6. The CSV row records `fr+ar` and both visual-review statuses. Only the existing French PDF byte hash is recorded; no Arabic PDF byte hash was captured in this pass. This does not establish a four-digit register-code change or an effective date, and it is not practitioner sign-off.
- **Decree 06-256 (`JO 49/2006`)** remains French text-layer reviewed only; its Arabic source label and Arabic page-image review remain outstanding. No visual verification is claimed for that instrument.
- Official French PDF binaries were retrieved and hashed: `F1992082.PDF` (SHA-256 `f6cbbf779516a525030dde63c1f43470ed9ba6a81818dea4ca4f56301d35d4c3`), `F1993003.pdf` (SHA-256 `3d2f5aebd8b59b35aa349d6803f092978bf3de661900f1c3f2569d7a28d278d3`), and `F2006049.pdf` (SHA-256 `30457eca5fdcb79937df35c2479373abf247f12bbaf8add685c0e7b0018b1320`); these exact hashes remain recorded in `P1-01-TERRITORIAL-CHANGE-ASSERTIONS.csv`. Arabic-edition PDF byte hashes for 1992/1993/2006 and visual checks for 1992/2006 remain pending.
- The `printed_page` field records the French printed page cited in the CSV (`4` for JO 03/1993 French; Arabic printed page is `5`, recorded in `P1-01-POST-1985-NAMING-INSTRUMENTS-BILINGUAL-READINGS.csv`), not the PDF page index. `pdf_page_index_zero_based` is populated only where identified.

## Data rules

| Field | Meaning / constraint |
|---|---|
| `assertion_id` | Stable identifier for this source assertion; not a PROMO GEST commune ID. |
| `entity_type` | The legal/territorial object named in the source: `locality`, `mechta`, or `commune`. |
| `assertion_type` | Type of change asserted by the instrument. |
| `subject_label_fr_source` / `subject_label_ar_source` | Verbatim source labels by language. Empty Arabic cells mean no Arabic source transcription was completed. |
| `change_from_fr` / `change_to_fr` | Verbatim old/new parent or old/new commune name, according to `assertion_type`. |
| `from_parent_commune_fr` / `to_parent_commune_fr` | Parent communes for locality transfers only. |
| `instrument_date` | Date printed as the instrument's date; not an asserted effective date. |
| `publication_date` | Date of the relevant Official Journal issue. Do not silently treat it as the legal effective date. |
| `printed_page` | Printed journal page cited for the source statement. |
| `french_visual_review_status` | Whether the cited French printed page image was reviewed in this audit. |
| `arabic_review_status` | Arabic primary-edition page review status: `page_image_visual_reviewed_in_this_audit` for the four `JO 03/1993` rows (AR p.5); `not_reviewed` for `DECR-92-412` and `DECR-06-256`. |
| `code_four_digit_source` | Deliberately blank: these territorial composition/name instruments do not assert a four-digit Decree 85-20 register code in the transcribed statement. |
| `code_assertion_status` | Records that the four-digit code is not stated by this instrument. A separate register-chain reconciliation is mandatory. |
| `effective_date_status` | All rows are `not_adjudicated`; the valid-time interval remains blank pending full instrument/legal review. |
| `practitioner_review_status` | All rows are `pending`; no professional acceptance is claimed. |
| `source_pdf_sha256` | Verified SHA-256 calculated from the exact downloaded official French PDF bytes (`F1992082.PDF`, `F1993003.pdf`, `F2006049.pdf`). |

## Non-negotiable reconciliation rules

1. Do not create or infer four-digit commune-register codes from these locality/territorial instruments or from a Wilaya prefix.
2. Do not merge commune names, localities, mechtas, parent communes, and chief-lieu seats into a single name/alias field.
3. Preserve each dated source assertion and its exact source spelling; do not overwrite historical labels.
4. Keep legal territorial parentage distinct from transitional operational authority.
5. Determine valid-from/valid-to only from the full applicable legal chain and qualified review; publication date is not automatically copied into `valid_from`.
6. This six-row ledger does not represent the 1,541 communes and does not satisfy the P1-01 national crosswalk acceptance criterion.

## Official source links

- [JO 82/1992 — Decree 92-412](https://www.joradp.dz/FTP/jo-francais/1992/F1992082.PDF)
- [JO 03/1993 — Decrees 93-11 and 93-12](https://www.joradp.dz/FTP/Jo-Francais/1993/F1993003.pdf)
- [JO 49/2006 — Decree 06-256](https://www.joradp.dz/FTP/jo-francais/2006/F2006049.pdf)

## Current decision

This artifact improves row-level source traceability only. It does not approve a canonical commune name, code, parent interval, seat, or import. P1-01 remains **In Progress / Pending**; P1-02 remains **Blocked**; `communesCount = 0` and `PendingOfficialVerification` remain unchanged.
