import sqlite3
import json
import os
from typing import List, Dict, Optional
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'drivelegal.db')


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS laws (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            section TEXT NOT NULL,
            description TEXT NOT NULL,
            states TEXT,
            violation_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS penalties (
            id TEXT PRIMARY KEY,
            violation_type TEXT NOT NULL,
            section TEXT NOT NULL,
            state TEXT NOT NULL,
            first_offense TEXT,
            second_offense TEXT,
            additional_details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS procedures (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            steps TEXT,
            documents_required TEXT,
            estimated_time TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS zones (
            id TEXT PRIMARY KEY,
            zone_type TEXT NOT NULL,
            name TEXT NOT NULL,
            state TEXT NOT NULL,
            polygon TEXT,
            center_lat REAL,
            center_lng REAL,
            radius_meters INTEGER,
            speed_limit INTEGER,
            laws_json TEXT,
            message_template TEXT,
            severity TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_history (
            id TEXT PRIMARY KEY,
            user_query TEXT,
            bot_response TEXT,
            user_state TEXT,
            helpful BOOLEAN,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS traffic_incidents (
            id TEXT PRIMARY KEY,
            location_id TEXT,
            incident_type TEXT,
            severity TEXT,
            latitude REAL,
            longitude REAL,
            description TEXT,
            description_ml TEXT,
            timestamp DATETIME,
            source TEXT,
            ttl_minutes INTEGER,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS road_conditions (
            id TEXT PRIMARY KEY,
            location_id TEXT,
            condition_type TEXT,
            severity TEXT,
            latitude REAL,
            longitude REAL,
            description TEXT,
            description_ml TEXT,
            estimated_duration TEXT,
            timestamp DATETIME,
            source TEXT,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS location_laws (
            id TEXT PRIMARY KEY,
            state TEXT,
            city TEXT,
            law_id TEXT,
            amendment TEXT,
            amendment_ml TEXT,
            effective_date DATE,
            source TEXT,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sync_metadata (
            id TEXT PRIMARY KEY,
            last_sync DATETIME,
            status TEXT,
            error_message TEXT,
            api_source TEXT,
            record_count INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_laws_violation ON laws(violation_type);
        CREATE INDEX IF NOT EXISTS idx_penalties_state ON penalties(state);
        CREATE INDEX IF NOT EXISTS idx_penalties_violation ON penalties(violation_type);
        CREATE INDEX IF NOT EXISTS idx_zones_state ON zones(state);
        CREATE INDEX IF NOT EXISTS idx_zones_type ON zones(zone_type);
        CREATE INDEX IF NOT EXISTS idx_incidents_location ON traffic_incidents(location_id);
        CREATE INDEX IF NOT EXISTS idx_incidents_severity ON traffic_incidents(severity);
        CREATE INDEX IF NOT EXISTS idx_conditions_location ON road_conditions(location_id);
        CREATE INDEX IF NOT EXISTS idx_laws_state ON location_laws(state);
    ''')

    conn.commit()
    conn.close()


def get_laws(state: str) -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM laws WHERE states LIKE ? OR states LIKE '[]'",
        [f'%"{state}"%']
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_laws_by_type(violation_type: str, state: str) -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM laws WHERE violation_type = ? AND (states LIKE ? OR states LIKE '[]')",
        [violation_type, f'%"{state}"%']
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_penalties(violation_type: str, state: str) -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM penalties WHERE violation_type = ? AND (state = ? OR state = 'ALL')",
        [violation_type, state]
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_procedures(procedure_type: str = None) -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    if procedure_type:
        cursor.execute(
            "SELECT * FROM procedures WHERE title LIKE ?",
            [f'%{procedure_type}%']
        )
    else:
        cursor.execute("SELECT * FROM procedures")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_zones(lat: float, lng: float, state: str) -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM zones WHERE state = ?",
        [state]
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def save_chat_history(query: str, response: str, state: str, helpful: bool = None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chat_history (id, user_query, bot_response, user_state, helpful) VALUES (?, ?, ?, ?, ?)",
        [str(datetime.now().timestamp()), query, response, state, helpful]
    )
    conn.commit()
    conn.close()


def get_user_preferences() -> Dict:
    return {
        'state': 'TN',
        'language': 'en',
        'dark_mode': False,
        'notifications_enabled': True,
    }


def save_user_preferences(prefs: Dict):
    pass


# ===== Real-time Data Functions =====

def get_traffic_incidents(state: str, limit: int = 50) -> List[Dict]:
    """Get recent traffic incidents for a state."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM traffic_incidents WHERE location_id = ? ORDER BY timestamp DESC LIMIT ?",
        [state, limit]
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def insert_traffic_incidents(incidents: List[Dict]) -> int:
    """Insert traffic incidents, returns count inserted."""
    conn = get_connection()
    cursor = conn.cursor()
    count = 0
    for incident in incidents:
        try:
            cursor.execute(
                """INSERT OR REPLACE INTO traffic_incidents 
                (id, location_id, incident_type, severity, latitude, longitude, description, description_ml, timestamp, source, ttl_minutes, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                [
                    incident.get('id'),
                    incident.get('location_id'),
                    incident.get('incident_type'),
                    incident.get('severity'),
                    incident.get('latitude'),
                    incident.get('longitude'),
                    incident.get('description'),
                    json.dumps(incident.get('description_ml', {})),
                    incident.get('timestamp'),
                    incident.get('source'),
                    incident.get('ttl_minutes', 120)
                ]
            )
            count += 1
        except Exception as e:
            print(f"Error inserting incident {incident.get('id')}: {e}")
    conn.commit()
    conn.close()
    return count


def get_road_conditions(state: str, limit: int = 50) -> List[Dict]:
    """Get recent road conditions for a state."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM road_conditions WHERE location_id = ? ORDER BY timestamp DESC LIMIT ?",
        [state, limit]
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def insert_road_conditions(conditions: List[Dict]) -> int:
    """Insert road conditions, returns count inserted."""
    conn = get_connection()
    cursor = conn.cursor()
    count = 0
    for condition in conditions:
        try:
            cursor.execute(
                """INSERT OR REPLACE INTO road_conditions 
                (id, location_id, condition_type, severity, latitude, longitude, description, description_ml, estimated_duration, timestamp, source, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                [
                    condition.get('id'),
                    condition.get('location_id'),
                    condition.get('condition_type'),
                    condition.get('severity'),
                    condition.get('latitude'),
                    condition.get('longitude'),
                    condition.get('description'),
                    json.dumps(condition.get('description_ml', {})),
                    condition.get('estimated_duration'),
                    condition.get('timestamp'),
                    condition.get('source')
                ]
            )
            count += 1
        except Exception as e:
            print(f"Error inserting condition {condition.get('id')}: {e}")
    conn.commit()
    conn.close()
    return count


def get_location_laws(state: str, city: str = None) -> List[Dict]:
    """Get location-specific law amendments."""
    conn = get_connection()
    cursor = conn.cursor()
    if city:
        cursor.execute(
            "SELECT * FROM location_laws WHERE state = ? AND city = ? ORDER BY effective_date DESC",
            [state, city]
        )
    else:
        cursor.execute(
            "SELECT * FROM location_laws WHERE state = ? ORDER BY effective_date DESC",
            [state]
        )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def insert_location_laws(laws: List[Dict]) -> int:
    """Insert location-specific laws, returns count inserted."""
    conn = get_connection()
    cursor = conn.cursor()
    count = 0
    for law in laws:
        try:
            cursor.execute(
                """INSERT OR REPLACE INTO location_laws 
                (id, state, city, law_id, amendment, amendment_ml, effective_date, source, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                [
                    law.get('id'),
                    law.get('state'),
                    law.get('city'),
                    law.get('law_id'),
                    law.get('amendment'),
                    json.dumps(law.get('amendment_ml', {})),
                    law.get('effective_date'),
                    law.get('source')
                ]
            )
            count += 1
        except Exception as e:
            print(f"Error inserting law {law.get('id')}: {e}")
    conn.commit()
    conn.close()
    return count


def get_sync_metadata(source: str) -> Optional[Dict]:
    """Get last sync metadata for a source."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sync_metadata WHERE id = ?", [source])
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_sync_metadata(source: str, status: str, record_count: int = 0, error_msg: str = None):
    """Update sync metadata."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT OR REPLACE INTO sync_metadata 
        (id, last_sync, status, error_message, api_source, record_count, updated_at)
        VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
        [source, status, error_msg, source, record_count]
    )
    conn.commit()
    conn.close()
