# VAZHI Rebuild — State Architecture

This document maps the state management system used in VAZHI to verify that duplicate sources or defunct providers (e.g. Convex) are not conflicting.

---

## 1. Active State Management Libraries

### Redux Toolkit (Global Screen State)
- **Store configuration**: Located in `frontend/src/store/index.ts`.
- **Slices**:
  - `chatSlice.ts`: Tracks LLM chat session history.
  - `settingsSlice.ts`: Tracks driving mode configuration and speed alert limits.
  - `alertSlice.ts`: Tracks alert status and active speed limit zone notifications.

### React Context (Transient System Settings)
- **ThemeContext**: Located in `frontend/src/context/ThemeContext.tsx`. Tracks color presets and night/day display styles.
- **LocationContext**: Located in `frontend/src/context/LocationContext.tsx`. Tracks active coordinates, geocode regions, and accuracy thresholds.

### AsyncStorage (Local Persistence)
- Persists user preferences and cached zones so the app works instantly when offline.

---

## 2. Defunct State Systems (Removed)
- **Convex Providers**: Defunct and fully removed.
- **Dual source overlap check**: The domain state is structured so that global transient values reside in Redux/Context, and persistence only occurs in AsyncStorage. No overlapping states remain.
