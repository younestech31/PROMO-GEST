#!/usr/bin/env python3
"""Validate the P1-01 1,541-row working crosswalk as an unapproved workpaper.

These checks cover file structure and internal consistency only. They do not
authenticate the third-party candidate source, prove current legal identity,
resolve historical parentage/effective dates, certify Arabic legal pairing,
or authorize database import.
"""
from __future__ import annotations

import csv
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CROSSWALK = ROOT / "docs" / "reference-data" / "P1-01-WORKING-CROSSWALK-1541.csv"
EXPECTED_ROWS = 1541
EXPECTED_SOURCE_REPO = "islam-re/Algeria-wilayas"
EXPECTED_SOURCE_COMMIT = "bfb29814117d11a6a101fa07c38911f6675b748b"
EXPECTED_SOURCE_PATH = "json/wilaya-commune/wilaya-commune.json"
EXPECTED_JO58_SHA256 = "6a1e59f7c0e8396115657c6376dabeb3fa07543ac8a7036ee3003af6a415aad6"
EXPECTED_JO58_INSTRUMENT_DATE = "2026-05-05"
EXPECTED_JO58_PUBLICATION_DATE = "2026-08-12"
EXPECTED_JO58_SOURCE_STATUS = "JO58_FR_AR_PNG_VISUALLY_REVIEWED"
EXPECTED_JO58_ARABIC_STATUS = "ARABIC_PNG_IMAGES_REVIEWED_PP_9_25"

EXPECTED_FIELDS = [
    "working_row_key", "wilaya_code_candidate", "wilaya_name_fr_candidate",
    "wilaya_name_ar_candidate", "commune_name_fr_candidate",
    "commune_name_ar_candidate", "candidate_source_repo",
    "candidate_source_commit", "candidate_source_path", "law_26_06_article",
    "law_26_06_fr_membership_status", "law_26_06_article_expected_count",
    "jo58_2026_commune_name_fr", "jo58_2026_code_verbatim",
    "jo58_2026_seat_fr", "jo58_2026_printed_page", "jo58_2026_source_status",
    "jo58_2026_arabic_label_status", "source_pdf_sha256", "instrument_date",
    "publication_date", "code_effective_from", "code_effective_to",
    "legal_parent_effective_from", "legal_parent_effective_to",
    "source_row_pdf_page", "qualified_practitioner_status",
    "technical_row_disposition", "row_status", "row_notes",
]

# Article -> (two-digit Wilaya code, declared commune count). This is a
# regression control for the currently recorded 404-row JO58 workpaper slice,
# not a substitute for reading or legally interpreting the Official Journal.
EXPECTED_JO58_ARTICLES = {
    "7": ("03", 12),
    "9": ("05", 53),
    "11": ("07", 22),
    "16": ("12", 24),
    "17": ("13", 49),
    "18": ("14", 36),
    "21": ("17", 18),
    "30": ("26", 43),
    "32": ("28", 24),
    "36": ("32", 15),
    "52 bis 10": ("59", 12),
    "52 bis 11": ("60", 8),
    "52 bis 12": ("61", 5),
    "52 bis 13": ("62", 4),
    "52 bis 14": ("63", 4),
    "52 bis 15": ("64", 6),
    "52 bis 16": ("65", 10),
    "52 bis 17": ("66", 8),
    "52 bis 18": ("67", 21),
    "52 bis 19": ("68", 23),
    "52 bis 20": ("69", 7),
}

NOT_IN_LAW_26_06 = "NOT_IN_21_EXPLICITLY_RECOMPOSED_WILAYAS_IN_LAW_26_06"
LAW_26_06_MATCH = "NAME_MEMBER_MATCHES_LAW_26_06_TEXT_NORMALIZED"
CANDIDATE_ONLY = "CANDIDATE_ONLY_NOT_APPROVED"
INHERITED_REVIEW = "INHERITED_BASE_REGISTER_ROW_RECONCILIATION_REQUIRED"
JO58_REVIEW = "LAW_26_06_MEMBER_CANDIDATE_MATCH_REQUIRES_ROW_LEVEL_LEGAL_RECONCILIATION"


def fail(message: str) -> None:
    raise SystemExit(f"P1-01 candidate crosswalk validation failed: {message}")


def normalize_label(value: str) -> str:
    """Normalize Unicode accents and apostrophe glyph variants, not identity."""
    decomposed = unicodedata.normalize("NFKD", value)
    without_marks = "".join(char for char in decomposed if not unicodedata.combining(char))
    apostrophes = without_marks.translate(str.maketrans({
        "\u2018": "'", "\u2019": "'", "\u201b": "'", "\u02bc": "'",
        "\u02bb": "'", "\u0060": "'", "\u00b4": "'",
    }))
    return re.sub(r"\s+", " ", apostrophes.casefold()).strip()


if not CROSSWALK.is_file():
    fail(f"missing candidate workpaper: {CROSSWALK.relative_to(ROOT)}")

with CROSSWALK.open(encoding="utf-8-sig", newline="") as handle:
    reader = csv.reader(handle)
    try:
        header = next(reader)
    except StopIteration:
        fail("candidate workpaper is empty")
    if header != EXPECTED_FIELDS:
        fail("the 30-column candidate-workpaper schema differs from the reviewed contract")
    raw_rows = list(reader)

if any(len(row) != len(EXPECTED_FIELDS) for row in raw_rows):
    fail("one or more CSV records have a malformed column count")

rows = [dict(zip(EXPECTED_FIELDS, values, strict=True)) for values in raw_rows]
if len(rows) != EXPECTED_ROWS:
    fail(f"expected {EXPECTED_ROWS} candidate rows, found {len(rows)}")

expected_wilayas = {f"{number:02d}" for number in range(1, 70)}
wilaya_rows: dict[str, list[dict[str, str]]] = defaultdict(list)
candidate_keys: set[str] = set()
candidate_names_fr: set[tuple[str, str]] = set()
candidate_names_ar: set[tuple[str, str]] = set()
jo58_rows: list[dict[str, str]] = []
jo58_by_article: dict[str, list[dict[str, str]]] = defaultdict(list)
jo58_codes: set[str] = set()

for line_number, row in enumerate(rows, start=2):
    key = row["working_row_key"]
    key_match = re.fullmatch(r"W(\d{2})-R(\d{3})", key)
    if not key_match:
        fail(f"line {line_number}: malformed working row key {key!r}")
    wilaya_code, row_sequence = key_match.groups()

    if wilaya_code != row["wilaya_code_candidate"]:
        fail(f"line {line_number}: row key and candidate Wilaya code differ")
    if wilaya_code not in expected_wilayas:
        fail(f"line {line_number}: unknown candidate Wilaya code {wilaya_code}")
    if key in candidate_keys:
        fail(f"line {line_number}: duplicate working row key {key}")
    candidate_keys.add(key)
    wilaya_rows[wilaya_code].append(row)

    for field in (
        "wilaya_name_fr_candidate", "wilaya_name_ar_candidate",
        "commune_name_fr_candidate", "commune_name_ar_candidate",
    ):
        if not row[field].strip():
            fail(f"line {line_number}: required bilingual candidate field {field} is empty")

    fr_key = (wilaya_code, normalize_label(row["commune_name_fr_candidate"]))
    ar_key = (wilaya_code, normalize_label(row["commune_name_ar_candidate"]))
    if fr_key in candidate_names_fr:
        fail(f"line {line_number}: duplicate normalized French candidate name in W{wilaya_code}")
    if ar_key in candidate_names_ar:
        fail(f"line {line_number}: duplicate normalized Arabic candidate name in W{wilaya_code}")
    candidate_names_fr.add(fr_key)
    candidate_names_ar.add(ar_key)

    if row["candidate_source_repo"] != EXPECTED_SOURCE_REPO:
        fail(f"line {line_number}: candidate source repository changed without review")
    if row["candidate_source_commit"] != EXPECTED_SOURCE_COMMIT:
        fail(f"line {line_number}: candidate source commit changed without review")
    if row["candidate_source_path"] != EXPECTED_SOURCE_PATH:
        fail(f"line {line_number}: candidate source path changed without review")

    if row["technical_row_disposition"] != CANDIDATE_ONLY:
        fail(f"line {line_number}: candidate row is not explicitly unapproved")
    if row["qualified_practitioner_status"] != "PENDING":
        fail(f"line {line_number}: practitioner review must remain pending")

    membership = row["law_26_06_fr_membership_status"]
    if membership == LAW_26_06_MATCH:
        if row["row_status"] != JO58_REVIEW:
            fail(f"line {line_number}: Law 26-06 member row has an unexpected review status")
        if not row["jo58_2026_commune_name_fr"].strip():
            fail(f"line {line_number}: Law 26-06 member row has no JO58 name")
        if normalize_label(row["commune_name_fr_candidate"]) != normalize_label(row["jo58_2026_commune_name_fr"]):
            fail(f"line {line_number}: JO58/candidate French label does not match under the recorded normalization")
        code = row["jo58_2026_code_verbatim"]
        if not re.fullmatch(r"\d{4}", code) or not code.startswith(wilaya_code):
            fail(f"line {line_number}: malformed JO58 code or Wilaya prefix: {code!r}")
        if code in jo58_codes:
            fail(f"line {line_number}: duplicate JO58 code {code}")
        jo58_codes.add(code)
        if not row["jo58_2026_seat_fr"].strip():
            fail(f"line {line_number}: JO58 administrative seat is empty")
        if row["jo58_2026_source_status"] != EXPECTED_JO58_SOURCE_STATUS:
            fail(f"line {line_number}: JO58 source review status differs from the recorded workpaper state")
        if row["jo58_2026_arabic_label_status"] != EXPECTED_JO58_ARABIC_STATUS:
            fail(f"line {line_number}: JO58 Arabic image-review status differs from the recorded workpaper state")
        if row["source_pdf_sha256"] != EXPECTED_JO58_SHA256:
            fail(f"line {line_number}: JO58 source SHA-256 differs from the pinned official PDF digest")
        if row["instrument_date"] != EXPECTED_JO58_INSTRUMENT_DATE:
            fail(f"line {line_number}: JO58 instrument date differs from the recorded source")
        if row["publication_date"] != EXPECTED_JO58_PUBLICATION_DATE:
            fail(f"line {line_number}: JO58 publication date differs from the recorded source")
        try:
            printed_page = int(row["jo58_2026_printed_page"])
        except ValueError:
            fail(f"line {line_number}: JO58 printed-page provenance is not numeric")
        if not 9 <= printed_page <= 25:
            fail(f"line {line_number}: JO58 printed-page reference is outside pp. 9–25")
        if not row["law_26_06_article"].strip() or not row["law_26_06_article_expected_count"].strip():
            fail(f"line {line_number}: Law 26-06 article/count provenance is missing")
        jo58_rows.append(row)
        jo58_by_article[row["law_26_06_article"]].append(row)
    elif membership == NOT_IN_LAW_26_06:
        if row["row_status"] != INHERITED_REVIEW:
            fail(f"line {line_number}: inherited candidate row has an unexpected review status")
        for field in (
            "law_26_06_article", "law_26_06_article_expected_count",
            "jo58_2026_commune_name_fr", "jo58_2026_code_verbatim",
            "jo58_2026_seat_fr", "jo58_2026_printed_page", "source_pdf_sha256",
            "instrument_date", "publication_date", "source_row_pdf_page",
        ):
            if row[field]:
                fail(f"line {line_number}: unjoined row unexpectedly contains {field}")
        if row["jo58_2026_source_status"] != "NOT_EXTRACTED_IN_THIS_SLICE":
            fail(f"line {line_number}: inherited row must not imply a JO58 extraction")
        if row["jo58_2026_arabic_label_status"] != "PENDING_ARABIC_JO58_ROW_PAIR_REVIEW":
            fail(f"line {line_number}: inherited row Arabic review must remain pending")
    else:
        fail(f"line {line_number}: unknown Law 26-06 membership status {membership!r}")

if set(wilaya_rows) != expected_wilayas:
    missing = sorted(expected_wilayas - set(wilaya_rows))
    extra = sorted(set(wilaya_rows) - expected_wilayas)
    fail(f"expected all Wilaya codes 01–69; missing={missing}, extra={extra}")

for code, group in wilaya_rows.items():
    actual_sequences = [int(re.fullmatch(r"W\d{2}-R(\d{3})", row["working_row_key"]).group(1)) for row in group]
    expected_sequences = list(range(1, len(group) + 1))
    if actual_sequences != expected_sequences:
        fail(f"W{code}: working row keys are not ordered and contiguous from R001")

if len(jo58_rows) != 404:
    fail(f"expected 404 JO58-linked candidate rows, found {len(jo58_rows)}")
if len(jo58_by_article) != len(EXPECTED_JO58_ARTICLES) or set(jo58_by_article) != set(EXPECTED_JO58_ARTICLES):
    fail("JO58 article groups differ from the 21 reviewed Law 26-06 workpaper groups")

for article, (expected_wilaya, expected_count) in EXPECTED_JO58_ARTICLES.items():
    group = jo58_by_article[article]
    wilaya_codes = {row["wilaya_code_candidate"] for row in group}
    declared_counts = {row["law_26_06_article_expected_count"] for row in group}
    if wilaya_codes != {expected_wilaya}:
        fail(f"Law 26-06 article {article}: unexpected candidate Wilaya codes {sorted(wilaya_codes)}")
    if len(group) != expected_count or declared_counts != {str(expected_count)}:
        fail(f"Law 26-06 article {article}: expected {expected_count} rows, found {len(group)}")

# Preserve the currently recorded evidence boundary. This verifies the state of
# the workpaper, not the legal validity of any candidate municipality.
if any(row["technical_row_disposition"] != CANDIDATE_ONLY for row in rows):
    fail("one or more candidate rows are not marked CANDIDATE_ONLY_NOT_APPROVED")

# Reproduce the French name-only triage report across all 48 JO44 sections.
# Name hits are comparison categories only; they do not establish legal identity,
# a territorial transfer, current parentage, code continuity or effective dates.
EXPECTED_JO44_NAME_ONLY = {
    "single_hit_same_wilaya": 967,
    "single_hit_different_wilaya": 149,
    "multiple_candidate_hits": 63,
    "no_exact_normalized_hit": 362,
}
JO44_EXTRACT_GLOB = "P1-01-JO44-1985-W??-*.csv"
JO44_SPECIAL_MARKER = "SPECIAL-ASSERTION"

jo44_files = sorted(
    path for path in DATA.glob(JO44_EXTRACT_GLOB)
    if JO44_SPECIAL_MARKER not in path.name
)
if len(jo44_files) != 48:
    fail(f"expected 48 JO44/1985 commune extracts, found {len(jo44_files)}")

candidate_wilayas_by_name: dict[str, list[str]] = defaultdict(list)
for row in rows:
    candidate_wilayas_by_name[normalize_label(row["commune_name_fr_candidate"])].append(
        row["wilaya_code_candidate"]
    )

name_only_counts = {key: 0 for key in EXPECTED_JO44_NAME_ONLY}
jo44_assertion_ids: set[str] = set()
jo44_total = 0

for path in jo44_files:
    match = re.fullmatch(r"P1-01-JO44-1985-W(\\d{2})-.+\\.csv", path.name)
    if not match:
        fail(f"unexpected JO44 extract filename: {path.name}")
    expected_wilaya = match.group(1)
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required_fields = {
            "assertion_id", "wilaya_code_verbatim", "commune_name_fr_verbatim"
        }
        if reader.fieldnames is None or not required_fields.issubset(reader.fieldnames):
            fail(f"{path.name}: required JO44 assertion columns are missing")
        source_rows = list(reader)

    if not source_rows:
        fail(f"{path.name}: source extract is empty")
    for row in source_rows:
        assertion_id = row["assertion_id"]
        if not assertion_id or assertion_id in jo44_assertion_ids:
            fail(f"{path.name}: missing or duplicate JO44 assertion ID {assertion_id!r}")
        jo44_assertion_ids.add(assertion_id)
        if row["wilaya_code_verbatim"] != expected_wilaya:
            fail(f"{path.name}: source row has an unexpected Wilaya code")
        source_label = row["commune_name_fr_verbatim"].strip()
        if not source_label:
            fail(f"{path.name}: JO44 French source label is empty")

        hits = candidate_wilayas_by_name.get(normalize_label(source_label), [])
        if not hits:
            category = "no_exact_normalized_hit"
        elif len(hits) > 1:
            category = "multiple_candidate_hits"
        elif hits[0] == expected_wilaya:
            category = "single_hit_same_wilaya"
        else:
            category = "single_hit_different_wilaya"
        name_only_counts[category] += 1
        jo44_total += 1

if jo44_total != EXPECTED_ROWS or len(jo44_assertion_ids) != EXPECTED_ROWS:
    fail(
        f"expected {EXPECTED_ROWS} unique JO44 assertions for name-only triage, "
        f"found {jo44_total} rows / {len(jo44_assertion_ids)} unique IDs"
    )
if name_only_counts != EXPECTED_JO44_NAME_ONLY:
    fail(
        "JO44-to-candidate French name-only categories differ from the reviewed "
        f"triage report: {name_only_counts}"
    )

print(
    "P1-01 candidate crosswalk consistency passed: "
    "1,541/1,541 bilingual candidate rows across 69 Wilayas; "
    "404/404 JO58-linked rows across 21 recorded Law 26-06 article groups; "
    "no duplicate candidate names or JO58 codes; all rows remain unapproved "
    "and practitioner review remains pending. No legal approval or import implied."
)
print(
    "P1-01 JO44 French name-only triage passed: "
    "1,541/1,541 assertions; 967 same-Wilaya, 149 different-Wilaya, "
    "63 multiple-hit, 362 no-hit. Label matching only; no legal conclusion."
)
