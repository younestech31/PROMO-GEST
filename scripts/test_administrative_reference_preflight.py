"""Synthetic fixtures only: never evidence of validating the live 1541-row source."""
import copy
import csv
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from administrative_reference_preflight import HEADERS, InvalidSnapshot, build_report
from package_administrative_reference import package, verify


def fixture():
    rows = {kind: [] for kind in HEADERS}
    for wilaya in range(1, 70):
        code = f"{wilaya:02d}"
        count = 23 if wilaya <= 23 else 22
        dairas = 8 if wilaya <= 67 else 7
        rows["wilayas"].append([code, f"Wilaya {code}", f"ولاية {code}", str(dairas), str(count), "SYNTHETIC — not a legal source"])
        for commune in range(1, count + 1):
            group = (commune - 1) % dairas
            rows["communes"].append([f"{code}{commune:02d}", code, f"Commune {code}-{commune}",
                                     f"بلدية {code}-{commune}", f"Daira {group}", f"دائرة {group}",
                                     "نعم" if commune == 1 else ""])
    for row in rows["communes"][:151]:
        rows["aliases"].append([row[0], row[2], f"Alias {row[0]}", row[3], row[3], "SYNTHETIC evidence"])
    return rows


def encode(rows, *, newline="\n", bom=False):
    result = {}
    for kind in HEADERS:
        out = io.StringIO(newline="")
        writer = csv.writer(out, lineterminator=newline)
        writer.writerow(HEADERS[kind])
        writer.writerows(rows[kind])
        result[kind] = ("\ufeff" if bom else "").encode("utf-8") + out.getvalue().encode("utf-8")
    return result


class PreflightTests(unittest.TestCase):
    def setUp(self):
        self.rows = fixture()

    def report(self):
        return build_report(encode(self.rows))

    def test_complete_structural_assessment_is_not_import_or_legal_authorization(self):
        inputs = encode(self.rows)
        report = build_report(inputs)
        self.assertEqual(report["counts"], {"communes": 1541, "wilayas": 69, "aliases": 151,
                         "declaredDairas": 550, "observedDairas": 550,
                         "dairaSeats": {"yes": 69, "no": 0, "unknown": 1472}})
        self.assertFalse(report["databaseImportAuthorized"])
        self.assertFalse(report["historicalBackfillAuthorized"])
        self.assertFalse(report["legalEffectiveDatesVerified"])
        self.assertFalse(report["sourceClaim"]["csvOriginIndependentlyVerified"])
        self.assertEqual(report["inputSha256"]["communes"], hashlib.sha256(inputs["communes"]).hexdigest())

    def test_bom_crlf_and_row_order_change_byte_hash_not_content_hash(self):
        before = self.report()
        for records in self.rows.values():
            records.reverse()
        after = build_report(encode(self.rows, newline="\r\n", bom=True))
        self.assertEqual(before["canonicalContentSha256"], after["canonicalContentSha256"])
        self.assertNotEqual(before["inputSha256"], after["inputSha256"])

    def test_alias_change_changes_digest_without_replacing_source_name(self):
        before = self.report()
        self.rows["aliases"][0][2] = "Modern label"
        after = self.report()
        self.assertNotEqual(before["canonicalContentSha256"], after["canonicalContentSha256"])
        self.assertEqual(self.rows["communes"][0][2], "Commune 01-1")

    def test_known_549_550_residual_is_explicit_warning(self):
        for row in self.rows["communes"]:
            if row[1] == "69" and row[4] == "Daira 6":
                row[4], row[5] = "Daira 5", "دائرة 5"
        report = self.report()
        warning = report["warnings"][0]
        self.assertEqual(warning["code"], "KNOWN_DAIRA_549_550_RESIDUAL")
        self.assertEqual(warning["byWilaya"], [{"wilayaCode": "69", "declared": 7, "observed": 6}])
        self.assertFalse(report["databaseImportAuthorized"])

    def test_blank_is_distinct_from_explicit_no(self):
        self.rows["communes"][1][6] = "لا"
        report = self.report()
        self.assertEqual(report["counts"]["dairaSeats"], {"yes": 69, "no": 1, "unknown": 1471})

    def test_duplicate_codes_fail(self):
        for kind, index in (("communes", 0), ("wilayas", 0), ("aliases", 0)):
            with self.subTest(kind=kind):
                rows = copy.deepcopy(self.rows)
                rows[kind][1][index] = rows[kind][0][index]
                with self.assertRaisesRegex(InvalidSnapshot, "duplicate"):
                    build_report(encode(rows))

    def test_orphans_fail(self):
        for kind, column, value in (("communes", 1, "70"), ("aliases", 0, "9999")):
            with self.subTest(kind=kind):
                rows = copy.deepcopy(self.rows)
                rows[kind][0][column] = value
                with self.assertRaisesRegex(InvalidSnapshot, "unknown"):
                    build_report(encode(rows))

    def test_incomplete_exports_fail(self):
        for kind in HEADERS:
            with self.subTest(kind=kind):
                rows = copy.deepcopy(self.rows)
                rows[kind].pop()
                with self.assertRaisesRegex(InvalidSnapshot, "expected .* records"):
                    build_report(encode(rows))

    def test_lost_leading_zero_and_invalid_seat_fail(self):
        for column, value in ((0, "101"), (6, "false")):
            with self.subTest(column=column):
                rows = copy.deepcopy(self.rows)
                rows["communes"][0][column] = value
                with self.assertRaises(InvalidSnapshot):
                    build_report(encode(rows))

    def test_stale_alias_or_inconsistent_bilingual_daira_fail(self):
        self.rows["aliases"][0][1] = "Stale"
        with self.assertRaisesRegex(InvalidSnapshot, "stale"):
            self.report()
        self.rows = fixture()
        self.rows["communes"][8][5] = "دائرة مختلفة"
        with self.assertRaisesRegex(InvalidSnapshot, "bilingual"):
            self.report()

    def test_per_parent_count_drift_and_non_decimal_declaration_fail(self):
        for column, value in ((4, "24"), (3, "8.0"), (3, "08"), (3, "٨")):
            with self.subTest(column=column, value=value):
                rows = copy.deepcopy(self.rows)
                rows["wilayas"][0][column] = value
                with self.assertRaises(InvalidSnapshot):
                    build_report(encode(rows))

    def test_unexpected_daira_total_fails_even_if_declared_matches(self):
        self.rows["wilayas"][0][3] = "9"
        with self.assertRaisesRegex(InvalidSnapshot, "550"):
            self.report()

    def test_invalid_encoding_header_width_missing_name_and_control_fail_without_echo(self):
        base = encode(self.rows)
        for raw in (b"\xff", b"wrong,header\n", base["communes"] + b"x,y\n"):
            with self.subTest(raw=raw[:20]):
                with self.assertRaises(InvalidSnapshot):
                    build_report({**base, "communes": raw})
        for value in ("", " secret-value ", "secret-value\n", "secret-value\x00"):
            with self.subTest(value=value):
                rows = copy.deepcopy(self.rows)
                rows["communes"][0][2] = value
                with self.assertRaises(InvalidSnapshot) as raised:
                    build_report(encode(rows))
                self.assertNotIn("secret-value", str(raised.exception))

    def test_input_size_limit(self):
        with self.assertRaisesRegex(InvalidSnapshot, "size limit"):
            build_report({**encode(self.rows), "communes": b"x" * (4 * 1024 * 1024 + 1)})


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.inputs = encode(fixture())
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name) / "snapshot"

    def create(self):
        return package(self.inputs, self.output, "2026-11-27T12:00:00Z")

    def test_create_verify_and_no_clobber(self):
        manifest = self.create()
        self.assertFalse(manifest["originalAttachmentByteIdentityVerified"])
        self.assertFalse(manifest["captureTimestampIndependentlyVerified"])
        self.assertEqual(verify(self.output), build_report(self.inputs))
        before = {path.name: path.read_bytes() for path in self.output.iterdir()}
        with self.assertRaises(FileExistsError):
            self.create()
        self.assertEqual(before, {path.name: path.read_bytes() for path in self.output.iterdir()})

    def test_failure_cleans_only_new_partial_directory(self):
        original_open = Path.open
        def failing_open(path, *args, **kwargs):
            if path.name == "manifest.json":
                raise OSError("synthetic disk failure")
            return original_open(path, *args, **kwargs)
        with patch.object(Path, "open", failing_open), self.assertRaises(OSError):
            self.create()
        self.assertFalse(self.output.exists())

    def test_invalid_input_or_timestamp_does_not_create_directory(self):
        for stamp in ("2026-11-27", "2026-11-27T12:00:00+01:00", "2026-11-27T12:00:00", "bad"):
            with self.subTest(stamp=stamp), self.assertRaises(InvalidSnapshot):
                package(self.inputs, self.output, stamp)
            self.assertFalse(self.output.exists())
        with self.assertRaises(InvalidSnapshot):
            package({**self.inputs, "aliases": b"bad"}, self.output, "2026-11-27T12:00:00Z")
        self.assertFalse(self.output.exists())

    def test_every_tampered_file_missing_completion_and_extra_files_fail(self):
        self.create()
        for path in list(self.output.iterdir()):
            raw = path.read_bytes()
            path.write_bytes(raw + b" ")
            with self.subTest(path=path.name), self.assertRaises(InvalidSnapshot):
                verify(self.output)
            path.write_bytes(raw)
        (self.output / "COMPLETE").unlink()
        with self.assertRaises(InvalidSnapshot):
            verify(self.output)
        (self.output / "extra").write_text("unexpected")
        with self.assertRaises(InvalidSnapshot):
            verify(self.output)

    def test_self_consistent_checksums_cannot_substitute_fake_pass_report(self):
        self.create()
        fake_report = b'{"assessment":"STRUCTURAL_PASS"}\n'
        (self.output / "preflight.json").write_bytes(fake_report)
        manifest = json.loads((self.output / "manifest.json").read_bytes())
        manifest["files"]["preflight.json"] = {"bytes": len(fake_report), "sha256": hashlib.sha256(fake_report).hexdigest()}
        from package_administrative_reference import json_bytes
        raw = json_bytes(manifest)
        (self.output / "manifest.json").write_bytes(raw)
        (self.output / "COMPLETE").write_text(hashlib.sha256(raw).hexdigest() + "\n")
        with self.assertRaisesRegex(InvalidSnapshot, "recomputed"):
            verify(self.output)

    def test_symlink_is_not_followed(self):
        self.create()
        path = self.output / "communes.csv"
        outside = Path(self.temp.name) / "outside.csv"
        outside.write_bytes(path.read_bytes())
        path.unlink()
        path.symlink_to(outside)
        with self.assertRaisesRegex(InvalidSnapshot, "symbolic"):
            verify(self.output)

    def test_real_cli_create_verify_and_invalid_exit(self):
        scripts = Path(__file__).resolve().parent
        paths = {}
        for kind, raw in self.inputs.items():
            path = Path(self.temp.name) / f"{kind}.csv"
            path.write_bytes(raw)
            paths[kind] = path
        command = [sys.executable, str(scripts / "package_administrative_reference.py"), "create"]
        for kind, path in paths.items():
            command.extend([f"--{kind}", str(path)])
        command.extend(["--captured-at-utc", "2026-11-27T12:00:00Z", "--output", str(self.output)])
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(subprocess.run(command, capture_output=True, check=False).returncode, 1)
        verify_command = [sys.executable, str(scripts / "package_administrative_reference.py"), "verify", str(self.output)]
        self.assertEqual(subprocess.run(verify_command, capture_output=True, check=False).returncode, 0)
        preflight = [sys.executable, str(scripts / "administrative_reference_preflight.py")]
        for kind, path in paths.items():
            preflight.extend([f"--{kind}", str(path)])
        self.assertEqual(subprocess.run(preflight, capture_output=True, check=False).returncode, 0)
        paths["communes"].write_bytes(b"bad")
        result = subprocess.run(preflight, capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(json.loads(result.stderr)["assessment"], "INVALID_SNAPSHOT")
        self.assertNotIn(str(paths["communes"]), result.stderr)


if __name__ == "__main__":
    unittest.main()
