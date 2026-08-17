"""
test_e2e_full_system.py — Complete End-to-End System Test Suite for Vazhi.

Tests the full server pipeline, API endpoints, AI routing engines,
multilingual legal queries, geocoding, map-matching, and safety matrices.
"""

import unittest
import threading
import time
import json
import urllib.request
import urllib.error
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import DriveLegalServer, HTTPServer

TEST_PORT = 9876
BASE_URL = f"http://127.0.0.1:{TEST_PORT}"


class TestVazhiE2EFullSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Start local HTTP server in background thread."""
        cls.server = HTTPServer(('127.0.0.1', TEST_PORT), DriveLegalServer)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever)
        cls.server_thread.daemon = True
        cls.server_thread.start()
        time.sleep(0.5)  # Allow server to boot

    @classmethod
    def tearDownClass(cls):
        """Shutdown background server."""
        cls.server.shutdown()
        cls.server.server_close()

    def _post(self, path: str, payload: dict) -> dict:
        req = urllib.request.Request(
            f"{BASE_URL}{path}",
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'X-Request-ID': 'e2e-test-request'}
        )
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            return json.loads(resp.read().decode('utf-8'))

    def _get(self, path: str) -> dict:
        req = urllib.request.Request(f"{BASE_URL}{path}")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            return json.loads(resp.read().decode('utf-8'))

    def test_01_health_check(self):
        """Verify GET /health endpoint returns seeded status."""
        data = self._get('/health')
        self.assertEqual(data.get('status'), 'success')
        health = data.get('health', {})
        self.assertEqual(health.get('status'), 'healthy')
        self.assertGreater(health.get('laws_count', 0), 0)
        self.assertGreater(health.get('penalties_count', 0), 0)

    def test_02_multilingual_legal_query(self):
        """Verify POST /query with Tamil and Hindi queries."""
        # Tamil query about speeding
        ta_res = self._post('/query', {'action': 'query', 'text': 'speeding fine in Tamil Nadu', 'state': 'TN', 'language': 'ta'})
        self.assertEqual(ta_res.get('status'), 'success', f"Query failed: {ta_res.get('message')}")
        ans_ta = ta_res.get('answer') or ta_res.get('response') or ''
        self.assertTrue(len(ans_ta) > 0)

        # Hindi query about helmet
        hi_res = self._post('/query', {'action': 'query', 'text': 'helmet fine in Delhi', 'state': 'DL', 'language': 'hi'})
        self.assertEqual(hi_res.get('status'), 'success')
        ans_hi = hi_res.get('answer') or hi_res.get('response') or ''
        self.assertTrue(len(ans_hi) > 0)

    def test_03_explain_route(self):
        """Verify POST /navigation/explain route explanation engine."""
        res = self._post('/navigation/explain', {
            'question': 'Why are we taking this route?',
            'navigationContext': {
                'isNavigating': True,
                'destinationName': 'Ooty Hills',
                'activeRouteName': 'Safe Hill Perspective'
            },
            'alternativeRoutes': [
                {'id': 'r1', 'name': 'Safe Route', 'distance': 45000, 'duration': 3600, 'safetyScore': 95, 'hazards': []}
            ]
        })
        self.assertEqual(res.get('status'), 'success')
        self.assertIn('answer', res)

    def test_04_compare_routes(self):
        """Verify POST /navigation/compare multi-route metric calculation."""
        res = self._post('/navigation/compare', {
            'alternativeRoutes': [
                {'id': 'r1', 'name': 'NH-44 Expressway', 'distance': 50000, 'duration': 3000, 'hazards': ['speed_breaker'], 'sharpCurves': 1},
                {'id': 'r2', 'name': 'State Highway Bypass', 'distance': 42000, 'duration': 3600, 'hazards': ['accident_blackspot'], 'sharpCurves': 4}
            ]
        })
        self.assertEqual(res.get('status'), 'success')
        self.assertIn('routes', res)
        self.assertIn('recommended_route_id', res)

    def test_05_map_matching(self):
        """Verify POST /navigation/map_match GPS trace snapping."""
        res = self._post('/navigation/map_match', {
            'gpsPoints': [
                {'lat': 11.0168, 'lng': 76.9558, 'speed': 45.0},
                {'lat': 11.0180, 'lng': 76.9570, 'speed': 48.0}
            ]
        })
        self.assertEqual(res.get('status'), 'success')
        self.assertGreater(len(res.get('matched_points', [])), 0)

    def test_06_geocoding(self):
        """Verify POST /navigation/geocode reverse and forward address lookups."""
        # Reverse geocode
        rev = self._post('/navigation/geocode', {'lat': 11.0168, 'lng': 76.9558, 'language': 'en'})
        self.assertEqual(rev.get('status'), 'success')
        self.assertIn('district', rev)

        # Forward geocode
        fwd = self._post('/navigation/geocode', {'query': 'Anna Salai', 'state': 'TN', 'language': 'ta'})
        self.assertEqual(fwd.get('status'), 'success')
        self.assertIn('lat', fwd)

    def test_07_safety_matrix(self):
        """Verify POST /navigation/safety_matrix cost matrix calculation."""
        res = self._post('/navigation/safety_matrix', {
            'origins': [{'lat': 11.0168, 'lng': 76.9558}],
            'destinations': [{'lat': 11.4102, 'lng': 76.6950}],
            'vehicleType': 'car'
        })
        self.assertEqual(res.get('status'), 'success')
        self.assertIn('distances_m', res)
        self.assertIn('durations_s', res)
        self.assertIn('safety_scores', res)

    def test_08_poi_discovery(self):
        """Verify POST /navigation/poi real-time POI search."""
        res = self._post('/navigation/poi', {
            'lat': 11.0168,
            'lng': 76.9558,
            'poiType': 'charging_station',
            'limit': 3
        })
        self.assertEqual(res.get('status'), 'success')
        self.assertGreater(len(res.get('pois', [])), 0)

    def test_09_isochrone(self):
        """Verify POST /navigation/isochrone EV reachability calculation."""
        res = self._post('/navigation/isochrone', {
            'lat': 11.0168,
            'lng': 76.9558,
            'rangeMinutes': 25,
            'socPercentage': 80
        })
        self.assertEqual(res.get('status'), 'success')
        self.assertIn('polygon_coords', res)
        self.assertGreater(len(res.get('polygon_coords', [])), 0)

    def test_10_networkx_route(self):
        """Verify POST /navigation/networkx_route graph routing."""
        res = self._post('/navigation/networkx_route', {
            'origin': {'lat': 11.0168, 'lng': 76.9558},
            'destination': {'lat': 11.4102, 'lng': 76.6950}
        })
        self.assertEqual(res.get('status'), 'success')
        self.assertIn('path_coords', res)

    def test_11_spatial_analytics(self):
        """Verify POST /navigation/spatial_analytics network density analysis."""
        res = self._post('/navigation/spatial_analytics', {
            'lat': 11.0168,
            'lng': 76.9558,
            'radiusMeters': 1000
        })
        self.assertEqual(res.get('status'), 'success')
        self.assertIn('engine', res)


if __name__ == '__main__':
    unittest.main()
