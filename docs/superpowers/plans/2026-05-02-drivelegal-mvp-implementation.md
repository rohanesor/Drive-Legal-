# DriveLegal MVP - Implementation Plan

**Spec:** `docs/superpowers/specs/2026-05-02-drivelegal-mvp-design.md`
**Timeline:** May 2 - May 31, 2026 (29 days)
**Team:** Solo developer

---

## Phase 1: Project Setup + Data Collection (May 2-8)

### Task 1.1: Initialize React Native Project
**Files:** Root project structure
**Dependencies:** Node.js, npm/yarn, Expo CLI or React Native CLI

```
npx react-native init DriveLegal --template react-native-template-typescript
# OR with Expo:
npx create-expo-app DriveLegal --template
```

**Configure:**
- TypeScript strict mode
- ESLint + Prettier
- Git init + .gitignore
- Add `package.json` scripts: `android`, `ios`, `lint`, `test`

### Task 1.2: Configure Chaquopy (Python-on-Android)
**Files:** `android/build.gradle`, `android/app/build.gradle`

1. Add Chaquopy plugin to root `build.gradle`:
```gradle
buildscript {
    repositories { google(); mavenCentral() }
    dependencies {
        classpath "com.chaquo.python:gradle:15.0.1"
    }
}
```

2. Apply plugin in `app/build.gradle`:
```gradle
apply plugin: 'com.chaquo.python'
android { ... }
python {
    buildPython "python3"
    pip {
        install "faiss-cpu"
        install "onnxruntime"
        install "pywhispercpp"
    }
}
```

3. Create `android/app/src/main/python/` directory for Python modules
4. Test: Add `main.py` with `print("hello")` and call from Java

### Task 1.3: Add RN Dependencies
```bash
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install @reduxjs/toolkit react-redux
npm install @react-native-async-storage/async-storage
npm install react-native-paper react-native-vector-icons
npm install react-native-maps
npm install react-native-push-notification
npm install i18next react-i18next
```

### Task 1.4: Create Project Directory Structure
Per spec §6.4:
```
driveLegal/
├── src/
│   ├── screens/
│   ├── components/
│   ├── services/
│   └── store/
├── android/app/src/main/python/
├── assets/
│   ├── data/
│   └── models/
```

### Task 1.5: Data Collection Scripts
**Files:** `python-service/ingest/scrape.py`, `python-service/ingest/seed.py`

1. Scrape Motor Vehicles Act 1988 from IndianKanoon
2. Scrape TN amendments from tntraffic.tn.gov.in
3. Scrape KA amendments from Karnataka RTO site
4. Parse into structured JSON matching spec §4.1 schema
5. Write `seed.py` to populate SQLite from JSON

**Data output format:**
```json
{
  "laws": [
    {
      "id": "mv_act_188",
      "title": "Speed Limit Violation",
      "section": "Motor Vehicles Act, Section 188",
      "description": "Driving vehicle at speed exceeding limit...",
      "states": ["TN", "KN", "AP"],
      "violation_type": "speeding"
    }
  ],
  "penalties": [
    {
      "id": "pen_speed_tn",
      "violation_type": "speeding",
      "section": "mv_act_188",
      "state": "TN",
      "first_offense": "₹500",
      "second_offense": "₹1000"
    }
  ],
  "procedures": [...],
  "zones": [...]
}
```

**Target:** 100+ laws, 50+ penalty entries, 20+ procedures, 50+ zones

### Task 1.6: Zone Data Collection
**Files:** `python-service/ingest/zone_import.py`

1. Collect accident-prone zone coordinates from TN police reports
2. Collect school/hospital zone locations from OpenStreetMap
3. Collect state border polygons from government GIS data
4. Convert to GeoJSON → import to SQLite `zones` table

### Deliverables Week 1
- [ ] RN project compiles on Android emulator
- [ ] Chaquopy bridge works (Python callable from RN)
- [ ] SQLite schema created and seeded with 100+ laws
- [ ] FAISS index generated from law data
- [ ] Zone data: 20+ zones for Chennai + Bangalore
- [ ] All data bundled in `assets/data/`

---

## Phase 2: Python Service + Semantic Search (May 9-15)

### Task 2.1: SQLite Database Module
**Files:** `python-service/database.py`

Implement:
- `get_laws(state: str) -> list[Law]`
- `get_penalties(violation_type: str, state: str) -> list[Penalty]`
- `get_procedures(procedure_type: str) -> list[Procedure]`
- `get_zones(lat: float, lng: float, state: str) -> list[Zone]`
- `save_chat_history(query: str, response: str, state: str)`
- `get_user_preferences() -> dict`
- `save_user_preferences(prefs: dict)`

Test with pytest: `pytest python-service/test_database.py`

### Task 2.2: Embedding Generation (Pre-compute)
**Files:** `python-service/ingest/embed.py`

1. Load `all-MiniLM-L6-v2` via sentence-transformers
2. Generate embeddings for all law descriptions
3. Build FAISS index (`IndexFlatIP`)
4. Save index to `python-service/models/faiss_index/`
5. Export model to ONNX: `python-service/models/all-MiniLM-L6-v2.onnx`

### Task 2.3: FAISS Search Module
**Files:** `python-service/search.py`

Implement:
- `load_faiss_index() -> faiss.Index`
- `embed_query(text: str) -> np.ndarray` (using ONNX model)
- `search(query: str, top_k: int = 3) -> list[Law]`
  - Embed query
  - Search FAISS index
  - Return law objects with similarity scores
- `keyword_fallback(query: str, state: str) -> list[Law]`
  - Search `laws.title` and `laws.section` using SQL LIKE
  - Used when FAISS confidence < 0.3

Test: `pytest python-service/test_search.py` with known queries

### Task 2.4: Main Query Pipeline (No LLM Yet)
**Files:** `python-service/main.py`

Implement initial `handle_query()` that:
1. Parses JSON payload from RN bridge
2. If audio path: placeholder (STT not ready yet)
3. Embeds query text
4. Searches FAISS → retrieves top 3 laws
5. Fetches penalties from SQLite
6. Returns template-based response:
```python
f"According to {law.section}: {law.description}. Penalty in {state}: {penalty.first_offense}."
```
7. Returns JSON with `status`, `response_text`, `source_sections`, `confidence`

### Task 2.5: Zone Detection Module
**Files:** `python-service/zones.py`

Implement:
- `load_zones() -> list[Zone]` (from SQLite)
- `point_in_polygon(lat, lng, polygon) -> bool` (ray-casting algorithm)
- `haversine(lat1, lng1, lat2, lng2) -> float` (distance in meters)
- `check_zones(lat, lng, state) -> list[ZoneAlert]` (per spec §8.2)
- `create_state_border_alert(new_state) -> ZoneAlert`
- `create_zone_alert(zone, distance=None) -> ZoneAlert`

Test: Known coordinates in Chennai, verify zone triggers correctly

### Task 2.6: Bridge Integration (Python → RN)
**Files:** `android/app/src/main/python/main.py`, `android/.../PythonBridgeModule.java`, `src/services/pythonBridge.ts`

1. Java NativeModule wraps `handle_query()` and `check_zones()`
2. TypeScript service calls Java module via `NativeModules`
3. Test: RN sends text query → Python returns template response → displays in console

### Deliverables Week 2
- [ ] SQLite queries working (laws, penalties, procedures, zones)
- [ ] FAISS semantic search returns relevant laws
- [ ] Keyword fallback works for low-confidence queries
- [ ] Zone detection triggers for test coordinates
- [ ] RN can call Python and receive responses
- [ ] End-to-end text query: input → search → response (template-based)

---

## Phase 3: Voice + Trust Signals + Bridge Polish (May 16-22)

### Task 3.1: Whisper STT Integration
**Files:** `python-service/stt.py`

1. Install `pywhispercpp` in Chaquopy pip config
2. Bundle `whisper-tiny` model files in `assets/models/`
3. Implement:
```python
def transcribe_audio(audio_uri: str, language: str = "en") -> str:
    # Load whisper model
    # Convert audio file to required format (16kHz mono WAV)
    # Run transcription
    # Return text
```

**Audio format note:** Android records in M4A/AAC. Convert to WAV using `pydub` or Android native converter before passing to Whisper.

### Task 3.2: Audio Recording in RN
**Files:** `src/components/VoiceInput.tsx`

1. Use `expo-av` or `react-native-audio-recorder-player`
2. Implement:
   - Microphone button with press-and-hold
   - Recording indicator (animated waveform)
   - Save audio to temp file
   - Pass URI to Python bridge
3. Request microphone permission on first use

### Task 3.3: TTS Integration
**Files:** `python-service/tts.py`, Android native module

1. Use Android `TextToSpeech` class via native module
2. Implement Java method:
```java
@ReactMethod
public void speak(String text, String language) {
    TextToSpeech tts = new TextToSpeech(context, status -> {
        tts.setLanguage(new Locale(language));
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "drivelegal");
    });
}
```
3. Languages: "ta" (Tamil), "hi" (Hindi), "en" (English)
4. Fallback: if language not available, use English

### Task 3.4: Trust Signals UI
**Files:** `src/components/CitationChip.tsx`, `src/components/ConfidenceIndicator.tsx`, `src/components/ChatMessage.tsx`

1. **CitationChip:**
   - Displays `MV Act §188` as tappable chip
   - On tap: show full law text in modal
   - Multiple chips per response

2. **ConfidenceIndicator:**
   - Green dot: confidence > 0.7
   - Yellow dot: confidence 0.4-0.7
   - Red dot: confidence < 0.4
   - Label text: "High confidence" / "Medium" / "Low — verify with RTO"

3. **ChatMessage update:**
```tsx
<ChatMessage text={response.text} citations={response.source_sections} confidence={response.confidence} />
```

4. **Disclaimer:**
   - Show once per session (first bot response)
   - Store in AsyncStorage: `disclaimer_shown_session: boolean`
   - Reset on app restart

### Task 3.5: Citation Validation (Anti-Hallucination)
**Files:** `python-service/llm.py` (prepare for LLM), `python-service/main.py`

Implement validation pipeline:
1. LLM generates response with citations
2. Extract citation patterns (regex: `§\d+`, `Section \d+`, `Rule \d+`)
3. Cross-reference with retrieved law IDs
4. Strip unmatched citations
5. Replace with: "Information based on Motor Vehicles Act provisions"

### Task 3.6: i18n Setup
**Files:** `src/i18n/en.json`, `src/i18n/ta.json`, `src/i18n/hi.json`

1. Configure `i18next` with 3 language files
2. Translate all UI labels:
   - "Ask about traffic laws..."
   - "Settings"
   - "Language"
   - "State"
   - "Dark Mode"
   - Disclaimer text
   - Alert messages

### Deliverables Week 3
- [ ] Voice recording works in RN
- [ ] Whisper transcribes audio to text
- [ ] TTS speaks responses in selected language
- [ ] Citations displayed on every response
- [ ] Confidence indicator visible
- [ ] Disclaimer shown on first response
- [ ] All UI labels translated (EN, TA, HI)
- [ ] End-to-end: voice input → template response → TTS output

---

## Phase 4: TinyLlama + Multilingual Polish (May 23-26)

### Task 4.1: llama.cpp Android Build
**Files:** External (llama.cpp repo)

1. Clone `https://github.com/ggerganov/llama.cpp`
2. Build for Android ARM64:
```bash
mkdir build-android && cd build-android
cmake .. -DCMAKE_TOOLCHAIN_FILE=$NDK/build/cmake/android.toolchain.cmake \
         -DANDROID_ABI=arm64-v8a \
         -DANDROID_PLATFORM=android-26
make -j4
```
3. Output: `libllama.so` (native library)
4. Bundle in `android/app/src/main/jniLibs/arm64-v8a/libllama.so`

### Task 4.2: TinyLlama Python Binding
**Files:** `python-service/llm.py`

Option A (preferred): Use `llama-cpp-python` with pre-built Android wheels
Option B: Bind `libllama.so` via Python `ctypes`

Implement:
```python
class TinyLlama:
    def __init__(self, model_path: str):
        self.model = load_model(model_path)  # Q4_K_M GGUF
    
    def generate(self, prompt: str, max_tokens: int = 256) -> str:
        # Run inference
        # Return generated text
    
    def unload(self):
        # Free memory
```

Download model: `tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf` (~600MB)

### Task 4.3: LLM Integration in Pipeline
**Files:** `python-service/main.py`, `python-service/llm.py`

Update query pipeline:
1. After FAISS search retrieves laws
2. Format system prompt (per spec §5.3)
3. Call `llm.generate(prompt)`
4. Validate citations in output (§3.5)
5. If LLM fails or returns empty → use template fallback
6. Return response with `confidence` based on FAISS similarity

### Task 4.4: Lazy-Load Memory Management
**Files:** `python-service/main.py`, Android `MainActivity.java`

Implement:
1. `load_llm()` → loads TinyLlama into memory
2. `unload_llm()` → frees memory
3. Load LLM only after FAISS search completes
4. Unload LLM after response generated
5. Check available memory before loading:
```python
import psutil
available = psutil.virtual_memory().available
if available < 1.5 * 1024**3:  # < 1.5GB
    # Use template fallback instead of LLM
```

### Task 4.5: Multilingual Testing
**Files:** Test queries in all 3 languages

Test scenarios:
1. Tamil query: "வேக வரம்பு மீறினால் அபராதம் என்ன?"
2. Hindi query: "बिना हelmet के चलने पर जुर्माना कितना है?"
3. English query: "What's the fine for speeding?"

Verify:
- Whisper transcribes correctly in all 3 languages
- FAISS search finds relevant laws regardless of input language
- TTS speaks response in correct language
- LLM responds in the queried language

### Deliverables Week 4
- [ ] TinyLlama generates responses with retrieved law context
- [ ] Citations validated against retrieved laws
- [ ] LLM falls back to template on failure
- [ ] Lazy-load prevents OOM on low-memory devices
- [ ] All 3 languages work end-to-end (voice → search → LLM → TTS)
- [ ] Response time < 3 seconds (after models loaded)

---

## Phase 5: Background Monitoring (May 27-29)

### Task 5.1: Android Foreground Service
**Files:** `android/.../DriveLegalLocationService.java`

Implement:
1. Extend `Service` class
2. Create persistent notification: "DriveLegal is monitoring your location"
3. Request `ACCESS_FINE_LOCATION` + `ACCESS_BACKGROUND_LOCATION`
4. Use `FusedLocationProviderClient` for GPS updates
5. Callback on location change:
```java
LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 30000)
    .setMinUpdateDistanceMeters(100)
    .build();
```

### Task 5.2: Bridge Foreground Service → Python
**Files:** `DriveLegalLocationService.java`, `python-service/main.py`

1. On location update, call Python `check_zones(lat, lng, state)`
2. If zones triggered, send `zone_alert` JSON to RN
3. RN displays notification via `react-native-push-notification`

### Task 5.3: Alert UI Components
**Files:** `src/components/AlertBanner.tsx`, `src/store/alertSlice.ts`

1. AlertBanner: displays zone alert at top of ChatScreen
2. Actions: "Dismiss" or "Learn More"
3. "Learn More" opens chat with `suggested_query` pre-filled
4. Alert deduplication: track last alert time per zone (30 min cooldown)
5. Store alert state in Redux `alertSlice`

### Task 5.4: Settings Integration
**Files:** `src/screens/SettingsScreen.tsx`

Add toggles:
- "Location Alerts" (on/off) → starts/stops foreground service
- "Show disclaimer on every response" (on/off)
- "Language" selector (EN/TA/HI)
- "State" selector (manual override)
- "Dark Mode" toggle

### Task 5.5: Background Service Lifecycle
**Files:** `src/services/backgroundService.ts`, `android/.../DriveLegalLocationService.java`

1. Start service when user enables "Location Alerts"
2. Stop service when user disables
3. Auto-restart if killed by OS (use `START_STICKY`)
4. Handle app foreground/background transitions
5. Permission flow: request location permissions before enabling alerts

### Deliverables Week 5
- [ ] Foreground service runs with persistent notification
- [ ] GPS polling every 30s or 100m
- [ ] Zone alerts trigger correctly for known zones
- [ ] Alert → "Learn More" opens chat with context
- [ ] Alert deduplication works (30 min cooldown)
- [ ] Settings screen fully functional
- [ ] Service auto-restarts if killed

---

## Phase 6: Testing + Demo Prep (May 30-31)

### Task 6.1: End-to-End Testing
Test all scenarios:
1. Text query: "What's the fine for speeding in TN?"
2. Voice query (Tamil): record → transcribe → respond
3. Voice query (Hindi): record → transcribe → respond
4. Zone alert: walk to known accident zone → alert fires
5. State border crossing: simulate crossing TN→KA border
6. Offline mode: airplane mode → all features work
7. Low-memory device: test on device with 2GB RAM
8. Cold start: first launch → measure load time
9. Battery test: run monitoring for 1 hour → check drain

### Task 6.2: Performance Optimization
- Profile memory usage with Android Studio profiler
- Optimize FAISS search if > 200ms
- Optimize LLM inference if > 2s
- Reduce APK size: ProGuard, remove unused resources
- Ensure lazy-load works on low-memory devices

### Task 6.3: Demo Preparation
1. **Demo video (3-5 min):**
   - Show app opening, location detection
   - Text query demo
   - Voice query demo (Tamil)
   - Zone alert firing
   - "Learn More" → chatbot interaction
   - Settings screen (language toggle)
   - Offline mode demo (airplane mode)

2. **Pitch deck (5 slides):**
   - Problem: Citizens don't know traffic laws
   - Solution: AI voice chatbot, fully offline
   - Demo: Live app walkthrough
   - Impact: 50+ pilot users, 90%+ accuracy
   - Scale: Government partnership path

3. **Metrics dashboard:**
   - Accuracy: ___%
   - Response time: ___s avg
   - Offline: 100%
   - App size: ___GB

### Deliverables Week 6
- [ ] All test scenarios pass
- [ ] Demo video recorded
- [ ] Pitch deck ready
- [ ] APK ready for sideload installation
- [ ] Metrics documented

---

## File Creation Order

Follow this sequence to avoid circular dependencies:

1. **Week 1:**
   - `package.json` → `tsconfig.json` → `babel.config.js`
   - `android/build.gradle` → `android/app/build.gradle`
   - `src/App.tsx` → `src/screens/ChatScreen.tsx` (empty shell)
   - `python-service/ingest/scrape.py` → `python-service/ingest/seed.py`
   - `python-service/ingest/embed.py` → `python-service/ingest/zone_import.py`

2. **Week 2:**
   - `python-service/database.py` → `python-service/test_database.py`
   - `python-service/search.py` → `python-service/test_search.py`
   - `python-service/zones.py` → `python-service/test_zones.py`
   - `python-service/main.py` (template pipeline)
   - `android/.../PythonBridgeModule.java`
   - `src/services/pythonBridge.ts`

3. **Week 3:**
   - `python-service/stt.py`
   - `src/components/VoiceInput.tsx`
   - `src/components/CitationChip.tsx` → `src/components/ConfidenceIndicator.tsx`
   - `src/components/ChatMessage.tsx` (updated)
   - `python-service/tts.py` → Android TTS native module
   - `src/i18n/en.json` → `ta.json` → `hi.json`

4. **Week 4:**
   - `python-service/llm.py`
   - `python-service/main.py` (LLM integration)
   - `android/.../jniLibs/arm64-v8a/libllama.so`
   - `src/components/ChatMessage.tsx` (LLM response display)

5. **Week 5:**
   - `android/.../DriveLegalLocationService.java`
   - `src/services/backgroundService.ts`
   - `src/components/AlertBanner.tsx`
   - `src/store/alertSlice.ts`
   - `src/screens/SettingsScreen.tsx`

6. **Week 6:**
   - Test files
   - Demo assets

---

## Dependencies by Phase

| Phase | Key Dependencies | Risk Level |
|-------|-----------------|------------|
| 1 | IndianKanoon accessibility, Chaquopy installation | Medium |
| 2 | FAISS on Android via Chaquopy, ONNX runtime | Medium |
| 3 | pywhispercpp compatibility, Android TTS language packs | High |
| 4 | llama.cpp ARM64 build, TinyLlama model download | High |
| 5 | Android foreground service permissions, FusedLocationProvider | Medium |
| 6 | None (testing only) | Low |

---

## Blocking Dependencies

These must complete before subsequent work can begin:

1. **Chaquopy setup** → blocks ALL Python service work (Week 1)
2. **Data collection** → blocks FAISS index, embedding generation, zone data (Week 1)
3. **SQLite schema + seeding** → blocks database module, search module (Week 1-2)
4. **Python bridge** → blocks all RN-Python communication (Week 2)
5. **llama.cpp build** → blocks LLM integration (Week 4)

---

## Quick Start Commands

```bash
# Week 1: Project setup
npx react-native init DriveLegal --template react-native-template-typescript
cd DriveLegal
npm install @react-navigation/native @react-navigation/stack
npm install @reduxjs/toolkit react-redux
npm install react-native-paper
npm install i18next react-i18next

# Install Python dependencies for data ingestion
pip install sentence-transformers faiss-cpu onnx sqlite3 requests beautifulsoup4

# Run data ingestion
python python-service/ingest/scrape.py
python python-service/ingest/embed.py
python python-service/ingest/zone_import.py
python python-service/ingest/seed.py

# Week 2: Test Python modules
cd python-service
pytest test_database.py test_search.py test_zones.py

# Week 3-4: Run app
cd ..
npx react-native run-android

# Build APK
cd android
./gradlew assembleRelease
```
