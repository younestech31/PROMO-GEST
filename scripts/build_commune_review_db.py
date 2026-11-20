#!/usr/bin/env python3
"""Build a standalone, non-production SQLite snapshot of the commune review register."""
import argparse
import hashlib
import os
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path

from p1_01_decision_book import BOOK, DATA, indexed, proposals, validate

MASTER = DATA / 'P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv'


def build(output):
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as tmp:
        directory = Path(tmp)
        db = directory / 'draft.sqlite3'
        # Validate and hash the exact bytes that will be read into SQLite.
        hashes = []
        for source in (BOOK, MASTER):
            raw = source.read_bytes()
            (directory / source.name).write_bytes(raw)
            hashes.append((source.name, hashlib.sha256(raw).hexdigest()))
        book = directory / BOOK.name
        validate(book, proposals())
        rows = indexed(book)
        master = indexed(directory / MASTER.name)
        if rows.keys() != master.keys():
            raise ValueError('Decision book and ledger keys differ')
        wilayas = {(r['wilaya_code_candidate'], r['wilaya_name_ar_candidate'], r['wilaya_name_fr_candidate'])
                   for r in master.values()}
        if len(wilayas) != 69 or {w[0] for w in wilayas} != {f'{n:02d}' for n in range(1, 70)}:
            raise ValueError('Expected exactly one label pair per candidate wilaya')
        with closing(sqlite3.connect(db)) as con, con:
            con.executescript('''
                PRAGMA foreign_keys = ON;
                CREATE TABLE source_file(filename TEXT PRIMARY KEY, sha256 TEXT NOT NULL);
                CREATE TABLE candidate_wilaya(code TEXT PRIMARY KEY, name_ar TEXT NOT NULL, name_fr TEXT NOT NULL);
            ''')
            con.executemany('INSERT INTO source_file VALUES (?,?)', hashes)
            con.executemany('INSERT INTO candidate_wilaya VALUES (?,?,?)', sorted(wilayas))
            # validate() whitelists the complete decision-book schema. Keep the evidence,
            # questions and reviewer fields alongside proposals without deriving decisions.
            columns = list(next(iter(rows.values())))
            fields = ', '.join(f'"{k}" TEXT' for k in columns)
            con.execute(f'''CREATE TABLE commune_review({fields}, practitioner_signoff_status TEXT NOT NULL,
                            PRIMARY KEY (working_row_key), UNIQUE (jo44_assertion_id),
                            FOREIGN KEY (wilaya_code_candidate) REFERENCES candidate_wilaya(code),
                            FOREIGN KEY (proposed_parent) REFERENCES candidate_wilaya(code)) WITHOUT ROWID''')
            params = ','.join('?' for _ in range(len(columns) + 1))
            con.executemany(f'INSERT INTO commune_review VALUES ({params})',
                            [(*(r[k] or None for k in columns), master[key]['practitioner_signoff_status'])
                             for key, r in rows.items()])
            con.execute('CREATE INDEX by_wilaya ON commune_review(wilaya_code_candidate)')
            con.execute('CREATE INDEX by_proposal ON commune_review(proposed_code)')
        os.link(db, output)  # publish only a complete DB; never overwrite an existing file


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='new .sqlite3 file (must not already exist)')
    args = parser.parse_args()
    try:
        build(args.output)
    except (ValueError, OSError, sqlite3.Error) as exc:
        parser.exit(1, f'Commune review database: {exc}\n')
    print(f'Created {args.output} (review only; not a production seed).')
