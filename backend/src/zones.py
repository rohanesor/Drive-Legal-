"""
Zones Module - GPS-based zone detection for traffic alerts

PURPOSE:
Detects when a user enters a traffic law zone and generates
appropriate alerts. Zones include:
- Accident-prone areas (high crash frequency)
- School zones (reduced speed limits, no honking)
- State borders (laws and penalties change)
- Speed change zones (different speed limits apply)

ALGORITHM:
1. Point-based zones: Uses Haversine distance to check if user is
   within the zone's radius of a center point.
2. Polygon-based zones: Uses ray-casting algorithm to check if
   user's coordinates are inside a GeoJSON polygon.

ALERT DEDUPLICATION:
The same zone won't trigger more than once per 30 minutes
(handled in the frontend alertSlice).
"""

import json
import math
from typing import List, Dict, Optional
from database import get_zones


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the distance between two GPS coordinates in meters.
    
    Uses the Haversine formula which accounts for Earth's curvature.
    Accurate enough for zone detection (errors < 0.5% at these distances).
    
    Args:
        lat1, lng1: First coordinate
        lat2, lng2: Second coordinate
    
    Returns:
        Distance in meters
    """
    R = 6371000  # Earth's radius in meters
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
    """
    Check if a point is inside a polygon using the ray-casting algorithm.
    
    How it works:
    - Draw a horizontal ray from the point to infinity
    - Count how many polygon edges the ray crosses
    - If odd number of crossings, point is inside
    
    Args:
        lat: Point latitude
        lng: Point longitude
        polygon: List of [lng, lat] coordinate pairs
    
    Returns:
        True if point is inside the polygon
    """
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
    """
    Check if the user's current location triggers any zone alerts.
    
    PROCESS:
    1. Check if user crossed a state border (laws change)
    2. Check point-based zones (accident areas, schools) using distance
    3. Check polygon-based zones (larger areas) using ray-casting
    
    Args:
        lat: Current latitude
        lng: Current longitude
        state: Current state code
        last_state: Previous state code (for border detection)
    
    Returns:
        List of zone alert dictionaries (empty if no zones triggered)
    """
    alerts = []

    # Check for state border crossing
    if last_state and last_state != state:
        alerts.append(create_state_border_alert(state))

    # Get all zones for this state from database
    zones = get_zones(lat, lng, state)

    for zone in zones:
        # Point-based zones: check if within radius
        if zone.get('center_lat') and zone.get('center_lng'):
            distance = haversine(lat, lng, zone['center_lat'], zone['center_lng'])
            if distance <= zone.get('radius_meters', 500):
                alerts.append(create_zone_alert(zone, distance))
        # Polygon-based zones: check if inside polygon
        elif zone.get('polygon'):
            try:
                polygon = json.loads(zone['polygon'])
                if point_in_polygon(lat, lng, polygon):
                    alerts.append(create_zone_alert(zone))
            except (json.JSONDecodeError, TypeError):
                continue

    return alerts


def create_state_border_alert(new_state: str) -> Dict:
    """
    Create an alert for when the user crosses into a new state.
    Traffic laws and penalties may differ between states.
    """
    return {
        'status': 'zone_alert',
        'zone_type': 'state_border',
        'zone_name': f'Entering {new_state}',
        'message': f"You've entered a new state. Traffic laws and penalties may differ.",
        'suggested_query': f"What are the traffic laws in {new_state}?",
        'severity': 'medium',
    }


def create_zone_alert(zone: Dict, distance: float = None) -> Dict:
    """
    Create an alert for a specific zone (accident area, school, etc.).
    
    Args:
        zone: Zone dictionary from database
        distance: Distance to zone center (for point-based zones)
    """
    message = zone.get('message_template', '')

    if distance is not None:
        message = f"{zone.get('name', 'Zone')}: {message}"

    # Add speed limit info if available
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
