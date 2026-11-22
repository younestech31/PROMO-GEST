#!/usr/bin/env python3
"""Validate P1-01 bilingual visual-reading supplements for the 110-case queue and post-1985 acts."""
import csv
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'docs/reference-data'

MASTER = DATA / 'P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv'
QUEUE_110 = DATA / 'P1-01-PRACTITIONER-QUEUE-110.csv'
AR_MAP = DATA / 'P1-01-JO44-ARABIC-IMAGE-ROW-MAP-1541.csv'
READINGS_51 = DATA / 'P1-01-JO44-BILINGUAL-IMAGE-READINGS-51.csv'
READINGS_W41_30 = DATA / 'P1-01-JO44-W41-AND-COLLISION-CONTROLS-30.csv'
FLAGGED_QUEUE_102 = DATA / 'P1-01-JO44-FLAGGED-QUEUE-BILINGUAL-READINGS.csv'
POST_1985_READINGS = DATA / 'P1-01-POST-1985-NAMING-INSTRUMENTS-BILINGUAL-READINGS.csv'

ALLOWED_POST_1985_STATUSES = {
    'BILINGUAL_FR_AR_PNG_VERIFIED',
    'FR_BODY_AND_AR_INDEX_PNG_VERIFIED',
    'AR_BODY_PNG_ONLY_FR_PAGE_MISSING',
    'AR_BODY_PNG_AND_EXISTING_FR_EXTRACTED',
    'INDEX_ONLY_BODY_MISSING',
    'PRIMARY_RENAME_ACT_NOT_IN_CACHE',
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding='utf-8-sig', newline='') as fh:
        return list(csv.DictReader(fh))


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_flagged_queue_readings(
    flagged_rows: list[dict[str, str]],
    *,
    root: Path = ROOT,
    queue_rows: list[dict[str, str]] | None = None,
    master_rows: list[dict[str, str]] | None = None,
    armap_rows: list[dict[str, str]] | None = None,
    readings_51_rows: list[dict[str, str]] | None = None,
    readings_w41_rows: list[dict[str, str]] | None = None,
) -> dict[str, int]:
    queue = queue_rows if queue_rows is not None else read_csv(QUEUE_110)
    master = master_rows if master_rows is not None else read_csv(MASTER)
    armap = armap_rows if armap_rows is not None else read_csv(AR_MAP)
    r51 = readings_51_rows if readings_51_rows is not None else read_csv(READINGS_51)
    rw41 = readings_w41_rows if readings_w41_rows is not None else read_csv(READINGS_W41_30)

    queue_keys = {r['working_row_key'] for r in queue}
    prior_covered = {r['working_row_key'] for r in r51} | {r['working_row_key'] for r in rw41}
    expected_uncovered = queue_keys - prior_covered
    if len(queue_keys) != 110:
        raise ValueError(f'Expected 110 queue keys, got {len(queue_keys)}')
    if len(expected_uncovered) != 102:
        raise ValueError(f'Expected 102 uncovered queue keys, got {len(expected_uncovered)}')

    master_by_key = {r['working_row_key']: r for r in master}
    armap_by_aid = {r['jo44_assertion_id']: r for r in armap}

    seen_keys: set[str] = set()
    seen_aids: set[str] = set()
    sha_cache: dict[str, str] = {}

    def verify_png(rel_path: str, expected_sha: str, field_name: str, row_key: str) -> None:
        if not rel_path or not expected_sha:
            raise ValueError(f'{row_key}: missing {field_name} path or sha256')
        if rel_path not in sha_cache:
            img_path = root / rel_path
            if not img_path.is_file():
                raise ValueError(f'{row_key}: missing PNG file {rel_path}')
            sha_cache[rel_path] = sha256_file(img_path)
        if sha_cache[rel_path] != expected_sha:
            raise ValueError(f'{row_key}: {field_name} sha256 mismatch')

    for row in flagged_rows:
        key = row['working_row_key']
        aid = row['jo44_assertion_id']
        if key in seen_keys:
            raise ValueError(f'Duplicate working_row_key in flagged queue readings: {key}')
        if aid in seen_aids:
            raise ValueError(f'Duplicate jo44_assertion_id in flagged queue readings: {aid}')
        if key in prior_covered:
            raise ValueError(f'Overlap with prior JO44 readings (-51 or W41-30): {key}')
        if key not in expected_uncovered:
            raise ValueError(f'Unexpected working_row_key outside Q110 uncovered set: {key}')
        seen_keys.add(key)
        seen_aids.add(aid)

        m = master_by_key[key]
        am = armap_by_aid[aid]
        if m['jo44_assertion_id'] != aid:
            raise ValueError(f'{key}: jo44_assertion_id mismatch vs master ledger')
        if row['jo44_wilaya_code'] != m['jo44_wilaya_code']:
            raise ValueError(f'{key}: jo44_wilaya_code mismatch vs master ledger')
        if row['code_fr'] != m['jo44_register_code_verbatim']:
            raise ValueError(f'{key}: code_fr mismatch vs master ledger')
        expected_code_ar = '4907' if aid == 'JO44-1985-W39-07' else row['code_fr']
        if row['code_ar'] != expected_code_ar:
            raise ValueError(f'{key}: code_ar must preserve verbatim print ({expected_code_ar})')
        if row['commune_fr_jo44_verbatim'] != m['jo44_commune_name_fr_verbatim']:
            raise ValueError(f'{key}: commune_fr_jo44_verbatim mismatch vs master ledger')
        if row['seat_fr_jo44_verbatim'] != m['jo44_seat_fr_verbatim']:
            raise ValueError(f'{key}: seat_fr_jo44_verbatim mismatch vs master ledger')
        if row['candidate_name_fr'] != m['commune_name_fr_candidate']:
            raise ValueError(f'{key}: candidate_name_fr mismatch vs master ledger')
        if row['candidate_name_ar'] != m['commune_name_ar_candidate']:
            raise ValueError(f'{key}: candidate_name_ar mismatch vs master ledger')
        if row['candidate_arabic_anomaly_flag'] != m['candidate_arabic_anomaly_flag']:
            raise ValueError(f'{key}: candidate_arabic_anomaly_flag mismatch vs master ledger')
        if row['ar_printed_page'] != am['arabic_printed_page_number']:
            raise ValueError(f'{key}: ar_printed_page mismatch vs JO44 Arabic map')
        if row['ar_image'] != am['arabic_image_path']:
            raise ValueError(f'{key}: ar_image mismatch vs JO44 Arabic map')

        if not row['commune_ar_jo44_reading'].strip() or not row['seat_ar_jo44_reading'].strip():
            raise ValueError(f'{key}: incomplete JO44 Arabic reading')
        if not row['visual_check_finding'].strip():
            raise ValueError(f'{key}: missing visual_check_finding')
        if row['practitioner_signoff_status'] != 'PENDING':
            raise ValueError(f'{key}: practitioner_signoff_status must remain PENDING')

        fr_pg = int(row['fr_printed_page'])
        expected_fr_img = f'.tmp-joradp/jo44_fr_pdf{fr_pg - 1044:02d}.png'
        if row['fr_image'] != expected_fr_img:
            raise ValueError(f'{key}: fr_image mismatch for page {fr_pg}')

        verify_png(row['fr_image'], row['fr_image_png_sha256'], 'fr_image_png', key)
        verify_png(row['ar_image'], row['ar_image_png_sha256'], 'ar_image_png', key)

    if seen_keys != expected_uncovered:
        missing = sorted(expected_uncovered - seen_keys)
        raise ValueError(f'Missing uncovered Q110 rows: {missing[:5]}')

    return {
        'q110_total': len(queue_keys),
        'prior_covered_in_q110': len(queue_keys & prior_covered),
        'supplement_rows': len(flagged_rows),
        'unique_png_files_verified': len(sha_cache),
    }


def validate_post_1985_readings(
    post_rows: list[dict[str, str]],
    *,
    root: Path = ROOT,
    master_rows: list[dict[str, str]] | None = None,
) -> dict[str, int]:
    master = master_rows if master_rows is not None else read_csv(MASTER)
    master_by_key = {r['working_row_key']: r for r in master}

    seen_ids: set[str] = set()
    sha_cache: dict[str, str] = {}
    status_counts: dict[str, int] = {}

    def verify_optional_png(path_col: str, sha_col: str, row: dict[str, str], required: bool) -> None:
        rel_path = row[path_col].strip()
        sha = row[sha_col].strip()
        rid = row['record_id']
        if required and (not rel_path or not sha):
            raise ValueError(f'{rid}: {path_col} and {sha_col} are required for status {row["evidence_status"]}')
        if bool(rel_path) != bool(sha):
            raise ValueError(f'{rid}: {path_col} and {sha_col} must both be populated or both blank')
        if rel_path:
            if rel_path not in sha_cache:
                img = root / rel_path
                if not img.is_file():
                    raise ValueError(f'{rid}: missing PNG file {rel_path}')
                sha_cache[rel_path] = sha256_file(img)
            if sha_cache[rel_path] != sha:
                raise ValueError(f'{rid}: {sha_col} sha256 mismatch')

    for row in post_rows:
        rid = row['record_id']
        if not rid or rid in seen_ids:
            raise ValueError(f'Duplicate or empty record_id: {rid}')
        seen_ids.add(rid)

        status = row['evidence_status']
        if status not in ALLOWED_POST_1985_STATUSES:
            raise ValueError(f'{rid}: unexpected evidence_status {status}')
        status_counts[status] = status_counts.get(status, 0) + 1

        if row['practitioner_signoff_status'] != 'PENDING':
            raise ValueError(f'{rid}: practitioner_signoff_status must remain PENDING')

        key = row['working_row_key']
        aid = row['jo44_assertion_id']
        if key != 'W21-TERRITORIAL-KANOUA-CHARAIA':
            if key not in master_by_key:
                raise ValueError(f'{rid}: unknown working_row_key {key}')
            m = master_by_key[key]
            if m['jo44_assertion_id'] != aid:
                raise ValueError(f'{rid}: jo44_assertion_id mismatch vs master ledger')
            if row['jo44_code'] != m['jo44_register_code_verbatim']:
                raise ValueError(f'{rid}: jo44_code mismatch vs master ledger')

        need_fr = status in {'BILINGUAL_FR_AR_PNG_VERIFIED', 'FR_BODY_AND_AR_INDEX_PNG_VERIFIED', 'INDEX_ONLY_BODY_MISSING'}
        need_ar = status in {
            'BILINGUAL_FR_AR_PNG_VERIFIED',
            'FR_BODY_AND_AR_INDEX_PNG_VERIFIED',
            'AR_BODY_PNG_ONLY_FR_PAGE_MISSING',
            'AR_BODY_PNG_AND_EXISTING_FR_EXTRACTED',
            'INDEX_ONLY_BODY_MISSING',
        }
        verify_optional_png('fr_image_path', 'fr_image_png_sha256', row, need_fr)
        verify_optional_png('ar_image_path', 'ar_image_png_sha256', row, need_ar)

        if status == 'PRIMARY_RENAME_ACT_NOT_IN_CACHE' and (row['fr_image_path'] or row['ar_image_path']):
            raise ValueError(f'{rid}: PRIMARY_RENAME_ACT_NOT_IN_CACHE must not carry image paths')

    return {
        'total_records': len(post_rows),
        'unique_png_files_verified': len(sha_cache),
        **status_counts,
    }


def main() -> None:
    fq_stats = validate_flagged_queue_readings(read_csv(FLAGGED_QUEUE_102))
    pni_stats = validate_post_1985_readings(read_csv(POST_1985_READINGS))
    print(
        'P1-01 bilingual supplements validated: '
        f"Q110 coverage = {fq_stats['prior_covered_in_q110']} (existing -51/W41-30) + "
        f"{fq_stats['supplement_rows']} (supplement) = {fq_stats['q110_total']}/110; "
        f"post-1985 records = {pni_stats['total_records']} "
        f"({pni_stats.get('BILINGUAL_FR_AR_PNG_VERIFIED', 0)} bilingual PNG verified, "
        f"{pni_stats.get('PRIMARY_RENAME_ACT_NOT_IN_CACHE', 0)} unlocated in cache); "
        'practitioner_signoff_status = PENDING across all rows.'
    )


if __name__ == '__main__':
    main()
