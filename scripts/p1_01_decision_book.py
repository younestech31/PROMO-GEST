#!/usr/bin/env python3
"""Initialize once, or validate the editable P1-01 decision book. Never import or sign."""
import argparse
import csv
import re
from datetime import date
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / 'docs/reference-data'
BOOK = DATA / 'P1-01-DECISION-BOOK-1541.csv'
KEY = 'working_row_key'
PRIORITY = ('W08-R012', 'W35-R023', 'W36-R016')
OUTCOME = ('review_code', 'review_parent', 'review_name_ar', 'review_name_fr', 'review_seat',
           'valid_from', 'valid_to', 'decision_reason', 'evidence_reference', 'reviewer', 'review_date')


def indexed(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        result = {}
        for row in csv.DictReader(f):
            key = row[KEY]
            if not key or key in result or None in row or None in row.values():
                raise ValueError(f'{path.name}: duplicate key or malformed row: {key}')
            result[key] = row
        return result


def proposals():
    master = indexed(DATA / 'P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv')
    queue = indexed(DATA / 'P1-01-PRACTITIONER-QUEUE-110.csv')
    pages = indexed(DATA / 'P1-01-JO44-ARABIC-IMAGE-ROW-MAP-1541.csv')
    explicit = {k for k, r in master.items() if r['decision_class'] == 'EXPLICIT_PRACTITIONER_DECISION_REQUIRED'}
    if (len(master) != 1541 or set(pages) != set(master) or len(queue) != 110 or set(queue) != explicit
            or not set(PRIORITY) <= explicit):
        raise ValueError('Source populations do not match')
    result = {}
    for key in sorted(master, key=lambda k: (k not in PRIORITY, k not in queue, k)):
        m, q, page = master[key], queue.get(key, {}), pages[key]
        if page['jo44_assertion_id'] != m['jo44_assertion_id']:
            raise ValueError(f'{key}: wrong historical page locator')
        result[key] = {
            KEY: key, 'decision_class': m['decision_class'],
            **{f: m[f] for f in ('commune_name_ar_candidate', 'commune_name_fr_candidate', 'wilaya_code_candidate',
                                 'jo44_assertion_id', 'jo44_register_code_verbatim', 'jo44_commune_name_fr_verbatim',
                                 'jo44_seat_fr_verbatim', 'jo44_printed_page_fr')},
            'jo44_ar_page_locator_only': page['arabic_image_path'],
            'arabic_source_reading_with_limits': m['official_arabic_verified_form'],
            'ledger_code_proposal': m['proposed_canonical_code'],
            'proposed_code': q.get('review_code_proposal', m['proposed_canonical_code']),
            'proposed_parent': q.get('review_parent_proposal', m['wilaya_code_candidate']),
            'proposal_rationale': m['resolution_rationale'],
            **{f: q.get(f, '') for f in ('conflict_source_ar_pdf', 'conflict_printed_page_ar', 'conflict_source_pdf_sha256')},
        }
    return result


def initialize(path, source):
    # Exclusive creation: never truncate a practitioner's decisions.
    with path.open('x', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=[*next(iter(source.values())), 'work_status', *OUTCOME, 'open_question'],
                           lineterminator='\n')
        w.writeheader()
        for row in source.values():
            w.writerow({**row, 'work_status': 'PENDING'})


def validate(path, source):
    records = indexed(path)
    if records.keys() != source.keys():
        raise ValueError('Missing or unexpected commune key')
    recorded_codes = {}
    for key, fixed in source.items():
        r = records[key]
        if (set(r) != {*fixed, 'work_status', *OUTCOME, 'open_question'} or
                any(r[k] != v for k, v in fixed.items())):
            raise ValueError(f'{key}: evidence or column mismatch; do not regenerate over existing decisions')
        status = r['work_status']
        if status in ('PENDING', 'NEEDS_EVIDENCE'):
            if any(r[f] for f in OUTCOME) or (status == 'NEEDS_EVIDENCE' and not r['open_question'].strip()):
                raise ValueError(f'{key}: document the open question separately from a decision')
        elif status == 'DECISION_RECORDED':  # an analysis record, not an authenticated signature
            required = set(OUTCOME) - {'valid_to', 'review_seat'}
            if not all(r[f].strip() for f in required) or r['open_question'].strip():
                raise ValueError(f'{key}: incomplete decision or unresolved question')
            if not (re.fullmatch('[0-9]{4}', r['review_code']) and r['review_code'] != '1600'
                    and r['review_parent'] in {f'{i:02}' for i in range(1, 70)}
                    and r['review_code'].startswith(r['review_parent'])):
                raise ValueError(f'{key}: invalid code or parent')
            start = date.fromisoformat(r['valid_from'])
            date.fromisoformat(r['review_date'])
            end = date.fromisoformat(r['valid_to']) if r['valid_to'] else date.max
            if end <= start:
                raise ValueError(f'{key}: invalid half-open validity interval')
            other = recorded_codes.setdefault(r['review_code'], key)
            if other != key:
                raise ValueError(f"{r['review_code']}: code assigned to both {other} and {key}")
        else:
            raise ValueError(f'{key}: unknown work status (no sign-off permitted here)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--init', action='store_true', help='create only if absent; default is read-only validation')
    args = parser.parse_args()
    try:
        source = proposals()
        if args.init:
            initialize(BOOK, source)
        validate(BOOK, source)
    except (ValueError, OSError) as e:
        parser.exit(1, f'Decision book: {e}\n')
    print('1,541 decision records checked. No sign-off or import performed.')
