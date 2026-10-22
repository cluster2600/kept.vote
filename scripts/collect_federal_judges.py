#!/usr/bin/env python3
"""Collect published judicial roles and party labels; never infer payments."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from html import unescape
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1] / 'research/switzerland'
BGER = 'https://www.bger.ch'
BGER_PATH = '/fr/index/federal/federal-inherit-template/federal-richter/'
ROSTERS = {
    'supreme_ordinary': BGER + BGER_PATH + 'federal-richter-bundesrichter.htm?lang=3',
    'supreme_deputy': BGER + BGER_PATH + 'federal-richter-nebenamtlicherichter.htm',
    'administrative': 'https://www.bvger.ch/fr/api/json/employees/list',
    'criminal_ordinary': 'https://www.bstger.ch/fr/il-tribunale/giudici/elenco-giudici-penali-federali.html',
    'criminal_deputy': 'https://www.bstger.ch/fr/il-tribunale/giudici/elenco-giudici-supplenti.html',
    'patent': 'https://www.bundespatentgericht.ch/das-gericht/richter-richterinnen/',
}


def text(html):
    return ' '.join(unescape(re.sub(r'<[^>]+>', ' ', html)).split())


def fetch(url):
    raw = subprocess.check_output(['curl', '-fsSL', '--retry', '2', '--max-time', '45', url])
    return raw.decode('utf-8'), {'url': url, 'retrieved_at': datetime.now(timezone.utc).isoformat(),
                                'sha256': hashlib.sha256(raw).hexdigest()}


def party_from_profile(html, court):
    if court == 'supreme':
        match = re.search(r'<div class="(?:leg|richtext)">(.*?)</div>', html, re.S)
        tail = text(match[1]).rstrip('.').split('.')[-1].strip() if match else ''
        return tail if re.fullmatch(r'PLR|PS|SP|UDC|SVP|FDP|PDC|CVP|PBD|PVL|GLP|Centre|Le Centre|Die Mitte|Grüne|Les Verts|Les Vert-e-s|Verts|Vert-e-s|Parti socialiste|Sans parti|sans parti|Sans appartenance à un parti politique', tail) else None
    if court == 'administrative':
        match = re.search(r'>Parti:</div>\s*<div[^>]*>(.*?)</div>', html, re.S)
    else:
        match = re.search(r'<b>Parti politique</b></p><hr>\s*(.*?)<br', html, re.S)
    return text(match[1]) or None if match else None


def record(name, court, role, source, profile=None):
    identity = profile or source + '#' + name.casefold()
    return {'id': 'judge:' + hashlib.sha256(identity.encode()).hexdigest()[:20],
            'name': name, 'court': court, 'role': role, 'source_urls': [source],
            'profile_url': profile, 'party_published': None, 'party_status': 'not_published_or_not_extracted',
            'annual_payment_chf': None, 'payment_year': None, 'payment_source_urls': [],
            'payment_status': 'not_verified', 'observed_on': datetime.now(timezone.utc).date().isoformat()}


def roster_rows(html, kind, source):
    rows = []
    if kind == 'supreme_ordinary':
        for path, body in re.findall(r'<button[^>]*data-modal-src="([^"]+)"[^>]*>(.*?)</button>', html, re.S):
            name = re.search(r'<strong>(.*?)</strong>', body, re.S)
            role = re.search(r'<span>(.*?)</span>', body, re.S)
            if name and role:
                rows.append(record(text(name[1]), 'supreme', text(role[1]), source, urljoin(BGER, path)))
    elif kind == 'supreme_deputy':
        names = re.findall(r'<div class="box -gray">\s*<strong>(.*?)</strong>', html, re.S)
        for name in dict.fromkeys(map(text, names)):
            if name.casefold() != 'vacant':
                rows.append(record(name, 'supreme', 'Deputy judge', source))
    elif kind == 'administrative':
        for item in json.loads(html)['data']['items']:
            if '59' in item.get('jobCategory', '').replace('|', '').split(','):
                rows.append(record(text(item['firstName'] + ' ' + item['lastName']), 'administrative', item['jobTitle'], source, item['detailUrl']))
    elif kind.startswith('criminal'):
        for path, name in re.findall(r'<h5[^>]*>\s*<a href="([^"]+)">(.*?)</a>', html, re.S):
            rows.append(record(text(name), 'criminal', 'Deputy judge' if kind.endswith('deputy') else 'Ordinary judge', source, urljoin(source, path)))
    else:
        for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.S):
            cells = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)
            if len(cells) >= 6 and text(cells[0]) != 'Vorname':
                row = record(text(cells[0] + ' ' + cells[1]), 'patent', text(cells[4]), source)
                row['published_workplace'] = text(cells[5]) or None
                rows.append(row)
        rows = list({row['id']: row for row in rows}.values())
    if not rows:
        raise ValueError('No judges parsed from ' + source)
    return rows


def enrich(row):
    if not row['profile_url']:
        return row, None
    html, receipt = fetch(row['profile_url'])
    row['party_published'] = party_from_profile(html, row['court'])
    if row['court'] == 'supreme':
        nomination = re.search(r'Élu(?:e)? sur proposition (.*?)\.', text(html))
        if nomination:
            row['nominating_party_published'] = re.sub(r"^(?:du |de l[’']|de la )", '', nomination[1])
    if row['party_published']:
        row['party_status'] = 'published_on_official_profile'
    row['source_urls'].append(row['profile_url'])
    return row, receipt


def main():
    rows, receipts, counts = [], [], {}
    for kind, url in ROSTERS.items():
        html, receipt = fetch(url)
        group = roster_rows(html, kind, url)
        counts[kind] = len(group)
        rows.extend(group)
        receipts.append(receipt)
        print(kind, len(group), flush=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(enrich, rows))
    rows = [row for row, receipt in results]
    receipts.extend(receipt for row, receipt in results if receipt)
    if len({row['id'] for row in rows}) != len(rows):
        raise ValueError('Duplicate judge identity; review roster overlap')
    path = ROOT / 'federal_judges.json'
    payload = (json.dumps(rows, ensure_ascii=False, indent=2) + '\n').encode()
    temporary = path.with_suffix('.json.tmp')
    temporary.write_bytes(payload)
    temporary.replace(path)
    manifest = {'counts': counts, 'records': len(rows), 'party_labels_extracted': sum(bool(row['party_published']) for row in rows),
                'sha256': hashlib.sha256(payload).hexdigest(), 'sources': receipts,
                'scope': 'Published lists of four civilian federal courts; military court excluded. Roster presence is not verified tenure. No individual payments verified.'}
    (ROOT / 'judges_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(manifest['records'], 'judicial records;', manifest['party_labels_extracted'], 'published party labels', flush=True)


if __name__ == '__main__':
    main()
