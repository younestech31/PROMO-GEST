# P1-01 — JO44/1985 to candidate crosswalk: French name-only comparison

**Audit date:** 19 November 2026  
**Evidence type:** deterministic string comparison only; not legal identity adjudication.  
**Historical source inputs:** the 48 JO44/1985 French text-layer extracts under this directory.  
**Candidate input:** [`P1-01-WORKING-CROSSWALK-1541.csv`](P1-01-WORKING-CROSSWALK-1541.csv), pinned third-party candidate workpaper.  
**Scope:** all 1,541 JO44 source rows across the 48 original Wilaya sections, compared with all 1,541 candidate rows across 69 candidate Wilayas.

## Method

The source field `commune_name_fr_verbatim` was compared with candidate field `commune_name_fr_candidate`. The deliberately limited normalization was:

- Unicode NFKD decomposition and removal of combining marks (diacritic-insensitive comparison).
- Case-insensitive comparison.
- Mapping curly/modifier apostrophe glyphs to ASCII apostrophe.
- Collapsing repeated whitespace and trimming surrounding whitespace.

No Arabic strings, register codes, administrative seats, page images, territorial parentage, dates or later legal amendments were used in this pass. Original source strings remain unchanged. A normalized string hit is not proof of a continuing legal entity or a lawful Wilaya transfer.

Each JO44 row is placed in exactly one comparison category:

1. **Single candidate hit, same Wilaya:** exactly one candidate with the normalized French label, and its candidate Wilaya code equals the JO44 source Wilaya code.
2. **Single candidate hit, different Wilaya:** exactly one candidate with the normalized French label, but its candidate Wilaya code differs from the JO44 source Wilaya code. This is a cross-Wilaya label hit only; it is not a parent-transfer decision.
3. **Multiple candidate hits:** the normalized label occurs on more than one candidate row across the 69-Wilaya candidate workpaper. No candidate is selected.
4. **No exact normalized label hit:** the label does not occur in the candidate workpaper after the limited normalization. This is not proof of a missing commune; spelling variants, historic aliases, source transcription and candidate-source incompleteness remain possible.

## Result

| JO44 section range | Source rows | Single hit / same Wilaya | Single hit / other Wilaya | Multiple candidate hits | No exact hit |
|---|---:|---:|---:|---:|---:|
| W01–W10 | 357 | 226 | 41 | 15 | 75 |
| W11–W20 | 373 | 230 | 30 | 13 | 100 |
| W21–W30 | 359 | 217 | 44 | 14 | 84 |
| W31–W40 | 225 | 152 | 18 | 15 | 40 |
| W41–W48 | 227 | 142 | 16 | 6 | 63 |
| **Total** | **1,541** | **967** | **149** | **63** | **362** |

The four categories sum to all 1,541 source rows. The same-Wilaya category is a unique French label hit within the candidate workpaper; it does not certify bilingual name pairing, register-code continuity or legal validity.

## Illustrative exception patterns (not an exhaustive exception register)

### Unique French label found under a different candidate Wilaya

Examples include:

- JO44 W01: `Charouine`, `Ksar Kaddour`, `Timimoun`, `Ouled Saïd`, `Tinerkouk`, `Metarfa`, `Aougrout` and `Talmine` hit candidate rows under W49; `Bordj Badji Mokhtar` and `Timiaouine` hit W50.
- JO44 W12: `Bir El Ater`, `Negrine` and `Ferkane` hit candidate rows under W62.
- JO44 W13: `El Gor`, `El Aricha`, `Sidi Djillali` and `El Bouihi` hit candidate rows under W63.
- JO44 W26: names including `Ouled Maaref`, `Aïn Boucif`, `Derrag`, `Bouaïche`, `Kef Lakhdar` and `Boghar` hit candidate rows under W67.
- JO44 W32: `El Abiodh Sidi Cheikh`, `Aïn El Orak`, `Arbaouat`, `Boussemghoun` and `Chellala` hit candidate rows under W69.
- JO44 W42: names including `Zéralda`, `Baba Hassen`, `Draria`, `Rahmania` and `Ouled Fayet` hit candidate rows under W16.

These records require code-history, Arabic-source, administrative-parent and effective-date reconciliation. No transfer or current parent is assigned by this report.

### Multiple candidate hits

Examples include `Deldoul`, `Ouled Aïssa`, `El Marsa`, `Aïn Beida`, `Menaa`, `Larbaa`, `Sidi Khaled`, `Mansourah`, `Aïn Soltane`, `Khemisti` and `Sidi Amar`. Identical or normalized-equivalent labels can refer to more than one commune; name alone cannot distinguish them.

### No exact normalized label hit

Examples include JO44 source forms `Han ancha`, `Quillen`, `Agnbal`, `Tamanghasset`, `El Hadaïk`, `Taougrite`, `Labi od Medjadja`, `El Ançar` and `Bordj Bou Arréridj`. Their non-match status does not authorize transliteration, spelling correction, alias creation or rejection; compare the original Arabic and French page images and other official instruments first.

## Boundaries and next work

- This is a triage report over French labels, not a complete row-level legal concordance.
- A different-Wilaya string hit is not automatically a territorial transfer. The four-digit JO44 code, later official register codes, source seat, Arabic name, transfer instruments and effective dates must be checked independently.
- Multiple-name and no-hit rows require explicit, source-backed exception review. Do not force a fuzzy match.
- W36's printed duplicate French code `3624` (Chihani and Raml Souk) and missing `3614` remain source anomalies. This comparison does not alter them.
- The separate W16 `1600 — Ville d'Alger` special historical assertion remains excluded from the 1,541 commune rows.
- All source assertions and candidate rows remain unapproved. No commune records were imported; `communesCount = 0`. P1-01 remains In Progress / Pending; P1-02 remains Blocked.
- Page-image review, authenticated official Arabic row pairing for the full source set, exhaustive amendment/code/parent/effective-date lineage, source-backed resolution of all exception classes and qualified Algerian practitioner approval remain acceptance gates.

**Outcome:** the comparison classifies all 1,541 JO44 French labels into four non-legal triage groups. It makes the name-only exceptions visible without changing, correcting or approving any source row.
