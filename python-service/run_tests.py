import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

sys.stdout.reconfigure(encoding='utf-8')

from database import initialize_database, get_laws, get_penalties
from search import keyword_fallback
from zones import haversine, check_zones
from main import handle_query, handle_zone_check
import json

print('=== Database Tests ===')
initialize_database()
laws = get_laws('TN')
speeding = [l for l in laws if l['violation_type'] == 'speeding']
assert len(speeding) >= 2, f'Expected >= 2 speeding laws, got {len(speeding)}'
print(f'Speeding laws in TN: {len(speeding)} PASS')

penalties = get_penalties('speeding', 'TN')
assert penalties[0]['first_offense'] == '₹500', f'Expected ₹500, got {penalties[0]["first_offense"]}'
print(f'TN speeding penalty: {penalties[0]["first_offense"]} PASS')

kn_penalties = get_penalties('speeding', 'KN')
assert kn_penalties[0]['first_offense'] == '₹400', f'Expected ₹400, got {kn_penalties[0]["first_offense"]}'
print(f'KN speeding penalty: {kn_penalties[0]["first_offense"]} PASS')

print('\n=== Search Tests ===')
results = keyword_fallback('What is speed limit?', 'TN')
assert len(results) > 0, 'Expected keyword results'
print(f'Keyword fallback results: {len(results)} PASS')

print('\n=== Zone Tests ===')
alerts = check_zones(13.0569, 80.2540, 'TN')
assert len(alerts) >= 1, 'Expected at least 1 zone alert'
assert 'Anna Salai' in alerts[0]['zone_name'], f'Expected Anna Salai, got {alerts[0]["zone_name"]}'
print(f'Zone alerts at Anna Salai: {alerts[0]["zone_name"]} PASS')

outside_alerts = check_zones(13.5, 80.5, 'TN')
assert len(outside_alerts) == 0, 'Expected no zone alerts outside known zones'
print('No false positives outside zones PASS')

print('\n=== Pipeline Tests ===')
payload = json.dumps({
    'action': 'query',
    'text': 'What is the fine for speeding?',
    'location': {'lat': 13.0, 'lng': 80.0, 'state': 'TN'},
    'language': 'en',
})
result = json.loads(handle_query(payload))
assert result['status'] == 'success', f'Expected success, got {result["status"]}'
assert 'response_text' in result
assert 'source_sections' in result
assert 'confidence' in result
print(f'Query status: {result["status"]} PASS')
print(f'Source sections: {result["source_sections"]}')
print(f'Confidence: {result["confidence"]}')

print('\n=== Zone Check Tests ===')
zone_payload = json.dumps({
    'action': 'check_zone',
    'location': {'lat': 13.0569, 'lng': 80.254, 'state': 'TN'},
})
zone_result = json.loads(handle_zone_check(zone_payload))
assert zone_result['status'] == 'zone_alert'
assert zone_result['severity'] == 'high'
print(f'Zone check: {zone_result["zone_name"]} PASS')

print('\n=== ALL TESTS PASSED ===')
