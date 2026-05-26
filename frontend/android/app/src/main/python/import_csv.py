"""
Import CSV datasets into the DriveLegal SQLite database.

Reads:
  1. DriveLegal_Laws_Database.csv  — 64 MV Act laws with penalties
  2. TamilNadu_Traffic_Fines_Dataset (1).csv — District/zone-level fine data

Writes:
  - laws table: law definitions from laws CSV
  - penalties table: fine amounts from both CSVs
"""

import csv
import json
import os
import re
import sqlite3

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
DB_PATH = os.path.join(DATA_DIR, 'drivelegal.db')
LAWS_CSV = os.path.join(DATA_DIR, 'DriveLegal_Laws_Database.csv')
FINES_CSV = os.path.join(DATA_DIR, 'TamilNadu_Traffic_Fines_Dataset (1).csv')

STATE_MAP = {
    'tamil nadu': 'TN',
    'andhra pradesh': 'AP',
    'karnataka': 'KN',
    'kerala': 'KL',
    'maharashtra': 'MH',
    'delhi': 'DL',
    'gujarat': 'GJ',
    'rajasthan': 'RJ',
    'uttar pradesh': 'UP',
    'west bengal': 'WB',
    'telangana': 'TS',
    'bihar': 'BR',
    'haryana': 'HR',
    'punjab': 'PB',
    'odisha': 'OR',
    'madhya pradesh': 'MP',
}


def state_code(raw: str) -> str:
    raw = raw.strip().lower().split('/')[0].strip()
    return STATE_MAP.get(raw, 'TN')


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r'[^\w\s]', '', s)
    s = re.sub(r'\s+', '_', s)
    return s


def parse_fine(val: str) -> str:
    val = val.strip().replace(',', '')
    try:
        return f'\u20b9{int(float(val)):,}'
    except (ValueError, TypeError):
        return val


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def import_laws():
    """Import DriveLegal_Laws_Database.csv → laws table."""
    conn = get_conn()
    cur = conn.cursor()
    count = 0

    with open(LAWS_CSV, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            law_id = f'csv_{row["law_id"]}'
            section = f'Motor Vehicles Act 1988, Section {row["mv_act_section"]}'
            states_json = json.dumps([state_code(row['state'])])

            cur.execute(
                """INSERT OR REPLACE INTO laws
                   (id, title, section, description, states, violation_type)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    law_id,
                    row['section_full_title'],
                    section,
                    row['description'],
                    states_json,
                    slugify(row['category']),
                ),
            )
            count += 1

    conn.commit()
    conn.close()
    print(f'  Imported {count} laws')


def import_laws_penalties():
    """Import fine info from laws CSV → penalties table."""
    conn = get_conn()
    cur = conn.cursor()
    count = 0

    with open(LAWS_CSV, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pen_id = f'csv_pen_{row["law_id"]}'
            law_id = f'csv_{row["law_id"]}'
            st = state_code(row['state'])
            first = parse_fine(row['fine_min_inr'])
            second = parse_fine(row['fine_max_inr'])
            notes = row['notes'].strip() if row['notes'] else ''

            cur.execute(
                """INSERT OR REPLACE INTO penalties
                   (id, violation_type, section, state, first_offense, second_offense, additional_details)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    pen_id,
                    slugify(row['category']),
                    law_id,
                    st,
                    first,
                    second,
                    notes,
                ),
            )
            count += 1

    conn.commit()
    conn.close()
    print(f'  Imported {count} law penalties')


def import_fines():
    """Import TamilNadu_Traffic_Fines_Dataset → penalties table."""
    conn = get_conn()
    cur = conn.cursor()
    count = 0

    with open(FINES_CSV, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pen_id = f'csv_fine_{row["district"]}_{slugify(row["offence"])}_{row["city_or_zone"]}'
            st = state_code(row['state'])
            offence = row['offence']

            fine = row['fine_amount'].strip() if row['fine_amount'] else \
                   row['fine_range_min'].strip() if row['fine_range_min'] else ''
            fine_max = row['fine_range_max'].strip() if row['fine_range_max'] else ''

            first = parse_fine(fine)
            second = parse_fine(fine_max) if fine_max and fine_max != fine else ''

            details = json.dumps({
                'district': row['district'],
                'city_or_zone': row['city_or_zone'],
                'vehicle_type': row['vehicle_type'],
                'enforcement_type': row['enforcement_type'],
            })

            cur.execute(
                """INSERT OR REPLACE INTO penalties
                   (id, violation_type, section, state, first_offense, second_offense, additional_details)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    pen_id,
                    slugify(offence),
                    f'MV Act {row["mv_act_section"]}',
                    st,
                    first,
                    second,
                    details,
                ),
            )
            count += 1

    conn.commit()
    conn.close()
    print(f'  Imported {count} fine penalties')


if __name__ == '__main__':
    print('Importing laws...')
    import_laws()
    print('Importing law penalties...')
    import_laws_penalties()
    print('Importing district-level fines...')
    import_fines()
    print('Done!')

    conn = get_conn()
    cur = conn.cursor()
    for tbl in ('laws', 'penalties'):
        cur.execute(f'SELECT COUNT(*) FROM [{tbl}]')
        print(f'  {tbl}: {cur.fetchone()[0]} total rows')
    conn.close()
