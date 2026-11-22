## Machine-readable 108-row JO58 legacy/current code crosswalk — 22 November 2026

The artifact-specific crosswalk `docs/reference-data/P1-01-SECOND-ARCHIVE-JO58-108-COMMUNE-CODE-CROSSWALK.csv` records all 108 moved communes in the second candidate archive against the repository's 108-row official JO58/2026 extract. Checks performed when composing it: 108/108 normalized French-name matches; 108 unique archive legacy codes; 108 unique JO58 register codes; all legacy prefixes match former Wilayas; all JO58 current-code prefixes match new Wilayas; all archive `previous_codes` arrays are empty. JO58 practitioner state remains PENDING and all effective_date fields blank. The new CI validator `scripts/validate-p1-01-second-archive-jo58-crosswalk.py` is wired into Frontend CI and independently recomputes normalized-name equivalence and code-prefix invariants. It is not a legal approval or data-import authorization. See the [artifact-specific audit](reference-data/P1-01-SECOND-CANDIDATE-ARCHIVE-AUDIT-2026-11-22.md).


## Row-level JO58 code comparison for the second archive — 22 November 2026

The second archive's 108 moved-commune names were normalized and compared against the repository's official JO58/2026 108-row new-Wilaya register extract: 108/108 names matched with no missing/extra names by Wilaya. Their codes do not match: all 108 archive codes retain the former-Wilaya prefix; JO58 assigns current 59xx–69xx register codes. Examples: Aflou 0319→5901; Barika 0542→6001; El Kantara 0717→6101; Bou Saada 2820→6801. The JO58 extract still has practitioner status PENDING and effective_date blank. This is a code-lineage discrepancy, not authorization to infer effective dates or automatically remap data. See the [artifact audit](reference-data/P1-01-SECOND-CANDIDATE-ARCHIVE-AUDIT-2026-11-22.md).


## Critical four-digit Commune-code lineage conflict in the second candidate archive — 22 November 2026

The second archive has the correct **Wilaya-level** 59–69 code/name mapping, but its four-digit Commune codes are not current JO58 register codes. All 108 communes moved by Law 26-06 retain the former-Wilaya prefix; 0/108 use the new Wilaya prefix, and all 108 raw `previous_codes` arrays are empty. Examples: Aflou 59 retains 0319; Barika 60 retains 0542; Khoubana 68 retains 2807. The archive README explicitly says these codes were not renumbered.

This conflicts with Decree 85-20 Articles 3–4 (first two digits identify attached Wilaya; a Commune transferred to another Wilaya receives a new code and its old code is not reused) and with the current JO58/2026 108-row register extract, which assigns new 59xx–69xx codes (e.g. 5901 Aflou, 6001 Barika, 6801 Bou Saada). The archive's 11 hard-coded 2026 checks validate the old code sets, not the JO58 current codes. This is a critical 108-row unresolved code-lineage issue; do not import or auto-remap. See the expanded [second archive audit](reference-data/P1-01-SECOND-CANDIDATE-ARCHIVE-AUDIT-2026-11-22.md) and [Decree 85-20 code rule](reference-data/P1-01-CODE-LINEAGE-CROSSCHECKS.md).

P1-01 remains In Progress/Pending; P1-35 remains In Progress/Pending; P1-02 Blocked; all 1,541 practitioner sign-offs PENDING; no `valid_from`; `communesCount=0`; no import.

## Separate candidate archive intake — exact artifact identity and limits — 22 November 2026

A second, distinct candidate ZIP was supplied and audited: SHA-256 `bd8ae8914b1d08cf4ab06c3e01158d9880d7c2c6c811cf4ea756272f0d92fa81`. It is not the earlier `dd35a4f9f44117c4f0fda7bc34277aa98b6cb874bed975f18c3c38665d1b79ae` artifact corrected in PR #200. **The PR #200 finding that ten of eleven new-Wilaya code/name pairs were wrong applies only to the earlier fingerprint; this second archive's 59–69 mapping is correct.**

The second archive reproducibly rebuilds in isolation: 31 validation checks pass; generated CSVs and validation report match the supplied files; SQLite integrity is `ok` and foreign-key check is empty. Counts are 69 Wilayas, 538 Dairas, 1,541 Communes and 119 change rows. These are structural/reproducibility results, not legal approval.

The second archive still cannot be imported. Its 934 rows cite Decree 91-306 and 404 cite Decree 26-253, instruments whose relevant scope is Daira-Chief service assignment rather than a complete statutory Commune→Wilaya membership register. The model has no separate operational assignment relation. It also asserts 2026-04-05 for all 108 commune moves and all 11 Wilaya creations; those candidate dates are not qualified per-row legal effective dates. Original JORADP PDFs are absent, so PDF hashes in `texts.csv` were not independently verified. Full detail: [P1-01 second candidate archive audit](reference-data/P1-01-SECOND-CANDIDATE-ARCHIVE-AUDIT-2026-11-22.md).

P1-01 remains In Progress/Pending; P1-35 remains In Progress/Pending; P1-02 remains Blocked; all 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE; `communesCount = 0`; no commune import.

## Official 2026 territorial reference intake — JO25 + JO61 — 22 November 2026

- **Legal total:** official JO25/2026 Law 26-06, Article 3, printed page 4, explicitly sets **69 wilayas / 1,541 communes**. Both French and Arabic page 4 were visually reviewed: [FR PDF](https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf) / [AR PDF](https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf).
- **Electoral cross-check:** official JO61/2026 Decree 26-282, Article 1 and Annexes I–II, defines APW/APC electoral constituencies and number of seats. Annex I lists APW wilaya districts 01–69 (2,855 seats overall); Annex II groups APC electoral constituencies and seats by 69 wilaya headings. Organic Law 21-01, Article 124 (JO17/2021, printed p.18) expressly permits an electoral constituency to comprise part of a commune, one commune, or several communes; Decree 26-282 cites Article 124(3). Therefore Annex II rows must not be presumed to equal legal communes one-for-one. It is an electoral cross-check, not the statutory basis for the 69/1,541 count and not a substitute for the legal territorial register/parentage/effective-date evidence. Official Article 124 source: https://www.joradp.dz/FTP/jo-francais/2021/F2021017.pdf.
- **Repository source binaries:** `A2026061.pdf` (277,968 bytes, SHA-256 `3af55003ac604e5197d78c1592e7db654d5851a02d317518ec14176110a92318`) and `F2026061.pdf` (295,624 bytes, SHA-256 `ff296821cdf6ba6bc4d4d315a27c13adf02d4a24b20f0f02202eb06b3ddd54bd`) are stored in `.tmp-joradp/`. Both commits are signature-verified. They were uploaded directly to `main` in two PDF-only commits (FR first, then AR); live main at intake was `c73ede555f929054eef55e011196a78e4c724117`.
- **Verification limits:** JO25 page 4 visually inspected in both languages. JO61 binary hashes recorded, but page screenshot attempts returned `Cache miss`; no visual JO61 page review is claimed. Row-level Annex II extraction/count/parity against the P1-01 ledger is pending under P1-35.
- **Release gate unchanged:** P1-01 remains In Progress/Pending, all 1,541 sign-offs PENDING, W30-R007 NEEDS_EVIDENCE, P1-02 Blocked, `communesCount = 0`. No commune import, legal approval, effective-date assignment, runtime/schema or production data change.

---
## P1-01 Bilingual Visual Evidence Supplement — 22 November 2026

- **Documentation & verification-script update only:** zero changes to `.NET` runtime, React SPA, EF Core migrations, database schema, security policy, `P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv`, `P1-01-PRACTITIONER-QUEUE-110.csv`, `P1-01-DECISION-BOOK-1541.csv`, or `.tmp-joradp/*`.
- **Q110 complete JO44 bilingual PNG coverage (`110/110`):** added [`docs/reference-data/P1-01-JO44-FLAGGED-QUEUE-BILINGUAL-READINGS.csv`](reference-data/P1-01-JO44-FLAGGED-QUEUE-BILINGUAL-READINGS.csv) covering all **102** uncovered rows of `P1-01-PRACTITIONER-QUEUE-110.csv` (forming an exact `8 + 102 = 110/110` disjoint union with `-51` and `W41-30`), pinning PNG SHA-256 hashes, verbatim JO44 Arabic readings, single-page French JO44 locators, and print anomalies (such as `3907` printed as `4907` on AR p.1636).
- **Post-1985 naming, seat-transfer & JO03/1993 bilingual PNG supplement (`38` records):** added [`docs/reference-data/P1-01-POST-1985-NAMING-INSTRUMENTS-BILINGUAL-READINGS.csv`](reference-data/P1-01-POST-1985-NAMING-INSTRUMENTS-BILINGUAL-READINGS.csv) (**23** `BILINGUAL_FR_AR_PNG_VERIFIED`, **4** `AR_BODY_PNG_AND_EXISTING_FR_EXTRACTED` for JO11/1986, **3** partial-cache body gaps, and **8** `PRIMARY_RENAME_ACT_NOT_IN_CACHE` unlocated acts) and updated `P1-01-TERRITORIAL-CHANGE-ASSERTIONS.csv` for the four `JO03/1993` Arabic p.5 readings (`DECR-92-412` & `DECR-06-256` remain `not_reviewed`).
- **Automated CI validator:** added `scripts/p1_01_bilingual_supplements.py` + `scripts/test_p1_01_bilingual_supplements.py` (`6/6` tests) and wired them into `.github/workflows/ci.yml`. PNG SHA-256 hashes verify page renders only, not PDF binary hashes.
- **Phase gate strictly unchanged:** all `1,541` master-ledger practitioner sign-offs remain `PENDING`; `W30-R007` remains `NEEDS_EVIDENCE`; `communesCount = 0` (`PendingOfficialVerification`); `P1-01` remains **In Progress**; `P1-02` remains **Blocked**; Phases 2–5 remain unopened.

---

## Verified repository snapshot — 22 November 2026 (audited before this documentation-only PR)

- **Audited source snapshot:** GitHub `main` was independently resolved at `5e361160cc29ce30947e3e7bea790f940a5c06a7` before this documentation-only synchronization. This SHA anchors the evidence below; it is not a promise that `main` remains at this SHA after this PR. Always resolve the live branch ref before starting work, merging, or reporting current repository state.
- **Product application/runtime baseline:** the last product application and aggregate-root runtime implementation remains PR #186 at `07cba896eec07bb28878d948a6cfb905313a2b22` (Project aggregate-root concurrency fix). PR #193 is a CI/packaging regression repair only; the 22 November P1-01 additions are evidence/validation artifacts and do not change the ASP.NET Core business runtime, React product behavior, EF schema, or production data.
- **Historical PR #188 evidence:** CI #44912565314 and CodeQL #44912565267 passed on historical snapshot `e6290cab7e784d7e83ef3c0108a2d74468ec3487`. Keep this as dated historical verification, not the live branch tip.
- **P1-01 supplement provenance:** commit `a7d1c549ae462e7ca9546606cd1ccd7bd62fcf77` was pushed directly to `main` at 2026-11-22 11:57:52 UTC. GitHub compare showed **15 changed paths**, not the 10 reported: the supplement, validator, tests and documentation were accompanied by an unintended root `package-lock.json` change and two backup-script mode changes. The Q110 supplement provides 102 new unique readings alongside 8 already covered rows (110/110 coverage); all remain pending practitioner decision. The post-1985 supplement has 38 records: 23 bilingual FR/AR PNG-verified, 4 Arabic-body PNG with existing French extraction, 3 partial-cache/body-gap cases, and 8 primary naming acts not located in cache. PNG hashes prove rendered image-byte identity, not PDF source identity or legal approval.
- **Original CI regression:** push CI [#45019855756](https://github.com/younestech31/PROMO-GEST/actions/runs/45019855756) failed at `npm ci` with EUSAGE because the rewritten lockfile did not match unchanged `package.json`. The same commit changed `scripts/check-backup-freshness.sh` and `scripts/test_check-backup-freshness.sh` from Git mode `100755` to `100644` while preserving file-content blobs. Original CodeQL [#45019855774](https://github.com/younestech31/PROMO-GEST/actions/runs/45019855774) passed both language analyses; that did not compensate for failed CI.
- **Bounded repair:** PR [#193](https://github.com/younestech31/PROMO-GEST/pull/193) restored the previously synchronized root lockfile and restored both backup scripts to mode `100755`, with unchanged script contents. Exactly three paths changed; no product runtime, tests, migrations, DB schema, business data, authorization, or security-policy changes were part of this repair. It merged at audited source snapshot `5e361160cc29ce30947e3e7bea790f940a5c06a7`.
- **PR-head verification:** CI [#45020548509](https://github.com/younestech31/PROMO-GEST/actions/runs/45020548509) passed all three jobs (Frontend, .NET 10/PostgreSQL 18, Windows); CodeQL [#45020548471](https://github.com/younestech31/PROMO-GEST/actions/runs/45020548471) passed C# and JavaScript/TypeScript.
- **Post-merge verification on the exact audited SHA:** main CI [#45020871059](https://github.com/younestech31/PROMO-GEST/actions/runs/45020871059) passed all three jobs. Frontend dependency install, security/territorial validators, strict TypeScript, lint, tests, build and static hosting passed; .NET 10/PostgreSQL 18 solution build, domain/application tests, migration and least-privilege integration checks, and database/storage/Data Protection restore drill passed; Windows publish and PowerShell/backup checks passed. CodeQL [#45020871024](https://github.com/younestech31/PROMO-GEST/actions/runs/45020871024) passed both C# and JavaScript/TypeScript analyses on the same SHA.
- **Branch-tip rule:** after this docs-only PR merges, the live `main` SHA will change again. Do not call this audited SHA the current tip after merge; resolve `main` directly every session.
- **P1-15 acceptance boundary:** the aggregate-root concurrency implementation and deterministic PostgreSQL 18 coverage are merged, but keep the capability `IMPLEMENTED_NOT_VERIFIED` and task In Review / Pending until actual manual Arabic RTL / French LTR acceptance is evidenced. Automated checks do not replace practitioner/operator acceptance.
- **P1-01 remains the Phase 1 gate:** P1-01 stays In Progress / Pending; all 1,541 master-ledger practitioner sign-offs remain PENDING. `W30-R007` remains NEEDS_EVIDENCE (proposed code `3021`; `valid_from` and reviewer decision remain blank). Eight primary naming acts remain uncached, three source-body image items remain incomplete, and Arabic review of Decrees 92-412 and 06-256 remains outstanding. No commune records are imported (`communesCount = 0`); P1-02 remains Blocked. Q110 visual coverage and CI validators do not constitute legal acceptance. No Phase 2–5 advancement is authorized.
- **Repository governance risk:** GitHub reports `main` branch protection disabled and required status-check enforcement off. This was observed and recorded, not changed by these tasks. Do not interpret green manually inspected checks as branch-level enforcement.
- **Production/data boundary:** no production database, local customer data, Cloud SQL business data, commune imports, credentials, roles, permissions, authorization policy, CSRF, immutable audit, deployment configuration, or branch protection settings were changed by this documentation synchronization or PR #193.

---

## Historical checkpoint — PR #186 (superseded by PR #187 main verification)

- **PR #186 merge commit (implementation baseline):** `07cba896eec07bb28878d948a6cfb905313a2b22`; PR [#186](https://github.com/younestech31/PROMO-GEST/pull/186) was squash-merged.
- **P1-15 implementation:** existing ProjectMember role/capability changes now touch the owning Project aggregate root. The root ConcurrencyStamp serializes concurrent membership mutations across different child rows; the losing EF transaction returns HTTP 409 `CONCURRENCY_CONFLICT` and rolls back the membership mutation and pending audit event.
- **PR-head evidence only:** PR-head CI #44909430011 and #44909433367 passed all three jobs (Frontend, .NET 10/PostgreSQL 18 least-privilege/integration, Windows publish/PowerShell); CodeQL #44909433309 passed JavaScript/TypeScript and C# on PR head 405cd8c3f8169043ce18315391cc4dfbcb1b2f11. These are PR-head results, not post-merge main results.
- **Post-merge evidence boundary:** the available commit-workflow-run query (which returns PR-triggered runs only) and combined-status query returned no post-merge main checks for this SHA. Do not claim post-merge CI/CodeQL success from the PR-head results.
- **P1-15 status:** `IMPLEMENTED_NOT_VERIFIED`; task remains In Review / Pending pending independently evidenced post-merge checks and required manual Arabic RTL / French LTR acceptance.
- **Phase gate unchanged:** P1-01 remains In Progress / Pending; all 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE; P1-02 remains Blocked; no commune records imported and `communesCount = 0`. No Phase 2–5 advancement.
- **Security/data boundary:** no schema migration, production data, role/permission policy, authorization bypass, or cloud business-data change was made.

---

# PROMO GEST — Current State Baseline

## Historical checkpoint — before PR #187 main verification

- **Historical PR #184 checkpoint (21 November 2026, superseded):** PR #184 (`feat(p1-11): canonicalize Algerian customer phone keys`) merged by squash at `1914703bce77aaeda49830a396d39acce04ea58f`. This is evidence for that historical merge only, not the live branch tip.
- **PR-head verification:** [CI #44839944794](https://github.com/younestech31/PROMO-GEST/actions/runs/44839944794) and [CodeQL #44839944849](https://github.com/younestech31/PROMO-GEST/actions/runs/44839944849) passed on PR head `5553b1f16e3a54ebc0e0238c4b806f7f1f158acc`.
- **Post-merge verification:** [main CI #44840514137](https://github.com/younestech31/PROMO-GEST/actions/runs/44840514137) and [CodeQL #44840514142](https://github.com/younestech31/PROMO-GEST/actions/runs/44840514142) passed on exact main SHA `1914703bce77aaeda49830a396d39acce04ea58f`. All three CI jobs passed: Frontend 28/28 steps, Windows 14/14, .NET 10/PostgreSQL 18 26/26. Test suites: Domain 48/48, Application 24/24, PostgreSQL 18 Integration 37/37. The PG18 job also applied migrations on disposable databases with separate migration/runtime identities and completed the full database, storage and Data Protection restore drill.
- **P1-11 implementation:** Migration #15 (`20261121120000_CanonicalizeAlgerianProjectCustomerPhones`) maps only a 10-digit national number beginning with `0` to `213` + nine digits; other international prefixes remain distinct. It updates only derived `project_customers.normalized_phone`, uses fail-closed invalid-length/collision checks, and has a read-only PostgreSQL 18 preflight plus Domain/PG18 tests for Up, Down, collision rejection and report output privacy. No Party/ProjectCustomer merges or deletions.
- **Operational verification boundary:** CI proves the feature against disposable PostgreSQL 18 fixtures, not the organization's existing database. No on-premises customer preflight, live migration or production data change has been performed. Follow [P1-11 operator runbook](P1-11-PHONE-NORMALIZATION-OPERATOR-RUNBOOK.md): backup/restore, quiesce writes, read-only preflight, disposable rehearsal, then separately authorized local migration and evidence capture. Keep P1-11 In Review / Pending and capability `IMPLEMENTED_NOT_VERIFIED` until those gates are evidenced.
- **P1-01 / phase:** Phase 1 remains IN_PROGRESS. P1-01 remains In Progress/Pending; all 1,541 practitioner sign-offs remain PENDING; W30-R007 remains NEEDS_EVIDENCE; P1-02 remains Blocked; no commune records imported and `communesCount = 0`.
- **Governance:** GitHub `main` remains unprotected and required status checks are disabled (`protected=false`, enforcement off). This was observed, not changed. No branch protection, production secret, Cloud SQL business data, live DB, or security policy was modified.

---

**Document Role:** Evidence-backed snapshot of the repository, not a product roadmap.  
**Operational Roadmap:** [Notion Master Roadmap](https://app.notion.com/p/41a13e9ed3688127a157dceb9a0b655f) · [Notion Execution Backlog](https://app.notion.com/p/41a13e9ed3688121adbff807d29d4e46). Notion governs work sequencing and task tracking; this file and the current repository remain the source of implementation and verification truth.  
**Last ASP.NET Core API/Application runtime source:** `711a05282869b8ebfe6965921045c9225dcecb17` (PR #163). **Latest password-lifecycle EF/schema source:** `03d1288a391ba72e49faf2cf8aa82d604e1ddc6e` (PR #161).

**Historical pre-PR #184 code-bearing checkpoint (superseded by the current verified main SHA above):** `5010a31c8bd4c470c14411867feca164cce0ff78` (PR #179 squash merge); [main CI #1129](https://github.com/younestech31/PROMO-GEST/actions/runs/44812777592) passed all three required jobs and [CodeQL #31](https://github.com/younestech31/PROMO-GEST/actions/runs/44812777559) passed on this exact SHA. PR-head CI #1128 and CodeQL #30 passed on the PR #179 head. The API/Application runtime source remains PR #163; latest password-lifecycle EF/schema source remains PR #161.

**Latest API/Application runtime source:** PR #163 merge `711a05282869b8ebfe6965921045c9225dcecb17`. **Latest password-lifecycle EF/schema source:** PR #161 merge `03d1288a391ba72e49faf2cf8aa82d604e1ddc6e`. PR #161 adds the mandatory temporary-password migration; PR #163 adds configurable temporary-password/session lifetimes and voluntary password rotation. PR #176 (`696c1ec1a4f50057607874b9dd35952c4db2e017`) fixes React SPA session bootstrap ordering on reload without widening the temporary-session API allowlist. PR #177 is tests-only and adds deadline-boundary/session-token and existing-user migration-upgrade coverage. **Vite preview host-policy correction:** PR #140 merge `a2565e9aba909f4ac6f515baf55018aad8bf0ef6`.
**P1-01 / P1-02:** the master workpaper has 1,541 unique candidate row keys and 1,541 unique JO44 assertion IDs; it records 1,431 `PROPOSED_CLEAN_FOR_SIGNOFF`, 110 `EXPLICIT_PRACTITIONER_DECISION_REQUIRED`, 75 candidate Arabic anomaly flags, 1,538 numeric code proposals plus three `PENDING_ADJUDICATION_*` tokens, and all 1,541 master-ledger practitioner sign-offs remain `PENDING`. The decision book contains 1,540 `PENDING` work statuses and one `NEEDS_EVIDENCE` row (`W30-R007` El Borma); these are work statuses, not legal approvals. The repository includes 29 contiguous Arabic JO44 page images (printed pp.1612–1640), a 48-Wilaya printed-count control (48/48; sum 1,541), and a 1,541-row page-level locator; these do not prove row-by-row transcription. PR #146 adds a separate 51-row JO44 Arabic/French image-reading supplement and a 21-row 2019/2021 Ouargla/Touggourt comparison. PR #155 adds a separate W41 supplement with 26 historical rows and four cross-register collision controls, preserving rather than normalizing the printed Arabic/French code differences (`4112/4012`, `4115/1415`, and the W42 `4228` duplicate). It also records Arabic reading limits; the PNG fingerprints are not a source-PDF checksum. These bounded supplements do not provide complete 1,541-row bilingual verification or legal adjudication. For El Borma, proposed code `3021` remains unchanged, `valid_from` is empty, and the legal/administrative timeline does not establish the code’s effective date. The W36 duplicate `3624` and separate W16 `1600` assertion remain preserved. No commune records are imported; API remains `communesCount = 0` / `PendingOfficialVerification`; P1-01 is In Progress / Pending; P1-02 is Blocked pending complete source reconciliation and qualified Algerian practitioner sign-off.
**Manual acceptance:** Arabic RTL / French LTR browser workflows, desktop/mobile route/dirty-form/project-switch/revocation scenarios, budget-redaction UI, exact Vite preview hostname/origin and restrictive platform ingress remain distinct manual gates. P0-A01 setup wizard and P0-A04 logout/replay have automated real-browser evidence from PR #150 across four Chrome viewport/language profiles, but full human operator execution and acceptance remain outstanding. PRs #152–#154 add a disposable local PostgreSQL 18 operator kit, private Codespaces port-forward support and a repeat-setup helper; the Arabic/French mobile observation notes are scoped and incomplete, not a completed manual result register. See [Arabic operator worksheet](PHASE-0-OPERATOR-CHECKLIST.ar.md).
**Governance:** Notion controls work order/task status; GitHub source/docs/tests/CI control implementation truth. No phase advancement or legal approval is inferred from CI.

**Governing Rule:** A feature is `IMPLEMENTED_AND_VERIFIED` only when its code and applicable automated verification pass in the audited repository baseline. A green pipeline does not certify untested browser UX, platform ingress, production installation, or legal/accounting correctness.

## 0. Latest verified code-bearing checkpoint — 20 November 2026 (after PR #179)

- **GitHub main:** `5010a31c8bd4c470c14411867feca164cce0ff78` (PR #179 squash merge). Post-merge main CI #1129 passed all three jobs; CodeQL #31 passed on the exact same SHA.
- **PR #176 — SPA temporary-session reload fix:** merged at `696c1ec1a4f50057607874b9dd35952c4db2e017`. PR-head CI [#1105](https://github.com/younestech31/PROMO-GEST/actions/runs/44801897166) and post-merge main CI [#1106](https://github.com/younestech31/PROMO-GEST/actions/runs/44802600386) passed 3/3; CodeQL #22 passed on the merge SHA. Bootstrap now restores `/api/auth/me` before public setup metadata; temporary sessions do not call setup status or project APIs, and no middleware allowlist was widened.
- **PR #177 — acceptance tests only:** merged at the then-current main SHA at the time of that historical checkpoint. PR-head CI [#1108](https://github.com/younestech31/PROMO-GEST/actions/runs/44804333473) and post-merge CI #1109 passed 3/3; CodeQL #24 and #25 passed on the corresponding PR-head and main SHAs. The exact deadline boundary is tested one tick before/at/after expiry, including direct rejection of the same session token at the deadline. PostgreSQL 18 migration-upgrade coverage proves a pre-existing account, password hash and creation timestamp are preserved with forced rotation false and no deadline.
- **Recorded PR-head test counts:** Domain 42/42, Application 24/24, PostgreSQL 18 Integration 35/35 (zero failed tests in CI #1108). The same required frontend, .NET/PostgreSQL 18 and Windows jobs passed again after merge in CI #1109. Four-profile Playwright checks, owner/runtime identity separation, and the database/storage/Data Protection restore drill passed.
- **Current implementation source pointers:** ASP.NET Core API/Application runtime — PR #163 merge `711a05282869b8ebfe6965921045c9225dcecb17`; password-lifecycle EF/schema — PR #161 merge `03d1288a391ba72e49faf2cf8aa82d604e1ddc6e`. PR #176 changes SPA bootstrap and a regression assertion; PR #177 changes tests only.
- **PR #179 — Windows backup freshness scheduling:** `PromoGestBackupFreshnessMonitor` is registered by the Windows installer daily at 06:00 as SYSTEM, with missed-run recovery and overlap suppression. The installer requires an existing independently mounted `BackupOffsiteDir` matching the nightly backup task. Failures are visible through Task Scheduler history / `LastTaskResult`. No customer/production task was installed, no email/SMS forwarding exists, and local-admin installation plus actual SYSTEM access/failure-case verification remain outstanding.
- **PR #179 verification:** PR-head CI #1128 and post-merge main CI #1129 passed 3/3; CodeQL #30/#31 passed on exact PR/main SHAs. Windows freshness tests 9/9, task-registration contract 9/9 and encrypted backup/restore 22/22; Domain 42/42, Application 24/24, PostgreSQL 18 Integration 35/35; four-profile browser and full DB/storage/Data Protection restore drill passed.
- **P1-18:** Done / Verified in Notion after both PRs and post-merge CI/CodeQL passed. **Phase 1 remains IN_PROGRESS:** P1-01 is still In Progress / Pending; all 1,541 practitioner sign-offs remain PENDING; P1-02 remains Blocked; `communesCount = 0`; no commune records are imported. CI does not approve legal source readings or practitioner decisions.
- **Manual boundary remains:** the automated four-profile checks are not a substitute for full human Arabic RTL / French LTR operator acceptance, project-switch/revocation journeys, production installation, or other manual release gates.

## 0B. Historical checkpoint — 20 November 2026 (after PR #168; superseded by PRs #176/#177)

- `main` at `e109ee6850fe29b5c6781751251dd22f4940176d` is green: run [44787596613](https://github.com/younestech31/PROMO-GEST/actions/runs/44787596613) passed frontend (validators, strict TypeScript, **91/91** frontend tests, build, static hosting, preview-leak checks), .NET 10 + PostgreSQL 18 (build with warnings as errors, Domain/Application/Integration/restore drill), and Windows publish/PowerShell validation.
- PRs merged since the previous checkpoint: [#163](https://github.com/younestech31/PROMO-GEST/pull/163) (voluntary password change, configurable temporary-password window, console recovery messaging), [#164](https://github.com/younestech31/PROMO-GEST/pull/164) (Linux encrypted/offsite/retained backups, ADR-0014), [#165](https://github.com/younestech31/PROMO-GEST/pull/165) (route-level code splitting, render `ErrorBoundary`, dependency audit/bundle-budget gates, ADR-0015), [#168](https://github.com/younestech31/PROMO-GEST/pull/168) (Windows backup parity: CMS encryption, offsite copy, retention, artifact restore, CI contract tests).
- Measured frontend effect: entry bundle 667 kB → ~440 kB (gzip ~121 kB); `module-b-projects` and `module-l-reporting` load on demand.
- Audit status is tracked in §1A below. Residual production risks that remain open: no point-in-time recovery (WAL archiving), no cross-platform backup decrypt drill, quarterly restore drill still manual, and repository-level secret scanning/push protection still require an owner action in GitHub settings.

## 0C. Historical checkpoint — 20 November 2026 (before PR #158 docs-only sync)

- Before PR #158's documentation-only synchronization, the last verified code-bearing main baseline was `0a3bbadb7269989531adb4b5ace8e990e00cf055`, merged through PR [#157](https://github.com/younestech31/PROMO-GEST/pull/157); main CI [#1038](https://github.com/younestech31/PROMO-GEST/actions/runs/44733222758) passed all three required jobs on that exact SHA. PR #158 only synchronizes canonical documentation and does not alter executable code/schema.
- PRs [#152](https://github.com/younestech31/PROMO-GEST/pull/152)–[#154](https://github.com/younestech31/PROMO-GEST/pull/154) add a disposable Linux x64 manual acceptance kit, private Codespaces forwarding/bootstrap-token handling, and an interactive repeat-setup check. Their CI packaging/automation does not mark the human P0-A01/P0-A04 result register passed.
- PR #154 records limited Arabic/French mobile operator observations; the source notes explicitly omit unobserved response/session-replay steps and the other desktop profiles. P0-A01/P0-A04 remain In Progress / Pending in Notion.
- PR #155 adds 26 W41 bilingual historical row readings plus four historical collision controls. It preserves printed discrepancies and uncertain Arabic readings; it is not a canonical code decision or full national sign-off.
- No runtime/API/EF/schema/database change or commune import in PRs #152–#155. P1-01 remains In Progress / Pending; P1-02 remains Blocked; `communesCount = 0`.

## 0D. Historical decision-book checkpoint — 20 November 2026 (PR #146; superseded as current-main anchor by PR #155)

- PR [#146](https://github.com/younestech31/PROMO-GEST/pull/146) merged at `04654851ed7ac790dc600833aa2e8d2d4f6e3b3a`; its head was `791a683916636179dd1f27027aa9e68ccd89b06c`. PR CI #1005 passed 3/3 on that exact head; post-merge main CI #1006 passed 3/3 on the merge SHA. The frontend job ran the P1-01 validators and six decision-book tests; it reported 1,541 decision records checked, with no sign-off or import.
- Decision book: 1,541 rows / 1,541 unique keys; 1,540 work statuses `PENDING`, one `NEEDS_EVIDENCE` (`W30-R007`). Master-ledger practitioner sign-off remains `PENDING` for all 1,541 rows. The workbook status is deliberately separate from legal sign-off.
- Evidence additions: 51 bounded JO44 bilingual image-reading observations and a 21-row Ouargla/Touggourt comparison. They improve source traceability but do not certify the full national row set or replace qualified practitioner review.
- El Borma: law 19-12 lists it in the Touggourt group; ordinance 21-03 art. 2 subsequently lists it under Ouargla and extends the article 54 deadline to before 31 December 2021; May 2021 decree 21-198 places it in the Ouargla daira-organization table; the September 2021 register records code 3021 under Ouargla. Articles 53–54 of law 19-12 and decree 21-197 create distinct competence-transfer and asset/liability-transition rules; none has yet been accepted as the effective date for code 3021. Keep `NEEDS_EVIDENCE`; no `valid_from` or review outcome is set.
- No runtime/API/EF/schema/database changes and no commune imports. `communesCount = 0`; P1-01 remains In Progress / Pending; P1-02 remains Blocked.

## 1. Executive Status

| Layer / Subsystem | Status | Current Evidence | Remaining Boundary |
|---|---|---|---|
| Domain Core (`PromoGest.Domain`) | `IMPLEMENTED_AND_VERIFIED` | PR-head CI #44839944794 and post-merge main CI [#44840514137](https://github.com/younestech31/PROMO-GEST/actions/runs/44840514137) verify **48/48** Domain tests on PR #184's exact implementation and main merge baseline `1914703b`. | Automated verification is current on main; add domain coverage with each change. |
| Application Services (`PromoGest.Application`) | `IMPLEMENTED_AND_VERIFIED` | PR-head CI #44839944794 and post-merge main CI #44840514137 verify **24/24** Application tests on PR #184 and exact main merge baseline `1914703b`. | Full human Arabic RTL / French LTR user-management acceptance remains outstanding; the capability-specific status is tracked in the traceability matrix. |
| PostgreSQL 18 Integration (`PromoGest.IntegrationTests`) | `IMPLEMENTED_AND_VERIFIED` | PR-head CI #44839944794 and post-merge main CI #44840514137 verify **37/37** PG18 integration tests, including Migration #15 preflight/Up/Down/collision/privacy coverage, least-privilege identities and disposable restore drill, on exact main merge baseline `1914703b`. | Automated restore drill passes; organization-local migration rehearsal and platform-specific manual operations remain separate release checks. |
| Daily backup freshness monitoring | `IMPLEMENTED_NOT_VERIFIED` | PR #173 provides cross-platform freshness checks and Linux systemd timer; PR #179 wires Windows Task Scheduler registration and validates configured local/offsite paths. PR-head #1128 and post-merge main CI #1129 passed; Windows checker 9/9, task registration 9/9 and encrypted backup/restore 22/22. | Actual on-premises Windows installation, SYSTEM access to each deployment's offsite target, and a deliberate failure-case drill remain outstanding; Task Scheduler history / LastTaskResult is the current signal, with no email/SMS forwarding. |
| Local React SPA (`apps/local-web`) | `IMPLEMENTED_NOT_VERIFIED` *(automated checks pass; manual UX acceptance outstanding)* | PR #184 post-merge main CI #44840514137 passed frontend install, strict TypeScript, tests and production static-host build (28/28 CI steps); earlier PR #179 CI #1128 includes four-profile browser setup/logout and session-reload checks. Route chunks remain budget-capped and the workspace is inside an `ErrorBoundary`. | Full human Arabic RTL / French LTR browser acceptance (desktop/mobile), direct-route journeys, dirty-form Back/Forward/reload/tab-close, project switching and revoked-project flows remain outstanding. CI is not full human acceptance. |
| C2 Party / Customer identity foundation | `IMPLEMENTED_AND_VERIFIED` | PRs #35–#38 and #55–#57 establish canonical Party ownership, retired ProjectCustomer identity mirrors and deferred PostgreSQL project/name/phone duplicate guards. PR #184 adds P1-11 Migration #15 to canonicalize only derived Algerian `normalized_phone`; PR-head CI #44839944794 and PR #184 post-merge main CI #44840514137 passed, verifying collision rejection, rollback and PG18 integration (37/37). | P1-11 remains `IMPLEMENTED_NOT_VERIFIED` operationally until local preflight/rehearsal/operator evidence; no organization database migration has been run. Employee, Party contact-point/identifier/representative models, full PartyRole lifecycle and human-reviewed merge tooling remain unimplemented. |
| Organization profile editing | `IMPLEMENTED_AND_VERIFIED` | `PUT /api/organization`, `org.manage` enforcement, audit events and `ExpectedConcurrencyStamp` conflict handling are verified. PR #59 also connects its Wilaya selector to the server-owned reference API. | Commune/municipality remains free text pending a verified commune catalogue. |
| Project estimated-budget financial capability | `IMPLEMENTED_NOT_VERIFIED` | PR #80 / D-014 / ADR-0011 is merged; API redaction, explicit `CanViewFinancials`, null-preserving updates, denied-write audit and regression tests remain in the verified code path. Historical main CI #1006 passed all three jobs on then-audited main SHA `0465485`. | Manual Arabic RTL / French LTR browser proof for redaction, authorized visibility and editor hiding/showing remains outstanding. |
| Algerian administrative reference — Wilaya subset | `IMPLEMENTED_AND_VERIFIED` | PR #59 delivers the versioned bilingual 69-Wilaya API consumed by setup, organization-profile and project selectors; PR #184 post-merge CI #44840514137 passed frontend/.NET/PG18/Windows jobs on its exact merge baseline `1914703b`. | API remains at `communesCount = 0` and `PendingOfficialVerification`; the complete 1,541-commune legal hierarchy is not loaded. |
| Modules F–J (Contracts through SCF/Tax) | `PLANNED` | Architecture, legal/accounting prerequisites, and tailored bilingual column-preview workspaces (`PlannedProjectModuleView.tsx` + `moduleCatalog.ts`, with zero hardcoded statutory tax-rate literals) are documented. | No production business implementation, persistence, or active mutation endpoints; practitioner sign-off remains mandatory. |
| Module K | `PARTIALLY_IMPLEMENTED` | K-Min local upload/list/download, SHA-256 checks, `ProjectMember`-capability category scoping, and `customers.read` isolation for customer identity documents are implemented in ASP.NET Core 10 and mirrored in `dev-api-middleware.ts`. | Metadata update, soft-archive, `DocumentLink`, and K-Full retention/archival remain `PLANNED`. |
| Vite development preview isolation | `IMPLEMENTED_NOT_VERIFIED` | PR #112 establishes the preview boundary; PR #140 corrects wildcard/unspecified-host classification. Historical main CI #1038 on `0a3bbadb` passed the relevant frontend regression checks; historical main CI #1129 on `5010a31` passed all three required jobs. The earlier 88/88 frontend count remains associated with CI #873. | Manual Google AI Studio smoke test with the actual preview hostname/origin and restrictive platform ingress remains outstanding. Allowlists/CORS are not authentication; the disposable in-memory preview is not API/PG18/production evidence. |

### GitHub Actions Run #550 — 15 November 2026 (main Phase 0 closure anchor)
- **Commit:** `5a5196d75abcdf608e708844983fad25b600e5a4` (PR #52 owner-attested Phase 0 acceptance documentation).
- **Frontend, .NET 10 / PostgreSQL 18, and Windows publish jobs:** all three passed.
- **Overall:** success; this run revalidated the automated baseline but did not execute manual browser acceptance. P0-A01 and P0-A04 were subsequently accepted as explicit unrun exceptions in D-010.

[Open CI Run #550](https://github.com/younestech31/PROMO-GEST/actions/runs/43772604996)

### PR #66 — Phase 0 evidence baseline synchronization (documentation only)
- PR #66 head `f00a661e7083196e9bbee54f37a5084e4d569be4`; PR CI Run **#594** / `43907160572` passed all three required jobs (frontend/static hosting, .NET 10 + PostgreSQL 18 least-privilege/integration and full restore drill, Windows x64 publish/PowerShell validation).
- Merge commit `f8f812890e6001d0560a0af1730559152b1cb8e3`; main push CI Run **#596** / `43907721028` passed all three jobs.
- The change refreshed this baseline and the Phase 0 manual register only. P0-A01 and P0-A04 remain `NOT_RUN` for manual browser acceptance; no runtime, schema, migration, organization data, production database, Cloud SQL data, credentials, or deployment was changed.

### PR #68 — Phase 1 Party / Employee master-data scope decision (documentation only)
- PR #68 head `f98a21125cc45c567bb3de49e6516a085734480e`; PR CI #601 / `43909506105` passed all 3 jobs.
- Merge SHA `7d1b14e4a5783731d3531f199eec0a08dcc6238c`; main CI #602 / `43909915570` passed all 3 jobs.
- D-012 records the Party / ProjectCustomer / User / ProjectMember boundary; REQ-D04 is aligned to the verified PR #56/#57 PostgreSQL migration evidence; REQ-D05/D06 remain planned and Module D remains partially implemented. No runtime, schema, permissions or data changed.

### PR #69 — D-012 documentation correction (one-line)
- PR #69 head `e6345ae4d3f3b9497ca7d16824b10a8cb5a6cd60`; PR CI #603 / `43911049988` passed all 3 jobs.
- Merge SHA `4fdfcb2679231ff81b8756a8da6ba3045bea5288`; main CI #604 / `43911498773` passed all 3 jobs (frontend/static hosting, .NET 10 + PostgreSQL 18 least-privilege integration and restore drill, Windows x64/PowerShell).
- The one-line change removed a duplicated D-012 bullet only. No runtime, schema, migrations, permissions, business records, production/Cloud SQL data, credentials or deployment changed.

### PR #72 — Territorial register code lineage (documentation only)
- PR #72 head `2ebf4be8f4080a8c104ca57dadbeaae3f4f989ba`; PR CI Run **#612** / `43928612284` passed all three required jobs (frontend/static hosting, .NET 10 + PostgreSQL 18 least-privilege/integration and restore drill, Windows x64 publish/PowerShell validation).
- Merge SHA `c920876c2d9c3233d468601e3636cf347a875924`; post-merge main CI for this SHA is not confirmed in this audit.
- Updated `REFERENCE-DATA-GOVERNANCE.md` and ADR-0010 with Decree 85-20's code lifecycle rule, and the confirmed 1985, 1986, 1998, 2021 and 2026 register instruments. The amendment inventory remains explicitly non-exhaustive; the full 1,541-row bilingual crosswalk and qualified review remain outstanding.
- Stable internal UUID versus effective-dated official code is an application integrity decision, not a rule attributed to Decree 85-20.
- Documentation only: no runtime, API, UI, router, schema, migration, permissions, security policy, business data, production database, Google AI Studio Cloud SQL, credentials, or deployment changed.

### PR #73 — Baseline synchronization after PR #72 (documentation only)
- PR #73 head `55237adc69793aae3d919935892eb8e697572b42`; CI #614 / `43930654793` passed all three jobs on the PR head.
- Merge SHA `873107f1792fb1f5ba2e7d29f1e6f84f68ac4312`; post-merge main CI was not confirmed in the subsequent audit.
- Synchronized the five canonical baseline documents and corrected the ADR-0010 summary to distinguish the statutory 1,541 count from the 0 loaded commune records. No runtime/schema changes.

### PR #67 — Integration-test analyzer correction (test only)
- PR #67 head `6e37abf8eb170f2c4dfc136dc481bdf7a11f22d2`; CI #595 / `43907255613` passed all three jobs.
- Merge SHA `165540afce1ca4df0c933950b1cb7b303f9285fc`; post-merge main CI was not confirmed.
- Replaced a LINQ-filtered `Assert.Single` with the predicate overload to remove xUnit2031 without changing assertion intent or runtime behavior. No application runtime/schema change.

### PR #74 — Corrections to official territorial-source details (documentation only)
- PR #74 head `a1c9b6f4b850736f7f8c9b25d980a161626e1f15`; CI #617 / `43951981746` passed all three jobs (frontend/static hosting, .NET 10 + PostgreSQL 18, Windows publish/PowerShell).
- Merge SHA `27a65b613132953204201d885ca1939c4d856db6`; post-merge main CI was not confirmed in this audit.
- Corrected the 8 February 1986 annex to all four commune/code/seat rows, corrected the official seat spelling `Zoudj El Beida`, and refined the 1998 order's territorial scope. The amendment inventory remains non-exhaustive.
- No runtime, schema, migration, permissions, business data, production database, Cloud SQL, credentials or deployment changed.

### PR #76 — 1998 territorial-register source conflict (documentation audit)
- PR #76 head `ffec106689409ec519757ae0dbb8901a7c897582`; CI #621 / `43957935892` passed all three jobs (frontend/static hosting, .NET 10 + PostgreSQL 18 least-privilege integration/restore, Windows publish/PowerShell).
- Merge SHA `d30e9854c20bcf8068d49d16bb42b670de8ae22d`; post-merge main CI on this SHA is not confirmed in this audit.
- JO No. 23/1998 (printed p. 11) shows `3614` under Boumerdès code 35; JO No. 44/1985 (p. 1069), JO No. 49/1996 (p. 15), and ONS *Armature urbaine 2008* Table 52 show `3514`. The Decree 85-20 prefix rule makes the 1998 printed value anomalous, but this audit does not determine legal precedence.
- Record the exact raw values, source provenance, PDF-image verification limitation and qualified-adjudication requirement. No canonical value is selected and no commune row is imported.
- No runtime, API, UI, schema, migration, permissions, business data, production database, Cloud SQL, credentials or deployment changed.

### PR #78 — 1996 school-directory evidence classification (documentation only)
- PR #78 head `93ff92286014ee875f3292617015c84ed7f1749c`; CI #626 / `43970006006` passed all three jobs (frontend/static hosting, .NET 10 + PostgreSQL 18 least-privilege/integration/restore, Windows publish/PowerShell).
- Merge SHA `ec69f6d7e89cdbb78c849fe795b2a972744dd954`; post-merge main CI is not confirmed.
- Clarified that JO No. 49/1996, p. 15 is Annex I (continued) to Executive Decree No. 96-273 of 20 August 1996 on creation/suppression of fundamental schools. The Chabet El Ameur `3514` row is a school-location cross-check, not a territorial-register amendment; it does not resolve the 1998 JO23 `3614` conflict.
- The conflict remains unresolved pending PDF page-image verification and qualified legal/practitioner adjudication. No commune record is imported.
- No runtime, API, UI, schema, migration, permissions, business data, production database, Cloud SQL, credentials or deployment changed.


### PR #80 — Project estimated-budget financial capability (Phase 1 / D-014; merged)
- PR #80 merged on 17 November 2026 at `61bcf8b0a0b2e3967fa5b7add904afd9bc1b0da3`; final PR head `4a160c164db12ba01cb83a4f857d1b8d8fc0c921`.
- Implements D-014 / ADR-0011: budget read requires explicit `ProjectMember.CanViewFinancials`; budget write additionally requires `projects.manage` and ProjectManager membership; neither SYSTEM_ADMIN nor ProjectManager bypasses the capability. Null general updates preserve the stored amount; denied numeric updates are rejected and audited.
- API, nullable DTO, React redaction/editor visibility, Vite preview parity, and Application / PostgreSQL 18 / Vite unit and HTTP-CSRF regression tests are merged. No EF migration, production data, or Google AI Studio Cloud SQL change.
- PR-head CI #707 passed all three jobs on the final head; post-merge main CI #708 passed all three jobs on merge SHA `61bcf8b0a0b2e3967fa5b7add904afd9bc1b0da3`. Post-merge main CI #814 passed all three required jobs on audited main SHA `1c068dcaa1dc23c3ec3804abf903a10a8540dc76`.
- Capability state remains `IMPLEMENTED_NOT_VERIFIED` until independent manual Arabic RTL / French LTR browser acceptance verifies financial-value redaction, authorized visibility, and editor hiding/showing. The Notion task remains In Review / Verification Pending; not Done.

### Phase 1 design review — P1-04 / D-013 (PR #70 merged; design approved)
- PR #70 head `e1c183f0d2a4a9ab06abf72a955a6169634b73e6` passed PR CI #605 / `43912825520` (all three jobs); merge SHA `24d1d57bbe19102c9bbbd63bb31ca2793720d807` passed main CI #606 / `43913437191` (all three jobs).
- D-013 approves the organization workspace → explicit authorized project switcher → active project workspace model for design only. PR #70 did not implement navigation UI or change API, routes, schema, permissions or runtime behavior. Future UI slices remain separately scoped.
- P1-01 remains In Progress / Pending; P1-02 remains Blocked pending complete source reconciliation and qualified review. No commune records were imported. P0-A01 and P0-A04 remain `NOT_RUN`; this decision does not certify browser acceptance.

## 1A. Audit remediation status — 20 November 2026

Source: the two 20 November audits (`AUDIT-2026-11-20.ar.md`, `AUDIT-2026-11-20-R2.ar.md`) and the commits listed below. "Closed" means code plus automated verification exist on `main`; it never means production acceptance.

| ID | Status on `main` | Evidence | Remaining boundary |
|---|---|---|---|
| **AUD-01** Backup continuity | **Closed for both platforms, monitored** | Linux: PR #164 (`backup-promogest.sh`, systemd unit, `verify-backup-restore.sh`, ADR-0014). Windows: PR #168 (`backup-promogest.ps1` CMS/AES-256-CBC, offsite verification, retention, `restore-promogest.ps1` artifact materialization, `scripts/test-backup-crypto.ps1`). Silent failure is now detected: `check-backup-freshness.sh/.ps1` assert artefact age, sidecar integrity and offsite presence on a daily timer/task, with behavioural tests on both platforms. | No point-in-time recovery (WAL archiving); no cross-platform decrypt drill in CI; quarterly restore drill remains a manual operator obligation. |
| **AUD-02** Password lifecycle | **Closed** | PR #163: voluntary change with current-password verification, configurable `Security:TemporaryPasswordLifetimeHours`, console recovery messaging, UI path. | Password history/rotation cadence is still not enforced beyond reuse prevention. |
| **AUD-03** Session idle timeout | **Closed** | `SessionPolicy` (absolute lifetime + idle timeout + touch interval, validated at startup), `AuthService.ValidateSessionAsync` revokes and audits `AUTH_SESSION_IDLE_EXPIRED`; `SessionAndPasswordLifecycleTests` and `ValidateSession_RevokesIdleSession_AndAuditsTheReason` cover the boundary. | Browser-level idle lock UX is still automated-only/manual-pending. |
| **AUD-04** Default authorization policy | **Closed** | Default-deny fallback policy with API tests (recorded in the R2 audit as the only audit item already closed). | — |
| **AUD-05** Supply chain | **Partially closed** | `npm audit --omit=dev --audit-level=high` gate, grouped weekly Dependabot configuration, NuGet vulnerability report, CodeQL workflow, in-repo committed-credential scan with its own tests (this PR). | Repository-level secret scanning with push protection and Dependabot alerts must be enabled by an owner in GitHub settings; no SBOM generation, signing or provenance attestation. |
| **AUD-06** Render containment | **Closed** | PR #165: `ErrorBoundary` around the routed workspace and first-run wizard, reset on navigation, no stack/message shown, `uiResilience.test.ts`. | Error reporting to a local log file is still console-only. |
| **AUD-07** Bundle size | **Remediated locally (pending PR/CI)** | Route-level `React.lazy`/`Suspense` plus shared `useAdministrativeReference` and `permissionPolicy` decoupling eliminate all `INEFFECTIVE_DYNAMIC_IMPORT` warnings; `FirstRunSetupWizard` and `ProjectCustomerRegistryModal` lazy-load cleanly, reducing entry `index-*.js` from 700.40 kB to **347.01 kB** (347,017 bytes < 512,000 CI limit). | Pending PR commit and CI workflow verification on GitHub. |
| **AUD-08** Lint & accessibility | **Partially closed** | Biome lints every SPA file (correctness, suspicious patterns, a11y) with a zero-error requirement and a warning/info ratchet (`biome-baseline.json`: 0 errors / 51 warnings / 42 infos). `accessibility.test.ts` audits auth screens, workspace header, `ConfirmDialog`, shared `Modal`, and `ChangePasswordModal` in AR-RTL and FR-LTR via axe-core (**104/104** frontend tests). | typescript-eslint unusable under TS 7 native compiler; no formatter gate; colour contrast and full human operator browser pass remain manual gates. |
| **AUD-09** API error parity | **Remediated locally (pending PR/CI)** | All C# `*DomainException` / `ApiErrorResponse` codes and `dev-api-middleware.ts` error codes mapped in AR & FR inside `API_ERROR_MESSAGES`; `localizationCoverage.test.ts` enforces 100% backend/preview parity automatically. | Pending PR commit and CI run; non-auth inline bilingual UI strings (`R2-05`) tracked separately below. |
| **AUD-15** Modal focus/keyboard trap | **Remediated locally (pending PR/CI)** | All dialog surfaces (including `ConfirmDialog`, `ChangePasswordModal`, `ProjectSwitcherModal`, and project/party/user/document/reservation/structure modals) now delegate to `shared/components/Modal.tsx` with `Tab`/`Shift+Tab` trapping, stacked top-most `Escape` arbitration, focus restoration, `modalFocus.test.ts` unit coverage, and `frontendArchitecture.test.ts` single-owner enforcement (`autoFocus` removed). | Vite-preview Playwright verification covers interactive flows; full human operator acceptance on ASP.NET Core 10 + PG18 remains manual. |
| **AUD-25** Unused root `index.html` | **Remediated locally (pending PR/CI)** | Deleted unused root `/index.html`; Vite entry remains `apps/local-web/index.html`. | Pending PR commit and CI run. |
| **R2-05** Inline bilingual strings | **Closed for the authentication & API-error surfaces** | Auth screens and 100% of API error codes use `translations.ts` with automated coverage guards in `localizationCoverage.test.ts`. | Inline bilingual UI expressions inside authenticated feature views remain for progressive extraction. |
| **R2-07** Undocumented rate-limit key | **Closed** | `Security:LoginRateLimitPermitLimit` (1–100, default 10) documented in `.env.example`, `deploy/linux/promogest.env.template`, and both production templates; `validate-security-config-docs.py` fails on drift. | — |

## 1C. Phase 0 residual regression coverage — PR #63

PR #63 is merged. Its test-only change adds two PostgreSQL 18 end-to-end cases without changing runtime behavior:

- `FirstRunSetup_OnEmptyPostgreSql18Database_InitializesExactlyOnce`: verifies a fresh isolated database begins empty/uninitialized, first initialization succeeds, second initialization returns `409 SETUP_ALREADY_INITIALIZED`, exactly one organization and one `SYSTEM_ADMIN` user exist, one role assignment exists, and one `SETUP_INITIALIZED` audit event is recorded.
- `Logout_RevokesServerSession_AndRejectsCurrentAndReplayedCookies`: verifies missing-CSRF logout is rejected without revoking the session; valid logout clears the browser cookie; protected `/api/auth/me` and `/api/audit` return 401; replaying the original cookie from another client is rejected; the database session is revoked and one `AUTH_LOGOUT` audit event exists.

**PR CI #589:** all three jobs passed on PR head `58dde79719db5949033363dfed1e4e9cb8b66f29`. Exact .NET results: Domain **34/34**, Application **20/20**, PostgreSQL 18 Integration **32/32**. The full database/storage/Data Protection restore drill passed, as did frontend strict TypeScript/tests/build/static-host checks and Windows x64 publish/PowerShell validation.

**Boundary:** these are automated PostgreSQL/API integration tests. They do not change the manual browser result register: P0-A01 and P0-A04 remain `NOT_RUN` pending real-preview/local browser execution and sanitized evidence. No production database, Google AI Studio Cloud SQL data, credentials, or deployment was changed.

## 2. Verified CI Evidence

### GitHub Actions Run #544 — 15 November 2026
- **Frontend job:** passed. `npm run lint` (`tsc --noEmit`), `npm test` (**38/38**), SPA build, ASP.NET Core `wwwroot` build, static-hosting checks, and preview-leak checks all completed successfully.
- **.NET 10 / PostgreSQL 18 job:** passed. Solution build with warnings as errors succeeded; Domain **27/27**, Application **14/14**, PostgreSQL 18 integration tests passed, and the full database/storage/Data Protection restore drill passed.
- **Windows publish job:** passed. Windows x64 publish, machine-scoped Data Protection recovery verification, and PowerShell validation all succeeded.
- **Overall result:** all three CI jobs completed with `success` on main commit `c26194dce5124d5d5e8d67fc5a04708346b1d5e4`.

[Open CI Run #544](https://github.com/younestech31/PROMO-GEST/actions/runs/43767110822)

### Historical GitHub Actions Run #546 — 15 November 2026 (audit anchor)
- **Commit:** `432e6f8ea76bb540dd5bc69d3314c0d658805ba7` (documentation-only refresh after PR #50).
- **Frontend job:** passed.
- **.NET 10 / PostgreSQL 18 job:** passed.
- **Windows publish job:** passed.
- **Overall:** all three jobs completed with `success`. This run revalidated the unchanged application/test source baseline; it did not execute manual browser tests.

[Open CI Run #546](https://github.com/younestech31/PROMO-GEST/actions/runs/43768228052)

### Phase 1 Party / ProjectCustomer integrity remediation
- **PR #55 — merged:** aligned PostgreSQL integration assertions with the actual separation of organization-wide `Party` identity and project-scoped `ProjectCustomer` records. Replaced an outdated positional request with named fields so the uploaded identity document ID binds to `IdentityDocumentStoredFileId`. PR CI #562 and post-merge main CI #563 passed all three jobs.
- **PR #56 — merged:** added migration `20261116120000_EnforceProjectCustomerIdentityUniqueness`. The migration fails closed if duplicate project/Party-name/phone tuples already exist, then installs deferred PostgreSQL constraint triggers for customer relationship writes and Party identity updates. Transaction-scoped advisory locks serialize the same project/name/phone key. The API maps the database conflict to `CUSTOMER_DUPLICATE`. PR CI #570 and main CI #571 passed all three jobs; PostgreSQL Integration passed **28/28**.
- **PR #57 — merged:** adds direct PostgreSQL 18 regression coverage for the guard migration Down path, duplicate-data preflight rejection without data loss, and successful migration reapplication after explicit test reconciliation. PR CI #572 passed all three jobs; PostgreSQL Integration passed **29/29**.
- **Data boundary:** PRs #55–#57 changed source/tests/docs only. They did not migrate production or Google AI Studio Cloud SQL data, alter credentials, or change runtime authorization/CSRF policy.

### GitHub Actions Run #581 — 16 November 2026 (post-PR #59 main verification)
- **Main SHA:** `53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`; all three required jobs passed.
- **Frontend/static hosting:** TypeScript strict check, **40/40** frontend tests, SPA build, ASP.NET Core `wwwroot` build and preview-leak checks passed.
- **.NET 10 / PostgreSQL 18:** Domain **34/34**, Application **20/20**, Integration **30/30**; solution build passed.
- **Reference endpoint regression:** anonymous `GET /api/reference/administrative-units` returns the ordered 69 Wilaya codes, bilingual labels and version/source metadata; it reports `communesCount = 0` and `PendingOfficialVerification`; `Cache-Control: no-store` is asserted.
- **Operations:** full database/storage/Data Protection restore drill passed; Windows x64 publish, machine-scoped Data Protection recovery and PowerShell validation passed.
- **Boundary:** no commune records were imported; this CI does not represent a manual browser RTL/LTR rerun or a customer-site production migration rehearsal.

[Open CI Run #581](https://github.com/younestech31/PROMO-GEST/actions/runs/43881240365)

### PR #59 — Server-owned 69-Wilaya reference integration (merged)
- Typed frontend contract and API client consume `GET /api/reference/administrative-units`.
- A shared hook validates all 69 records and fails closed when the reference is unavailable or incomplete.
- First-run setup, organization profile edit and project create/update use the API-owned choices and submit the canonical bilingual label.
- Vite-only preview mirrors the response contract; production remains ASP.NET Core-owned.
- PostgreSQL 18 E2E verifies anonymous read, ordered codes 01–69, bilingual labels, version metadata and `no-store`; frontend tests verify the preview contract.
- No schema/migration, security policy, production data or Cloud SQL changes.

### GitHub Actions Run #573 — 16 November 2026 (post-merge main verification)
- **Main SHA:** `065d54cff4e08ed868e676d4cf3d04c715898782`; all three jobs passed. PR CI #572 passed the same migration lifecycle regression suite before merge.
- **Domain / Application / PostgreSQL 18:** Domain **34/34**, Application **20/20**, Integration **29/29**.
- **Additional PostgreSQL 18 coverage:** Migration #13 Down removes the two triggers; the Up preflight rejects pre-existing duplicate Party-name/phone tuples without deleting ProjectCustomer records; after explicit test reconciliation, the migration reapplies and recreates both triggers.
- **Boundary:** the test uses a disposable database and separate provisioning, migration-owner, and runtime identities. It does not prove a migration against a real organization installation or authorize any Cloud SQL/production change.

[Open CI Run #573](https://github.com/younestech31/PROMO-GEST/actions/runs/43865150034)
### C2 Party / Customer changes merged and verified
- **PR #35:** fixed `CS7036` by passing the actual `PartyConcurrencyStamp` returned by the customer-details response. No synthetic token or weakened concurrency check was introduced.
- **PR #36:** captures `previousKind` before Party mutation and writes `ACCESS_DENIED` security audit events for unauthorized Party directory reads/identity changes.
- **PR #37:** applies the same denial-audit and previous-identity guarantees in project-customer workflows.
- **PR #38:** synchronizes canonical Party name/kind changes into every linked `project_customers` transitional mirror; rejects cross-project identity collisions before mutation; updates concurrency stamps; verifies these behaviors in PostgreSQL 18 integration tests.

The former `CS7036` compilation blocker is **resolved**, not an active blocker. Earlier failing CI runs remain historical records only.

### PR #48 — Sensitive API / health response cache hardening
- **Change:** `SecurityHeadersMiddleware` now assigns `Cache-Control: no-store` to every `/api` and `/health` path segment, case-insensitively. The policy covers successful, authorization/error, and unknown-endpoint responses passing through the middleware.
- **Cache boundary:** the middleware does not apply this policy to SPA routes, `/index.html`, `/assets/*`, or the web manifest. Existing static asset caching behavior is therefore unchanged. The Service Worker continues to bypass API and health requests; that is separate from the browser's normal HTTP cache.
- **Regression tests:** `SecurityHeadersMiddlewareTests.cs` checks API/health paths, uppercase prefixes, unknown API paths, static paths, and near misses such as `/apiary` and `/healthcare`.
- **Verification:** PR #48 Run #538 passed all three CI jobs; post-merge main Run #539 also passed all three jobs. No database schema, migration, business data, credential, permission, or cloud-runtime changes were made.

### PR #50 — Response-cache policy verified through the real HTTP pipeline
- **Gap closed:** PR #48's middleware unit tests verified path matching, but did not independently prove that the policy reached actual HTTP responses after the full ASP.NET Core middleware pipeline.
- **Integration coverage:** `PostgresEndToEndTests` now asserts the parsed `Cache-Control` `NoStore` directive on successful `GET /api/auth/csrf`, `GET /health/live`, `GET /health/ready`, API and health fallback 404s, and a CSRF rejection 403. The assertions allow additional directives such as `no-cache` while still requiring `no-store`.
- **Verification:** PR #50 Run #543 passed all three jobs; PostgreSQL 18 integration tests passed **24/24**. Post-merge main Run #544 passed all three jobs on `c26194dce5124d5d5e8d67fc5a04708346b1d5e4`.
- **Boundary:** No runtime middleware, API contract, authentication, CSRF rule, permission, schema, migration, business data, or Cloud SQL setting changed in PR #50.

### Current UI implementation snapshot

The screen-by-screen source inventory is maintained in [UI-IMPLEMENTATION-AND-GAP-MATRIX.md](UI-IMPLEMENTATION-AND-GAP-MATRIX.md), and the execution steps/evidence rules for the outstanding manual checks are in [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md).

**Frontend architecture stabilization — PR #81 (merged):** Main baseline before work: `9af8324dc516c7536eda33c2a487275c30e792d3`. PR #81 merged at `eff036401809bdee4c4ef9a2b9467ac863ae7f95`; post-merge Run #730 passed all three CI jobs. It established canonical API/CSRF, permission, module registry, route and localization sources; explicit legacy adapters; module-owned screens; shared UI ownership; public module entry points and acyclic-boundary regression checks; F–J planned presentation/API separation; and route/dirty-state safeguards. Login and first-run setup now have module-owned screen implementations. PR #81 changed no ASP.NET Core, Domain, Application, Infrastructure, EF Core, PostgreSQL, security policy, production configuration, credentials, or deployment files.
- `AppContentRouter` now supplies the actual `ProjectWorkspaceViewProps`; route authorization is decided before protected views are mounted, with actual `app/routeRegistry.ts` tests for direct admin/Party paths.
- The app now owns shared dirty state and protects internal navigation, project changes, browser Back/Forward, reload/tab close, and logout. Save is offered only when a real save callback is registered; otherwise the user can explicitly discard or stay. Project access revocation removes cached/recent/pinned state and returns to the organization workspace.
- The platform has one canonical API client, CSRF implementation, permission policy, module registry/state taxonomy, route parser/types, and bilingual localization source. Legacy paths are explicit compatibility adapters. Remaining UI-component consolidation is transitional; not every older component import has been migrated to `shared/components` yet.
- Existing screen implementations for organization, projects, structure, parties/customers, reservations, documents, technical administration, and reporting now live under their owning module directories; former feature paths are compatibility facades. F–J workflow display metadata is under module `presentation/` rather than `api/`; the business capabilities remain `PLANNED`.
- Reporting's planned API no longer returns fabricated empty success; Contracts → K-Min navigation is wired, and legal/notarial interface copy is marked pending qualified Algerian practitioner review. Four one-off Applet repair scripts were removed.
- Automated evidence: `npm ci --no-audit --no-fund`, `npm run lint`, `npm test` (**66/66**), `npm run build`, `npm run build:aspnetcore`, plus the .NET 10/PostgreSQL 18 and Windows CI jobs all passed in Run #716. Tests cover actual route registry parsing/authorization, project revocation state, navigation guard decisions, registry completeness/uniqueness, single API/CSRF/route/localization implementations, module API boundaries, and planned endpoint rejection.

**Acceptance boundary:** PR #81 is merged and post-merge CI passed. No new Arabic RTL / French LTR browser walkthrough, mobile/desktop manual acceptance, or real interactive dirty-form journey was executed for this merge. Navigation therefore remains `IMPLEMENTED_NOT_VERIFIED` for manual UX acceptance. P1-04 / D-013 remains a design decision; P1-06 implements technical foundations and safeguards but does not claim the complete approved product interaction model.

## 3. Phase 0 — Remaining Work

Phase 0 is `COMPLETE` by the Product Owner's explicit direction on 16 November 2026 (D-010); Main CI #550 is green. This is an owner-approved administrative closure with two explicit test exceptions, not a claim that every original exit criterion was evidenced. In addition to the earlier targeted AI Studio smoke confirmation, the Product Owner explicitly attested on 15 November 2026 that the principal bilingual desktop/mobile workflows listed in [PHASE-0-MANUAL-ACCEPTANCE.md](PHASE-0-MANUAL-ACCEPTANCE.md) passed: login/session/CSRF, projects, structure, customers/interactions, internal holds, documents/SHA-256, authorization/audit/concurrency/safe errors, and persistence after reload. The result register records those groups as owner-attested `PASS`, not CI-verified browser evidence.

Accepted Phase 0 residual exceptions (still tracked; not represented as PASS):

1. **P0-A01 first-run acceptance:** execute first-run initialization against a separate empty disposable database and verify that a second initialization is rejected. This was not explicitly included in the latest owner confirmation and remains `NOT_RUN`.
2. **P0-A04 logout acceptance:** verify logout revocation and that reopening a protected route does not restore access. Logout was not explicitly included in the latest owner confirmation and remains `NOT_RUN`.
3. **Supplementary audit artifacts:** browser/version metadata and sanitized per-case screenshots or redacted API trace evidence were not attached; the owner attestation is recorded, and no unprovided artifacts are claimed.
4. **Navigation decision:** D-009 records the bounded deferral of project-navigation proposal approval/implementation to the Phase 1 design review; do not start a broad UI redesign.
5. **Preview separation:** keep the Vite-only in-memory simulator clearly separate from real API evidence; it intentionally lacks full parity.
6. **Phase 1 progress:** Phase 1 remains `IN_PROGRESS`. Party identity separation and the PostgreSQL duplicate guard are verified. PR #59 completes the server-owned 69-Wilaya API-to-UI integration. The 1,541-commune catalogue remains pending (`communesCount = 0`, `PendingOfficialVerification`); project municipality remains free text. P1-01 official commune-source reconciliation remains In Progress / Pending. PRs #92–#103 expanded the candidate-source and legal-source audit. PR #99 adds six source-traceable territorial/name assertions; PR #100 records Decree 85-20 Articles 3–4 and eight code-lineage cross-checks; PR #103 adds three ONS 2008 W./C. source assertions (11 total code-lineage evidence rows) while preserving the 1985/1998 Chabet conflict and source-specific Arabic variants. These are evidence supplements, not the full 1,541-row concordance; no commune rows were imported. P1-02 catalogue implementation remains Blocked until the full crosswalk, visual source review, effective-date reconciliation, and qualified review are accepted. P1-04 / D-013 remains an approved design decision only. PR #81 / P1-06 is merged at `eff036401809bdee4c4ef9a2b9467ac863ae7f95`; post-merge Run #730 passed. It adds route/dirty-state safeguards, canonical shared-platform sources, module ownership/public-interface boundaries and regression tests. Manual browser acceptance remains pending; this does not relabel D-013 as a fully implemented product model. P1-05 / D-014 estimated-budget capability is merged in PR #80 at `61bcf8b0a0b2e3967fa5b7add904afd9bc1b0da3`; PR CI #707 and post-merge main CI #708 passed, and current audited main CI #814 passed all three required jobs on exact main SHA `1c068dcaa1dc23c3ec3804abf903a10a8540dc76`. Manual bilingual browser acceptance remains outstanding, so the capability stays `IMPLEMENTED_NOT_VERIFIED` and the Notion task remains In Review / Pending. P0-A01 and P0-A04 remain `NOT_RUN`; no Phase 2–5 business implementation is authorized until applicable gates and practitioner approvals pass.

## 4. Preview Boundary (Do Not Confuse with Production)

- `apps/local-web/dev-api-middleware.ts` (`createPromoGestDevMiddleware`) is loaded only when no real ASP.NET Core proxy target is selected or when `PROMOGEST_VITE_ONLY=1` explicitly selects the in-memory simulator. It is not a full implementation of the ASP.NET Core API.
- When `ASPNETCORE_URL` is configured, Vite proxies `/api` and `/health` to that ASP.NET Core host. The default `npm run dev` launcher verifies prerequisites, waits for the configured Cloud SQL socket, applies pending EF Core migrations with the separate migration identity, reapplies least-privilege runtime grants, verifies API readiness, and only then starts Vite. Both real-API launchers provision .NET 10 per-user through Microsoft's official installer when the SDK is missing.
- `dev-api-middleware.ts` enforces authorization/KYC-isolation/multipart-SHA256/concurrency parity for `/api/parties`, `/api/projects/:id/customers`, `/api/projects/:id/reservations`, and `/api/projects/:id/documents` (verified by HTTP integration tests in `devPreviewAuthorizationParity.test.ts`), while remaining an in-memory development simulator (retaining, e.g., setup Wilaya validation range `01–58`). Preview behavior must never be mistaken for production PostgreSQL 18 persistence or ASP.NET Core 10 security.
- Production builds serve the static React bundle from ASP.NET Core and do not bundle the Vite development middleware.

### Connectivity UX policy — 15 November 2026

- The global “local server disconnected” indicator and red banner are removed from the login and authenticated application shells. A failed background health probe no longer changes the interface into a global disconnected state.
- The readiness probe remains diagnostic and includes PostgreSQL connectivity. It refreshes once per minute only while the tab is visible; overlapping health requests are prevented. A failed probe clears the dashboard's diagnostic snapshot instead of presenting a false connection alarm.
- Login and first-run network failures use a neutral, operation-level retry message. Actual API errors and validation failures continue to be shown; this change does not suppress transaction errors or claim offline write capability.
- The Service Worker does not cache API or health responses. Independently, the server now sets `Cache-Control: no-store` on all `/api` and `/health` responses through PR #48. No customer or business data is made available for offline transactions.

## 5. AI Studio API startup incident — 15 November 2026

Backend logs showed Vite ready on port 3000 while requests to the configured loopback API target `127.0.0.1:5055` failed with `ECONNREFUSED`. This proves that no process was listening on the API target at those moments; it is not a PostgreSQL authentication or frontend rendering error.

The root launcher defect was confirmed in `scripts/dev-with-local-api.sh`: it could skip starting ASP.NET Core when Cloud SQL variables, the .NET SDK, or the Cloud SQL socket were unavailable, but still start Vite. When Vite had an inherited `ASPNETCORE_URL` proxy target, the UI then served on port 3000 while its API routes were guaranteed to fail. The launcher also did not always export the actual default API target to Vite after starting the child process.

The fix makes the launcher fail closed for real-API mode: it resolves the effective target, verifies `/health/ready`, waits for a configured Cloud SQL socket, starts .NET 10 when needed, exports the exact verified API URL, and refuses to start Vite if the API never becomes ready. If a launcher-owned API child exits while Vite is running, it terminates Vite too so the host supervisor can restart the complete stack. A separate explicit `PROMOGEST_VITE_ONLY=1` mode deliberately bypasses the proxy and uses the in-memory simulator for frontend-only work.

The later AI Studio log at **17:09:56** identified the next prerequisite exactly: `ASPNETCORE_URL targets a local API, but the .NET 10 SDK is unavailable`. This was an environment toolchain prerequisite, not a PostgreSQL or credential failure.

PR #42 adds the shared `scripts/ensure-dotnet10.sh` bootstrap to both `npm run dev` and `npm run dev:cloudsql`. It checks for a compatible SDK, downloads Microsoft's official `dotnet-install.sh` over HTTPS only when needed, installs the .NET 10 SDK in `$HOME/.dotnet` without root permissions, and verifies the selected version before proceeding. A newly recreated preview container may need to download the SDK again. The first startup requires outbound HTTPS access to `dot.net` and sufficient free disk space.

CI #544 verifies the development launcher, frontend checks, PostgreSQL 18 integration, the new response-cache middleware tests, Linux/Windows release checks, and restore drill. These automated tests verify source and build contracts; they do not replace live-preview checks, which the product owner has smoke-tested successfully in Google AI Studio.

## 6. AI Studio Runtime Incident — 15 November 2026

A browser HAR captured a same-origin customer-create request at **13:48:49 UTC**:
- First `POST /api/projects/{projectId}/customers`: `403`, `text/html`, returned by Google Frontend.
- The client code retries one non-JSON `403` for a mutating request after obtaining a fresh CSRF token. This explains the second POST; it is a retry, not a separate user submission.
- Retry: `500`, `application/json`, with the API security headers. This reached the ASP.NET Core response pipeline and was handled by `ExceptionHandlingMiddleware` as a generic internal error.
- **Before retrying the create request:** `ProjectCustomerService.CreateAsync` persists the Party, project-customer row, and audit event before reloading the customer response. A `500` can therefore occur after persistence; inspect `GET /api/projects/{projectId}/customers` for the submitted customer before repeating the POST.
- The HAR did not record a `Cookie` request header or an `Authorization` header on either POST. Because `ProjectCustomersController` is `[Authorize]`, this must be checked against the browser cookie store and `GET /api/auth/me`; the HAR alone does not establish whether authentication was actually absent or simply omitted by the export.
- The second response includes a `traceparent` correlation value. The application logs the exception and request path as `Unhandled exception while processing POST .../customers`, but the HAR does not contain the server stack trace.

**Disposition:** The previously reported customer/prospect registry and reservation page errors were confirmed by the product owner as resolved in the live AI Studio development preview after PR #44. PR #44 makes the default development launcher apply pending Cloud SQL migrations and refresh least-privilege runtime grants before API readiness. The earlier HAR's individual POST exception still cannot be attributed conclusively without its matching server stack trace; do not claim that the HAR alone proves a specific exception cause. Never disable CSRF, remove `[Authorize]`, or broaden PostgreSQL permissions speculatively.

The `GET /health/ready` endpoint only checks `Database.CanConnectAsync` and whether `organization_settings` is initialized. It does **not** verify that EF Core migrations are current. Therefore `databaseConnected: true` and `isInitialized: true` do not prove that the `parties` and current `project_customers` schema is present.

### PR #44 — Cloud SQL startup schema/grant preparation

PR #44 (`6bbd97f`) changes the normal AI Studio `npm run dev` path so a configured loopback ASP.NET Core API is not launched against an unprepared Cloud SQL schema. The launcher requires both the runtime and migration identities, waits for the SQL socket, runs the API migration command using the migration identity, reapplies least-privilege runtime grants, then checks API readiness and starts Vite. The dedicated `dev:cloudsql` runner marks its completed migration pass to avoid running it twice.

The owner subsequently confirmed that the preview server is working and the project customer/prospect and reservation pages no longer show the reported generic internal error. No production database, credentials, or customer deployment was changed by this development fix.

## 7. Other Recorded Findings & Audit Remediations

- Organization profile editing (`PUT /api/organization`, `OrganizationProfileService`, `OrganizationProfileView.tsx`) is implemented and enforces `org.manage`, `ExpectedConcurrencyStamp`, and immutable `singleton_guard`.
- `projects.structure.manage` is granted to `SITE_ENGINEER` (alongside `SYSTEM_ADMIN` and `PROJECT_DIRECTOR`) and enforced alongside `ProjectMember` construction/manager flags in `ProjectStructureService`, `permissions.ts`, and `devPreviewProjectStore.ts`.
- `VIEWER` no longer holds `files.read`, and `ProjectDocumentService` restricts document categories by `ProjectMember` capabilities while isolating `ProjectCustomer.IdentityDocumentStoredFileId` files behind `customers.read`.
- `POST /api/setup/initialize` requires a loopback client IP or matching `X-PROMOGEST-SETUP-TOKEN` when configured (`Security:SetupBootstrapToken` / `PROMOGEST_SETUP_TOKEN`), and `GET /api/setup/status` omits `initializedAtUtc` and exposes `requiresBootstrapToken`.
- Passwords are bounded to `128` characters (`PasswordPolicyValidator.MaximumLength = 128`) including pre-hash checks in `AuthService.LoginAsync`, and `User.RecordFailedLogin` resets stale counters after lockout expiry.
- `/api/auth/me` withholds organization fiscal/contact fields without `org.read`/`org.manage` and `ConcurrencyStamp` without `org.manage`, while `/health/live` and `/health/ready` return `environmentMode: null` outside Development.
- The temporary debugging screenshot `public/assets/aistudio/Screenshot_2026-11-15-12-54-54-202-edit_com.android.chrome_743cf16d.jpg` and unused `{ auto_https disable_redirects }` Caddy global directives were removed.
- No Cloud SQL production-data migration or customer deployment is implied by CI #544. The Cloud SQL environment remains a non-production development integration.


## P1-07 — Financial project-document read guard checkpoint (17 November 2026)

Base snapshot before this change: `main` SHA `69a3fa625e4b2a11b4a778d42f452c3894a0173b`; main CI [#759](https://github.com/younestech31/PROMO-GEST/actions/runs/44116903350) passed 3/3 jobs. The focused implementation and regression tests were delivered in [PR #87](https://github.com/younestech31/PROMO-GEST/pull/87), merged at `b41d34aae03e1549ca1963a23d92643ff91bf393`.

The change makes `Financial` `ListAsync`/download authorization depend on explicit `ProjectMember.CanViewFinancials` even when `RoleInProject = ProjectManager`. It records `ACCESS_DENIED` when a list hides an existing Financial document, keeps download denial auditing, and mirrors the policy in the Vite-only preview. Existing Financial upload behavior, `SYSTEM_ADMIN` behavior, project scoping, and KYC isolation are non-goals and remain unchanged.

Application, PostgreSQL 18 integration, and Vite preview regressions cover ProjectManager with and without the capability, Finance membership, non-member denial, cross-project document IDOR, list/download denial audit, and unchanged ProjectManager Financial-upload behavior.

Implementation/test commit `4b04bd9dcf0dec806def7780a9d0b22d52d21878` is in PR #87. The final PR head `8dc81b0bc74629d125c01f2549caec1370bd2ec1` passed push CI [#765](https://github.com/younestech31/PROMO-GEST/actions/runs/44123331977) and PR CI [#766](https://github.com/younestech31/PROMO-GEST/actions/runs/44123351434), all 3 jobs. CI #766 reported solution build with 0 errors, Domain 34/34, Application 21/21, PostgreSQL 18 Integration 32/32, full restore drill (1/1 stored files verified), frontend strict TypeScript/unit/build/static hosting, and Windows x64 publish/PowerShell checks. Post-merge main CI [#767](https://github.com/younestech31/PROMO-GEST/actions/runs/44123972890) passed all 3 jobs on merge SHA `b41d34aae03e1549ca1963a23d92643ff91bf393`.

Automated acceptance is verified. Manual browser/practitioner and production-installation checks remain separate and pending; this change does not imply production deployment or business-data/Cloud SQL changes.


## P1-01 — Territorial assertion and code-lineage evidence checkpoint (17 November 2026)

- [PR #99](https://github.com/younestech31/PROMO-GEST/pull/99) merged at `ec038a1137335c36c523469bce4e4884d45ab215`; its six-row CSV separates locality/mechta parent transfers and a commune rename from four-digit register codes. PR CI #804 and post-merge main CI #805 passed all three jobs.
- [PR #100](https://github.com/younestech31/PROMO-GEST/pull/100) merged at main SHA `29771173c2be3f803535461066625cc97e1dd61a`; its eight-row CSV preserves raw JO44/1985, JO49/1996 and JO23/1998 assertions and ONS W./C. cross-checks. PR CI #806 and post-merge main CI #807 passed all three jobs.
- The code-bearing runtime/schema baseline is unchanged: PR #87 remains the latest API/Application runtime source and PR #59 the latest EF/schema source. No application, API, migration, commune seed, production database or Cloud SQL data changed.
- The server-owned administrative reference still exposes 69 Wilayas, legal baseline 1,541 communes, `communesCount = 0`, and `PendingOfficialVerification`. P1-01 remains In Progress / Pending; P1-02 remains Blocked.
- Open items remain the full 1,541-row legal crosswalk, exhaustive instrument chain, bilingual primary-source reconciliation, visual inspection of unresolved official PDF pages, immutable source bytes/SHA-256, full duplicate/omission/effective-date checks, and qualified Algerian practitioner sign-off.


## P1-01 historical source reconciliation — 18 November 2026 (pre-PR #107 checkpoint; superseded below)

- At this pre-PR #107 checkpoint, main was `94b4dcd8b78ad87ccc1435220475001f26190a94`; the historical branch had not yet merged. This record is retained as a dated checkpoint, not current repository state.


## P1-01 post-PR #107 source and CI checkpoint — 18 November 2026

- **Historical PR #107 checkpoint:** merge commit `8b40120aaf2f649bb123cd654f88f62250ce02d9`. PR #107 CI [#821](https://github.com/younestech31/PROMO-GEST/actions/runs/44289319182) and post-merge main CI [#822](https://github.com/younestech31/PROMO-GEST/actions/runs/44289721946) both passed all three required jobs: frontend/static hosting, .NET 10 + PostgreSQL 18 least privilege, and Windows publish/PowerShell.
- PRs #105–#107 are documentation/reference-data only. The last code-bearing API/Application main source remains PR #87 (`b41d34aae03e1549ca1963a23d92643ff91bf393`); the last EF/schema source remains PR #59 (`53c50fbc0db801b9298ec731cfc44f2d4d58ff7f`). No application, API, migration, commune seed, production DB or Cloud SQL data changed.
- At this historical PR #107 checkpoint, `main` contained the 1,541-row working candidate crosswalk, the 404-row JO58/2026 French text-layer delta, the JO11/1986 four-row update, the JO79/2021 59-row new-Wilaya extract, the 103-row existing-Wilaya extract, and the related parent/code/label exception controls. The 59 new-Wilaya JO79 rows on printed pages 17–19 have now been visually checked against the French PDF; the 103 existing-Wilaya rows on pages 13–16 remain text-layer only. Arabic row pairing and exact source-PDF SHA-256 remain pending.
- JO79 confirms Tabelbala in W52/code 5206 while the candidate assigns the name under W08; preserve this as an unresolved parent conflict. Historical exceptions and four W07→W61 code transitions remain versioned, not overwritten.
- P1-01 remains In Progress / Pending; P1-02 remains Blocked. No canonical 1,541-row legal concordance, effective-date approval, bilingual practitioner sign-off or import authorization exists.


## Local Workspace Stabilization & P1-01 Bilingual Visual Review Checkpoint — 18 November 2026

- **Frontend runtime fixes:** replaced hardcoded `isPreviewMode={true}` in `apps/local-web/src/app/App.tsx` with `isVitePreviewRuntime(health)` (`apps/local-web/src/shared/utils/appRuntime.ts`), added `document.documentElement.lang`/`dir`/`title` synchronization via `getDocumentPresentation`, replaced in-place `session.organization` mutation with an immutable callback, and added regression tests in `apps/local-web/src/utils/appRuntime.test.ts`.
- **P1-01 bilingual PNG & SHA-256 evidence refresh:** retrieved and SHA-256 hashed 29 official JORADP and ONS PDFs, and visually PNG-inspected JO58/2026 (pp. 9–25 FR/AR), JO79/2021 (pp. 13–19 FR / 15–22 AR), JO11/1986 (pp. 280–281 FR / 401–402 AR), JO23/1998 (Boumerdès FR p. 11 vs AR p. 13), and disputed JO44/1985 sections (FR pp. 1065–1070 / AR pp. 1631–1635). Corrected 78 off-by-one JO58 page references and all 5 JO58 transcription variants (`404/404` French JO58 rows join under label normalization while preserving source variants). Proved intra-issue JO23/1998 (`A1998023.PDF` p. 13 `3514` vs `F1998023.PDF` p. 11 `3614`) and JO44/1985 Chihani (`A1985044.PDF` p. 1635 `3614` vs `F1985044.PDF` p. 1069 `3624`) bilingual divergences verbatim.
- **Boundaries unchanged:** no commune records imported (`communesCount = 0`, `PendingOfficialVerification`); P1-01 remains `In Progress / Pending` (975-row JO44 concordance and practitioner sign-off still open); P1-02 remains `Blocked`; external GitHub PR/CI (`#107` / Run `#822`) and Notion backlog trackers were not mutated from this offline workspace snapshot.


## Historical main-verification checkpoint — 18 November 2026 (CI #825)

- Main SHA: `cd57a5912ccb3631a6e9581d48d1aab2600180d2`; current CI [#825](https://github.com/younestech31/PROMO-GEST/actions/runs/44310687822) passed all three required jobs on this exact SHA. CI logs confirm Frontend 82/82, Domain 34/34, Application 21/21, and PostgreSQL 18 Integration 32/32; zero failed or skipped tests. The frontend job ran `npm run lint`, `npm test`, Vite build, static-output checks, and ASP.NET Core `wwwroot` build. The .NET job ran warnings-as-errors build, Linux publish, PG18 migrations/integration, and the full restore drill; the Windows publish/PowerShell job also passed.
- Frontend checkpoint `cd57a591` updates preview detection from the health response, root `lang`/`dir`/title and immutable organization-session updates. It does not close P1-14: preview middleware opt-in, loopback-by-default binding and production bundle exclusion still need a focused security slice.
- P1-01 reference work now has a 1,541-row *candidate* workpaper, 404-row JO58 extract, 59-row and 103-row JO79 extracts, and a sign-off pack recording 29 unique official PDF filenames with 29 distinct SHA-256 values. The documented bilingual PNG review covers JO58 pp. 9–25 (both editions), JO79 pp. 13–19 FR / 15–22 AR, JO11/1986, JO23/1998 disputed Boumerdès pages, and disputed JO44/1985 sections. It does not complete the 975-row remaining JO44 concordance or practitioner/legal adjudication.
- No commune rows were imported: `communesCount = 0`, `PendingOfficialVerification`. P1-01 remains In Progress / Pending and P1-02 remains Blocked. The unresolved Chabet El Ameur and Chihani source discrepancies, parent-transfer exceptions, effective-date chain and qualified Algerian reviewer decision remain explicit.
- The latest main commit `cd57a591` is not associated with a GitHub PR; this is a contribution-process deviation. This documentation sync itself is being delivered through a focused branch/PR. No API/Application runtime, EF migration, production data, Cloud SQL business data, credential or deployment change is included.
- Manual browser acceptance remains outstanding for RTL/LTR navigation, project switch/revocation, dirty forms, budget visibility, first-run and logout. Green CI does not upgrade these to passed.
 
 ### PR #110 — Vite development preview isolation (merged)
 - PR #110 merged on 18 November 2026 at main SHA `23ff17bb11123877470af38273e9e6f1ac9bbe53`; final PR head `33900b4b44910afe5cacb9fa2dd1dcdcee0de474`.
 - PR CI #861 / [run 44323665534](https://github.com/younestech31/PROMO-GEST/actions/runs/44323665534) passed all three jobs on the exact PR head. Post-merge main CI #862 / [run 44324616474](https://github.com/younestech31/PROMO-GEST/actions/runs/44324616474) passed all three jobs on the exact merge SHA.
 - Exact post-merge results: Frontend 88/88, Domain 34/34, Application 21/21, PostgreSQL 18 Integration 32/32; full restore drill 1/1 stored file verified; Windows machine-scope Data Protection test 1/1 plus publish/PowerShell validation passed.
 - The change requires explicit Vite-only opt-in, separates the in-memory simulator from real API/Cloud SQL targets, defaults Vite to loopback, requires exact host/origin allowlists for temporary external preview, and checks that demo identity, preview endpoint/token/UI and Bearer-token paths do not enter production SPA or ASP.NET Core static output.
 - **Still unverified manually:** Google AI Studio preview with the actual host/origin and platform network ingress restrictions. CORS/allowlists do not authenticate users. Keep P1-14 In Review / Verification Pending; no merge/CI result is a substitute for this manual check.
 - No production PostgreSQL database, Cloud SQL business data, credentials, deployment, production authentication, or production security policy was changed.

## Historical main and P1-01 extraction checkpoint — 18 November 2026

- **Historical PR #112 checkpoint:** merge SHA `293476cbdbf3c4c3fbcae87d7c9b682a493ca436`. Main CI [#873](https://github.com/younestech31/PROMO-GEST/actions/runs/44330071074) passed 3/3 jobs on that exact SHA: Frontend 88/88, Domain 34/34, Application 21/21, PostgreSQL 18 Integration 32/32; restore drill 1/1; Windows machine-scoped Data Protection, publish and PowerShell validation passed. Four xUnit analyzer warnings remain; zero build errors.
- P1-01 gained a raw 26-row JO44/1985 French text-layer extraction for W31 Oran, printed p. 1068. The codes are unique 3101–3126; commune labels, code strings and seats are separate. The extract is not image-verified, not Arabic-paired, not joined to candidate rows, not effective-date adjudicated and not practitioner-approved. The JO44 planning tranche now records 26/975 extracted with 949 outstanding.
- P1-01 remains In Progress / Pending, P1-02 remains Blocked, and no commune rows are imported. No API/runtime, schema/migration, production database, Google AI Studio Cloud SQL data, credentials, deployment or security policy changed.

## Historical P1-01 source work and main-branch checkpoint — 18 November 2026

- **Historical PR #113 checkpoint:** documentation-only merge SHA `e19456f54602e184ce80087e1a8e97916b8fe471`. PR CI #874 passed 3/3 jobs on exact PR head `e37102856ca8a9239fadd450955f99d648a4bd0f`; a post-merge run for the merge SHA is not independently confirmed here. The latest verified main CI remains #873 on parent SHA `293476cbdbf3c4c3fbcae87d7c9b682a493ca436`.
- JO44/1985 now has two independent French searchable-text source tranches: W31 Oran, 26 rows (printed p. 1068), and W06 Bejaia, 52 rows (49 on printed p. 1055 and 3 on p. 1056). Total transcribed: 78/975 planned JO44 rows; 897 remain, subject to the national completeness audit.
- Neither tranche is visually page-verified or Arabic-paired in this session. The source checksum is reused from the repository inventory, not recalculated. Candidate-row matching, valid-time and parent lineage, amendment completeness and qualified Algerian practitioner approval remain pending.
- P1-01 remains In Progress / Pending; P1-02 remains Blocked. No commune row is imported. No API/runtime, schema/migration, database data, Cloud SQL business data, credentials, deployment or security policy changed.

## P1-01 JO44 extraction checkpoint — 18 November 2026

- **Historical PR #114 checkpoint:** documentation-only merge SHA `0c90e5f21c50f846711f3c2d042c2b4557850838`. PR #114 CI [#877](https://github.com/younestech31/PROMO-GEST/actions/runs/44335040451) passed all three jobs on exact PR head `79f898041c796425d5de06a97470ee61221fc6e7`; a separate post-merge main CI result on `0c90e5f...` is not independently confirmed. Latest verified code-bearing main CI remains #873 on `293476cb...`.
- JO44/1985 now has five bounded French searchable-text extracts: W31 Oran 26 rows, W06 Bejaia 52, W02 Chlef 35, W04 Oum El Bouaghi 29, and W10 Bouira 45. Combined 187/975 planned original-register rows transcribed; 788 remain, subject to final national row-count reconciliation.
- The 109 latest rows have unique four-digit code sequences 0201–0235, 0401–0429 and 1001–1045, with commune, code and seat kept separate. Source anomalies `Labi od Medjadja`, `Tirmzrit`, and seat `T rouna` remain verbatim pending image/bilingual review.
- None of the five JO44 tranches is visually verified or Arabic-paired in the current extraction passes. The source PDF SHA is referenced from the existing repository inventory, not recomputed. No candidate join, current effective date, parent lineage, or practitioner approval is asserted.
- P1-01 stays In Progress / Pending; P1-02 stays Blocked; no commune rows are imported. No API/runtime, schema/migration, database, production, or Cloud SQL business data changed.
## P1-01 JO44 extraction checkpoint — 18 November 2026

- **Historical PR #115 documentation-only checkpoint:** merge SHA `89881cff5754e2a494054fc90fa76bcdb1d8126f`. PR CI #879 passed 3/3 jobs on exact PR head `a8799a1dada92af811142f1ec49e9dacd071a377`; a separate post-merge push CI on the then-live main SHA at that historical checkpoint is not independently confirmed. The latest verified code-bearing main CI remains #873 on `293476cb...`.
- Five previously merged JO44 extracts contain 187 rows: W31 Oran 26, W06 Bejaia 52, W02 Chlef 35, W04 Oum El Bouaghi 29 and W10 Bouira 45. This branch adds W03 Laghouat 24, W05 Batna 61 and W08 Bechar 21. Combined proposed coverage is **293/975** planned rows; **682 remain**, subject to final national row-count reconciliation.
- All eight bounded sections are text-layer-only in their extraction passes, not visually page-verified or Arabic-row-paired. Preserve `Labi od Medjadja`, `Tirmzrit`, `T rouna`, `Legride t`, `Boulh...iat` and `Boulh...at` verbatim pending source-image/bilingual review. No candidate joins, current dates, parent lineage or legal approval are inferred.
- P1-01 stays In Progress / Pending; P1-02 stays Blocked. No commune rows are imported; no runtime, schema/migration, database, production or Cloud SQL business data changed.
## P1-01 JO44 source progress — PR #117 proposed tranche (18 November 2026)

- **Historical PR #116 checkpoint:** merge SHA `4c97783c1654c2ca6a1336fcf0c7e21e520c0cdd`. PR #116 CI #881 passed all three required jobs on exact PR head `7bfc75b393cbc8018e5ec9d38708607231b84c8d`; separate post-merge push CI on the main merge SHA is not independently verified.
- Eight bounded JO44/1985 French searchable-text source sections are merged: W31 Oran26, W06 Bejaia52, W02 Chlef35, W04 Oum El Bouaghi29, W10 Bouira45, W03 Laghouat24, W05 Batna61 and W08 Bechar21; 293 rows total.
- Open proposed PR #117 adds W09 Blida29, W11 Tamanghasset10 and W12 Tebessa28. If accepted, total bounded extraction becomes 360/975 planned rows; 615 remain, subject to final national row-count reconciliation.
- All current JO44 tranches are French searchable-text extraction only: no page-image visual verification or Arabic row pairing is claimed. PDF SHA-256 is reused from the repository source inventory, not recomputed in this pass. Preserve `Tirmzrit`, `T rouna`, `Labi od Medjadja`, `Legride t`, `Boulh...iat` and `Boulh...at` literally pending source-page review; do not infer current code, parent, effective date, or canonical name.
- P1-01 remains In Progress / Pending; P1-02 remains Blocked. The 1,541 candidate rows are not approved, no commune records are imported, and no runtime/API/schema/migration/production/Cloud SQL data changed.

## Historical main-verification checkpoint — 19 November 2026 (PR #140/#141)

- PR #140 merged at `a2565e9aba909f4ac6f515baf55018aad8bf0ef6`; unspecified/wildcard hosts `0.0.0.0`, `::`, and `[::]` are no longer classified as loopback. Regression tests require explicit external-preview opt-in for them. Exact preview hostname, browser origin, and restrictive platform-ingress acceptance remain outstanding.
- PR #141 merged at `7fbd3a455e9f36d1969d8921621aabb29f280e5d`; `scripts/validate-p1-01-master-ledger.py` now runs in frontend CI. It enforces structural row/key/source-ID uniqueness, counts, decision partition, flagged anomaly/conflict routing, pending sign-off and adjudication tokens. It does not adjudicate legal identity.
- Main CI #989 passed 3/3 on exact SHA `7fbd3a4...`. This is build/test/workpaper evidence only, not legal sign-off or browser acceptance.
- P1-01 remains In Progress / Pending, P1-02 Blocked; `communesCount = 0`; no import. See [master reconciliation report](reference-data/P1-01-MASTER-1541-RECONCILIATION-REPORT.md) and [master ledger](reference-data/P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv).


## P1-01 uploaded candidate archive and new-wilaya statutory cross-check — 22 November 2026

- PR [#197](https://github.com/younestech31/PROMO-GEST/pull/197) merged docs-only at exact main SHA `38f2e5bbd9d85d2a5dbaa4df1e9b3484a930cd34`. Post-merge CI [#45032141029](https://github.com/younestech31/PROMO-GEST/actions/runs/45032141029) passed all three jobs (Frontend; .NET 10/PostgreSQL 18 least-privilege tests; Windows publish/PowerShell); CodeQL [#45032141065](https://github.com/younestech31/PROMO-GEST/actions/runs/45032141065) passed C# and JavaScript/TypeScript.
- The uploaded archive has 69 wilayas, 591 dairas and 1,541 commune rows with internally consistent references, but its daira/commune identifiers are generated sequence IDs, its upstream JSON is read from moving `@main`, and the Decree 26-253 / JO52 citation is over-broad for all rows. The source audit is candidate-only; no data or import changed.
- A bounded legal comparison of the 108 candidate rows across the 11 new wilayas against JO25/2026 Law 26-06's amended Law 84-09 Article 52 bis items 10–20 found that all 11 per-wilaya counts match (108/108), but strict normalized name matching yielded 81 matches, 20 spelling/order variants, and 7 statutory-list-only plus 7 uploaded-only names. The substantive differences are in Bou Saada (four names on each side) and El Abiodh Sidi Cheikh (three names on each side; one tentative main-name alias). See `docs/reference-data/P1-01-LAW26-06-NEW-WILAYA-RECONCILIATION-2026-11-22.md`.
- JO61 Annex II's matching 108 electoral rows do not prove one-to-one commune identities: Article 124 of Organic Law 21-01 permits electoral constituencies of part of a commune, one commune, or several communes. The new-wilaya Annex II text was searchable-text checked but not visually page-image reviewed; JO25 printed p.11 was visually inspected, pp.9–10 remain text-layer-only in this pass.
- No application/runtime/API/schema/migration, commune master ledger, production/PostgreSQL data, security or branch-protection changes were made. All 1,541 practitioner approvals remain PENDING; W30-R007 NEEDS_EVIDENCE; no `valid_from`; `communesCount=0`; P1-01 remains In Progress/Pending; P1-02 remains Blocked; P1-35 remains In Progress/Pending. Phase 1 remains IN_PROGRESS and no phase dependency is bypassed.


## P1-01/JO52 operational vs legal territorial relation finding — 22 November 2026

- PR [#198](https://github.com/younestech31/PROMO-GEST/pull/198) merged at `410f3775dc603ea50aed44cc469015b7e16e8972`. Exact PR-head CI #45033444709 passed 3/3, CodeQL #45033444708 passed 2/2; exact post-merge main CI #45033905055 passed 3/3, CodeQL #45033905001 passed 2/2.
- A follow-up source audit identifies Decree 26-253 / JO52/2026 as the amended Decree 91-306 schedule of communes animated by each Daira Chief, not the territorial membership register. Keep Daira-Chief service assignment separate from legal Commune→Wilaya parentage.
- Confirmed uploaded candidate membership errors: code 64/Bou Saada has four M'Sila Article 32 communes (Sidi Hadjeres, Maadid, M'tarfa, Maarif) and lacks Khoubana, M'Cif, El Houamed, Djebel Messaad; code 60/El Abiodh Sidi Cheikh has three El Bayadh Article 36 communes (Brezina, Ghassoul, Cheguig) and lacks Aïn El Orak, El Bnoud, El Mehara. Exact row IDs/source limits are in `docs/reference-data/P1-01-JO52-LEGAL-OPERATIONAL-MEMBERSHIP-AUDIT-2026-11-22.md`.
- JO52 lists 13 of the 23 legal Bou Saada members under the Daira-Chief assignment group headed by Ksar El Boukhari (67) and 10 under Bou Saada (68). Its assignment scope is different from legal territorial membership. Article 54 transition to 31 December 2026 must not be used as per-row valid_from.
- Documentation-only follow-up. No legal ledger row, commune code, parentage, valid_from, candidate data, runtime/API/schema/migration, database or security policy changed. All 1,541 practitioner sign-offs remain PENDING; W30-R007 NEEDS_EVIDENCE; `communesCount=0`; P1-01/P1-35 In Progress/Pending; P1-02 Blocked.


## Critical uploaded Wilaya-code mapping finding — 22 November 2026

The supplied archive's new-Wilaya wilayas.csv has the correct Wilaya names but attaches the wrong official codes to 10/11 names. Decree 26-206 (JO40/2026 Art.1) and JO58/2026 printed p.9 give the authoritative mapping 59 Aflou, 60 Barika, 61 El Kantara, 62 Bir El Ater, 63 El Aricha, 64 Ksar Chellala, 65 Aïn Oussara, 66 Messaad, 67 Ksar El Boukhari, 68 Bou Saada, 69 El Abiodh Sidi Cheikh. Only Aflou/59 matches the archive. The archive's 46 daira and 96 commune generated IDs in the ten affected groups inherit the mismatched code prefixes; they are not official IDs and must not be imported.

Earlier name-set differences for the upload groups labelled Bou Saada (local code 64, correct official code 68) and El Abiodh Sidi Cheikh (local code 60, correct official code 69) remain valid when comparing by Wilaya name. Their local numeric keys are not legal code assertions. See docs/reference-data/P1-01-UPLOADED-WILAYA-CODE-MAPPING-CORRECTION-2026-11-22.md.

No candidate CSV, master ledger, runtime/API/schema/migration, DB or production data changed. All 1,541 sign-offs remain PENDING, W30-R007 NEEDS_EVIDENCE, communesCount=0; P1-01/P1-35 In Progress/Pending; P1-02 Blocked.
