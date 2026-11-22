# P1-01 — Uploaded administrative reference dataset audit

**Audit date:** 2026-11-22  
**Disposition:** Candidate-only; not legally approved; not importable.  
**Input:** user-supplied archive containing `communes.csv`, `dairas.csv`, `wilayas.csv`, and `generate_db.py`.

## 1. Immutable input fingerprints

| File | Bytes | SHA-256 |
|---|---:|---|
| Archive ZIP | — | `dd35a4f9f44117c4f0fda7bc34277aa98b6cb874bed975f18c3c38665d1b79ae` |
| `communes.csv` | 101,747 | `0b700e7598c8b8cfe9ab91bd103859438d6360b7c42ffba75d2d5aa2eb17b601` |
| `dairas.csv` | 25,366 | `f4dd922a70633f0e157cd1a9de8f9dc60aeb489cd12993da109c2953313e8454` |
| `generate_db.py` | 4,610 | `82df86f0864b2a7dd531e33d78094a48ae3591d1949367031468ab542535d8e9` |
| `wilayas.csv` | 3,135 | `32f94a444d40ee0c511401c925c9c755b1b54bb18e9b8a4907d2b18dfeaf8d8d` |

## 2. Structural checks

| Check | Result |
|---|---:|
| Wilaya rows / unique codes | 69 / 69 |
| Daira rows / unique codes | 591 / 591 |
| Commune rows / unique codes | 1,541 / 1,541 |
| Commune references to missing daira | 0 |
| Commune references to missing wilaya | 0 |
| Commune/daira wilaya disagreement | 0 |
| Dairas without linked communes | 0 |
| Duplicate Arabic names within a wilaya | 0 |
| Duplicate French names within a wilaya | 0 |
| Fully duplicated commune rows | 0 |
| Commune rows with page number other than N/A | 0 / 1,541 |

These checks establish internal consistency only. They do not establish legal completeness, identity, official identifiers, legal parentage, or effective dates.

## 3. Upstream provenance

The generator consumes JSON from `el-amin-dev/algeria-wilayas-communes` through jsDelivr using the moving `@main` reference. It does not pin a release/tag/commit or record input-file checksums. Regeneration is therefore not reproducible against a fixed upstream snapshot.

The upstream project's own [data provenance](https://github.com/el-amin-dev/algeria-wilayas-communes/blob/main/docs/DATA_PROVENANCE.md) describes a compilation using ONS Code Géographique National and Laws 19-12/26-06, with a prior open compilation for names. It expressly states that:
- only wilayas have government identifiers in that dataset;
- daira and commune IDs are synthesized/library-assigned rather than official government identifiers;
- daira–commune relationships were carried from the pre-2025 structure and regrouped under the 69 wilayas, with split dairas represented under each relevant wilaya;
- its stated last verification date is 2026-07-20.

Its [data policy](https://github.com/el-amin-dev/algeria-wilayas-communes/blob/main/docs/DATA_POLICY.md) also distinguishes synthesized IDs from official identifiers and recommends exact-version pinning where reproducibility matters.

## 4. Material provenance defects

### 4.1 Synthetic commune and daira codes

The generator constructs daira identifiers such as `01-01` and commune identifiers such as `01-001` using per-wilaya sequence counters over the source JSON order. They are not ONS or other government-issued identifiers. Because they depend on source ordering, they must not be imported as official codes or treated as stable legal keys.

### 4.2 Over-broad attribution to Decree 26-253 / JO52/2026

Every commune row is assigned `decret_id=26-253`, `jo_reference=JO 52/2026`, and `page_number=N/A`; every daira row is also assigned decree 26-253.

The official JO52/2026 text identifies Executive Decree 26-253 of 15 July 2026 as amending/completing Executive Decree 91-306, which establishes the list of communes administered/served by each Daira Chief. Article 1 updates that attached list. This is evidence about the scope of the daira-chief commune list; it is not a standalone legal instrument creating or identifying every commune, assigning every official code, or establishing all historical/current parentage for the entire 1,541-row population. The issue also contains unchanged sections, so the underlying 91-306 instrument and preceding amendments remain relevant. The uploaded rows contain no printed-page linkage to establish row-level coverage.

Official source: [JORADP JO52/2026 Arabic PDF](https://www.joradp.dz/FTP/jo-arabe/2026/A2026052.pdf). The source was examined through its searchable text layer; no page-image visual inspection is claimed in this audit.

### 4.3 `loi_creation=26-06` for every wilaya

The CSV assigns Law 26-06 as the creation law for all 69 wilayas. That collapses the distinction between the current-map reform and the individual creation/legal lineage of each wilaya. Law 26-06 is the statutory basis for the 2026 reform and the 69-wilaya map; it does not mean all 69 wilayas were originally created by that law. Preserve the field as an accurately named current-map/reform reference only, or source each wilaya's own legal creation lineage.

### 4.4 Matching the statutory national total is not row-level proof

Law 26-06, JO25/2026, Article 3 gives the national total of 69 wilayas and 1,541 communes. The uploaded counts match that total, but count equality cannot prove every commune's legal identity, spelling, official identifier, territorial parent, or historical effective date. The separate JO61/2026 electoral schedules cannot be treated as a one-to-one commune register because Organic Law 21-01 Article 124 permits an electoral constituency to contain part of a commune, one commune, or several communes (see the existing P1-01 master report).

## 5. Permitted and prohibited use

**Permitted:** retain the archive as an immutable, explicitly non-governmental candidate dataset for name comparison, anomaly discovery, and preparation of questions for source-based review.

**Not permitted:** legal approval; production/master reference status; use of generated daira/commune IDs as official codes; setting legal parentage or `valid_from`; import into PostgreSQL; or counting any candidate row as practitioner-approved.

Before any future acceptance, each row needs a reproducible source snapshot and checksum, exact official source locator (issue, instrument, article/annex, printed page, language), independently supported parentage and valid-time decision, and qualified Algerian practitioner sign-off. Keep internal PROMO-GEST identifiers distinct from government codes and upstream synthetic IDs.

## 6. PROMO-GEST status impact

No runtime, API, schema, migration, production data, or commune master ledger row was changed by this audit. No commune was imported. All 1,541 practitioner approvals remain PENDING; W30-R007 remains NEEDS_EVIDENCE; no `valid_from` is inferred; `communesCount=0`. P1-01 remains In Progress / Pending and P1-02 remains Blocked.

## 7. External references

- [Upstream repository](https://github.com/el-amin-dev/algeria-wilayas-communes)
- [Upstream provenance](https://github.com/el-amin-dev/algeria-wilayas-communes/blob/main/docs/DATA_PROVENANCE.md)
- [Upstream data policy](https://github.com/el-amin-dev/algeria-wilayas-communes/blob/main/docs/DATA_POLICY.md)
- [JORADP JO52/2026 — Decree 26-253](https://www.joradp.dz/FTP/jo-arabe/2026/A2026052.pdf)
- [JORADP JO25/2026 — Law 26-06](https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf)
