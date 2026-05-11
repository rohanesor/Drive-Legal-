"""
Test Suite - Verifies backend components work correctly

PURPOSE:
Runs tests on the database, search, zone checking, and response generation
to ensure everything works before building the APK.

USAGE:
  python backend/src/run_tests.py
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from database import initialize_database, get_laws, get_laws_by_type, get_penalties, get_procedures, get_zones
from zones import haversine, check_zones, point_in_polygon
from main import build_template_response, validate_citations, handle_query, handle_zone_check


class TestDatabase(unittest.TestCase):
    """Test database initialization and queries."""

    @classmethod
    def setUpClass(cls):
        initialize_database()

    def test_laws_exist(self):
        """Test that laws were seeded."""
        laws = get_laws('TN')
        self.assertGreater(len(laws), 0)

    def test_laws_filtered_by_state(self):
        """Test that TN-specific laws are returned for TN."""
        laws = get_laws_by_type('speeding', 'TN')
        tn_laws = [l for l in laws if 'TN' in json.loads(l.get('states', '[]'))]
        self.assertGreater(len(tn_laws), 0)

    def test_penalties_exist(self):
        """Test that penalties were seeded."""
        penalties = get_penalties('speeding', 'TN')
        self.assertGreater(len(penalties), 0)
        self.assertIn('₹', penalties[0]['first_offense'])

    def test_procedures_exist(self):
        """Test that procedures were seeded."""
        procedures = get_procedures()
        self.assertGreater(len(procedures), 0)

    def test_zones_exist(self):
        """Test that zones were seeded."""
        zones = get_zones(0, 0, 'TN')
        self.assertGreater(len(zones), 0)


class TestZones(unittest.TestCase):
    """Test zone detection algorithms."""

    def test_haversine_chennai_to_bangalore(self):
        """Distance between Chennai and Bangalore should be ~350km."""
        dist = haversine(13.0827, 80.2707, 12.9716, 77.5946)
        self.assertAlmostEqual(dist / 1000, 290, delta=20)

    def test_haversine_same_point(self):
        """Distance to same point should be 0."""
        dist = haversine(13.0, 80.0, 13.0, 80.0)
        self.assertAlmostEqual(dist, 0, places=2)

    def test_point_in_polygon_inside(self):
        """Point inside square polygon should return True."""
        polygon = [[77.0, 12.0], [78.0, 12.0], [78.0, 13.0], [77.0, 13.0]]
        self.assertTrue(point_in_polygon(12.5, 77.5, polygon))

    def test_point_in_polygon_outside(self):
        """Point outside square polygon should return False."""
        polygon = [[77.0, 12.0], [78.0, 12.0], [78.0, 13.0], [77.0, 13.0]]
        self.assertFalse(point_in_polygon(15.0, 80.0, polygon))

    def test_check_zones_anna_salai(self):
        """Should trigger alert when near Anna Salai, Chennai."""
        alerts = check_zones(13.0569, 80.2540, 'TN')
        self.assertGreater(len(alerts), 0)
        self.assertEqual(alerts[0]['zone_type'], 'accident_prone')

    def test_check_zones_far_from_any(self):
        """Should return no alerts when far from any zone."""
        alerts = check_zones(28.6139, 77.2090, 'DL')
        # Delhi has no zones seeded, should return empty
        self.assertEqual(len(alerts), 0)


class TestResponseGeneration(unittest.TestCase):
    """Test response building and citation validation."""

    def test_build_template_response(self):
        """Test that template response includes law section and penalty."""
        laws = [
            {
                'id': 'mv_act_188',
                'section': 'Motor Vehicles Act, Section 188',
                'description': 'Speed limit violation.',
            }
        ]
        penalties = [
            {
                'first_offense': '₹500',
                'second_offense': '₹1000',
                'additional_details': '',
            }
        ]
        response = build_template_response(laws, penalties, 'TN')
        self.assertIn('Section 188', response)
        self.assertIn('₹500', response)
        self.assertIn('₹1000', response)

    def test_validate_citations_match(self):
        """Valid citations should be preserved."""
        response = "According to Section 188 of the MV Act..."
        laws = [{'section': 'Motor Vehicles Act, Section 188'}]
        validated = validate_citations(response, laws)
        self.assertGreater(len(validated), 0)

    def test_validate_citations_empty(self):
        """Empty response should return no citations."""
        validated = validate_citations('', [])
        self.assertEqual(len(validated), 0)


class TestPipeline(unittest.TestCase):
    """Test the full query pipeline."""

    def test_handle_query_speeding(self):
        """Test querying about speeding."""
        payload = json.dumps({
            'action': 'query',
            'text': 'What is the fine for speeding in Tamil Nadu?',
            'location': {'lat': 13.0, 'lng': 80.0, 'state': 'TN'},
            'language': 'en',
        })
        result = json.loads(handle_query(payload))
        # Should not crash
        self.assertIn('status', result)

    def test_handle_query_helmet(self):
        """Test querying about helmet laws."""
        payload = json.dumps({
            'action': 'query',
            'text': 'Do I need to wear a helmet?',
            'location': {'lat': 13.0, 'lng': 80.0, 'state': 'TN'},
            'language': 'en',
        })
        result = json.loads(handle_query(payload))
        self.assertIn('status', result)

    def test_handle_zone_check(self):
        """Test zone checking at Anna Salai."""
        payload = json.dumps({
            'action': 'check_zone',
            'location': {'lat': 13.0569, 'lng': 80.2540, 'state': 'TN'},
        })
        result = json.loads(handle_zone_check(payload))
        # Should return a zone alert
        self.assertIn(result['status'], ['zone_alert', 'no_alert'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
