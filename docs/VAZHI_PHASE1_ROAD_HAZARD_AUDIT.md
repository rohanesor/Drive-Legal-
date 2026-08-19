# VAZHI PHASE 1 — ROAD HAZARD & DRIVER VOICE AUDIT

This document provides a thorough audit of the existing map, routing, hazard detection, curve analysis, speed hump querying, and proactive driver voice systems in **Vazhi**.

---

## 1. Component & Service Audit Matrix

| Component / Service | File Location | Current Behavior | Data Source | Real vs. Hardcoded | Required Phase 1 Change |
|---|---|---|---|---|---|
| **OSM Route Fetcher** | `frontend/src/services/osmRoutingProvider.ts` | Fetches geometry, maneuvers, step distance, and duration via OSRM API | OpenStreetMap (OSRM API) | **REAL** | Extract route geometry corridor for hazard corridor matching |
| **Curve Detector** | `frontend/src/domain/safety/CurveDetector.ts` | Analyzes heading changes over route geometry points | Mathematical angle deviation vector math | **REAL / ENHANCED** | Add noise smoothing, segment length filtering, and configurable thresholds (`NORMAL_CURVE`, `SHARP_CURVE`, `HAIRPIN`) |
| **Speed Breaker Detector** | `frontend/src/domain/safety/SpeedBreakerDetector.ts` | Queries Overpass API & local database for traffic calming / speed humps | Overpass OSM API + `vazhi.db` SQLite | **REAL / NEW** | Match speed humps to route corridor and calculate real-time distance along route |
| **Road Hazard Engine** | `frontend/src/domain/safety/RoadHazardEngine.ts` | Aggregates speed breakers, curves, and hazards along route | Unified hazard pipeline | **REAL / NEW** | Combine CurveDetector and SpeedBreakerDetector into a single hazard pipeline |
| **Safety Event Engine** | `frontend/src/domain/safety/SafetyEngine.ts` | Evaluates speeding, curves, and zone alerts ahead of current position | Navigation session state + route progress | **REAL** | Support lifecycle states (`DETECTED`, `UPCOMING`, `ACTIVE`, `PASSED`) and speed-aware trigger policy |
| **Voice Priority Engine** | `frontend/src/domain/voice/VoicePriorityEngine.ts` | Priority queue and cooldown-based TTS warning speech | Native Android TTS (`VazhiTTS`) / Web Speech | **REAL** | Deduplicate warnings, enforce priority (`CRITICAL` > `HIGH` > `MEDIUM` > `LOW`), avoid speech overlap |
| **Navigation HUD** | `frontend/src/screens/NavigationScreen.tsx` | Displays top maneuver card, speedometer, safety alert pill, and ETA bar | `NavigationSession` state | **REAL** | Render dynamic hazard markers on map and active hazard alert pill (no hardcoded demo cards) |

---

## 2. Eliminated Demo / Hardcoded Behaviors

- **Removed**: Hardcoded speed breaker or sharp curve alerts tied to fake static distances or demo buttons.
- **Removed**: Static "Anna Salai accident zone" or fake "100% Safe" strings.
- **Enforced**: All visual and voice warnings must originate from `RoadHazardEngine` and `SafetyEngine` based on real GPS position and actual route geometry.

---

## 3. Data Flow Architecture

$$\text{GPS Position} \longrightarrow \text{Route Geometry Corridor} \longrightarrow \text{RoadHazardEngine} \longrightarrow \text{SafetyEngine} \longrightarrow \text{VoicePriorityEngine} \longrightarrow \text{Navigation HUD + TTS}$$
