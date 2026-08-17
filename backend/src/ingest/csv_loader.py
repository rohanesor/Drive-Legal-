"""
csv_loader.py — Unified CSV → SQLite bulk importer for Vazhi road safety data.

Reads populated CSV templates and inserts records into the drivelegal.db
database tables (penalties, zones) with deduplication and coordinate validation.

Usage:
    python -m ingest.csv_loader          # loads all CSVs
    python -m ingest.csv_loader --fines  # loads only RTO fines
    python -m ingest.csv_loader --spots  # loads only black spots
    python -m ingest.csv_loader --roads  # loads only road conditions
"""

import csv
import os
import sys
import sqlite3
from pathlib import Path

# --- Constants ---------------------------------------------------------------

INGEST_DIR = Path(__file__).parent
DB_PATH = INGEST_DIR.parent / "data" / "drivelegal.db"

# India bounding box for coordinate validation
INDIA_LAT_MIN, INDIA_LAT_MAX = 6.0, 37.0
INDIA_LNG_MIN, INDIA_LNG_MAX = 68.0, 97.5

# --- Validators --------------------------------------------------------------

def _valid_coord(lat: float, lng: float) -> bool:
    """Check that coordinates fall within India's bounding box."""
    return (INDIA_LAT_MIN <= lat <= INDIA_LAT_MAX and
            INDIA_LNG_MIN <= lng <= INDIA_LNG_MAX)


def _safe_float(val: str, default: float = 0.0) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _safe_int(val: str, default: int = 0) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


# --- Loaders -----------------------------------------------------------------

def load_rto_fines(conn: sqlite3.Connection) -> int:
    """
    Load rto_fines_india.csv → penalties table.
    
    CSV columns: State,Offence,Section_MVAct,First_Offence_Fine_INR,
                 Subsequent_Offence_Fine_INR,Effective_Date,Source_Notification,Notes
    
    Maps to: penalties(id, violation_type, section, state, first_offense,
             second_offense, additional_details, created_at)
    """
    csv_path = INGEST_DIR / "rto_fines_india.csv"
    if not csv_path.exists():
        print(f"[SKIP] {csv_path} not found")
        return 0

    cursor = conn.cursor()
    inserted = 0
    skipped = 0

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = row.get("State", "").strip()
            offence = row.get("Offence", "").strip()
            section = row.get("Section_MVAct", "").strip()
            first_fine = row.get("First_Offence_Fine_INR", "").strip()
            second_fine = row.get("Subsequent_Offence_Fine_INR", "").strip()
            source = row.get("Source_Notification", "").strip()
            notes = row.get("Notes", "").strip()

            if not state or not offence:
                skipped += 1
                continue

            # Derive violation_type from offence text
            violation_map = {
                "no helmet": "no_helmet",
                "no seatbelt": "no_seatbelt",
                "speeding": "speeding",
                "drunk driving": "drunk_driving",
                "red light": "red_light",
                "mobile phone": "mobile_phone",
                "without license": "no_license",
                "no insurance": "no_insurance",
                "dangerous driving": "dangerous_driving",
                "overloading": "overloading",
                "no registration": "no_registration",
                "underage": "underage_driving",
            }
            violation_type = "other"
            for key, vtype in violation_map.items():
                if key in offence.lower():
                    violation_type = vtype
                    break

            record_id = f"csv_{state.lower()}_{violation_type}"
            additional = f"Source: {source}. {notes}".strip()

            cursor.execute(
                """INSERT OR REPLACE INTO penalties
                   (id, violation_type, section, state, first_offense,
                    second_offense, additional_details)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (record_id, violation_type, section, state,
                 first_fine, second_fine, additional),
            )
            inserted += 1

    conn.commit()
    print(f"[FINES] Inserted {inserted} penalty records, skipped {skipped}")
    return inserted


def load_black_spots(conn: sqlite3.Connection) -> int:
    """
    Load black_spots_india.csv + black_spots_template_other_states.csv → zones table.
    
    Each black spot becomes a zone with type='accident_blackspot', 500m radius.
    Deduplicates by MoRTH_UID.
    """
    csv_files = [
        INGEST_DIR / "black_spots_india.csv",
        INGEST_DIR / "black_spots_template_other_states.csv",
    ]

    cursor = conn.cursor()
    inserted = 0
    skipped = 0
    seen_uids = set()

    for csv_path in csv_files:
        if not csv_path.exists():
            print(f"[SKIP] {csv_path} not found")
            continue

        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                uid = row.get("MoRTH_UID", "").strip()
                if not uid or uid in seen_uids:
                    skipped += 1
                    continue
                seen_uids.add(uid)

                lat = _safe_float(row.get("Latitude", ""))
                lng = _safe_float(row.get("Longitude", ""))
                if not _valid_coord(lat, lng):
                    print(f"  [WARN] Invalid coords for {uid}: ({lat}, {lng})")
                    skipped += 1
                    continue

                name = row.get("Location_Stretch_Name", uid)
                state = row.get("State", "").strip()
                # Map full state names to codes
                state_map = {
                    "Tamil Nadu": "TN", "Karnataka": "KA",
                    "Maharashtra": "MH", "Andhra Pradesh": "AP",
                    "Kerala": "KL", "Delhi": "DL", "Rajasthan": "RJ",
                    "Uttar Pradesh": "UP", "Gujarat": "GJ",
                    "Telangana": "TS", "Punjab": "PB",
                }
                state_code = state_map.get(state, state[:2].upper() if len(state) >= 2 else state)

                district = row.get("District", "").strip()
                road = row.get("Road_Number", "").strip()
                total_fatalities = _safe_int(row.get("Total_Fatalities_2016_2019", "0"))
                source = row.get("Source", "MoRTH")

                # Severity based on fatality count
                if total_fatalities >= 15:
                    severity = "high"
                elif total_fatalities >= 8:
                    severity = "medium"
                else:
                    severity = "low"

                message_template = (
                    f"⚠️ Accident black spot ahead: {name} ({district}, {road}). "
                    f"{total_fatalities} fatalities recorded (2016-2019). "
                    f"Reduce speed and exercise extreme caution."
                )

                record_id = f"bs_{uid.replace('(', '').replace(')', '').replace('-', '_').lower()}"

                cursor.execute(
                    """INSERT OR REPLACE INTO zones
                       (id, zone_type, name, state, center_lat, center_lng,
                        radius_meters, speed_limit, severity, message_template)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (record_id, "accident_blackspot", name, state_code,
                     lat, lng, 500, 40, severity, message_template),
                )
                inserted += 1

    conn.commit()
    print(f"[BLACK SPOTS] Inserted {inserted} zone records, skipped {skipped}")
    return inserted


def load_road_conditions(conn: sqlite3.Connection) -> int:
    """
    Load road_conditions_india.csv → zones table.
    
    Each road asset (speed breaker, curve, toll, etc.) becomes a zone
    with type matching the Asset_Type and appropriate radius.
    """
    csv_path = INGEST_DIR / "road_conditions_india.csv"
    if not csv_path.exists():
        print(f"[SKIP] {csv_path} not found")
        return 0

    # Radius by asset type
    radius_map = {
        "speed_breaker": 200,
        "sharp_curve": 300,
        "toll_booth": 400,
        "construction_zone": 500,
        "speed_camera": 300,
        "narrow_bridge": 250,
        "ghat_section": 1000,
        "railway_crossing": 300,
    }

    # Warning templates by asset type
    template_map = {
        "speed_breaker": "⚠️ Speed breaker ahead on {road}. Reduce speed to {limit} km/h.",
        "sharp_curve": "⚠️ Sharp curve ahead on {road}. Reduce speed to {limit} km/h.",
        "toll_booth": "🛣️ Toll plaza ahead on {road}. Prepare to slow down.",
        "construction_zone": "🚧 Construction zone ahead on {road}. Speed limit {limit} km/h.",
        "speed_camera": "📸 Speed camera zone on {road}. Speed limit {limit} km/h.",
        "narrow_bridge": "⚠️ Narrow bridge ahead on {road}. Proceed with caution.",
        "ghat_section": "⛰️ Ghat road section on {road}. Speed limit {limit} km/h. Use low gear.",
        "railway_crossing": "🚂 Railway crossing ahead on {road}. Stop and check.",
    }

    cursor = conn.cursor()
    inserted = 0
    skipped = 0

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            asset_id = row.get("Asset_ID", "").strip()
            if not asset_id:
                skipped += 1
                continue

            lat = _safe_float(row.get("Latitude", ""))
            lng = _safe_float(row.get("Longitude", ""))
            if not _valid_coord(lat, lng):
                print(f"  [WARN] Invalid coords for {asset_id}: ({lat}, {lng})")
                skipped += 1
                continue

            asset_type = row.get("Asset_Type", "").strip()
            speed_limit = _safe_int(row.get("Speed_Limit_kmph", "50"))
            state = row.get("State", "").strip()
            road = row.get("Road_Name", "").strip()
            source = row.get("Source", "").strip()
            notes = row.get("Notes", "").strip()

            radius = radius_map.get(asset_type, 300)
            template = template_map.get(asset_type, "⚠️ Road hazard ahead. Exercise caution.")
            message = template.format(road=road, limit=speed_limit)

            # Severity mapping
            severity_map = {
                "speed_breaker": "low",
                "sharp_curve": "medium",
                "toll_booth": "low",
                "construction_zone": "medium",
                "speed_camera": "low",
                "narrow_bridge": "medium",
                "ghat_section": "high",
                "railway_crossing": "high",
            }
            severity = severity_map.get(asset_type, "low")

            record_id = f"rc_{asset_id.replace('-', '_').lower()}"

            cursor.execute(
                """INSERT OR REPLACE INTO zones
                   (id, zone_type, name, state, center_lat, center_lng,
                    radius_meters, speed_limit, severity, message_template)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (record_id, asset_type, f"{asset_type.replace('_', ' ').title()} - {road}",
                 state, lat, lng, radius, speed_limit, severity, message),
            )
            inserted += 1

    conn.commit()
    print(f"[ROAD CONDITIONS] Inserted {inserted} zone records, skipped {skipped}")
    return inserted


# --- Main --------------------------------------------------------------------

def main():
    """Run all CSV loaders or specific ones based on CLI flags."""
    if not DB_PATH.exists():
        print(f"[ERROR] Database not found at {DB_PATH}")
        print("        Run seed.py first to create the database.")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    total = 0

    args = set(sys.argv[1:])
    run_all = not args or "--all" in args

    try:
        if run_all or "--fines" in args:
            total += load_rto_fines(conn)

        if run_all or "--spots" in args:
            total += load_black_spots(conn)

        if run_all or "--roads" in args:
            total += load_road_conditions(conn)

        print(f"\n{'='*60}")
        print(f"  CSV LOADER COMPLETE — {total} total records imported")
        print(f"{'='*60}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
