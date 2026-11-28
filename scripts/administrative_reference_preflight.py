#!/usr/bin/env python3
"""Read-only P1-02 preflight for the owner-selected Sheets CSV exports.

No network, database, seed, legal approval or historical-name backfill. A successful
report describes an input snapshot; it never authorizes a production import.
"""
from __future__ import annotations

import argparse
from collections import Counter
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import unicodedata

SOURCE_ID = "1vQFc-Ww6V76nUYiqfsgmxkdD32Eu4I6lR7THBbhiikk"
HEADERS = {
    "communes": ["code", "wilaya_code", "commune_fr", "commune_ar", "daira_fr", "daira_ar", "is_daira_seat"],
    "wilayas": ["wilaya_code", "wilaya_fr", "wilaya_ar", "dairas", "communes", "wilaya_ar_source"],
    "aliases": ["code", "ref_fr", "alias_fr_2026", "ref_ar", "repo_ar", "evidence"],
}
EXPECTED_COUNTS = (1541, 69, 151)
MAX_INPUT_BYTES = 4 * 1024 * 1024


class InvalidSnapshot(ValueError):
    """Invalid or incomplete input; error text contains locations, never cell values."""


def canonical_bytes(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def load_csv(raw: bytes, kind: str) -> list[dict[str, str]]:
    if len(raw) > MAX_INPUT_BYTES:
        raise InvalidSnapshot(f"{kind}: input exceeds size limit")
    try:
        reader = csv.reader(io.StringIO(raw.decode("utf-8-sig"), newline=""), strict=True)
        if next(reader, None) != HEADERS[kind]:
            raise InvalidSnapshot(f"{kind}: unexpected header or column order")
        records = []
        for number, cells in enumerate(reader, start=2):
            if not cells:  # CSV exporters may append empty lines, not partial records.
                continue
            if len(cells) != len(HEADERS[kind]):
                raise InvalidSnapshot(f"{kind}: record {number}: unexpected column count")
            for column, cell in zip(HEADERS[kind], cells, strict=True):
                if any(unicodedata.category(char) == "Cc" for char in cell):
                    raise InvalidSnapshot(f"{kind}: record {number}: control character in {column}")
                if cell != cell.strip():
                    raise InvalidSnapshot(f"{kind}: record {number}: surrounding whitespace in {column}")
                if not cell and not (kind == "communes" and column == "is_daira_seat"):
                    raise InvalidSnapshot(f"{kind}: record {number}: missing {column}")
            records.append(dict(zip(HEADERS[kind], cells, strict=True)))
        return records
    except (UnicodeError, csv.Error) as error:
        raise InvalidSnapshot(f"{kind}: invalid UTF-8 or CSV") from error


def positive_integer(value: str, location: str) -> int:
    if len(value) > 4 or not re.fullmatch(r"[1-9][0-9]*", value):
        raise InvalidSnapshot(f"{location}: expected positive decimal integer")
    return int(value)


def build_report(inputs: dict[str, bytes]) -> dict:
    """Validate all three complete exports against the fixed operational profile."""
    rows = {kind: load_csv(inputs[kind], kind) for kind in HEADERS}
    for kind, expected in zip(HEADERS, EXPECTED_COUNTS, strict=True):
        if len(rows[kind]) != expected:
            raise InvalidSnapshot(f"{kind}: expected {expected} records, found {len(rows[kind])}")

    wilayas = {}
    for number, row in enumerate(rows["wilayas"], start=2):
        code = row["wilaya_code"]
        if not re.fullmatch(r"[0-9]{2}", code) or not 1 <= int(code) <= 69:
            raise InvalidSnapshot(f"wilayas: record {number}: invalid system code")
        if code in wilayas:
            raise InvalidSnapshot(f"wilayas: record {number}: duplicate system code")
        positive_integer(row["dairas"], f"wilayas: record {number}: dairas")
        positive_integer(row["communes"], f"wilayas: record {number}: communes")
        wilayas[code] = row
    if set(wilayas) != {f"{number:02d}" for number in range(1, 70)}:
        raise InvalidSnapshot("wilayas: expected system codes 01 through 69")

    communes = {}
    commune_counts: Counter[str] = Counter()
    dairas: dict[str, set[tuple[str, str]]] = {code: set() for code in wilayas}
    french_pairs: dict[tuple[str, str], str] = {}
    arabic_pairs: dict[tuple[str, str], str] = {}
    seats = Counter()
    for number, row in enumerate(rows["communes"], start=2):
        code, parent = row["code"], row["wilaya_code"]
        if not re.fullmatch(r"[0-9]{4}", code):
            raise InvalidSnapshot(f"communes: record {number}: invalid system code; leading zeros must be preserved")
        if code in communes:
            raise InvalidSnapshot(f"communes: record {number}: duplicate system code")
        if parent not in wilayas:
            raise InvalidSnapshot(f"communes: record {number}: unknown parent wilaya")
        if row["is_daira_seat"] not in ("", "نعم", "لا"):
            raise InvalidSnapshot(f"communes: record {number}: unsupported seat marker")
        # Blank means unknown, not false. The raw source value is also hashed below.
        seats[{"": "unknown", "نعم": "yes", "لا": "no"}[row["is_daira_seat"]]] += 1
        fr_key, ar_key = (parent, row["daira_fr"]), (parent, row["daira_ar"])
        if french_pairs.setdefault(fr_key, row["daira_ar"]) != row["daira_ar"]:
            raise InvalidSnapshot(f"communes: record {number}: inconsistent bilingual daira mapping")
        if arabic_pairs.setdefault(ar_key, row["daira_fr"]) != row["daira_fr"]:
            raise InvalidSnapshot(f"communes: record {number}: inconsistent bilingual daira mapping")
        communes[code] = row
        commune_counts[parent] += 1
        dairas[parent].add((row["daira_fr"], row["daira_ar"]))

    for code, wilaya in wilayas.items():
        if commune_counts[code] != int(wilaya["communes"]):
            raise InvalidSnapshot(f"wilayas: system code {code}: commune count differs from child records")

    aliases_seen = set()
    for number, row in enumerate(rows["aliases"], start=2):
        target = communes.get(row["code"])
        if target is None:
            raise InvalidSnapshot(f"aliases: record {number}: unknown commune system code")
        if row["code"] in aliases_seen:
            raise InvalidSnapshot(f"aliases: record {number}: duplicate commune system code")
        if row["ref_fr"] != target["commune_fr"] or row["ref_ar"] != target["commune_ar"]:
            raise InvalidSnapshot(f"aliases: record {number}: stale reference names")
        aliases_seen.add(row["code"])

    observed = sum(len(items) for items in dairas.values())
    declared = sum(int(row["dairas"]) for row in wilayas.values())
    if declared != 550 or observed not in (549, 550):
        raise InvalidSnapshot("dairas: expected declared total 550 and observed total 549 or 550")
    differences = [
        {"wilayaCode": code, "declared": int(wilayas[code]["dairas"]), "observed": len(dairas[code])}
        for code in sorted(wilayas) if int(wilayas[code]["dairas"]) != len(dairas[code])
    ]
    warnings = []
    if differences:
        if (observed, declared) != (549, 550):
            raise InvalidSnapshot("dairas: unexpected declared/observed distribution; review snapshot")
        warnings.append({
            "code": "KNOWN_DAIRA_549_550_RESIDUAL",
            "declared": declared, "observed": observed, "byWilaya": differences,
            "disposition": "Retain observed groups and declared counts separately; do not fabricate a daira.",
        })
    if seats["unknown"]:
        warnings.append({"code": "DAIRA_SEAT_UNKNOWN", "count": seats["unknown"], "disposition": "Unknown is not false."})

    # Sort records, not names: an alias never replaces an original name. Row order
    # and BOM/line-ending differences affect the byte hashes, not content identity.
    normalized = {
        kind: sorted(records, key=lambda row: row["wilaya_code"] if kind == "wilayas" else row["code"])
        for kind, records in rows.items()
    }
    return {
        "schemaVersion": 1,
        "assessment": "STRUCTURAL_PASS_WITH_WARNINGS" if warnings else "STRUCTURAL_PASS",
        "databaseImportAuthorized": False,
        "historicalBackfillAuthorized": False,
        "legalEffectiveDatesVerified": False,
        "sourceClaim": {"spreadsheetId": SOURCE_ID, "kind": "owner-selected-operational-reference",
                        "csvOriginIndependentlyVerified": False},
        "inputSha256": {kind: hashlib.sha256(inputs[kind]).hexdigest() for kind in HEADERS},
        "canonicalContentSha256": hashlib.sha256(canonical_bytes(normalized)).hexdigest(),
        "counts": {"communes": len(communes), "wilayas": len(wilayas), "aliases": len(aliases_seen),
                   "observedDairas": observed, "declaredDairas": declared,
                   "dairaSeats": {key: seats[key] for key in ("yes", "no", "unknown")}},
        "warnings": warnings,
        "notPerformed": ["database-connection", "migration", "seed", "import", "legal-date-inference", "historical-name-rewrite"],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    for kind in HEADERS:
        parser.add_argument(f"--{kind}", required=True, type=Path, help=f"Complete UTF-8 {kind} CSV export; read only")
    args = parser.parse_args(argv)
    try:
        paths = {kind: getattr(args, kind) for kind in HEADERS}
        if len({path.resolve() for path in paths.values()}) != 3:
            raise InvalidSnapshot("expected three distinct input files")
        inputs = {}
        for kind, path in paths.items():
            # Limit the actual read even if stat changes or the path is a special file.
            with path.open("rb") as handle:
                inputs[kind] = handle.read(MAX_INPUT_BYTES + 1)
        report = build_report(inputs)
    except (OSError, InvalidSnapshot) as error:
        # No paths, credentials, raw cell values or exception details in output.
        reason = str(error) if isinstance(error, InvalidSnapshot) else "input file could not be read"
        print(json.dumps({"assessment": "INVALID_SNAPSHOT", "reason": reason,
                          "databaseImportAuthorized": False}, ensure_ascii=False), file=sys.stderr)
        return 1
    print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
