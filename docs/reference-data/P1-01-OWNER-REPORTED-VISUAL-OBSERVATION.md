# P1-01 — Owner-reported visual observation: JO44/1985, El Tarf code row

**Recorded:** 17 November 2026  
**Evidence class:** owner-reported visual observation; not independently inspected by this audit  
**Status:** pending artifact capture and independent verification; not a legal decision

## Observation supplied by the Product Owner

The Product Owner reports that direct visual inspection of the original French JO No. 44/1985 printed table around page 1069 shows code **3614** in the adjacent El Tarf (Wilaya 36) row for **Chihani**. This differs from the currently retrieved French PDF text-layer extraction, which returns `Chihani — 3624` and also `Raml Souk — 3624`, an internally anomalous duplicate.

This reported reading is material to the Chabet El Ameur discrepancy because the 1998 French JO No. 23/1998 printed table records `Chabet El Ameur — 3614`. It may explain why the text extraction made the 3614 value appear to collide with Chihani, but it does **not** itself resolve whether the 1998 Chabet El Ameur entry is a printing error or a legally effective later code.

## Evidence handling

- Preserve the 1985 text-layer output as one source observation: `Chihani — 3624` and `Raml Souk — 3624`.
- Preserve the Product Owner's reported image reading separately: `Chihani — 3614`.
- Do not overwrite either assertion or silently repair the PDF extraction.
- Before elevating the owner-reported reading to independently verified evidence, attach or archive the exact JO44/1985 page image/crop and record the PDF URL, printed page, PDF page index, table/column coordinates, reviewer, inspection date and SHA-256 of the crop and original PDF.
- Independently transcribe the commune label, code cell and seat cell from the same row and inspect neighbouring rows to establish column alignment.
- Have the qualified Algerian practitioner consider this evidence together with JO23/1998 French and Arabic editions and the complete register lineage.

## Effect on proposed Chabet El Ameur treatment

The existing source assertions remain unchanged:

| Source | Current recorded assertion |
|---|---|
| JO44/1985 French, printed p. 1069, Boumerdès | Chabet El Ameur — `3514` |
| JO49/1996 French, printed p. 15, school directory (not a register amendment) | Chabet El Ameur — `3514` |
| JO23/1998 French, printed p. 11, register amendment | Chabet El Ameur — `3614` |
| JO44/1985 French, El Tarf text layer | Chihani — `3624` (duplicate with Raml Souk in the extraction) |
| JO44/1985 French, El Tarf image | Product Owner reports Chihani — `3614`; image/crop not supplied to this audit |

**No canonical code is approved by this note.** `3514` remains the stronger candidate based on the initial register and official school-directory cross-check, but the later 1998 register amendment is a direct conflicting assertion. The legal effect and whether it is a printing/transcription error require the complete page-image evidence and qualified practitioner decision.

## Import boundary

This note does not authorize a commune import, code correction, API/schema change or production-data change. P1-01 remains `In Progress / Pending`; P1-02 remains `Blocked`; `communesCount = 0` and `PendingOfficialVerification` remain unchanged.
