import hashlib
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from build_commune_review_db import BOOK, MASTER, build


class SnapshotTest(unittest.TestCase):
    def test_snapshot(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'review.sqlite3'
            build(path)
            with closing(sqlite3.connect(path)) as con:
                self.assertEqual(con.execute('PRAGMA integrity_check').fetchone(), ('ok',))
                self.assertEqual(con.execute('PRAGMA foreign_key_check').fetchall(), [])
                self.assertEqual(con.execute('SELECT count(*), count(distinct wilaya_code_candidate) '
                                             'FROM commune_review').fetchone(), (1541, 69))
                self.assertEqual(con.execute("SELECT commune_name_ar_candidate, proposed_code, work_status, "
                                             "practitioner_signoff_status, valid_from FROM commune_review "
                                             "WHERE working_row_key='W30-R007'").fetchone(),
                                 ('البرمة', '3021', 'NEEDS_EVIDENCE', 'PENDING', None))
                self.assertEqual(con.execute("SELECT wilaya_code_candidate, proposed_parent FROM commune_review "
                                             "WHERE working_row_key='W08-R012'").fetchone(), ('08', '52'))
                self.assertEqual(dict(con.execute('SELECT * FROM source_file')),
                                 {s.name: hashlib.sha256(s.read_bytes()).hexdigest() for s in (BOOK, MASTER)})
            before = path.read_bytes()
            with self.assertRaises(FileExistsError):
                build(path)
            self.assertEqual(path.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
