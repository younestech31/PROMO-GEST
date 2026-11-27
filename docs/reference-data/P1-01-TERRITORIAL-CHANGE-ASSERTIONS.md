# P1-01 — Territorial change assertion ledger

**Prepared:** 17 November 2026  
**Purpose:** preserve individually identified territorial-composition, locality-parent and commune-name assertions in a machine-readable form without conflating them with the separate four-digit commune-register code/seat chain.  
**Status:** a bounded research ledger; not an exhaustive amendment inventory, not a legal opinion, and not the canonical 1,541-commune catalogue.

## Contents

`P1-01-TERRITORIAL-CHANGE-ASSERTIONS.csv` contains fifteen source assertions:

- Decree 92-412 (JO 82/1992): the locality Afernou moves from Selma Benziada to Ziama Mansouriah (Jijel).
- Decree 93-11 (JO 03/1993): the mechtas Béni Amrous, Ahela and Azekar move from Kanoua to Charaia (Skikda), recorded as three separate locality assertions.
- Decree 93-12 (JO 03/1993): the commune name Aïn Hassainia changes to Houari Boumediene (Guelma).
- Decree 05-127 (JO 29/2005): the chief-lieu seat of Hassi-Messaoud is transferred to Oued El Meraâ, a place then situated inside Hassi Ben Abdallah (Ouargla); this is a seat-location assertion, not a territorial-parent transfer.
- Decree 06-256 (JO 49/2006): the locality Oued El Meraâ moves from Hassi Ben Abdellah to Hassi Messaoud (Ouargla).
- Interministerial order of 13 May 1985 (JO 24/1985): four commune chief-lieu seats are amended in the annex to the 2 June 1984 order — Aïn Sandel (prior seat Aïn Sandel) to Aïn Souda; Bir Ben Laabed (prior French seat label Bir Ben Laabed; Arabic prior-seat reading differs) to Zoudj El Beida; Haraza (prior seat Haraza) to Fedala; and Beni Guecha (prior seat Douelat) to Beni Guecha. These are separate seat assertions, not four-digit register-code changes.
- Interministerial order of 8 February 1986 (JO 11/1986): the amended Decree 85-20 register separately lists Aïn Sandel / 2407 / Aïn Souda, Bir Ben Laabed / 2656 / Zoudj El Beida, Haraza / 3434 / Fédala, and Béni Guécha / 3919 / Béni Guécha. These are four historical register-code-and-seat assertions; they are not automatically current 2026 codes.

The broader inventory of the 2 June 1984 chief-lieu seat order and Decree 21-128 (2021) remains in [P1-01-TERRITORIAL-AMENDMENT-INVENTORY.md](P1-01-TERRITORIAL-AMENDMENT-INVENTORY.md). The 13 May 1985 amendment is now represented by four row-level seat assertions; the full 1984 seat annex remains incomplete.

## Evidence boundary

- For Decrees 93-11 and 93-12 (`JO 03/1993`), both French printed page 4 (`F1993003_pg04.png`) and Arabic printed page 5 (`A1993003_pg05.png`) have now been visually inspected (22 November 2026 supplement): Arabic source labels `بني عمروس`, `أهلية`, `أزقار` (transferred from `قنواع` to `الشرايع`), and `عين حساينية` → `هواري بومدين` are transcribed verbatim and fingerprinted by PNG SHA-256 in `P1-01-POST-1985-NAMING-INSTRUMENTS-BILINGUAL-READINGS.csv`. This records page-image readings by the audit process, not independent review by a legal practitioner.
- **Decree 92-412 (`JO 82/1992`) — bilingual page-image verification completed 27 November 2026:** the French official printed page 1723 and Arabic printed page 2100 were visually inspected. The Arabic source label for the transferred locality is `أفرنو`; the official text moves it from Selma Benziada to Ziama Mansouriah (Jijel). The Arabic PDF page locator is zero-based index 9; the French locator is index 6. The CSV row records `fr+ar` and both visual-review statuses. Only the existing French PDF byte hash is recorded; no Arabic PDF byte hash was captured in this pass. This does not establish a four-digit register-code change or an effective date, and it is not practitioner sign-off.
- **Decree 05-127 (`JO 29/2005`) — administrative-seat relocation, bilingual page-image verification completed 27 November 2026:** Article 6 transfers the chief-lieu seat of Hassi-Messaoud to Oued El Meraâ, which the decree says was then within Hassi Ben Abdallah. French printed p.13 / PDF zero-based index 12 and Arabic printed p.16 / PDF zero-based index 15 were visually inspected. Arabic text: `مقر بلدية حاسي مسعود` is transferred to `وادي المرعى`. This is a seat-location assertion only; it does not move the locality's legal territorial parent.
- **Decree 06-256 (`JO 49/2006`) — locality-parent transfer, bilingual page-image verification completed 27 November 2026:** Article 1 was visually inspected in French and Arabic, both printed p.4 / PDF zero-based index 3. Arabic source label: `وادي المرعى`. The text transfers the locality from Hassi Ben Abdallah to Hassi Messaoud. This is separate from the 2005 seat relocation. The existing French PDF SHA-256 remains recorded; no Arabic PDF byte hash was captured. No visual verification of either decree implies professional sign-off.
- **Interministerial order of 13 May 1985 (`JO 24/1985`) — bilingual page-image verification completed 27 November 2026:** the official French page was visually inspected at printed p.535 / PDF index 28 and the official Arabic pages at printed pp.829–830 / PDF indices 44–45. Article 1 amends the 2 June 1984 chief-lieu-seat annex for four communes: Aïn Sandel → Aïn Souda (`عين صندل` → `العين السوداء`); Bir Ben Laabed → Zoudj El Beida (`بير بن العابد` → `زوج البيضاء`); Haraza → Fedala (`حرازة` → `فضالة`); Beni Guecha → Beni Guecha (`بني قشة` → `بني قشة`). The local table row labels 07, 56, 34 and 19 are not Decree 85-20 four-digit codes. The 1985 source rows retain blank four-digit-code fields, unadjudicated valid-time fields and pending practitioner review. No new PDF-byte SHA-256 was captured.
- **Prior-seat comparison — JO41/1984:** selected page images for the four affected communes were visually inspected in the digitized issue copy hosted by Kanonix, which identifies JORADP as its source. French printed pages: Guelma p.1039, Médéa p.1041, Bordj Bou Arréridj p.1043, El Oued p.1045. Arabic printed pages: Guelma p.1542, Médéa p.1543, Bordj Bou Arréridj p.1547, El Oued p.1549. Old French seats: Aïn Sandel, Bir Ben Laabed, Haraza and Douelat respectively. Arabic old-seat readings: عين صندل, بشر بن عابد, حرازة and دويلات respectively. **Bilingual discrepancy:** the French JO41 row gives Bir Ben Laabed as both commune and seat, while the Arabic scanned row appears to give commune `بئر بن عابد` and seat `بشر بن عابد`. Preserve both readings pending qualified review. These JO41 scans were not downloaded as JORADP PDF bytes in this pass; no official binary hash is claimed for the scan copy.
- **Interministerial register amendment of 8 February 1986 (`JO 11/1986`) — four historical register-code assertions:** the official French JORADP page images were visually checked at printed p.280 / PDF index 15 (Aïn Sandel 2407 / Aïn Souda; Bir Ben Laabed 2656 / Zoudj El Beida; Haraza 3434 / Fédala) and printed p.281 / PDF index 16 (Béni Guécha 3919 / Béni Guécha). The Arabic page-image review for printed pp.401–402 is recorded in the repository's prior bilingual audit; no new Arabic PDF byte hash was generated. Existing recorded PDF SHA-256 values are French `F1986011.PDF` `49cfdbd7aafca943f3c39e33882a24e791ed7531ff251f5b627d9947d111904b` and Arabic `A1986011.PDF` `3d26169e0094ecb115d034fbfc1ab4507910efb8916822b41247a2ca494d3072`. The 1986 order prints commune, four-digit register code and seat in separate columns. Its four code values are recorded in separate CSV rows; they are historical 1986 assertions, not automatically current 2026 values. Their valid-time and practitioner-review fields remain pending.
- Official French PDF binaries previously retrieved and hashed remain recorded for `F1992082.PDF`, `F1993003.pdf`, and `F2006049.pdf`. In this 27 November pass, the Arabic page images for JO49/2006 and both editions for JO29/2005 were visually inspected, but no new Arabic/French PDF byte hashes were captured for those issues. Do not treat page-image verification as a PDF-binary checksum.
- The `printed_page` field records the French printed page cited in the CSV (`4` for JO 03/1993 French; Arabic printed page is `5`, recorded in `P1-01-POST-1985-NAMING-INSTRUMENTS-BILINGUAL-READINGS.csv`), not the PDF page index. `pdf_page_index_zero_based` is populated only where identified.

## Data rules

| Field | Meaning / constraint |
|---|---|
| `assertion_id` | Stable identifier for this source assertion; not a PROMO GEST commune ID. |
| `entity_type` | The legal/territorial object named in the source: `locality`, `mechta`, `commune`, or `commune_seat`. |
| `assertion_type` | Type of change asserted by the instrument; current bounded values include `locality_parent_transfer`, `mechta_parent_transfer`, `commune_name_change`, `administrative_seat_relocation`, and `register_code_and_seat_assertion`. |
| `subject_label_fr_source` / `subject_label_ar_source` | Verbatim source labels by language. Empty Arabic cells mean no Arabic source transcription was completed. |
| `change_from_fr` / `change_to_fr` | Verbatim old/new parent or old/new commune name, according to `assertion_type`. |
| `from_parent_commune_fr` / `to_parent_commune_fr` | Parent communes for locality transfers only. |
| `instrument_date` | Date printed as the instrument's date; not an asserted effective date. |
| `publication_date` | Date of the relevant Official Journal issue. Do not silently treat it as the legal effective date. |
| `printed_page` | Printed journal page cited for the source statement. |
| `french_visual_review_status` | Whether the cited French printed page image was reviewed in this audit. |
| `arabic_review_status` | Arabic primary-edition page review status: `page_image_visual_reviewed_in_this_audit` for the `JO 03/1993` rows (AR p.5), `DECR-92-412` (AR p.2100), `DECR-05-127` (AR p.16), `DECR-06-256` (AR p.4), and the four 13 May 1985 seat rows (AR pp.829–830). |
| `code_four_digit_source` | Populated only where the specific cited register instrument prints the four-digit code. It remains blank for the 1985 seat amendment and for territorial/name-change instruments that do not state the code. |
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
6. This fifteen-row bounded ledger does not represent the 1,541 communes and does not satisfy the P1-01 national crosswalk acceptance criterion.

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
