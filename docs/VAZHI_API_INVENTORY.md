# VAZHI Rebuild — API Inventory

This document inventories all endpoints exposed by the production python backend.

---

## 1. REST Endpoint Summary

| Method | Path | Purpose | Callers | Database | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Fetch backend health stats | App startup ping | Read | **KEEP** |
| `GET` | `/download` | Web portal download page | Browser client | None | **KEEP** |
| `GET` | `/download/android` | Web portal android page | Browser client | None | **KEEP** |
| `GET` | `/download/ios` | Web portal iOS page | Browser client | None | **KEEP** |
| `GET` | `/releases/latest.json` | Fetch latest app release info | Checksum updater | None | **KEEP** |
| `GET` | `/releases/history.json` | Fetch release logs history | Checksum updater | None | **KEEP** |
| `GET` | `/download/files/{file}` | Download compiled release APK | Web portal download | None | **KEEP** |
| `POST` | `/query` | Routing gateway for query actions | React Native client | Read/Write | **KEEP** |

---

## 2. POST /query Route Action Mapping

The `/query` gateway parses an `action` field to route requests:
- **`action: "health"`**: Retrieves law counts, penalties counts, and zones counts.
- **`action: "get_penalties"`**: Queries violation fines by state code parameters.
- **`action: "get_speed_limit"`**: Queries maximum speed limits from database coordinates.
- **`action: "check_zone"`**: Compares coordinates to active alerts/safety zones.
- **`action: "query"`**: Sends chat text payload to conversational LLM.
- **`action: "generate_trip_plan"`** [NEW]: Generates temporal driving schedule configurations.
