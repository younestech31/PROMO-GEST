#!/usr/bin/env python3
"""Validate a bounded secondary-source group index for JO61 Annex II W01-W58.

This is a coverage/aggregate-control artifact only. It is not a row-level
transcription, bilingual validation, official-image review, legal commune
identity decision, practitioner approval, or import dataset.
"""
from __future__ import annotations

import csv
import sys
from collections import Counter
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parents[1] / "docs/reference-data/P1-35-JO61-ANNEX-II-LEGACY-WILAYA-GROUP-INDEX-01-58.csv"
SOURCE_URL = "https://kanonix.app/journals/b0e6f98d-a4f7-43aa-9085-f9ed002b33c9/pdf?download=1"
EXPECTED_SEAT_TOTAL = 24827
EXPECTED_END_SEQUENCE_SUM = 1433
REQUIRED_COLUMNS = {
    "annex_heading_number",
    "wilaya_title_fr_secondary",
    "reported_final_sequence_number",
    "reported_total_seats",
    "secondary_text_source_url",
    "secondary_text_source_type",
    "secondary_source_line_locator",
    "secondary_printed_page_locator",
    "sequence_coverage_status",
    "visual_review_status",
    "arabic_crosscheck_status",
    "legal_commune_identity_status",
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
        missing = REQUIRED_COLUMNS - set(reader.fieldnames)
        if missing:
            fail(f"missing CSV columns: {sorted(missing)}")
        records = list(reader)

    if len(records) != 58:
        fail(f"expected 58 legacy Wilaya group records, got {len(records)}")

    numbers: list[int] = []
    end_sequences: list[int] = []
    seats: list[int] = []
    titles: list[str] = []
    for line, row in enumerate(records, start=2):
        try:
            number = int(row["annex_heading_number"])
            final_sequence = int(row["reported_final_sequence_number"])
            seat_total = int(row["reported_total_seats"])
        except ValueError as exc:
            fail(f"line {line}: invalid integer field: {exc}")
        numbers.append(number)
        end_sequences.append(final_sequence)
        seats.append(seat_total)
        titles.append(row["wilaya_title_fr_secondary"].strip())
        if not 1 <= number <= 58:
            fail(f"line {line}: heading number outside 1..58: {number}")
        if not titles[-1]:
            fail(f"line {line}: empty secondary Wilaya heading")
        if final_sequence < 1 or seat_total < 1:
            fail(f"line {line}: non-positive sequence or seat total")
        if row["secondary_text_source_url"] != SOURCE_URL:
            fail(f"line {line}: unexpected secondary source URL")
        if row["secondary_text_source_type"] != "SECONDARY_INDEXED_FRENCH_TEXT_MIRROR":
            fail(f"line {line}: source must remain classified as secondary")
        if row["secondary_source_line_locator"] != "NOT_PINNED":
            fail(f"line {line}: unverified line locator must remain unpinned")
        if row["secondary_printed_page_locator"] != "NOT_PINNED":
            fail(f"line {line}: unverified printed-page locator must remain unpinned")
        if row["sequence_coverage_status"] != "FINAL_SEQUENCE_CAPTURED_NOT_EVERY_ROW_RECOUNTED":
            fail(f"line {line}: must not overstate row-level sequence coverage")
        if row["visual_review_status"] != "NOT_VISUALLY_REVIEWED_SECONDARY_SOURCE":
            fail(f"line {line}: secondary source must not be called visually reviewed")
        if row["arabic_crosscheck_status"] != "NOT_EXTRACTED_IN_THIS_SLICE":
            fail(f"line {line}: Arabic row-level cross-check not performed in this slice")
        if row["legal_commune_identity_status"] != "NOT_ADJUDICATED_ARTICLE_124":
            fail(f"line {line}: legal commune identity not adjudicated")
        if row["practitioner_review_status"] != "PENDING":
            fail(f"line {line}: practitioner review must remain PENDING")

    number_counts = Counter(numbers)
    expected = set(range(1, 59))
    if set(numbers) != expected or any(count != 1 for count in number_counts.values()):
        fail("Annex II heading numbers must be present exactly once for 1..58")
    if len(set(titles)) != 58:
        fail("secondary Wilaya heading names must be unique in this bounded index")
    if sum(end_sequences) != EXPECTED_END_SEQUENCE_SUM:
        fail(f"expected ending-sequence index sum {EXPECTED_END_SEQUENCE_SUM}, got {sum(end_sequences)}")
    if sum(seats) != EXPECTED_SEAT_TOTAL:
        fail(f"expected 24,827 reported seats, got {sum(seats)}")

    print(
        "P1-35 legacy group index: 58/58 Annex II headings (01-58); "
        "sum of reported final sequence numbers=1,433 (not independently recounted rows); "
        "reported APC seats=24,827. All records remain secondary text, "
        "not visually reviewed, Arabic row cross-check not done in this slice, "
        "legal identity not adjudicated, practitioner review PENDING."
    )


if __name__ == "__main__":
    main()
