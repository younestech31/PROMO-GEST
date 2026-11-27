#!/usr/bin/env python3
"""Bounded read-only transport of P1-10 Development real-stack evidence, NOT Production."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tests/browser'))
from commercialization_review import CHECKS

PROFILES = ('ar-desktop', 'ar-mobile', 'fr-desktop', 'fr-mobile')
MODE = 'P1-10 disposable Development real SPA and PostgreSQL 18; not Production HTTPS'


def safe_file(root, profile, name):
    path = root / profile / name
    if path.is_symlink() or path.resolve().parent.parent != root.resolve():
        raise ValueError('Unsafe evidence path')
    return path


def read_results(root, source):
    if not re.fullmatch(r'[0-9a-f]{40}', source):
        raise ValueError('Invalid source revision')
    results = []
    for profile in PROFILES:
        result = json.loads(safe_file(root, profile, 'result.json').read_text())
        lang, device = profile.split('-')
        checks = result['P1_10']
        if (result['language'] != lang or result['profile'] != device
                or not re.fullmatch(r'[0-9a-f]{40}', result['commit'])
                or not str(result['run']).isdigit()
                or result['mode'] != 'automated real-browser; not manual acceptance'
                or not isinstance(result['browser'], str) or not re.fullmatch(r'[0-9.]+', result['browser'])
                or result['viewport'] != ({'width': 390, 'height': 844} if device == 'mobile'
                                          else {'width': 1440, 'height': 900})
                or not isinstance(checks, dict) or set(checks) != set(CHECKS)
                or any(value is not True for value in checks.values())):
            raise ValueError('Incomplete or mismatched real-stack result')
        # Export only a narrow allow-list; never include unrelated results or form values.
        results.append({'profile': profile, 'sourceHead': source, 'testedCheckout': result['commit'],
                        'run': str(result['run']), 'checks': checks, 'browser': result['browser'],
                        'viewport': result['viewport']})
    if len({r['testedCheckout'] for r in results}) != 1 or len({r['run'] for r in results}) != 1:
        raise ValueError('Mixed run or tested revision')
    return results


def notice(name, payload):
    text = json.dumps(payload, separators=(',', ':'))
    if len(text.encode()) > 30000:
        raise ValueError('Evidence exceeds bounded annotation budget')
    parts = [text[i:i + 3000] for i in range(0, len(text), 3000)]
    for index, part in enumerate(parts, 1):
        escaped = part.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
        print(f'::notice title=PG-P1-10-{name}:{index}:{len(parts)}::{escaped}', flush=True)


def main(root, record):
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        raise RuntimeError('CI-only evidence export')
    if record not in (*PROFILES, 'manifest'):
        raise ValueError('Unknown record')
    results = read_results(root, os.environ['P1_10_SOURCE_SHA'])
    from PIL import Image
    manifest = {'mode': MODE, 'profiles': results, 'images': []}
    for profile in PROFILES:
        source = safe_file(root, profile, 'p1-10-review-confirmation.png')
        target = safe_file(root, profile, 'p1-10-review.jpg')
        with Image.open(source) as image:
            image = image.convert('RGB')
            image.thumbnail((960, 844))
            for quality in (65, 50, 35, 20):
                image.save(target, 'JPEG', quality=quality, optimize=True)
                if target.stat().st_size < 20000:
                    break
        data = target.read_bytes()
        if len(data) >= 20000:
            raise ValueError('Review JPEG too large')
        digest = hashlib.sha256(data).hexdigest()
        manifest['images'].append({'profile': profile, 'file': f'{profile}/review.jpg', 'sha256': digest})
        if record == profile:
            notice(profile, {'profile': profile, 'sha256': digest, 'imageBase64': base64.b64encode(data).decode()})
    target = root / 'p1-10-manifest.json'
    if target.is_symlink() or target.resolve().parent != root.resolve():
        raise ValueError('Unsafe manifest path')
    target.write_text(json.dumps(manifest, indent=2) + '\n')
    if record == 'manifest':
        notice(record, manifest)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('--record', required=True, choices=(*PROFILES, 'manifest'))
    args = parser.parse_args()
    main(args.root, args.record)
