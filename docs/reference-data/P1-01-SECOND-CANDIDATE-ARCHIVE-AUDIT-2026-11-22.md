# P1-01 — Audit of the separately uploaded candidate archive — 22 November 2026

**Artifact:** `workspace-01a20365-7c59-72e8-98a2-f1362a55b517.zip`  
**SHA-256:** `bd8ae8914b1d08cf4ab06c3e01158d9880d7c2c6c811cf4ea756272f0d92fa81`  
**Root:** `algeria_municipalities/`  
**Declared data version:** `2026-11-21`  
**Disposition:** structurally reproducible candidate data; **not approved for legal master-data import**.

## 1. Artifact identity — distinct from the earlier uploaded archive

This ZIP is not the same artifact audited in the earlier P1-01 upload review and corrected by PR #200.

- Earlier artifact fingerprint recorded by PR #200: `dd35a4f9f44117c4f0fda7bc34277aa98b6cb874bed975f18c3c38665d1b79ae`.
- This artifact fingerprint: `bd8ae8914b1d08cf4ab06c3e01158d9880d7c2c6c811cf4ea756272f0d92fa81`.
- The earlier artifact contained `generate_db.py`; this artifact contains `scripts/build_db.py` and a pinned `sources/raw/` JSON snapshot.

**Important correction boundary:** the 10/11 new-Wilaya code/name mismatch documented for the earlier `dd35...` artifact does **not** apply to this `bd8...` artifact. This ZIP's `wilayas.csv`, raw `wilayas.json`, and SQLite `wilayas` table all show the official 59–69 sequence. Do not transfer findings between ZIPs without matching their fingerprints.

## 2. Population and reproducibility checks

| Dataset | Rows |
|---|---:|
| Wilayas | 69 |
| Dairas | 538 |
| Communes | 1,541 |
| 2026 change records | 119 |
| Text records | 18 |

The 119 change rows partition into 11 `wilaya_created` and 108 `commune_moved` records.

The five SHA-256 entries in `sources/SHA256SUMS.txt` were recomputed against the exact raw JSON files and all matched:

- `changes.json`: `6ecad48adaf78f8511573b0a3480fea5f909713e6eb702b036700c1fb4f83c3d`
- `communes.json`: `4ecca87d956d2d511feacc9592f6925f954f78e4d0c6324203521f80b955f450`
- `dairas.json`: `4b98947f97e3dc16b43ce5af6473701b889c049ed373bd0733ddde6b260b80fd`
- `texts.json`: `2aa7075c3fdb2c3d32902361a114f4740ebf2fcf72b1b31bedc3274911e2e8a1`
- `wilayas.json`: `10178cdd80e74ce15c037dbbb0dd02591453a19898b01aa3628a316a65625af0`

An isolated copy of the archive was rebuilt with `python scripts/build_db.py`:

- Exit code: 0.
- All 31 reported validation checks passed.
- The regenerated `data/*.csv` files and `validation_report.txt` matched the uploaded versions byte-for-byte.
- SQLite `PRAGMA integrity_check` returned `ok`.
- SQLite `PRAGMA foreign_key_check` returned no rows.
- The database contains 69 Wilayas, 538 Dairas, 1,541 Communes, 119 changes and 18 text records.

These results prove deterministic rebuilding and the tested structural/code-set assertions only. They do not prove that every source transcription, legal parent, effective date or bilingual label is correct.

## 3. New-Wilaya code sequence and bounded 108-row test

The uploaded artifact uses the official 2026 Wilaya code/name sequence:

59 Aflou; 60 Barika; 61 El Kantara; 62 Bir El Ater; 63 El Aricha; 64 Ksar Chellala; 65 Aïn Oussara; 66 Messaad; 67 Ksar El Boukhari; 68 Bou Saada; 69 El Abiodh Sidi Cheikh.

The build validator contains an explicit set of 4-digit commune-code assertions for each of these 11 Wilayas. All 11 sets and counts passed (12, 8, 5, 4, 4, 6, 10, 8, 21, 23, 7 = 108).

**Evidence boundary:** those assertions compare code sets and counts. They do not independently transcribe every Arabic/French name from the original official page images, decide all alias/orthography variants, or provide practitioner sign-off. The code mapping in this artifact is correct; this does not make the archive a legally approved 1,541-row register.

## 4. Four-digit Commune-code lineage conflict — all 108 transferred communes

The archive explicitly says in its README that the four-digit Commune codes were **not renumbered after the 2026 reform**; the SQLite schema comment repeats that position. The raw data and SQLite database confirm:

- All 108 rows moved under Law 26-06 retain a four-digit code whose first two digits equal the **former** Wilaya (`wilaya_before`).
- **0/108** codes begin with the current new Wilaya code.
- All 108 raw JSON records have an empty `previous_codes` array, so the old→new code lineage is not represented there.
- Examples: Aflou (Wilaya 59) remains `0319`; Barika (60) remains `0542`; Khoubana (68) remains `2807`; Aïn El Orak (69) remains `3208`.

This is a direct unresolved conflict with the code rule recorded in [P1-01-CODE-LINEAGE-CROSSCHECKS.md](P1-01-CODE-LINEAGE-CROSSCHECKS.md): Decree 85-20, Article 3, defines the first two digits as the attached Wilaya; Article 4 requires a new code when a Commune is transferred to another Wilaya and says the old code is not reused.

The current archive's 108 French commune names were independently compared by normalized name against the 108 rows in the official JO58 extract: **108/108 matched**, with no missing or extra names in any of the eleven Wilaya groups. This establishes a row-name crosswalk for the code comparison; it is not practitioner sign-off or effective-date approval.

| Wilaya | Commune | Code in candidate archive | Current JO58 register code |
|---:|---|---:|---:|
| 59 | Aflou | 0319 | 5901 |
| 60 | Barika | 0542 | 6001 |
| 61 | El Kantara | 0717 | 6101 |
| 62 | Bir El Ater | 1202 | 6201 |
| 63 | El Aricha | 1332 | 6301 |
| 64 | Ksar Chellala | 1429 | 6401 |
| 65 | Aïn Ouessara | 1731 | 6501 |
| 66 | Messaad | 1717 | 6601 |
| 67 | Ksar El Boukhari | 2635 | 6701 |
| 68 | Bou Saada | 2820 | 6801 |
| 69 | El Abiodh Sidi Cheikh | 3207 | 6901 |

The JO58 extract's `practitioner_review_status` remains PENDING and its `effective_date` fields are blank. Preserve this as an official code crosswalk requiring the remaining legal/effective-date decision, not as authority to infer when the code transition took effect.

The repository's official [JO58/2026 108-new-Wilaya register extract](P1-01-JO58-NEW-WILAYAS-108-REGISTER-EXTRACT.csv) records 108 current register codes under the new prefixes 59–69 (examples: Aflou `5901`, Barika `6001`, El Kantara `6101`, Bou Saada `6801`, El Abiodh Sidi Cheikh `6901`). Its metadata records French and Arabic PNG visual review of printed pp.9–25 and source PDF SHA-256 `6a1e59f7c0e8396115657c6376dabeb3fa07543ac8a7036ee3003af6a415aad6`; practitioner review remains PENDING and its effective_date cells remain blank.

The archive's 11 hard-coded `expected_2026` tests validate the **legacy four-digit code sets** and row counts; they do not test the current JO58 register-code values or Decree 85-20 Article 4. Therefore 31/31 structural checks passing does not close this 108-row code-lineage conflict.

**Disposition:** preserve the archive's four-digit strings as candidate historical assertions only. Do not import them as current official Commune codes, auto-generate replacements, infer a code-effective date, or populate `valid_from`. Reconcile each old code, JO58 current register code, name, seat, former/current Wilaya and legal effective interval against the official register, then obtain qualified Algerian practitioner review. The 31 December 2026 transitional-administration deadline must not be assumed to be the code-change effective date.

## 5. Source-role and territorial-membership limitations

The archive attributes the 1,541 commune rows to these instruments:

| `listed_by_text` | Rows |
|---|---:|
| Executive Decree 91-306 | 934 |
| Executive Decree 26-253 | 404 |
| Executive Decree 21-198 | 135 |
| Executive Decree 92-66 | 35 |
| Ordinance 97-14 | 24 |
| Executive Decree 18-302 | 9 |

The official title/scope of Decree 91-306 and its amendment Decree 26-253 concern the lists of communes served/animated by each Daira Chief. They are not, by themselves, a complete statutory source for every Commune→Wilaya legal membership assertion. In particular, JO52/2026 Decree 26-253 must remain distinct from the territorial membership lists in Law 26-06 / JO25/2026.

All 404 rows attributed to Decree 26-253 also use that instrument for both Arabic and French name-source fields. They comprise 296 rows under ten pre-existing Wilayas and 108 rows under the eleven new Wilayas. The archive therefore needs a row-level source-role reconciliation before those 404 citations can be treated as legal parentage evidence.

For the 108 new-Wilaya rows, the raw JSON also records `moved_by_text=law-26-06`, Articles 52 bis 10–20, and the former Wilaya. This is useful legal-source linkage, but it does not close name transcription, legal effective-date interpretation or practitioner review.

### Operational authority is not represented as a separate relation

The SQLite model has a Commune `wilaya` foreign key and a Commune `daira` foreign key. It has no separate relation for Daira-Chief operational/service assignment. The archive's current commune→daira links remain within the same Wilaya; they do not encode the JO52 example where 13 communes legally belonging to Bou Saada are listed under the Daira-Chief assignment heading for Ksar El Boukhari (Wilaya 67), while the other 10 are under Bou Saada (Wilaya 68).

Do not reinterpret the archive's `daira` relation as a complete operational assignment relation, and do not merge operational authority with legal territorial parentage. This remains subject to the existing ADR 0010 and P1-01 JO52 audit boundaries.

## 6. Effective-date assertions require legal review

The archive sets:

- `created_date = 2026-04-05` for all 11 new Wilayas;
- `wilaya_before_until = 2026-04-05` for all 108 moved communes;
- `change_date = 2026-04-05` for all 11 Wilaya-creation and 108 commune-move rows;
- `administered_until = 2026-12-31` for the 11 parent-Wilaya transitional administration records.

The first three values use the Law 26-06 publication date. They are date assertions in the candidate dataset, not qualified legal determinations that each individual Commune→Wilaya change became effective on that date. The 31 December 2026 transitional administration deadline is a separate operational/administrative fact and must not be substituted for a per-commune legal effective date.

Do not copy these values into PROMO-GEST `valid_from` fields or approve them without a qualified Algerian legal determination. Preserve publication date, legal effective date, and operational transfer date as distinct concepts.

## 7. Official PDF binary and provenance limits

The archive's `texts.csv` contains JORADP URLs and SHA-256 values for several legal instruments, but the original official PDF binaries are not included in this ZIP. Its README states that direct JORADP downloads failed in the build environment because of TLS errors and that physical comparison with the original issues remains necessary.

Accordingly:

- The five raw JSON SHA-256 values above are independently verified against files present in the ZIP.
- The JORADP PDF SHA-256 values copied into `texts.csv` were **not** independently verified against original PDF bytes in this audit.
- The `84-365` and `21-128` text records lack complete JORADP issue/date/URL/hash metadata in the supplied table and require source completion.
- The existence of a URL or a recorded hash is not evidence that the binary was downloaded, inspected visually or matched to that hash.

## 8. Disposition and next work

1. Preserve this ZIP unchanged as a distinct candidate artifact, identified by its SHA-256.
2. Do not import its SQLite database or CSVs into the PROMO-GEST master reference or PostgreSQL.
3. Reconcile all 1,541 candidate rows against the canonical P1-01 ledger using official source assertions, not the candidate's internal foreign-key consistency.
4. Separate legal territorial parentage, Daira membership and Daira-Chief service assignment in the evidence model.
5. Resolve all effective-date assertions through qualified Algerian legal review; do not infer `valid_from` from publication date or transition deadline.
6. Verify the official JORADP PDF binaries and hashes, then complete bilingual page-level transcription and practitioner review.

No candidate CSV, candidate SQLite database, canonical P1-01 ledger, application/runtime/API/schema/migration, development database, production database or security control was changed by this audit.

**P1-01 remains In Progress / Pending. P1-35 remains In Progress / Pending. P1-02 remains Blocked. All 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE; `communesCount = 0`; no commune import is authorized.**
