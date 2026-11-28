#!/usr/bin/env python3
"""Freeze three complete CSV exports into a new, offline P1-02 snapshot directory.

Does not fetch Sheets, activate reference data or connect to a database. The
caller supplies the capture timestamp; it is provenance claimed by the caller,
not a timestamp independently verified from the CSV bytes.
"""
from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys

from administrative_reference_preflight import HEADERS, MAX_INPUT_BYTES, InvalidSnapshot, build_report

TAB_IDENTITIES = {
    "communes": {"sheetId": 42295048, "title": "المرجع الوطني 1541"},
    "wilayas": {"sheetId": 1074264026, "title": "الولايات 69"},
    "aliases": {"sheetId": 661835956, "title": "أسماء 2026 الموحدة (ألياس)"},
}


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def validate_timestamp(value: str) -> str:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if not value.endswith("Z") or parsed.utcoffset().total_seconds() != 0:
            raise ValueError
    except (ValueError, AttributeError) as error:
        raise InvalidSnapshot("capture timestamp must be an ISO-8601 UTC timestamp ending in Z") from error
    return value


def package(inputs: dict[str, bytes], output: Path, captured_at_utc: str) -> dict:
    """Fail closed before creating output; never replace an existing package."""
    validate_timestamp(captured_at_utc)
    report = build_report(inputs)
    # mkdir is exclusive, including for an empty existing directory. Consumers must
    # require COMPLETE: a partially written directory is never a valid snapshot.
    output.mkdir(parents=False, exist_ok=False)
    complete = False
    try:
        files = {f"{kind}.csv": inputs[kind] for kind in HEADERS}
        files["preflight.json"] = json_bytes(report)
        manifest = {
            "schemaVersion": 1,
            "snapshotId": "sheets-sha256-" + report["canonicalContentSha256"],
            "canonicalContentSha256": report["canonicalContentSha256"],
            "claimedCaptureAtUtc": captured_at_utc,
            "captureTimestampIndependentlyVerified": False,
            "sourceClaim": {**report["sourceClaim"], "tabs": TAB_IDENTITIES},
            "originalAttachmentByteIdentityVerified": False,
            "databaseImportAuthorized": False,
            "files": {name: {"sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}
                      for name, raw in files.items()},
        }
        files["manifest.json"] = json_bytes(manifest)
        # Fixed internal names only; no spreadsheet values become file paths.
        for name, raw in files.items():
            with (output / name).open("xb") as handle:
                handle.write(raw)
                handle.flush()
                os.fsync(handle.fileno())
        manifest_hash = hashlib.sha256(files["manifest.json"]).hexdigest()
        with (output / "COMPLETE").open("x", encoding="ascii") as handle:
            handle.write(manifest_hash + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        complete = True
        return manifest
    finally:
        if not complete:
            shutil.rmtree(output)


def verify(output: Path) -> dict:
    """Check byte integrity AND re-run validation; never trust a copied PASS report.

    Hashes detect accidental drift, not publisher identity/signatures. This is a
    local package verifier, not a legal or operational import authorization.
    """
    try:
        expected = {*[f"{kind}.csv" for kind in HEADERS], "preflight.json", "manifest.json", "COMPLETE"}
        if output.is_symlink() or {item.name for item in output.iterdir()} != expected:
            raise InvalidSnapshot("snapshot directory has unexpected entries")
        if any(item.is_symlink() or not item.is_file() for item in output.iterdir()):
            raise InvalidSnapshot("snapshot entries must be regular files, not symbolic links")
        blobs = {}
        for name in expected:
            with (output / name).open("rb") as handle:
                blobs[name] = handle.read(MAX_INPUT_BYTES + 1)
            if len(blobs[name]) > MAX_INPUT_BYTES:
                raise InvalidSnapshot("snapshot file exceeds size limit")
        if blobs["COMPLETE"] != (hashlib.sha256(blobs["manifest.json"]).hexdigest() + "\n").encode("ascii"):
            raise InvalidSnapshot("snapshot manifest checksum differs or package is incomplete")
        manifest = json.loads(blobs["manifest.json"])
        if manifest.get("schemaVersion") != 1 or manifest.get("databaseImportAuthorized") is not False:
            raise InvalidSnapshot("unexpected snapshot manifest contract")
        expected_files = {f"{kind}.csv" for kind in HEADERS} | {"preflight.json"}
        if set(manifest["files"]) != expected_files:
            raise InvalidSnapshot("unexpected snapshot file manifest")
        for name in expected_files:
            if manifest["files"][name] != {"sha256": hashlib.sha256(blobs[name]).hexdigest(), "bytes": len(blobs[name])}:
                raise InvalidSnapshot("snapshot file checksum or length differs")
        report = build_report({kind: blobs[f"{kind}.csv"] for kind in HEADERS})
        if blobs["preflight.json"] != json_bytes(report):
            raise InvalidSnapshot("stored preflight differs from recomputed assessment")
        if manifest["canonicalContentSha256"] != report["canonicalContentSha256"]:
            raise InvalidSnapshot("canonical content checksum differs")
        if manifest["snapshotId"] != "sheets-sha256-" + report["canonicalContentSha256"]:
            raise InvalidSnapshot("snapshot ID differs")
        if manifest["sourceClaim"] != {**report["sourceClaim"], "tabs": TAB_IDENTITIES}:
            raise InvalidSnapshot("unexpected source claim")
        if (manifest["captureTimestampIndependentlyVerified"] is not False
                or manifest["originalAttachmentByteIdentityVerified"] is not False):
            raise InvalidSnapshot("unexpected provenance assertion")
        validate_timestamp(manifest["claimedCaptureAtUtc"])
        return report
    except (OSError, KeyError, TypeError, ValueError, AttributeError, RecursionError) as error:
        if isinstance(error, InvalidSnapshot):
            raise
        raise InvalidSnapshot("invalid or unreadable snapshot package") from error


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create")
    for kind in HEADERS:
        create.add_argument(f"--{kind}", type=Path, required=True)
    create.add_argument("--captured-at-utc", required=True)
    create.add_argument("--output", type=Path, required=True, help="New directory under an existing parent; never overwritten")
    check = commands.add_parser("verify")
    check.add_argument("directory", type=Path)
    args = parser.parse_args(argv)
    try:
        if args.command == "verify":
            report = verify(args.directory)
            print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
        else:
            paths = {kind: getattr(args, kind) for kind in HEADERS}
            if len({path.resolve() for path in paths.values()}) != 3:
                raise InvalidSnapshot("expected three distinct input files")
            inputs = {}
            for kind, path in paths.items():
                with path.open("rb") as handle:
                    inputs[kind] = handle.read(MAX_INPUT_BYTES + 1)
            manifest = package(inputs, args.output, args.captured_at_utc)
            print(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True))
    except (OSError, InvalidSnapshot) as error:
        reason = str(error) if isinstance(error, InvalidSnapshot) else "input/output operation failed; existing destinations are never replaced"
        print(json.dumps({"assessment": "INVALID_SNAPSHOT", "reason": reason,
                          "databaseImportAuthorized": False}, ensure_ascii=False), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
