"""
Database Module - SQLite operations for DriveLegal backend

PURPOSE:
Provides all database operations for traffic laws, penalties, procedures,
zone data, and chat history. This is the data layer that the AI pipeline
queries to find relevant laws for user questions.

TABLES:
- laws: Traffic law entries (section, description, applicable states)
- penalties: Fine amounts by state and violation type
- procedures: Step-by-step guides (license renewal, fine payment, etc.)
- zones: GPS-based zones (accident areas, school zones, speed changes)
- chat_history: User conversation logs for analytics

DESIGN:
- Uses Python's built-in sqlite3 (no external dependencies)
- Connection-per-query pattern (simple, no connection pooling needed for mobile)
- Row factory set to sqlite3.Row for dictionary-style access
"""

import sqlite3
import json
import os
from typing import List, Dict, Optional
from datetime import datetime

# Database file location within the backend data directory
DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'drivelegal.db')


def get_connection():
    """
    Create a new database connection with Row factory for dict-style access.
    
    Returns:
        sqlite3.Connection: Connection object with row_factory set
    """
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Access columns by name
    return conn


def initialize_database():
    """
    Create all database tables if they don't exist.
    
    This is called on app startup and also by the seed script.
    Uses CREATE TABLE IF NOT EXISTS so it's safe to call multiple times.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Create all tables in a single transaction
    cursor.executescript('''
        -- Traffic laws: the core knowledge base
        CREATE TABLE IF NOT EXISTS laws (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            section TEXT NOT NULL,
            description TEXT NOT NULL,
            states TEXT,  -- JSON array: ["TN", "KN", "AP"]
            violation_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Fine amounts for each violation type and state
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

        -- Step-by-step procedures (license renewal, fine payment, etc.)
        CREATE TABLE IF NOT EXISTS procedures (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            steps TEXT,  -- JSON array of step strings
            documents_required TEXT,  -- JSON array of document names
            estimated_time TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- GPS-based zones for proactive alerts
        CREATE TABLE IF NOT EXISTS zones (
            id TEXT PRIMARY KEY,
            zone_type TEXT NOT NULL,  -- accident_prone, school_zone, state_border, speed_change
            name TEXT NOT NULL,
            state TEXT NOT NULL,
            polygon TEXT,  -- GeoJSON polygon for area zones
            center_lat REAL,  -- Latitude for point-based zones
            center_lng REAL,  -- Longitude for point-based zones
            radius_meters INTEGER,  -- Alert radius for point zones
            speed_limit INTEGER,  -- Speed limit in this zone (if applicable)
            laws_json TEXT,  -- JSON array of applicable law IDs
            message_template TEXT,  -- Alert message shown to user
            severity TEXT DEFAULT 'medium',  -- low, medium, high
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Chat conversation logs for analytics and improvement
        CREATE TABLE IF NOT EXISTS chat_history (
            id TEXT PRIMARY KEY,
            user_query TEXT,
            bot_response TEXT,
            user_state TEXT,
            helpful BOOLEAN,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Indexes for faster lookups
        CREATE INDEX IF NOT EXISTS idx_laws_violation ON laws(violation_type);
        CREATE INDEX IF NOT EXISTS idx_penalties_state ON penalties(state);
        CREATE INDEX IF NOT EXISTS idx_penalties_violation ON penalties(violation_type);
        CREATE INDEX IF NOT EXISTS idx_zones_state ON zones(state);
        CREATE INDEX IF NOT EXISTS idx_zones_type ON zones(zone_type);
    ''')

    conn.commit()
    conn.close()


def get_laws(state: str) -> List[Dict]:
    """
    Get all laws applicable to a given state.
    
    Args:
        state: State code (e.g., "TN", "KN")
    
    Returns:
        List of law dictionaries
    """
    conn = get_connection()
    cursor = conn.cursor()
    # Match laws that either list this state or apply to all states (empty array)
    cursor.execute(
        "SELECT * FROM laws WHERE states LIKE ? OR states LIKE '[]'",
        [f'%"{state}"%']
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_laws_by_type(violation_type: str, state: str) -> List[Dict]:
    """
    Get laws for a specific violation type in a state.
    
    Args:
        violation_type: Type of violation (e.g., "speeding", "no_helmet")
        state: State code
    
    Returns:
        List of matching law dictionaries
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM laws WHERE violation_type = ? AND (states LIKE ? OR states LIKE '[]')",
        [violation_type, f'%"{state}"%']
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_penalties(violation_type: str, state: str, city: str = None, district: str = None) -> List[Dict]:
    """
    Get penalty amounts for a violation type in a specific state,
    with hierarchical fallback for district and city (taluk) level details.
    
    Order of preference:
    1. City (taluk) level rule in the district
    2. District level rule
    3. State level rule
    4. National rule ('ALL')
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Try matching specific city/taluk and district first
    if city and district:
        cursor.execute(
            """SELECT * FROM penalties 
               WHERE violation_type = ? 
                 AND state = ? 
                 AND additional_details LIKE ? 
                 AND additional_details LIKE ?""",
            [violation_type, state, f'%"district": "{district}"%', f'%"city_or_zone": "{city}"%']
        )
        rows = cursor.fetchall()
        if rows:
            conn.close()
            return [dict(row) for row in rows]
            
    # 2. Try matching district level rule
    if district:
        cursor.execute(
            """SELECT * FROM penalties 
               WHERE violation_type = ? 
                 AND state = ? 
                 AND additional_details LIKE ?""",
            [violation_type, state, f'%"district": "{district}"%']
        )
        rows = cursor.fetchall()
        if rows:
            conn.close()
            return [dict(row) for row in rows]

    # 3. Fall back to state or national rules
    cursor.execute(
        "SELECT * FROM penalties WHERE violation_type = ? AND (state = ? OR state = 'ALL')",
        [violation_type, state]
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_all_penalties_by_state(state: str) -> List[Dict]:
    """
    Get all penalty rules applicable to a specific state (including state = 'ALL').
    
    Args:
        state: State code (e.g., "TN", "KN")
        
    Returns:
        List of penalty dictionaries
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM penalties WHERE state = ? OR state = 'ALL'",
        [state]
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_localized_penalties(state: str, city: str = None, district: str = None) -> List[Dict]:
    """
    Get exactly one penalty record per unique violation type,
    using the hierarchical fallback matching the user's precise location.
    
    Args:
        state: State code (e.g. "TN")
        city: Geocoded city or taluk name (e.g. "Anaimalai")
        district: Geocoded district name (e.g. "Coimbatore")
        
    Returns:
        List of localized penalty dictionaries
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get all unique violation types for this state
    cursor.execute(
        "SELECT DISTINCT violation_type FROM penalties WHERE state = ? OR state = 'ALL'",
        [state]
    )
    violation_types = [r[0] for r in cursor.fetchall() if r[0]]
    conn.close()
    
    localized_list = []
    for v_type in violation_types:
        rules = get_penalties(v_type, state, city, district)
        if rules:
            localized_list.append(rules[0])
            
    return localized_list


def get_procedures(procedure_type: str = None) -> List[Dict]:
    """
    Get procedure guides (license renewal, fine payment, etc.).
    
    Args:
        procedure_type: Optional filter by procedure title
    
    Returns:
        List of procedure dictionaries with steps and required documents
    """
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
    """
    Get all zone definitions for a given state.
    
    NOTE: This returns ALL zones for the state. The actual filtering
    by proximity (distance check, point-in-polygon) is done in zones.py.
    
    Args:
        lat: Current latitude (not used here, passed for consistency)
        lng: Current longitude (not used here, passed for consistency)
        state: State code
    
    Returns:
        List of zone dictionaries
    """
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
    """
    Save a chat interaction for analytics.
    
    This data can be used later to improve the system by analyzing
    which queries get good responses and which need better data.
    
    Args:
        query: User's question
        response: Bot's answer
        state: User's state at time of query
        helpful: Whether user marked the response as helpful (optional)
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chat_history (id, user_query, bot_response, user_state, helpful) VALUES (?, ?, ?, ?, ?)",
        [str(datetime.now().timestamp()), query, response, state, helpful]
    )
    conn.commit()
    conn.close()


def get_user_preferences() -> Dict:
    """Get default user preferences (placeholder - actual prefs stored in RN AsyncStorage)."""
    return {
        'state': 'TN',
        'language': 'en',
        'dark_mode': False,
        'notifications_enabled': True,
    }


def save_user_preferences(prefs: Dict):
    """Save user preferences (placeholder - actual prefs stored in RN AsyncStorage)."""
    pass
