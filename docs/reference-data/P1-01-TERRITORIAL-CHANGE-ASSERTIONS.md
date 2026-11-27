# P1-01 — Territorial change assertion ledger

**Prepared:** 17 November 2026  
**Purpose:** preserve individually identified territorial-composition, locality-parent and commune-name assertions in a machine-readable form without conflating them with the separate four-digit commune-register code/seat chain.  
**Status:** a bounded research ledger; not an exhaustive amendment inventory, not a legal opinion, and not the canonical 1,541-commune catalogue.

## Contents

`P1-01-TERRITORIAL-CHANGE-ASSERTIONS.csv` contains eleven source assertions:

- Decree 92-412 (JO 82/1992): the locality Afernou moves from Selma Benziada to Ziama Mansouriah (Jijel).
- Decree 93-11 (JO 03/1993): the mechtas Béni Amrous, Ahela and Azekar move from Kanoua to Charaia (Skikda), recorded as three separate locality assertions.
- Decree 93-12 (JO 03/1993): the commune name Aïn Hassainia changes to Houari Boumediene (Guelma).
- Decree 05-127 (JO 29/2005): the chief-lieu seat of Hassi-Messaoud is transferred to Oued El Meraâ, a place then situated inside Hassi Ben Abdallah (Ouargla); this is a seat-location assertion, not a territorial-parent transfer.
- Decree 06-256 (JO 49/2006): the locality Oued El Meraâ moves from Hassi Ben Abdellah to Hassi Messaoud (Ouargla).
- Interministerial order of 13 May 1985 (JO 24/1985): four commune chief-lieu seats are changed in the annex to the 2 June 1984 order — Aïn Sandel (Guelma) to Aïn Souda; Bir Ben Laabed (Médéa) to Zoudj El Beida; Haraza (Bordj Bou Arréridj) to Fedala; and Beni Guecha (El Oued) to Beni Guecha. These are separate seat assertions, not four-digit register-code changes.

The broader inventory of the 2 June 1984 chief-lieu seat order and Decree 21-128 (2021) remains in [P1-01-TERRITORIAL-AMENDMENT-INVENTORY.md](P1-01-TERRITORIAL-AMENDMENT-INVENTORY.md). The 13 May 1985 amendment is now represented by four row-level seat assertions; the full 1984 seat annex remains incomplete.

## Evidence boundary

- For Decrees 93-11 and 93-12 (`JO 03/1993`), both French printed page 4 (`F1993003_pg04.png`) and Arabic printed page 5 (`A1993003_pg05.png`) have now been visually inspected (22 November 2026 supplement): Arabic source labels `بني عمروس`, `أهلية`, `أزقار` (transferred from `قنواع` to `الشرايع`), and `عين حساينية` → `هواري بومدين` are transcribed verbatim and fingerprinted by PNG SHA-256 in `P1-01-POST-1985-NAMING-INSTRUMENTS-BILINGUAL-READINGS.csv`. This records page-image readings by the audit process, not independent review by a legal practitioner.
- **Decree 92-412 (`JO 82/1992`) — bilingual page-image verification completed 27 November 2026:** the French official printed page 1723 and Arabic printed page 2100 were visually inspected. The Arabic source label for the transferred locality is `أفرنو`; the official text moves it from Selma Benziada to Ziama Mansouriah (Jijel). The Arabic PDF page locator is zero-based index 9; the French locator is index 6. The CSV row records `fr+ar` and both visual-review statuses. Only the existing French PDF byte hash is recorded; no Arabic PDF byte hash was captured in this pass. This does not establish a four-digit register-code change or an effective date, and it is not practitioner sign-off.
- **Decree 05-127 (`JO 29/2005`) — administrative-seat relocation, bilingual page-image verification completed 27 November 2026:** Article 6 transfers the chief-lieu seat of Hassi-Messaoud to Oued El Meraâ, which the decree says was then within Hassi Ben Abdallah. French printed p.13 / PDF zero-based index 12 and Arabic printed p.16 / PDF zero-based index 15 were visually inspected. Arabic text: `مقر بلدية حاسي مسعود` is transferred to `وادي المرعى`. This is a seat-location assertion only; it does not move the locality's legal territorial parent.
- **Decree 06-256 (`JO 49/2006`) — locality-parent transfer, bilingual page-image verification completed 27 November 2026:** Article 1 was visually inspected in French and Arabic, both printed p.4 / PDF zero-based index 3. Arabic source label: `وادي المرعى`. The text transfers the locality from Hassi Ben Abdallah to Hassi Messaoud. This is separate from the 2005 seat relocation. The existing French PDF SHA-256 remains recorded; no Arabic PDF byte hash was captured. No visual verification of either decree implies professional sign-off.
- **Interministerial order of 13 May 1985 (`JO 24/1985`) — bilingual page-image verification completed 27 November 2026:** the French official issue was visually checked at printed p.535 / PDF zero-based index 28; the Arabic official issue at printed pp.829–830 / PDF zero-based indices 44–45. Article 1 amends the 2 June 1984 seat annex and lists four commune/seat pairs: Aïn Sandel → Aïn Souda (`عين صندل` → `العين السوداء`); Bir Ben Laabed → Zoudj El Beida (`بير بن العابد` → `زوج البيضاء`); Haraza → Fedala (`حرازة` → `فضالة`); and Beni Guecha → Beni Guecha (`بني قشة` → `بني قشة`). The local table row labels 07, 56, 34 and 19 are not Decree 85-20 four-digit codes. No fresh PDF-byte SHA-256 was captured; no previous seat or effective date is inferred; all four rows remain practitioner-review pending.
- Official French PDF binaries previously retrieved and hashed remain recorded for `F1992082.PDF`, `F1993003.pdf`, and `F2006049.pdf`. In this 27 November pass, the Arabic page images for JO49/2006 and both editions for JO29/2005 were visually inspected, but no new Arabic/French PDF byte hashes were captured for those issues. Do not treat page-image verification as a PDF-binary checksum.
- The `printed_page` field records the French printed page cited in the CSV (`4` for JO 03/1993 French; Arabic printed page is `5`, recorded in `P1-01-POST-1985-NAMING-INSTRUMENTS-BILINGUAL-READINGS.csv`), not the PDF page index. `pdf_page_index_zero_based` is populated only where identified.

## Data rules

| Field | Meaning / constraint |
|---|---|
| `assertion_id` | Stable identifier for this source assertion; not a PROMO GEST commune ID. |
| `entity_type` | The legal/territorial object named in the source: `locality`, `mechta`, `commune`, or `commune_seat`. |
| `assertion_type` | Type of change asserted by the instrument; current bounded values include `locality_parent_transfer`, `mechta_parent_transfer`, `commune_name_change`, and `administrative_seat_relocation`. |
| `subject_label_fr_source` / `subject_label_ar_source` | Verbatim source labels by language. Empty Arabic cells mean no Arabic source transcription was completed. |
| `change_from_fr` / `change_to_fr` | Verbatim old/new parent or old/new commune name, according to `assertion_type`. |
| `from_parent_commune_fr` / `to_parent_commune_fr` | Parent communes for locality transfers only. |
| `instrument_date` | Date printed as the instrument's date; not an asserted effective date. |
| `publication_date` | Date of the relevant Official Journal issue. Do not silently treat it as the legal effective date. |
| `printed_page` | Printed journal page cited for the source statement. |
| `french_visual_review_status` | Whether the cited French printed page image was reviewed in this audit. |
| `arabic_review_status` | Arabic primary-edition page review status: `page_image_visual_reviewed_in_this_audit` for the `JO 03/1993` rows (AR p.5), `DECR-92-412` (AR p.2100), `DECR-05-127` (AR p.16), `DECR-06-256` (AR p.4), and the four 13 May 1985 seat rows (AR pp.829–830). |
| `code_four_digit_source` | Blank where the cited seat, naming or locality-transfer instrument does not assert a four-digit Decree 85-20 register code. |
| `code_assertion_status` | Records that the four-digit code is not stated by this instrument. A separate register-chain reconciliation is mandatory. |
| `effective_date_status` | All rows are `not_adjudicated`; the valid-time interval remains blank pending full instrument/legal review. |
| `practitioner_review_status` | All rows are `pending`; no professional acceptance is claimed. |
| `source_pdf_sha256` | SHA-256 of the exact official source PDF bytes, when captured; blank means no binary checksum was established. The current 2005/2006 bilingual page-image checks do not imply PDF-byte hashes. |

## Non-negotiable reconciliation rules

1. Do not create or infer four-digit commune-register codes from these locality/territorial instruments or from a Wilaya prefix.
2. Do not merge commune names, localities, mechtas, parent communes, and chief-lieu seats into a single name/alias field.
3. Preserve each dated source assertion and its exact source spelling; do not overwrite historical labels.
4. Keep legal territorial parentage distinct from transitional operational authority.
5. Determine valid-from/valid-to only from the full applicable legal chain and qualified review; publication date is not automatically copied into `valid_from`.
6. This eleven-row bounded ledger does not represent the 1,541 communes and does not satisfy the P1-01 national crosswalk acceptance criterion.

## Official source links

- [JO 82/1992 — Decree 92-412](https://www.joradp.dz/FTP/jo-francais/1992/F1992082.PDF)
- [JO 03/1993 — Decrees 93-11 and 93-12](https://www.joradp.dz/FTP/Jo-Francais/1993/F1993003.pdf)
- [JO 29/2005 Arabic — Decree 05-127](https://www.joradp.dz/FTP/jo-arabe/2005/A2005029.PDF)
- [JO 29/2005 French — Decree 05-127](https://www.joradp.dz/FTP/jo-francais/2005/F2005029.pdf)
- [JO 49/2006 Arabic — Decree 06-256](https://www.joradp.dz/FTP/jo-arabe/2006/A2006049.pdf)
- [JO 49/2006 French — Decree 06-256](https://www.joradp.dz/FTP/jo-francais/2006/F2006049.pdf)
- [JO 24/1985 Arabic — 13 May 1985 seat amendment](https://www.joradp.dz/FTP/jo-arabe/1985/A1985024.pdf)
- [JO 24/1985 French — 13 May 1985 seat amendment](https://www.joradp.dz/FTP/jo-francais/1985/F1985024.pdf)

## Current decision

This artifact improves row-level source traceability only. It does not approve a canonical commune name, code, parent interval, seat, or import. P1-01 remains **In Progress / Pending**; P1-02 remains **Blocked**; `communesCount = 0` and `PendingOfficialVerification` remain unchanged.
