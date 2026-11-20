#!/usr/bin/env python3
"""Check historical W41 observations by source position, not uniqueness of a printed code."""
import csv
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'docs/reference-data'
SLICE = DATA / 'P1-01-JO44-W41-AND-COLLISION-CONTROLS-30.csv'
MASTER = DATA / 'P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv'
# Fingerprints of the six page images, not of their source PDFs.
HASHES = {
    'ar_pdf21': 'd999259e129a925a346e7d141820299317b0032627cd318f66a7f58d3436f0d4',
    'ar_pdf36': '7d23e2649341d922cc7c499fa87bbe76648badfa5c883381846b7a4f63456d14',
    'ar_pdf37': '6589ed2a471ea0346d0b99ede3b21efcc385261bf1169cf9b674115b79401db3',
    'fr_pdf15': '9a10e4f34ca0e35077bde7c25f6d3c1c926d753a7157b72008a39c9f4780b4a6',
    'fr_pdf26': '949f281cd310c24241a72dff8b973d0d2c85f4f5cd01b18ce4c6ba5a64d9beeb',
    'fr_pdf27': 'e603a34352b6f48488fb1b24def51f8130e9638b5c9db726b6ee79cd6b175337',
}


def read(path):
    with path.open(encoding='utf-8-sig', newline='') as file:
        return list(csv.DictReader(file))


def validate(rows):
    ledger = {r['jo44_assertion_id']: r for r in read(MASTER)}
    pages = {f'W41-{i:02}': (36 if i <= 8 else 37, 27) for i in range(1, 27)}
    pages.update({'W14-15': (21, 15), 'W40-12': (36, 26), 'W42-28': (37, 27), 'W42-29': (37, 27)})
    seen = set()
    for row in rows:
        aid = row['jo44_assertion_id']
        pos = aid.removeprefix('JO44-1985-')
        if pos in seen or pos not in pages or aid not in ledger:
            raise ValueError(f'Duplicate or unexpected source position: {aid}')
        seen.add(pos)
        ap, fp = pages[pos]
        master = ledger[aid]
        fr = master['jo44_register_code_verbatim']
        ar = {'W41-12': '4012', 'W41-15': '1415', 'W42-29': '4228'}.get(pos, fr)
        expected = {'code_fr': fr, 'code_ar': ar, 'working_row_key': master['working_row_key'],
                    'ar_image': f'.tmp-joradp/jo44_ar_pdf{ap}.png', 'ar_printed_page': str(1600 + ap),
                    'fr_image': f'.tmp-joradp/jo44_fr_pdf{fp}.png', 'fr_printed_page': str(1044 + fp)}
        for k, v in expected.items():
            if row[k] != v:
                raise ValueError(f'{aid}: incorrect {k}')
        if not all(row[k].strip() for k in ('commune_ar_reading', 'seat_ar_reading', 'commune_fr', 'seat_fr')):
            raise ValueError(f'{aid}: incomplete bilingual reading')
    if seen != pages.keys():
        raise ValueError('Missing historical position')
    for page, digest in HASHES.items():
        image = ROOT / '.tmp-joradp' / f'jo44_{page}.png'
        if hashlib.sha256(image.read_bytes()).hexdigest() != digest:
            raise ValueError(f'{page}: image fingerprint changed')


if __name__ == '__main__':
    validate(read(SLICE))
    print('W41: 26 historical positions + 4 controls and 6 page images checked; no adjudication.')
