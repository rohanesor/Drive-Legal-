# DriveLegal — Project Context

## Project Overview
DriveLegal is an offline-first, AI-powered traffic law assistant for Indian citizens. It runs locally on mobile devices and supports both standard Mobile view and a dashboard-driven Car Mode (intended for in-vehicle mounting or Android Auto support).

---

## Technology Stack

### Frontend (Mobile App)
* **Framework**: React Native (with Expo SDK 50 support and native modules).
* **State Management**: Redux Toolkit (5 slices: `chat`, `settings`, `alerts`, `convex`, `appMode`).
* **Navigation**: React Navigation (`MobileNavigator` for phone interface, `CarNavigator` for car console interface).
* **Database (Offline)**: SQLite (`drivelegal.db`) for caching localized laws, penalties, procedures, and GPS zones.
* **Sync & Cloud**: Convex (`frontend/convex`) schemas and functions for remote cloud sync.

### Backend (Local AI Pipeline)
* **Execution**: Ran locally on-device using Android Chaquopy.
* **Pipeline Flow**:
  1. **STT (Speech-to-Text)**: Local OpenAI Whisper-tiny model transcribe audio inputs.
  2. **Semantic Search**: FAISS index queries SQLite vector embeddings for matching traffic laws.
  3. **Generative LLM**: Local TinyLlama-1.1B model formats citations and guidelines.
  4. **TTS (Text-to-Speech)**: Converts answers into audio guidance.

---

## Folder Structure

* `backend/src/`: Canonical python backend modules (`main.py`, `database.py`, `search.py`, `stt.py`, `tts.py`, `llm.py`, `sync_service.py`, `search_enhancer.py`, `api_integration.py`).
* `frontend/src/`: React Native codebase including screens, hooks, navigation, store, and context hooks.
* `frontend/convex/`: Convex schemas and functions.
* `docs/`: Product Requirements Document (PRD), specifications, and roadmap details.
* `prompts/`: Guidance instructions for developers and assistants.

---

## Development & Diagnostics

### Run typecheck (from root or frontend)
```bash
npm run typecheck
```

### Run linter (from root or frontend)
```bash
npm run lint
```

### Run Python unit tests
```bash
python backend/src/run_tests.py
```
