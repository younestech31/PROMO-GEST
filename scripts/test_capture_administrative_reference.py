"""Synthetic tests for the capture journal, not evidence of live source completion."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from administrative_reference_preflight import HEADERS, SOURCE_ID, InvalidSnapshot
from capture_administrative_reference import COUNTS, add_read, digest, freeze, rows_for, status
from package_administrative_reference import TAB_IDENTITIES, json_bytes, verify
from test_administrative_reference_preflight import fixture

FIRST = "2026-11-27T10:00:00Z"
SECOND = "2026-11-27T11:00:00Z"


def response(kind, start, end, data):
    column = chr(ord('A') + len(HEADERS[kind]) - 1)
    return {"spreadsheet_id": SOURCE_ID, "value_ranges": [{
        "range": f"'{TAB_IDENTITIES[kind]['title']}'!A{start}:{column}{end}",
        "major_dimension": "ROWS", "values": copy.deepcopy(data[start - 1:end])}]}


class CaptureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.journal = self.root / "journal"
        self.journal.mkdir()
        self.rows = {kind: [HEADERS[kind]] + values for kind, values in fixture().items()}
        self.sequence = 0

    def add(self, kind="communes", start=1, end=3, read_pass="first", data=None, read_at=None):
        self.sequence += 1
        return add_read(self.journal, kind, read_pass, start, end,
                        response(kind, start, end, data or self.rows[kind]),
                        read_at or (FIRST if read_pass == "first" else SECOND), f"synthetic-{self.sequence}")

    def first_complete(self):
        for kind in HEADERS:
            self.add(kind, 1, COUNTS[kind] + 1)

    def complete(self):
        self.first_complete()
        # Different chunk boundaries must compare by physical source row, not file names.
        for kind in HEADERS:
            last = COUNTS[kind] + 1
            self.add(kind, 1, 2, "second")
            self.add(kind, 3, last, "second")

    def test_partial_capture_is_resumable_and_never_a_package(self):
        self.add()
        current = status(self.journal)
        self.assertEqual(current["assessment"], "INCOMPLETE_CAPTURE")
        self.assertEqual(current["tables"]["communes"]["passes"]["first"]["nextMissingRow"], 4)
        self.assertFalse(current["readyForPreflight"])
        output = self.root / "not-a-package"
        with self.assertRaises(InvalidSnapshot):
            freeze(self.journal, output)
        self.assertFalse(output.exists())
        self.add(start=4, end=6)
        self.assertEqual(status(self.journal)["tables"]["communes"]["passes"]["first"]["capturedDataRows"], 5)

    def test_complete_matching_passes_freeze_through_existing_full_preflight(self):
        self.complete()
        output = self.root / "snapshot"
        receipt = freeze(self.journal, output)
        report = verify(output)
        self.assertEqual(receipt["assessment"], "TWO_COMPLETE_MATCHING_PASSES")
        self.assertEqual(report["counts"]["communes"], 1541)
        self.assertFalse(receipt["originalCsvByteIdentityVerified"])
        self.assertFalse(receipt["captureClaimsIndependentlyVerified"])
        self.assertFalse(receipt["databaseImportAuthorized"])
        self.assertFalse(receipt["activated"])
        self.assertEqual(receipt["claimedCaptureAtUtc"], SECOND)
        # Compatible package, no extra journal files smuggled past its strict verifier.
        self.assertEqual(len(list(output.iterdir())), 6)
        with self.assertRaises(FileExistsError):
            freeze(self.journal, output)

    def test_full_rows_but_missing_header_are_incomplete(self):
        self.add(start=2, end=1542)
        first = status(self.journal)["tables"]["communes"]["passes"]["first"]
        self.assertFalse(first["headerCaptured"])
        self.assertEqual(first["capturedDataRows"], 1541)
        self.assertEqual(first["nextMissingRow"], 1)

    def test_neither_overlap_nor_matching_retry_overwrites_existing_read(self):
        self.add()
        before = {p.name: p.read_bytes() for p in self.journal.iterdir()}
        for start, end in ((1, 3), (2, 4)):
            with self.assertRaises(InvalidSnapshot):
                self.add(start=start, end=end)
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.journal.iterdir()})

    def test_second_pass_requires_entire_first_pass_and_later_claimed_time(self):
        self.add()
        with self.assertRaises(InvalidSnapshot):
            self.add(read_pass="second")
        self.add(start=4, end=1542)
        self.add("wilayas", 1, 70)
        self.add("aliases", 1, 152)
        with self.assertRaises(InvalidSnapshot):
            self.add(read_pass="second", read_at=FIRST)
        self.add(read_pass="second")

    def test_reused_connector_request_is_refused_on_add_and_journal_reload(self):
        self.add()
        with self.assertRaises(InvalidSnapshot):
            add_read(self.journal, "communes", "first", 4, 6,
                     response("communes", 4, 6, self.rows["communes"]), FIRST, "synthetic-1")
        self.add(start=4, end=6)
        path = self.journal / "communes-first-0004-0006.json"
        value = json.loads(path.read_bytes())
        value["body"]["connectorRequestId"] = "synthetic-1"
        value["sha256"] = digest(json_bytes(value["body"]))
        path.write_bytes(json_bytes(value))
        with self.assertRaises(InvalidSnapshot):
            status(self.journal)

    def test_reload_rejects_second_pass_when_a_first_pass_chunk_is_missing(self):
        self.first_complete()
        self.add(read_pass="second")
        (self.journal / "wilayas-first-0001-0070.json").unlink()
        with self.assertRaises(InvalidSnapshot):
            status(self.journal)

    def test_source_change_between_passes_fails_without_writing(self):
        self.first_complete()
        changed = copy.deepcopy(self.rows["communes"])
        changed[1][2] += " changed"
        before = len(list(self.journal.iterdir()))
        with self.assertRaises(InvalidSnapshot):
            self.add(read_pass="second", data=changed)
        self.assertEqual(before, len(list(self.journal.iterdir())))

    def test_full_matching_but_structurally_invalid_source_is_not_packaged(self):
        self.rows["communes"][2][0] = self.rows["communes"][1][0]
        self.complete()
        output = self.root / "invalid"
        with self.assertRaises(InvalidSnapshot):
            freeze(self.journal, output)
        self.assertFalse(output.exists())

    def test_omitted_trailing_seat_matches_explicit_blank_without_normalizing_labels(self):
        values = [HEADERS["communes"], ["0101", "01", "Original, FR", "\ufeb3\ufeeeق", "Daira", "دائرة"]]
        row = rows_for("communes", 1, 2, response("communes", 1, 2, values))[1]
        self.assertEqual(row[-1], "")
        self.assertEqual(row[0], "0101")
        self.assertEqual(row[3], "\ufeb3\ufeeeق")
        self.assertEqual(row[2], "Original, FR")

    def test_wrong_workbook_range_dimension_truncated_columns_and_numeric_codes_are_rejected(self):
        original = response("communes", 1, 3, self.rows["communes"])
        variants = []
        bad = copy.deepcopy(original); bad["spreadsheet_id"] = "not-adopted"; variants.append(bad)
        bad = copy.deepcopy(original); bad["truncated"] = True; variants.append(bad)
        bad = copy.deepcopy(original); bad["value_ranges"][0]["range"] += "0"; variants.append(bad)
        bad = copy.deepcopy(original); bad["value_ranges"][0]["major_dimension"] = "COLUMNS"; variants.append(bad)
        bad = copy.deepcopy(original); bad["value_ranges"][0]["values"].pop(); variants.append(bad)
        bad = copy.deepcopy(original); bad["value_ranges"][0]["values"][0].reverse(); variants.append(bad)
        bad = copy.deepcopy(original); bad["value_ranges"][0]["values"][1][0] = 101; variants.append(bad)
        bad = copy.deepcopy(original); bad["value_ranges"][0]["values"][1].append("extra"); variants.append(bad)
        for value in variants:
            with self.subTest(value=value), self.assertRaises(InvalidSnapshot):
                rows_for("communes", 1, 3, value)
        for start, end in ((0, 1), (1, 1543), (True, 3), (3, 1)):
            with self.assertRaises(InvalidSnapshot):
                rows_for("communes", start, end, original)

    def test_checksum_tampering_and_unexpected_or_symlinked_files_fail_closed(self):
        self.add()
        path = next(self.journal.iterdir())
        raw = path.read_bytes()
        value = json.loads(raw)
        value["body"]["claimedReadAtUtc"] = SECOND
        path.write_bytes(json_bytes(value))
        with self.assertRaises(InvalidSnapshot):
            status(self.journal)
        path.write_bytes(raw)
        extra = self.journal / "unexpected.txt"
        extra.write_text("ignored? no")
        with self.assertRaises(InvalidSnapshot):
            status(self.journal)
        extra.unlink()
        path.unlink()
        outside = self.root / "outside.json"
        outside.write_bytes(raw)
        path.symlink_to(outside)
        with self.assertRaises(InvalidSnapshot):
            status(self.journal)

    def test_freeze_detects_changed_journal_between_validation_and_loading(self):
        self.complete()
        assessment = status(self.journal)
        assessment["journalSha256"] = "f" * 64
        with patch("capture_administrative_reference.status", return_value=assessment):
            with self.assertRaises(InvalidSnapshot):
                freeze(self.journal, self.root / "raced")
        self.assertFalse((self.root / "raced").exists())

    def test_duplicate_json_keys_and_cli_errors_are_sanitized(self):
        path = self.root / "PRIVATE-PATH.json"
        path.write_text('{"spreadsheet_id":"a", "spreadsheet_id":"b"}')
        result = subprocess.run([sys.executable, "scripts/capture_administrative_reference.py", "add-read",
                                 str(self.journal), "--table", "communes", "--read-pass", "first",
                                 "--start-row", "1", "--end-row", "2", "--response", str(path),
                                 "--read-at-utc", FIRST, "--connector-request-id", "synthetic"],
                                capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 1)
        self.assertNotIn("PRIVATE-PATH", result.stderr)
        self.assertEqual(json.loads(result.stderr)["assessment"], "INVALID_CAPTURE")
        self.assertEqual(list(self.journal.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
