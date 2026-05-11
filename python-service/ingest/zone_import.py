"""
Zone import script.
Converts GeoJSON zone data to SQLite zones table entries.

Note: This is a stub. Use the zone data already in seed.py.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import get_connection

def import_zones_from_geojson(geojson_path):
    """Import zones from a GeoJSON file."""
    with open(geojson_path, 'r') as f:
        geojson = json.load(f)

    conn = get_connection()
    cursor = conn.cursor()

    for feature in geojson.get('features', []):
        props = feature.get('properties', {})
        geom = feature.get('geometry', {})

        zone_type = props.get('zone_type', 'custom')
        name = props.get('name', 'Unknown Zone')
        state = props.get('state', 'TN')
        severity = props.get('severity', 'medium')
        speed_limit = props.get('speed_limit', None)
        message_template = props.get('message_template', '')

        if geom.get('type') == 'Point':
            lng, lat = geom['coordinates']
            cursor.execute(
                "INSERT OR REPLACE INTO zones (id, zone_type, name, state, center_lat, center_lng, radius_meters, speed_limit, message_template, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [name.lower().replace(' ', '_'), zone_type, name, state, lat, lng, 500, speed_limit, message_template, severity]
            )
        elif geom.get('type') == 'Polygon':
            polygon = json.dumps(geom['coordinates'][0])
            cursor.execute(
                "INSERT OR REPLACE INTO zones (id, zone_type, name, state, polygon, speed_limit, message_template, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [name.lower().replace(' ', '_'), zone_type, name, state, polygon, speed_limit, message_template, severity]
            )

    conn.commit()
    conn.close()
    print(f"Zones imported from {geojson_path}")


def main():
    print("Zone import stub.")
    print("Use seed.py for initial zone data. Replace with actual GeoJSON import.")
    print("Example: python ingest/zone_import.py zones.geojson")


if __name__ == '__main__':
    main()
