# P1-19 — Production HTTPS active-session technical acceptance

Date: 27 November 2026. Status: **new real-stack execution pending**.

## Scope

P1-19's session list/selective revocation API and bilingual modal are already shipped.
Development-mode real-browser coverage exists in `tests/browser/phase0.py`. This slice
adds isolated Production HTTPS acceptance, including session continuity across API
restart. It changes no runtime application, session lifetime, authentication, schema,
permissions or deployment configuration.

PR #273 was squash-merged as `49add144088a418422da72e9728d7157102fd46a` after
final-head CI 45995665394 passed 4/4 and CodeQL 45995665588 passed 2/2. Its P1-09
technical matrix and permanent screenshots remain valid with their original provenance.

## Scenario

`tests/browser/session_security.py` runs in the four existing AR/FR desktop/mobile
Production fixtures (published API, PostgreSQL 18, Caddy HTTPS, encrypted persisted
Data Protection keys). It first validates the same exact disposable-target guard as
the budget/organization fixtures, before API/browser/filesystem/SQL access.

Two extra administrator sessions are established **before the API restart**, with
synthetic distinct User-Agents. Their cookie state is mode 0600 under the private
temporary directory, never the evidence directory; shell cleanup removes it. No
password is written to a file. After restart, no new login is needed for this slice,
so the shipped Production rate limit remains unchanged.

Eight named checks per profile:

1. Pre-restart sessions remain valid; inventory uses an exact public schema with no
   tokens, token hashes, opaque tokens, SecurityStamp or unexpected fields.
2. Selective revocation without CSRF returns 403 and leaves the target alive.
3. API current-session revocation without confirmation returns 409
   `CURRENT_SESSION_CONFIRMATION_REQUIRED` and preserves the session.
4. Actual SPA inventory is Arabic RTL / French LTR and displays the privacy warning:
   IP/browser information is indicative, not proof of physical location or identity.
5. UI revocation of the chosen other session returns 204, removes it from inventory
   and makes cookie replay return 401 while the current session stays valid.
6. Opening then cancelling current-device sign-out sends no revocation request and
   preserves the current session.
7. Explicit current-device confirmation returns 204, returns the SPA to login and
   makes current/other cookie replay return 401.
8. Both revocations have exactly one audit record each; the independent primary
   administrator session remains valid for the existing staging logout test.

This focused matrix does not claim new expired-session, cross-account IDOR,
concurrent-revocation or reset/deactivation browser coverage; existing PostgreSQL
integration coverage remains separate. No institution/operator signature is inferred.

## Evidence handling

Each profile writes `session-security.json`, `sessions-01-inventory.png` and
`sessions-02-confirmation.png`. Only boolean results, static scope and profile names
are exported in JSON: no session IDs, cookie state or response dumps. The screenshots
contain only synthetic users and loopback/fixture device metadata.

The explicit exporter `--suite sessions` requires all eight checks, plus the existing
organization matrix and baseline staging checks, and publishes compact copies of the
confirmation screenshot using the existing SHA-256-verified read-only annotation
transport. Default staging and organization suite exports retain their meanings.
Full originals remain in `staging-https-evidence` (30 days). No CI repository-write
permission, additional secret or external database is introduced.

## Verification log

- Offline session helper: **5/5 PASS**, including rejection before I/O, strict public
  inventory schema, secret-field denial, unique current session and UUID validation.
- Exporter: **13/13 PASS**, including session completeness/privacy/path checks.
- Importer: **7/7 PASS**. Python compilation: **PASS**.
- Actual Production browser execution/screenshots: **PENDING rerun**; not yet scored.
- First CI 45997518847 stopped at the fail-closed encryption guard before session
  preparation: its proof flag was previously set only after restart. The staging
  exercise now checks the actual private persisted XML key files for encryptedSecret
  before enabling the preparer. No guard is bypassed or weakened; no failed run is
  counted as acceptance. CodeQL 45997518850 passed 2/2 for that source.
- PR #273 exact-main postmerge CI 45997088221: **SUCCESS 4/4**;
  CodeQL 45997088222: **SUCCESS 2/2**.

P1-19 remains In Review / Pending in the task register. P1-08 owner-policy gate,
P1-10 acceptance dependency, P1-01/P1-35 deferral, P1-02 block and Phase 2–5 gates
are not changed by this technical slice. No Notion status is advanced.
