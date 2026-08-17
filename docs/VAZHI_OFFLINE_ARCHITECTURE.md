# VAZHI Rebuild — Offline Architecture

This document describes the offline strategies and local fallback systems in the VAZHI application.

---

## 1. Local Seed Datasets (Bundled JSON)
The app bundles standard legal and safety datasets locally under `frontend/src/data/`:
- `laws.json`: Core Indian Motor Vehicles Act sections and rules.
- `penalties.json`: Compounding traffic violations, fines, and license suspension thresholds.
- `emergencyContacts.json`: National highways, state police, and medical helpline contacts.

## 2. Dynamic Location & Map Caching (AsyncStorage)
When online, the app fetches live traffic zones and geofences from the FastAPI backend and caches them locally using AsyncStorage:
- `checkZoneOffline`: When offline, coordinates are compared against cached polygon/circle nodes to check for hazard annotations and zones.
- `getSpeedLimitOffline`: Default speed limits mapped by state parameters are loaded when offline.

---

## 3. Defunct Systems (Removed)
- **Edge AI / Local LLM**: Removed. Offline fallback degrades to simple keyword matching, and requests for AI natural language queries prompt the user to enable internet connection.
- **Chaquopy / Local SQLite (Python)**: Defunct. No local python runtime or SQLite Python drivers are loaded in the frontend.
