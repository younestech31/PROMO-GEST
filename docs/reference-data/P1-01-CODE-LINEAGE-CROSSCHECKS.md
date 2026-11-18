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

The ONS PDFs' page screenshots returned cache-miss during this audit. The exact source bytes were not downloaded into the working runtime; no SHA-256 is available. All six ONS rows are therefore text-layer cross-checks, not visually verified page transcriptions.

## 3. Chabet El Ameur

| Source | Statement | Assessment |
|---|---|---|
| JO44/1985 initial register, p. 1069 | Chabet El Ameur — 3514 | Direct initial-register assertion; text-layer only in this audit |
| JO49/1996 official school directory, p. 15 | Boumerdès (35), Chabet El Ameur — 3514 | Official independent cross-check, but not a register amendment |
| JO23/1998 register amendment, p. 11 | Chabet El Ameur — 3614 | Direct conflicting register assertion; text-layer only |
| ONS Code Géographique National 2008, p. 50 | BOUMERDES W.=35, CHAABET EL AMEUR C.=14 | Derived 3514; independent official cross-check after the 1998 order, not a register amendment |
| ONS Code Géographique National 2021, p. 49 | BOUMERDES W.=35, CHAABET EL AMEUR C.=14 | Derived 3514; qualified by the cover/introduction date conflict |

A further structural anomaly is now explicit: the 1998 row appears under Boumerdès (Wilaya 35) but prints `3614`, whose first two digits denote Wilaya 36 under Article 3 of Decree 85-20. This does not authorize automatic correction; the Arabic and French page images and legal lineage still require review.

**Proposed position only:** 3514 is the stronger candidate because it appears in the initial register, the official 1996 directory and the ONS table's W=35/C=14 fields. Preserve the 1998 French assertion 3614 verbatim. Neither value is adopted as canonical pending primary-image inspection and qualified review.

## 4. Chihani / Raml Souk and the 1985 extraction anomaly

The JO44/1985 French text layer assigns 3624 to both Chihani and Raml Souk in the El Tarf table. The official ONS 2008 and 2021 geographic-code tables instead present Chihani as W=36/C=14 (derived 3614) and Raml Souk as W=36/C=24 (derived 3624). The 2008 edition is an independent cross-check predating the 2021 edition/date anomaly and is consistent with the owner's separately reported visual reading of Chihani as 3614. These later ONS tables suggest that the JO44 text-layer duplicate may be a table-layout or extraction artifact, but they do not prove what the 1985 printed image shows.

That is not proof of what the JO44 printed image shows. The owner-reported reading remains a separately attributed observation; no independent visual inspection of the JORADP page image was possible. The ONS 2008/2021 page images are also not visually reviewed. Keep the raw source observations separate until the original page cells are inspected.

The 1998 Chabet value 3614 also equals the ONS-derived Chihani code. If both assertions were applied literally to the same code scheme at the same time, they would collide; this is another reason to retain the full code/parent lineage and not normalize values by appearance.

## 5. Files and review protocol

- [Machine-readable evidence cross-checks](P1-01-CODE-LINEAGE-CROSSCHECKS.csv)
- [Legal discrepancy sign-off pack](P1-01-DISCREPANCIES-FOR-SIGNOFF.md)
- [Territorial amendment inventory](P1-01-TERRITORIAL-AMENDMENT-INVENTORY.md)

Required before acceptance:
1. Inspect JO44/1985 French and Arabic printed page 1069, specifically the Chabet El Ameur, Chihani and Raml Souk cells.
2. Inspect JO23/1998 French and Arabic printed page 11.
3. Inspect ONS 2008 printed pages 50–51 and ONS 2021 printed pages 49–50; resolve the ONS 2021 JUIN 2021 / 12 September 2021 edition metadata.
4. Preserve the exact original PDFs and calculate SHA-256 from those bytes.
5. Obtain a signed, reasoned decision from a qualified Algerian legal/practitioner reviewer on Chabet's code and the Chihani/Raml source conflict.

## 6. Implementation boundary

Do not set canonical code values, mutate historical identifiers, or import commune records from this analysis. P1-01 remains **In Progress / Pending**; P1-02 remains **Blocked**; `communesCount = 0` and `PendingOfficialVerification` remain unchanged.
