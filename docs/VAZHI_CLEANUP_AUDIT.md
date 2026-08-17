# VAZHI Rebuild — Full Cleanup Audit

This audit evaluates the codebase to discover legacy branding (`DriveLegal`, `RoadMind`, `DriveCockpit`), defunct architectures (`Convex`, `Chaquopy`), and unused code blocks to clean, consolidate, and compile the final production VAZHI app.

---

## 1. Codebase Search Findings

### Defunct Database & Native Bridges (Convex / Chaquopy / PythonBridge)
- **Convex remains**: We found `"convex": "^1.39.1"` listed in `frontend/package.json` dependencies. No active typescript references remain.
- **Chaquopy & PythonBridge**: Fully removed. No Java native models (`PythonBridgeModule`), execution routes (`executeQuery`), or embedded assets remain.
- **NumPy / FAISS**: Found in `.github/workflows` scripts (e.g. `pip install numpy requests` used for some historical test validations). These can be removed from Android workflows since Chaquopy is gone.

### Legacy Branding in Files
- **DriveLegal**:
  - `app.json`: Display name settings (already renamed to `Vazhi`).
  - `MobileNavigator.tsx`: Screen titles like `AI Legal Assistant` (already updated).
  - `strings.xml`: Application name settings (already updated).
  - `AppIntroAnimation.tsx`: Text displays (already updated).
- **RoadMind / RoadMind AI**:
  - Onboarding sliders and settings descriptions (to be removed/modified).
- **DriveCockpit**:
  - UI screens footer credits.

---

## 2. Waste & Obsolete Components Classification

| Path | Description | Classification | Action |
| :--- | :--- | :--- | :--- |
| `android_obsolete/` | Abandoned android build sandbox | **DELETE** | Remove complete folder |
| `index_obsolete.js` | Defunct App entry file | **DELETE** | Remove file |
| `package-lock_obsolete.json` | Old lockfile remains | **DELETE** | Remove file |
| `frontend/src/screens/DashboardScreen.tsx` | Old grid dashboard screen | **DELETE** | Already deleted |
| `__tests__/` | Defunct older tests suite | **REBUILD_LATER** | Preserve folders but clean up old tests |
| `backend/src/__pycache__/` | Compiled Python cache | **DELETE** | Clean via command |

---

## 3. Core Clean boundaries

We enforce these structural boundaries:
- `frontend/` containing the single Vazhi React Native production code.
- `backend/` containing the FastAPI Python backend logic and OSRM endpoints.
- `.github/` containing GitHub Actions deployment files.
- `docs/` containing PRD, PRD plans, and architecture.
