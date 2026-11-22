#!/usr/bin/env python3
"""Validate selected Arabic JO61 legacy-Wilaya group seat-total cross-checks.

Only six group aggregates are checked against a second secondary text mirror.
No municipality-name identity, row-level equivalence, official-page image
review, Article 124 relationship or practitioner approval is established.
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parents[1] / "docs/reference-data/P1-35-JO61-ANNEX-II-ARABIC-LEGACY-GROUP-SEAT-CHECK-SAMPLE.csv"
SOURCE_URL = "https://jaridabot.com/FTP/jo-arabe/2026/joradp-61-26-Aout-2026.pdf"
EXPECTED = {
    1: ("أدرار", "Adrar", 16, 266),
    29: ("معسكر", "Mascara", 47, 753),
    36: ("الطارف", "El Tarf", 24, 384),
    39: ("الوادي", "El Oued", 22, 414),
    49: ("تيميمون", "Timimoun", 10, 160),
    58: ("المنيعة", "El Meniaa", 3, 55),
}
REQUIRED = {
    "annex_heading_number", "wilaya_title_ar_secondary",
    "wilaya_title_fr_secondary", "reported_final_sequence_number",
    "reported_total_seats_ar_secondary", "reported_total_seats_fr_secondary",
    "secondary_arabic_pdf_url", "secondary_source_line_locator",
    "text_layout_status", "crosscheck_status", "visual_review_status",
    "row_level_crosswalk_status", "legal_commune_identity_status",
    "practitioner_review_status",
}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames is None:
            fail("CSV has no header")
        missing = REQUIRED - set(reader.fieldnames)
        if missing:
            fail(f"missing columns: {sorted(missing)}")
        rows = list(reader)

    if len(rows) != len(EXPECTED):
        fail(f"expected {len(EXPECTED)} sample rows, got {len(rows)}")

    seen: set[int] = set()
    for line, row in enumerate(rows, start=2):
        try:
            number = int(row["annex_heading_number"])
            seq = int(row["reported_final_sequence_number"])
            ar_seats = int(row["reported_total_seats_ar_secondary"])
            fr_seats = int(row["reported_total_seats_fr_secondary"])
        except ValueError as exc:
            fail(f"line {line}: invalid number: {exc}")
        expected = EXPECTED.get(number)
        if expected is None or number in seen:
            fail(f"line {line}: unexpected or duplicate Wilaya heading {number}")
        seen.add(number)
        ar_name, fr_name, expected_seq, expected_seats = expected
        if (row["wilaya_title_ar_secondary"], row["wilaya_title_fr_secondary"], seq, ar_seats) != (
            ar_name, fr_name, expected_seq, expected_seats
        ):
            fail(f"line {line}: Arabic secondary group values differ from the captured evidence")
        if fr_seats != expected_seats or ar_seats != fr_seats:
            fail(f"line {line}: Arabic/French secondary seat totals do not match")
        if row["secondary_arabic_pdf_url"] != SOURCE_URL:
            fail(f"line {line}: unexpected Arabic secondary PDF source")
        if row["crosscheck_status"] != "SEAT_TOTAL_MATCH_SECONDARY_TEXT_ONLY":
            fail(f"line {line}: cross-check state must remain secondary-only")
        if row["visual_review_status"] != "NOT_VISUALLY_REVIEWED":
            fail(f"line {line}: visual-review status must remain not reviewed")
        if row["row_level_crosswalk_status"] != "NO_ROW_LEVEL_FRENCH_ARABIC_CROSSWALK":
            fail(f"line {line}: do not claim row-level crosswalk")
        if row["legal_commune_identity_status"] != "NOT_ADJUDICATED_ARTICLE_124":
            fail(f"line {line}: legal identity must remain unadjudicated")
        if row["practitioner_review_status"] != "PENDING":
            fail(f"line {line}: practitioner review must remain PENDING")

    if seen != set(EXPECTED):
        fail("sample does not contain exactly the six expected Wilaya headings")

    print(
        "P1-35 Arabic legacy sample: six secondary-text group seat totals "
        "match the French secondary group index (1, 29, 36, 39, 49, 58); "
        "no row-level commune crosswalk, official image review, or legal approval."
    )


if __name__ == "__main__":
    main()
