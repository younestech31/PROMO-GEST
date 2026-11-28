# Linear roadmap reconstruction checkpoint

Project: `86c8d1ea-c9e7-42ad-ac42-7e127db026a7`.

User-facing position document: https://linear.app/younesrahal/document/nhn-hna-mwqf-altnfyth-0be73d6db68b

## Verified scope and limitations

- 67 unique source records mapped to 67 successful issue creations, YOU-5 through YOU-71. Onboarding YOU-1 through YOU-4 untouched.
- Seven phase milestones; three workflow labels. Source inventory: 42 Done, 8 In Review, 4 Blocked, 1 In Progress, 12 Backlog. These are record counts, NOT product completion percentages.
- `linear-roadmap-map.tsv` preserves source page identity, disambiguated source codes, summary titles, source status/verification and Linear identity. P1-05-BUDGET and P1-05-CLOSURE are different source records; neither is a duplicate of the other.
- Open-task criteria, dependencies, evidence and non-goals were enriched in Linear. All twelve future tasks include source-derived acceptance/dependency/non-goal descriptions and remain Backlog/Gated. Much of the historical Done inventory still has summarized descriptions and source links rather than complete acceptance/evidence migration. **Detailed migration remains incomplete.**
- 35 successful relation creations: 28 blocks and 7 related. Closure and accounting relation direction/readback verified. This is not an exhaustive historical dependency export.
- No automatic Notion synchronization; no source deletions, Sheets edits, invented assignees, estimates, approvals or due dates.
- Blocked maps to Todo + Blocked label; In Review maps to In Progress + In Review label. Verification state remains separately documented. P1-14 also carries Blocked verification.
- Connector cannot update milestone status/sort order. Names/descriptions carry approved phase position; actual API statuses remain next/unstarted. API-generated start/completion timestamps describe import, not original execution or an approved delivery schedule.

## Actual delivery position

Phase0 administrative closure D-010 is preserved. Phase1 remains in progress. P1-01/P1-35 operational reference approval is satisfied, not reopened. P1-02 remains In Progress: full frozen adopted Sheets snapshot/source checksum, additive reversible migration, stable IDs/dated parents, shared server-owned reference endpoint and setup/organization/project/preview integration remain outstanding. Adopted baseline:1541 communes/69 wilayas/550 declared dairas;549 observed groups is an accepted residual; unknown seats must stay unknown.

P1-06/P1-20/P1-49 stay In Review; deferred manual browser acceptance is not replaced by CI. P1-08 requires an explicit owner policy decision. Linux, preview ingress, phone migration, Windows monitoring and HTTPS/cookie operational evidence are separate gates. P1-34 needs separate explicit branch-protection authorization; no ruleset changes were made. Future phases2–5 remain planning-only/gated.

PR305 head `4134ee66aa3303a2434225f1ce524e5b6515c87f` was OPEN at direct readback. All checks completed successfully, including .NET10/PostgreSQL18, Windows and CodeQL: CI46149840746, CodeQL46149840740. Its preflight/packaging tools and21 synthetic Python tests do not prove a full Sheets snapshot/import. PR304 merge `1e4b784204f635b768c30ec6b763ce088d489039`, CI46149242703 also completed successfully. No production rollout or additional merge was performed during roadmap reconstruction.

## Remaining migration work

1. Fetch and preserve full criteria/dependencies/source-doc/PR/CI fields for historical Done records; do not recreate any mapped issues.
2. Reconcile historical source-main claims as historical, preserving evidence rather than treating old SHA values as current main.
3. Complete historical dependency reconciliation, check for cycles and confirm direction in Linear.
4. Perform a complete small-page remote inventory readback against the mapping; current 67-record check is local inventory/mapping plus successful API creation receipts, not a fresh remote enumeration.
5. Phase1 feature delivery resumed with P1-02 additive version/identity/dated-parent storage; see `../P1-02-VERSIONED-REFERENCE-STORAGE.md`. This is schema implementation, not an imported/activated dataset. Full-source capture, transactional import and shared API/UI integration remain next. The earlier position paragraph above records the roadmap-import checkpoint, before this schema slice.
