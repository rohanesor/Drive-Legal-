import pytest
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python-service'))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python-service')))

os.environ['PYTHONPATH'] = os.path.join(os.path.dirname(__file__), '..', 'python-service')

from database import initialize_database, get_laws, get_penalties, get_zones
from search import keyword_fallback
from zones import haversine, check_zones


class TestDatabase:
    @classmethod
    def setup_class(cls):
        initialize_database()

    def test_get_speeding_laws_tn(self):
        laws = get_laws('TN')
        speeding = [l for l in laws if l['violation_type'] == 'speeding']
        assert len(speeding) >= 2
        assert any('188' in l['section'] for l in speeding)

    def test_get_penalties_speeding_tn(self):
        penalties = get_penalties('speeding', 'TN')
        assert len(penalties) >= 1
        assert penalties[0]['first_offense'] == '₹500'

    def test_get_penalties_speeding_kn(self):
        penalties = get_penalties('speeding', 'KN')
        assert len(penalties) >= 1
        assert penalties[0]['first_offense'] == '₹400'

    def test_get_zones_chennai(self):
        zones = get_zones(13.0569, 80.2540, 'TN')
        assert len(zones) >= 1
        assert any('Anna Salai' in z['name'] for z in zones)


class TestSearch:
    def test_keyword_fallback_speeding(self):
        results = keyword_fallback('What is speed limit?', 'TN')
        assert len(results) > 0
        assert any('speed' in r['title'].lower() for r in results)

    def test_keyword_fallback_helmet(self):
        results = keyword_fallback('helmet required', 'KN')
        assert len(results) > 0
        assert any('helmet' in r['title'].lower() for r in results)


class TestZones:
    def test_haversine_chennai(self):
        distance = haversine(13.0569, 80.2540, 13.0570, 80.2541)
        assert 10 < distance < 20

    def test_check_zone_anna_salai(self):
        alerts = check_zones(13.0569, 80.2540, 'TN')
        assert len(alerts) >= 1
        assert any('Anna Salai' in a['zone_name'] for a in alerts)

    def test_no_zone_outside_area(self):
        alerts = check_zones(13.5, 80.5, 'TN')
        assert len(alerts) == 0


class TestPipeline:
    def test_handle_query_speeding(self):
        from main import handle_query
        payload = json.dumps({
            'action': 'query',
            'text': 'What is the fine for speeding?',
            'location': {'lat': 13.0, 'lng': 80.0, 'state': 'TN'},
            'language': 'en',
        })
        result = json.loads(handle_query(payload))
        assert result['status'] == 'success'
        assert 'response_text' in result
        assert 'source_sections' in result
        assert 'confidence' in result

    def test_handle_query_helmet_kn(self):
        from main import handle_query
        payload = json.dumps({
            'action': 'query',
            'text': 'helmet rule Karnataka',
            'location': {'lat': 12.97, 'lng': 77.59, 'state': 'KN'},
            'language': 'en',
        })
        result = json.loads(handle_query(payload))
        assert result['status'] == 'success'
        assert '194B' in result['response_text']

    def test_handle_zone_check(self):
        from main import handle_zone_check
        payload = json.dumps({
            'action': 'check_zone',
            'location': {'lat': 13.0569, 'lng': 80.254, 'state': 'TN'},
        })
        result = json.loads(handle_zone_check(payload))
        assert result['status'] == 'zone_alert'
        assert result['severity'] == 'high'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
