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
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/reference-data/P1-35-JO61-ANNEX-II-NEW-WILAYAS-108-SECONDARY-EXTRACT.csv"
ARABIC_SOURCE = ROOT / "docs/reference-data/P1-35-JO61-ANNEX-II-NEW-WILAYAS-108-ARABIC-SECONDARY-TRANSCRIPTION.csv"

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
EXPECTED_ARABIC_ROWS = EXPECTED_ROWS
EXPECTED_ARABIC_SEATS = EXPECTED_SEATS
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


def normalize_name(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = value.replace("’", "'").replace("‘", "'").replace("`", "'")
    value = value.casefold()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", value).split())


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
            if normalize_name(alt_name) != normalize_name(row["jo58_commune_name_fr"]):
                fail(f"line {line_no}: alternative secondary text does not match JO58 normalized label")
            pending_variants.add(key)
        else:
            if row["jo61_alternative_secondary_transcription_fr"]:
                fail(f"line {line_no}: unexpected alternative secondary transcription")
            if variant != "NO_VARIANT_REPORTED_IN_CAPTURED_EXCERPT":
                fail(f"line {line_no}: unexpected variant status")
            if row["normalized_name_crosswalk_status"] != "MATCHED_NORMALIZED":
                fail(f"line {line_no}: direct normalized match status changed")
            if normalize_name(name) != normalize_name(row["jo58_commune_name_fr"]):
                fail(f"line {line_no}: direct French-name match does not normalize equally")
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

    arabic_required = {
        "current_wilaya_code", "jo61_constituency_sequence",
        "jo61_constituency_name_ar_secondary_verbatim",
        "jo61_seats_to_fill_fr_secondary", "jo61_seats_to_fill_ar_secondary",
        "jo61_secondary_transcription_source", "jo61_secondary_source_url",
        "jo61_source_page_locator", "jo61_page_locator_type",
        "jo61_official_arabic_pdf_url", "jo61_official_pdf_visual_review_status",
        "jo61_arabic_transcription_status", "jo61_french_constituency_name_secondary",
        "jo58_current_french_register_name", "jo58_current_register_code",
        "jo58_administrative_seat_fr", "jo58_practitioner_review_status",
        "jo58_effective_date", "crosswalk_basis", "legal_commune_identity_status",
    }
    with ARABIC_SOURCE.open("r", encoding="utf-8-sig", newline="") as stream:
        arabic_reader = csv.DictReader(stream)
        arabic_fields = set(arabic_reader.fieldnames or [])
        if not arabic_required.issubset(arabic_fields):
            fail(f"Arabic sidecar missing required fields: {sorted(arabic_required - arabic_fields)}")
        arabic_rows = list(arabic_reader)

    if len(arabic_rows) != 108:
        fail(f"expected 108 Arabic secondary records, found {len(arabic_rows)}")
    arabic_counts = Counter(row["current_wilaya_code"] for row in arabic_rows)
    if dict(arabic_counts) != EXPECTED_ARABIC_ROWS:
        fail(f"unexpected Arabic-record coverage by Wilaya: {dict(arabic_counts)}")

    french_by_key = {
        (row["current_wilaya_code"], row["jo61_constituency_sequence"]): row
        for row in rows
    }
    arabic_keys: set[tuple[str, str]] = set()
    arabic_seats: dict[str, int] = defaultdict(int)
    for index, row in enumerate(arabic_rows, start=2):
        key = (row["current_wilaya_code"], row["jo61_constituency_sequence"])
        if key in arabic_keys:
            fail(f"Arabic sidecar line {index}: duplicate Wilaya/sequence key {key}")
        arabic_keys.add(key)
        french = french_by_key.get(key)
        if french is None:
            fail(f"Arabic sidecar line {index}: no French row for key {key}")
        if row["jo61_seats_to_fill_fr_secondary"] != french["jo61_seats_to_fill"]:
            fail(f"Arabic sidecar line {index}: independent French seat reading differs from French row")
        if not row["jo61_seats_to_fill_ar_secondary"].isdigit():
            fail(f"Arabic sidecar line {index}: invalid Arabic-source seat count")
        if row["jo61_seats_to_fill_ar_secondary"] != row["jo61_seats_to_fill_fr_secondary"]:
            fail(f"Arabic sidecar line {index}: Arabic and French source seat counts differ")
        arabic_seats[key[0]] += int(row["jo61_seats_to_fill_ar_secondary"])
        if row["jo61_french_constituency_name_secondary"] != french["jo61_constituency_name_fr_verbatim"]:
            fail(f"Arabic sidecar line {index}: French secondary text changed")
        if row["jo58_current_register_code"] != french["jo58_current_register_code"]:
            fail(f"Arabic sidecar line {index}: JO58 current code differs from French crosswalk")
        if row["jo61_source_page_locator"] != "NOT_PINNED_IN_SEARCH_EXCERPT" or row["jo61_page_locator_type"] != "NOT_PINNED_SECONDARY_SEARCH_RESULT":
            fail(f"Arabic sidecar line {index}: do not invent printed-page locators")
        if row["jo61_official_pdf_visual_review_status"] != "NOT_VISUALLY_REVIEWED_CACHE_MISS":
            fail(f"Arabic sidecar line {index}: cannot overstate official Arabic PDF visual review")
        if not any("\u0600" <= char <= "\u06ff" for char in row["jo61_constituency_name_ar_secondary_verbatim"]):
            fail(f"Arabic sidecar line {index}: Arabic transcription field is empty or not Arabic script")
        if row["jo61_arabic_transcription_status"] != "SECONDARY_TEXT_CAPTURED_NOT_OFFICIAL_IMAGE_VERIFIED":
            fail(f"Arabic sidecar line {index}: incorrect Arabic evidence classification")
        if row["jo58_practitioner_review_status"] != "PENDING" or row["jo58_effective_date"]:
            fail(f"Arabic sidecar line {index}: practitioner/effective-date guard changed")
        if row["legal_commune_identity_status"] != "NOT_ADJUDICATED":
            fail(f"Arabic sidecar line {index}: legal identity must remain unadjudicated")

    all_annex_keys = set(french_by_key)
    missing_arabic = all_annex_keys - arabic_keys
    if missing_arabic:
        fail(f"Arabic secondary transcription has missing Wilaya/sequence keys: {sorted(missing_arabic)}")
    if dict(arabic_seats) != EXPECTED_ARABIC_SEATS:
        fail(f"unexpected Arabic secondary-record seat totals: {dict(arabic_seats)}")
    if sum(arabic_seats.values()) != 1748:
        fail(f"expected 1,748 Arabic-source seat readings, got {sum(arabic_seats.values())}")

    print(
        "P1-35 bounded JO61 Annex II extraction: 108 French-secondary rows across 11 new Wilayas, "
        "1,748 electoral seats, 106 direct normalized French-name matches, "
        "2 preserved French secondary-transcription variants; Arabic secondary "
        "text is captured for 108/108 rows with separate Arabic/French seat values "
        "matching 108/108 (1,748 seats); no Arabic printed-page locators are asserted. Official PDF "
        "visual review remains incomplete; no legal commune identity or parentage is approved."
    )


if __name__ == "__main__":
    main()
