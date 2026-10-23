import importlib.util
from pathlib import Path
import unittest


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).resolve().parents[1] / 'scripts' / (name + '.py'))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


judges = module('collect_federal_judges')
network = module('build_swiss_network')


class JudgeParserTests(unittest.TestCase):
    def test_extracts_only_explicit_party_fields(self):
        self.assertEqual(judges.party_from_profile('<div class="leg">Public biography. PLR.</div>', 'supreme'), 'PLR')
        self.assertIsNone(judges.party_from_profile('<div class="leg">Met PS members. Public biography.</div>', 'supreme'))
        self.assertEqual(judges.party_from_profile('<div class="richtext"><p>Public biography. SVP.</p></div>', 'supreme'), 'SVP')
        self.assertEqual(judges.party_from_profile('<div class="leg">Biography. Sans appartenance à un parti politique.</div>', 'supreme'), 'Sans appartenance à un parti politique')
        self.assertEqual(judges.party_from_profile('>Parti:</div><div class="value">Sans parti</div>', 'administrative'), 'Sans parti')
        self.assertEqual(judges.party_from_profile('<b>Parti politique</b></p><hr>PS<br>', 'criminal'), 'PS')

    def test_deputies_deduplicate_and_exclude_vacancy(self):
        html = '<div class="box -gray"><strong>Example</strong></div>' * 2
        html += '<div class="box -gray"><strong>Vacant</strong></div>'
        rows = judges.roster_rows(html, 'supreme_deputy', 'https://example.invalid/roster')
        self.assertEqual(len(rows), 1)
        self.assertIsNone(rows[0]['annual_payment_chf'])
        self.assertEqual(rows[0]['payment_status'], 'not_verified')

    def test_empty_roster_fails_closed(self):
        with self.assertRaises(ValueError):
            judges.roster_rows('<p>Unavailable</p>', 'supreme_ordinary', 'https://example.invalid/')


class ContributionTests(unittest.TestCase):
    def test_latest_named_declaration_preserves_year_and_evidence(self):
        judge = judges.record('Judge', 'supreme', 'Judge', 'https://example.invalid/')
        evidence = {'judge_id': judge['id'], 'year': 2025, 'amount_chf': 8000,
                    'source_url': 'https://politikfinanzierung.efk.admin.ch/app/de/party-financings/594/forms/30-42-109',
                    'status': 'party_declared_on_official_register'}
        older = dict(evidence, year=2023, amount_chf=7000)
        unmatched = dict(evidence, year=2024, amount_chf=None, status='no_matching_name_in_consulted_table')
        judges.apply_contributions([judge], [evidence, older, unmatched])
        nodes, _ = network.build([], [], [], [judge])
        self.assertEqual(nodes[0]['annual_payment_chf'], 8000)
        self.assertEqual(nodes[0]['payment_year'], 2025)
        self.assertEqual(nodes[0]['payment_source_urls'], [evidence['source_url']])
        self.assertEqual(nodes[0]['payment_status'], 'official_party_declaration_not_bank_audited')

    def test_invalid_money_or_identity_fails_closed(self):
        judge = judges.record('Judge', 'supreme', 'Judge', 'https://example.invalid/')
        evidence = {'judge_id': judge['id'], 'year': 2025, 'amount_chf': 8000,
                    'source_url': 'https://politikfinanzierung.efk.admin.ch/app/de/party-financings/example',
                    'status': 'party_declared_on_official_register'}
        for patch in [{'amount_chf': -1}, {'amount_chf': float('nan')}, {'amount_chf': True},
                      {'judge_id': 'unknown'}, {'source_url': 'https://example.invalid/'}]:
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                judges.apply_contributions([judge], [dict(evidence, **patch)])


class NetworkTests(unittest.TestCase):
    def build(self):
        bodies = [{'id': 1, 'country_key': 'CHE'}, {'id': 2, 'country_key': 'LIE'}]
        people = [{'id': 3, 'body_id': 1, 'fullname': 'Example', 'url_api': 'https://example.invalid/person', 'party_harmonized': {'en': 'Social Democratic Party of Switzerland'}},
                  {'id': 4, 'body_id': 2, 'fullname': 'Excluded'}]
        interests = [{'id': 5, 'body_id': 1, 'person_id': 3, 'name': {'de': 'Example AG'}, 'role_name': {'de': 'Mitglied Verwaltungsrat'}, 'url_api': 'https://example.invalid/interest'}]
        judge = judges.record('Judge', 'supreme', 'Judge', 'https://example.invalid/roster')
        judge['party_published'] = 'PS'
        return network.build(bodies, people, interests, [judge])

    def test_swiss_scope_sources_and_valid_endpoints(self):
        nodes, edges = self.build()
        ids = {node['id'] for node in nodes}
        self.assertNotIn('openparldata:person:4', ids)
        self.assertEqual(len(ids), len(nodes))
        self.assertEqual(len({edge['id'] for edge in edges}), len(edges))
        self.assertTrue(all(edge['source'] in ids and edge['target'] in ids and edge['source_urls'] for edge in edges))
        party_targets = [edge['target'] for edge in edges if edge['type'] == 'published_party_affiliation']
        self.assertEqual(party_targets[0], party_targets[1])

    def test_board_word_does_not_become_verified_entity_or_payment(self):
        nodes, edges = self.build()
        interest = next(edge for edge in edges if edge['type'] == 'declared_interest')
        self.assertIn('Verwaltungsrat', interest['board_word_match'])
        self.assertEqual(interest['board_classification'], 'explicit_word_requires_review')
        self.assertTrue(all(edge['type'] != 'payment' for edge in edges))
        organization = next(node for node in nodes if node['type'] == 'organization_label_group')
        self.assertEqual(organization['identity_status'], 'unverified_textual_group_not_legal_entity')


class GovernanceRoleTests(unittest.TestCase):
    def test_candidate_identity_is_not_confirmed_role(self):
        judge = judges.record('Judge', 'supreme', 'Judge', 'https://example.invalid/')
        role = {'id': 'role:example', 'judge_id': judge['id'], 'organization': 'Foundation',
                'role': 'Former board member', 'temporal_status': 'deletion_published_2026',
                'identity_status': 'corroborated_name_and_origin_requires_direct_confirmation',
                'source_urls': ['https://example.invalid/notice']}
        nodes, edges = network.build([], [], [], [judge], [role])
        edge = next(e for e in edges if e['id'] == role['id'])
        self.assertEqual(edge['type'], 'candidate_public_governance_role')
        self.assertEqual(edge['temporal_status'], 'deletion_published_2026')
        self.assertIn(edge['target'], {n['id'] for n in nodes})
        role['identity_status'] = 'direct_primary_identification'
        _, edges = network.build([], [], [], [judge], [role])
        self.assertEqual(edges[-1]['type'], 'published_public_governance_role')
        role['judge_id'] = 'unknown'
        with self.assertRaises(ValueError):
            network.build([], [], [], [judge], [role])


class EvidenceDistinctionTests(unittest.TestCase):
    def test_independent_judge_can_have_historical_nominating_party(self):
        judge = judges.record('Example', 'supreme', 'Judge', 'https://example.invalid/')
        judge['party_published'] = 'Sans appartenance à un parti politique'
        judge['nominating_party_published'] = 'UDC'
        nodes, edges = network.build([], [], [], [judge])
        self.assertFalse(any(edge['type'] == 'published_party_affiliation' for edge in edges))
        self.assertEqual(sum(edge['type'] == 'published_nominating_party' for edge in edges), 1)
        self.assertTrue(all(edge['source'] in {node['id'] for node in nodes} for edge in edges))

    def test_sympathy_is_not_membership(self):
        judge = judges.record('Example', 'administrative', 'Judge', 'https://example.invalid/')
        judge['party_published'] = 'Sympathisante des VERT-E-S suisses'
        nodes, edges = network.build([], [], [], [judge])
        self.assertEqual(edges[-1]['type'], 'published_party_sympathy')
        self.assertEqual(nodes[-1]['label'], 'Verts')

    def test_unextracted_declaration_is_not_an_organization(self):
        people = [{'id': 1, 'body_id': 2, 'fullname': 'Example', 'url_api': 'https://example.invalid/person'}]
        interests = [{'id': 3, 'person_id': 1, 'body_id': 2, 'name': {}, 'declaration_doc_url': 'https://example.invalid/declaration', 'url_api': 'https://example.invalid/interest'}]
        nodes, edges = network.build([{'id': 2, 'country_key': 'CHE'}], people, interests, [])
        self.assertEqual(edges[0]['type'], 'declaration_document_reference')
        self.assertEqual(nodes[-1]['type'], 'declaration_document')
        self.assertFalse(any(node['type'] == 'organization_label_group' for node in nodes))


if __name__ == '__main__':
    unittest.main()
