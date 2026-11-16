# PROMO GEST — Algerian Administrative Reference-Data Governance

**Legal baseline checked:** 16 November 2026.  
**Status:** The server-owned, bilingual, versioned 69-Wilaya catalogue and its UI integration are implemented and verified (PR #59). The canonical commune catalogue remains pending official extraction/reconciliation: the API reports `PendingOfficialVerification` and `communesCount = 0`; the 1,541 figure is the statutory baseline, not a loaded record count.

## 1. Authoritative territorial baseline

Law No. 26-06 of 4 April 2026, published in Official Journal No. 25 dated 5 April 2026, amends Law No. 84-09 on the territorial organization. Article 3 states that the new territorial division contains 69 Wilayas and 1,541 communes.

Presidential Decree No. 26-206 of 25 May 2026, published in Official Journal No. 40 dated 3 June 2026, adds the names and seats of Wilayas 59–69:
- 59 — أفلو / Aflou
- 60 — بريكة / Barika
- 61 — القنطرة / El Kantara
- 62 — بئر العاتر / Bir El Ater
- 63 — العريشة / El Aricha
- 64 — قصر الشلالة / Ksar Chellala
- 65 — عين وسارة / Aïn Oussera
- 66 — مسعد / Messaad
- 67 — قصر البخاري / Ksar El Boukhari
- 68 — بوسعادة / Bou Saâda
- 69 — الأبيض سيدي الشيخ / El Abiodh Sidi Cheikh

Primary sources:
- Law 26-06, Official Journal No. 25, Arabic: https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf
- Law 26-06, Official Journal No. 25, French: https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf
- Decree 26-206 and Decree 26-208, Official Journal No. 40, Arabic: https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf
- Decree 26-206 and Decree 26-208, Official Journal No. 40, French: https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf

## 2. Important distinction about the transition period

Executive Decree No. 26-208 concerns the division of assets and liabilities between the original and newly created Wilayas. Article 2 requires completion before 31 December 2026 for property-related operations and by the end of fiscal year 2026 for financial operations.

This is a specific assets/liabilities transition. It must not be described as proof that every municipal register, land registry, tax office, permit authority, address system or service counter has already completed its transfer. The ERP must distinguish the legally defined Wilaya/commune association from the operational authority that handled a record at a particular date.

## 3. Current application gap

The current organization and project records preserve:
- a Wilaya code;
- a bilingual Wilaya display-name snapshot;
- a free-text municipality/commune snapshot.

The server-owned reference in `PromoGest.Domain.Reference.AlgerianAdministrativeReference` provides the 69 bilingual Wilaya records with version, effective date and legal-source metadata. `GET /api/reference/administrative-units` exposes that catalogue publicly as read-only reference data. Domain validation resolves and checks Wilaya code/name combinations on writes. PR #59 connects the first-run setup, organization-profile edit and project create/update selectors to this API; each submits the server catalogue's canonical bilingual display name.

The API reports the legal commune baseline of 1,541 but deliberately contains zero commune records until the complete hierarchy and labels are reviewed. Project municipality remains free text. The implemented Wilaya subset is not a complete national administrative gazetteer.

## 4. Target reference-data model

The eventual catalogue should be server-owned, versioned and effective-dated. A reference record should carry:
- stable internal UUID;
- official unit type (Wilaya, commune, and any later verified administrative level);
- official external code where one exists;
- Arabic and French official labels;
- parent administrative unit;
- valid-from and valid-to dates;
- source publication, article/page and source dataset version;
- import/verification status and review provenance.

Keep two concepts distinct:
1. **Legal/geographic jurisdiction:** which Wilaya and commune a location belongs to under a dated official territorial baseline.
2. **Operational authority:** which office/authority actually processed a permit, land-register operation, tax filing or administrative transaction on a particular date.

Do not invent commune codes, transliterations, boundary changes or office assignments. Do not infer a commune transfer solely from a new Wilaya capital/name list. A full bilingual commune dataset must be extracted from the official territorial law or a verified government dataset, reviewed and reconciled before it becomes selectable in production.

The code rules in Articles 3–4 of Decree 85-20 mean that an official commune code is not a permanent identity: its first two digits encode the parent Wilaya, and a commune transferred to another Wilaya receives a new code while its former code is never reassigned. In PROMO GEST, use a stable internal UUID as the record identity and retain official codes as source-backed, effective-dated attributes with explicit history. This UUID rule is an application data-integrity decision; it is not presented as a requirement stated by the decree.

## 5. Historical-record preservation

Existing organization and project records contain free-text location snapshots. Preserve those original values.

The future migration should add nullable canonical reference IDs while keeping the original text and a source/verification state. A record can be linked to a canonical code only after the chosen code and effective date have been reviewed. Do not silently rewrite a historical project, contract, permit, land-title record or address when the current territorial catalogue changes.

When an administrative unit changes parent:
- preserve the old official code and its validity interval; when the official register assigns a new code, create a new effective-dated code assertion against the same reviewed internal identity rather than overwriting the historical value;
- retain the previous relationship with its validity interval;
- create the new relationship with its effective date;
- preserve both the recorded business address and the authority used for the transaction;
- make reports explicit about whether they use the current or historical territorial baseline.

## 6. API and UI ownership

The API/domain layer owns Wilaya validation and canonical labels. The browser consumes `GET /api/reference/administrative-units` and is not authoritative for names or codes. The response includes the version, effective date, legal source, commune verification status/counts and bilingual Wilaya labels.

PR #59 verified the read-only public endpoint on PostgreSQL 18, including `Cache-Control: no-store`, all 69 ordered codes, bilingual labels and explicit pending-commune metadata. Setup, organization-profile and project forms read this endpoint and fail closed if the reference is unavailable or does not contain exactly 69 valid two-digit Wilaya entries. The Vite-only simulator mirrors the response contract; production remains ASP.NET Core-owned.

During the commune compatibility period, legacy free-text municipality values remain snapshots. Do not silently assign or rewrite a canonical commune reference before the source and effective date have been reviewed.

## 7. Dataset acceptance checklist

Before adding a complete commune dataset:
1. Identify the exact official source edition, publication date and legally confirmed effective-from date. Do not treat the ONS June 2021 code-geography document (58-Wilaya baseline) as the final 2026 hierarchy by itself.
2. Inventory all amendments to the 22 June 1985 register, including the 12 September 2021 and 5 May 2026 instruments; do not assume these two are the only amendments. Reconcile the full legal lineage with Decree 85-20 and Law 26-06 before producing the accepted crosswalk. Apply the decree's code rule: a commune transferred to another Wilaya gets a new code and its old code is never reallocated; document every parent reassignment, code change, split or renamed locality explicitly.
3. Extract all 69 Wilaya–commune relationships from the combined authoritative sources, retaining source provenance for unchanged groups and amended groups.
4. Verify the total count against the legal baseline of 1,541 communes, accounting for source-specific spelling/alias issues.
5. Review Arabic and French labels together and keep administrative seats separate from commune names.
6. Verify that no commune is duplicated, omitted or assigned to two current parents without a justified effective-date history.
7. Document any transitional authority mapping separately from the legal hierarchy.
8. Add deterministic import, validation and regression tests.
9. Add an update/rollback plan for installations with historical project records.

See [ADR 0010 — Versioned administrative reference data](ADR/0010-versioned-algerian-administrative-reference-data.md).

## 8. Official-source audit and reconciliation findings — 16 November 2026

This is a source audit, not an imported dataset or a legal opinion. It records what each publication proves and what it does not prove. P1-01 remains `In Progress / Verification Pending`; P1-02 (the commune catalogue implementation) remains blocked until the full row-level crosswalk and qualified review are accepted.

### 8.1 Source hierarchy

| Official source | What it establishes | Boundary / non-substitute |
|---|---|---|
| [Decree 85-20 of 2 February 1985, JO No. 6, 3 February 1985 — French](https://www.joradp.dz/FTP/jo-francais/1985/F1985006.PDF) | Articles 3–4 establish the territorial register and code structure: two digits for a Wilaya; four digits for a commune, with the first two identifying its parent Wilaya. A commune transferred to another Wilaya receives a new code; its former code is not reassigned. Codes of dissolved units are not reassigned; unaffected units retain their code. | Establishes code semantics and update rules, not a stable database primary key or the current full 69-Wilaya dataset. |
| [Interministerial order of 22 June 1985, JO No. 44, 23 October 1985, p. 1052 — French](https://www.joradp.dz/FTP/jo-francais/1985/F1985044.PDF) | Establishes the initial territorial-register annex under Decree 85-20. | Historical baseline; subsequent amendments must be applied in sequence. |
| [Interministerial order of 8 February 1986, JO No. 11, 12 March 1986, p. 280 — French](https://www.joradp.dz/FTP/jo-francais/1986/F1986011.PDF) | Expressly modifies the annex to the 22 June 1985 order. The annex change includes Aïn Sandel (Guelma, code 2407), Bir Ben Laabed (Médéa, code 2656), and Haraza (Bordj Bou Arréridj, code 3434), each with a separately stated seat. | A focused amendment for specified entries, not a consolidated national register. |
| [Interministerial order of 21 March 1998, JO No. 23, 19 April 1998, p. 9 — French](https://www.joradp.dz/FTP/jo-francais/1998/F1998023.PDF) | Article 1 updates the register for the Grand-Alger Governorate and the Wilayas of Blida, Boumerdès and Tipaza; the annex provides commune, code and seat columns. | A territorial update for the named areas, not a consolidated national register. |
| [Interministerial order of 12 September 2021, JO No. 79, 17 October 2021 — French](https://www.joradp.dz/FTP/jo-francais/2021/F2021079.pdf) | Article 1 modifies and completes the annex to the 22 June 1985 order under Decree 85-20. It is an amendment to the register, not a replacement of the whole source chain. | Its preamble describes the 1985 order as already `modifié et complété`; the intervening pre-2021 amendment instruments are not yet exhaustively inventoried in this audit. Publication date is not automatically the effective date of every individual row. |
| [Law 26-06, JO No. 25, 5 April 2026 — Arabic](https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf) / [French](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf) | Article 3 establishes the 69-Wilaya / 1,541-commune national count. Article 2 amends specified articles of Law 84-09, including the legal commune compositions for affected parent Wilayas and the new Wilaya groupings. | The lists are legal parentage evidence; this text is not, by itself, a complete bilingual, code-assigned, seat-aware 1,541-row data file. |
| [Presidential Decree 26-206, JO No. 40, 3 June 2026 — French](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf) / [Arabic](https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf) | Supplements Decree 84-79 with the names and chef-lieux of Wilayas 59–69. | It establishes Wilaya names/seats, not the complete municipality-to-Wilaya mapping or commune codes. |
| [Executive Decree 26-208, JO No. 40, 3 June 2026 — same issue](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf) | Establishes the asset/liability sharing rules between parent and new Wilayas. Article 2 sets separate completion deadlines: before 31 December 2026 for patrimonial operations and at the end of FY2026 for financial operations. | It is a transition/asset-liability instrument, not evidence that every local office or operational registry transferred, and not the source of legal commune parentage. |
| [Interministerial order of 5 May 2026, JO No. 58, 12 August 2026 — French](https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026058.pdf) / [Arabic](https://www.joradp.dz/FTP/jo-arabe/2026/A2026058.pdf) | Amends/completes the 1985 territorial-register annex. The annex has three distinct headings: `COMMUNES`, `NUMEROS DE CODE`, and `SIEGES`; it names/code-numbers communes and separately records seats. It also explicitly marks unchanged Wilaya groups. | This is an amendment/delta with `sans changement` references, not a standalone republication of all 1,541 rows. The seat column is not an Arabic or French commune-name column. |
| [ONS National Geographic Code, June 2021](https://www.ons.dz/IMG/pdf/code_geo_2021.pdf) | Official bilingual historical baseline with Arabic/French commune labels and W./C. codes; it describes 58 Wilayas and 1,541 communes under the 2021 territorial arrangement. | It predates Law 26-06 and cannot be imported unchanged as the current 69-Wilaya parent hierarchy. Use it as a historical baseline/crosswalk input only, after reconciliation with the 2026 legal changes. |

### 8.2 Directly observed reconciliation facts

- The Law 26-06 JO25 French/Arabic editions identify the same national invariant: 69 Wilayas and 1,541 communes. The amended legal articles include specific parent-commune lists; these lists are the primary legal evidence for jurisdictional parentage.
- The JO58 order is dated 5 May 2026 and was published on 12 August 2026. Its annex uses *three* separate fields (commune, numeric code, seat). For example, the Batna section shows `Ghassira` / `0502` / `Ouled Abed` and `Maafa` / `0503` / `Barbat`; the Laghouat section shows `El Assafia` / `0320` / `El Assafia Gharbia`. A seat must never be loaded into the commune-name or alias field.
- The JO58 new-Wilaya headings list these commune counts: Aflou 12, Barika 8, El Kantara 5, Bir El Ater 4, El Aricha 4, Ksar Chellala 6, Aïn Ouessara 10, Messaad 8, Ksar El Boukhari 21, Bou Saâda 23, and El Abiodh Sidi Cheikh 7. Their sum is 108 rows across the 11 new-Wilaya sections only; it is not a replacement for the national 1,541 count.
- The JO58 annex uses explicit `sans changement` blocks for some Wilaya groups. These references must be resolved against the cited prior official register/baseline; they cannot be interpreted as missing records or silently omitted during extraction.
- Decree 85-20 (JO No. 6, 3 February 1985), Articles 3–4, defines the two-digit Wilaya and four-digit commune code structure. The first two commune-code digits encode the attached Wilaya; a commune transferred to another Wilaya receives a new code and its old code is not reallocated. The rule also says codes of dissolved Wilayas/communes are not reallocated and unaffected units retain their codes. Therefore an external commune code cannot serve as PROMO GEST's immutable primary identity.
- Additional pre-2021 amendments found in the official JORADP archive include the 8 February 1986 order (JO No. 11), which modifies entries for Aïn Sandel (2407), Bir Ben Laabed (2656) and Haraza (3434), and the 21 March 1998 order (JO No. 23), which updates the Grand-Alger Governorate and Wilayas Blida, Boumerdès and Tipaza. These are discrete amendments, not complete republications.
- The 2021 order's preamble explicitly refers to the 22 June 1985 order as already modified and completed; the 2026 JO58 order likewise describes that register as modified and completed. The 1985/2021/2026 documents listed here are verified milestones, not proof that every intervening amendment has been identified. Inventory and reconcile all intervening instruments before declaring the legal-source chain exhaustive or accepting the 1,541-row crosswalk.
- Official French editions use variant spellings for some names. One visible example is the new Wilaya 65: the current in-code reference spells `Aïn Oussera`, while the JO40 decree and JO58 territorial register spell `Aïn Ouessara`. The JO58 register also writes `Bou Saada` where the current code and JO40 decree use `Bou Saâda`. Treat these as source variants requiring recorded provenance and a reviewed canonical-label decision, not automatic transliteration or silent rename.
- Record the instrument's signed date, publication date and legally confirmed `valid_from` separately. Do not assume that a signature date, the first PDF date, or a Wilaya-seat decree publication automatically supplies every commune relationship's effective-from date. The applicable commencement and any transitional parent interval require legal review.

### 8.3 Required crosswalk before import

The source reconciliation must produce a reproducible 1,541-row crosswalk with, at minimum:
- a stable internal row ID independent of the official code, plus the official Wilaya code/name for each version;
- a versioned official commune code with valid-from / valid-to and retained prior codes; assert that transferred communes receive the legally assigned new code and that former/dissolved codes are never silently reused;
- the legal commune name in Arabic and French as separately sourced fields;
- the official commune code, if established by the territorial register;
- the administrative seat in separate Arabic/French fields only where the source actually establishes it;
- parent-Wilaya relationship with valid-from / valid-to, source instrument, article/annex, page and extraction provenance;
- retained historical spelling/code/parent values and source-specific aliases without using a seat as a commune name;
- separate legal-jurisdiction and operational-authority references, with no assumption that Decree 26-208's asset-transfer timetable completes every operational-office transfer;
- source file URLs, retrieval/publication metadata, checksum of each source artifact, parser/extraction version, and a reviewer record.

Required deterministic checks: exactly 1,541 active commune rows for the legally approved baseline; all 69 Wilayas represented; no duplicate official code within a version; no missing parent; no unintended duplicate commune; no overlapping current-parent intervals; all historical parent changes have an evidence-backed boundary; and Arabic/French variants are paired only where an authoritative source supports the pairing.

No commune data, schema, migration, production database, or Google AI Studio Cloud SQL data was changed by this audit. The existing free-text municipality compatibility path must remain until the complete source crosswalk, legal-effective dates and qualified review are accepted.
