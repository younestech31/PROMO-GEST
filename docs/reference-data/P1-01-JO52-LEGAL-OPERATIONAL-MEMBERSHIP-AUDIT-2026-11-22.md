# P1-01 — JO52/2026 Daira-Chief assignment vs legal commune membership

**Audit date:** 22 November 2026  
**Main evidence baseline:** 410f3775dc603ea50aed44cc469015b7e16e8972  
**Scope:** verify the legal scope of Executive Decree 26-253 (JO52/2026) and compare it with selected user-supplied CSV rows under Wilaya codes 60 and 64.  
**Disposition:** confirmed candidate membership errors and source-semantics warning; no row corrected or imported.

## 1. Executive finding

Three distinct things must not be collapsed into one wilaya_code / daira_code hierarchy:

1. **Legal territorial membership:** which Wilaya a commune belongs to in the amended territorial law (Law 84-09 as amended by Law 26-06, JO25/2026).
2. **Daira-Chief service assignment:** which commune(s) are listed as being “animated/administered” by a particular Daira Chief under Executive Decree 91-306 as amended by Decree 26-253 (JO52/2026).
3. **Historical or reconstructed source hierarchy:** a derived daira/commune grouping carried over from an older map and regrouped by a third-party dataset.

These are related but not interchangeable. Decree 26-253 Article 1 expressly amends the annexed list of *communes animées par chaque chef de daïra* to Decree 91-306. It does not, by itself, establish the legal territorial membership or creation of every commune, nor an official commune code for each row.

The uploaded dataset has two confirmed legal-membership set errors in its new-Wilaya groups:
- **Uploaded code 64 / Bou Saada:** four rows are actually in the Law 26-06 M’Sila membership list; four legal Bou Saada communes are missing.
- **Uploaded code 60 / El Abiodh Sidi Cheikh:** three rows are actually in the Law 26-06 El Bayadh membership list; three legal El Abiodh Sidi Cheikh communes are missing.

The per-Wilaya row counts still match. Count-only validation therefore did not detect these errors.

## 2. Primary-source scope — JO52/2026, Decree 26-253

Official sources:
- [JORADP Arabic JO52/2026](https://www.joradp.dz/FTP/jo-arabe/2026/A2026052.pdf)
- [JORADP French JO52/2026](https://www.joradp.dz/FTP/jo-francais/2026/F2026052.pdf)

The Decree is dated **15 July 2026** and published in Official Journal No.52 on **21 July 2026**. Its title states that it amends and completes Executive Decree 91-306 of 24 August 1991, which fixes the list of communes animated by each Daira Chief. Article 1 states that the list annexed to Decree 91-306 is modified/completed according to the new annex; Article 2 orders publication.

The Annex's column heading is **“Communes à animer par chaque chef de daïra concerné”** (Arabic counterpart: “قائمة البلديات التي ينشطها كل رئيس دائرة”). Its row groups identify a Daira-Chief seat and the communes assigned to that chief. This is the scope of the legal instrument.

**Do not relabel this Annex as the consolidated legal Commune→Wilaya territorial register.** The legal territorial membership lists are in Law 26-06, which amends Law 84-09. Decree 26-253 is a specific operational/administrative assignment list within the pre-existing Decree 91-306 framework.

Evidence limitation: the official Arabic and French JO52 PDF text layers were examined. Page-image screenshot attempts for the relevant French pages 14–16 and Arabic pages 16–18 returned Cache miss; no visual page-image inspection or local binary SHA-256 is claimed in this pass. Use the printed-page/text locators below as text-layer evidence pending visual source-image review.

## 3. Confirmed territorial-membership errors in the uploaded archive

The following records are from the user-supplied communes.csv. Their IDs are generated candidate locators from the uploaded dataset, not government-issued commune codes.

### 3.1 Uploaded Wilaya code 64 — Bou Saada

**Controlling legal membership:** Law 26-06 (JO25/2026), amended Law 84-09 Article 52 bis 19, printed pp.9–10, lists the 23 communes that constitute the new Wilaya Bou Saada.

The uploaded archive has 23 rows under wilaya_code=64, but the set differs:

| Result | Commune names | Uploaded candidate IDs |
|---|---|---|
| Present in statutory Bou Saada list, absent from uploaded code 64 | Khoubana; M’Cif; El Houamed; Djebel Messaad | — |
| Present in uploaded code 64, but assigned by the law to M’Sila | Sidi Hadjeres; Maadid; M’tarfa; Maarif | 64-001, 64-021, 64-022, 64-023 |

Law 26-06, amended Law 84-09 **Article 32**, lists M’Sila and its constituent communes, including **Maadid, M’Tarf a/M’Tarf, Maarif and Sidi Hadjerès**. These four uploaded rows are not merely variant spellings of Bou Saada names; the statute places them in the M’Sila group.

The other 19 rows in the uploaded code-64 group have a corresponding name in the statutory Bou Saada list after the current audit's normalization/variant handling. They remain candidate matches, not practitioner-approved records. The four legal omissions and four wrong-parent candidates are the significant membership discrepancies.

### 3.2 JO52 operational assignment split for the same 23 Bou Saada communes

JO52/2026's Daira-Chief schedule separates the 23 statutory Bou Saada communes across two different Wilaya headings in its Annex:

- Under **heading 67 — Ksar El Boukhari**, the Annex lists 10 Daira-Chief seats and 34 commune service assignments in total. Four of those seats account for **13 communes** that Law 26-06 Article 52 bis 19 legally places in Bou Saada:
  - Ouled Sidi Brahim; Benzouh;
  - Sidi Ameur; Tamsa;
  - Aïn El Meleh; Bir Foda; Aïn Farès; Sidi M’Hamed; Aïn Errich;
  - Ben Srour; Ouled Slimane; Zarzour; Mouhamed Boudiaf.
- Under **heading 68 — Bou Saada**, the Annex lists four Daira-Chief seats and **10 service assignments**:
  - Bou Saada; El Hamel; Oultem;
  - Djebel Messaad; Slim;
  - Khoubana; M’Cif; El Houamed;
  - Medjedel; Menaa.

Compared by name after case/diacritic/punctuation normalization (without accepting or rewriting official spellings), the 34 assignments under heading 67 comprise 21 names in Law 26-06 Article 52 bis 18 for Ksar El Boukhari plus 13 names in Article 52 bis 19 for Bou Saada. The 10 assignments under heading 68 are the other 10 names in Article 52 bis 19 for Bou Saada. Thus the combined JO52 headings 67 and 68 list 44 names, corresponding to the 21 Ksar El Boukhari plus 23 Bou Saada statutory members, while the service grouping places 13 of Bou Saada's legal members under heading 67 and 10 under heading 68. This is direct evidence that JO52's Daira-Chief assignment table is not a one-row-per-current-Wilaya commune-parent register. It must be stored and interpreted according to its own service-assignment scope, independently of legal territorial parentage.

The amended Article 54 in Law 26-06 provides transitional context: while the new Wilaya executive councils are installed and organized, authorities of the “mother” Wilayas continue to exercise the relevant powers and obligations, and transfer them progressively no later than **31 December 2026**. Article 54 is not an individual Commune valid_from determination; it does not, by itself, settle the legal/operational history of each of these 13 rows. A qualified Algerian practitioner must determine how the transitional provision applies to specific local services and dates.

### 3.3 Uploaded Wilaya code 60 — El Abiodh Sidi Cheikh

**Controlling legal membership:** Law 26-06, amended Law 84-09 Article 52 bis 20, printed p.10, lists seven communes that constitute the new Wilaya El Abiodh Sidi Cheikh:

1. El Abiodh Sidi Cheikh
2. Aïn El Orak
3. Arbaouat
4. Boussemghoun
5. Chellala
6. El Bnoud
7. El Mehara

The uploaded archive also has seven rows under wilaya_code=60, but it substitutes three other communes:

| Result | Commune names | Uploaded candidate IDs |
|---|---|---|
| Present in statutory El Abiodh Sidi Cheikh list, absent from uploaded code 60 | Aïn El Orak; El Bnoud; El Mehara | — |
| Present in uploaded code 60, but assigned by Law 26-06 Article 36 to El Bayadh | Brezina; Ghassoul; Cheguig | 60-001, 60-002, 60-006 |
| Possible spelling/label variant; not accepted as canonical | Statutory “El Abiodh Sidi Cheikh” vs uploaded “Labiodh Sidi Cheikh” | 60-003 |

Law 26-06, amended Law 84-09 **Article 36**, lists **Brezina, Ghassoul and Cheguig** among the 15 communes that constitute the Wilaya El Bayadh. Thus the three uploaded rows are not valid El Abiodh Sidi Cheikh membership records under the controlling territorial statute.

JO52/2026 heading **69 — El Abiodh Sidi Cheikh** lists exactly the seven territorial names in Article 52 bis 20 as Daira-Chief assignments. This is a useful supplementary cross-check, not a substitute for the Law 26-06 territorial article.

## 4. What the uploaded daira structure can and cannot establish

The generator in the uploaded archive creates the daira and commune sequence IDs and links the commune rows to daira IDs from the upstream compiled JSON. The upstream provenance documentation says that its daira→commune hierarchy is carried from the pre-2025 structure and regrouped under the 69-Wilaya map, with split daira names represented under each relevant Wilaya. It also says commune/daira identifiers are synthesized library IDs, not government identifiers.

The uploaded dairas.csv has 11 rows under code 64 and 5 rows under code 60, while the JO52 current Daira-Chief assignment tables show four seats under heading 68 and three seats under heading 69. These populations and concepts are not equivalent. A legacy daira label, a Daira-Chief's service assignment, and a Commune's legal parent-Wilaya need separate source-backed meanings and, where time-dependent, separate effective-dated assertions.

The existing PROMO-GEST ADR 0010 and Reference-Data Governance document already require separation of:
- legal/geographic territorial jurisdiction; and
- operational authority that handled a transaction at a particular date.

This audit supplies concrete 2026 evidence for preserving that accepted architecture rule. It does **not** authorize a schema change. Before any future implementation, inspect all affected domain entities, API contracts, migrations, data consumers, and historical business workflows; then propose a separate model/migration design with integrity, backfill, rollback, and regression gates.

## 5. Effective dates and transitional administration

Law 26-06's amended Article 54 gives a latest deadline of 31 December 2026 for progressive transfer of the specified powers and obligations from mother-Wilaya authorities to new-Wilaya Walis. Do not use this general deadline as the valid_from date for any individual commune, Daira-Chief service assignment, project, title, permit, tax matter, or contract.

The following dates must remain separate in reference data:
- date of the law/decree or administrative order;
- date of official publication;
- effective date of legal territorial membership, if explicitly established;
- effective period of a Daira-Chief service assignment, if established;
- effective/transfer date of operational authority or competence, if established.

No row-level valid_from is approved by this audit.

## 6. Evidence quality

| Source | Exact scope used | Locator | Evidence limitation |
|---|---|---|---|
| JO52/2026 Decree 26-253 | Decree title and Articles 1–2 | Arabic and French text layers; printed p.10 / PDF page 9 | Screenshots for relevant Annex pages returned Cache miss |
| JO52/2026 Annex | Daira-Chief assignment population for headings 67, 68 and 69 | French printed pp.15–16; Arabic printed pp.18–19; text-layer line references in audit workpaper | No page-image inspection |
| JO25/2026 Law 26-06 | M’Sila territorial list, Article 32 | French printed p.7 | Text-layer inspection in this pass |
| JO25/2026 Law 26-06 | El Bayadh territorial list, Article 36 | French printed p.8 | Text-layer inspection in this pass |
| JO25/2026 Law 26-06 | Bou Saada and El Abiodh Sidi Cheikh lists, Article 52 bis 19–20 | French printed pp.9–10 | Text-layer inspection in this pass; printed p.11 of Arabic counterpart was visually inspected in the prior audit |
| JO25/2026 Law 26-06 | Mother-Wilaya transition, Article 54 | French printed p.10 | Text-layer inspection; no row-specific effective date is established |

## 7. Disposition and safeguards

1. Keep all uploaded records as unapproved candidate rows. Record the confirmed legal set errors as source-backed exceptions; do not rewrite communes.csv, the 1,541-row master ledger, or any production reference.
2. Do not treat JO52 Decree 26-253 as the territorial creation/membership basis for all commune/daira rows. Its Annex is the list of communes assigned to Daira Chiefs.
3. Do not treat a daira sequence ID, uploaded parent code, or upstream JSON parent grouping as a government-issued code or legal parent assertion.
4. Keep legal parent-Wilaya membership and Daira-Chief operational assignments separate in any future data model and UI/API labels. Preserve historical authority and valid-time provenance.
5. Do not invent code values, aliases, parent links, or valid_from dates.
6. No commune import; communesCount=0; all 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE; P1-01 and P1-35 remain In Progress/Pending; P1-02 remains Blocked.

## 8. References

- [Official JORADP JO52/2026 Arabic PDF — Decree 26-253](https://www.joradp.dz/FTP/jo-arabe/2026/A2026052.pdf)
- [Official JORADP JO52/2026 French PDF — Decree 26-253](https://www.joradp.dz/FTP/jo-francais/2026/F2026052.pdf)
- [Official JORADP JO25/2026 French PDF — Law 26-06](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf)
- [Official JORADP JO25/2026 Arabic PDF — Law 26-06](https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf)
- [Upstream data provenance — algeria-wilayas-communes](https://github.com/el-amin-dev/algeria-wilayas-communes/blob/main/docs/DATA_PROVENANCE.md)
- [PROMO-GEST ADR 0010 — Versioned, effective-dated Algerian administrative references](../ADR/0010-versioned-algerian-administrative-reference-data.md)
- [PROMO-GEST reference-data governance](../REFERENCE-DATA-GOVERNANCE.md)
