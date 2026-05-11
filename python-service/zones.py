import json
import math
from typing import List, Dict, Optional
from database import get_zones


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def point_in_polygon(lat: float, lng: float, polygon: List[List[float]]) -> bool:
    n = len(polygon)
    inside = False

    x = lng
    y = lat

    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside


def check_zones(lat: float, lng: float, state: str, last_state: str = None) -> List[Dict]:
    alerts = []

    if last_state and last_state != state:
        alerts.append(create_state_border_alert(state))

    zones = get_zones(lat, lng, state)

    for zone in zones:
        if zone.get('center_lat') and zone.get('center_lng'):
            distance = haversine(lat, lng, zone['center_lat'], zone['center_lng'])
            if distance <= zone.get('radius_meters', 500):
                alerts.append(create_zone_alert(zone, distance))
        elif zone.get('polygon'):
            try:
                polygon = json.loads(zone['polygon'])
                if point_in_polygon(lat, lng, polygon):
                    alerts.append(create_zone_alert(zone))
            except (json.JSONDecodeError, TypeError):
                continue

    return alerts


def create_state_border_alert(new_state: str) -> Dict:
    return {
        'status': 'zone_alert',
        'zone_type': 'state_border',
        'zone_name': f'Entering {new_state}',
        'message': f"You've entered a new state. Traffic laws and penalties may differ.",
        'suggested_query': f"What are the traffic laws in {new_state}?",
        'severity': 'medium',
    }


def create_zone_alert(zone: Dict, distance: float = None) -> Dict:
    message = zone.get('message_template', '')

    if distance is not None:
        message = f"{zone.get('name', 'Zone')}: {message}"

    speed_limit = zone.get('speed_limit')
    if speed_limit:
        message += f" Speed limit: {speed_limit} km/h."

    return {
        'status': 'zone_alert',
        'zone_type': zone.get('zone_type', 'custom'),
        'zone_name': zone.get('name', 'Unknown Zone'),
        'message': message,
        'suggested_query': f"What are the rules for {zone.get('zone_type', 'this zone')}?",
        'severity': zone.get('severity', 'medium'),
    }
