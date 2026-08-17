# Vazhi (வழி) — Intelligent Driving & Navigation Co-Pilot

**Vazhi** is an intelligent, context-aware navigation and driving co-pilot designed for complex Indian road infrastructure, highway corridors, ghat roads, and multi-state legal jurisdictions.

---

## What is Vazhi?

Vazhi goes beyond traditional point-A to point-B routing by unifying **volumetric 3D perspective navigation**, **contextual AI route reasoning**, **proactive voice safety alerts**, and **jurisdiction-aware legal intelligence** into a single cohesive driver assistant.

---

## Why Vazhi?

Standard navigation apps treat all asphalt equally. Vazhi calculates route safety scores by evaluating:
- **Accident Black Spots** (MoRTH / iRAD verified high-severity crash zones)
- **Road Geometry** (Predictive 3D curvature beams on bends >45°)
- **Speed Breakers & Infrastructure Quality**
- **State & RTO Jurisdiction Boundaries** (1,400 RTO district mappings across 10 Indian states)
- **EV Battery Reachability & Isochrones**

---

## Core Features

### 🧭 Intelligent Navigation
- Multi-route calculation with real-time safety scores, toll avoidance, and hill perspective camera locks.

### 🗣️ AI Conversational Routing
- Server-side LLM route intelligence providing:
  - **Route Explanation**: Natural language explanations of why a specific route was chosen.
  - **Route Comparison**: Multi-route trade-off matrices comparing time, distance, tolls, and hazard density.
  - **Natural-Language Modification**: Structured intent parsing for requests like *"Find a fast charger before battery reaches 20%"* or *"Find vegetarian food near the highway"*.

### 🛣️ Road Intelligence
- Deterministic extraction of sharp curves, hairpins, speed breakers, school zones, and toll plazas without fabricating missing map geometries.

### 🔊 Proactive Voice Safety
- 8-language voice alerts (**Tamil, Hindi, English, Kannada, Telugu, Malayalam, Marathi, Gujarati**) using zero-latency template prompts for critical safety events (*"Sharp curve ahead"*, *"Entering Karnataka"*) so safety alerts never block on AI network roundtrips.

### 🗺️ State / District / Taluk Jurisdiction Awareness
- `GeoContextEngine` tracks real-time state and district boundary crossings (`STATE_BORDER_CROSSED`), automatically updating localized traffic fines, RTO regulations, and municipal rules.

### 📅 Intelligent Trip Planning
- Time-aware itinerary planner for long-distance driving (e.g. Chennai to Ladakh or Bangalore to Ooty), generating scheduled rest stops, restaurants, hotels, and EV charging points based on actual arrival times and opening hours.

### 📍 Contextual & Coordinate Routing
- Direct coordinate-to-coordinate routing supporting exact latitude/longitude waypoints for peer location sharing.

### 🔮 3D Navigation Engine
- GPU-accelerated 3D perspective rendering featuring:
  - **Predictive 360° Curvature Tunnel**: `#00E5FF` glowing cyan projection beams on sharp bends.
  - **Volumetric 3D Hazard Domes**: Semi-transparent red threat domes around accident black spots.
  - **Speed-Adaptive Dynamic Yaw Horizon**: Camera pitch tilts up to 68° at speeds above 70 km/h.

### ⚖️ Legal Intelligence
- Instant localized fine lookup and Motor Vehicle Act section search across Tamil Nadu, Karnataka, Kerala, Maharashtra, Delhi, and 5 additional priority states.

### 🆘 Emergency & SOS Assistance
- One-tap access to nearest verified hospitals, police stations, fire stations, mechanics, and petrol pumps with direct call and navigation actions.

### 📡 Graceful Offline Capability
- On-device BRouter offline routing, local geometric HMM map-matching, and cached SQLite legal databases ensuring core navigation and safety alerts remain operational in cellular dead zones.

---

## AI Architecture

```
USER
  ↓
VAZHI FRONTEND (React Native / MapLibre 3D)
  ↓
NAVIGATION ENGINE
  ↓
ROUTE + LIVE CONTEXT (Speed, Pitch, State, Coordinates)
  ↓
SAFETY + LEGAL + GEO + POI DATA
  ↓
AI ROUTE INTELLIGENCE (Server-Side LLM + FAISS Vector Index)
  ↓
DRIVER GUIDANCE / VOICE / ACTIONS
```

---

## Repository Architecture

```
Vazhi Platform
 ├── frontend/                 # Single React Native Mobile App
 │    ├── src/components/       # LocationMap 3D, Navigation overlays
 │    ├── src/screens/          # Navigation, Voice Assistant, Trip Planner, Legal, SOS
 │    ├── src/domain/voice/     # VoicePriorityEngine & 8-language TTS
 │    └── src/services/         # BRouter offline client, Vazhi API client
 └── backend/                  # Single Python Backend Engine
      ├── src/server.py         # HTTP API Router (11 Endpoints)
      ├── src/ai/               # RouteIntelligence, RouteComparison, TripIntent
      ├── src/services/         # MapMatching, Geocoding, SafetyMatrix, Isochrone, POI
      ├── src/ingest/           # CSV Data Loaders & FAISS Vector Embedder (695 vectors)
      └── src/tests/            # 32 Unit Tests + 11 E2E System Tests
```

---

## Development Setup

### Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
python src/server.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run android
```

### Test Suite Execution
```bash
# Run 32 Backend Unit Tests
PYTHONPATH=backend/src python backend/src/run_tests.py

# Run 11 End-to-End System Tests
PYTHONPATH=backend/src python backend/src/tests/test_e2e_full_system.py

# Run Frontend TypeCheck
cd frontend && npx tsc --noEmit
```

---

## License & Data Sourcing

- All legal and accident data are sourced strictly from public MoRTH gazette notifications, state RTO releases, and OpenStreetMap (ODbL).
