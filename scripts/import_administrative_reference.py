#!/usr/bin/env python3
"""Prepare or explicitly execute a transactional, NON-ACTIVATING P1-02 import.

Default operations are offline. Execution requires a confirmed database name,
expected snapshot ID, retained identity map and separate PostgreSQL owner login.
Credentials use libpq environment/PGPASSFILE; never command-line connection URLs.
No migration, automatic activation, historical-text rewrite or production approval.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid

from administrative_reference_preflight import HEADERS, MAX_INPUT_BYTES, SOURCE_ID, InvalidSnapshot, load_csv
from package_administrative_reference import json_bytes, read_verified_package

TABLES = (
    "admin_reference_versions", "admin_wilaya_identities", "admin_commune_identities",
    "admin_wilaya_versions", "admin_commune_versions", "admin_commune_aliases",
)
KEYS = {TABLES[0]: "id", TABLES[1]: "id", TABLES[2]: "id",
        TABLES[3]: "snapshot_id, wilaya_id", TABLES[4]: "snapshot_id, commune_id",
        TABLES[5]: "snapshot_id, commune_id"}
LIMITS = {"communes": (4, 2, 256, 256, 256, 256, 3),
          "wilayas": (2, 256, 256, 4, 4, 1000),
          "aliases": (4, 256, 256, 256, 256, 2000)}


def captured_rows(directory: Path) -> tuple[dict, dict, dict, dict[str, list[dict[str, str]]]]:
    manifest, report, blobs = read_verified_package(directory)
    # Never reopen the files: all rows come from precisely the verified bytes.
    rows = {kind: load_csv(blobs[f"{kind}.csv"], kind) for kind in HEADERS}
    for kind, records in rows.items():
        for number, record in enumerate(records, start=2):
            for field, limit in zip(HEADERS[kind], LIMITS[kind], strict=True):
                if len(record[field]) > limit:
                    raise InvalidSnapshot(f"{kind}: record {number}: {field} exceeds storage limit")
    return manifest, report, blobs, rows


def new_identity_map(manifest: dict, rows: dict) -> dict:
    """First import only. Retain this file: re-running init is NOT identity recovery."""
    return {"schemaVersion": 1, "sourceSpreadsheetId": SOURCE_ID, "snapshotId": manifest["snapshotId"],
            "wilayas": {r["wilaya_code"]: str(uuid.uuid4()) for r in rows["wilayas"]},
            "communes": {r["code"]: str(uuid.uuid4()) for r in rows["communes"]}}


def validate_identity_map(raw: bytes, manifest: dict, rows: dict) -> dict:
    try:
        if len(raw) > MAX_INPUT_BYTES:
            raise ValueError
        # Duplicate JSON keys must not silently replace a reviewed UUID.
        def pairs(items):
            result = {}
            for key, value in items:
                if key in result:
                    raise ValueError
                result[key] = value
            return result
        mapping = json.loads(raw, object_pairs_hook=pairs)
        if (set(mapping) != {"schemaVersion", "sourceSpreadsheetId", "snapshotId", "wilayas", "communes"}
                or type(mapping["schemaVersion"]) is not int or mapping["schemaVersion"] != 1
                or mapping["sourceSpreadsheetId"] != SOURCE_ID or mapping["snapshotId"] != manifest["snapshotId"]):
            raise ValueError
        seen = set()
        for kind, key in (("wilayas", "wilaya_code"), ("communes", "code")):
            if not isinstance(mapping[kind], dict) or set(mapping[kind]) != {r[key] for r in rows[kind]}:
                raise ValueError
            for value in mapping[kind].values():
                identity = uuid.UUID(value)
                if str(identity) != value or identity.int == 0 or identity in seen:
                    raise ValueError
                seen.add(identity)
        return mapping
    except (ValueError, KeyError, TypeError, AttributeError, RecursionError) as error:
        raise InvalidSnapshot("identity map is invalid, duplicated or does not match the snapshot") from error


def read_map(path: Path) -> bytes:
    if path.is_symlink() or not path.is_file():
        raise InvalidSnapshot("identity map must be a regular non-symlink file")
    with path.open("rb") as handle:
        return handle.read(MAX_INPUT_BYTES + 1)


def import_records(manifest: dict, report: dict, blobs: dict, rows: dict, mapping: dict) -> dict:
    snapshot = manifest["snapshotId"]
    counts = report["counts"]
    records = {table: [] for table in TABLES}
    records[TABLES[0]] = [{
        "id": snapshot, "canonical_content_sha256": report["canonicalContentSha256"],
        "manifest_sha256": hashlib.sha256(blobs["manifest.json"]).hexdigest(),
        "source_spreadsheet_id": SOURCE_ID, "claimed_capture_at_utc": manifest["claimedCaptureAtUtc"],
        "wilaya_count": counts["wilayas"], "commune_count": counts["communes"],
        "alias_count": counts["aliases"], "declared_daira_count": counts["declaredDairas"],
        "observed_daira_count": counts["observedDairas"],
    }]
    records[TABLES[1]] = [{"id": value} for value in mapping["wilayas"].values()]
    records[TABLES[2]] = [{"id": value} for value in mapping["communes"].values()]
    for row in rows["wilayas"]:
        records[TABLES[3]].append({
            "snapshot_id": snapshot, "wilaya_id": mapping["wilayas"][row["wilaya_code"]],
            "system_code": row["wilaya_code"], "name_fr": row["wilaya_fr"], "name_ar": row["wilaya_ar"],
            "declared_daira_count": int(row["dairas"]), "declared_commune_count": int(row["communes"]),
            "name_ar_source": row["wilaya_ar_source"],
        })
    for row in rows["communes"]:
        records[TABLES[4]].append({
            "snapshot_id": snapshot, "commune_id": mapping["communes"][row["code"]],
            "system_code": row["code"], "name_fr": row["commune_fr"], "name_ar": row["commune_ar"],
            "wilaya_id": mapping["wilayas"][row["wilaya_code"]],
            "daira_name_fr": row["daira_fr"], "daira_name_ar": row["daira_ar"],
            "is_daira_seat": {"": None, "نعم": True, "لا": False}[row["is_daira_seat"]],
            "parent_effective_from": None, "parent_effective_to": None, "parent_date_evidence": None,
        })
    for row in rows["aliases"]:
        records[TABLES[5]].append({
            "snapshot_id": snapshot, "commune_id": mapping["communes"][row["code"]],
            "reference_name_fr": row["ref_fr"], "alias_name_fr": row["alias_fr_2026"],
            "reference_name_ar": row["ref_ar"], "repository_name_ar": row["repo_ar"],
            "evidence": row["evidence"],
        })
    return records


def sql_literal(value: str) -> str:
    # SET standard_conforming_strings=on precedes all data. Fixed SQL identifiers
    # only; source values are JSON within a single-quoted literal, never SQL/psql.
    return "'" + value.replace("'", "''") + "'"


def mismatches(table: str, snapshot: str) -> str:
    field = "id" if table == TABLES[0] else "snapshot_id"
    return (f"EXISTS ((SELECT * FROM pg_temp._p1_02_{table} EXCEPT ALL "
            f"SELECT * FROM public.{table} WHERE {field} = {snapshot}) UNION ALL "
            f"(SELECT * FROM public.{table} WHERE {field} = {snapshot} EXCEPT ALL "
            f"SELECT * FROM pg_temp._p1_02_{table}))")


def build_sql(records: dict, mapping_raw: bytes, operation: str) -> str:
    if operation not in ("stage", "remove"):
        raise InvalidSnapshot("unknown reference operation")
    metadata = records[TABLES[0]][0]
    snapshot = sql_literal(metadata["id"])
    table_names = ", ".join("public." + table for table in TABLES)
    owners = ", ".join(f"'public.{table}'::regclass" for table in TABLES)
    sql = ["-- Generated P1-02 reference operation. Not an activation or approval.",
           "-- Review and retain the verified package and identity map independently.",
           "\\set ON_ERROR_STOP on", "SET standard_conforming_strings = on;", "BEGIN;",
           "SET LOCAL search_path = pg_catalog, pg_temp;", "SET LOCAL lock_timeout = '5s';",
           "SET LOCAL statement_timeout = '120s';", "SET LOCAL client_encoding = 'UTF8';",
           f"""DO $p1_guard$
BEGIN
    IF current_setting('server_version_num')::integer NOT BETWEEN 180000 AND 189999 THEN
        RAISE EXCEPTION 'P1-02 requires reviewed PostgreSQL 18 execution';
    END IF;
    IF current_user = 'promogest_app' OR session_user = 'promogest_app'
       OR EXISTS (SELECT 1 FROM pg_class WHERE oid IN ({owners}) AND NOT pg_has_role(relowner, 'USAGE')) THEN
        RAISE EXCEPTION 'P1-02 requires a separate reference-table owner identity' USING ERRCODE = '42501';
    END IF;
END;
$p1_guard$;""",
           # Hold writes out of all six reference tables, but allow runtime SELECTs.
           f"LOCK TABLE {table_names} IN SHARE ROW EXCLUSIVE MODE;"]
    for table, items in records.items():
        payload = sql_literal(json.dumps(items, ensure_ascii=False, separators=(",", ":")))
        sql += [f"CREATE TEMP TABLE _p1_02_{table} (LIKE public.{table}) ON COMMIT DROP;",
                f"INSERT INTO pg_temp._p1_02_{table} SELECT * FROM jsonb_populate_recordset(NULL::public.{table}, {payload}::jsonb);"]
    sql += ["CREATE TEMP TABLE _p1_02_status (existed boolean) ON COMMIT DROP;",
            f"INSERT INTO pg_temp._p1_02_status SELECT EXISTS (SELECT 1 FROM public.admin_reference_versions WHERE id = {snapshot});"]
    comparisons = " OR\n       ".join(mismatches(table, snapshot) for table in (TABLES[0], *TABLES[3:]))
    # A retry must prove exact values, including metadata/aliases/nulls, not merely
    # counts or a saved checksum. Never silently repair/overwrite partial drift.
    sql += [f"""DO $p1_compare$
BEGIN
    IF (SELECT existed FROM pg_temp._p1_02_status) AND ({comparisons}) THEN
        RAISE EXCEPTION 'P1-02 existing snapshot differs; no rows changed';
    END IF;
END;
$p1_compare$;"""]
    if operation == "stage":
        for registry, versions, identity in ((TABLES[1], TABLES[3], "wilaya_id"), (TABLES[2], TABLES[4], "commune_id")):
            sql += [f"""DO $p1_retained$
BEGIN
    IF EXISTS (SELECT 1 FROM public.{registry} registered
               WHERE NOT EXISTS (SELECT 1 FROM public.{versions} history WHERE history.{identity} = registered.id)
                 AND NOT EXISTS (SELECT 1 FROM pg_temp._p1_02_{registry} incoming WHERE incoming.id = registered.id)) THEN
        RAISE EXCEPTION 'P1-02 unreferenced retained identities require the original reviewed map';
    END IF;
END;
$p1_retained$;"""]
        for table, identity in ((TABLES[3], "wilaya_id"), (TABLES[4], "commune_id")):
            sql += [f"""DO $p1_identity$
BEGIN
    IF EXISTS (SELECT 1 FROM public.{table} old JOIN pg_temp._p1_02_{table} incoming
               ON old.system_code = incoming.system_code WHERE old.{identity} <> incoming.{identity}) THEN
        RAISE EXCEPTION 'P1-02 identity lineage conflict; reuse the retained reviewed map';
    END IF;
END;
$p1_identity$;"""]
        for table in (TABLES[1], TABLES[2], TABLES[0], *TABLES[3:]):
            sql += [f"INSERT INTO public.{table} SELECT * FROM pg_temp._p1_02_{table} ON CONFLICT ({KEYS[table]}) DO NOTHING;"]
        sql += [f"""DO $p1_postcheck$
BEGIN
    IF {comparisons} THEN
        RAISE EXCEPTION 'P1-02 post-import verification differs; transaction aborted';
    END IF;
END;
$p1_postcheck$;"""]
    else:
        # Deliberately retain identities for future imports and other snapshots.
        for table in reversed((TABLES[0], *TABLES[3:])):
            field = "id" if table == TABLES[0] else "snapshot_id"
            sql += [f"DELETE FROM public.{table} WHERE {field} = {snapshot};"]
        remaining = " OR ".join(
            f"EXISTS (SELECT 1 FROM public.{table} WHERE {'id' if table == TABLES[0] else 'snapshot_id'} = {snapshot})"
            for table in (TABLES[0], *TABLES[3:]))
        sql += [f"DO $p1_removed$ BEGIN IF {remaining} THEN RAISE EXCEPTION 'P1-02 removal verification failed'; END IF; END; $p1_removed$;"]
    receipt = {"assessment": "REFERENCE_STAGED" if operation == "stage" else "REFERENCE_REMOVED",
               "snapshotId": metadata["id"], "operation": operation,
               "canonicalContentSha256": metadata["canonical_content_sha256"],
               "manifestSha256": metadata["manifest_sha256"],
               "identityMapSha256": hashlib.sha256(mapping_raw).hexdigest(),
               "wilayas": metadata["wilaya_count"], "communes": metadata["commune_count"],
               "aliases": metadata["alias_count"], "activated": False, "historicalTextRewritten": False,
               "identitiesRetained": True}
    sql += [f"SELECT {sql_literal(json.dumps(receipt, separators=(',', ':')))}::jsonb || jsonb_build_object('snapshotPreviouslyPresent', existed) FROM pg_temp._p1_02_status;",
            "COMMIT;", ""]
    return "\n".join(sql)


def prepare(directory: Path, map_path: Path, expected_snapshot_id: str, operation: str) -> tuple[str, dict]:
    manifest, report, blobs, rows = captured_rows(directory)
    if manifest["snapshotId"] != expected_snapshot_id:
        raise InvalidSnapshot("snapshot differs from the explicitly expected ID")
    mapping_raw = read_map(map_path)
    mapping = validate_identity_map(mapping_raw, manifest, rows)
    sql = build_sql(import_records(manifest, report, blobs, rows, mapping), mapping_raw, operation)
    return sql, {"assessment": "OFFLINE_PLAN_PREPARED", "snapshotId": manifest["snapshotId"],
                 "operation": operation, "sqlSha256": hashlib.sha256(sql.encode("utf-8")).hexdigest(),
                 "identityMapSha256": hashlib.sha256(mapping_raw).hexdigest(),
                 "counts": report["counts"], "warnings": report["warnings"],
                 "databaseConnected": False, "activated": False}


def write_new(path: Path, raw: bytes) -> None:
    # Exclusive create rejects existing files and dangling symlinks; no clobber.
    with path.open("xb") as handle:
        handle.write(raw)
        handle.flush()
        os.fsync(handle.fileno())


def execute(sql: str, database: str, confirmation: str) -> dict:
    if database != confirmation or not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", database):
        raise InvalidSnapshot("execution requires an exact confirmed simple database name, not a URL/connection string")
    try:
        result = subprocess.run(
            ["psql", "--no-psqlrc", "--no-password", "--quiet", "--tuples-only", "--no-align",
             "--set", "ON_ERROR_STOP=1", "--dbname", database],
            input=sql, encoding="utf-8", stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            timeout=180, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        # A disconnected COMMIT may have succeeded. Do not claim rollback/retry.
        raise InvalidSnapshot("database command unavailable/interrupted; outcome unconfirmed, inspect target before proceeding") from error
    if result.returncode != 0:
        # psql diagnostics may contain data/connection details; never echo them.
        raise InvalidSnapshot("database command failed; outcome unconfirmed, inspect target before proceeding")
    try:
        receipt = json.loads(result.stdout)
        if receipt["assessment"] not in ("REFERENCE_STAGED", "REFERENCE_REMOVED"):
            raise ValueError
        return receipt
    except (ValueError, KeyError, TypeError) as error:
        raise InvalidSnapshot("database receipt invalid; outcome unconfirmed, inspect target before proceeding") from error


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    identities = commands.add_parser("init-identities", help="First import ONLY; retain/review this map, do not regenerate for later snapshots")
    identities.add_argument("--snapshot", type=Path, required=True)
    identities.add_argument("--output", type=Path, required=True)
    for command in ("plan", "execute"):
        sub = commands.add_parser(command)
        sub.add_argument("--snapshot", type=Path, required=True)
        sub.add_argument("--identity-map", type=Path, required=True)
        sub.add_argument("--expected-snapshot-id", required=True)
        sub.add_argument("--operation", choices=("stage", "remove"), default="stage")
        if command == "plan":
            sub.add_argument("--output", type=Path, required=True)
        else:
            sub.add_argument("--database", required=True)
            sub.add_argument("--confirm-database", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "init-identities":
            manifest, _, _, rows = captured_rows(args.snapshot)
            write_new(args.output, json_bytes(new_identity_map(manifest, rows)))
            result = {"assessment": "IDENTITY_MAP_CREATED_OFFLINE", "snapshotId": manifest["snapshotId"],
                      "databaseConnected": False, "retainMapForFutureImports": True}
        else:
            sql, result = prepare(args.snapshot, args.identity_map, args.expected_snapshot_id, args.operation)
            if args.command == "plan":
                write_new(args.output, sql.encode("utf-8"))
            else:
                result = execute(sql, args.database, args.confirm_database)
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 0
    except (InvalidSnapshot, OSError) as error:
        reason = str(error) if isinstance(error, InvalidSnapshot) else "input/output failed; existing outputs are never replaced"
        print(json.dumps({"assessment": "REFERENCE_OPERATION_FAILED", "reason": reason,
                          "activated": False}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
