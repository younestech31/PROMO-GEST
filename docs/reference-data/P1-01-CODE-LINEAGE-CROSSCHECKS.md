# P1-01 — Code lineage and disputed-code cross-checks

**Prepared:** 17 November 2026  
**Status:** technical/legal source analysis; no canonical code decision and no practitioner approval.

## 1. Controlling code rule

Decree No. 85-20 of 2 February 1985, JO No. 6 dated 3 February 1985, printed p. 88, establishes the *Répertoire des collectivités territoriales*.

- Article 3 says each commune receives a four-digit code. The first two digits identify the Wilaya to which it is attached; the last two identify the commune within that Wilaya.
- Article 4 requires the register to be updated for territorial modifications and specifically states that a commune transferred to another Wilaya receives a new code and its old code is not reused. A commune not directly affected by changes retains its code.
- The register is maintained by joint ministerial order (Article 7).

This is the basis for treating `W.` and `C.` in the ONS table as separate source components and deriving a four-digit candidate by concatenation. It is not a licence to infer missing source cells.

## 2. Why the ONS table is a useful but qualified cross-check

Two official ONS editions provide separate bilingual W./C. cross-checks. Neither is an amendment to the Decree 85-20 territorial register; each is corroborating geographic-reference material and the four-digit candidates below are derived by applying Article 3 to the two printed columns.

**ONS 2008 — 5th General Population and Housing Census, Code Géographique National:**

| Commune (French) | Arabic source label | W. | C. | Derived four-digit code | Printed page |
|---|---|---:|---:|---:|---:|
| CHAABET EL AMEUR | شعبة العامر | 35 | 14 | 3514 | 50 |
| CHIHANI | شهاني | 36 | 14 | 3614 | 51 |
| RAML SOUK | رمل سوق | 36 | 24 | 3624 | 51 |

The ONS 2008 table is an earlier official bilingual cross-check. Its source PDF is the 5th RGPH geographic-code publication; the edition identifies the 2008 census, but the exact publication day was not established in this audit. It independently supports the W./C. pairings for all three disputed rows. The Arabic spelling for CHIHANI is printed as شهاني in this edition; preserve it separately from the ONS 2021 text-layer form شحاني rather than silently normalizing the difference.

**ONS 2021 — Code Géographique National:**

| Commune (French) | Arabic source label | W. | C. | Derived four-digit code | Printed page |
|---|---|---:|---:|---:|---:|
| CHAABET EL AMEUR | شعبة العامر | 35 | 14 | 3514 | 49 |
| CHIHANI | شحاني | 36 | 14 | 3614 | 50 |
| RAML SOUK | رمل السوق | 36 | 24 | 3624 | 50 |

Its introduction says the document applies Decree 21-128 and the interministerial order dated 12 September 2021 which modifies/completes the 22 June 1985 register order. However, the document cover labels the edition **JUIN 2021**. June precedes 12 September. This internal date inconsistency is a material provenance exception: the copy may have been updated/reissued without changing its cover date, but that explanation has not been established. Do not use this file's cover date as proof of the post-September state until the publisher's release/version metadata is clarified.

The exact ONS source PDF bytes were downloaded and hashed (`ons_code_geo_2008.pdf`, SHA-256 `5b7768f8df92cc2c16da04e8223c137bc22ad70d842fb3f1ac13ae4a7b629720`; `ons_code_geo_2021.pdf`, SHA-256 `9d3a1d9f483e1a1a82924fc4e813c1a9703a720f059671d31efb7b6fd5f37fe4`). However, Ghostscript page rendering hit `Error: can't process embedded font stream` on their content streams (rendering only page footers). All six ONS rows are therefore SHA-hashed text-layer cross-checks, not visually image-verified page scans.

## 3. Chabet El Ameur

| Source | Statement | Assessment |
|---|---|---|
| JO44/1985 initial register, p. 1069 (FR) / p. 1634 (AR) | FR `Chabet El Ameur — 3514`; AR `شعبة العامر — 3514` | Direct initial-register assertion; visually verified on both FR & AR PNG scans |
| JO49/1996 official school directory, p. 15 | Boumerdès (35), Chabet El Ameur — 3514 | Official independent cross-check, but not a register amendment |
| JO23/1998 register amendment, p. 13 (AR) vs p. 11 (FR) | AR `شعبة العامر — 3514`; FR `Chabet El Ameur — 3614` | Intra-issue bilingual discrepancy visually verified in both FR & AR PNG scans |
| ONS Code Géographique National 2008, p. 50 | BOUMERDES W.=35, CHAABET EL AMEUR C.=14 | Derived 3514; independent official cross-check after the 1998 order, not a register amendment |
| ONS Code Géographique National 2021, p. 49 | BOUMERDES W.=35, CHAABET EL AMEUR C.=14 | Derived 3514; qualified by the cover/introduction date conflict |

Direct bilingual PNG review of JO23/1998 establishes that the **Arabic edition (`A1998023.PDF`, printed p. 13) literally prints `شعبة العامر | 3514 | شعبة العامر`** under Wilaya 35 Boumerdès, whereas the **French edition (`F1998023.PDF`, printed p. 11) literally prints `3614`** between `3513` (`Tidjelabine`) and `3515` (`Thénia`). Preserve both verbatim assertions until a qualified practitioner adjudicates the bilingual conflict.

**Proposed position only:** 3514 is the stronger candidate because it matches the initial 1985 French/Arabic register, the 1996 directory, the 1998 Arabic edition, and ONS 2008/2021 W=35/C=14. Neither value is adopted as canonical pending signed practitioner decision.

## 4. Chihani / Raml Souk and the 1985 bilingual page-image finding

Direct PNG inspection of the official JO44/1985 scans clarifies both editions:
- **French (`F1985044.PDF`, printed p. 1069, PDF p. 25):** literally prints **`Chihani | 3624 | Chihani`** between `Dréan (3613)` and `Chebaïta Mokhtar (3615)`, duplicating `Raml Souk | 3624 | Raml Souk` at the bottom of the column. Thus `3624` is printed in the French edition itself, not merely an extraction bug.
- **Arabic (`A1985044.PDF`, printed p. 1635, PDF p. 35):** literally prints **`شهاني | 3614 | شهاني`** between `الذرعان (3613)` and `شبايطة مختار (3615)`, and `رمل السوق | 3624 | رمل السوق`. This matches the owner's separately reported visual reading (`3614`) and the ONS 2008 (`شهاني`, W=36/C=14) and ONS 2021 (`شحاني`, W=36/C=14) tables.

Preserve both the French (`3624`) and Arabic (`3614`) 1985 assertions verbatim; do not normalize `شهاني` vs `شحاني` without practitioner review.

## 5. Files and review protocol

- [Machine-readable evidence cross-checks](P1-01-CODE-LINEAGE-CROSSCHECKS.csv)
- [Legal discrepancy sign-off pack](P1-01-DISCREPANCIES-FOR-SIGNOFF.md)
- [Territorial amendment inventory](P1-01-TERRITORIAL-AMENDMENT-INVENTORY.md)

Verification status and remaining actions before acceptance:
1. JO44/1985 French (p. 1069) and Arabic (pp. 1634–1635) page images — **visually PNG-verified** (Chabet El Ameur `3514` FR/AR; Chihani `3624` FR vs `3614` AR; Raml Souk `3624` FR/AR).
2. JO23/1998 French (p. 11) and Arabic (p. 13) page images — **visually PNG-verified** (Chabet El Ameur `3614` FR vs `3514` AR).
3. Inspect ONS 2008 printed pages 50–51 and ONS 2021 printed pages 49–50 in a PDF viewer that renders their embedded font streams, and resolve the ONS 2021 `JUIN 2021` / `12 September 2021` edition metadata.
4. Preserve the exact original PDFs and verified SHA-256 hashes (computed and recorded in `P1-01-DISCREPANCIES-FOR-SIGNOFF.md` and `P1-01-CODE-LINEAGE-CROSSCHECKS.csv`).
5. Obtain a signed, reasoned decision from a qualified Algerian legal/practitioner reviewer on Chabet El Ameur's code and the Chihani/Raml Souk source conflict.

## 6. Implementation boundary

Do not set canonical code values, mutate historical identifiers, or import commune records from this analysis. P1-01 remains **In Progress / Pending**; P1-02 remains **Blocked**; `communesCount = 0` and `PendingOfficialVerification` remain unchanged.
