#!/usr/bin/env python3
"""Offline resumable journal for read-only Sheets ValueRange captures.

No network, credentials, database, activation or source approval. The caller
supplies connector response values and claimed read time/request ID. Two complete
matching passes are required before the existing package/preflight can run.
These are captured cell values, not authenticated original CSV export bytes.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sys

from administrative_reference_preflight import HEADERS, SOURCE_ID, MAX_INPUT_BYTES, InvalidSnapshot
from package_administrative_reference import TAB_IDENTITIES, json_bytes, package, validate_timestamp

COUNTS = {"communes": 1541, "wilayas": 69, "aliases": 151}
PASSES = ("first", "second")


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise InvalidSnapshot("duplicate JSON key")
        result[key] = value
    return result


def parse_json(raw: bytes | str) -> dict:
    if len(raw) > MAX_INPUT_BYTES:
        raise InvalidSnapshot("capture input exceeds size limit")
    try:
        value = json.loads(raw, object_pairs_hook=unique_object,
                           parse_constant=lambda _: (_ for _ in ()).throw(InvalidSnapshot("invalid JSON constant")))
    except (ValueError, UnicodeError, RecursionError) as error:
        raise InvalidSnapshot("invalid capture JSON") from error
    if not isinstance(value, dict):
        raise InvalidSnapshot("capture input must be a JSON object")
    return value


def read_json(path: Path) -> dict:
    if path.is_symlink() or not path.is_file():
        raise InvalidSnapshot("capture input must be a regular file")
    with path.open("rb") as handle:
        return parse_json(handle.read(MAX_INPUT_BYTES + 1))


def connector_response(result: dict) -> tuple[dict, str]:
    """Unwrap a complete saved tool result; never repair/truncate/infer its cells.

    This extracts a *claimed* connector ID, not a signature or authenticated
    transport. Existing hand-supplied ValueRange ingestion remains supported.
    """
    if set(result) == {"status", "result_text"}:
        if result["status"] != "success" or not isinstance(result["result_text"], str):
            raise InvalidSnapshot("connector result must be a complete successful response")
        result = parse_json(result["result_text"])
    if set(result) != {"content", "isError", "_meta"} or result["isError"] is not False:
        raise InvalidSnapshot("connector payload must be a complete non-error response")
    metadata, content = result["_meta"], result["content"]
    if (not isinstance(metadata, dict) or set(metadata) != {"dev.merge/request_id"}
            or not isinstance(content, list) or len(content) != 1
            or not isinstance(content[0], dict) or set(content[0]) != {"type", "text"}
            or content[0]["type"] != "text" or not isinstance(content[0]["text"], str)):
        raise InvalidSnapshot("connector result must have one complete text payload and request identifier")
    request_id = metadata["dev.merge/request_id"]
    if not isinstance(request_id, str) or not re.fullmatch(r"[A-Za-z0-9-]{1,100}", request_id):
        raise InvalidSnapshot("invalid connector request identifier")
    return parse_json(content[0]["text"]), request_id


def rows_for(kind: str, start: int, end: int, response: dict) -> list[list[str]]:
    if type(start) is not int or type(end) is not int or not 1 <= start <= end <= COUNTS[kind] + 1:
        raise InvalidSnapshot("capture row bounds are outside the adopted table")
    title = TAB_IDENTITIES[kind]["title"]
    column = chr(ord("A") + len(HEADERS[kind]) - 1)
    expected_range = f"'{title}'!A{start}:{column}{end}"
    if set(response) != {"spreadsheet_id", "value_ranges"} or response["spreadsheet_id"] != SOURCE_ID:
        raise InvalidSnapshot("capture must identify the adopted workbook and exactly one ValueRange")
    ranges = response["value_ranges"]
    if not isinstance(ranges, list) or len(ranges) != 1 or not isinstance(ranges[0], dict):
        raise InvalidSnapshot("capture must contain exactly one ValueRange")
    item = ranges[0]
    if set(item) != {"range", "major_dimension", "values"} or item["range"] != expected_range or item["major_dimension"] != "ROWS":
        raise InvalidSnapshot("capture range or row dimension differs from the requested bounds")
    values = item["values"]
    if not isinstance(values, list) or len(values) != end - start + 1:
        raise InvalidSnapshot("capture is incomplete; every requested source row is required")
    result = []
    for number, row in enumerate(values, start=start):
        if not isinstance(row, list) or any(not isinstance(value, str) for value in row):
            raise InvalidSnapshot(f"{kind}: row {number}: cells must remain strings; do not coerce codes or numbers")
        cells = list(row)
        if kind == "communes" and number > 1 and len(cells) == len(HEADERS[kind]) - 1:
            cells.append("")  # Sheets omits trailing empty cells; unknown is not false.
        if len(cells) != len(HEADERS[kind]) or (number == 1 and cells != HEADERS[kind]):
            raise InvalidSnapshot(f"{kind}: row {number}: unexpected columns or header")
        result.append(cells)
    return result


def load_journal(journal: Path) -> tuple[dict, list[dict], dict]:
    if journal.is_symlink() or not journal.is_dir():
        raise InvalidSnapshot("capture journal must be a regular directory")
    grids = {kind: {read_pass: {} for read_pass in PASSES} for kind in HEADERS}
    entries = []
    hashes = {}
    request_ids = set()
    for path in sorted(journal.iterdir()):
        if not re.fullmatch(r"(communes|wilayas|aliases)-(first|second)-\d{4}-\d{4}\.json", path.name):
            raise InvalidSnapshot("journal has an unexpected entry")
        envelope = read_json(path)
        if set(envelope) != {"body", "sha256"} or not isinstance(envelope["body"], dict):
            raise InvalidSnapshot("invalid capture envelope")
        body = envelope["body"]
        if envelope["sha256"] != digest(json_bytes(body)):
            raise InvalidSnapshot("capture checksum mismatch")
        fields = {"schemaVersion", "kind", "pass", "startRow", "endRow", "claimedReadAtUtc", "connectorRequestId", "response"}
        if set(body) != fields or type(body["schemaVersion"]) is not int or body["schemaVersion"] != 1:
            raise InvalidSnapshot("unexpected capture contract")
        kind, read_pass = body["kind"], body["pass"]
        if not isinstance(kind, str) or not isinstance(read_pass, str) or kind not in HEADERS or read_pass not in PASSES:
            raise InvalidSnapshot("invalid capture table or pass")
        validate_timestamp(body["claimedReadAtUtc"])
        if not isinstance(body["connectorRequestId"], str) or not re.fullmatch(r"[A-Za-z0-9-]{1,100}", body["connectorRequestId"]):
            raise InvalidSnapshot("invalid connector request identifier")
        if body["connectorRequestId"] in request_ids:
            raise InvalidSnapshot("connector request identifiers must be distinct for separate reads")
        request_ids.add(body["connectorRequestId"])
        if not isinstance(body["response"], dict):
            raise InvalidSnapshot("invalid captured response")
        rows = rows_for(kind, body["startRow"], body["endRow"], body["response"])
        expected_name = f"{kind}-{read_pass}-{body['startRow']:04d}-{body['endRow']:04d}.json"
        if path.name != expected_name:
            raise InvalidSnapshot("capture filename does not match its bounds")
        grid = grids[kind][read_pass]
        for number, cells in enumerate(rows, start=body["startRow"]):
            if number in grid:
                raise InvalidSnapshot("overlapping captured rows; never resolve by last writer")
            grid[number] = cells
        entries.append(body)
        # Hash canonical journal envelopes; whitespace in the transport is not source CSV bytes.
        hashes[path.name] = digest(json_bytes(envelope))
    return grids, entries, hashes


def status(journal: Path) -> dict:
    grids, entries, hashes = load_journal(journal)
    tables = {}
    matched = True
    for kind in HEADERS:
        first, second = grids[kind]["first"], grids[kind]["second"]
        overlaps = set(first) & set(second)
        if any(first[number] != second[number] for number in overlaps):
            raise InvalidSnapshot(f"{kind}: source changed between passes; start a new capture journal")
        passes = {}
        for read_pass in PASSES:
            missing = sorted(set(range(1, COUNTS[kind] + 2)) - set(grids[kind][read_pass]))
            passes[read_pass] = {
                "capturedDataRows": sum(number > 1 for number in grids[kind][read_pass]),
                "headerCaptured": 1 in grids[kind][read_pass],
                "missingRowCount": len(missing), "nextMissingRow": missing[0] if missing else None,
            }
            matched = matched and not missing
        tables[kind] = {"expectedDataRows": COUNTS[kind], "passes": passes}
    # A second pass must be temporally separate, not the first pass split/interleaved.
    first_times = [datetime.fromisoformat(e["claimedReadAtUtc"].replace("Z", "+00:00")) for e in entries if e["pass"] == "first"]
    second_times = [datetime.fromisoformat(e["claimedReadAtUtc"].replace("Z", "+00:00")) for e in entries if e["pass"] == "second"]
    if second_times and any(tables[kind]["passes"]["first"]["missingRowCount"] for kind in HEADERS):
        raise InvalidSnapshot("second pass requires a complete first pass across every table")
    if second_times and (not first_times or min(second_times) <= max(first_times)):
        raise InvalidSnapshot("second-pass reads must follow all first-pass reads")
    return {"schemaVersion": 1, "assessment": "TWO_COMPLETE_MATCHING_PASSES" if matched else "INCOMPLETE_CAPTURE",
            "readyForPreflight": bool(matched), "sourceSpreadsheetId": SOURCE_ID,
            "journalSha256": digest(json_bytes(hashes)), "chunkCount": len(entries), "tables": tables,
            "captureClaimsIndependentlyVerified": False, "originalCsvByteIdentityVerified": False,
            "databaseImportAuthorized": False, "activated": False}


def add_read(journal: Path, kind: str, read_pass: str, start: int, end: int,
             response: dict, read_at: str, request_id: str) -> dict:
    validate_timestamp(read_at)
    if read_pass not in PASSES or kind not in HEADERS:
        raise InvalidSnapshot("unknown capture table or pass")
    if not isinstance(request_id, str) or not re.fullmatch(r"[A-Za-z0-9-]{1,100}", request_id):
        raise InvalidSnapshot("invalid connector request identifier")
    rows_for(kind, start, end, response)
    current = status(journal)
    grids, entries, _ = load_journal(journal)
    if any(e["connectorRequestId"] == request_id for e in entries):
        raise InvalidSnapshot("connector request identifiers must be distinct for separate reads")
    if any(number in grids[kind][read_pass] for number in range(start, end + 1)):
        raise InvalidSnapshot("capture overlaps an existing chunk; existing reads are never replaced")
    if read_pass == "second":
        if any(current["tables"][table]["passes"]["first"]["missingRowCount"] for table in HEADERS):
            raise InvalidSnapshot("complete the entire first pass before starting the second")
        if any(datetime.fromisoformat(read_at.replace("Z", "+00:00")) <= datetime.fromisoformat(e["claimedReadAtUtc"].replace("Z", "+00:00"))
               for e in entries if e["pass"] == "first"):
            raise InvalidSnapshot("second-pass read time must follow every first-pass read")
        for number, row in enumerate(rows_for(kind, start, end, response), start=start):
            if row != grids[kind]["first"][number]:
                raise InvalidSnapshot(f"{kind}: source changed between passes; start a new capture journal")
    elif any(e["pass"] == "second" for e in entries):
        raise InvalidSnapshot("first pass is closed after the second pass starts")
    body = {"schemaVersion": 1, "kind": kind, "pass": read_pass, "startRow": start, "endRow": end,
            "claimedReadAtUtc": read_at, "connectorRequestId": request_id, "response": response}
    envelope = {"body": body, "sha256": digest(json_bytes(body))}
    path = journal / f"{kind}-{read_pass}-{start:04d}-{end:04d}.json"
    with path.open("xb") as handle:
        handle.write(json_bytes(envelope))
        handle.flush()
        os.fsync(handle.fileno())
    return status(journal)


def plan(journal: Path, max_rows: int = 50) -> dict:
    """Plan only missing physical rows in the currently permitted read pass.

    Contains no source cells and performs no connector calls. Never schedules a
    second pass before the first is complete, or a range crossing a saved chunk.
    """
    if type(max_rows) is not int or not 1 <= max_rows <= 50:
        raise InvalidSnapshot("planned chunks must contain 1 to 50 physical rows")
    assessment = status(journal)
    grids, _, hashes = load_journal(journal)
    if digest(json_bytes(hashes)) != assessment["journalSha256"]:
        raise InvalidSnapshot("journal changed during validation")
    read_pass = "first" if any(assessment["tables"][kind]["passes"]["first"]["missingRowCount"]
                               for kind in HEADERS) else "second"
    requests = []
    for kind in HEADERS:
        # Alias evidence text is long; use smaller responses to avoid truncation.
        limit = min(max_rows, 20) if kind == "aliases" else max_rows
        row, last = 1, COUNTS[kind] + 1
        saved = grids[kind][read_pass]
        while row <= last:
            if row in saved:
                row += 1
                continue
            start = row
            while row <= last and row not in saved and row - start < limit:
                row += 1
            end = row - 1
            column = chr(ord("A") + len(HEADERS[kind]) - 1)
            requests.append({"table": kind, "pass": read_pass, "startRow": start, "endRow": end,
                             "connectorTool": "batch_get_values", "input": {
                                 "spreadsheet_id": SOURCE_ID,
                                 "ranges": [f"'{TAB_IDENTITIES[kind]['title']}'!A{start}:{column}{end}"],
                                 "major_dimension": "ROWS", "value_render_option": "UNFORMATTED_VALUE",
                                 "date_time_render_option": "FORMATTED_STRING"}})
    return {**assessment, "plannedPass": read_pass, "requestCount": len(requests), "requests": requests,
            "networkRequestsPerformed": False, "liveProfileRecheckStillRequired": True}


def freeze(journal: Path, output: Path) -> dict:
    assessment = status(journal)
    if not assessment["readyForPreflight"]:
        raise InvalidSnapshot("capture incomplete; two full matching passes are required before packaging")
    grids, entries, hashes = load_journal(journal)
    # Recheck the digest of the same immutable loaded values used to make the CSVs.
    if digest(json_bytes(hashes)) != assessment["journalSha256"]:
        raise InvalidSnapshot("journal changed during validation")
    inputs = {}
    for kind in HEADERS:
        stream = io.StringIO(newline="")
        writer = csv.writer(stream, lineterminator="\n")
        writer.writerows(grids[kind]["first"][number] for number in range(1, COUNTS[kind] + 2))
        inputs[kind] = stream.getvalue().encode("utf-8")
    last_read = max(entries, key=lambda e: datetime.fromisoformat(e["claimedReadAtUtc"].replace("Z", "+00:00")))["claimedReadAtUtc"]
    manifest = package(inputs, output, last_read)  # Full existing structural preflight; no weakened production profile.
    return {**assessment, "snapshotId": manifest["snapshotId"], "manifestSha256": digest(json_bytes(manifest)),
            "csvEncoding": "UTF-8, LF, csv.writer quoting; derived from captured cells",
            "claimedCaptureAtUtc": last_read}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    initialize = commands.add_parser("init")
    initialize.add_argument("journal", type=Path)
    check = commands.add_parser("status")
    check.add_argument("journal", type=Path)
    schedule = commands.add_parser("plan")
    schedule.add_argument("journal", type=Path)
    schedule.add_argument("--max-rows", type=int, default=50)
    for command in ("add-read", "add-tool-read"):
        add = commands.add_parser(command)
        add.add_argument("journal", type=Path)
        add.add_argument("--table", choices=HEADERS, required=True)
        add.add_argument("--read-pass", choices=PASSES, required=True)
        add.add_argument("--start-row", type=int, required=True)
        add.add_argument("--end-row", type=int, required=True)
        add.add_argument("--read-at-utc", required=True)
        if command == "add-read":
            add.add_argument("--response", type=Path, required=True)
            add.add_argument("--connector-request-id", required=True)
        else:
            add.add_argument("--tool-result", type=Path, required=True)
    seal = commands.add_parser("freeze")
    seal.add_argument("journal", type=Path)
    seal.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "init":
            args.journal.mkdir(exist_ok=False, parents=False)
            result = status(args.journal)
        elif args.command == "status":
            result = status(args.journal)
        elif args.command == "plan":
            result = plan(args.journal, args.max_rows)
        elif args.command in ("add-read", "add-tool-read"):
            if args.command == "add-tool-read":
                response, request_id = connector_response(read_json(args.tool_result))
            else:
                response, request_id = read_json(args.response), args.connector_request_id
            result = add_read(args.journal, args.table, args.read_pass, args.start_row, args.end_row,
                              response, args.read_at_utc, request_id)
        else:
            result = freeze(args.journal, args.output)
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    except (OSError, ValueError, TypeError, KeyError, RecursionError) as error:
        reason = str(error) if isinstance(error, InvalidSnapshot) else "invalid capture or input/output failure; no existing read is replaced"
        print(json.dumps({"assessment": "INVALID_CAPTURE", "reason": reason, "activated": False}, ensure_ascii=False), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
