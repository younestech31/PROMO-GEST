#!/usr/bin/env python3
"""Compare a protected stored_files export with an offline storage snapshot.

Read-only: never modify storage or the database and never delete files. Operate
only on consistent, quiescent snapshots; findings are candidates for review.
"""
import argparse
import hashlib
import json
import os
import re
import stat
import sys


class ScanError(Exception):
    pass


def valid_path(value):
    if not isinstance(value, str) or not value or '\\' in value or '\x00' in value:
        return False
    parts = value.split('/')
    return all(part not in ('', '.', '..') for part in parts)


def load_manifest(filename, verify_content=False):
    try:
        with open(filename, encoding='utf-8') as source:
            rows = json.load(source)
    except (OSError, UnicodeError, ValueError) as exc:
        raise ScanError('Cannot read a valid JSON manifest.') from exc
    if not isinstance(rows, list):
        raise ScanError('Manifest must be an array.')
    references = {}
    for row in rows:
        if not isinstance(row, dict) or set(row) not in ({'path', 'size'}, {'path', 'size', 'sha256'}):
            raise ScanError('Each manifest entry must contain path, size and optionally sha256.')
        path, size = row['path'], row['size']
        checksum = row.get('sha256')
        if not valid_path(path) or isinstance(size, bool) or not isinstance(size, int) or size <= 0:
            raise ScanError('Manifest has an invalid path or size.')
        if (verify_content and 'sha256' not in row) or ('sha256' in row and
                (not isinstance(checksum, str) or not re.fullmatch(r'[0-9a-fA-F]{64}', checksum))):
            raise ScanError('Manifest has a missing or invalid SHA-256 checksum.')
        if path in references:
            raise ScanError('Manifest contains duplicate paths.')
        references[path] = {'size': size, 'sha256': checksum.lower() if checksum else None}
    return references


def fingerprint_file(directory_fd, name, listed_info):
    """Hash only a stable regular file opened without following its final link."""
    fd = None
    try:
        fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory_fd)
        before = os.fstat(fd)
        attributes = lambda info: (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)
        if not stat.S_ISREG(before.st_mode) or attributes(before) != attributes(listed_info):
            raise ScanError('A storage entry changed during the scan.')
        digest = hashlib.sha256()
        total = 0
        while True:
            block = os.read(fd, 1024 * 1024)
            if not block:
                break
            digest.update(block)
            total += len(block)
        after_path = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
        if (total != before.st_size or not stat.S_ISREG(after_path.st_mode) or
                attributes(os.fstat(fd)) != attributes(before) or attributes(after_path) != attributes(before)):
            raise ScanError('A storage entry changed during the scan.')
        return digest.hexdigest()
    except OSError as exc:
        raise ScanError('Cannot safely read all referenced storage files.') from exc
    finally:
        if fd is not None:
            os.close(fd)


def reconcile(storage, references, verify_content=False):
    # Strip a trailing slash so lstat cannot follow a symlink supplied as root.
    storage = os.path.normpath(storage)
    # Anchor traversal to an opened directory descriptor. Never follow a root
    # symlink or any nested symlink, including if the root entry is swapped.
    try:
        root_fd = os.open(storage, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    except OSError as exc:
        raise ScanError('Cannot inspect storage snapshot; it must be a real directory.') from exc
    found = {}
    checksum_mismatch = []
    unsafe = []
    failed = []

    def onerror(_error):
        failed.append(True)

    try:
        for directory, dirs, files, fd in os.fwalk('.', topdown=True, onerror=onerror,
                                                    follow_symlinks=False, dir_fd=root_fd):
            relative_dir = os.path.relpath(directory, '.')
            for name in dirs + files:
                path = name if relative_dir == '.' else relative_dir.replace(os.sep, '/') + '/' + name
                if not valid_path(path):
                    raise ScanError('Storage contains an unsupported path.')
                try:
                    info = os.stat(name, dir_fd=fd, follow_symlinks=False)
                except OSError as exc:
                    raise ScanError('Cannot inspect all storage entries.') from exc
                if stat.S_ISDIR(info.st_mode):
                    continue
                if stat.S_ISREG(info.st_mode):
                    found[path] = info.st_size
                    if verify_content and path in references:
                        checksum = fingerprint_file(fd, name, info)
                        if checksum != references[path]['sha256']:
                            checksum_mismatch.append(path)
                else:
                    unsafe.append(path)
        if failed:
            raise ScanError('Cannot enumerate all storage directories.')
    except OSError as exc:
        raise ScanError('Cannot enumerate storage snapshot.') from exc
    finally:
        os.close(root_fd)

    missing = sorted(set(references) - set(found))
    unreferenced = sorted(set(found) - set(references))
    size_mismatch = sorted(path for path in set(found) & set(references) if found[path] != references[path]['size'])
    return {'missing': missing, 'unreferenced': unreferenced, 'size_mismatch': size_mismatch,
            'checksum_mismatch': sorted(checksum_mismatch), 'unsafe_entries': sorted(unsafe)}


def write_report(filename, storage, findings, verify_content=False):
    target = os.path.abspath(filename)
    root = os.path.realpath(storage)
    parent = os.path.realpath(os.path.dirname(target))
    if os.path.commonpath([root, parent]) == root:
        raise ScanError('The report must be written outside the storage snapshot.')
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, 'O_NOFOLLOW'):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(target, flags, 0o600)
        with os.fdopen(fd, 'w', encoding='utf-8') as output:
            json.dump({'version': 2, 'checksum_verification_requested': verify_content, 'findings': findings}, output, ensure_ascii=True, indent=2)
            output.write('\n')
    except OSError as exc:
        raise ScanError('Cannot create the report; it must not already exist.') from exc


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True, help='Protected JSON export of stored_files paths, sizes and optional checksums')
    parser.add_argument('--storage', required=True, help='Quiescent storage snapshot directory')
    parser.add_argument('--report', help='Create a new 0600 JSON report containing sensitive relative paths')
    parser.add_argument('--verify-content', action='store_true', help='Hash referenced files and compare SHA-256 checksums')
    args = parser.parse_args(argv)
    try:
        root = os.path.realpath(args.storage)
        if os.path.commonpath([root, os.path.realpath(args.manifest)]) == root:
            raise ScanError('The manifest must be outside the storage snapshot.')
        references = load_manifest(args.manifest, args.verify_content)
        findings = reconcile(args.storage, references, args.verify_content)
        if args.report:
            write_report(args.report, args.storage, findings, args.verify_content)
    except ScanError as exc:
        print(f'Error: {exc}', file=sys.stderr)
        return 2
    counts = {key: len(value) for key, value in findings.items()}
    print(json.dumps({'complete': True, 'references': len(references), 'counts': counts,
                      'checksum_verification_requested': args.verify_content}, sort_keys=True))
    return 1 if any(counts.values()) else 0


if __name__ == '__main__':
    sys.exit(main())
