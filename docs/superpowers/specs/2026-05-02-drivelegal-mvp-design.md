# DriveLegal MVP - Design Specification

**Date:** 2026-05-02
**Deadline:** 2026-05-31 (29 days)
**Team:** Solo developer
**Target:** Hackathon-ready mobile app

## 1. Problem & Solution

**Problem:** Citizens don't know traffic laws, fines, and procedures specific to their location, causing confusion, repeated violations, and unsafe driving.

**Solution:** An AI-powered voice chatbot providing real-time, location-specific traffic law information, fully offline.

## 2. Scope

### MUST-HAVE (May 31 demo)
- Text chat interface with offline legal knowledge base
- Voice input (speech-to-text) and voice output (text-to-speech)
- Location detection (GPS-based state/city identification)
- Continuous background location monitoring with zone alerts
- Multilingual support: Tamil, Hindi, English
- Fully offline operation (no internet required)
- Semantic search over traffic laws, penalties, procedures
- Android 8+ compatibility
- Local LLM for response generation (TinyLlama 1.1B via llama.cpp)
- Trust signals on every response: source citations, confidence indicator, disclaimer

### PHASE 2 (Post-hackathon)
- Backend API for real-time law updates
- Android Auto integration
- Insurance partnership API

## 3. Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────┐
│  DriveLegal Mobile App                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  React Native Layer (UI Only)                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐     │
│  │ Chat UI  │  │ Voice UI │  │ Alert/UI       │     │
│  └────┬─────┘  └────┬─────┘  └───────┬────────┘     │
│       │              │                │              │
│       └──────────────┼────────────────┘              │
│                      │                               │
│            ┌─────────▼──────────┐                    │
│            │ Native Bridge      │                    │
│            │ (RN ↔ Python IPC)  │                    │
│            └─────────┬──────────┘                    │
│                      │                               │
├──────────────────────┼───────────────────────────────┤
│                      │                               │
│  Python Service (All Logic)                          │
│  ┌──────────────────────────────────────────────┐   │
│  │  • whisper.cpp (STT via ctypes)              │   │
│  │  • FAISS (semantic search)                   │   │
│  │  • SQLite (laws database)                    │   │
│  │  • llama.cpp + TinyLlama 1.1B (response gen) │   │
│  │  • Platform TTS (voice output)               │   │
│  │  • Zone detector (GeoJSON point-in-polygon)  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Local Data Store                                    │
│  • SQLite DB (laws, penalties, procedures, zones)   │
│  • FAISS index (embeddings)                          │
│  • Whisper models (multilingual)                     │
│  • TTS voice data                                    │
│  • GeoJSON zone boundaries                           │
└─────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────┐
  │  Android Foreground Service                   │
  │  • GPS polling (every 30s or 100m)           │
  │  • Zone boundary checking                     │
  │  • Notification dispatch                      │
  │  • Persistent: "DriveLegal monitoring"        │
  └──────────────────────────────────────────────┘
```

### 3.2 Bridge Implementation (Chaquopy)

The Python service runs inside the Android app via **Chaquopy** (https://chaquo.com/chaquopy/), a Gradle plugin that embeds a CPython interpreter in Android. This is the only viable approach for running FAISS, Whisper, and llama.cpp within a React Native Android app.

**How it works:**
- Chaquopy is added to `android/build.gradle` as a plugin
- Python modules are bundled into the APK under `src/main/python/`
- React Native calls Python via a **NativeModule** bridge (`PythonBridgeModule.java`)
- The NativeModule uses `com.chaquo.python.Python` to invoke Python functions
- Python returns PythonObjects which are converted to JSON and passed back to RN

**Lifecycle:**
1. App launches → Chaquopy initializes Python interpreter (~2 seconds, cached on subsequent launches)
2. Python service preloads models on first query (lazy loading, see §10.2)
3. Models stay in memory until app is killed by OS
4. If OOM occurs, models are unloaded and reloaded on next query

**Bridge call pattern:**
```java
// PythonBridgeModule.java (Android NativeModule)
@ReactMethod
public void executeQuery(String jsonPayload, Promise promise) {
    Python py = Python.getInstance();
    PyObject module = py.getModule("main");
    PyObject result = module.callAttr("handle_query", jsonPayload);
    promise.resolve(result.toString());
}
```

```typescript
// pythonBridge.ts (React Native)
import { NativeModules } from 'react-native';
const { PythonBridge } = NativeModules;

export const executeQuery = async (payload: QueryPayload): Promise<QueryResult> => {
  const result = await PythonBridge.executeQuery(JSON.stringify(payload));
  return JSON.parse(result);
};
```

**Error propagation:**
- Python exceptions are caught in `main.py` and returned as error JSON
- The NativeModule always resolves the Promise (never rejects)
- RN layer checks `result.status` field to determine success/failure

### 3.3 Communication Protocol

All communication uses JSON over the Chaquopy bridge:

**RN → Python:**
```json
{
  "action": "query",
  "text": "What's the fine for speeding?",
  "audio_uri": "/path/to/audio.m4a",
  "location": {"lat": 13.08, "lng": 80.27, "state": "TN"},
  "language": "ta"
}
```

**RN → Python (zone check):**
```json
{
  "action": "check_zone",
  "location": {"lat": 13.08, "lng": 80.27, "state": "TN"}
}
```

**Python → RN (zone alert):**
```json
{
  "status": "zone_alert",
  "zone_type": "accident_prone",
  "zone_name": "Anna Salai Junction",
  "message": "High accident area ahead. Speed limit: 30km/h. Fine for overspeeding: ₹500",
  "suggested_query": "What are the traffic rules at accident-prone zones?",
  "severity": "high"
}
```

**Python → RN (success):**
```json
{
  "status": "success",
  "response_text": "In Tamil Nadu, overspeeding...",
  "response_audio_uri": "/path/to/tts_output.wav",
  "source_sections": ["MV Act §188", "TN Rule 45"],
  "confidence": 0.92
}
```

**Python → RN (error):**
```json
{
  "status": "error",
  "code": "MODEL_LOAD_FAILED",
  "message": "TinyLlama model file not found",
  "fallback_available": true,
  "fallback_response_text": "Based on keyword matching: Speeding fine in TN is ₹500..."
}
```

**Error codes:**
- `MODEL_LOAD_FAILED`: LLM or Whisper model could not be loaded
- `SEARCH_FAILED`: FAISS search returned no results
- `DATABASE_ERROR`: SQLite query failed
- `AUDIO_PROCESSING_FAILED`: Whisper transcription failed
- `TTS_FAILED`: Text-to-speech generation failed
- `UNKNOWN_ERROR`: Catch-all for unexpected errors

**Zone types:**
- `state_border`: Crossing into a new state (laws/penalties change)
- `accident_prone`: High accident frequency area
- `school_zone`: School/hospital zone with special rules
- `speed_change`: Speed limit differs from previous zone
- `custom`: Any user-defined or admin-defined zone

## 4. Data Layer

### 4.1 SQLite Schema

```sql
CREATE TABLE laws (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  section TEXT NOT NULL,
  description TEXT NOT NULL,
  states TEXT,  -- JSON array: ["TN", "KN", "AP"]
  violation_type TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE penalties (
  id TEXT PRIMARY KEY,
  violation_type TEXT NOT NULL,
  section TEXT NOT NULL,
  state TEXT NOT NULL,
  first_offense TEXT,
  second_offense TEXT,
  additional_details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE procedures (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  steps TEXT,  -- JSON array of steps
  documents_required TEXT,  -- JSON array
  estimated_time TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  law_id TEXT,
  embedding BLOB,  -- FAISS vector (384-dim for all-MiniLM-L6-v2)
  query_text TEXT,
  FOREIGN KEY(law_id) REFERENCES laws(id)
);

CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  state TEXT,
  language TEXT DEFAULT 'en',
  dark_mode BOOLEAN DEFAULT 0,
  notifications_enabled BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_history (
  id TEXT PRIMARY KEY,
  user_query TEXT,
  bot_response TEXT,
  user_state TEXT,
  helpful BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE zones (
  id TEXT PRIMARY KEY,
  zone_type TEXT NOT NULL,  -- state_border, accident_prone, school_zone, speed_change
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  polygon TEXT,  -- GeoJSON polygon coordinates (null for point-based zones)
  center_lat REAL,  -- For point-based zones
  center_lng REAL,
  radius_meters INTEGER,  -- Radius for point-based zones
  speed_limit INTEGER,  -- Optional speed limit for this zone
  laws_json TEXT,  -- JSON array of applicable law IDs
  message_template TEXT,  -- Notification message template
  severity TEXT DEFAULT 'medium',  -- low, medium, high
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 Data Collection Sources

| Source | Content | Priority |
|--------|---------|----------|
| IndianKanoon (indiankanoon.org) | Motor Vehicles Act 1988, Supreme Court rulings | 1 |
| VAHAN Portal (vahan.nic.in) | Penalty data, RTO circulars | 2 |
| TN Traffic Police (tntraffic.tn.gov.in) | Tamil Nadu amendments, local rules, accident data | 2 |
| Karnataka RTO | Karnataka amendments, local rules, accident data | 2 |
| State Police Websites | State-specific procedures | 3 |
| OpenStreetMap | School locations, hospital zones, accident coordinates | 2 |

### 4.3 Embedding Model

- Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
- Embedding generation: Python (pre-computed during data ingestion)
- FAISS index type: IndexFlatIP (inner product, CPU-optimized)
- Index size target: <10MB for 1000+ documents
- **Runtime embedding**: The all-MiniLM-L6-v2 model is bundled with the app and loaded at runtime for embedding incoming user queries. The model is exported to ONNX format (~80MB) and loaded via `onnxruntime` Python package for lower memory footprint vs PyTorch.
- Model file location: `python-service/models/all-MiniLM-L6-v2.onnx`

## 5. AI/ML Components

### 5.1 Speech-to-Text (Whisper)
- Model: whisper-tiny (~39MB)
- Languages: English, Tamil, Hindi
- Runtime: **whisper.cpp** (C++ port) bound via **`pywhispercpp`** Python package (PyPI, pybind11-based binding)
- Alternative: manual ctypes binding if pywhispercpp has Chaquopy compatibility issues
- Integration: Called from Python service when audio input received

### 5.2 Semantic Search (FAISS)
- Library: `faiss-cpu`
- Index: Pre-built at data ingestion time, bundled with app
- Search: top-K=3 most relevant laws per query
- Latency target: <200ms

### 5.3 Response Generation (TinyLlama)
- Model: TinyLlama 1.1B Chat v1.0
- Runtime: llama.cpp (compiled for Android ARM64)
- Quantization: Q4_K_M (~600MB model file)
- Context window: 2048 tokens
- System prompt template:
  ```
  You are DriveLegal, an expert on Indian traffic laws.
  User's State: {state}
  Language: {language}
  
  Relevant Laws:
  {retrieved_laws}
  
  Rules:
  - Always cite the relevant section of the Motor Vehicles Act
  - Provide state-specific penalty amounts
  - Explain procedures clearly
  - Be concise and actionable
  - If unsure, say "I recommend checking with your local RTO"
  ```
- Latency target: <2 seconds for response generation

### 5.4 Text-to-Speech
- Android: `TextToSpeech` class via native module
- Languages: Tamil (ta-IN), Hindi (hi-IN), English (en-IN)
- Fallback: If TTS not available, display text only

## 6. React Native Layer

### 6.1 Screens
- **ChatScreen**: Main conversation interface
- **SettingsScreen**: Language, state, dark mode toggles
- **LocationScreen**: Manual state/city override

### 6.2 Components
- **ChatMessage**: Individual message bubble (user/bot)
- **VoiceInput**: Microphone button with recording indicator
- **LocationPicker**: Manual state selection dropdown
- **LoadingIndicator**: Animated response wait state

### 6.3 State Management
- Redux Toolkit for app state
- AsyncStorage for user preferences
- SQLite for law data (accessed via Python bridge)

### 6.4 Project Structure
```
driveLegal/
├── src/
│   ├── screens/
│   │   ├── ChatScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── LocationScreen.tsx
│   ├── components/
│   │   ├── ChatMessage.tsx
│   │   ├── VoiceInput.tsx
│   │   ├── LocationPicker.tsx
│   │   ├── CitationChip.tsx        (Source citation display)
│   │   ├── ConfidenceIndicator.tsx  (Green/yellow/red dot)
│   │   └── AlertBanner.tsx          (Zone alert notification)
│   ├── services/
│   │   ├── pythonBridge.ts    (RN ↔ Python communication)
│   │   ├── location.ts        (GPS detection + zone monitoring)
│   │   ├── backgroundService.ts (Android foreground service bridge)
│   │   └── storage.ts         (AsyncStorage wrapper)
│   ├── store/
│   │   ├── chatSlice.ts
│   │   ├── settingsSlice.ts
│   │   ├── alertSlice.ts      (Zone alert state)
│   │   └── index.ts
│   └── App.tsx
├── android/
│   ├── java/.../
│   │   ├── PythonBridgeModule.java
│   │   ├── DriveLegalLocationService.java  (Foreground service)
│   │   └── DriveLegalPackage.java
│   └── python-service/      (Bundled Python runtime)
├── assets/
│   ├── data/                (SQLite DB, FAISS index, zone GeoJSON)
│   └── models/              (Whisper, TinyLlama, embedding model)
├── package.json
└── README.md
```

## 7. Python Service

### 7.1 Structure
```
python-service/
├── main.py                  (Entry point, bridge listener, error handler)
├── stt.py                   (Whisper transcription)
├── search.py                (FAISS vector search)
├── llm.py                   (TinyLlama response generation)
├── tts.py                   (Text-to-speech output)
├── database.py              (SQLite operations)
├── zones.py                 (Zone detection, point-in-polygon)
├── models/                  (ML model files)
│   ├── whisper-tiny/
│   ├── tinyllama-1.1b-q4.gguf
│   ├── all-MiniLM-L6-v2.onnx
│   └── faiss_index/
│       ├── index.faiss
│       └── index.pkl
├── data/
│   ├── drivelegal.db        (Pre-populated SQLite)
│   └── zones.geojson        (Zone boundary data)
├── requirements.txt
└── ingest/
    ├── scrape.py            (Data collection scripts)
    ├── embed.py             (Embedding generation)
    ├── seed.py              (Database seeding)
    └── zone_import.py       (GeoJSON → SQLite zone import)
```

### 7.2 Query Pipeline
1. Receive query from RN bridge (text or audio path)
2. If audio: transcribe via Whisper → text
3. Get user location from RN (state identifier)
4. Embed query text using all-MiniLM-L6-v2 ONNX model
5. Search FAISS index → top 3 matching laws
6. Fetch full law details from SQLite
7. Generate response via TinyLlama with retrieved context
8. Generate TTS audio for response
9. Return text + audio path + source citations to RN

### 7.3 Error Handling Strategy

All errors are caught at the pipeline level with graceful degradation:

**Step 1-2 (STT failure):** If Whisper fails to transcribe, return `"Could not understand audio. Please try again or type your question."`

**Step 4-5 (Search failure):** If FAISS returns no results with confidence > threshold (0.3), fall back to keyword matching against `laws.title` and `laws.section` columns. If still no results, return `"I don't have information on that topic yet. Try asking about traffic violations, fines, or procedures."`

**Step 7 (LLM failure):** If TinyLlama fails to load or generates empty/garbage output, fall back to template-based response using retrieved law data:
```
"According to {section}: {description}. Penalty in {state}: {first_offense}."
```

**Step 8 (TTS failure):** If TTS generation fails, return response with empty `response_audio_uri`. RN layer displays text-only response.

**Memory pressure:** If Android reports low memory (`ActivityManager.isLowRamDevice()`), unload embedding model after each query and reload on demand. This adds ~1 second to subsequent queries but prevents OOM crashes.

**Python exception handler:**
```python
def handle_query(json_payload: str) -> str:
    try:
        payload = json.loads(json_payload)
        result = execute_pipeline(payload)
        return json.dumps({"status": "success", **result})
    except ModelLoadError as e:
        return json.dumps({"status": "error", "code": "MODEL_LOAD_FAILED", "message": str(e), "fallback_available": True, "fallback_response_text": get_fallback_response(payload)})
    except SearchError as e:
        return json.dumps({"status": "error", "code": "SEARCH_FAILED", "message": str(e), "fallback_available": True, "fallback_response_text": keyword_fallback(payload)})
    except Exception as e:
        return json.dumps({"status": "error", "code": "UNKNOWN_ERROR", "message": str(e), "fallback_available": False})
```

## 8. Location Module

### 8.1 State Detection (One-time)
- GPS permission on first run
- State detection from lat/lng using pre-loaded state boundary polygon (GeoJSON bundled)
- Point-in-polygon algorithm: `shapely` Python library or simple ray-casting for bundled polygons
- Manual override: Settings screen allows state/city selection
- Location displayed in header: "You're in Tamil Nadu"

### 8.2 Continuous Background Monitoring

**Android Foreground Service:**
- Implemented as a native Android Foreground Service (`DriveLegalLocationService.java`)
- Required by Android 8+ for any background location access
- Shows persistent notification: "DriveLegal is monitoring your location for traffic alerts"
- Service starts when user enables "Alerts" in Settings
- Service stops when user disables alerts or kills app

**GPS Polling:**
- Interval: every 30 seconds OR when distance moved > 100 meters (whichever comes first)
- Accuracy: `LocationRequest.PRIORITY_BALANCED_POWER_ACCURACY`
- Battery impact: ~3-5% per hour

**Zone Detection Algorithm:**
```python
def check_zones(lat: float, lng: float, state: str) -> list[ZoneAlert]:
    alerts = []
    # 1. Check if user crossed state border
    current_state = detect_state(lat, lng)
    if current_state != last_known_state:
        alerts.append(create_state_border_alert(current_state))

    # 2. Check point-based zones (school, accident-prone) using distance
    nearby_zones = db.query("SELECT * FROM zones WHERE state=? AND center_lat IS NOT NULL", [state])
    for zone in nearby_zones:
        distance = haversine(lat, lng, zone.center_lat, zone.center_lng)
        if distance <= zone.radius_meters:
            alerts.append(create_zone_alert(zone, distance))

    # 3. Check polygon-based zones (larger areas)
    polygon_zones = db.query("SELECT * FROM zones WHERE state=? AND polygon IS NOT NULL", [state])
    for zone in polygon_zones:
        if point_in_polygon(lat, lng, json.loads(zone.polygon)):
            alerts.append(create_zone_alert(zone))

    return alerts
```

**Alert Delivery:**
- Zone detected → Python sends `zone_alert` JSON to RN via bridge
- RN displays native notification via `react-native-push-notification`
- Notification actions:
  - "Dismiss" → closes notification
  - "Learn More" → opens ChatScreen with pre-filled query: `zone.suggested_query`
- Alert deduplication: same zone not alerted more than once per 30 minutes

**Zone Data:**
- Bundled GeoJSON for TN + Karnataka: ~2-3MB
- Pre-populated SQLite `zones` table with 50+ zones (accident-prone areas, school zones, speed change points)
- Data sourced from: TN police accident reports, school location registries, state speed limit notifications

### 8.3 Alert-to-Chatbot Integration

When user taps "Learn More" on an alert:
1. ChatScreen opens with `zone_alert` context passed as props
2. Chatbot pre-populates suggested query: "What are the traffic rules at accident-prone zones?"
3. Bot auto-responds with zone-specific laws from SQLite
4. User can then ask follow-up questions naturally

## 9. Multilingual Support

- Languages: Tamil (ta), Hindi (hi), English (en)
- Whisper models support all three languages
- TTS uses platform voice for each language
- TinyLlama system prompt includes language directive
- UI labels: All three languages via i18n dictionary
- User selects language in Settings

## 9.1 Trust & Safety

Every chatbot response includes three trust signals:

**1. Source Citations**
- Displayed below each response as expandable chips
- Format: `MV Act §188`, `TN Rule 45`, `KN Amendment §12`
- Tapping a citation shows the full text of the referenced law from SQLite
- Citations are extracted from the LLM's generated response AND cross-referenced with actual retrieved laws to prevent hallucinated citations

**2. Confidence Indicator**
- Visual indicator: Green dot (high), Yellow dot (medium), Red dot (low)
- Computed from FAISS search similarity score:
  - High: top result similarity > 0.7
  - Medium: top result similarity 0.4-0.7
  - Low: top result similarity < 0.4 (keyword fallback used)
- Displayed as: "High confidence" / "Medium confidence" / "Low confidence — verify with your RTO"

**3. Disclaimer**
- Shown at bottom of first response in each session:
  - "This information is for educational purposes only. For official advice, contact your local RTO or legal professional."
- Not repeated on every message (annoying), but always accessible via Settings → "About"
- In settings, user can toggle "Show disclaimer on every response"

**UI Layout (ChatMessage component):**
```
┌─────────────────────────────────────┐
│  In Tamil Nadu, overspeeding fine   │
│  is ₹500 for first offense under    │
│  Motor Vehicles Act Section 188.    │
│                                     │
│  📎 MV Act §188  📎 TN Rule 45     │
│  ● High confidence                  │
└─────────────────────────────────────┘
```

**Anti-Hallucination Measures:**
- LLM is prompted with ONLY retrieved law text, not general knowledge
- Citations in LLM output are validated against retrieved law IDs before display
- If LLM generates a citation that doesn't match any retrieved law, it is stripped and replaced with "Information based on Motor Vehicles Act provisions"
- Low-confidence responses use template fallback instead of LLM generation

## 10. Offline Guarantee

| Component | Online Required? | Offline Strategy |
|-----------|-----------------|------------------|
| Speech-to-Text | No | Whisper tiny model bundled (39MB) |
| Semantic Search | No | FAISS index bundled (<10MB) |
| Law Database | No | SQLite bundled (<5MB) |
| Response Generation | No | TinyLlama Q4_K_M bundled (~600MB) |
| Embedding Model | No | all-MiniLM-L6-v2 ONNX bundled (~80MB) |
| Text-to-Speech | Partially | Platform TTS (may require Google TTS language pack download). Fallback: text-only display |
| Location Detection | No | Bundled state boundary polygons |
| Zone Alerts | No | Bundled GeoJSON + SQLite zones table (~2-3MB) |
| Background Monitoring | No | Native Android foreground service, no network calls |
| Law Updates | Yes (Phase 2) | Not in MVP |

### 10.1 Memory Budget

Total app bundle size: ~1.2GB (APK + models)

**Idle state (app launched, no query yet):** ~310MB RSS
- APK (RN + Chaquopy + Python): ~200MB
- Embedding model (preloaded): ~100MB
- SQLite (preloaded): ~10MB

**Per-query peak (models loaded on-demand, one at a time):**
- Whisper.cpp (STT, voice input only): ~50MB, released after transcription
- TinyLlama Q4_K_M (LLM, response gen): ~800-900MB, released after response
- Peak during query: ~310MB (idle) + 900MB (TinyLlama) = **~1.2GB RSS**

**Default behavior: lazy-load mode on ALL devices.** Models are loaded on-demand and released after each query. This ensures the app works on devices with 2GB RAM (heap limit ~512MB-1GB per model with largeHeap).

| Component | Disk Size | RAM (loaded) | Lifecycle |
|-----------|-----------|--------------|-----------|
| APK (RN + Chaquopy + Python) | ~150MB | ~200MB | Always loaded |
| Whisper tiny (whisper.cpp) | 39MB | ~50MB | Load on voice input, release after |
| all-MiniLM-L6-v2 ONNX | 80MB | ~100MB | Preloaded on app launch |
| TinyLlama Q4_K_M | 600MB | ~800-900MB | Load after search, release after response |
| FAISS index | <10MB | ~20MB | Always loaded (resident in APK memory) |
| SQLite DB | <5MB | ~10MB | Always loaded |
| **Peak (during query)** | **~1.2GB** | **~1.2GB RSS** | |

**OOM prevention:**
- Check `ActivityManager.isLowRamDevice()` at startup
- Set `android:largeHeap="true"` in AndroidManifest.xml
- Monitor memory via `Runtime.getRuntime().totalMemory()` before loading each model
- If memory < 1.5GB available: unload embedding model too, load only when needed

### 10.2 Cold Start Strategy

First query takes 8-12 seconds due to model loading. Mitigation:
1. Show loading screen: "Loading DriveLegal (one-time setup)..."
2. **Preload only embedding model and SQLite on app launch** (~100MB idle RAM, already accounted in §10.1 budget)
3. Load Whisper and TinyLlama lazily on first use (released after each query)
4. Cache loaded models in memory for the app session
5. Subsequent queries: <3 seconds (embedding model already loaded, TinyLlama reloaded but faster due to OS file caching)

## 11. Build Plan (29 Days, May 2 - May 31)

| Week | Dates | Focus | Deliverables |
|------|-------|-------|-------------|
| 1 | May 2-8 | Data collection + project setup | Laws scraped, DB schema, RN scaffold, Chaquopy configured, zone data collected |
| 2 | May 9-15 | Python service + FAISS + SQLite | Semantic search working, query pipeline functional, zone detection algorithm |
| 3 | May 16-22 | Whisper + TTS + Bridge + Trust signals | Voice I/O working, citations/confidence/disclaimer on responses |
| 4 | May 23-26 | TinyLlama + multilingual | Full voice chat working, all 3 languages |
| 5 | May 27-29 | Background monitoring | Foreground service, GPS polling, zone alerts, alert-to-chatbot integration |
| Demo Week | May 30-31 | Testing + demo prep | Demo video, pitch deck, beta APK |

**Hard deadline:** Core MVP (text chat + offline laws + location + trust signals) must work by end of Week 3 (May 22). Week 4 adds voice and multilingual. Week 5 adds background monitoring. May 30-31 is demo preparation only.

**Android Auto is NOT in MVP scope** — it is Phase 2 post-hackathon.

## 12. Success Metrics

| Metric | Target |
|--------|--------|
| Accuracy on legal questions | 90%+ |
| Response time | <3 seconds |
| Offline functionality | 100% |
| App compatibility | Android 8+ |
| Pilot users | 50+ |
| App size | <2.5GB (acceptable for hackathon) |
| Crash rate | 0 |
| Zone alert accuracy | 80%+ (alerts fire correctly for known zones) |
| Citation accuracy | 95%+ (citations match actual retrieved laws) |
| Battery impact (monitoring) | <5% per hour |

## 13. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data collection takes longer than expected | High | Start scraping Week 1, prioritize MV Act first. Manual entry for critical laws if scraping fails. |
| TinyLlama accuracy insufficient | High | Fallback to template-based responses using retrieved law data (designed in §7.3) |
| Chaquopy + llama.cpp build fails | High | Pre-compile llama.cpp ARM64 binary separately, bundle as native .so. Use ctypes in Python to call it. |
| Whisper dependency too heavy | High | Use whisper.cpp (C++ port) instead of Python whisper. pywhispercpp package avoids PyTorch. |
| TTS not available for Tamil/Hindi | Medium | Text-only fallback (always available). For demo, use Google TTS on devices that have it. Consider bundling Piper TTS if time allows. |
| FAISS integration with Android | Low | Pre-compute index on desktop, bundle as binary file. faiss-cpu loads it at runtime without compilation. |
| Low-memory Android devices crash | Medium | Lazy-load models, detect low-RAM devices, enable on-demand loading mode (§10.1) |
| Cold start too slow (>15s) | Medium | Preload embedding model + SQLite on app launch. Show progress indicator. Acceptable for hackathon. |
| Background monitoring battery drain | Medium | Use BALANCED_POWER_ACCURACY, 30s/100m polling interval. User can disable in Settings. Android may kill service — auto-restart with WorkManager. |
| Zone data inaccurate or incomplete | Medium | Start with 20 well-known zones in Chennai/Bangalore. Expand based on user reports. Manual curation for accuracy. |
| Foreground service killed by OEM | Medium | Target Android 8+ with proper foreground service declaration. Some OEMs (Xiaomi, Oppo) aggressively kill services — document this limitation for demo devices. |
| Hallucinated citations in LLM output | High | Validate all citations against retrieved law IDs. Strip unmatched citations. Low-confidence queries use template fallback (§9.1). |
