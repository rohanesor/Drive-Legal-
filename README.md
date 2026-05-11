# DriveLegal - AI Traffic Law Assistant

A multilingual (Tamil / Hindi / English), fully offline AI-powered traffic law assistant for Indian citizens. Built with React Native + embedded Python (Chaquopy) for Android 8+.

## Features

- **Chat Interface** — ask traffic law questions in EN/TA/HI, get answers with source citations & confidence indicators
- **Challan Calculator** — compute fines with compounding fees, offense multipliers, commercial surcharges, and late payment penalties
- **GPS Zone Alerts** — foreground service detects state boundaries and alerts when entering restricted/paid-parking zones
- **AI-Powered Responses** — Claude API (online) → TinyLlama (device fallback) → template responses (last resort)
- **Offline-First** — all laws, penalties, calculator logic, and chat templates work without internet
- **Trust Signals** — every response shows `verified`/`draft`/`stale` badge, source URL, and legal disclaimer
- **Scalable Architecture** — country abstraction layer for global expansion beyond India

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native 0.73.6, TypeScript, Redux Toolkit, React Navigation |
| Backend | Python 3.11 (embedded via Chaquopy 15.0.1) |
| Database | SQLite (offline, on-device) |
| AI (online) | Claude API (claude-sonnet-4-20250514) |
| AI (offline) | TinyLlama 1.1B, FAISS semantic search |
| Speech | Whisper tiny (on-device STT) |
| Maps/GPS | Google Play Services Location (zone detection only) |
| i18n | i18next (English / தமிழ் / हिन्दी) |

## Architecture

```
┌─────────────────────────────────────────────────┐
│              React Native UI                     │
│  ChatScreen  │  CalculatorScreen  │  Settings    │
│  MapScreen   │  i18n (EN/TA/HI)  │  Redux Store  │
└──────────────┬──────────────────────────────────┘
               │ Chaquopy Bridge (JSON over JNI)
┌──────────────▼──────────────────────────────────┐
│            Python Backend (Embedded)              │
│  main.py      │  llm.py (Claude→TinyLlama)      │
│  calculator.py│  security.py (integrity checks)  │
│  scrapers/    │  SQLite DB                       │
└─────────────────────────────────────────────────┘
```

## Project Structure

```
DriveLegal/
├── frontend/                    # React Native app
│   ├── android/                 # Android native (Chaquopy, services)
│   ├── src/
│   │   ├── screens/             # Chat, Calculator, Map, Settings
│   │   ├── store/               # Redux (settings, claudeApiKey)
│   │   ├── i18n/                # EN/TA/HI translations
│   │   ├── services/            # GPS, bridge helpers
│   │   └── App.tsx              # Root component
│   ├── index.js                 # Entry point
│   └── package.json
├── backend/                     # Python backend
│   └── src/
│       ├── main.py              # Chaquopy entry, query routing
│       ├── llm.py               # AI chain (Claude → TinyLlama → template)
│       ├── calculator.py        # Fine computation engine
│       ├── security.py          # SHA-256 integrity checks
│       ├── data/                # SQLite DB, scraped JSON
│       ├── scrapers/            # Parivahan/state transport scrapers
│       └── ingest/              # Verified data pipeline
└── docs/                        # Design specs
```

## Build & Run

### Prerequisites
- Node.js >= 18
- JDK 17
- Android SDK (API 34)
- Python 3.11

### Setup
```bash
# Frontend
cd frontend && npm install

# Build debug APK
set ANDROID_HOME=C:\AndroidSDK
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot
cd frontend/android && gradlew assembleDebug

# Install on device
adb install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk

# Start Metro dev server
cd frontend && npx react-native start
```

### Backend (standalone)
```bash
cd backend && python -m src.scrapers.run     # Scrape official sources
cd backend && python -m src.scrapers.verify  # Review → mark verified
cd backend && python -m src.ingest.ingest_scraped  # Ingest into SQLite
```

## Data Pipeline

1. **Scrape** — `src/scrapers/parivahan.py`, `state_transport.py` fetch from Parivahan/state transport sites
2. **Review** — `src/scrapers/verify.py` promotes `draft` → `verified` with reviewer metadata
3. **Ingest** — `src/ingest/ingest_scraped.py` upserts into SQLite, recomputes integrity checkpoints
4. **Verify** — `src/security.py` SHA-256 checksums detect database tampering

## Data Sources

11 annotated official sources including:
- Parivahan (Ministry of Road Transport & Highways)
- data.gov.in (Open Government Data Platform)
- Tamil Nadu Transport Department
- Karnataka Transport Department

## License

MIT
