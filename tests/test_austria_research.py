"""Research integrity and compatibility; no database access or truth certification."""
import ast
import datetime
import hashlib
import json
from pathlib import Path
import unittest
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / 'docs/research/austria'
SECTIONS = {
    'work_history', 'finances', 'polemics', 'stocks_portfolio', 'real_estate',
    'companies', 'electoral_history', 'interests', 'education', 'honors',
    'key_legislation', 'net_worth_timeline', 'justice', 'promises',
}


def read(path):
    return json.loads(path.read_text())


def importer_mappers():
    # Exercise the real mappings without importing database.py or loading credentials.
    helpers = ast.parse((ROOT / 'import_common.py').read_text())
    profile = ast.parse((ROOT / 'import_profile.py').read_text())
    namespace = {}
    functions = [node for node in helpers.body if isinstance(node, ast.FunctionDef)
                 and node.name == 'as_list']
    exec(compile(ast.Module(body=functions, type_ignores=[]), 'import_common.py', 'exec'), namespace)
    namespace['_as_list'] = namespace['as_list']
    functions = [node for node in profile.body if isinstance(node, ast.FunctionDef)
                 and (node.name.endswith('_fields') or node.name == '_clamp')]
    exec(compile(ast.Module(body=functions, type_ignores=[]), 'import_profile.py', 'exec'), namespace)
    return namespace


class AustriaResearchTest(unittest.TestCase):
    def setUp(self):
        self.dossier = read(RESEARCH / 'haider.json')
        self.sources = {source['id']: source for source in self.dossier['sources']}

    def test_evidence_references_and_unknowns(self):
        self.assertEqual(len(self.sources), len(self.dossier['sources']))
        self.assertFalse(self.dossier['scope']['complete'])
        self.assertIsNone(self.dossier['scope']['national_roster_denominator'])
        self.assertFalse(self.dossier['scope']['live_database_imported'])
        self.assertFalse(self.dossier['scope']['public_site_verified'])
        self.assertEqual(self.dossier['person']['official_id'], 'parliament:490')
        for key in ('religion', 'sexual_orientation', 'personal_tax_returns', 'personal_net_worth'):
            self.assertIsNone(self.dossier['person'][key])
        for source in self.sources.values():
            self.assertEqual(urlsplit(source['url']).scheme, 'https')
            self.assertTrue(source['publisher'])
            self.assertTrue(source['locator'])
            datetime.date.fromisoformat(source['retrieved_on'])
        def references(value):
            if isinstance(value, dict):
                for key, child in value.items():
                    if key == 'source_ids':
                        self.assertTrue(child)
                        self.assertTrue(set(child) <= self.sources.keys())
                    references(child)
            elif isinstance(value, list):
                for child in value:
                    references(child)
        references(self.dossier)
        for name, value in self.dossier['scores'].items():
            if name != 'reason':
                self.assertIsNone(value)

    def test_profile_files_are_sourced_and_importable(self):
        bio = read(ROOT / 'data/jorg-haider_bio.json')
        self.assertEqual(bio['name'], 'Jörg Haider')
        self.assertEqual(bio['country'], 'Austria')
        self.assertEqual(bio['birth_date'], self.dossier['person']['birth_date'])
        urls = {source['url'] for source in self.sources.values()}
        mappers = importer_mappers()
        mapping = {'work_history': '_work_fields', 'education': '_education_fields',
                   'electoral_history': '_electoral_fields', 'polemics': '_polemic_fields',
                   'justice': '_justice_fields'}
        self.assertEqual({p.stem.removeprefix('jorg-haider_') for p in
                          (ROOT / 'data').glob('jorg-haider_*.json')}, SECTIONS | {'bio'})
        for section in SECTIONS:
            entries = read(ROOT / f'data/jorg-haider_{section}.json')
            self.assertIsInstance(entries, list)
            self.assertEqual(len({row['id'] for row in entries}), len(entries))
            for row in entries:
                self.assertTrue(row['id'])
                self.assertTrue(row['source_url'])
                self.assertTrue(set(row['source_url']) <= urls)
                fields = mappers[mapping[section]](row)
                self.assertEqual(fields['source_urls'], row['source_url'])
                self.assertTrue(any(value for key, value in fields.items() if key != 'source_urls'))
                if section == 'justice':
                    self.assertEqual(fields['presumption_note'], row['presumption_note'])
                if section == 'polemics':
                    self.assertEqual(fields['status'], row['status'])
                    self.assertIsNone(fields['confidence_score'])
        self.assertTrue(set(bio['source_url']) <= urls)

    def test_all_twelve_demands_remain_unassessed(self):
        demands = self.dossier['commitments']
        self.assertEqual(len(demands), 12)
        self.assertEqual(len({d['id'] for d in demands}), 12)
        for number, demand in enumerate(demands, 1):
            self.assertTrue(demand['locator'].endswith(f'demand {number}'))
            self.assertEqual(demand['assessment_status'], 'unassessed')
            self.assertIsNone(demand['verdict'])
            self.assertIsNone(demand['confidence_score'])
            self.assertIsNone(demand['date_made'])
            self.assertEqual(demand['implementation_evidence'], [])
        # The importer treats unknown verdicts as approved NO_ACTION: never feed it these leads.
        self.assertEqual(read(ROOT / 'data/jorg-haider_promises.json'), [])
        self.assertIn('international', demands[1]['detail'])
        self.assertIn('mother tongue', demands[5]['detail'])

    def test_mandate_dates_and_crash_caveats(self):
        entries = read(ROOT / 'data/jorg-haider_work_history.json')
        for row in entries:
            if row['start_date'] and row['end_date']:
                self.assertLessEqual(row['start_date'], row['end_date'])
        mandates = [(r['start_date'], r['end_date']) for r in entries
                    if r['id'].startswith('haider-nationalrat-')]
        self.assertEqual(mandates, [('1979-06-05', '1983-06-14'),
                                    ('1986-12-17', '1989-05-30'),
                                    ('1992-03-11', '1999-04-07')])
        review = self.dossier['private_life_review']
        self.assertFalse(review['sexual_relationship_established'])
        self.assertFalse(review['lover_home_departure_established'])
        self.assertFalse(review['original_radio_recording_reviewed'])
        self.assertIn('disputed_interpretation', review['relationship_reporting_status'])
        self.assertTrue({'guardian-petzner-2008', 'ap-petzner-2008', 'rtve-petzner-2008'} <= set(review['source_ids']))
        justice = read(ROOT / 'data/jorg-haider_justice.json')
        self.assertEqual(len(justice), 1)
        self.assertIn('original prosecution decision has not been obtained', justice[0]['presumption_note'])

    def test_legal_badges_do_not_reopen_closed_cases(self):
        # Use known controversy tokens and a short literal closure badge: free-text
        # heuristics can otherwise read "investigation closed" as still pending.
        cards = read(ROOT / 'data/jorg-haider_polemics.json')
        for card in cards:
            self.assertIn(card['status'], {'political', 'resolved'})
        crash = next(c for c in cards if c['id'] == 'haider-fatal-crash')
        self.assertEqual(crash['status'], 'resolved')
        signs = next(c for c in cards if c['id'] == 'haider-slovene-signs')
        self.assertEqual(signs['status'], 'political')
        self.assertEqual(read(ROOT / 'data/jorg-haider_justice.json')[0]['status'], 'Closed')

    def test_evidence_receipts_and_retained_documents(self):
        receipts = read(RESEARCH / 'source-downloads.json')
        self.assertEqual({r['source_id'] for r in receipts}, self.sources.keys())
        for receipt in receipts:
            self.assertEqual(receipt['url'], self.sources[receipt['source_id']]['url'])
            self.assertEqual(receipt['status'], 'downloaded_for_review', receipt)
            self.assertGreater(receipt['bytes'], 0)
            self.assertEqual(len(receipt['sha256']), 64)
            if receipt.get('path'):
                path = ROOT / receipt['path']
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), receipt['sha256'])
                self.assertTrue((ROOT / receipt['text_path']).read_text().strip())


if __name__ == '__main__':
    unittest.main()
