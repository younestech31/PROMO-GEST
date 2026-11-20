# P1-01 — Official-source check of post-1985 name-lineage claims

**Prepared:** 21 November 2026  
**Scope:** nine rows currently flagged `POST_1985_RENAME_PRIMARY_PDF_VISUAL_CHECK_PENDING`, plus the W10 four-row rename cluster.  
**Disposition:** supplementary source reconciliation only — not an approved commune crosswalk, legal opinion, or practitioner sign-off.

## 1. Guardrails

- This note records what the cited official JORADP editions state and separates a direct commune name-change instrument from a later administrative table that repeats an alias or current name.
- It does not alter any candidate name, code, parent, row key, `valid_from`, or `valid_to`; it does not approve any row.
- A name-change instrument does not, by itself, establish a four-digit territorial-register code or that code's effective date. Keep name, code, legal parent, seat, publication date, and operational transfer as separate assertions.
- Preserve both the workpaper wording and the printed official wording where they differ. Do not silently normalize transliterations or infer that similar names refer to the same commune.
- Evidence levels are explicit. The screenshot service returned `Cache miss` for the relevant pages of JO04/1990, JO01/1991, JO84/2022 and JO54/2024. The JO41/1989 printed page 942 was visually inspected. No source-PDF SHA-256 was recalculated in this pass.

## 2. Nine existing candidate claims

| Candidate key | Existing workpaper claim | Official JORADP evidence found | Audit disposition |
|---|---|---|---|
| `W02-R022` | `Souk El Bagar → Sidi Abderrahmane` (Chlef candidate) | JO84/2022, Annex II, printed p.5, lists `Souk El Bagar` in the Chlef tribunal-jurisdiction list; it separately lists `Sidi Abderrahmane (Ouled Djerad)` under Tiaret. JO34/2023, printed p.11, publishes a corrigendum to JO84/2022 p.5 replacing the relevant `Souk El Bagar` wording with `Sidi-Abderrahmane`. Separately, JO41/1989, printed p.942, contains an arrêté dated 9 Aug 1989 changing the name of **Ouled Djerad in Tiaret** to `Sidi Abderrahmane`. | The 2023 text is a correction to a tribunal-jurisdiction annex, not the original commune naming instrument. The 1989 arrêté is explicitly for Tiaret and must not be attached to the Chlef candidate. Treat the Chlef alias as corroborated by the corrigendum, but keep the underlying naming instrument/date and register-code lineage unresolved. This is a high-risk homonym/linkage control. |
| `W06-R043` | `Sidi Saïd → M'cisna` | JO84/2022, Annex II, printed p.5, lists Béjaïa as `M’sisna (Sidi Said)`. | Official alias/table corroboration only. Preserve the official spelling `M’sisna` separately from candidate `M'cisna`; this table does not identify the name-change instrument or its effective date. |
| `W15-R045` | `Oued Ksari → Aït Yahia Moussa` | JO04/1990, printed p.165, publishes an arrêté dated 12 Nov 1989: the commune `Oued Ksari`, Wilaya Tizi Ouzou, “portera désormais” the name `Aït Yahia Moussa`. JO84/2022 p.5 also lists `Aït Yahia Moussa (Oued Ksari)` in Tizi Ouzou. | Direct name-change instrument found; candidate old/new labels and Wilaya align. No four-digit register-code assertion or approved code `valid_from` is inferred from this name act. |
| `W24-R008` | `Hammam Maskhoutine → Hammam Debagh` | JO54/2024, printed p.18, in the territorial-jurisdiction table for land-registry offices, lists `Hammam Debagh (Hammam Maskhoutine)` under Guelma. | Official alias/table corroboration only. Not a commune naming instrument; do not infer the date or legal effect of a name change from this later jurisdiction table. |
| `W25-R009` | `El Haria → Ben Badis` | JO01/1991, printed p.7, publishes Executive Decree 90-417 dated 22 Dec 1990. Article 1 states that the commune `El Haria`, in Wilaya Constantine, will henceforth bear the name `Ben Badis`. | Direct name-change instrument found; the issue text supports the old/new names and Wilaya. It does not provide a four-digit register-code assignment. |
| `W25-R011` | `Aïn Kerma → Messaoud Boudjeriou` | JO41/1989, printed p.942, contains the arrêté dated 15 Jul 1989. Article 1 states that the commune `Aïn Kerma` in Wilaya Constantine will henceforth bear the name of the Chahid `Messaoud Boudjeriou`. The printed page image was visually inspected in this pass. | Direct name-change instrument found and page visually inspected. Preserve the full honorific as printed; do not infer the numeric register code or its validity interval from the name act. |
| `W29-R047` | `M'Hamid → Zelamta` | JO04/1990, printed p.165, publishes an arrêté dated 10 Jan 1990: the commune `M’Hamids`, Wilaya Mascara, will henceforth bear the name `Zelmata`. | Direct name-change instrument found, but both strings differ from the workpaper (`M'Hamid` vs `M’Hamids`; `Zelamta` vs `Zelmata`). Preserve each source spelling and obtain a reviewer decision on identity/orthography; do not normalize silently. |
| `W38-R021` | `Oued El Gharfa → Youssoufia` | JO04/1990, printed p.165, publishes an arrêté dated 17 Dec 1989: the commune `Oued Gherga`, Wilaya Tissemsilt, will henceforth bear the name `Youssoufia`. | Direct name-change instrument found, but the old-name string differs (`Oued El Gharfa` vs `Oued Gherga`). Keep the mismatch explicit until the reviewer establishes whether it is a spelling variant or an incorrect lineage link. |
| `W40-R015` | `Faïs → Taouzianat` | JO54/2024, printed p.24, lists `Taouzianat (Fâis)` in the Kaïs territorial jurisdiction under Khenchela. | Official alias/table corroboration only. Preserve the official diacritic `Fâis`; this later jurisdiction table does not identify a commune naming decree or effective date. |

## 3. W10 four-row cluster — what JO84/2022 does and does not corroborate

JO84/2022, Annex II, printed p.5, lists the Bouira jurisdiction as follows:

- `Aït Laâziz (Bezite)` — supports the pairing recorded for `W10-R030` at alias level.
- `El Hakimia (El Morra)` — supports the pairing recorded for `W10-R010` at alias level.
- `El Mokrani (El Madjen)` — supports the pairing recorded for `W10-R031` at alias level.
- `Taourirt` appears without `Ath Mansour` in this list. The table does **not** corroborate the claimed `Taourirt ↔ Ath Mansour` pairing for `W10-R019`.

These entries occur in an administrative-court territorial-jurisdiction annex. They corroborate later paired labels, not the underlying commune naming acts, code chronology, or a legal `valid_from`. All four rows remain subject to original primary JORADP decree/arrêté review.

## 4. Source register and evidence level

| Official source | Printed page(s) | What it contributes | Evidence level in this pass |
|---|---:|---|---|
| [JO41/1989 — F1989041.PDF](https://www.joradp.dz/FTP/jo-francais/1989/F1989041.PDF), published 27 Sep 1989 | 942 | Aïn Kerma → Chahid Messaoud Boudjeriou; separately, Ouled Djerad (Tiaret) → Sidi Abderrahmane | Text layer and printed-page image visually inspected for p.942 |
| [JO04/1990 — FP165.pdf](https://www.joradp.dz/JO8499/1990/004/FP165.pdf), published 24 Jan 1990 | 165 | Oued Ksari → Aït Yahia Moussa; Oued Gherga → Youssoufia; M’Hamids → Zelmata | Official PDF text layer; screenshot unavailable (`Cache miss`) |
| [JO01/1991 — FP7.pdf](https://www.joradp.dz/JO8499/1991/001/FP7.pdf), published 2 Jan 1991 | 7 | Executive Decree 90-417: El Haria → Ben Badis | Official PDF text layer; screenshot unavailable (`Cache miss`) |
| [JO84/2022 — F2022084.PDF](https://www.joradp.dz/FTP/JO-FRANCAIS/2022/F2022084.pdf), published 14 Dec 2022 | 5 | Tribunal-jurisdiction table; Chlef, Béjaïa, Tiaret, Tizi Ouzou and Bouira label references | Official PDF text layer; screenshot unavailable (`Cache miss`) |
| [JO34/2023 — F2023034.pdf](https://www.joradp.dz/FTP/jo-francais/2023/F2023034.pdf), published 16 May 2023 | 11 | Corrigendum to JO84/2022 p.5 replacing `Souk El Bagar` with `Sidi-Abderrahmane` at the cited table position | Official PDF text layer; screenshot not obtained in this pass |
| [JO54/2024 — F2024054.pdf](https://www.joradp.dz/FTP/jo-francais/2024/F2024054.pdf), published 8 Aug 2024 | 18, 24 | Land-registry territorial-jurisdiction table: Hammam Debagh (Hammam Maskhoutine); Taouzianat (Fâis) | Official PDF text layer; screenshot unavailable (`Cache miss`) |

## 5. Required follow-up before any row can be approved

1. Retrieve and preserve the actual source PDF bytes or official page images for the text-layer-only sources; record a new SHA-256 for each exact source file version. Do not copy an image hash into a PDF-hash field.
2. Resolve the identity/orthographic discrepancies for `W02-R022`, `W29-R047`, and `W38-R021` against the correct Wilaya and original legal naming instruments.
3. Obtain original commune-name instruments for `W06-R043`, `W24-R008`, `W40-R015`, and all W10 cluster rows; a later jurisdiction table is not a substitute.
4. Obtain the missing original instrument for `W10-R019` (`Taourirt` / `Ath Mansour`) or withdraw that pairing from the candidate lineage after practitioner review.
5. Have the qualified Algerian practitioner decide whether and how each name assertion affects the national register record, including the distinct `valid_from` for name, legal parent and four-digit register code where applicable.

**No data mutation:** the master ledger, working crosswalk, practitioner queue and decision book remain unchanged by this note. All 1,541 sign-offs remain `PENDING`; W30-R007 remains `NEEDS_EVIDENCE`; P1-01 remains In Progress / Pending; P1-02 remains Blocked; no commune import is permitted by this note.
