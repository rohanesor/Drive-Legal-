"""
isochrone_service.py — openrouteservice Reachability & EV Isochrone Engine.

Calculates reachable driving polygons (isochrones) for Vazhi based on vehicle
type, remaining driving time, or EV battery State of Charge (SOC%).

Features:
- openrouteservice Isochrone API client
- Local geometric polygon radius fallback
"""

import math
import requests
from typing import List, Dict, Any, Optional

ORS_ISOCHRONE_URL = "http://localhost:8080/ors/v2/isochrones/driving-car"


class IsochroneService:
    @staticmethod
    def calculate_isochrone(
        lat: float,
        lng: float,
        range_minutes: int = 30,
        soc_percentage: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Calculate reachability polygon from (lat, lng).
        If soc_percentage is provided for EV, scales range_minutes proportionally.
        """
        if soc_percentage is not None:
            # Scale range based on SOC (100% SOC = 180 mins max highway driving)
            range_minutes = max(5, int((soc_percentage / 100.0) * 180))

        range_seconds = range_minutes * 60
        payload = {
            "locations": [[lng, lat]],
            "range": [range_seconds],
            "range_type": "time"
        }

        try:
            resp = requests.post(ORS_ISOCHRONE_URL, json=payload, timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                features = data.get("features", [])
                if features:
                    poly_coords = features[0]["geometry"]["coordinates"][0]
                    return {
                        "status": "success",
                        "source": "openrouteservice_isochrone",
                        "range_minutes": range_minutes,
                        "soc_percentage": soc_percentage,
                        "polygon_coords": [{"lat": c[1], "lng": c[0]} for c in poly_coords]
                    }
        except Exception:
            pass

        # Fallback: Local Geometric Radius Polygon
        return IsochroneService._local_isochrone_polygon(lat, lng, range_minutes, soc_percentage)

    @staticmethod
    def _local_isochrone_polygon(
        lat: float,
        lng: float,
        range_minutes: int,
        soc_percentage: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generate a 16-point geometric polygon approximating driving reachability."""
        avg_speed_kmh = 45.0
        radius_km = (avg_speed_kmh * (range_minutes / 60.0)) * 0.75  # 0.75 factor for road winding

        polygon = []
        points_count = 16
        for i in range(points_count):
            angle = (2.0 * math.pi / points_count) * i
            d_lat = (radius_km / 111.0) * math.cos(angle)
            d_lng = (radius_km / (111.0 * math.cos(math.radians(lat)))) * math.sin(angle)
            polygon.append({
                "lat": round(lat + d_lat, 5),
                "lng": round(lng + d_lng, 5)
            })

        return {
            "status": "success",
            "source": "local_isochrone_fallback",
            "range_minutes": range_minutes,
            "soc_percentage": soc_percentage,
            "polygon_coords": polygon
        }


isochrone_service = IsochroneService()
