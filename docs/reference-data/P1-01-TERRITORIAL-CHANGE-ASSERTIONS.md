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

- Source language in this ledger is French only. Arabic source labels are deliberately blank; they must be transcribed from the corresponding Arabic primary edition, not translated or inferred.
- The French printed page 4 of JO 03/1993 was visually inspected during this audit for Decrees 93-11 and 93-12. This records a page-image reading by the audit process, not independent review by a legal practitioner.
- Decree 92-412 and Decree 06-256 are text-layer reviewed only in this pass. No visual verification is claimed for their printed pages.
- No PDF page crop or original PDF binary was preserved in the working runtime; therefore `source_pdf_sha256` is intentionally blank. Obtain the exact original JORADP bytes and compute SHA-256 before the source archive is treated as immutable evidence.
- The `printed_page` field is the page number printed in the Journal officiel, not the PDF page index. `pdf_page_index_zero_based` is populated only where that index was actually identified in this review.

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
| `arabic_review_status` | Arabic primary-edition page review status. All rows remain unreviewed. |
| `code_four_digit_source` | Deliberately blank: these territorial composition/name instruments do not assert a four-digit Decree 85-20 register code in the transcribed statement. |
| `code_assertion_status` | Records that the four-digit code is not stated by this instrument. A separate register-chain reconciliation is mandatory. |
| `effective_date_status` | All rows are `not_adjudicated`; the valid-time interval remains blank pending full instrument/legal review. |
| `practitioner_review_status` | All rows are `pending`; no professional acceptance is claimed. |
| `source_pdf_sha256` | Blank until calculated from the exact original PDF bytes. |

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
