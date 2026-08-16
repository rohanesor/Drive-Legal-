"""
Search integration for real-time data with FAISS embeddings.
Combines traditional semantic search with real-time incident/condition alerts.
"""

import sys
import os
import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from database import (
    get_traffic_incidents,
    get_road_conditions,
    get_location_laws
)


class RealTimeSearchEnhancer:
    """Enhances search results with real-time data context."""
    
    def __init__(self):
        pass
    
    def enhance_search_results(self, query: str, search_results: List[Dict], state: str, language: str = 'en') -> Dict:
        """
        Enhance FAISS search results with real-time data.
        
        Args:
            query: User query
            search_results: Results from FAISS semantic search
            state: Current state
            language: 'en', 'ta', 'hi'
            
        Returns:
            Enhanced results with incidents, conditions, amendments
        """
        
        # Fetch real-time context
        incidents = get_traffic_incidents(state, limit=10)
        conditions = get_road_conditions(state, limit=10)
        amendments = get_location_laws(state)
        
        # Filter expired items
        incidents = [i for i in incidents if not self._is_expired(i)]
        conditions = [c for c in conditions if not self._is_expired(c)]
        
        # Build contextual alerts
        alerts = self._build_alerts(incidents, conditions, amendments, language)
        
        # Enrich search results with amendments
        enriched_results = self._enrich_with_amendments(search_results, amendments, language)
        
        return {
            'search_results': enriched_results,
            'real_time_context': {
                'alerts': alerts,
                'incident_count': len(incidents),
                'condition_count': len(conditions),
                'amendment_count': len(amendments)
            },
            'disclaimer': self._get_disclaimer(language)
        }
    
    def _is_expired(self, item: Dict) -> bool:
        """Check if a real-time item has expired based on TTL."""
        fetched_at = datetime.fromisoformat(item.get('fetched_at', datetime.now().isoformat()))
        ttl_minutes = item.get('ttl_minutes', 120)
        return datetime.now() - fetched_at > timedelta(minutes=ttl_minutes)
    
    def _build_alerts(self, incidents: List[Dict], conditions: List[Dict], amendments: List[Dict], language: str) -> List[Dict]:
        """Build real-time alert notifications."""
        alerts = []
        
        # High-severity incidents
        for incident in incidents:
            if incident.get('severity') in ['critical', 'high']:
                alerts.append({
                    'type': 'incident',
                    'severity': incident.get('severity'),
                    'title': self._translate_field(incident, 'description', language),
                    'description': f"Location: {incident.get('latitude')}, {incident.get('longitude')}",
                    'icon': '⚠️' if incident.get('severity') == 'high' else '🚨',
                    'timestamp': incident.get('timestamp')
                })
        
        # Severe road conditions
        for condition in conditions:
            if condition.get('severity') in ['severe', 'high']:
                alerts.append({
                    'type': 'condition',
                    'severity': condition.get('severity'),
                    'title': self._translate_field(condition, 'description', language),
                    'description': f"Duration: {condition.get('estimated_duration')}",
                    'icon': '🚧',
                    'timestamp': condition.get('timestamp')
                })
        
        # Recent law amendments
        for amendment in amendments[:3]:  # Top 3 recent
            alerts.append({
                'type': 'amendment',
                'severity': 'info',
                'title': self._translate_field(amendment, 'amendment', language),
                'description': f"Effective: {amendment.get('effective_date')}",
                'icon': '📋',
                'timestamp': amendment.get('fetched_at')
            })
        
        # Sort by severity and recency
        severity_order = {'critical': 0, 'high': 1, 'severe': 2, 'medium': 3, 'low': 4, 'info': 5}
        alerts.sort(key=lambda x: (severity_order.get(x['severity'], 99), x['timestamp']), reverse=True)
        
        return alerts[:10]  # Return top 10 alerts
    
    def _enrich_with_amendments(self, search_results: List[Dict], amendments: List[Dict], language: str) -> List[Dict]:
        """Add amendment context to relevant search results."""
        enriched = []
        
        for result in search_results:
            law_id = result.get('id')
            matching_amendments = [a for a in amendments if a.get('law_id') == law_id]
            
            if matching_amendments:
                result['amendments'] = [
                    {
                        'text': self._translate_field(a, 'amendment', language),
                        'effective_date': a.get('effective_date'),
                        'city': a.get('city')
                    }
                    for a in matching_amendments
                ]
                result['has_recent_changes'] = True
            
            enriched.append(result)
        
        return enriched
    
    def _translate_field(self, item: Dict, field: str, language: str) -> str:
        """Translate a field to target language."""
        if language == 'en':
            return item.get(field, '')
        
        # Check for multilingual version
        ml_field = f'{field}_ml'
        if ml_field in item:
            ml_data = item.get(ml_field, {})
            if isinstance(ml_data, str):
                ml_data = json.loads(ml_data)
            if language in ml_data:
                return ml_data[language]
        
        # Fallback to English
        return item.get(field, '')
    
    def _get_disclaimer(self, language: str) -> str:
        """Get localized disclaimer."""
        disclaimers = {
            'en': '⚖️ Always verify with official traffic authorities. This app provides general information only.',
            'ta': '⚖️ அதிகாரப்பூர்வ போக்குவரத்து அதिकारிகளுடன் எப்போதும் சரிபார்க்கவும். இந்த பயன்பாடு பொதுத் தகவலை மட்டுமே வழங்குகிறது.',
            'hi': '⚖️ हमेशा आधिकारिक ट्रैफिक अथॉरिटीज़ के साथ सत्यापित करें। यह ऐप केवल सामान्य जानकारी प्रदान करता है।'
        }
        return disclaimers.get(language, disclaimers['en'])


def get_enriched_response(query: str, search_results: List[Dict], state: str, language: str = 'en') -> Dict:
    """Convenience function to get enriched search response."""
    enhancer = RealTimeSearchEnhancer()
    return enhancer.enhance_search_results(query, search_results, state, language)


if __name__ == '__main__':
    # Test
    sample_results = [
        {
            'id': 'mv_act_188',
            'title': 'Speed Limit Violation',
            'description': 'Driving a motor vehicle at a speed exceeding the prescribed speed limit'
        }
    ]
    
    result = get_enriched_response(
        'speed limit',
        sample_results,
        'TN',
        'en'
    )
    print(json.dumps(result, indent=2, default=str))
