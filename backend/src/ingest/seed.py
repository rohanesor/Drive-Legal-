"""
Database Seeder - Populates the SQLite database with traffic law data

PURPOSE:
Loads all traffic laws, penalties, procedures, and zone data
into the SQLite database. This is the knowledge base that the
chatbot uses to answer user questions.

DATA SOURCES:
- Motor Vehicles Act 1988 (national laws)
- Tamil Nadu state amendments
- Karnataka state amendments
- Penalty tables for each state
- Accident-prone zones, school zones, speed change zones

NOTE: This file contains seed data directly. For production,
replace with data scraped from official sources (see scrape.py).
"""

import json
import os
import sqlite3
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'drivelegal.db')


# ============================================================
# LAWS DATA
# ============================================================
# Each law entry represents a traffic violation or rule.
# Fields:
#   id: Unique identifier
#   title: Short name
#   section: Official legal section reference
#   description: Plain language explanation
#   states: List of state codes where this law applies
#   violation_type: Category for linking to penalties

LAWS_DATA = [
    {
        "id": "mv_act_188",
        "title": "Speed Limit Violation",
        "section": "Motor Vehicles Act, Section 188",
        "description": "Driving a motor vehicle at a speed exceeding the prescribed speed limit is an offense. Speed limits vary by road type and state.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "speeding"
    },
    {
        "id": "mv_act_177",
        "title": "General Traffic Violation",
        "section": "Motor Vehicles Act, Section 177",
        "description": "Disobeying traffic signs, signals, or markings by the driver of a motor vehicle.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "traffic_signal"
    },
    {
        "id": "mv_act_194b",
        "title": "Driving Without Helmet",
        "section": "Motor Vehicles Act, Section 194B",
        "description": "Driving a two-wheeler without wearing a protective helmet. Applies to both rider and pillion rider.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "no_helmet"
    },
    {
        "id": "mv_act_194a",
        "title": "Driving Without Seatbelt",
        "section": "Motor Vehicles Act, Section 194A",
        "description": "Driving a motor vehicle without wearing a seatbelt. Applies to driver and front-seat passengers.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "no_seatbelt"
    },
    {
        "id": "mv_act_181",
        "title": "Driving Without License",
        "section": "Motor Vehicles Act, Section 181",
        "description": "Driving a motor vehicle without a valid driving license. This is a serious offense.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "no_license"
    },
    {
        "id": "mv_act_196",
        "title": "Driving Without Insurance",
        "section": "Motor Vehicles Act, Section 196",
        "description": "Driving a motor vehicle without valid third-party insurance coverage.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "no_insurance"
    },
    {
        "id": "mv_act_190",
        "title": "Dangerous Driving",
        "section": "Motor Vehicles Act, Section 190",
        "description": "Driving a motor vehicle in a manner that is dangerous to the public or endangers human life.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "dangerous_driving"
    },
    {
        "id": "mv_act_183",
        "title": "Overloading Vehicle",
        "section": "Motor Vehicles Act, Section 183",
        "description": "Loading a motor vehicle beyond its permitted capacity, including passengers and goods.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "overloading"
    },
    {
        "id": "mv_act_192",
        "title": "Driving Without Registration",
        "section": "Motor Vehicles Act, Section 192",
        "description": "Using a motor vehicle without proper registration certificate (RC).",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "no_registration"
    },
    {
        "id": "mv_act_179",
        "title": "Obstruction to Traffic",
        "section": "Motor Vehicles Act, Section 179",
        "description": "Causing obstruction to traffic by parking or stopping a vehicle in prohibited areas.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "parking_violation"
    },
    {
        "id": "tn_speed_limit",
        "title": "Tamil Nadu Speed Limits",
        "section": "Tamil Nadu Motor Vehicles Rules",
        "description": "Speed limits in Tamil Nadu: City roads - 40 km/h, State highways - 70 km/h, National highways - 100 km/h. Two-wheelers: 50 km/h in city limits.",
        "states": ["TN"],
        "violation_type": "speeding"
    },
    {
        "id": "tn_helmet_rule",
        "title": "Tamil Nadu Helmet Rule",
        "section": "Tamil Nadu Motor Vehicles Rules, Rule 45",
        "description": "In Tamil Nadu, both rider and pillion rider must wear ISI-certified helmets. Violation attracts fine under Section 194B.",
        "states": ["TN"],
        "violation_type": "no_helmet"
    },
    {
        "id": "kn_speed_limit",
        "title": "Karnataka Speed Limits",
        "section": "Karnataka Motor Vehicles Rules",
        "description": "Speed limits in Karnataka: City roads - 40 km/h, State highways - 65 km/h, National highways - 100 km/h. Expressways - 120 km/h.",
        "states": ["KN"],
        "violation_type": "speeding"
    },
    {
        "id": "kn_helmet_rule",
        "title": "Karnataka Helmet Rule",
        "section": "Karnataka Motor Vehicles Rules, Rule 42",
        "description": "In Karnataka, helmets must be ISI certified. Both rider and pillion must wear helmets. Strict enforcement in Bangalore.",
        "states": ["KN"],
        "violation_type": "no_helmet"
    },
    {
        "id": "tn_document_rule",
        "title": "Required Documents in Tamil Nadu",
        "section": "Tamil Nadu Motor Vehicles Rules, Rule 35",
        "description": "Documents required while driving in Tamil Nadu: Driving License, Registration Certificate (RC), Insurance Certificate, PUC Certificate, Permit (for commercial vehicles).",
        "states": ["TN"],
        "violation_type": "no_documents"
    },
    {
        "id": "kn_document_rule",
        "title": "Required Documents in Karnataka",
        "section": "Karnataka Motor Vehicles Rules, Rule 30",
        "description": "Documents required while driving in Karnataka: Driving License, RC, Insurance, PUC, Permit. Digital copies via DigiLocker app are valid.",
        "states": ["KN"],
        "violation_type": "no_documents"
    },
    {
        "id": "mv_act_129",
        "title": "Traffic Signs and Signals",
        "section": "Motor Vehicles Act, Section 129",
        "description": "Drivers must obey all traffic signs, signals, and road markings. Disobedience is punishable under Section 177.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "traffic_signal"
    },
    {
        "id": "mv_act_194d",
        "title": "Driving While Using Mobile Phone",
        "section": "Motor Vehicles Act, Section 194D",
        "description": "Using a mobile phone while driving, including for calls, texting, or navigation without hands-free device.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "mobile_usage"
    },
    {
        "id": "mv_act_200",
        "title": "Drunk Driving",
        "section": "Motor Vehicles Act, Section 200",
        "description": "Driving under the influence of alcohol or drugs. Blood alcohol limit is 30mg per 100ml of blood. Repeat offenders face imprisonment.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "drunk_driving"
    },
    {
        "id": "mv_act_194e",
        "title": "Over-speeding Penalty Enhancement",
        "section": "Motor Vehicles Act, Section 194E",
        "description": "Enhanced penalties for over-speeding detected through automated speed cameras. Fine applies per instance of violation.",
        "states": ["TN", "KN", "AP", "KL", "MH", "DL"],
        "violation_type": "speeding"
    },
]

# ============================================================
# PENALTIES DATA
# ============================================================
# Fine amounts for each violation type in each state.

PENALTIES_DATA = [
    {"id": "pen_speed_tn", "violation_type": "speeding", "section": "mv_act_188", "state": "TN", "first_offense": "₹500", "second_offense": "₹1000", "additional_details": "Additional ₹100 per km/h over limit for speeds exceeding 10 km/h above limit"},
    {"id": "pen_speed_kn", "violation_type": "speeding", "section": "mv_act_188", "state": "KN", "first_offense": "₹400", "second_offense": "₹800", "additional_details": "Speed camera enforcement on major highways"},
    {"id": "pen_helmet_tn", "violation_type": "no_helmet", "section": "mv_act_194b", "state": "TN", "first_offense": "₹500", "second_offense": "₹1000", "additional_details": "Applies to both rider and pillion rider separately"},
    {"id": "pen_helmet_kn", "violation_type": "no_helmet", "section": "mv_act_194b", "state": "KN", "first_offense": "₹500", "second_offense": "₹1500", "additional_details": "Strict enforcement in Bangalore city limits"},
    {"id": "pen_seatbelt_tn", "violation_type": "no_seatbelt", "section": "mv_act_194a", "state": "TN", "first_offense": "₹500", "second_offense": "₹1000", "additional_details": ""},
    {"id": "pen_seatbelt_kn", "violation_type": "no_seatbelt", "section": "mv_act_194a", "state": "KN", "first_offense": "₹500", "second_offense": "₹1000", "additional_details": ""},
    {"id": "pen_license_tn", "violation_type": "no_license", "section": "mv_act_181", "state": "TN", "first_offense": "₹5000", "second_offense": "₹10000", "additional_details": "Vehicle may be impounded"},
    {"id": "pen_license_kn", "violation_type": "no_license", "section": "mv_act_181", "state": "KN", "first_offense": "₹5000", "second_offense": "₹10000", "additional_details": ""},
    {"id": "pen_insurance_tn", "violation_type": "no_insurance", "section": "mv_act_196", "state": "TN", "first_offense": "₹2000", "second_offense": "₹4000", "additional_details": "Vehicle may be impounded"},
    {"id": "pen_insurance_kn", "violation_type": "no_insurance", "section": "mv_act_196", "state": "KN", "first_offense": "₹2000", "second_offense": "₹4000", "additional_details": ""},
    {"id": "pen_mobile_tn", "violation_type": "mobile_usage", "section": "mv_act_194d", "state": "TN", "first_offense": "₹1000", "second_offense": "₹2000", "additional_details": ""},
    {"id": "pen_mobile_kn", "violation_type": "mobile_usage", "section": "mv_act_194d", "state": "KN", "first_offense": "₹1000", "second_offense": "₹2000", "additional_details": ""},
    {"id": "pen_drunk_tn", "violation_type": "drunk_driving", "section": "mv_act_200", "state": "TN", "first_offense": "₹10000 or 6 months imprisonment", "second_offense": "₹15000 or 2 years imprisonment", "additional_details": "License may be suspended"},
    {"id": "pen_drunk_kn", "violation_type": "drunk_driving", "section": "mv_act_200", "state": "KN", "first_offense": "₹10000 or 6 months imprisonment", "second_offense": "₹15000 or 2 years imprisonment", "additional_details": ""},
    {"id": "pen_dangerous_tn", "violation_type": "dangerous_driving", "section": "mv_act_190", "state": "TN", "first_offense": "₹1000", "second_offense": "₹2000", "additional_details": "License may be suspended for 3 months"},
    {"id": "pen_dangerous_kn", "violation_type": "dangerous_driving", "section": "mv_act_190", "state": "KN", "first_offense": "₹1000", "second_offense": "₹2000", "additional_details": ""},
    {"id": "pen_registration_tn", "violation_type": "no_registration", "section": "mv_act_192", "state": "TN", "first_offense": "₹5000", "second_offense": "₹10000", "additional_details": "Vehicle may be impounded"},
    {"id": "pen_registration_kn", "violation_type": "no_registration", "section": "mv_act_192", "state": "KN", "first_offense": "₹5000", "second_offense": "₹10000", "additional_details": ""},
    {"id": "pen_parking_tn", "violation_type": "parking_violation", "section": "mv_act_179", "state": "TN", "first_offense": "₹200", "second_offense": "₹400", "additional_details": "Vehicle may be towed"},
    {"id": "pen_parking_kn", "violation_type": "parking_violation", "section": "mv_act_179", "state": "KN", "first_offense": "₹200", "second_offense": "₹400", "additional_details": ""},
    {"id": "pen_traffic_signal_tn", "violation_type": "traffic_signal", "section": "mv_act_177", "state": "TN", "first_offense": "₹500", "second_offense": "₹1000", "additional_details": ""},
    {"id": "pen_traffic_signal_kn", "violation_type": "traffic_signal", "section": "mv_act_177", "state": "KN", "first_offense": "₹500", "second_offense": "₹1000", "additional_details": ""},
    {"id": "pen_documents_tn", "violation_type": "no_documents", "section": "tn_document_rule", "state": "TN", "first_offense": "₹500 per missing document", "second_offense": "₹1000 per missing document", "additional_details": "Digital copies via DigiLocker are accepted"},
    {"id": "pen_documents_kn", "violation_type": "no_documents", "section": "kn_document_rule", "state": "KN", "first_offense": "₹500 per missing document", "second_offense": "₹1000 per missing document", "additional_details": "DigiLocker copies accepted"},
]

# ============================================================
# PROCEDURES DATA
# ============================================================
# Step-by-step guides for common processes.

PROCEDURES_DATA = [
    {
        "id": "proc_license_renewal",
        "title": "Driving License Renewal",
        "steps": json.dumps([
            "Visit the RTO office or use Parivahan portal online",
            "Fill Form 9 (License Renewal Application)",
            "Submit original driving license",
            "Attach medical certificate (Form 1A) if above 40 years",
            "Pay renewal fee (₹200 for non-transport, ₹500 for transport)",
            "Collect renewed license or receive by post"
        ]),
        "documents_required": json.dumps(["Form 9", "Original DL", "Form 1A (if >40 years)", "Passport photos", "Address proof"]),
        "estimated_time": "7-15 working days"
    },
    {
        "id": "proc_fine_payment",
        "title": "Traffic Fine Payment",
        "steps": json.dumps([
            "Check your challan on Parivahan portal or state traffic police website",
            "Pay online via the portal using credit/debit card, UPI, or net banking",
            "Alternatively, visit the nearest traffic police station or e-Seva center",
            "Collect payment receipt after payment",
            "Verify payment status online after 24 hours"
        ]),
        "documents_required": json.dumps(["Challan number", "Vehicle number", "Payment method"]),
        "estimated_time": "Online: Instant, Offline: Same day"
    },
    {
        "id": "proc_appeal_fine",
        "title": "Appealing a Traffic Fine",
        "steps": json.dumps([
            "File an appeal within 30 days of receiving the challan",
            "Submit written appeal to the Regional Transport Officer or traffic court",
            "Provide evidence (photos, videos, witness statements) supporting your case",
            "Pay a nominal court fee",
            "Attend the hearing on the scheduled date",
            "If appeal is accepted, fine will be waived or reduced"
        ]),
        "documents_required": json.dumps(["Challan copy", "Written appeal", "Evidence", "Identity proof", "Vehicle RC copy"]),
        "estimated_time": "30-90 days"
    },
    {
        "id": "proc_rc_transfer",
        "title": "Vehicle RC Transfer",
        "steps": json.dumps([
            "Both buyer and seller must visit the RTO",
            "Fill Form 29 (Notice of Transfer) and Form 30 (Report of Transfer)",
            "Submit original RC, insurance, and PUC",
            "Pay transfer fee and road tax difference (if applicable)",
            "Submit NOC if transferring to another state",
            "New RC will be issued in buyer's name"
        ]),
        "documents_required": json.dumps(["Form 29", "Form 30", "Original RC", "Insurance", "PUC", "Sale deed", "ID proof"]),
        "estimated_time": "15-30 working days"
    },
    {
        "id": "proc_new_license",
        "title": "New Driving License",
        "steps": json.dumps([
            "Apply for Learner's License online (Parivahan) or at RTO",
            "Pass Learner's License test (written or computer-based)",
            "After 30 days, apply for permanent Driving License",
            "Pass driving test at RTO",
            "Submit required documents and fees",
            "Collect DL or receive by post"
        ]),
        "documents_required": json.dumps(["Form 2", "Age proof", "Address proof", "Passport photos", "Learner's License"]),
        "estimated_time": "30-45 days"
    },
    {
        "id": "proc_vehicle_registration",
        "title": "New Vehicle Registration",
        "steps": json.dumps([
            "Dealer usually handles initial registration",
            "If self-registration: submit Form 20 at RTO",
            "Submit sales invoice, insurance, PUC, and road tax payment",
            "Pay registration fee (based on vehicle cost)",
            "RTO inspects the vehicle",
            "Registration certificate (RC) issued within 7 days"
        ]),
        "documents_required": json.dumps(["Form 20", "Sales invoice", "Insurance", "PUC", "Road tax receipt", "ID proof"]),
        "estimated_time": "7-14 working days"
    },
]

# ============================================================
# ZONES DATA
# ============================================================
# GPS-based zones for proactive alerts.
# Each zone has a center point (lat/lng) and radius, or a polygon boundary.

ZONES_DATA = [
    {"id": "zone_chennai_accident_1", "zone_type": "accident_prone", "name": "Anna Salai Junction, Chennai", "state": "TN", "center_lat": 13.0569, "center_lng": 80.2540, "radius_meters": 500, "speed_limit": 30, "laws_json": json.dumps(["mv_act_190", "mv_act_188"]), "message_template": "High accident area. Speed limit: 30 km/h. Drive carefully.", "severity": "high"},
    {"id": "zone_chennai_accident_2", "zone_type": "accident_prone", "name": "OMR IT Corridor, Chennai", "state": "TN", "center_lat": 12.9032, "center_lng": 80.2319, "radius_meters": 1000, "speed_limit": 40, "laws_json": json.dumps(["mv_act_188", "mv_act_194d"]), "message_template": "IT corridor zone. Watch for pedestrian crossings.", "severity": "medium"},
    {"id": "zone_chennai_school_1", "zone_type": "school_zone", "name": "School Zone - T Nagar, Chennai", "state": "TN", "center_lat": 13.0300, "center_lng": 80.2400, "radius_meters": 300, "speed_limit": 20, "laws_json": json.dumps(["mv_act_188", "mv_act_129"]), "message_template": "School zone. No honking. Speed limit: 20 km/h.", "severity": "high"},
    {"id": "zone_chennai_school_2", "zone_type": "school_zone", "name": "School Zone - Adyar, Chennai", "state": "TN", "center_lat": 12.9936, "center_lng": 80.2574, "radius_meters": 300, "speed_limit": 20, "laws_json": json.dumps(["mv_act_188", "mv_act_129"]), "message_template": "School zone. No honking. Speed limit: 20 km/h.", "severity": "high"},
    {"id": "zone_bangalore_accident_1", "zone_type": "accident_prone", "name": "Silk Board Junction, Bangalore", "state": "KN", "center_lat": 12.8997, "center_lng": 77.6140, "radius_meters": 800, "speed_limit": 40, "laws_json": json.dumps(["mv_act_190", "mv_act_188"]), "message_template": "High accident junction. Reduce speed. Speed limit: 40 km/h.", "severity": "high"},
    {"id": "zone_bangalore_accident_2", "zone_type": "accident_prone", "name": "Electronic City Highway, Bangalore", "state": "KN", "center_lat": 12.8456, "center_lng": 77.6603, "radius_meters": 1000, "speed_limit": 60, "laws_json": json.dumps(["mv_act_188"]), "message_template": "Accident-prone stretch. Maintain speed limit.", "severity": "medium"},
    {"id": "zone_bangalore_school_1", "zone_type": "school_zone", "name": "School Zone - Indiranagar, Bangalore", "state": "KN", "center_lat": 12.9784, "center_lng": 77.6408, "radius_meters": 300, "speed_limit": 20, "laws_json": json.dumps(["mv_act_188", "mv_act_129"]), "message_template": "School zone. No honking. Speed limit: 20 km/h.", "severity": "high"},
    {"id": "zone_bangalore_speed_1", "zone_type": "speed_change", "name": "Airport Road Speed Change, Bangalore", "state": "KN", "center_lat": 13.0358, "center_lng": 77.5970, "radius_meters": 2000, "speed_limit": 80, "laws_json": json.dumps(["mv_act_188"]), "message_template": "Speed limit changes to 80 km/h on Airport Road.", "severity": "low"},
]


def seed_database():
    """
    Insert all seed data into the SQLite database.
    
    Uses INSERT OR REPLACE so it's safe to run multiple times
    (idempotent - won't create duplicates).
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Insert laws
    cursor.executemany(
        "INSERT OR REPLACE INTO laws (id, title, section, description, states, violation_type) VALUES (?, ?, ?, ?, ?, ?)",
        [(l['id'], l['title'], l['section'], l['description'], json.dumps(l['states']), l['violation_type']) for l in LAWS_DATA]
    )

    # Insert penalties
    cursor.executemany(
        "INSERT OR REPLACE INTO penalties (id, violation_type, section, state, first_offense, second_offense, additional_details) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [(p['id'], p['violation_type'], p['section'], p['state'], p['first_offense'], p['second_offense'], p['additional_details']) for p in PENALTIES_DATA]
    )

    # Insert procedures
    cursor.executemany(
        "INSERT OR REPLACE INTO procedures (id, title, steps, documents_required, estimated_time) VALUES (?, ?, ?, ?, ?)",
        [(p['id'], p['title'], p['steps'], p['documents_required'], p['estimated_time']) for p in PROCEDURES_DATA]
    )

    # Insert zones
    cursor.executemany(
        "INSERT OR REPLACE INTO zones (id, zone_type, name, state, polygon, center_lat, center_lng, radius_meters, speed_limit, laws_json, message_template, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [(z['id'], z['zone_type'], z['name'], z['state'], None, z.get('center_lat'), z.get('center_lng'), z.get('radius_meters'), z.get('speed_limit'), z.get('laws_json'), z['message_template'], z['severity']) for z in ZONES_DATA]
    )

    conn.commit()
    conn.close()
    print(f"Seeded {len(LAWS_DATA)} laws, {len(PENALTIES_DATA)} penalties, {len(PROCEDURES_DATA)} procedures, {len(ZONES_DATA)} zones")


if __name__ == '__main__':
    from database import initialize_database
    initialize_database()
    seed_database()
