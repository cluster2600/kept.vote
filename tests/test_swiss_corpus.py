import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('collector', Path(__file__).resolve().parents[1] / 'scripts/collect_swiss_corpus.py')
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class PaginationTests(unittest.TestCase):
    def test_duplicate_ids_fail_closed(self):
        page = {'data': [{'id': 1}], 'meta': {'total_records': 2}}
        seen = set()
        collector.check_page(page, seen)
        with self.assertRaises(ValueError):
            collector.check_page(page, seen)

    def test_empty_endpoint_is_valid(self):
        self.assertEqual(collector.check_page({'data': [], 'meta': {'total_records': 0}}, set())[0], [])

    def test_person_fields_exclude_contacts(self):
        fields = set(collector.PERSON_FIELDS.split(','))
        self.assertFalse(fields & {'email', 'phone', 'street', 'birthday', 'postal_code'})


class CollectionTests(unittest.TestCase):
    def test_failed_download_preserves_existing_dataset(self):
        import tempfile
        from unittest.mock import patch
        import subprocess
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / 'persons.jsonl'
            target.write_text('existing snapshot\n')
            with patch.object(collector, 'ROOT', root), patch.object(collector.subprocess, 'check_output', side_effect=subprocess.CalledProcessError(22, 'curl')):
                with self.assertRaises(subprocess.CalledProcessError):
                    collector.collect('persons', None)
            self.assertEqual(target.read_text(), 'existing snapshot\n')
            self.assertFalse((root / 'persons.jsonl.tmp').exists())

    def test_collection_strips_contacts_and_caps_explicitly(self):
        import json
        import tempfile
        from unittest.mock import patch
        payload = json.dumps({'data': [{'id': 1, 'fullname': 'Example', 'email': 'private@example.invalid'}], 'meta': {'total_records': 2}}).encode()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(collector, 'ROOT', root), patch.object(collector.subprocess, 'check_output', return_value=payload):
                result = collector.collect('persons', 1)
            self.assertEqual(result['records'], 1)
            self.assertFalse(result['complete_endpoint'])
            self.assertNotIn('email', json.loads((root / 'persons.jsonl').read_text()))


class CorpusTests(unittest.TestCase):
    def test_case_drafts_remain_dated_and_attributed(self):
        import json
        rows = json.loads((collector.ROOT / 'case_reviews.json').read_text())
        self.assertEqual(len({row['id'] for row in rows}), len(rows))
        for row in rows:
            self.assertTrue(row['source_urls'])
            self.assertTrue(row['checked_on'])
            self.assertTrue(row['follow_up'])
            self.assertFalse(row['current_status_verified'])
            self.assertEqual(row['publication_status'], 'draft_requires_review')


if __name__ == '__main__':
    unittest.main()
