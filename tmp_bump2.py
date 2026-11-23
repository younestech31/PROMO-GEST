import re
from pathlib import Path

DOCS = [
 "docs/CURRENT-STATE-BASELINE.md","docs/DEVELOPMENT-WORKFLOW.md","docs/DECISION-LOG.md",
 "docs/MASTER-BLUEPRINT.md","docs/MASTER-ROADMAP.md","docs/MODULE-CATALOG.md",
 "docs/QUALITY-AND-RELEASE-GATES.md","docs/REQUIREMENT-TRACEABILITY.md","docs/SECURITY-AND-PERMISSIONS.md",
]

HEAD_RE = re.compile(r"^(## (?:Current|Current implementation traceability) (?:operating checkpoint|checkpoint)?\s*—?\s*)(.*?)(\s*—\s*\d{1,2} [A-Z][a-z]+ \d{4})$")

ID_REPL = [
 ("d82ce3111404ca09b65b890cc83333ae14c1207e", "77a78b7b752d28331dafdc0f4972157faab8ca45"),
 ("3052125e54524ed047e31ed70f1d1ae50c501d92", "77a78b7b752d28331dafdc0f4972157faab8ca45"),
 ("pull/234", "pull/235"),
 ("CI 45260908072", "CI 45277326925"),
 ("runs/45260908072", "runs/45277326925"),
 ("CodeQL 45260907054", "CodeQL 45277326953"),
 ("runs/45260907054", "runs/45277326953"),
 ("`7056075df9b018df798e94ae228449a5e9f72797`", "`9f85eddedd55368241e64988048275700b3c7bab`"),
 ("`71a973beb3ecabffd0652729a34d237f634d5f04`", "`77a78b7b752d28331dafdc0f4972157faab8ca45`"),
 ("CI 45260095700", "CI 45276458181"),
 ("runs/45260095700", "runs/45276458181"),
 ("CodeQL 45260095291", "CodeQL 45276458182"),
 ("runs/45260095291", "runs/45276458182"),
 ("(`feat(p1-10): record an auditable suspension review marker for active holds`, 14 files)",
  "(`feat(p1-10): add a queryable suspension review queue for active holds`, 24 files)"),
 ("on this branch — not merged, not verified on Staging", "merged in PR #235 — automated evidence only, no Staging acceptance"),
 ("on this branch — not merged", "merged in PR #235 — automated evidence only"),
]

SCOPE_OLD_PREFIX = "- **PR #234 scope:**"
SCOPE_NEW = ("- **PR #235 scope:** added the queryable ADR-0018 suspension review queue — nullable "
 "`review_required_at_utc` / `review_completed_at_utc` on `project_sales_reservations` (additive migration "
 "`20261123230000_ProjectSalesReservationReviewQueue`), the partial index "
 "`ix_project_sales_reservations_review_pending`, the constraint `ck_project_sales_reservations_review`, "
 "suspension stamping the request on active holds inside the same transaction, "
 "`GET /api/projects/{projectId}/reservations?reviewRequired=true`, and "
 "`POST /api/projects/{projectId}/reservations/{reservationId}/review` writing "
 "`PROJECT_RESERVATION_REVIEW_COMPLETED` with the reviewer identity. Recording a review changes no status, "
 "unit, expiry, or project state. No UI, authorization, CSRF, or deployment change.")

for rel in DOCS:
    p = Path(rel)
    text = p.read_text(encoding="utf-8")
    idx = text.index("\n## Historical")
    head, rest = text[:idx], text[idx:]
    lines = head.split("\n")
    heading, bullets = lines[0], lines[1:]

    old_heading = heading
    new_heading = heading.replace("PR #234 merged", "PR #235 merged; ADR-0018 suspension review queue implemented", 1)
    assert new_heading != heading or "PR #235" in heading, (rel, heading)

    new_bullets = []
    for b in bullets:
        if b.startswith(SCOPE_OLD_PREFIX):
            new_bullets.append(SCOPE_NEW)
            continue
        line = b
        for a, c in ID_REPL:
            line = line.replace(a, c)
        new_bullets.append(line)

    hist_heading = "## Historical checkpoint — " + old_heading[old_heading.index(" ", 3) + 1:] + " (superseded by PR #235)"
    # strip leading "## Current operating checkpoint — " / "## Current implementation traceability checkpoint — "
    body_old = old_heading.split(" — ", 1)[1] if " — " in old_heading else old_heading
    hist_heading = f"## Historical checkpoint — {body_old} (superseded by PR #235)"

    out = (new_heading + "\n\n" + "\n".join(new_bullets).rstrip("\n") + "\n\n" +
           hist_heading + "\n\n" + "\n".join(bullets).rstrip("\n") + "\n" + rest)
    p.write_text(out, encoding="utf-8")
    print("bumped", rel)
