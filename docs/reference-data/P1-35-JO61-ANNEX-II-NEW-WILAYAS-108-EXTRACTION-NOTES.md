# P1-35 — JO61 Annex II bounded extraction for new Wilayas 59–69

**Status:** bounded secondary text extraction and name crosswalk only. This file is not a legal interpretation, authoritative transcript, practitioner approval, or import authorization.

## Scope

This slice records the APC electoral constituency rows and number of seats shown under the eleven new-Wilaya headings (59–69) in Annex II of Executive Decree 26-282, JO61/2026. The available text was retrieved from a third-party structured transcription that identifies JORADP as its source. It was cross-compared against the repository's official JO58/2026 108-row register extract by normalized French name. It is **not** a direct visual reading of the official JORADP PDF.

Official source locators:
- French JORADP PDF: [F2026061.pdf](https://www.joradp.dz/FTP/jo-francais/2026/F2026061.pdf)
- Arabic JORADP PDF: [A2026061.pdf](https://www.joradp.dz/FTP/jo-arabe/2026/A2026061.pdf)
- Secondary structured transcription of the decree: [Kanonix decree text](https://kanonix.app/documents/decret-executif-26-282-fr)
- Secondary page-level text for printed p.33 (new Wilayas 61–66): [JO61 page 33 transcription](https://kanonix.app/journals/b0e6f98d-a4f7-43aa-9085-f9ed002b33c9/pdf?download=1)
- Secondary page-level text for printed p.34 (new Wilayas 67–69): [JO61 page 34 transcription](https://kanonix.app/journals/b0e6f98d-a4f7-43aa-9085-f9ed002b33c9/pdf?download=1)

The page number for the 59 and 60 excerpts was not pinned by the retrieved result, so the CSV retains `NOT_PINNED_IN_EXCERPT`; it does not guess a page. The exact official JO61 PDFs are in the repository under `.tmp-joradp/`, but PDF screenshot retrieval returned `Cache miss`. No official page-image visual review is claimed. A separate Arabic secondary-text sidecar now captures 108/108 sequence rows; the official JO61 Arabic PDF has not been visually reviewed and printed-page locators remain unpinned.

## Arabic Annex II secondary-text coverage

The separate sidecar [P1-35-JO61-ANNEX-II-NEW-WILAYAS-108-ARABIC-SECONDARY-TRANSCRIPTION.csv](P1-35-JO61-ANNEX-II-NEW-WILAYAS-108-ARABIC-SECONDARY-TRANSCRIPTION.csv) preserves 108 Arabic constituency-name strings from secondary Arabic text excerpts of JO61. Coverage by Wilaya: 59 (12), 60 (8), 61 (5), 62 (4), 63 (4), 64 (6), 65 (10), 66 (8), 67 (21), 68 (23), 69 (7). A second captured Arabic issue excerpt supplied Wilaya 68 sequences 01–08, completing all 108 Wilaya/sequence keys.

Arabic-source and French-source seat counts are stored in separate columns. They agree on 108/108 rows and total 1,748 seats. The Arabic rows are joined to French secondary rows by Wilaya heading and Annex II sequence; this is a positional cross-reference, not independent proof of legal identity or a practitioner decision.

All Arabic entries are explicitly classified as secondary text, not official-image-verified. Arabic printed-page locators remain `NOT_PINNED_IN_SEARCH_EXCERPT`; no official Arabic JO61 image or binary rendering was visually reviewed. The French secondary transcription still has two unresolved variants (W64 `Hammadia/Hamadia`; W67 `El Ouin et/El Ouinet`). This improves bilingual secondary-text coverage but does not complete official-source verification or close P1-35.

### Independent Arabic secondary-text cross-check

A separate Arabic issue-PDF text mirror hosted by JaridaBot ([source PDF](https://jaridabot.com/FTP/jo-arabe/2026/joradp-61-26-Aout-2026.pdf)) was compared row-by-row against the Kanonix Arabic issue transcription. This is a second **secondary text extraction**, not the official JORADP binary and not page-image verification. The sidecar records the second spelling, printed-page locator and comparison state separately for every row. The mirror's text layer identifies printed page 32 for Wilayas 59–60, page 33 for Wilayas 61–67 and page 34 for Wilayas 68–69; the page images were not visually reviewed.

The two secondary extracts match exactly on 100/108 rows. Eight text differences are preserved without adjudication:

| Wilaya / sequence | Kanonix Arabic transcription | JaridaBot PDF text extraction |
|---|---|---|
| 60 / 03 | عبد القادر عزيل | عبد القادر عزيّل |
| 64 / 02 | زمالة الأمير عبد القادر | زمّالة الأمير عبد القادر |
| 65 / 03 | بويرة الأحدب | بويره الأحدب |
| 67 / 08 | أولاد هلال | أولاد لاد هلال |
| 67 / 09 | تافراوت | تاقافروت |
| 67 / 20 | أولاد عنتر | أولاد لاد عنتر |
| 67 / 21 | السانق | السوايق |
| 68 / 09 | الحوامد | الحمامد |

Every discrepancy remains `SECONDARY_TEXT_VARIANT_PENDING_OFFICIAL_IMAGE_REVIEW`. Neither transcription is assumed correct. The validator enforces the 100 exact matches, exact eight discrepancy keys/strings, source URL and printed-page locators, and the non-visual-review state. Official JORADP Arabic page images must settle these differences before row-level acceptance.

## Reconciled counts

| Wilaya code | Wilaya | Electoral constituency rows | APC seats |
|---:|---|---:|---:|
| 59 | Aflou | 12 | 186 |
| 60 | Barika | 8 | 140 |
| 61 | El Kantara | 5 | 71 |
| 62 | Bir El Ater | 4 | 74 |
| 63 | El Aricha | 4 | 58 |
| 64 | Ksar Chellala | 6 | 106 |
| 65 | Aïn Ouessara | 10 | 184 |
| 66 | Messaad | 8 | 138 |
| 67 | Ksar El Boukhari | 21 | 325 |
| 68 | Bou Saada | 23 | 369 |
| 69 | El Abiodh Sidi Cheikh | 7 | 97 |
| **Total** | | **108** | **1,748** |

The 108 French constituency names were joined to the JO58/2026 108-row new-Wilaya register extract:
- 106 rows have a direct normalized French-name match.
- 2 rows are preserved as unresolved secondary transcription variants, not silently normalized:
  - Wilaya 64: JO61 page transcription `Hammadia`; another indexed transcription shows `Hamadia`; JO58 register row says `Hamadia`.
  - Wilaya 67: JO61 page transcription returns `El Ouin et`; another indexed transcription shows `El Ouinet`; JO58 register row says `El Ouinet`.
- JO58 current register code and administrative seat are carried separately in the CSV; an administrative seat is not treated as a commune alias or constituency name.
- All JO58 practitioner-review states remain `PENDING`, and the JO58 effective-date fields remain blank.

## Legal and evidence boundary

Article 1 of Decree 26-282 says the decree determines electoral constituencies and the number of seats under Annexes I and II. It cites Article 124(3), 187 and 189 of Organic Law 21-01. Article 124 of Organic Law 21-01 permits an electoral constituency to comprise part of a commune, one commune, or several communes. Therefore this extracted list is an **electoral schedule**, not automatically a one-to-one legal Commune catalogue. Even where the French name matches JO58, this comparison does not itself adjudicate legal commune identity, parentage, historical lineage, effective date or any database key.

The 1,748 figure is the sum of seats in this bounded eleven-Wilaya Annex II excerpt; it is not a count of municipalities, and it must not be compared to 1,541 as though seats or constituency rows were the commune count. The remaining 58 old-Wilaya Annex II headings are not covered by this slice.

## Next verification required

1. Obtain locally renderable official JO61 French and Arabic PDF bytes; confirm the exact GitHub blobs, sizes and SHA-256 values before transcription.
2. Visually review official printed pp.32–34 for new-Wilaya entries and establish the exact printed page for groups 59 and 60.
3. Visually review the official Arabic JO61 Annex II pages and compare all 108 captured Arabic secondary strings against the official page images, pinning printed-page locators and retaining source spellings and parser discrepancies.
4. Resolve `Hammadia/Hamadia` and `El Ouin et/El Ouinet` against both official page images; do not decide from a third-party parser.
5. Continue the other 58 Wilaya groups. Interpret every discrepancy using Article 124; do not assume one row equals one legal commune.
6. Keep all 1,541 P1-01 practitioner sign-offs pending until the full legal evidence chain and qualified reviewer decision are recorded.

**Disposition:** P1-35 remains In Progress / Pending. P1-01 remains In Progress / Pending. P1-02 remains Blocked. No JO44 ledger values, legal parentage, seats, `valid_from`, database records or application behavior were changed; no commune import is authorized.
