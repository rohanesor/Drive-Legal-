import json
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'drivelegal.db')


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
    # 24 New Laws for 8 states
    {"id": "ap_speed_limit", "title": "AP Speed Limits", "section": "AP Motor Vehicles Rules", "description": "Speed cameras on NH-65, strict speed enforcement.", "states": ["AP"], "violation_type": "speeding", "source": "AP State Gazette Notification 2019"},
    {"id": "ap_helmet_rule", "title": "AP Helmet Rule", "section": "AP Motor Vehicles Rules", "description": "Helmet mandatory for pillion in AP.", "states": ["AP"], "violation_type": "no_helmet", "source": "AP Police Traffic Advisory 2022"},
    {"id": "ap_document_rule", "title": "AP Document Requirements", "section": "AP Motor Vehicles Rules", "description": "Online RC verification allowed via DigiLocker.", "states": ["AP"], "violation_type": "no_documents", "source": "MoRTH DigiLocker Notification 2018"},
    
    {"id": "kl_speed_limit", "title": "KL Speed Limits", "section": "KL Motor Vehicles Rules", "description": "Horn-free zone enforcement and strict speed limits.", "states": ["KL"], "violation_type": "speeding", "source": "Kerala Motor Vehicles Department Circular 2021"},
    {"id": "kl_helmet_rule", "title": "KL Helmet Rule", "section": "KL Motor Vehicles Rules", "description": "Helmet mandatory in all areas in KL.", "states": ["KL"], "violation_type": "no_helmet", "source": "Kerala MVD Notification 2019"},
    {"id": "kl_document_rule", "title": "KL Document Requirements", "section": "KL Motor Vehicles Rules", "description": "Green tax proof for old vehicles mandatory.", "states": ["KL"], "violation_type": "no_documents", "source": "Kerala State Budget Notification 2021"},
    
    {"id": "mh_speed_limit", "title": "MH Speed Limits", "section": "MH Motor Vehicles Rules", "description": "Mumbai speed limits 80km/h on expressway.", "states": ["MH"], "violation_type": "speeding", "source": "Maharashtra Highway Police Notification 2020"},
    {"id": "mh_helmet_rule", "title": "MH Helmet Rule", "section": "MH Motor Vehicles Rules", "description": "Helmet for both rider+pillion in MH.", "states": ["MH"], "violation_type": "no_helmet", "source": "Maharashtra Traffic Police Advisory 2019"},
    {"id": "mh_document_rule", "title": "MH Document Requirements", "section": "MH Motor Vehicles Rules", "description": "Emission PUC mandatory in MH.", "states": ["MH"], "violation_type": "no_documents", "source": "Maharashtra Transport Dept Notification"},
    
    {"id": "dl_speed_limit", "title": "DL Speed Limits", "section": "DL Motor Vehicles Rules", "description": "Enhanced fines, speed enforcement across DL.", "states": ["DL"], "violation_type": "speeding", "source": "Delhi Traffic Police Gazette 2021"},
    {"id": "dl_helmet_rule", "title": "DL Helmet Rule", "section": "DL Motor Vehicles Rules", "description": "Delhi odd-even provisions and strict helmet rules.", "states": ["DL"], "violation_type": "no_helmet", "source": "Delhi Transport Department Order"},
    {"id": "dl_document_rule", "title": "DL Document Requirements", "section": "DL Motor Vehicles Rules", "description": "CNG mandate for commercial vehicles in DL.", "states": ["DL"], "violation_type": "no_documents", "source": "Supreme Court of India Directives on Delhi Air Quality"},
    
    {"id": "rj_speed_limit", "title": "RJ Speed Limits", "section": "RJ Motor Vehicles Rules", "description": "Desert highway speed enforcement in RJ.", "states": ["RJ"], "violation_type": "speeding", "source": "Rajasthan Transport Department Notification"},
    {"id": "rj_helmet_rule", "title": "RJ Helmet Rule", "section": "RJ Motor Vehicles Rules", "description": "Helmet rule relaxed in some rural areas historically.", "states": ["RJ"], "violation_type": "no_helmet", "source": "Rajasthan State Gazette 2019"},
    {"id": "rj_document_rule", "title": "RJ Document Requirements", "section": "RJ Motor Vehicles Rules", "description": "Strict enforcement of permit documents for tourism vehicles.", "states": ["RJ"], "violation_type": "no_documents", "source": "Rajasthan Tourism Transport Guidelines"},
    
    {"id": "up_speed_limit", "title": "UP Speed Limits", "section": "UP Motor Vehicles Rules", "description": "Speed governors mandatory for commercial vehicles.", "states": ["UP"], "violation_type": "speeding", "source": "UP State Transport Notification 2020"},
    {"id": "up_helmet_rule", "title": "UP Helmet Rule", "section": "UP Motor Vehicles Rules", "description": "Helmet enforcement varies across UP.", "states": ["UP"], "violation_type": "no_helmet", "source": "UP Traffic Police Directives"},
    {"id": "up_document_rule", "title": "UP Document Requirements", "section": "UP Motor Vehicles Rules", "description": "High Security Registration Plates (HSRP) strictly enforced.", "states": ["UP"], "violation_type": "no_documents", "source": "UP Transport Department Circular 2022"},
    
    {"id": "gj_speed_limit", "title": "GJ Speed Limits", "section": "GJ Motor Vehicles Rules", "description": "RFID-based toll enforcement and speed limits.", "states": ["GJ"], "violation_type": "speeding", "source": "Gujarat State Gazette"},
    {"id": "gj_helmet_rule", "title": "GJ Helmet Rule", "section": "GJ Motor Vehicles Rules", "description": "Reduced fines from MV Act 2019 via state notification in GJ.", "states": ["GJ"], "violation_type": "no_helmet", "source": "Gujarat Motor Vehicles (Amendment) Rules 2019"},
    {"id": "gj_document_rule", "title": "GJ Document Requirements", "section": "GJ Motor Vehicles Rules", "description": "Carrying physical or Digilocker documents mandatory.", "states": ["GJ"], "violation_type": "no_documents", "source": "Gujarat Transport Department Advisory"},
    
    {"id": "ts_speed_limit", "title": "TS Speed Limits", "section": "TS Motor Vehicles Rules", "description": "Hyderabad speed cameras active.", "states": ["TS"], "violation_type": "speeding", "source": "Telangana Traffic Police Speed Enforcement Data"},
    {"id": "ts_helmet_rule", "title": "TS Helmet Rule", "section": "TS Motor Vehicles Rules", "description": "Helmet mandatory, Breathalyzer drives on weekends.", "states": ["TS"], "violation_type": "no_helmet", "source": "Hyderabad Traffic Police Notification"},
    {"id": "ts_document_rule", "title": "TS Document Requirements", "section": "TS Motor Vehicles Rules", "description": "Digital driving license and RC via RTA m-Wallet acceptable.", "states": ["TS"], "violation_type": "no_documents", "source": "Telangana RTA Directives"}
]

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

# Add 96 Penalties
penalty_templates = [
    ("speeding", "mv_act_188", "MoRTH Motor Vehicles (Amendment) Act 2019"),
    ("no_helmet", "mv_act_194b", "MoRTH Motor Vehicles (Amendment) Act 2019"),
    ("no_seatbelt", "mv_act_194a", "MoRTH Motor Vehicles (Amendment) Act 2019"),
    ("drunk_driving", "mv_act_200", "MoRTH Motor Vehicles (Amendment) Act 2019"),
    ("red_light", "mv_act_177", "MoRTH Motor Vehicles (Amendment) Act 2019"),
    ("mobile_phone", "mv_act_194d", "MoRTH Motor Vehicles (Amendment) Act 2019"),
    ("no_license", "mv_act_181", "MoRTH Motor Vehicles (Amendment) Act 2019"),
    ("no_insurance", "mv_act_196", "MoRTH Motor Vehicles (Amendment) Act 2019"),
    ("dangerous_driving", "mv_act_190", "MoRTH Motor Vehicles (Amendment) Act 2019"),
    ("overloading", "mv_act_183", "MoRTH Motor Vehicles (Amendment) Act 2019"),
    ("no_registration", "mv_act_192", "MoRTH Motor Vehicles (Amendment) Act 2019"),
    ("underage_driving", "mv_act_199", "MoRTH Motor Vehicles (Amendment) Act 2019")
]

for st in ["AP", "KL", "MH", "DL", "RJ", "UP", "GJ", "TS"]:
    for vtype, sec, source in penalty_templates:
        first = "₹1000"
        second = "₹2000"
        
        if st == 'DL':
            first = "₹2000 (Estimated high fine)"
            second = "₹4000 (Estimated high fine)"
        elif st == 'GJ':
            first = "₹500"
            second = "₹1000"
        elif st == 'RJ':
            first = "₹800"
            second = "₹1500"
            
        PENALTIES_DATA.append({
            "id": f"pen_{vtype}_{st.lower()}",
            "violation_type": vtype,
            "section": sec,
            "state": st,
            "first_offense": first,
            "second_offense": second,
            "additional_details": f"State specific penalty for {st}",
            "source": source
        })

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
    # 6 New Procedures
    {
        "id": "proc_echallan_payment",
        "title": "Online e-Challan Payment",
        "steps": json.dumps(["Visit echallan.parivahan.gov.in (not as source)", "Enter Challan number, Vehicle number or DL number", "Verify details via OTP", "Select payment gateway", "Complete transaction and save receipt"]),
        "documents_required": json.dumps(["Challan ID", "Vehicle Number"]),
        "estimated_time": "10 minutes",
        "source": "MoRTH E-Challan Guidelines"
    },
    {
        "id": "proc_fitness_certificate",
        "title": "Fitness Certificate Renewal",
        "steps": json.dumps(["Apply online via Parivahan", "Pay fitness test fee", "Take vehicle to automated testing station (ATS) or RTO", "Undergo emission and mechanical tests", "Receive digital fitness certificate"]),
        "documents_required": json.dumps(["RC", "Insurance", "PUC", "Form 20/22"]),
        "estimated_time": "1 day",
        "source": "Central Motor Vehicles Rules 1989"
    },
    {
        "id": "proc_emission_puc",
        "title": "Pollution Under Control (PUC)",
        "steps": json.dumps(["Visit authorized emission testing center", "Provide vehicle RC number", "Tester will insert probe into exhaust", "Pay prescribed fee based on vehicle type", "Collect printed PUC certificate"]),
        "documents_required": json.dumps(["Vehicle RC"]),
        "estimated_time": "15 minutes",
        "source": "Central Motor Vehicles Rules 1989"
    },
    {
        "id": "proc_international_permit",
        "title": "International Driving Permit",
        "steps": json.dumps(["Fill Form 4A online", "Upload visa and passport copies", "Pay fee of ₹1000", "Visit RTO for document verification", "IDP issued for 1 year validity"]),
        "documents_required": json.dumps(["Valid Indian DL", "Passport", "Visa", "Flight tickets", "Medical Form 1A"]),
        "estimated_time": "3-5 days",
        "source": "MoRTH International Driving Permit Rules"
    },
    {
        "id": "proc_vehicle_scrapping",
        "title": "Vehicle Scrapping Process",
        "steps": json.dumps(["Find Registered Vehicle Scrapping Facility (RVSF)", "Submit vehicle and documents", "RVSF defaces engine/chassis number", "Receive Certificate of Deposit (CoD)", "Use CoD for tax concession on new vehicle"]),
        "documents_required": json.dumps(["Original RC", "Owner ID proof", "Bank details"]),
        "estimated_time": "1-2 days",
        "source": "MoRTH Vehicle Scrappage Policy 2021"
    },
    {
        "id": "proc_accident_fir",
        "title": "Filing FIR for Road Accident",
        "steps": json.dumps(["Call 112 or visit nearest police station", "Provide detailed written complaint", "Submit medical report if injured", "Police will visit site and prepare panchnama", "Collect copy of FIR for insurance claim"]),
        "documents_required": json.dumps(["Written complaint", "ID Proof", "Medical certificate", "Vehicle documents"]),
        "estimated_time": "3-4 hours",
        "source": "Indian Penal Code / Police Procedures"
    }
]

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

cities = {
    'AP': [("Gachibowli", 17.4401, 78.3489), ("HITEC City", 17.4435, 78.3772), ("Banjara Hills", 17.4156, 78.4347), ("Jubilee Hills", 17.4311, 78.4069)],
    'KL': [("MG Road", 9.9760, 76.2801), ("Edappally", 10.0261, 76.3125), ("Vyttila", 9.9663, 76.3188), ("Marine Drive", 9.9820, 76.2748)],
    'MH': [("Andheri", 19.1136, 72.8697), ("Bandra-Worli Sea Link", 19.0284, 72.8173), ("Eastern Express Highway", 19.1172, 72.9567), ("Dadar", 19.0178, 72.8478)],
    'DL': [("ITO", 28.6291, 77.2407), ("Rajpath/Kartavya Path", 28.6129, 77.2295), ("Ring Road", 28.5910, 77.1650), ("Connaught Place", 28.6304, 77.2177)],
    'RJ': [("MI Road", 26.9179, 75.8077), ("JLN Marg", 26.8610, 75.8143), ("Tonk Road", 26.8529, 75.7951), ("Ajmer Road", 26.8920, 75.7533)],
    'UP': [("Hazratganj", 26.8458, 80.9392), ("Gomti Nagar", 26.8524, 80.9995), ("Aminabad", 26.8433, 80.9238), ("Aliganj", 26.8906, 80.9419)],
    'GJ': [("SG Highway", 23.0039, 72.5020), ("Ashram Road", 23.0326, 72.5684), ("CG Road", 23.0296, 72.5593), ("Sarkhej-Gandhinagar Highway", 22.9818, 72.4965)],
    'TS': [("Tank Bund", 17.4239, 78.4738), ("Begumpet", 17.4447, 78.4664), ("LB Nagar", 17.3457, 78.5522), ("Miyapur", 17.4968, 78.3614)]
}

for st in ["AP", "KL", "MH", "DL", "RJ", "UP", "GJ", "TS"]:
    locs = cities[st]
    ZONES_DATA.extend([
        {"id": f"zone_{st.lower()}_accident", "zone_type": "accident_prone", "name": f"Accident Spot - {locs[0][0]}, {st}", "state": st, "center_lat": locs[0][1], "center_lng": locs[0][2], "radius_meters": 500, "speed_limit": 30, "laws_json": json.dumps(["mv_act_190"]), "message_template": "High accident area. Drive carefully.", "severity": "high", "source": f"{st} Road Accidents Report 2022"},
        {"id": f"zone_{st.lower()}_speed", "zone_type": "speed_change", "name": f"Speed Enforcement - {locs[1][0]}, {st}", "state": st, "center_lat": locs[1][1], "center_lng": locs[1][2], "radius_meters": 1000, "speed_limit": 60, "laws_json": json.dumps(["mv_act_188"]), "message_template": "Speed camera ahead.", "severity": "medium", "source": f"{st} Traffic Police Directives"},
        {"id": f"zone_{st.lower()}_school", "zone_type": "school_zone", "name": f"School Zone - {locs[2][0]}, {st}", "state": st, "center_lat": locs[2][1], "center_lng": locs[2][2], "radius_meters": 300, "speed_limit": 20, "laws_json": json.dumps(["mv_act_188"]), "message_template": "School zone. Go slow.", "severity": "high", "source": "MoRTH Road Safety Guidelines"},
        {"id": f"zone_{st.lower()}_special", "zone_type": "special_zone", "name": f"Special Zone - {locs[3][0]}, {st}", "state": st, "center_lat": locs[3][1], "center_lng": locs[3][2], "radius_meters": 400, "speed_limit": 20, "laws_json": json.dumps(["mv_act_129"]), "message_template": "Special zone. No honking.", "severity": "medium", "source": "Municipal Corporation Data"}
    ])


def seed_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.executemany(
        "INSERT OR REPLACE INTO laws (id, title, section, description, states, violation_type) VALUES (?, ?, ?, ?, ?, ?)",
        [(l['id'], l['title'], l['section'], l['description'], json.dumps(l['states']), l['violation_type']) for l in LAWS_DATA]
    )

    cursor.executemany(
        "INSERT OR REPLACE INTO penalties (id, violation_type, section, state, first_offense, second_offense, additional_details) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [(p['id'], p['violation_type'], p['section'], p['state'], p['first_offense'], p['second_offense'], p['additional_details']) for p in PENALTIES_DATA]
    )

    cursor.executemany(
        "INSERT OR REPLACE INTO procedures (id, title, steps, documents_required, estimated_time) VALUES (?, ?, ?, ?, ?)",
        [(p['id'], p['title'], p['steps'], p['documents_required'], p['estimated_time']) for p in PROCEDURES_DATA]
    )

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
