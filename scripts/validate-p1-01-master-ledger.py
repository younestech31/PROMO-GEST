#!/usr/bin/env python3
"""Validate the P1-01 Master 1,541-Commune Reconciliation Ledger.

Asserts structural integrity, exact 1-to-1 bijection across all 1,541 JO44/1985
assertions and all 1,541 candidate working rows, exact cross-register linkage
counts (JO11, JO23, JO79, JO58), 1600 Ville d'Alger separation, 39 transcribed
JO79 Arabic exception rows, and strict preservation of PENDING sign-off status.
"""
from __future__ import annotations

import csv
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "reference-data"
MASTER = DATA / "P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv"
CANDIDATES = DATA / "P1-01-WORKING-CROSSWALK-1541.csv"
JO11 = DATA / "P1-01-JO11-1986-REGISTER-DELTA.csv"
JO23_EXT = DATA / "P1-01-JO23-1998-ALGIERS-BLIDA-BOUMERDES-TIPAZA-REGISTER-EXTRACT.csv"
JO58 = DATA / "P1-01-JO58-REGISTER-EXTRACT-404.csv"
JO79_EX = DATA / "P1-01-JO79-2021-EXISTING-WILAYAS-103-REGISTER-EXTRACT.csv"
JO79_NEW = DATA / "P1-01-JO79-2021-WILAYAS-49-58-59-REGISTER-EXTRACT.csv"
JO79_AR_EXC = DATA / "P1-01-JO79-ARABIC-EXCEPTION-RECONCILIATION.csv"

EXPECTED_ROWS = 1541
EXPECTED_TRIAGE = {
    "SAME_WILAYA_967": 967,
    "DIFFERENT_WILAYA_149": 149,
    "MULTIPLE_CANDIDATE_HITS_63": 63,
    "NO_EXACT_HIT_362": 362,
}
EXPECTED_DECISIONS = {
    "PROPOSED_CLEAN_FOR_SIGNOFF": 1431,
    "EXPLICIT_PRACTITIONER_DECISION_REQUIRED": 110,
}
EXPECTED_PENDING_CODES = {
    "W08-R012": "PENDING_ADJUDICATION_5206_OR_0812",
    "W35-R023": "PENDING_ADJUDICATION_3514_OR_3614",
    "W36-R016": "PENDING_ADJUDICATION_3614_OR_3624",
}


def fail(msg: str) -> None:
    raise SystemExit(f"P1-01 master ledger validation failed: {msg}")


if not MASTER.is_file():
    fail(f"missing master ledger: {MASTER.relative_to(ROOT)}")

with MASTER.open(encoding="utf-8-sig", newline="") as fh:
    rows = list(csv.DictReader(fh))

if len(rows) != EXPECTED_ROWS:
    fail(f"expected {EXPECTED_ROWS} rows in master ledger, found {len(rows)}")

# Verify 1-to-1 bijection with Candidate working crosswalk
with CANDIDATES.open(encoding="utf-8-sig", newline="") as fh:
    cand_keys = {r["working_row_key"] for r in csv.DictReader(fh)}
if len(cand_keys) != EXPECTED_ROWS:
    fail(f"unexpected candidate key count: {len(cand_keys)}")

# Verify 1-to-1 bijection with all 48 JO44 files (excluding 1600 special assertion)
jo44_files = sorted(p for p in DATA.glob("P1-01-JO44-1985-W??-*.csv") if "SPECIAL-ASSERTION" not in p.name)
if len(jo44_files) != 48:
    fail(f"expected 48 JO44 files, found {len(jo44_files)}")

jo44_ids: set[str] = set()
for p in jo44_files:
    with p.open(encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(fh):
            if r["register_code_verbatim"] == "1600":
                fail(f"{p.name}: 1600 Ville d'Alger must not be in the 1,541 commune extracts")
            jo44_ids.add(r["assertion_id"])

if len(jo44_ids) != EXPECTED_ROWS:
    fail(f"unexpected JO44 assertion_id count: {len(jo44_ids)}")

master_cand_keys = [r["working_row_key"] for r in rows]
master_jo44_ids = [r["jo44_assertion_id"] for r in rows]
master_prop_codes = [r["proposed_canonical_code"] for r in rows]

if len(set(master_cand_keys)) != EXPECTED_ROWS or set(master_cand_keys) != cand_keys:
    fail("master ledger working_row_key set is not an exact bijection with P1-01-WORKING-CROSSWALK-1541.csv")

if len(set(master_jo44_ids)) != EXPECTED_ROWS or set(master_jo44_ids) != jo44_ids:
    fail("master ledger jo44_assertion_id set is not an exact bijection with the 1,541 JO44 assertions")

if len(set(master_prop_codes)) != EXPECTED_ROWS:
    dups = {k: v for k, v in Counter(master_prop_codes).items() if v > 1}
    fail(f"duplicate proposed_canonical_code values found: {dups}")

# Verify triage reproduction sums
triage_counts = Counter(r["original_triage_category"] for r in rows)
if dict(triage_counts) != EXPECTED_TRIAGE:
    fail(f"triage breakdown mismatch: {dict(triage_counts)}")

# Keep the report clean-proposal / explicit-review partition reproducible.
decision_counts = Counter(r["decision_class"] for r in rows)
if dict(decision_counts) != EXPECTED_DECISIONS:
    fail(f"decision-class breakdown mismatch: {dict(decision_counts)}")

# Candidate Arabic anomalies and source-code/parent conflicts must never be
# classified as clean proposals for practitioner sign-off.
for r in rows:
    if r["candidate_arabic_anomaly_flag"] != "NONE" and r["decision_class"] != "EXPLICIT_PRACTITIONER_DECISION_REQUIRED":
        fail(f"{r['working_row_key']}: candidate Arabic anomaly cannot be clean for sign-off")
    if r["code_conflict_or_discrepancy_flag"] != "NONE" and r["decision_class"] != "EXPLICIT_PRACTITIONER_DECISION_REQUIRED":
        fail(f"{r['working_row_key']}: source/code discrepancy cannot be clean for sign-off")

# Numeric code proposals and pending adjudication tokens are different values.
pending_codes = {
    r["working_row_key"]: r["proposed_canonical_code"]
    for r in rows if r["proposed_canonical_code"].startswith("PENDING_")
}
if pending_codes != EXPECTED_PENDING_CODES:
    fail(f"pending adjudication code set mismatch: {pending_codes}")
numeric_proposals = [r["proposed_canonical_code"] for r in rows if re.fullmatch(r"\\d{4}", r["proposed_canonical_code"])]
if len(numeric_proposals) != 1538:
    fail(f"expected 1,538 numeric code proposals plus 3 pending tokens, found {len(numeric_proposals)} numeric proposals")

# Verify cross-register counts
jo11_count = sum(1 for r in rows if r["jo11_1986_code"])
jo23_count = sum(1 for r in rows if r["jo23_1998_code"])
jo79_count = sum(1 for r in rows if r["jo79_2021_code"])
jo58_count = sum(1 for r in rows if r["jo58_2026_code"])

with JO11.open(encoding="utf-8-sig", newline="") as fh:
    expected_jo11 = len(list(csv.DictReader(fh)))
with JO23_EXT.open(encoding="utf-8-sig", newline="") as fh:
    expected_jo23 = sum(1 for r in csv.DictReader(fh) if r["counted_in_commune_total"].upper() == "TRUE")
with JO79_EX.open(encoding="utf-8-sig", newline="") as fh:
    expected_jo79_ex = len(list(csv.DictReader(fh)))
with JO79_NEW.open(encoding="utf-8-sig", newline="") as fh:
    expected_jo79_new = len(list(csv.DictReader(fh)))
with JO58.open(encoding="utf-8-sig", newline="") as fh:
    expected_jo58 = len(list(csv.DictReader(fh)))

if jo11_count != expected_jo11:
    fail(f"expected {expected_jo11} JO11 links, found {jo11_count}")
if jo23_count != expected_jo23:
    fail(f"expected {expected_jo23} JO23 links, found {jo23_count}")
if jo79_count != expected_jo79_ex + expected_jo79_new:
    fail(f"expected {expected_jo79_ex + expected_jo79_new} JO79 links, found {jo79_count}")
if jo58_count != expected_jo58:
    fail(f"expected {expected_jo58} JO58 links, found {jo58_count}")

# Verify 39 transcribed rows in JO79 Arabic exception file
with JO79_AR_EXC.open(encoding="utf-8-sig", newline="") as fh:
    ar_exc_rows = list(csv.DictReader(fh))
if len(ar_exc_rows) != 39:
    fail(f"expected 39 JO79 Arabic exception rows, found {len(ar_exc_rows)}")
for idx, r in enumerate(ar_exc_rows, start=2):
    if not r["source_arabic_commune_name_verbatim"].strip():
        fail(f"JO79 Arabic exception line {idx}: missing verbatim Arabic name")
    if r["source_arabic_transcription_status"] != "TRANSCRIBED_FROM_PRIMARY_ARABIC_PNG_PP_15_22":
        fail(f"JO79 Arabic exception line {idx}: unexpected transcription status")
    if r["review_status"] not in {"PENDING_PRACTITIONER_REVIEW", "BLOCKING_PRACTITIONER_ADJUDICATION_REQUIRED"}:
        fail(f"JO79 Arabic exception line {idx}: review_status must remain pending or blocking")
    if r["source_register_code"] == "5206" and r["review_status"] != "BLOCKING_PRACTITIONER_ADJUDICATION_REQUIRED":
        fail("JO79 Arabic exception 5206 Tabelbala must remain BLOCKING_PRACTITIONER_ADJUDICATION_REQUIRED")

# Verify strict sign-off guardrail & conflict preservation
for r in rows:
    if r["practitioner_signoff_status"] != "PENDING":
        fail(f"{r['working_row_key']}: practitioner_signoff_status must remain PENDING")
    if not re.fullmatch(r"\d{4}|PENDING_ADJUDICATION_\d{4}_OR_\d{4}", r["proposed_canonical_code"]):
        fail(f"{r['working_row_key']}: invalid proposed_canonical_code {r['proposed_canonical_code']!r}")
    if r["decision_class"] not in {"PROPOSED_CLEAN_FOR_SIGNOFF", "EXPLICIT_PRACTITIONER_DECISION_REQUIRED"}:
        fail(f"{r['working_row_key']}: invalid decision_class {r['decision_class']!r}")

for blocked_key in ("W35-R023", "W36-R016", "W08-R012"):
    match = next(r for r in rows if r["working_row_key"] == blocked_key)
    if not match["proposed_canonical_code"].startswith("PENDING_ADJUDICATION_"):
        fail(f"{blocked_key}: blocking code/parent conflict must preserve PENDING_ADJUDICATION_* status")
    if match["decision_class"] != "EXPLICIT_PRACTITIONER_DECISION_REQUIRED":
        fail(f"{blocked_key}: blocking conflict must require explicit practitioner decision")

print(
    "P1-01 master ledger validation passed: "
    f"1,541/1,541 bijection (967+149+63+362); JO11={jo11_count}, JO23={jo23_count} (+1600 sep), "
    f"JO79={jo79_count} (103+59, 39 AR exceptions transcribed), JO58={jo58_count}; "
    "zero duplicate codes/keys; all practitioner_signoff_status=PENDING."
)
