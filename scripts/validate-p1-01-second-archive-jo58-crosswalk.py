#!/usr/bin/env python3
"""Validate the artifact-specific 108-row JO58 code-lineage crosswalk.

This checks row mapping and source-state invariants only. It does not approve
legal identity, code-effective dates, practitioner sign-off, or data import.
"""
from __future__ import annotations

import csv
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/reference-data/P1-01-SECOND-ARCHIVE-JO58-108-COMMUNE-CODE-CROSSWALK.csv"
EXPECTED_ARCHIVE_SHA = "bd8ae8914b1d08cf4ab06c3e01158d9880d7c2c6c811cf4ea756272f0d92fa81"
EXPECTED_JO58_PDF_SHA = "6a1e59f7c0e8396115657c6376dabeb3fa07543ac8a7036ee3003af6a415aad6"
EXPECTED_GROUP_COUNTS = {
    "59": 12, "60": 8, "61": 5, "62": 4, "63": 4,
    "64": 6, "65": 10, "66": 8, "67": 21, "68": 23, "69": 7,
}
REQUIRED = {
    "archive_sha256", "archive_data_version", "current_wilaya_code",
    "commune_name_fr_archive", "archive_legacy_code", "former_wilaya_code",
    "law_26_06_article", "archive_previous_codes_count", "jo58_commune_name_fr",
    "jo58_current_register_code", "jo58_administrative_seat_fr",
    "jo58_printed_page", "jo58_official_journal", "jo58_order_date",
    "jo58_publication_date", "jo58_source_language",
    "jo58_fr_visual_review_status", "jo58_ar_visual_review_status",
    "jo58_pdf_sha256", "jo58_practitioner_review_status",
    "jo58_effective_date", "normalized_fr_name_match_status",
}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    with SOURCE.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        fields = set(reader.fieldnames or [])
        if not REQUIRED.issubset(fields):
            fail(f"missing fields: {sorted(REQUIRED - fields)}")
        rows = list(reader)

    if len(rows) != 108:
        fail(f"expected 108 rows, found {len(rows)}")

    if len({r["archive_legacy_code"] for r in rows}) != 108:
        fail("archive legacy codes must be unique")
    if len({r["jo58_current_register_code"] for r in rows}) != 108:
        fail("JO58 current register codes must be unique")
    if len({r["commune_name_fr_archive"] for r in rows}) != 108:
        fail("archive French commune names must be unique")

    groups = Counter(r["current_wilaya_code"] for r in rows)
    if dict(groups) != EXPECTED_GROUP_COUNTS:
        fail(f"unexpected per-Wilaya counts: {dict(groups)}")

    for index, row in enumerate(rows, start=2):
        current = row["current_wilaya_code"]
        former = row["former_wilaya_code"]
        old_code = row["archive_legacy_code"]
        current_code = row["jo58_current_register_code"]

        if row["archive_sha256"] != EXPECTED_ARCHIVE_SHA:
            fail(f"row {index}: wrong archive fingerprint")
        if row["archive_data_version"] != "2026-11-21":
            fail(f"row {index}: unexpected archive data version")
        if len(old_code) != 4 or not old_code.isdigit():
            fail(f"row {index}: invalid archive four-digit code")
        if len(current_code) != 4 or not current_code.isdigit():
            fail(f"row {index}: invalid JO58 four-digit code")
        if old_code[:2] != former:
            fail(f"row {index}: legacy code prefix does not match former Wilaya")
        if old_code[:2] == current:
            fail(f"row {index}: legacy code unexpectedly uses current Wilaya prefix")
        if current_code[:2] != current:
            fail(f"row {index}: JO58 current code prefix does not match current Wilaya")
        if old_code == current_code:
            fail(f"row {index}: legacy code equals JO58 current code")
        if row["archive_previous_codes_count"] != "0":
            fail(f"row {index}: expected empty archive previous_codes array")
        if row["normalized_fr_name_match_status"] != "MATCHED_NORMALIZED":
            fail(f"row {index}: name crosswalk is not a normalized match")
        if row["jo58_official_journal"] != "JO 58/2026":
            fail(f"row {index}: wrong official-journal identifier")
        if row["jo58_pdf_sha256"] != EXPECTED_JO58_PDF_SHA:
            fail(f"row {index}: JO58 source PDF hash differs from pinned extract")
        if row["jo58_fr_visual_review_status"] != "PNG_IMAGE_VISUALLY_REVIEWED_PP_9_25":
            fail(f"row {index}: French page visual state changed")
        if row["jo58_ar_visual_review_status"] != "ARABIC_PNG_IMAGES_REVIEWED_PP_9_25":
            fail(f"row {index}: Arabic page visual state changed")
        if row["jo58_practitioner_review_status"] != "PENDING":
            fail(f"row {index}: practitioner review must remain pending")
        if row["jo58_effective_date"]:
            fail(f"row {index}: effective date must remain blank")

    print(
        "P1-01 second archive / JO58 crosswalk: 108 rows, 11 Wilaya groups, "
        "108 unique legacy codes, 108 unique JO58 codes, 108 normalized name "
        "matches; legacy prefixes=former Wilayas, current prefixes=JO58 only; "
        "all practitioner reviews pending and effective dates blank. "
        "No legal approval or import is implied."
    )


if __name__ == "__main__":
    main()
