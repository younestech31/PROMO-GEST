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

## 4. Source-role and territorial-membership limitations

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

## 5. Effective-date assertions require legal review

The archive sets:

- `created_date = 2026-04-05` for all 11 new Wilayas;
- `wilaya_before_until = 2026-04-05` for all 108 moved communes;
- `change_date = 2026-04-05` for all 11 Wilaya-creation and 108 commune-move rows;
- `administered_until = 2026-12-31` for the 11 parent-Wilaya transitional administration records.

The first three values use the Law 26-06 publication date. They are date assertions in the candidate dataset, not qualified legal determinations that each individual Commune→Wilaya change became effective on that date. The 31 December 2026 transitional administration deadline is a separate operational/administrative fact and must not be substituted for a per-commune legal effective date.

Do not copy these values into PROMO-GEST `valid_from` fields or approve them without a qualified Algerian legal determination. Preserve publication date, legal effective date, and operational transfer date as distinct concepts.

## 6. Official PDF binary and provenance limits

The archive's `texts.csv` contains JORADP URLs and SHA-256 values for several legal instruments, but the original official PDF binaries are not included in this ZIP. Its README states that direct JORADP downloads failed in the build environment because of TLS errors and that physical comparison with the original issues remains necessary.

Accordingly:

- The five raw JSON SHA-256 values above are independently verified against files present in the ZIP.
- The JORADP PDF SHA-256 values copied into `texts.csv` were **not** independently verified against original PDF bytes in this audit.
- The `84-365` and `21-128` text records lack complete JORADP issue/date/URL/hash metadata in the supplied table and require source completion.
- The existence of a URL or a recorded hash is not evidence that the binary was downloaded, inspected visually or matched to that hash.

## 7. Disposition and next work

1. Preserve this ZIP unchanged as a distinct candidate artifact, identified by its SHA-256.
2. Do not import its SQLite database or CSVs into the PROMO-GEST master reference or PostgreSQL.
3. Reconcile all 1,541 candidate rows against the canonical P1-01 ledger using official source assertions, not the candidate's internal foreign-key consistency.
4. Separate legal territorial parentage, Daira membership and Daira-Chief service assignment in the evidence model.
5. Resolve all effective-date assertions through qualified Algerian legal review; do not infer `valid_from` from publication date or transition deadline.
6. Verify the official JORADP PDF binaries and hashes, then complete bilingual page-level transcription and practitioner review.

No candidate CSV, candidate SQLite database, canonical P1-01 ledger, application/runtime/API/schema/migration, development database, production database or security control was changed by this audit.

**P1-01 remains In Progress / Pending. P1-35 remains In Progress / Pending. P1-02 remains Blocked. All 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE; `communesCount = 0`; no commune import is authorized.**
