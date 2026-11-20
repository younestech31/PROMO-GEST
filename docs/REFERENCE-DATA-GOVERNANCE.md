# PROMO GEST — Algerian Administrative Reference-Data Governance

**Legal baseline checked:** 19 November 2026.  
**Current repository evidence anchor:** main `a306487d06068649bbffbc2b5ef2e05c4dcac102`; [main CI #1029](https://github.com/younestech31/PROMO-GEST/actions/runs/44728401646) passed all three required jobs on the exact SHA.  
**Status:** The server-owned, bilingual, versioned 69-Wilaya catalogue and its UI integration are implemented and verified (PR #59). The P1-01 master workpaper structurally links 1,541 candidate keys to 1,541 JO44 historical assertions and is covered by CI #1029 on main SHA `a306487d06068649bbffbc2b5ef2e05c4dcac102`. A separate evidence set adds 29 Arabic JO44 page images, a 1,541-row page-level locator and 48/48 printed-count reconciliation; every locator is `PAGE_IMAGE_MAPPED_NOT_ROW_TRANSCRIBED`. PR #146 adds 51 bounded bilingual readings and PR #155 adds 26 W41 Arabic/French row readings plus four collision controls. These are partial historical evidence, not full row transcription or legal approval. The master ledger records 1,431 proposed-clean rows, 110 practitioner-decision rows, 75 Arabic anomaly flags, and all 1,541 sign-offs PENDING. The API remains `PendingOfficialVerification` / `communesCount = 0`; no candidate rows are imported.

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
| [Interministerial order of 8 February 1986, JO No. 11, 12 March 1986, p. 280 — French](https://www.joradp.dz/FTP/jo-francais/1986/F1986011.PDF) | Expressly modifies the annex to the 22 June 1985 order. The annex change lists four commune/code/seat rows: Aïn Sandel (Guelma, 2407; seat Aïn Souda), Bir Ben Laabed (Médéa, 2656; seat Zoudj El Beida), Haraza (Bordj Bou Arréridj, 3434; seat Fédala), and Béni Guécha (El Oued, 3919; seat Béni Guécha). | A focused amendment for specified entries, not a consolidated national register. |
| [Interministerial order of 21 March 1998, JO No. 23, 19 April 1998, pp. 9–11 — French](https://www.joradp.dz/FTP/jo-francais/1998/F1998023.PDF) | Article 1 updates the register for the Grand-Alger Governorate and Wilayas of Blida, Boumerdès and Tipaza; its annex enumerates communes, codes and seats in separate columns. Article 2 orders publication. The Boumerdès section (Wilaya code 35, printed p. 11) transcribes Chabet El Ameur with code `3614`. | A geographically bounded update, not a consolidated national register. The `3614` transcription conflicts with the 1985 base register, a non-territorial 1996 school-directory cross-check, ONS 2008 and the Decree 85-20 code-prefix rule; preserve it as a source-specific unresolved anomaly, not a corrected value. |
| [Interministerial order of 12 September 2021, JO No. 79, 17 October 2021 — French](https://www.joradp.dz/FTP/jo-francais/2021/F2021079.pdf) | Article 1 modifies and completes the annex to the 22 June 1985 order under Decree 85-20. It is an amendment to the register, not a replacement of the whole source chain. | Its preamble describes the 1985 order as already `modifié et complété`; the intervening pre-2021 amendment instruments are not yet exhaustively inventoried in this audit. Publication date is not automatically the effective date of every individual row. |
| [Law 26-06, JO No. 25, 5 April 2026 — Arabic](https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf) / [French](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf) | Article 3 establishes the 69-Wilaya / 1,541-commune national count. Article 2 amends specified articles of Law 84-09, including the legal commune compositions for affected parent Wilayas and the new Wilaya groupings. | The lists are legal parentage evidence; this text is not, by itself, a complete bilingual, code-assigned, seat-aware 1,541-row data file. |
| [Presidential Decree 26-206, JO No. 40, 3 June 2026 — French](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf) / [Arabic](https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf) | Supplements Decree 84-79 with the names and chef-lieux of Wilayas 59–69. | It establishes Wilaya names/seats, not the complete municipality-to-Wilaya mapping or commune codes. |
| [Executive Decree 26-208, JO No. 40, 3 June 2026 — same issue](https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf) | Establishes the asset/liability sharing rules between parent and new Wilayas. Article 2 sets separate completion deadlines: before 31 December 2026 for patrimonial operations and at the end of FY2026 for financial operations. | It is a transition/asset-liability instrument, not evidence that every local office or operational registry transferred, and not the source of legal commune parentage. |
| [Interministerial order of 5 May 2026, JO No. 58, 12 August 2026 — French](https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026058.pdf) / [Arabic](https://www.joradp.dz/FTP/jo-arabe/2026/A2026058.pdf) | Amends/completes the 1985 territorial-register annex. The annex has three distinct headings: `COMMUNES`, `NUMEROS DE CODE`, and `SIEGES`; it names/code-numbers communes and separately records seats. It also explicitly marks unchanged Wilaya groups. | This is an amendment/delta with `sans changement` references, not a standalone republication of all 1,541 rows. The seat column is not an Arabic or French commune-name column. |
| [ONS National Geographic Code, June 2021](https://www.ons.dz/IMG/pdf/code_geo_2021.pdf) | Official bilingual historical baseline with Arabic/French commune labels and W./C. codes; it describes 58 Wilayas and 1,541 communes under the 2021 territorial arrangement. | It predates Law 26-06 and cannot be imported unchanged as the current 69-Wilaya parent hierarchy. Use it as a historical baseline/crosswalk input only, after reconciliation with the 2026 legal changes. |
| [ONS Code Géographique National, 5th General Population and Housing Census (2008)](https://www.ons.dz/IMG/pdf/code_geo.pdf) | Official bilingual geographic-reference tables with separate W./C. columns. The table lists CHAABET EL AMEUR 35/14 (printed p. 50), CHIHANI 36/14 and RAML SOUK 36/24 (printed p. 51). | This is an official ONS cross-check, not an amendment to the Decree 85-20 register or a current 2026 parent hierarchy. Four-digit candidates are derived from W./C. under Article 3; page-image review and SHA-256 are outstanding. |

### 8.2 Directly observed reconciliation facts

- The Law 26-06 JO25 French/Arabic editions identify the same national invariant: 69 Wilayas and 1,541 communes. The amended legal articles include specific parent-commune lists; these lists are the primary legal evidence for jurisdictional parentage.
- The JO58 order is dated 5 May 2026 and was published on 12 August 2026. Its annex uses *three* separate fields (commune, numeric code, seat). For example, the Batna section shows `Ghassira` / `0502` / `Ouled Abed` and `Maafa` / `0503` / `Barbat`; the Laghouat section shows `El Assafia` / `0320` / `El Assafia Gharbia`. A seat must never be loaded into the commune-name or alias field.
- The JO58 new-Wilaya headings list these commune counts: Aflou 12, Barika 8, El Kantara 5, Bir El Ater 4, El Aricha 4, Ksar Chellala 6, Aïn Ouessara 10, Messaad 8, Ksar El Boukhari 21, Bou Saâda 23, and El Abiodh Sidi Cheikh 7. Their sum is 108 rows across the 11 new-Wilaya sections only; it is not a replacement for the national 1,541 count.
- The JO58 annex uses explicit `sans changement` blocks for some Wilaya groups. These references must be resolved against the cited prior official register/baseline; they cannot be interpreted as missing records or silently omitted during extraction.
- Decree 85-20 (JO No. 6, 3 February 1985), Articles 3–4, defines the two-digit Wilaya and four-digit commune code structure. The first two commune-code digits encode the attached Wilaya; a commune transferred to another Wilaya receives a new code and its old code is not reallocated. The rule also says codes of dissolved Wilayas/communes are not reallocated and unaffected units retain their codes. Therefore an external commune code cannot serve as PROMO GEST's immutable primary identity.
- Additional pre-2021 amendments found in the official JORADP archive include the 8 February 1986 order (JO No. 11), which modifies four commune/code/seat entries: Aïn Sandel (2407; Aïn Souda), Bir Ben Laabed (2656; Zoudj El Beida), Haraza (3434; Fédala), and Béni Guécha (3919; Béni Guécha). The 21 March 1998 order (JO No. 23) updates the Grand-Alger Governorate and Wilayas Blida, Boumerdès and Tipaza, with commune, code and seat columns. These are geographically scoped amendments, not complete national republications.
- The 2021 order's preamble explicitly refers to the 22 June 1985 order as already modified and completed; the 2026 JO58 order likewise describes that register as modified and completed. The 1985, 1986, 1998, 2021 and 2026 documents listed here are verified milestones, not proof that every intervening amendment has been identified. Inventory and reconcile all intervening instruments before declaring the legal-source chain exhaustive or accepting the 1,541-row crosswalk.
- The 1998 JO No. 23 annex (printed p. 11) places Chabet El Ameur under the heading `Wilaya de Boumerdès : N° de code 35` but prints the commune code as `3614` (the row reads `Chabet El Ameur / 3614 / Chabet El Ameur`). This is a raw value from the official journal, not a value inferred by this audit.
- That `3614` transcription conflicts with (a) the 22 June 1985 territorial-register annex in JO No. 44 (printed p. 1069), which lists Chabet El Ameur as `3514` under Boumerdès; (b) JO No. 49/1996 (printed p. 15), whose Annex I (continued) belongs to Executive Decree No. 96-273 of 20 August 1996 on the creation and suppression of fundamental schools, and identifies a school in Chabet El Ameur with commune code `3514`; and (c) ONS, *Armature urbaine 2008*, Table 52, which gives the geographic code `3514` for Chabet El Ameur. The 1996 row is a school-location/directory cross-check, not an amendment or consolidation of the 1985 territorial register; it supports evidence of code usage but does not settle the legal force of the conflicting 1998 register transcription. The ONS source is also corroborating reference material, not an amendment to the territorial register.
- Decree 85-20's four-digit commune-code structure ties the first two digits to the Wilaya code. Thus `3614` is inconsistent with the 1998 annex's own Boumerdès-35 heading. This audit does **not** decide that the 1998 value is a typographical error or determine which value has legal force for every date. Preserve both raw source observations, flag the row for qualified legal/practitioner adjudication, and do not normalize or import it as an accepted canonical code until resolved.
- **Visual-source verification checkpoint (17 November 2026):** the Arabic Law 26-06 PDF, JO No. 25, printed page 4 was visually inspected from the official PDF. The page header identifies JO No. 25 dated 5 April 2026, and Article 3 visibly states a national total of 69 Wilayas and 1,541 communes. This visually verifies that statutory total on that page only; it does not visually verify every commune list or complete the crosswalk.  
- **JO No. 58 / 12 August 2026:** the official French PDF text layer is available to the search/indexing service. It identifies the 5 May 2026 interministerial order and the annex headings `COMMUNES`, `NUMEROS DE CODE`, and `SIEGES`; extracted table entries show that seats can differ from commune names. However, screenshot attempts for the relevant JO58 annex pages returned `Cache miss`. The 108 new-Wilaya row count and all JO58 table examples therefore remain text-extraction observations, not visually verified page transcriptions. The Arabic JO58 annex has not yet been visually cross-checked.  
- **Earlier source PDFs:** the screenshot service also returned cache misses for the relevant 1985/1996/1998 pages. Those row-level comparisons remain text-extraction evidence. Visual verification of these archival page images, the JO58 annex pages, and qualified practitioner adjudication remain outstanding.
- Official French editions use variant spellings for some names. One visible example is the new Wilaya 65: the current in-code reference spells `Aïn Oussera`, while the JO40 decree and JO58 territorial register spell `Aïn Ouessara`. The JO58 register also writes `Bou Saada` where the current code and JO40 decree use `Bou Saâda`. Treat these as source variants requiring recorded provenance and a reviewed canonical-label decision, not automatic transliteration or silent rename.
- Record the instrument's signed date, publication date and legally confirmed `valid_from` separately. Do not assume that a signature date, the first PDF date, or a Wilaya-seat decree publication automatically supplies every commune relationship's effective-from date. The applicable commencement and any transitional parent interval require legal review.


#### ONS historical code cross-check — 2008 edition (18 November 2026)

The official ONS Code Géographique National published with the 5th General Population and Housing Census identifies:
- Boumerdès: CHAABET EL AMEUR, W.=35/C.=14 (derived 3514), Arabic شعبة العامر, printed p. 50.
- El Tarf: CHIHANI, W.=36/C.=14 (derived 3614), Arabic شهاني, and RAML SOUK, W.=36/C.=24 (derived 3624), Arabic رمل سوق, printed p. 51.

This 2008 edition is independent corroborating reference material, not a territorial-register amendment. It provides an earlier official cross-check after the 1998 order and supports the Article 3 W./C. composition for these rows. Its extracted Arabic CHIHANI spelling (شهاني) differs from the 2021 ONS text layer (شحاني); preserve both source forms until reviewed. Web page screenshots for the ONS 2008 PDF returned Cache miss; no original PDF bytes or SHA-256 were obtained. Do not claim visual verification, and do not treat this source as a legal adjudication of the JO23/1998 Chabet El Ameur 3614 assertion.

### 8.3 Required crosswalk before import

The source reconciliation must produce a reproducible 1,541-row crosswalk with, at minimum:
- a stable internal row ID independent of the official code, plus the official Wilaya code/name for each version;
- a versioned official commune code with valid-from / valid-to and retained prior codes; assert that transferred communes receive the legally assigned new code and that former/dissolved codes are never silently reused;
- the legal commune name in Arabic and French as separately sourced fields;
- the official commune code, if established by the territorial register;
- the administrative seat in separate Arabic/French fields only where the source actually establishes it;
- parent-Wilaya relationship with valid-from / valid-to, source instrument, article/annex, page and extraction provenance;
- retained historical spelling/code/parent values and source-specific aliases without using a seat as a commune name;
- exact verbatim source transcription for every disputed code, separately from any proposed canonical value; explicit unresolved-source-conflict state, with evidence from all competing instruments and a named qualified adjudication record; never auto-correct a code merely because it fails the parent-prefix check;
- separate legal-jurisdiction and operational-authority references, with no assumption that Decree 26-208's asset-transfer timetable completes every operational-office transfer;
- source file URLs, retrieval/publication metadata, checksum of each source artifact, parser/extraction version, and a reviewer record.

Required deterministic checks: exactly 1,541 active commune rows for the legally approved baseline; all 69 Wilayas represented; no duplicate official code within a version; no missing parent; no unintended duplicate commune; no overlapping current-parent intervals; all historical parent changes have an evidence-backed boundary; and Arabic/French variants are paired only where an authoritative source supports the pairing. Every code-prefix anomaly or cross-instrument disagreement must remain a blocking exception until the raw evidence and qualified resolution are recorded; deterministic shape checks must not silently rewrite official-source transcriptions.

No commune data, schema, migration, production database, or Google AI Studio Cloud SQL data was changed by this audit. The existing free-text municipality compatibility path must remain until the complete source crosswalk, legal-effective dates and qualified review are accepted.


### 8.4 Open-source candidate dataset audit — 17 November 2026

This review evaluates the four public repositories suggested for the commune crosswalk. It is a reproducible candidate-source comparison, **not** acceptance of any repository as the legal register and not a full 1,541-row legal verification.

#### Primary commune-register source

The interministerial order dated **5 May 2026**, published in Official Journal No. 58 on **12 August 2026**, is the identified primary source for the amended territorial-register entries for the new Wilayas. The French text layer exposes three distinct annex columns: `COMMUNES`, `NUMEROS DE CODE`, and `SIEGES`. The annex therefore distinguishes the legal commune name, its four-digit register code, and the administrative seat; the seat must never be loaded as an alias or replacement commune name.

Examples from the JO58 text extraction:
- Wilaya 59: `Oued M’Zi` has register code `5911`, while its listed seat is `Madna El Grada`.
- Wilaya 60: `Abdelkader Azil` has register code `6003`, while its listed seat is `Layadate`.
- Wilaya 67: `Ouled Hellal` has register code `6708`, while its listed seat is `Kermat Chiha`.

The official source is available in [JO58 French PDF](https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026058.pdf) and [JO58 Arabic PDF](https://www.joradp.dz/FTP/jo-arabe/2026/A2026058.pdf). The relevant screenshot attempts returned `Cache miss`; the examples above remain **text-extraction observations only**, not visually verified page transcriptions. Law 26-06 in JO25 establishes the total of 69 Wilayas and 1,541 communes; Decree 26-206 in JO40 establishes the new Wilaya names and seats. The JO58 register amendment is the source identified here for the four-digit commune register codes and separate commune-seat column.

#### Pinned open-source comparisons

| Repository snapshot | Published structure and provenance | Audit result / permitted use |
|---|---|---|
| [islam-re/Algeria-wilayas](https://github.com/islam-re/Algeria-wilayas) — commit `bfb29814117d11a6a101fa07c38911f6675b748b`; JSON blob `1aba9bc954bf43328ca54081f0448f613b72604e` | MIT; nested Wilaya → commune bilingual name data. The pinned JSON contains 69 Wilaya groups and 1,541 commune-name rows. It does not provide a four-digit JO58 commune register code or a separate administrative-seat field. | Useful as a bilingual name/parent-group cross-check. Its last push was 30 July 2026, before JO58 was published on 12 August 2026; it cannot be treated as a transcription of the published JO58 annex. |
| [riadh2002/algeria-69-wilayas-1541-communes](https://github.com/riadh2002/algeria-69-wilayas-1541-communes) — commit `5daab758b59c1421f38180b7e8bc83830a7612fc`; JSON blob `09219a9e9238b57de366f34b9d091f70d554b196` | Repository states MIT. Its NOTICE says Wilaya/commune assignment and names come from islam-re; postcodes and coordinates come from `Kenandarabeh/algeria-wilayas-communes-2026`, for which NOTICE says no licence statement is published; daira verification uses othmanus, also without a published licence statement. The file has 1,541 rows, including dataset `id`, postal code, names, daira and coordinates, but not the JO58 four-digit register code or separate seat. | Group counts match the legal 2026 counts, but upstream rights for some distributed fields are unresolved. A concrete name discrepancy needs adjudication: the Wilaya-60 row with dataset `id=131` contains Latin `Metkaouak` and Arabic `عزيل عبد القادر`, while the JO58 text extraction lists `Abdelkader Azil`, code `6003`, seat `Layadate`. Do not promote this row to canonical data based on the dataset ID or its apparent Arabic pairing. |
| [yasserstudio/geoalgeria](https://github.com/yasserstudio/geoalgeria) — commit `0814c5f0c49908e9ccd3259b46cc01d713bcf697`; `packages/dataset/data/algeria.json` blob `326c8ebbddd45fc0225b7ed4b96706c00e56968f` | The administrative compilation (Wilayas, dairas, communes, names, postcodes and administrative codes) is declared MIT. Its dataset licence/NOTICE separately place 69 Wilaya boundary polygons, 323 OSM-derived commune-centre coordinates and OSM relation/Wikidata values under ODbL 1.0; mirrored Algérie Poste data has its own terms and is not MIT. The dataset contains 69/1,541 records. | Valuable bilingual and parent-group cross-check, but mixed licence terms must be honoured per field. The `code_commune` field is not the JO58 four-digit register code: for Aflou, the candidate record has `code_commune=319`, while the JO58 register starts Aflou's commune register codes at `5901`. It also does not provide the JO58 seat column as a separate legal field. Do not import the package wholesale or infer administrative parentage from postal prefixes. |
| [othmanus/algeria-cities](https://github.com/othmanus/algeria-cities) | README still declares 58 Wilayas, 546 dairas and 1,541 communes; latest repository push observed 26 May 2024. No licence declaration was found in the inspected repository root. | Historical/postal or daira comparison only. Not a 2026 parent-Wilaya source and not approved for redistribution without licence review. |

#### Machine comparison completed

The pinned candidate data files from islam-re, riadh2002 and GeoAlgeria each contain 69 Wilaya groups and 1,541 commune records. Their group counts for the 11 newly created Wilayas agree:

| Wilaya code | 59 | 60 | 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Commune count in each candidate | 12 | 8 | 5 | 4 | 4 | 6 | 10 | 8 | 21 | 23 | 7 |

This is a **count and parent-group check only**. It does not prove row-level identity, exact Arabic/French spelling, four-digit JO58 register code, seat, legal effective date, historical lineage, source completeness, absence of all duplicates/omissions, or legal validity. The JO58 text extraction separately exposes 108 rows under the 11 new-Wilaya sections; those rows still require visual verification and source-by-source reconciliation. Matching counts cannot resolve the `Metkaouak` / `Abdelkader Azil` discrepancy or the previously recorded Chabet El Ameur `3614` vs `3514` conflict.

#### Import boundary and field semantics

- Treat the four-digit commune register code, external dataset ID, postal code, ONS/geographic code, OpenStreetMap relation ID, and internal PROMO GEST UUID as different fields with different provenance. Never infer a Wilaya code from the first digits of a postal code; transferred communes may keep historical postal identifiers.
- Preserve commune name and administrative seat in separate fields. Record source spelling as observed before proposing a canonical bilingual label.
- The new-Wilaya group-count match does not replace the outstanding full 1,541-row crosswalk, exhaustive amendment inventory, source-page visual inspection, effective-date analysis, and qualified Algerian legal/practitioner review.
- No candidate repository has been adopted as the canonical source, and no commune row has been imported. API status remains `PendingOfficialVerification` with `communesCount = 0`. P1-01 remains `In Progress / Pending`; P1-02 remains `Blocked`.


#### Row-name cross-check against the JO58 text layer — 17 November 2026

A second deterministic comparison was run against the 108 commune names in the **left/commune column** of the JO58 text extraction for Wilayas 59–69. Comparison normalization removed diacritics, case differences, punctuation and spacing; it did not translate names or treat the right-hand seat column as a commune name.

- The pinned islam-re bilingual JSON `ascii` name set matched all 108 extracted JO58 commune names after that normalization; its group counts also matched each Wilaya.
- The pinned GeoAlgeria `name_fr` set matched all 108 extracted JO58 commune names after the same normalization; its group counts also matched each Wilaya.
- Riadh2002 had the correct group count in each new Wilaya, but **17 commune-name strings did not match** the JO58 left-column name set after that normalization:

| Wilaya | JO58 extracted commune name | Riadh2002 name |
|---:|---|---|
| 59 | El Beïdha | Beidha |
| 60 | Abdelkader Azil | Metkaouak |
| 60 | M’Doukal | M'doukel |
| 61 | Djemourah | Djemorah |
| 62 | El Ogla El Melha | El Ogla |
| 64 | Zmalet El Emir Abdelkader | Zmalet El Emir Aek |
| 64 | Serguine | Serghine |
| 65 | Aïn Ouessara | Ain Oussera |
| 65 | Bouira Lahdab | Bouira Lahdeb |
| 66 | Faïdh El Botma | Feidh El Botma |
| 67 | Oum El Djallil | Oum El Djalil |
| 67 | M’Fatha | Meftaha |
| 68 | Mouhamed Boudiaf | Oued Chair |
| 68 | Menaâ | Ouled Atia |
| 68 | Aïn El Meleh | Ain El Melh |
| 68 | Oultem | Oultene |
| 69 | El Meharra | El Mehara |

This table records **unmatched source strings**, not 17 adjudicated errors. Some may be spelling/transliteration variants; others may be row-identity or parent-assignment problems. In particular, the Riadh2002 row `id=131` pairs `Metkaouak` with Arabic `عزيل عبد القادر`, while the JO58 text extraction names commune `Abdelkader Azil` with code `6003` and seat `Layadate`; the candidate file contains no exact Latin `Abdelkader Azil` row elsewhere. This must be checked against the Arabic JO58 image and historical source lineage before any canonical correction.

The result raises islam-re and GeoAlgeria as useful **French-name/parent-group comparison inputs for the 108 new-Wilaya entries only**. It does not establish Arabic-name correctness, official four-digit codes, seats, legal effective dates, the other 1,433 commune rows, exhaustive historical amendments, or practitioner approval. The JO58 page screenshots remain unavailable (`Cache miss`), so all JO58 row comparisons are still text-extraction-only. No data was imported and P1-01 remains open.


### 8.5 JO58 annex scope and Arabic legal-name cross-check — 17 November 2026

A fresh read of the official JO58 French PDF text layer confirms that Article 1 modifies and completes the annex to the interministerial order of 22 June 1985; it does not republish the entire national register. The annex headings are `COMMUNES`, `NUMEROS DE CODE`, and `SIEGES`: commune name, four-digit register code, and administrative seat are separate fields. The JORADP text representation exposes the headings and tabular rows, but its text extraction must not be treated as a substitute for visual page verification.

In addition to the 11 new-Wilaya sections (108 communes), the French JO58 text layer exposes ten affected existing-Wilaya sections. The section headers state these counts:

| Existing Wilaya | Code | Count stated in JO58 |
|---|---:|---:|
| Laghouat | 03 | 12 |
| Batna | 05 | 53 |
| Biskra | 07 | 22 |
| Tébessa | 12 | 24 |
| Tlemcen | 13 | 49 |
| Tiaret | 14 | 36 |
| Djelfa | 17 | 18 |
| Médéa | 26 | 43 |
| M’Sila | 28 | 24 |
| El Bayadh | 32 | 15 |
| **Total of ten affected existing-Wilaya sections** | | **296** |

The 11 new-Wilaya sections total 108; therefore the JO58 annex contains **404 declared commune entries across its 21 printed Wilaya sections** (296 + 108). The remaining 48 Wilayas are represented by explicit `sans changement` references in the annex. This is a scope inventory, not a completed national crosswalk: it does not prove the 1,541 commune rows, all bilingual labels, all historical code/parent intervals, or every prior amendment. Earlier audit wording that counted nine existing-Wilaya sections / 260 rows omitted Tiaret (Wilaya 14, 36 communes) and is superseded by this corrected count.

The affected existing-Wilaya count vector is 03=12, 05=53, 07=22, 12=24, 13=49, 14=36, 17=18, 26=43, 28=24, 32=15. The new-Wilaya counts (59–69) remain 12, 8, 5, 4, 4, 6, 10, 8, 21, 23, 7 respectively.

#### Barika / Abdelkader Azil — Arabic and French legal-name cross-check

The Arabic text of Law 26-06, JO No. 25, Article 52 bis 11 includes the Barika commune name `عبد القادر عزيل`. The French JO58 text-layer row lists commune `Abdelkader Azil`, register code `6003`, and separate seat `Layadate`. This supports the Arabic/French lexical pairing at text-layer level; the Arabic JO58 annex page itself still requires visual verification.

The Riadh2002 candidate row with `id=131` remains unsuitable as a canonical match: it pairs Latin `Metkaouak` with Arabic `عزيل عبد القادر`, while the JO25 Arabic string is `عبد القادر عزيل` and the JO58 French row is `Abdelkader Azil`. The difference in word order/Latin label is a source-row identity discrepancy, not authority to silently rename, remap, or import the row.

#### Separate commune names, codes and seats

The French JO58 text layer shows examples in which the seat is not the commune label:

| Wilaya | Commune | Register code | Seat |
|---|---|---:|---|
| Aflou (59) | Oued M’Zi | 5911 | Madna El Grada |
| Barika (60) | Abdelkader Azil | 6003 | Layadate |
| Barika (60) | Djezzar | 6006 | Merabtine |
| Tébessa (12) | Gourrigueur | 1216 | Satha |
| Médéa (26) | Djouab | 2637 | Nacerddine |
| El Bayadh (32) | Arbaouat | 3209 | Arba Fougani |

These are French text-layer observations and still require the row/page visual check before ingestion. The parser must retain source column identity; it must never treat a seat as an alternative commune name.

#### Evidence limits and import boundary

- Official text-layer sources: [JO58 French PDF](https://www.joradp.dz/FTP/JO-FRANCAIS/2026/F2026058.pdf), [JO58 Arabic PDF](https://www.joradp.dz/FTP/jo-arabe/2026/A2026058.pdf), and [Law 26-06, JO25 Arabic PDF](https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf).
- The supplied audit reports that a local `pdftotext` extraction can reverse the apparent column order on printed page 22 between the Barika and Bir El Ater sections. That exact local extraction has not yet been independently reproduced in this repository audit. The JORADP text-layer rendering reviewed here associates `El Ogla El Melha / 6203 / Ain Zeguig` in that order. Until visual confirmation is complete, no fixed positional regex or parser assumption is approved.
- Arabic JO58 pages 21–25 require image-based review because the supplied audit reports malformed Arabic text-layer glyph mapping and line segmentation. No Arabic JO58 row is marked visually verified by this audit.
- Screenshot requests for relevant JORADP PDFs have returned `Cache miss`; PDF bytes have not been obtained in the working runtime, so source-artifact SHA-256 values have **not** been generated. Do not invent or publish checksums until the exact original PDF bytes are downloaded and hashed.
- Required visual review: printed JO58 pages 9–25 in both French and Arabic, including the commune/code/seat rows and the 2026 Arabic spellings; plus the Boumerdès section on printed page 11 of JO23/1998 in both French and Arabic. Record PDF URL, edition/language, printed page, row, reviewer, and evidence artifact.
- No canonical commune dataset was adopted, no source row was rewritten, and no commune data/schema/migration/production/Cloud SQL record was changed. API remains `communesCount = 0` / `PendingOfficialVerification`; P1-01 stays In Progress / Pending and P1-02 stays Blocked.


### 8.6 Legal register lineage and Chabet El Ameur discrepancy — 17 November 2026

This section records the source hierarchy and the presently corroborated Chabet El Ameur evidence. It is a technical source audit and proposed sign-off position, **not a legal opinion or qualified practitioner approval**.

#### Register lineage relevant to the 1,541-row crosswalk

The legal sources answer different questions and must not be conflated:

| Instrument / publication | Scope established in this audit | Provenance use and limitation |
|---|---|---|
| Decree No. 85-20 of 2 February 1985, JO No. 06, 3 February 1985 | Establishes the `Répertoire des collectivités territoriales` and the code structure/update rules. | Governs territorial-register code semantics; it is not itself the consolidated 2026 row list. |
| Interministerial order of 22 June 1985, JO No. 44, 23 October 1985, pp. 1052–1073 | Initial register annex with Wilaya/commune labels, codes and seats. | Historical base edition; later amendments must be applied as dated deltas. |
| Interministerial order of 8 February 1986, JO No. 11, 12 March 1986, p. 280 | A specific amendment to the 1985 register. The extracted annex contains four commune/code/seat updates: Aïn Sandel (2407), Bir Ben Laabed (2656), Haraza (3434), and Béni Guécha (3919). | Confirm the complete row transcription and all effects against both official editions before finalizing the national crosswalk; this is not a full replacement register. |
| Interministerial order of 21 March 1998, JO No. 23, 19 April 1998, pp. 9–11 | Updates the Grand-Alger Governorate and the Wilayas of Blida, Boumerdès and Tipaza. The Boumerdès page 11 table declares 32 communes. | A geographically bounded register delta; the French page 11 prints Chabet El Ameur with code `3614`. |
| Interministerial order of 12 September 2021, JO No. 79, 17 October 2021 | Modifies and completes the 1985 register, including the 49–58 Wilaya changes and affected parent-Wilaya entries. | Amendment/delta, not proof that the unchanged sections were reprinted or that it is the only pre-2026 amendment. |
| Law No. 26-06, JO No. 25, 5 April 2026 | Updates territorial organization and establishes the 69-Wilaya / 1,541-commune national baseline and legal parent composition. | Legal parentage and total baseline; not, by itself, a complete code-and-seat register. |
| Presidential Decree No. 26-206, JO No. 40, 3 June 2026 | Names and seats Wilayas 59–69. | Wilaya-level names/seats; not the complete commune-code list. |
| Executive Decree No. 26-208, JO No. 40, 3 June 2026 | Governs the asset/liability transition between parent/new Wilayas. | Do not infer that every operational office, registry or service has transferred solely from these financial/property deadlines. |
| Interministerial order of 5 May 2026, JO No. 58, 12 August 2026 | Modifies and completes the 1985 register annex; prints 404 entries across 10 affected existing Wilayas and 11 new Wilayas, with explicit unchanged references for 48 others. | Latest identified register delta; not a standalone 1,541-row republication. |

A search of the inspected JORADP material has not identified a 1996 amendment to Decree 85-20, the 22 June 1985 register order, or Decree 84-365. This is a bounded search result, not proof that no 1996 sectoral or territorial text exists anywhere. The official JO No. 49 dated 21 August 1996 does contain a school-establishment directory (including the page 15 annex under Executive Decree 96-273) that lists Chabet El Ameur as Boumerdès code `3514`; this is a non-register cross-check, **not** an amendment of the territorial register. Do not conflate that 1996 cross-check with the 8 February 1986 register amendment.

#### Chabet El Ameur — source-by-source transcription

| Source | Printed statement | Evidence meaning |
|---|---|---|
| 1985 register, JO No. 44, printed p. 1069, French | `Chabet El Ameur — 3514` | Direct entry in the initial territorial-register annex. |
| 1996 school-establishment directory, JO No. 49, printed p. 15, French | `Boumerdès (35) — Chabet El Ameur — 3514` | Independent official cross-check in a school directory; not a territorial-register amendment. |
| 1998 register amendment, JO No. 23, printed p. 11, French | `Chabet El Ameur — 3614` | Direct conflicting transcription in the later register amendment. |
| 1985 register, JO No. 44, El Tarf table, French text layer | Extracted as `Chihani — 3624`; the same extraction also returns `Raml Souk — 3624` | Internally anomalous text-layer result. The row must be checked against the page image; it cannot settle whether Chihani is 3614, 3624, or a column/text-layer artifact. |

The 1985 text-layer extraction prints Boumerdès codes `3513 Tidjelabine`, `3514 Chabet El Ameur`, and `3515 Thenia` consecutively. In the El Tarf table the same extraction returns `Chihani 3624` and `Raml Souk 3624`, an internally anomalous duplicate. Because the printed page has not been visually inspected, this extraction cannot establish whether `3614` belongs to Chihani, is a typesetting issue, or is a column/text-layer artifact. The earlier categorical statement that `3614` either does or does not collide with Chihani is withdrawn; this relationship remains pending visual verification.

**Proposed sign-off position, not an adopted legal correction:** `3514` is the stronger candidate for the Chabet El Ameur code because it appears in the original 1985 territorial register and the official 1996 school directory; `3614` appears in the later French 1998 register table and must remain preserved as the verbatim source assertion. The 1998 transcription may be a printing/transcription error, but that characterization and the canonical code must not be adopted until a qualified Algerian practitioner reviews the Arabic and French 1998 editions, the full relevant legal chain, and signs the discrepancy record. The local/administrative sequential list reportedly showing `3513` is not accepted as the register code; it conflicts with the primary 1985 table where `3513` belongs to Tidjelabine.

#### Label variants and seat semantics requiring adjudication

Keep source strings as separate assertions; do not overwrite them during normalization:

| Subject | Source variant A | Source variant B | Current treatment |
|---|---|---|---|
| Wilaya 68 name | JO58 French: `Bou Saada` | Decree 26-206: `Bou Saâda` | Preserve each source spelling; legal display/canonical transliteration awaits practitioner/source-policy decision. |
| Wilaya 62 commune | JO58 French: `El Ogla El Melha` | Law 26-06: `Ogla Melha` | Record the distinct legal wording as a variant pair; verify identity and Arabic label before canonicalization. |
| Barika commune | JO25 Arabic: `عبد القادر عزيل` | JO58 French: `Abdelkader Azil` | Strong text-level correspondence; JO58 Arabic image verification still pending. |

The seat must remain a different attribute from the commune name. The examples in §8.5 demonstrate that the commune name, four-digit code and seat are distinct source columns. Do not map a seat into an alias field simply because the seat differs from the commune name.

#### P1-01 evidence gate and explicit remaining work

P1-01 remains **In Progress / Verification Pending**. P1-02 remains **Blocked**. Before source approval and implementation may proceed, the review pack must contain:

1. Full amendment-inventory reconciliation from the initial 1985 register through all verified updates, including any intervening instruments referenced by the 2021 order's “modified and completed” wording.
2. A row-level concordance for all 1,541 communes under 69 Wilayas, with legal code, Arabic/French labels, parent, seat where established, effective interval, verbatim source transcription, instrument, JO issue/date, printed page, language, and extraction method.
3. Visual inspection records for JO58 printed pp. 9–25 in both language editions and JO23/1998 Boumerdès printed p. 11 in both language editions; record any parser disagreement and the final manually transcribed table cell.
4. Immutable copies of the exact JORADP PDF bytes and SHA-256 checksums. No checksum is recorded in this audit because those original binary artifacts were not available in the working runtime.
5. Deterministic duplicate, omission, parent, code-version and effective-date checks across the complete 1,541-row set; do not use group-count matching or a GitHub candidate dataset as legal proof.
6. A qualified Algerian legal/practitioner review which explicitly decides the Chabet El Ameur code, the 1996/1986 lineage question, the Arabic/French pairs, seat distinctions, and any remaining source contradictions.

A reviewer-ready template and illustrative source assertions are provided in `docs/reference-data/P1-01-DISCREPANCIES-FOR-SIGNOFF.md` and `docs/reference-data/P1-01-LEGAL-PROVENANCE-TEMPLATE.csv`. The CSV is **illustrative only**, not the 1,541-row canonical dataset. No commune rows are imported or authorized for import by this documentation update.


#### Territorial change assertion ledger (17 November 2026)

A bounded, machine-readable six-assertion ledger now preserves the locality transfers and commune rename identified in Decrees 92-412, 93-11, 93-12 and 06-256. See [the ledger and its field/evidence rules](reference-data/P1-01-TERRITORIAL-CHANGE-ASSERTIONS.md) and [CSV](reference-data/P1-01-TERRITORIAL-CHANGE-ASSERTIONS.csv). The rows deliberately contain no four-digit register codes, no adjudicated effective intervals, and no Arabic labels where the Arabic primary edition has not been transcribed. The French JO 03/1993 printed page 4 was visually reviewed for the 1993 assertions; the 1992/2006 entries remain text-layer evidence only. All records await Arabic-source reconciliation, exact PDF-byte SHA-256 capture and qualified practitioner review. This is not the national 1,541-row concordance and does not authorize import.


#### Decree 85-20 code semantics and later source cross-checks (17 November 2026)

Decree 85-20 (JO No. 6/1985, printed p. 88) defines the four-digit commune code in Article 3: the first two digits are the attached Wilaya code and the last two are the commune's code within that Wilaya. Article 4 requires a new code when a commune is transferred to another Wilaya and prohibits reusing the old code; codes for unaffected communes are retained. This is why code history must be versioned and why locality/mechta movements within the same Wilaya must not be mistaken for commune-to-Wilaya transfers. See [the official code-lineage cross-check pack](reference-data/P1-01-CODE-LINEAGE-CROSSCHECKS.md) and [row-level evidence CSV](reference-data/P1-01-CODE-LINEAGE-CROSSCHECKS.csv).

The ONS *Code Géographique National* table provides a later official W./C. cross-check for Chabet El Ameur (35/14), Chihani (36/14) and Raml Souk (36/24). However, its cover says June 2021 while the introduction cites the 12 September 2021 register order. Its page images and exact PDF bytes were not available for visual/hash verification in this audit. Preserve this as qualified text-layer evidence only; do not use it to close the 1985/1998 conflict or import data.


#### JO79/2021 historical register reconciliation checkpoint — 18 November 2026

- Added a 103-row extract of the eight existing-Wilaya tables printed in JO79/2021 (W01, W07, W08, W11, W30, W33, W39, W47). Results: 81 exact normalized name/parent matches, four exact name matches under a different current candidate parent, and 18 unresolved label rows.
- Four exact W07-to-W61 parent/code changes are preserved (Branis 0703→6103; El Kantara 0717→6101; Aïn Zaâtout 0718→6102; El Outaya 0719→6104). Djemorah 0720 vs Djemourah 6105 remains unlinked.
- The 27 Biskra records from JO79 are historical and superseded for current state by JO58/2026. The 76 JO79 records from seven other existing Wilayas not modified by JO58 remain in the current source coverage. The 1,137 rows outside JO58 split as 59 JO79 new-Wilaya rows +76 unchanged existing-Wilaya rows +27 historical Biskra rows +975 requiring JO44/1985 and other applicable amendments.
- Page images for JO79 printed pages 13–16 and Arabic source row pairing remain pending; the 103-row file is French text-layer only. P1-01 remains In Progress/Pending and P1-02 Blocked. No database import is performed.


#### JO79/2021 new-Wilaya visual review checkpoint — 18 November 2026

- The separate 59-row JO79/2021 extract for Wilayas 49–58 has now been visually checked against the official French PDF printed pages 17–19: W49–W51 on p.17; W52–W54 on p.18; W55–W58 on p.19. All three columns (commune, register code, administrative seat) were read separately.
- This review corrected a source-page attribution defect in the extract: the 15 Touggourt (W55) and Djanet (W56) rows had been recorded as printed p.18 but are on printed p.19. The CSV now records printed pages and zero-based PDF page indices 16–18.
- The 103-row extract for eight existing Wilayas (W01, W07, W08, W11, W30, W33, W39, W47), on JO79 printed pages 13–16, remains text-layer-only; it is not covered by the 59-row screenshot review above.
- Arabic JO79 row pairing could not be retrieved in this review. All Arabic pairing states remain pending, PDF SHA-256 remains blank, and no effective date is inferred from the order/publication dates. P1-01 remains In Progress/Pending, P1-02 remains Blocked; no commune data is imported.


### 8.7 Master reconciliation ledger and evidence boundary — 19 November 2026

- PR #141 merged at main SHA `7fbd3a455e9f36d1969d8921621aabb29f280e5d` and main CI #989 passed all three required jobs on that exact SHA. The frontend CI now runs `scripts/validate-p1-01-master-ledger.py` in addition to the JO44 and candidate-crosswalk validators.
- The master ledger contains 1,541 rows, 1,541 unique `working_row_key` values, 1,541 unique `jo44_assertion_id` values, and 1,541 distinct `proposed_canonical_code` field values. Of the latter, 1,538 are four-digit numeric proposals and three remain explicit `PENDING_ADJUDICATION_*` tokens (W08-R012, W35-R023 and W36-R016). Structural uniqueness does not prove legal identity or parentage for each row.
- The workpaper classifies 1,431 rows as `PROPOSED_CLEAN_FOR_SIGNOFF` and 110 as `EXPLICIT_PRACTITIONER_DECISION_REQUIRED`. The 110 are mixed exceptions (candidate Arabic anomalies, code/parent conflicts, rename clusters and related evidence decisions), not necessarily 110 separate legal defects. All 75 `candidate_arabic_anomaly_flag` rows are routed to explicit practitioner decision. All 1,541 `practitioner_signoff_status` values remain `PENDING`.
- Evidence-scope audit of `primary_source_verification_scope`: 841 rows have only `JO44_FR_TEXT_LAYER_EXTRACTED` and no additional primary visual scope recorded; 27 rows have the explicit `JO44_FR_AR_PNG_SPOT_VERIFIED` marker. Separately scoped JO58/JO79/JO23/JO11 image checks apply to their own linked subsets and may overlap. Do not claim full bilingual page-image verification for all 1,541 rows.
- PR #140 separately corrects Vite preview bind classification: `0.0.0.0`, `::`, and `[::]` are not loopback; regression tests now require explicit external-preview opt-in for wildcard/unspecified binds. The precise host/origin and platform-ingress manual acceptance remains open.
- No commune records imported; `communesCount = 0`; P1-01 In Progress / Pending; P1-02 Blocked. Qualified Algerian practitioner review remains a mandatory acceptance gate.


### 8.8 JO44/1985 Arabic page-image map and printed-count control — 19 November 2026

- The repository now contains 29 consecutive Arabic PNG page images from `A1985044.PDF`: PDF indices 12–40 / printed pages 1612–1640. Their paths and Git blob SHA-1 values are pinned in `P1-01-JO44-ARABIC-IMAGE-PAGE-MANIFEST-29.csv`. The PDF's byte-level SHA-256 was not recaptured and remains `NOT_CAPTURED`.
- `P1-01-JO44-ARABIC-IMAGE-ROW-MAP-1541.csv` links every master-ledger assertion/key to the page associated with its ledger source-code position (not a claim that the Arabic printed code is identical). The state for each row is `PAGE_IMAGE_MAPPED_NOT_ROW_TRANSCRIBED`; it is not an Arabic transcription, specific row identity proof or bilingual sign-off.
- `P1-01-JO44-ARABIC-WILAYA-COUNT-CONTROL-48.csv` records all 48 printed Wilaya header counts. They sum to 1,541 and match the master ledger's row counts for each Wilaya (48/48).
- The known W36 source-code conflict is retained: French text-layer assertions for Chihani and Raml Souk both say `3624`, while Arabic p.1635 visibly prints Chihani as `3614` and Raml Souk as `3624`. This must remain a practitioner decision; the map does not rewrite either record.
- Arabic p.1622 visibly retains `1600 — Ville d'Alger` as a separate special assertion; it remains excluded from 1,541 communes. The Arabic page images also show the previously recorded printed-code anomalies W39 `4907` vs `3907`, W41 `4012` vs `4112` and `1415` vs `4115`, W42 `4228` for `4229`, and W44 `4403` / `بومدفع`. These are preserved as print facts, not automatic corrections.
- Frontend CI now runs `scripts/validate-p1-01-jo44-arabic-page-images.py` after the three existing P1-01 validators. It checks the page-image manifest and Git blob hashes, 1,541 source-key locators, code-range coverage, printed counts, 1600 separation and W36 duplicate preservation. It does not validate handwritten interpretation or practitioner approval.
- No commune import; `communesCount = 0`; all 1,541 practitioner sign-offs remain PENDING; P1-01 remains In Progress / Pending; P1-02 remains Blocked.
