#!/usr/bin/env python3
"""Build source-attributed relationship files for a future network map."""
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / 'research/switzerland'
PARTIES = {
    'FDP.The Liberals': 'PLR', 'Social Democratic Party of Switzerland': 'PS',
    "Swiss People's Party": 'UDC', "Christian Democratic People's Party": 'PDC',
    'Green Party of Switzerland': 'Verts', 'The Centre': 'Le Centre',
    'Green Liberal Party of Switzerland': 'PVL', "Evangelical People's Party of Switzerland": 'PEV',
    'Les Verts': 'Verts', 'Les Vert-e-s': 'Verts', 'Vert-e-s': 'Verts',
    'Les VERT-E-S suisses': 'Verts', 'VERT-E-S suisses': 'Verts', 'PLR.Les Libéraux-Radicaux': 'PLR',
    'Le Centre Suisse': 'Le Centre', 'Les Vert’libéraux': 'PVL',
    'SP': 'PS', 'SVP': 'UDC', 'FDP': 'PLR', 'CVP': 'PDC', 'GLP': 'PVL',
    'Parti socialiste': 'PS', 'Centre': 'Le Centre',
    'Parti écologiste suisse (Les Verts)': 'Verts',
    'Grüne': 'Verts', 'Grüne Schweiz': 'Verts', 'Die Mitte': 'Le Centre',
}
BOARD_WORDS = re.compile(r'\b(?:Verwaltungsrat\w*|Stiftungsrat\w*|Vorstand\w*|conseil d[’\x27]administration|conseil de fondation|consiglio di amministrazione|consiglio di fondazione|board)\b', re.I)


def label(values):
    if isinstance(values, str):
        return values
    return next((values[key] for key in ('fr', 'de', 'it', 'en', 'rm') if values.get(key)), '')


def label_id(kind, value):
    # shortcut: exact normalized labels group observations, resolve legal entities before claiming shared boards.
    return kind + ':' + hashlib.sha256(' '.join(value.split()).casefold().encode()).hexdigest()[:20]


def build(bodies, persons, interests, judges):
    swiss = {row['id'] for row in bodies if row.get('country_key') == 'CHE'}
    nodes, edges = {}, []

    def party_edge(person, published, source, relation='published_party_affiliation'):
        if not published or published.casefold() in {'sans parti', 'independent', 'parteilos', '-', 'sans appartenance à un parti politique'}:
            return
        sympathy = re.match(r'Sympathisant(?:e)? des? (.+)', published, re.I)
        party_label = sympathy[1] if sympathy else published
        if sympathy:
            relation = 'published_party_sympathy'
        canonical = {key.casefold(): value for key, value in PARTIES.items()}.get(party_label.casefold(), party_label)
        target = label_id('party', canonical)
        nodes[target] = {'id': target, 'type': 'party', 'label': canonical}
        edges.append({'id': person + ':' + relation, 'source': person, 'target': target,
                      'type': relation, 'published_label': published,
                      'source_urls': source, 'temporal_status': 'as_published_not_tenure_verified'})

    for row in persons:
        if row.get('body_id') not in swiss:
            continue
        identity = 'openparldata:person:' + str(row['id'])
        nodes[identity] = {'id': identity, 'type': 'parliamentary_person_record', 'label': row['fullname'],
                           'body_id': row['body_id'], 'active_as_published': row.get('active')}
        party = row.get('party_harmonized') or row.get('party') or {}
        party_edge(identity, party.get('en') or label(party), [row['url_api']])
    for row in interests:
        person = 'openparldata:person:' + str(row['person_id'])
        if row.get('body_id') not in swiss or person not in nodes:
            continue
        name = label(row.get('name', {}))
        if name:
            target = label_id('organization-label', name)
            nodes.setdefault(target, {'id': target, 'type': 'organization_label_group', 'label': name,
                                      'identity_status': 'unverified_textual_group_not_legal_entity'})
        else:
            document = row.get('declaration_doc_url') or row['url_api']
            target = label_id('declaration-document', document)
            nodes.setdefault(target, {'id': target, 'type': 'declaration_document',
                                      'label': row.get('declaration_doc_title') or 'Declaration without extracted organization',
                                      'document_url': document})
        role = label(row.get('role_name', {}))
        evidence = BOARD_WORDS.search(role + ' ' + name)
        edges.append({'id': 'openparldata:interest:' + str(row['id']), 'source': person, 'target': target,
                      'type': 'declared_interest' if name else 'declaration_document_reference', 'role_as_published': row.get('role_name', {}),
                      'organization_names_as_published': row.get('name', {}),
                      'board_word_match': evidence[0] if evidence else None,
                      'board_classification': 'explicit_word_requires_review' if evidence else 'not_classified',
                      'payment_category_as_published': row.get('type_payment_harmonized'),
                      'begin_date': row.get('begin_date'), 'end_date': row.get('end_date'),
                      'temporal_status': 'current_status_not_verified', 'source_urls': [row['url_api']]})
    for row in judges:
        identity, court = row['id'], 'court:' + row['court']
        nodes[identity] = {'id': identity, 'type': 'judge', 'label': row['name'], 'court': row['court'],
                           'annual_payment_chf': row['annual_payment_chf'], 'payment_status': row['payment_status']}
        nodes[court] = {'id': court, 'type': 'court', 'label': row['court']}
        edges.append({'id': identity + ':court', 'source': identity, 'target': court, 'type': 'listed_judicial_role',
                      'role_as_published': row['role'], 'observed_on': row['observed_on'], 'source_urls': row['source_urls']})
        party_edge(identity, row.get('party_published'), row['source_urls'],
                   'published_nominating_party' if row.get('party_connection_kind') == 'nominating_party' else 'published_party_affiliation')
        if row.get('nominating_party_published'):
            party_edge(identity, row['nominating_party_published'], row['source_urls'], 'published_nominating_party')
        if row.get('published_workplace'):
            target = label_id('organization-label', row['published_workplace'])
            nodes.setdefault(target, {'id': target, 'type': 'organization_label_group', 'label': row['published_workplace'],
                                      'identity_status': 'unverified_textual_group_not_legal_entity'})
            edges.append({'id': identity + ':workplace', 'source': identity, 'target': target,
                          'type': 'published_workplace_affiliation', 'source_urls': row['source_urls']})
    return list(nodes.values()), edges


def main():
    def rows(name):
        return [json.loads(line) for line in (ROOT / (name + '.jsonl')).open()]
    nodes, edges = build(rows('bodies'), rows('persons'), rows('interests'), json.loads((ROOT / 'federal_judges.json').read_text()))
    for name, records in [('network_nodes', nodes), ('network_edges', edges)]:
        path = ROOT / (name + '.jsonl')
        temporary = path.with_suffix('.jsonl.tmp')
        temporary.write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in records))
        temporary.replace(path)
    manifest = {'nodes': len(nodes), 'edges': len(edges),
                'files': {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in
                          ('bodies.jsonl', 'persons.jsonl', 'interests.jsonl', 'federal_judges.json', 'network_nodes.jsonl', 'network_edges.jsonl')},
                'interpretation': 'As-published relationships; no verified individual payments or legal-entity resolution.'}
    (ROOT / 'network_manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(len(nodes), 'nodes;', len(edges), 'edges')


if __name__ == '__main__':
    main()
