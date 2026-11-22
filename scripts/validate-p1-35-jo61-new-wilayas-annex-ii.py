#!/usr/bin/env python3
"""Validate a bounded secondary-text extraction of JO61 Annex II for W59-W69.

This validator checks row counts, per-Wilaya seat totals, source-state labels,
and the preservation of two secondary transcription variants. It does not
verify the official PDF page images, extract Arabic rows, decide Article 124
interpretation, or approve any legal commune identity/parentage.
"""
from __future__ import annotations

import csv
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/reference-data/P1-35-JO61-ANNEX-II-NEW-WILAYAS-108-SECONDARY-EXTRACT.csv"

EXPECTED_ROWS = {
    "59": 12, "60": 8, "61": 5, "62": 4, "63": 4,
    "64": 6, "65": 10, "66": 8, "67": 21, "68": 23, "69": 7,
}
EXPECTED_SEATS = {
    "59": 186, "60": 140, "61": 71, "62": 74, "63": 58,
    "64": 106, "65": 184, "66": 138, "67": 325, "68": 369, "69": 97,
}
EXPECTED_VARIANTS = {
    ("64", "Hammadia"): ("Hamadia", "SECONDARY_TRANSCRIPTION_VARIANTS_HAMMADIA_HAMADIA"),
    ("67", "El Ouin et"): ("El Ouinet", "SECONDARY_TRANSCRIPTION_VARIANTS_EL_OUIN_ET_EL_OUINET"),
}
REQUIRED = {
    "decree", "annex", "current_wilaya_code", "wilaya_fr_jo61_heading",
    "jo61_constituency_sequence", "jo61_constituency_name_fr_verbatim",
    "jo61_seats_to_fill", "jo61_source_printed_page", "jo61_source_locator_status",
    "jo61_secondary_transcription_source", "jo61_official_source_url",
    "jo61_official_arabic_source_url", "jo61_source_visual_status",
    "jo61_arabic_annex_ii_transcription_status", "jo58_commune_name_fr",
    "jo58_current_register_code", "jo58_administrative_seat_fr", "jo58_printed_page",
    "jo58_pdf_sha256", "jo58_practitioner_review_status", "jo58_effective_date",
    "normalized_name_crosswalk_status", "crosswalk_mapping_basis",
    "legal_commune_identity_status", "jo61_alternative_secondary_transcription_fr",
    "jo61_variant_status",
}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    with SOURCE.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        fields = set(reader.fieldnames or [])
        if not REQUIRED.issubset(fields):
            fail(f"missing required fields: {sorted(REQUIRED - fields)}")
        rows = list(reader)

    if len(rows) != 108:
        fail(f"expected 108 rows, found {len(rows)}")

    group_counts = Counter(row["current_wilaya_code"] for row in rows)
    if dict(group_counts) != EXPECTED_ROWS:
        fail(f"unexpected row counts by Wilaya: {dict(group_counts)}")

    group_seats: dict[str, int] = defaultdict(int)
    sequences: dict[str, set[str]] = defaultdict(set)
    jo58_codes: set[str] = set()
    direct_matches = 0
    pending_variants = set()

    for line_no, row in enumerate(rows, start=2):
        wilaya = row["current_wilaya_code"]
        name = row["jo61_constituency_name_fr_verbatim"]
        key = (wilaya, name)
        seats = row["jo61_seats_to_fill"]

        if row["decree"] != "Executive Decree 26-282 / JO61/2026":
            fail(f"line {line_no}: unexpected decree label")
        if row["annex"] != "Annex II — APC electoral constituencies and seats":
            fail(f"line {line_no}: unexpected annex label")
        if not seats.isdigit() or int(seats) not in {13, 15, 19, 23, 33}:
            fail(f"line {line_no}: unexpected seat count {seats!r}")
        group_seats[wilaya] += int(seats)

        sequence = row["jo61_constituency_sequence"]
        if sequence in sequences[wilaya]:
            fail(f"line {line_no}: duplicate constituency sequence {wilaya}/{sequence}")
        sequences[wilaya].add(sequence)

        jo58_code = row["jo58_current_register_code"]
        if len(jo58_code) != 4 or not jo58_code.isdigit() or jo58_code[:2] != wilaya:
            fail(f"line {line_no}: JO58 current code does not match Wilaya prefix")
        if jo58_code in jo58_codes:
            fail(f"line {line_no}: duplicate JO58 current code {jo58_code}")
        jo58_codes.add(jo58_code)

        if row["jo61_official_source_url"] != "https://www.joradp.dz/FTP/jo-francais/2026/F2026061.pdf":
            fail(f"line {line_no}: unexpected official French source URL")
        if row["jo61_official_arabic_source_url"] != "https://www.joradp.dz/FTP/jo-arabe/2026/A2026061.pdf":
            fail(f"line {line_no}: unexpected official Arabic source URL")
        if row["jo61_source_visual_status"] != "NOT_VISUALLY_REVIEWED_OFFICIAL_PDF_CACHE_MISS":
            fail(f"line {line_no}: must not overstate official PDF visual review")
        if row["jo61_arabic_annex_ii_transcription_status"] != "NOT_EXTRACTED":
            fail(f"line {line_no}: Arabic extraction state must remain NOT_EXTRACTED")
        if row["jo58_practitioner_review_status"] != "PENDING" or row["jo58_effective_date"]:
            fail(f"line {line_no}: practitioner review/effective date must remain pending")
        if row["legal_commune_identity_status"] != "NOT_ADJUDICATED":
            fail(f"line {line_no}: legal commune identity must remain unadjudicated")

        variant = row["jo61_variant_status"]
        if key in EXPECTED_VARIANTS:
            alt_name, expected_status = EXPECTED_VARIANTS[key]
            if row["jo61_alternative_secondary_transcription_fr"] != alt_name or variant != expected_status:
                fail(f"line {line_no}: secondary transcription variant was not preserved")
            if row["normalized_name_crosswalk_status"] != "PENDING_SECONDARY_SOURCE_VARIANT":
                fail(f"line {line_no}: variant row must remain pending")
            pending_variants.add(key)
        else:
            if row["jo61_alternative_secondary_transcription_fr"]:
                fail(f"line {line_no}: unexpected alternative secondary transcription")
            if variant != "NO_VARIANT_REPORTED_IN_CAPTURED_EXCERPT":
                fail(f"line {line_no}: unexpected variant status")
            if row["normalized_name_crosswalk_status"] != "MATCHED_NORMALIZED":
                fail(f"line {line_no}: direct normalized match status changed")
            direct_matches += 1

        if wilaya in {"59", "60"}:
            if row["jo61_source_printed_page"] != "NOT_PINNED_IN_EXCERPT" or row["jo61_source_locator_status"] != "PAGE_NOT_PINNED":
                fail(f"line {line_no}: do not invent the page locator for Wilayas 59/60")
        elif wilaya in {"61", "62", "63", "64", "65", "66"}:
            if row["jo61_source_printed_page"] != "33":
                fail(f"line {line_no}: expected secondary printed-page locator 33")
        elif wilaya in {"67", "68", "69"}:
            if row["jo61_source_printed_page"] != "34":
                fail(f"line {line_no}: expected secondary printed-page locator 34")

    if dict(group_seats) != EXPECTED_SEATS:
        fail(f"unexpected APC seat totals by Wilaya: {dict(group_seats)}")
    if sum(group_seats.values()) != 1748:
        fail(f"expected 1,748 seats in this bounded excerpt, got {sum(group_seats.values())}")
    if direct_matches != 106 or pending_variants != set(EXPECTED_VARIANTS):
        fail(f"expected 106 direct name matches + 2 pending variants; got {direct_matches}, {pending_variants}")
    if len(jo58_codes) != 108:
        fail("expected 108 unique JO58 code crosswalks")

    print(
        "P1-35 bounded JO61 Annex II extraction: 108 rows across 11 new Wilayas, "
        "1,748 electoral seats, 106 direct normalized French-name matches, "
        "2 preserved secondary-transcription variants. Official PDF visual "
        "review and Arabic Annex II transcription remain incomplete; no legal "
        "commune identity or parentage is approved."
    )


if __name__ == "__main__":
    main()
