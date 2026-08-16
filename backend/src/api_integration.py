"""
Phase 1: Real API Integration
Concrete implementations for data.gov.in, OpenStreetMap, and PWD APIs.
"""

import requests
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import os

logger = logging.getLogger(__name__)

# API Configuration
DATAGOV_IN_API_KEY = os.getenv('DATAGOV_IN_API_KEY', '')
DATAGOV_BASE_URL = 'https://api.data.gov.in/resource'
OSM_BASE_URL = 'https://api.openstreetmap.org'
TIMEOUT = 15

# State mappings
STATE_CODES = {
    'TN': 'Tamil Nadu',
    'KN': 'Karnataka',
    'AP': 'Andhra Pradesh',
    'KL': 'Kerala',
    'MH': 'Maharashtra',
    'DL': 'Delhi'
}

class DataGovInAPI:
    """Fetch traffic law amendments from data.gov.in"""
    
    @staticmethod
    def fetch_traffic_laws(state: str) -> List[Dict]:
        """
        Fetch traffic law amendments for a state from data.gov.in.
        
        API Documentation: https://data.gov.in/resource/traffic-violations-fines
        
        Returns:
            List of law amendment objects with multilingual content
        """
        try:
            state_name = STATE_CODES.get(state, state)
            
            # data.gov.in API endpoint for traffic violations
            endpoint = f'{DATAGOV_BASE_URL}/9ef6b104-3185-4c42-baf3-c0abf4538186'
            
            params = {
                'api-key': DATAGOV_IN_API_KEY if DATAGOV_IN_API_KEY else 'test',
                'format': 'json',
                'filters[state]': state_name,
                'limit': 100
            }
            
            logger.info(f"[API] Fetching traffic laws for {state} from data.gov.in")
            
            response = requests.get(endpoint, params=params, timeout=TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            records = data.get('records', [])
            
            # Parse and transform API response to our schema
            amendments = []
            for record in records:
                amendment = {
                    'id': f"law_{state}_{record.get('id', '')}_{int(datetime.now().timestamp())}",
                    'state': state,
                    'city': record.get('city', 'State-wide'),
                    'law_id': record.get('section', ''),
                    'amendment': record.get('amendment_text', record.get('description', '')),
                    'amendment_ml': {
                        'ta': DataGovInAPI._translate_text(record.get('amendment_text', ''), 'ta'),
                        'hi': DataGovInAPI._translate_text(record.get('amendment_text', ''), 'hi')
                    },
                    'effective_date': record.get('effective_date', datetime.now().date().isoformat()),
                    'source': 'data.gov.in'
                }
                amendments.append(amendment)
            
            logger.info(f"[API] ✓ Fetched {len(amendments)} amendments from data.gov.in for {state}")
            return amendments
        
        except requests.exceptions.Timeout:
            logger.warning(f"[API] Timeout fetching laws for {state}")
            return []
        except requests.exceptions.RequestException as e:
            logger.error(f"[API] Error fetching laws for {state}: {e}")
            return []
        except Exception as e:
            logger.error(f"[API] Unexpected error: {e}")
            return []
    
    @staticmethod
    def _translate_text(text: str, language: str) -> str:
        """
        Placeholder for translation. In production, use Google Translate API or offline model.
        For MVP, we'll use pre-stored translations or return empty.
        """
        # TODO: Integrate actual translation service (Phase 1.5)
        return ""


class OpenStreetMapAPI:
    """Fetch traffic incidents from OpenStreetMap and related APIs"""
    
    @staticmethod
    def fetch_incidents(state: str) -> List[Dict]:
        """
        Fetch traffic incidents for a state from OpenStreetMap.
        
        Sources:
        - OSM Notes API (crowdsourced incident reports)
        - Traffic signals & hazards from OSM tags
        - State traffic authority RSS feeds
        
        Returns:
            List of incident objects with location and severity
        """
        try:
            state_name = STATE_CODES.get(state, state)
            
            logger.info(f"[API] Fetching incidents for {state} from OpenStreetMap")
            
            # Fetch from OSM Notes API (reports of incidents)
            incidents = OpenStreetMapAPI._fetch_osm_notes(state)
            
            # Fallback: Fetch from state traffic authority RSS (if available)
            if len(incidents) < 5:
                incidents.extend(OpenStreetMapAPI._fetch_state_traffic_feed(state))
            
            logger.info(f"[API] ✓ Fetched {len(incidents)} incidents for {state}")
            return incidents
        
        except Exception as e:
            logger.error(f"[API] Error fetching incidents: {e}")
            return []
    
    @staticmethod
    def _fetch_osm_notes(state: str) -> List[Dict]:
        """
        Fetch from OpenStreetMap Notes API.
        Notes are comments on map changes, often include traffic incidents.
        """
        try:
            # Get bounding box for state (approximate centers)
            state_bbox = OpenStreetMapAPI._get_state_bbox(state)
            if not state_bbox:
                return []
            
            # OSM Notes API: https://wiki.openstreetmap.org/wiki/API_v0.6#Notes
            bbox = f"{state_bbox['south']},{state_bbox['west']},{state_bbox['north']},{state_bbox['east']}"
            
            endpoint = f'{OSM_BASE_URL}/api/0.6/notes'
            params = {
                'bbox': bbox,
                'limit': 100,
                'format': 'json'
            }
            
            response = requests.get(endpoint, params=params, timeout=TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            notes = data.get('features', [])
            
            # Filter for traffic-related keywords
            incidents = []
            traffic_keywords = ['accident', 'congestion', 'traffic', 'collision', 'hazard', 'pothole', 'crash']
            
            for note in notes:
                text = note.get('properties', {}).get('comments', [{}])[-1].get('text', '').lower()
                if any(kw in text for kw in traffic_keywords):
                    incident = {
                        'id': f"incident_osm_{note.get('id')}_{state}",
                        'location_id': state,
                        'incident_type': OpenStreetMapAPI._classify_incident(text),
                        'severity': OpenStreetMapAPI._classify_severity(text),
                        'latitude': note.get('geometry', {}).get('coordinates', [0, 0])[1],
                        'longitude': note.get('geometry', {}).get('coordinates', [0, 0])[0],
                        'description': text[:100],
                        'description_ml': {
                            'ta': '',  # TODO: Translate
                            'hi': ''   # TODO: Translate
                        },
                        'timestamp': note.get('properties', {}).get('created_at', datetime.now().isoformat()),
                        'source': 'openstreetmap',
                        'ttl_minutes': 240  # Incidents valid for 4 hours
                    }
                    incidents.append(incident)
            
            return incidents[:20]  # Limit to top 20
        
        except Exception as e:
            logger.error(f"[API] OSM Notes fetch failed: {e}")
            return []
    
    @staticmethod
    def _fetch_state_traffic_feed(state: str) -> List[Dict]:
        """
        Fetch from state traffic authority RSS feeds (if available).
        Example: TN Traffic Police Twitter/RSS feed (phase 1.5)
        """
        # TODO: Implement state-specific traffic feeds (Phase 1.5)
        return []
    
    @staticmethod
    def _classify_incident(text: str) -> str:
        """Classify incident type from text"""
        text_lower = text.lower()
        if 'accident' in text_lower or 'collision' in text_lower or 'crash' in text_lower:
            return 'accident'
        elif 'congestion' in text_lower or 'traffic' in text_lower or 'jam' in text_lower:
            return 'congestion'
        elif 'hazard' in text_lower or 'danger' in text_lower:
            return 'hazard'
        return 'other'
    
    @staticmethod
    def _classify_severity(text: str) -> str:
        """Classify severity from text"""
        text_lower = text.lower()
        if 'critical' in text_lower or 'fatal' in text_lower:
            return 'critical'
        elif 'accident' in text_lower or 'collision' in text_lower:
            return 'high'
        elif 'congestion' in text_lower:
            return 'medium'
        return 'low'
    
    @staticmethod
    def _get_state_bbox(state: str) -> Optional[Dict]:
        """Get approximate bounding box for a state"""
        # Bounding boxes (approximate centers with buffer)
        bboxes = {
            'TN': {'south': 8.0, 'west': 76.0, 'north': 13.5, 'east': 80.3},
            'KN': {'south': 11.5, 'west': 74.0, 'north': 18.5, 'east': 78.5},
            'AP': {'south': 13.0, 'west': 76.5, 'north': 19.8, 'east': 84.9},
            'KL': {'south': 8.0, 'west': 76.0, 'north': 12.5, 'east': 77.6},
            'MH': {'south': 15.5, 'west': 72.6, 'north': 22.0, 'east': 80.9},
            'DL': {'south': 28.4, 'west': 76.8, 'north': 28.9, 'east': 77.3}
        }
        return bboxes.get(state)


class PublicWorksDepartmentAPI:
    """Fetch road conditions from state PWD (Public Works Department) feeds"""
    
    @staticmethod
    def fetch_conditions(state: str) -> List[Dict]:
        """
        Fetch road conditions (potholes, construction, closures) from state PWD.
        
        Sources vary by state:
        - TN: https://www.roads.tn.gov.in/ (if available)
        - KN: https://www.kptcl.in/ (electricity authority, sometimes has info)
        - Other states: Local PWD portals or maintenance notifications
        
        Returns:
            List of road condition objects
        """
        try:
            logger.info(f"[API] Fetching road conditions for {state} from PWD")
            
            # Try state-specific PWD endpoints
            conditions = PublicWorksDepartmentAPI._fetch_state_pwd(state)
            
            # Fallback: Check OSM for pothole/construction tags
            if len(conditions) < 3:
                conditions.extend(PublicWorksDepartmentAPI._fetch_osm_conditions(state))
            
            logger.info(f"[API] ✓ Fetched {len(conditions)} road conditions for {state}")
            return conditions
        
        except Exception as e:
            logger.error(f"[API] Error fetching road conditions: {e}")
            return []
    
    @staticmethod
    def _fetch_state_pwd(state: str) -> List[Dict]:
        """Fetch from state-specific PWD portals"""
        # TODO: Implement state-specific PWD integrations (Phase 1.5)
        # Example for TN: Scrape https://www.roads.tn.gov.in/road-work-status
        
        # For MVP, return empty (mock data fills in)
        return []
    
    @staticmethod
    def _fetch_osm_conditions(state: str) -> List[Dict]:
        """Fetch road condition tags from OpenStreetMap"""
        try:
            state_bbox = OpenStreetMapAPI._get_state_bbox(state)
            if not state_bbox:
                return []
            
            # OSM Way API with pothole/surface tags
            bbox = f"{state_bbox['south']},{state_bbox['west']},{state_bbox['north']},{state_bbox['east']}"
            
            # Note: This is a simplified approach. Full implementation would require
            # parsing OSM XML or using a tile server.
            
            # For MVP, we'll check recent changesets with relevant tags
            endpoint = f'{OSM_BASE_URL}/api/0.6/changesets'
            params = {
                'bbox': bbox,
                'limit': 50,
                'format': 'json'
            }
            
            response = requests.get(endpoint, params=params, timeout=TIMEOUT)
            response.raise_for_status()
            
            data = response.json()
            changesets = data.get('changesets', [])
            
            # Look for road maintenance-related changesets
            conditions = []
            for cs in changesets:
                tags = cs.get('tags', {})
                if any(keyword in str(tags).lower() for keyword in ['pothole', 'construction', 'maintenance']):
                    condition = {
                        'id': f"condition_osm_{cs.get('id')}_{state}",
                        'location_id': state,
                        'condition_type': PublicWorksDepartmentAPI._classify_condition(tags),
                        'severity': 'medium',
                        'latitude': (float(cs.get('max_lat', 0)) + float(cs.get('min_lat', 0))) / 2,
                        'longitude': (float(cs.get('max_lon', 0)) + float(cs.get('min_lon', 0))) / 2,
                        'description': tags.get('comment', 'Road maintenance work'),
                        'description_ml': {'ta': '', 'hi': ''},
                        'estimated_duration': 'Unknown',
                        'timestamp': cs.get('created_at', datetime.now().isoformat()),
                        'source': 'openstreetmap'
                    }
                    conditions.append(condition)
            
            return conditions[:15]  # Limit to top 15
        
        except Exception as e:
            logger.error(f"[API] OSM conditions fetch failed: {e}")
            return []
    
    @staticmethod
    def _classify_condition(tags: Dict) -> str:
        """Classify road condition type from tags"""
        tags_str = str(tags).lower()
        if 'pothole' in tags_str:
            return 'pothole'
        elif 'construction' in tags_str or 'maintenance' in tags_str:
            return 'construction'
        elif 'closure' in tags_str or 'closed' in tags_str:
            return 'closure'
        elif 'flood' in tags_str or 'water' in tags_str:
            return 'flooding'
        return 'other'


def test_api_integration():
    """Test all API integrations"""
    logging.basicConfig(level=logging.INFO)
    
    states = ['TN', 'KN', 'AP']  # Test subset
    
    print("\n" + "="*60)
    print("PHASE 1: API INTEGRATION TEST")
    print("="*60)
    
    for state in states:
        print(f"\n[{state}] Testing APIs...")
        
        # Test traffic laws
        laws = DataGovInAPI.fetch_traffic_laws(state)
        print(f"  ✓ Traffic Laws: {len(laws)} records")
        
        # Test incidents
        incidents = OpenStreetMapAPI.fetch_incidents(state)
        print(f"  ✓ Incidents: {len(incidents)} records")
        
        # Test conditions
        conditions = PublicWorksDepartmentAPI.fetch_conditions(state)
        print(f"  ✓ Road Conditions: {len(conditions)} records")
    
    print("\n" + "="*60)
    print("Total records fetched across all states:")
    print(f"  Laws: {sum(len(DataGovInAPI.fetch_traffic_laws(s)) for s in states)}")
    print(f"  Incidents: {sum(len(OpenStreetMapAPI.fetch_incidents(s)) for s in states)}")
    print(f"  Conditions: {sum(len(PublicWorksDepartmentAPI.fetch_conditions(s)) for s in states)}")
    print("="*60)


if __name__ == '__main__':
    test_api_integration()
