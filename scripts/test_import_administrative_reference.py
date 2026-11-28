"""Full-size SYNTHETIC fixtures only; not evidence of importing the adopted source.

Database cases opt in with P1_02_TEST_DATABASE=promogest_reference_import_test.
They destructively reset only the six reference tables in that dedicated database.
CI creates/migrates it separately from runtime/browser fixtures. No live Sheets.
"""
from __future__ import annotations

import copy
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import uuid

from administrative_reference_preflight import InvalidSnapshot
import import_administrative_reference as importer
from package_administrative_reference import json_bytes, package, read_verified_package, verify
from test_administrative_reference_preflight import encode, fixture


class ImportFixtures(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.rows = fixture()
        # Distinguish unknown/false/true and exercise SQL/psql metacharacters.
        self.rows["communes"][1][6] = "لا"
        self.rows["communes"][-1][2] = "O'Brien \\set x '); DROP TABLE users; --"
        self.snapshot = self.root / "snapshot"
        self.manifest = package(encode(self.rows), self.snapshot, "2026-11-27T12:00:00Z")
        _, _, _, rows = importer.captured_rows(self.snapshot)
        self.mapping = importer.new_identity_map(self.manifest, rows)
        self.map_path = self.root / "identities.json"
        self.map_path.write_bytes(json_bytes(self.mapping))
        self.snapshot_id = self.manifest["snapshotId"]

    def plan(self, operation="stage"):
        return importer.prepare(self.snapshot, self.map_path, self.snapshot_id, operation)


class OfflineImportTests(ImportFixtures):
    def test_complete_retained_unique_nonzero_identity_map(self):
        identities = [*self.mapping["wilayas"].values(), *self.mapping["communes"].values()]
        self.assertEqual(len(identities), 1610)
        self.assertEqual(len(set(identities)), 1610)
        self.assertTrue(all(uuid.UUID(value).int for value in identities))
        sql, report = self.plan()
        self.assertEqual(report["assessment"], "OFFLINE_PLAN_PREPARED")
        self.assertFalse(report["databaseConnected"])
        self.assertIn("LOCK TABLE public.admin_reference_versions", sql)
        self.assertIn("ON CONFLICT (snapshot_id, commune_id) DO NOTHING", sql)
        self.assertNotIn("DO UPDATE", sql)
        self.assertIn("COMMIT;", sql)
        self.assertEqual(self.plan()[0], sql)
        self.assertEqual(report["counts"]["communes"], 1541)
        self.assertEqual(report["counts"]["dairaSeats"], {"yes": 69, "no": 1, "unknown": 1471})

    def test_map_rejects_duplicate_missing_zero_invalid_and_mismatched_values(self):
        invalid = []
        for mode in ("duplicate", "zero", "invalid", "missing", "extra", "snapshot", "source"):
            mapping = copy.deepcopy(self.mapping)
            if mode == "duplicate":
                mapping["communes"]["0102"] = mapping["communes"]["0101"]
            elif mode == "zero":
                mapping["communes"]["0101"] = str(uuid.UUID(int=0))
            elif mode == "invalid":
                mapping["communes"]["0101"] = "not-a-uuid"
            elif mode == "missing":
                del mapping["communes"]["0101"]
            elif mode == "extra":
                mapping["communes"]["9999"] = str(uuid.uuid4())
            elif mode == "snapshot":
                mapping["snapshotId"] = "wrong"
            else:
                mapping["sourceSpreadsheetId"] = "wrong"
            invalid.append(json_bytes(mapping))
        invalid.append(json_bytes(self.mapping).replace(b'"schemaVersion": 1', b'"schemaVersion": 1, "schemaVersion": 1'))
        _, _, _, rows = importer.captured_rows(self.snapshot)
        for raw in invalid:
            with self.assertRaises(InvalidSnapshot):
                importer.validate_identity_map(raw, self.manifest, rows)

    def test_tampering_and_expected_snapshot_rejected_before_database(self):
        with self.assertRaisesRegex(InvalidSnapshot, "explicitly expected"):
            importer.prepare(self.snapshot, self.map_path, "wrong", "stage")
        with (self.snapshot / "communes.csv").open("ab") as handle:
            handle.write(b"tamper")
        with patch.object(importer.subprocess, "run") as run:
            with self.assertRaises(InvalidSnapshot):
                self.plan()
            run.assert_not_called()

    def test_does_not_reopen_verified_files(self):
        original = read_verified_package(self.snapshot)
        def race(_):
            (self.snapshot / "communes.csv").write_bytes(b"tamper after verified read")
            return original
        with patch.object(importer, "read_verified_package", side_effect=race):
            sql, _ = self.plan()
        self.assertIn("O''Brien", sql)
        self.assertNotIn("tamper after verified read", sql)
        with self.assertRaises(InvalidSnapshot):
            verify(self.snapshot)

    def test_storage_limits_fail_offline(self):
        self.rows["communes"][-1][2] = "x" * 257
        snapshot = self.root / "long"
        package(encode(self.rows), snapshot, "2026-11-27T12:00:00Z")
        with self.assertRaisesRegex(InvalidSnapshot, "storage limit"):
            importer.captured_rows(snapshot)

    def test_plan_and_init_commands_are_offline_and_nonclobbering(self):
        output = self.root / "plan.sql"
        args = ["plan", "--snapshot", str(self.snapshot), "--identity-map", str(self.map_path),
                "--expected-snapshot-id", self.snapshot_id, "--output", str(output)]
        with patch.object(importer.subprocess, "run") as run, patch("sys.stdout", new_callable=io.StringIO):
            self.assertEqual(importer.main(args), 0)
            run.assert_not_called()
        before = output.read_bytes()
        with patch("sys.stderr", new_callable=io.StringIO):
            self.assertEqual(importer.main(args), 1)
        self.assertEqual(output.read_bytes(), before)
        args = ["init-identities", "--snapshot", str(self.snapshot), "--output", str(self.map_path)]
        with patch("sys.stderr", new_callable=io.StringIO):
            self.assertEqual(importer.main(args), 1)
        self.assertEqual(json.loads(self.map_path.read_bytes()), self.mapping)

    def test_no_sql_identifier_or_shell_interpolation_of_source(self):
        sql, _ = self.plan()
        self.assertIn("O''Brien", sql)
        self.assertIn("SET standard_conforming_strings = on;", sql)
        self.assertIn('"parent_effective_from":null', sql)
        self.assertIn('"is_daira_seat":false', sql)
        self.assertIn('"is_daira_seat":null', sql)
        self.assertNotIn("UPDATE public.", sql)
        self.assertNotIn("INSERT INTO public.organizations", sql)

    def test_execute_requires_confirmed_simple_database_name(self):
        for database, confirmation in (("db", "other"), ("postgresql://secret@host/db", "postgresql://secret@host/db"),
                                       ("dbname=x password=y", "dbname=x password=y")):
            with patch.object(importer.subprocess, "run") as run:
                with self.assertRaises(InvalidSnapshot):
                    importer.execute("not executed", database, confirmation)
                run.assert_not_called()

    def test_database_errors_and_timeouts_are_sanitized_without_retry_or_rollback_claim(self):
        for outcome in (subprocess.CompletedProcess([], 1, "private row", "secret connection/row"),
                        subprocess.TimeoutExpired("psql", 180, output="private row", stderr="secret")):
            with patch.object(importer.subprocess, "run") as run:
                if isinstance(outcome, Exception):
                    run.side_effect = outcome
                else:
                    run.return_value = outcome
                with self.assertRaisesRegex(InvalidSnapshot, "outcome unconfirmed") as failure:
                    importer.execute("BEGIN;COMMIT;", "disposable", "disposable")
                self.assertNotIn("secret", str(failure.exception))
                self.assertNotIn("private", str(failure.exception))
                run.assert_called_once()

    def test_remove_preserves_identity_registries_and_checks_exact_values(self):
        sql, report = self.plan("remove")
        self.assertEqual(report["operation"], "remove")
        self.assertIn("existing snapshot differs", sql)
        self.assertIn("removal verification failed", sql)
        self.assertNotIn("DELETE FROM public.admin_commune_identities", sql)
        self.assertNotIn("DELETE FROM public.admin_wilaya_identities", sql)
        self.assertNotIn("TRUNCATE", sql)
        self.assertLess(sql.index("DELETE FROM public.admin_commune_aliases"), sql.index("DELETE FROM public.admin_reference_versions"))


@unittest.skipUnless(os.environ.get("P1_02_TEST_DATABASE"), "PG18 disposable database not configured")
class PostgresImportTests(ImportFixtures):
    def setUp(self):
        super().setUp()
        self.database = os.environ["P1_02_TEST_DATABASE"]
        if self.database != "promogest_reference_import_test":
            raise RuntimeError("Refuse destructive tests outside the dedicated reference-import database")
        actual = self.query("SELECT current_database()")
        self.assertEqual(actual, self.database)
        self.psql("TRUNCATE " + ", ".join("public." + table for table in importer.TABLES) + " CASCADE;")

    def psql(self, sql, *, env=None, check=True):
        result = subprocess.run(["psql", "-X", "-w", "-qAt", "-v", "ON_ERROR_STOP=1", "-d", self.database],
                                input=sql, encoding="utf-8", capture_output=True, timeout=60, env=env)
        if check and result.returncode:
            # Synthetic fixtures only; fail with useful DB diagnostics in CI.
            self.fail(result.stderr)
        return result

    def query(self, sql):
        return self.psql(sql).stdout.strip()

    def execute(self, operation="stage"):
        sql, _ = self.plan(operation)
        return importer.execute(sql, self.database, self.database)

    def stage_next(self):
        rows = copy.deepcopy(self.rows)
        # Swap explicit parents without changing per-wilaya counts or deriving
        # parenthood from the commune-code prefix. Legal dates remain unknown.
        other = next(row for row in rows["communes"] if row[0] == "0201")
        rows["communes"][0][1], other[1] = other[1], rows["communes"][0][1]
        directory = self.root / "next"
        manifest = package(encode(rows), directory, "2026-11-27T13:00:00Z")
        mapping = copy.deepcopy(self.mapping)
        mapping["snapshotId"] = manifest["snapshotId"]
        map_path = self.root / "next-identities.json"
        map_path.write_bytes(json_bytes(mapping))
        sql, _ = importer.prepare(directory, map_path, manifest["snapshotId"], "stage")
        importer.execute(sql, self.database, self.database)
        return manifest["snapshotId"]

    def test_full_size_stage_retry_counts_labels_unknowns_and_no_implicit_activation(self):
        receipt = self.execute()
        self.assertEqual(receipt["assessment"], "REFERENCE_STAGED")
        self.assertFalse(receipt["snapshotPreviouslyPresent"])
        self.assertFalse(receipt["activated"])
        self.assertTrue(self.execute()["snapshotPreviouslyPresent"])
        for table, count in zip(importer.TABLES, (1, 69, 1541, 69, 1541, 151), strict=True):
            self.assertEqual(int(self.query(f"SELECT count(*) FROM public.{table}")), count)
        self.assertEqual(self.query("SELECT system_code FROM admin_commune_versions ORDER BY system_code LIMIT 1"), "0101")
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_versions WHERE is_daira_seat IS NULL"), "1471")
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_versions WHERE is_daira_seat = false"), "1")
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_versions WHERE parent_effective_from IS NOT NULL OR parent_effective_to IS NOT NULL OR parent_date_evidence IS NOT NULL"), "0")
        self.assertEqual(self.query("SELECT name_fr FROM admin_commune_versions WHERE system_code = '6922'"), self.rows["communes"][-1][2])
        self.assertEqual(self.query("SELECT declared_daira_count || '/' || observed_daira_count FROM admin_reference_versions"), "550/550")
        self.assertEqual(self.query("SELECT to_regclass('public.users') IS NOT NULL"), "t")

    def test_reuse_identities_across_versions_and_remove_only_exact_snapshot(self):
        self.execute()
        next_snapshot = self.stage_next()
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_identities"), "1541")
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_versions"), "3082")
        snapshot_literal = importer.sql_literal(next_snapshot)
        self.assertEqual(self.query(f"SELECT w.system_code FROM admin_commune_versions c JOIN admin_wilaya_versions w ON (w.snapshot_id,w.wilaya_id)=(c.snapshot_id,c.wilaya_id) WHERE c.snapshot_id={snapshot_literal} AND c.system_code='0101'"), "02")
        self.assertTrue(self.execute("remove")["snapshotPreviouslyPresent"])
        self.assertFalse(self.execute("remove")["snapshotPreviouslyPresent"])
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_versions"), "1541")
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_identities"), "1541")
        self.assertFalse(self.execute()["snapshotPreviouslyPresent"])
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_versions"), "3082")

    def test_new_identity_map_drift_and_repackaged_metadata_fail_closed(self):
        self.execute()
        original = self.map_path.read_bytes()
        changed = copy.deepcopy(self.mapping)
        changed["communes"]["0101"] = str(uuid.uuid4())
        self.map_path.write_bytes(json_bytes(changed))
        for operation in ("stage", "remove"):
            with self.assertRaises(InvalidSnapshot):
                self.execute(operation)
        self.map_path.write_bytes(original)
        repacked = self.root / "repacked"
        package(encode(self.rows), repacked, "2026-11-27T13:00:00Z")
        sql, _ = importer.prepare(repacked, self.map_path, self.snapshot_id, "stage")
        with self.assertRaises(InvalidSnapshot):
            importer.execute(sql, self.database, self.database)
        self.psql("UPDATE admin_commune_versions SET name_fr = 'drift' WHERE system_code='0101'")
        with self.assertRaises(InvalidSnapshot):
            self.execute()
        self.assertEqual(self.query("SELECT name_fr FROM admin_commune_versions WHERE system_code='0101'"), "drift")
        self.assertEqual(self.query("SELECT count(*) FROM admin_reference_versions"), "1")

    def test_new_snapshot_cannot_reallocate_previously_known_code_identities(self):
        self.execute()
        rows = copy.deepcopy(self.rows)
        rows["communes"][-1][2] += " changed"
        directory = self.root / "new-version"
        manifest = package(encode(rows), directory, "2026-11-27T13:00:00Z")
        _, _, _, captured = importer.captured_rows(directory)
        fresh_map = self.root / "wrong-new-identities.json"
        fresh_map.write_bytes(json_bytes(importer.new_identity_map(manifest, captured)))
        sql, _ = importer.prepare(directory, fresh_map, manifest["snapshotId"], "stage")
        with self.assertRaises(InvalidSnapshot):
            importer.execute(sql, self.database, self.database)
        self.assertEqual(self.query("SELECT count(*) FROM admin_reference_versions"), "1")
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_identities"), "1541")

    def test_late_failure_rolls_back_all_new_rows_and_preserves_historical_text(self):
        # Migration's ordinary application table is outside this importer write set.
        self.psql("""INSERT INTO system_settings(id,key,value,category,is_encrypted,created_at_utc,updated_at_utc,concurrency_stamp)
            VALUES ('11111111-1111-4111-8111-111111111111','p1-02-fixture','نص تاريخي / Original text','General',false,now(),now(),'22222222-2222-4222-8222-222222222222')
            ON CONFLICT (key) DO NOTHING;""")
        sql, _ = self.plan()
        failed = self.psql(sql.replace("COMMIT;", "SELECT 1/0;\nCOMMIT;"), check=False)
        self.assertNotEqual(failed.returncode, 0)
        for table in importer.TABLES:
            self.assertEqual(self.query(f"SELECT count(*) FROM public.{table}"), "0")
        self.assertEqual(self.query("SELECT value FROM system_settings WHERE key='p1-02-fixture'"), "نص تاريخي / Original text")

    def test_runtime_role_cannot_stage_or_remove(self):
        self.execute()
        environment = {**os.environ, "PGUSER": "promogest_app", "PGPASSWORD": "app_pass"}
        for operation in ("stage", "remove"):
            sql, _ = self.plan(operation)
            result = self.psql(sql, env=environment, check=False)
            self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.query("SELECT count(*) FROM admin_reference_versions"), "1")
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_versions"), "1541")

    def test_removing_last_snapshot_does_not_allow_identity_regeneration(self):
        self.execute()
        self.execute("remove")
        original = self.map_path.read_bytes()
        _, _, _, rows = importer.captured_rows(self.snapshot)
        self.map_path.write_bytes(json_bytes(importer.new_identity_map(self.manifest, rows)))
        with self.assertRaises(InvalidSnapshot):
            self.execute()
        self.assertEqual(self.query("SELECT count(*) FROM admin_reference_versions"), "0")
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_identities"), "1541")
        self.map_path.write_bytes(original)
        self.assertEqual(self.execute()["assessment"], "REFERENCE_STAGED")

    def test_two_concurrent_identical_imports_are_serialized_and_idempotent(self):
        sql, _ = self.plan()
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: importer.execute(sql, self.database, self.database), range(2)))
        self.assertEqual(sorted(x["snapshotPreviouslyPresent"] for x in results), [False, True])
        self.assertEqual(self.query("SELECT count(*) FROM admin_commune_versions"), "1541")


if __name__ == "__main__":
    program = unittest.main(exit=False)
    # Full fixtures are synthetic. Surface useful diagnostics even when Actions
    # artifact/log downloads are unavailable; never run this against real data.
    for test, detail in (*program.result.failures, *program.result.errors):
        message = (test.id() + " — " + detail[-2500:]).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print("::error title=P1-02 synthetic import regression::" + message)
    raise SystemExit(0 if program.result.wasSuccessful() else 1)
