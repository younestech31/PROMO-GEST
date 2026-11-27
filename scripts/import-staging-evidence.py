#!/usr/bin/env python3
"""Retrieve bounded, SHA-256-verified synthetic review images using gh's existing auth.

The normal artifact contains full PNGs. This path only needs api.github.com access,
not the artifact storage redirect, and gives CI no repository-write permission.
"""
import argparse
import base64
import hashlib
import json
import subprocess
from pathlib import Path

REPOSITORY = 'younestech31/PROMO-GEST'
PROFILES = ('ar-desktop', 'ar-mobile', 'fr-desktop', 'fr-mobile')


def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', f'repos/{REPOSITORY}/{path}'], text=True))


def decode_evidence(annotations, source_sha):
    chunks = {}
    totals = {}
    for annotation in annotations:
        title = annotation.get('title', '')
        if not title.startswith('PG-STAGING-'):
            continue
        parts = title.removeprefix('PG-STAGING-').split(':')
        if len(parts) != 3:
            raise ValueError('Evidence must use numbered, non-truncated chunks')
        key, index, total = parts[0], int(parts[1]), int(parts[2])
        if key not in (*PROFILES, 'manifest') or not (1 <= index <= total <= 10):
            raise ValueError('Unexpected evidence chunk')
        if key in totals and totals[key] != total:
            raise ValueError('Conflicting chunk totals')
        totals[key] = total
        chunks.setdefault(key, {})
        if index in chunks[key] or len(annotation['message']) > 3000:
            raise ValueError('Duplicate or oversized evidence chunk')
        chunks[key][index] = annotation['message']
    if set(chunks) != {*PROFILES, 'manifest'}:
        raise ValueError('Incomplete staging evidence export')
    records = {}
    for key, pieces in chunks.items():
        if set(pieces) != set(range(1, totals[key] + 1)):
            raise ValueError('Missing evidence chunk')
        records[key] = json.loads(''.join(pieces[i] for i in range(1, totals[key] + 1)))
    manifest = records['manifest']
    if {r['profile'] for r in manifest['profiles']} != set(PROFILES) or len(manifest['profiles']) != 4:
        raise ValueError('Incomplete profile manifest')
    if any(r['sourceHead'] != source_sha or r['status'] != 'PASS' for r in manifest['profiles']):
        raise ValueError('Evidence source or verdict mismatch')
    if len(manifest['images']) != 4:
        raise ValueError('Incomplete image manifest')
    images = {}
    for image in manifest['images']:
        profile = image['profile']
        if profile not in PROFILES or profile in images or image['file'] != f'{profile}/review.jpg':
            raise ValueError('Unexpected image path')
        record = records[profile]
        data = base64.b64decode(record['imageBase64'], validate=True)
        if len(data) >= 20000 or not data.startswith(b'\xff\xd8\xff'):
            raise ValueError('Invalid compact JPEG')
        digest = hashlib.sha256(data).hexdigest()
        if record['profile'] != profile or digest != record['sha256'] or digest != image['sha256']:
            raise ValueError('Screenshot integrity mismatch')
        images[profile] = data
    return manifest, images


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', required=True, type=int)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    run = api(f'actions/runs/{args.run}')
    if run['conclusion'] != 'success' or run['head_repository']['full_name'] != REPOSITORY:
        raise ValueError('Only successful runs from this repository may be imported')
    jobs = api(f'actions/runs/{args.run}/jobs')['jobs']
    job = next(job for job in jobs if job['name'] == '.NET 10 and PostgreSQL 18 least-privilege tests')
    if job['conclusion'] != 'success':
        raise ValueError('Staging job did not pass')
    annotations = []
    page = 1
    while True:
        batch = api(f'check-runs/{job["id"]}/annotations?per_page=100&page={page}')
        annotations.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    manifest, images = decode_evidence(annotations, run['head_sha'])
    if args.out.exists():
        raise ValueError('Choose a new evidence directory; existing evidence is never overwritten')
    args.out.mkdir(parents=True)
    for profile, data in images.items():
        destination = args.out / profile / 'review.jpg'
        destination.parent.mkdir()
        destination.write_bytes(data)
    (args.out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (args.out / 'provenance.json').write_text(json.dumps({
        'repository': REPOSITORY, 'runId': args.run, 'url': run['html_url'],
        'sourceHead': run['head_sha'], 'jobId': job['id'],
        'transport': 'SHA-256-verified compact synthetic images from read-only CI check notices',
        'originals': 'staging-https-evidence artifact; five full PNGs per profile',
    }, indent=2) + '\n')
    print(f'Imported four verified staging screenshots and manifest into {args.out}')


if __name__ == '__main__':
    main()
