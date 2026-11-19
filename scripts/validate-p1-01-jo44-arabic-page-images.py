#!/usr/bin/env python3
"""Validate the JO44/1985 Arabic primary-image map.

This proves that every master-ledger assertion is assigned to a committed Arabic
page image and that the 48 printed Wilaya header counts reconcile to the 1,541
source rows. It deliberately does NOT claim that every Arabic row has been
transcribed or that every bilingual identity has been legally adjudicated.
"""
from __future__ import annotations

import csv
import hashlib
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "reference-data"
TMP = ROOT / ".tmp-joradp"

MASTER = DATA / "P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv"
MANIFEST = DATA / "P1-01-JO44-ARABIC-IMAGE-PAGE-MANIFEST-29.csv"
ROW_MAP = DATA / "P1-01-JO44-ARABIC-IMAGE-ROW-MAP-1541.csv"
COUNT_CONTROL = DATA / "P1-01-JO44-ARABIC-WILAYA-COUNT-CONTROL-48.csv"

EXPECTED_COUNTS = [
    28, 35, 24, 29, 61, 52, 33, 21, 29, 45, 10, 28,
    53, 42, 67, 33, 36, 28, 60, 16, 38, 52, 12, 34,
    12, 64, 32, 47, 47, 21, 26, 22, 6, 34, 38, 24,
    2, 22, 30, 21, 26, 42, 32, 36, 12, 28, 13, 38,
]
EXPECTED_HEADER_PAGES = [
    12, 13, 14, 14, 15, 16, 17, 17, 18, 18, 19, 19,
    20, 20, 21, 22, 23, 24, 24, 25, 26, 26, 27, 27,
    28, 28, 29, 30, 31, 32, 32, 32, 33, 33, 34, 34,
    35, 35, 36, 36, 37, 37, 38, 38, 39, 39, 40, 40,
]
EXPECTED_DUPLICATE_SOURCE_CODES = {
    "3624": ["JO44-1985-W36-14", "JO44-1985-W36-24"],
}
EXPECTED_SPECIAL = "1600 (Ville d'Alger; separately preserved; excluded from 1,541 communes)"
EXPECTED_ROW_STATUS = "PAGE_IMAGE_MAPPED_NOT_ROW_TRANSCRIBED"
EXPECTED_PAGE_STATUS = "PAGE_VISUALLY_INSPECTED; ROW_LEVEL_TRANSCRIPTION_NOT_COMPLETED"
EXPECTED_LOCATOR_BASIS = "LEDGER_SOURCE_CODE_POSITION_RANGE_NOT_ARABIC_ROW_TRANSCRIPTION"
EXPECTED_VISIBLE_PRINT_EXCEPTION_PAGES = {22, 35, 36, 37, 38}


def fail(message: str) -> None:
    raise SystemExit(f"JO44 Arabic page-image validation failed: {message}")


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.is_file():
        fail(f"missing CSV: {path.relative_to(ROOT)}")
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def git_blob_sha1(payload: bytes) -> str:
    header = f"blob {len(payload)}\0".encode("ascii")
    return hashlib.sha1(header + payload).hexdigest()


def parse_ranges(text: str, page_index: int) -> list[str]:
    codes: list[str] = []
    for part in text.split(";"):
        match = re.fullmatch(r"(\d{4})-(\d{4})", part.strip())
        if not match:
            fail(f"page {page_index}: malformed code range {part!r}")
        start, end = map(int, match.groups())
        if start > end:
            fail(f"page {page_index}: descending code range {part!r}")
        codes.extend(f"{value:04d}" for value in range(start, end + 1))
    if len(codes) != len(set(codes)):
        fail(f"page {page_index}: duplicate code within its ranges")
    return codes


master = read_csv(MASTER)
manifest = read_csv(MANIFEST)
row_map = read_csv(ROW_MAP)
count_rows = read_csv(COUNT_CONTROL)

if len(master) != 1541:
    fail(f"expected 1,541 master rows, found {len(master)}")
if len(manifest) != 29:
    fail(f"expected 29 Arabic page images, found {len(manifest)}")
if len(row_map) != 1541:
    fail(f"expected 1,541 row-page mappings, found {len(row_map)}")
if len(count_rows) != 48:
    fail(f"expected 48 Wilaya count-control rows, found {len(count_rows)}")

# Validate the committed page-image set, sequence and actual Git blob identities.
manifest_by_index: dict[int, dict[str, str]] = {}
code_to_page: dict[str, int] = {}
range_total = 0
for item in manifest:
    try:
        page_index = int(item["pdf_page_index"])
        printed_page = int(item["arabic_printed_page_number"])
        range_count = int(item["range_row_count"])
    except (KeyError, ValueError):
        fail("manifest contains a non-numeric page or range count")
    if page_index in manifest_by_index:
        fail(f"duplicate PDF page index {page_index}")
    if item["source_pdf_designation"] != "A1985044.PDF" or item["source_language"] != "Arabic":
        fail(f"page {page_index}: unexpected source designation/language")
    if printed_page != 1600 + page_index:
        fail(f"page {page_index}: printed page number mismatch ({printed_page})")
    if item["image_review_status"] != EXPECTED_PAGE_STATUS:
        fail(f"page {page_index}: image review state must not imply row transcription")
    if page_index in EXPECTED_VISIBLE_PRINT_EXCEPTION_PAGES and not item["visible_print_exceptions"].strip():
        fail(f"page {page_index}: known Arabic printed exception must remain disclosed")
    if item["source_pdf_sha256"] != "NOT_CAPTURED":
        fail(f"page {page_index}: source PDF SHA-256 must remain explicitly uncaptured")

    image_path = ROOT / item["image_path"]
    if not image_path.is_file():
        fail(f"page {page_index}: tracked image missing at {item['image_path']}")
    payload = image_path.read_bytes()
    actual_blob = git_blob_sha1(payload)
    if actual_blob != item["image_git_blob_sha1"]:
        fail(f"page {page_index}: Git blob SHA-1 mismatch for {item['image_path']}")

    codes = parse_ranges(item["ledger_code_position_ranges"], page_index)
    if len(codes) != range_count:
        fail(f"page {page_index}: range count says {range_count}, parsed {len(codes)}")
    for code in codes:
        if code in code_to_page:
            fail(f"source code {code} appears in more than one page range")
        code_to_page[code] = page_index
    range_total += len(codes)
    manifest_by_index[page_index] = item

if sorted(manifest_by_index) != list(range(12, 41)):
    fail("Arabic page images must cover exactly PDF page indices 12–40")
if range_total != 1541:
    fail(f"page code ranges must cover 1,541 source code positions, found {range_total}")

special_rows = [
    item for item in manifest
    if item["special_non_commune_assertions"].strip()
]
if len(special_rows) != 1 or special_rows[0]["pdf_page_index"] != "22":
    fail("the separate 1600 Ville d'Alger assertion must be recorded only on page 22")
if special_rows[0]["special_non_commune_assertions"] != EXPECTED_SPECIAL:
    fail("the 1600 special assertion must remain excluded from the commune population")

# Verify the row/page mapping is a strict mirror of the master ledger.
master_by_key = {row["working_row_key"]: row for row in master}
if len(master_by_key) != 1541:
    fail("master working_row_key values are not unique")
if len({row["jo44_assertion_id"] for row in master}) != 1541:
    fail("master JO44 assertion IDs are not unique")

mapped_by_key = {row["working_row_key"]: row for row in row_map}
if len(mapped_by_key) != 1541 or set(mapped_by_key) != set(master_by_key):
    fail("row-page map is not a one-to-one population match with the master ledger")

source_code_occurrences: dict[str, list[str]] = {}
for key, source in master_by_key.items():
    mapped = mapped_by_key[key]
    for field in (
        "jo44_assertion_id",
        "working_row_key",
        "jo44_wilaya_code",
        "jo44_register_code_verbatim",
        "jo44_commune_name_fr_verbatim",
        "jo44_printed_page_fr",
    ):
        if mapped[field] != source[field]:
            fail(f"{key}: row-page map differs from master field {field}")

    code = source["jo44_register_code_verbatim"]
    if code not in code_to_page:
        fail(f"{key}: source register code {code} has no Arabic page-image range")
    page_index = code_to_page[code]
    page = manifest_by_index[page_index]
    expected_values = {
        "arabic_pdf_page_index": str(page_index),
        "arabic_printed_page_number": str(1600 + page_index),
        "arabic_image_path": page["image_path"],
        "arabic_image_git_blob_sha1": page["image_git_blob_sha1"],
        "row_image_mapping_status": EXPECTED_ROW_STATUS,
        "image_locator_basis": EXPECTED_LOCATOR_BASIS,
    }
    for field, expected in expected_values.items():
        if mapped[field] != expected:
            fail(f"{key}: {field} does not match page manifest")
    if code[:2] != source["jo44_wilaya_code"]:
        fail(f"{key}: source code prefix differs from its JO44 Wilaya")
    if source["practitioner_signoff_status"] != "PENDING":
        fail(f"{key}: practitioner sign-off must remain PENDING")
    source_code_occurrences.setdefault(code, []).append(source["jo44_assertion_id"])

actual_duplicates = {
    code: sorted(assertions)
    for code, assertions in source_code_occurrences.items()
    if len(assertions) > 1
}
if actual_duplicates != EXPECTED_DUPLICATE_SOURCE_CODES:
    fail(f"unexpected JO44 duplicate source-code pattern: {actual_duplicates}")

# Recompute all 48 Wilaya row counts and compare them to the visually read print headers.
if sum(EXPECTED_COUNTS) != 1541:
    fail("hard-coded printed Wilaya header counts do not sum to 1,541")
count_by_wilaya = Counter(row["jo44_wilaya_code"] for row in master)
control_by_wilaya = {row["jo44_wilaya_code"]: row for row in count_rows}
if len(control_by_wilaya) != 48 or set(control_by_wilaya) != {f"{n:02d}" for n in range(1, 49)}:
    fail("Wilaya count control must contain each Wilaya 01–48 exactly once")

for number in range(1, 49):
    code = f"{number:02d}"
    control = control_by_wilaya[code]
    expected_page = EXPECTED_HEADER_PAGES[number - 1]
    expected_count = EXPECTED_COUNTS[number - 1]
    try:
        header_page = int(control["arabic_printed_header_pdf_page_index"])
        printed_count = int(control["arabic_printed_commune_count"])
        ledger_count = int(control["master_ledger_row_count"])
    except (KeyError, ValueError):
        fail(f"Wilaya {code}: invalid count-control numeric field")
    if header_page != expected_page:
        fail(f"Wilaya {code}: printed header page index changed")
    if printed_count != expected_count:
        fail(f"Wilaya {code}: printed header count changed")
    if ledger_count != count_by_wilaya[code] or ledger_count != expected_count:
        fail(f"Wilaya {code}: printed/ledger count mismatch")
    unique_codes = len({
        row["jo44_register_code_verbatim"]
        for row in master if row["jo44_wilaya_code"] == code
    })
    if int(control["unique_jo44_register_code_count"]) != unique_codes:
        fail(f"Wilaya {code}: unique source-code count mismatch")
    if control["match_status"] != "MATCH":
        fail(f"Wilaya {code}: match_status must be MATCH")

    duplicate_values = sorted({
        source["jo44_register_code_verbatim"]
        for source in master
        if source["jo44_wilaya_code"] == code
        and len(source_code_occurrences[source["jo44_register_code_verbatim"]]) > 1
    })
    if control["preserved_duplicate_codes"] != ";".join(duplicate_values):
        fail(f"Wilaya {code}: duplicate source-code disclosure mismatch")

print(
    "JO44 Arabic page-image validation passed: 29 committed Arabic page images "
    "(PDF pages 12–40 / printed pages 1612–1640); 1,541/1,541 master assertions "
    "mapped to page images by ledger source-code position ranges (not verbatim Arabic code matching); 48/48 printed Wilaya counts match and sum to 1,541; "
    "W36 duplicate 3624 preserved; 1600 Ville d'Alger excluded; row-level Arabic "
    "transcription and practitioner approval remain outstanding."
)
