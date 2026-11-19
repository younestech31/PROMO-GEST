#!/usr/bin/env python3
"""Validate all JO44/1985 French text-layer source workpapers.

Structural consistency only: this does not approve legal identity, current validity,
Arabic pairing, page-image verification, or database import.
"""
from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "reference-data"
CONTROL = DATA / "P1-01-JO44-1985-48-WILAYA-CONTROL.csv"
EXPECTED_TOTAL = 1541
EXPECTED_FIELDS = [
    "assertion_id", "source_instrument", "official_journal_number",
    "instrument_date", "publication_date", "wilaya_code_verbatim",
    "wilaya_name_fr_verbatim", "declared_commune_count", "row_order_in_wilaya",
    "commune_name_fr_verbatim", "register_code_verbatim",
    "administrative_seat_fr_verbatim", "printed_page", "official_pdf_url",
    "official_pdf_sha256", "extraction_method", "french_text_layer_status",
    "french_visual_status", "arabic_source_pair_status", "candidate_join_status",
    "current_legal_effective_status", "qualified_practitioner_status",
    "technical_disposition", "notes",
]
EXPECTED_PDF = "https://www.joradp.dz/FTP/jo-francais/1985/F1985044.PDF"
EXPECTED_SHA256 = "bc9f42cbf3d7bb1fc576383ea8d7194d6ae7a06945003b5ede31581e9a48daf2"


def fail(message: str) -> None:
    raise SystemExit(f"JO44 reference validation failed: {message}")


with CONTROL.open(encoding="utf-8-sig", newline="") as handle:
    reader = csv.DictReader(handle)
    if reader.fieldnames is None:
        fail("control file has no header")
    controls = list(reader)

if len(controls) != 48:
    fail(f"expected 48 Wilaya control rows, found {len(controls)}")
wilaya_codes = [f"{number:02d}" for number in range(1, 49)]
if [row["wilaya_code_1985"] for row in controls] != wilaya_codes:
    fail("control must contain Wilaya codes 01–48 exactly once in numeric order")

declared_total = sum(int(row["declared_commune_count_jo44"]) for row in controls)
if declared_total != EXPECTED_TOTAL:
    fail(f"48 declared heading counts sum to {declared_total}, expected {EXPECTED_TOTAL}")

extracted_total = 0
for code, control in zip(wilaya_codes, controls, strict=True):
    declared = int(control["declared_commune_count_jo44"])
    matches = sorted(
        path for path in DATA.glob(f"P1-01-JO44-1985-W{code}-*.csv")
        if "SPECIAL-ASSERTION" not in path.name
    )
    if len(matches) != 1:
        fail(f"W{code}: expected exactly one commune extract; found {[p.name for p in matches]}")
    path = matches[0]
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != EXPECTED_FIELDS:
            fail(f"W{code}: the 24-column source assertion schema differs")
        rows = list(reader)

    if len(rows) != declared:
        fail(f"W{code}: {len(rows)} extracted rows, heading declares {declared}")
    if int(control["jo44_rows_extracted_current_repo"]) != len(rows):
        fail(f"W{code}: control count does not match the extracted CSV")
    if control["control_status"] == "NOT_EXTRACTED":
        fail(f"W{code}: control still marks a populated extract as NOT_EXTRACTED")
    extracted_total += len(rows)

    expected_ids = [f"JO44-1985-W{code}-{i:02d}" for i in range(1, declared + 1)]
    ids = [row["assertion_id"] for row in rows]
    if ids != expected_ids or len(set(ids)) != declared:
        fail(f"W{code}: assertion IDs/order are missing, duplicated, or non-contiguous")

    for index, row in enumerate(rows, start=1):
        if row["wilaya_code_verbatim"] != code:
            fail(f"W{code} row {index}: Wilaya code mismatch")
        if int(row["declared_commune_count"]) != declared:
            fail(f"W{code} row {index}: declared count mismatch")
        if row["row_order_in_wilaya"] != str(index):
            fail(f"W{code} row {index}: row-order mismatch")
        printed_code = row["register_code_verbatim"]
        if len(printed_code) != 4 or not printed_code.startswith(code):
            fail(f"W{code} row {index}: malformed register code {printed_code!r}")
        if not row["commune_name_fr_verbatim"].strip() or not row["administrative_seat_fr_verbatim"].strip():
            fail(f"W{code} row {index}: empty commune/seat source value")
        if not row["printed_page"].strip():
            fail(f"W{code} row {index}: printed-page provenance missing")
        if row["official_pdf_url"] != EXPECTED_PDF:
            fail(f"W{code} row {index}: official PDF URL mismatch")
        if row["official_pdf_sha256"] != EXPECTED_SHA256 or len(row["official_pdf_sha256"]) != 64:
            fail(f"W{code} row {index}: official PDF SHA-256 is missing, truncated, or differs from the source control")
        if row["french_text_layer_status"] != "EXTRACTED":
            fail(f"W{code} row {index}: text-layer status is not EXTRACTED")
        if row["technical_disposition"] != "HISTORICAL_SOURCE_ASSERTION_ONLY_NOT_APPROVED":
            fail(f"W{code} row {index}: a historical row is incorrectly marked approved")
        if not row["current_legal_effective_status"].startswith("PENDING"):
            fail(f"W{code} row {index}: current-validity/effective-date review must remain pending")
        if row["qualified_practitioner_status"] != "PENDING":
            fail(f"W{code} row {index}: practitioner sign-off must remain pending")
        if not row["arabic_source_pair_status"].startswith(("NOT_REVIEWED", "PARTIAL_PRIOR", "PENDING")):
            fail(f"W{code} row {index}: Arabic source pairing must remain pending")

    printed_codes = [row["register_code_verbatim"] for row in rows]
    if code == "36":
        # Preserve, and explicitly test, the French text-layer duplicate 3624
        # for Chihani/Raml Souk and the absent 3614. Never silently repair it.
        if printed_codes.count("3624") != 2 or "3614" in printed_codes:
            fail("W36: expected duplicate 3624 and absent 3614 are not preserved")
        duplicated_names = sorted(
            row["commune_name_fr_verbatim"] for row in rows
            if row["register_code_verbatim"] == "3624"
        )
        if duplicated_names != ["Chihani", "Raml Souk"]:
            fail(f"W36: unexpected rows assigned printed code 3624: {duplicated_names}")
        expected_set = {f"36{i:02d}" for i in range(1, 25)} - {"3614"}
        if set(printed_codes) != expected_set or len(set(printed_codes)) != 23:
            fail("W36: preserved code set differs from the documented French source anomaly")
    else:
        expected_codes = [f"{code}{i:02d}" for i in range(1, declared + 1)]
        if printed_codes != expected_codes:
            fail(f"W{code}: printed codes are not the expected contiguous sequence")

if extracted_total != EXPECTED_TOTAL:
    fail(f"all extracted CSVs sum to {extracted_total}, expected {EXPECTED_TOTAL}")

print(
    f"JO44/1985 workpaper consistency passed: 48/48 sections and "
    f"{extracted_total}/{EXPECTED_TOTAL} historical French text-layer rows; "
    "W36 duplicate-code exception preserved; approval remains pending."
)
