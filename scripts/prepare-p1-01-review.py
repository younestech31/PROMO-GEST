#!/usr/bin/env python3
"""Build the offline practitioner queue, never a runtime seed or a sign-off."""
import argparse
import csv
import io
import re
from collections import Counter
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / 'docs/reference-data'
OUTPUT = DATA / 'P1-01-PRACTITIONER-QUEUE-110.csv'


def rows(suffix):
    with (DATA / f'P1-01-{suffix}.csv').open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def unique(table, column, value):
    matches = [r for r in table if r[column] == value]
    require(len(matches) == 1, f'Expected exactly one evidence record for {column}={value}')
    return matches[0]


def code_evidence():
    lineage = rows('CODE-LINEAGE-CROSSCHECKS')
    result = {}
    for key, eid in [('W35-R023', 'CHABET-1998-REGISTER-AR'), ('W36-R016', 'CHIHANI-1985-REGISTER-AR')]:
        s = unique(lineage, 'evidence_id', eid)
        result[key] = (s['code_four_digit_verbatim'], s['wilaya_code_in_section'], s['commune_label_ar_source'],
                       s['source_url'], s['printed_page'], s['source_pdf_sha256'])
    key = 'W08-R012'
    s = unique(rows('JO79-ARABIC-EXCEPTION-RECONCILIATION'), 'candidate_row_key', key)
    fr = unique(rows('JO79-2021-WILAYAS-49-58-59-REGISTER-EXTRACT'), 'register_code_jo79', s['source_register_code'])
    require((fr['wilaya_code'], fr['commune_name_fr_jo79'], fr['printed_page']) ==
            (s['source_wilaya_code'], s['source_commune_name_fr'], s['source_printed_page_fr']),
            'Tabelbala: register editions disagree')
    result[key] = (s['source_register_code'], s['source_wilaya_code'], s['source_arabic_commune_name_verbatim'],
                   s['source_arabic_pdf_url'], s['source_printed_page_ar'], s['source_arabic_pdf_sha256'])
    return result


def build():
    master = rows('MASTER-1541-RECONCILIATION-LEDGER')
    evidence = code_evidence()
    pages = {r['working_row_key']: r for r in rows('JO44-ARABIC-IMAGE-ROW-MAP-1541')}
    queue, codes, parents = [], set(), Counter()
    for r in master:
        key = r['working_row_key']
        ledger_code = r['proposed_canonical_code']
        require(ledger_code.startswith('PENDING_ADJUDICATION_') == (key in evidence), f'{key}: unexpected code conflict')
        code, parent, label, url, page, digest = evidence.get(key, (ledger_code, r['wilaya_code_candidate'], '', '', '', ''))
        require(re.fullmatch('[0-9]{4}', code) and code.startswith(parent) and code not in codes and code != '1600',
                f'{key}: invalid, duplicated or wrong-parent proposed code {code}')
        if key in evidence:
            require(code in ledger_code.split('_') and label and page.isdigit() and re.fullmatch('[0-9a-f]{64}', digest),
                    f'{key}: unsupported conflict recommendation')
        require(r['practitioner_signoff_status'] == 'PENDING', f'{key}: review status changed; revisit queue')
        codes.add(code)
        parents[parent] += 1
        if r['decision_class'] != 'EXPLICIT_PRACTITIONER_DECISION_REQUIRED':
            continue
        locator = pages[key]
        require(locator['jo44_assertion_id'] == r['jo44_assertion_id'], f'{key}: historical source mismatch')
        queue.append({
            **{k: r[k] for k in ('working_row_key', 'commune_name_fr_candidate', 'commune_name_ar_candidate',
                                  'wilaya_code_candidate', 'candidate_arabic_anomaly_flag', 'code_conflict_or_discrepancy_flag',
                                  'resolution_rationale', 'jo44_assertion_id', 'jo44_register_code_verbatim',
                                  'official_arabic_verified_form')},
            'jo44_ar_image_locator_only': locator['arabic_image_path'],
            'ledger_proposal_verbatim': ledger_code, 'review_code_proposal': code, 'review_parent_proposal': parent,
            'conflict_source_ar_label': label, 'conflict_source_ar_pdf': url, 'conflict_printed_page_ar': page,
            'conflict_source_pdf_sha256': digest, 'practitioner_signoff_status': r['practitioner_signoff_status'],
        })
    require(len(codes) == 1541 and set(parents) == {f'{i:02}' for i in range(1, 70)}, 'National coverage mismatch')
    require((parents['08'], parents['52']) == (11, 10), 'Unexpected Béchar / Béni Abbès counts')
    require(len(queue) == len({r['working_row_key'] for r in queue}) == 110, 'Expected 110 distinct review cases')
    queue.sort(key=lambda r: (r['working_row_key'] not in evidence, r['working_row_key']))
    out = io.StringIO(newline='')
    writer = csv.DictWriter(out, fieldnames=queue[0].keys(), lineterminator='\n')
    writer.writeheader()
    writer.writerows(queue)
    return out.getvalue().encode('utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='regenerate the derived queue (default: check only)')
    args = parser.parse_args()
    content = build()
    if args.write:
        OUTPUT.write_bytes(content)
    elif not OUTPUT.is_file() or OUTPUT.read_bytes() != content:
        raise SystemExit('Review queue missing or stale: run scripts/prepare-p1-01-review.py --write')
    print('110 review cases; 3 source-backed code proposals tested across 1,541 rows / 69 Wilayas. No approvals.')
