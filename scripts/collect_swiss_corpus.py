#!/usr/bin/env python3
"""Collect public parliamentary records only; never imports into the website."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
from datetime import datetime, timezone
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1] / 'research' / 'switzerland'
BASE = 'https://api.openparldata.ch/v1/'
PERSON_FIELDS = ('id,url_api,body_key,body_id,external_id,fullname,firstname,lastname,'
                 'active,party,party_harmonized,website_parliament_url,electoral_district,'
                 'function_latest,links,updated_at')
DATASETS = {'bodies': None, 'persons': None, 'interests': None, 'affairs': 2000}


def check_page(page, seen):
    rows, meta = page['data'], page['meta']
    if not isinstance(rows, list) or not isinstance(meta['total_records'], int):
        raise ValueError('Invalid API page')
    for row in rows:
        if row['id'] in seen:
            raise ValueError('Duplicate ID: pagination changed during collection')
        seen.add(row['id'])
    return rows, meta


def collect(name, cap):
    temporary = ROOT / (name + '.jsonl.tmp')
    seen, receipts, offset, total = set(), [], 0, None
    started = datetime.now(timezone.utc).isoformat()
    try:
        with temporary.open('w', encoding='utf-8') as output:
            while total is None or offset < min(total, cap or total):
                params = {'limit': min(5000, cap - offset) if cap else 5000,
                          'offset': offset, 'sort_by': '-updated_at,id' if name == 'affairs' else 'id'}
                if name == 'persons':
                    params['fields'] = PERSON_FIELDS
                url = BASE + name + '/?' + urlencode(params)
                raw = subprocess.check_output(['curl', '-fsSL', '--retry', '2',
                                                '--max-time', '90', url])
                rows, meta = check_page(json.loads(raw), seen)
                if total is not None and total != meta['total_records']:
                    raise ValueError('Source total changed; rerun for a coherent snapshot')
                total = meta['total_records']
                if not rows and offset < total:
                    raise ValueError('Unexpected empty page')
                receipts.append({'url': url, 'retrieved_at': datetime.now(timezone.utc).isoformat(),
                                 'response_sha256': hashlib.sha256(raw).hexdigest(),
                                 'rows': len(rows), 'reported_total': total})
                for row in rows:
                    if name == 'persons':
                        row = {key: row[key] for key in PERSON_FIELDS.split(',') if key in row}
                    output.write(json.dumps(row, ensure_ascii=False) + '\n')
                offset += len(rows)
                print(f'{name}: {offset}/{total}', flush=True)
        target = ROOT / (name + '.jsonl')
        os.replace(temporary, target)
        return {'started_at': started, 'records': offset, 'reported_total': total,
                'complete_endpoint': offset == total, 'cap': cap,
                'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'pages': receipts}
    finally:
        temporary.unlink(missing_ok=True)


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    manifest_path = ROOT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    for name, cap in DATASETS.items():
        manifest[name] = collect(name, cap)
        temporary = manifest_path.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        os.replace(temporary, manifest_path)


if __name__ == '__main__':
    main()
