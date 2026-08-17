# VAZHI Repository Audit

Completed on 2026-08-18.

This repository audit analyzes the current DriveLegal codebase to identify valuable components, obsolete modules, and the starting point for the complete Vazhi rebuild.

---

## 1. Dead, Obsolete, & Isolated Modules

We audited the repository to locate dead code, duplicate directories, and external components to clean up:

- **Root Android Folder (`android_obsolete`)**: Isolated duplicate of the Android project in the root directory. Successfully removed from compilation path.
- **Root Entry Point (`index_obsolete.js`)**: Isolated duplicate entry point in the root. 
- **Root Node Modules (`node_modules_obsolete`)**: Isolated duplicate dependencies, now permanently deleted from disk.
- **Chaquopy & Embedded Python**: Completely removed in the previous phase. No native Python bindings (`PythonBridgeModule`), large heap allocations, or embedded Python runtimes remain in the mobile project.
- **Convex Database Sync**: Fully defunct and deleted. Redux stores, sync services, and client bindings for Convex have been successfully removed.
- **iOS Folder**: Non-existent. There is no `ios/` folder or Xcode configurations in the repository.

---

## 2. Valuable Infrastructure & Reusable Logic

The following modules contain valuable algorithms, data structure presets, and service bridges that should be kept, rebuilt, or extracted into the Vazhi navigation-first architecture:

### Frontend Layer:
- **`LocationMap.tsx`**: A dark-theme map UI using Leaflet.js inside a WebView. Renders markers, geofenced zones, and polyline coordinates. Contains user pulsating icon and heading arrow.
- **`LocationContext.tsx`**: Integrates with `expo-location` to reverse geocode lat/lng via OpenStreetMap's Nominatim API.
- **`osmRoutingProvider.ts` / `mockRoutingProvider.ts` / `routingService.ts`**: Implements route calculation from user coordinates to destination presets using free OSRM endpoints. Also implements routing fallback and safety route checks.
- **`speedLimitService.ts`**: Fetches speed limits from OSM Overpass API or falls back to state default adjustments.
- **`emergencyService.ts` / `EmergencyScreen.tsx`**: Implements RoadSOS direct-dial dialing actions and searches nearby emergency contacts.
- **`ChallanCalculatorScreen.tsx`**: A state-wise traffic violation fine lookup sheet.
- **`VoiceInput.tsx` / `VoiceAssistantScreen.tsx`**: Houses the native audio recorder and TTS voice warning synthesis.

### Backend Layer:
- **`server.py`**: A lightweight Python `http.server` running on production host `drivelegal.duckdns.org` exposing actions like `health`, `check_zone`, `get_penalties`, and `get_speed_limit` via `/query`.
- **`database.py`**: SQLite database managing tables for laws, penalties, procedures, and geofenced zones.
- **`sync_service.py` / `api_integration.py`**: Syncs live traffic incidents, road conditions, and local laws from OpenStreetMap Overpass and Data.gov.in.

---

## 3. Mixed / Dead Branding References

Visible strings or identifiers that must be renamed or cleaned up to avoid confusion:

- **DriveLegal**: In package names (`com.drivelegal`), Gradle files, `latest.json`, static html templates, and UI strings.
- **RoadMind AI**: In settings labels and onboarding messages.
- **DriveCockpit**: In footer credits and navigation overlays.

This audit establishes the groundwork for transitioning to **VAZHI** — an intelligent navigation co-pilot.
