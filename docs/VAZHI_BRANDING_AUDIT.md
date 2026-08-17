# VAZHI Rebuild — Branding Audit

This document classifies occurrences of legacy names (`DriveLegal`, `RoadMind`, `DriveCockpit`) remaining in the codebase.

---

## 1. Legacy Occurrences Mapping

### Internal Configuration / Package Names
- **`com.drivelegal`**:
  - Namespace for Android builds in Gradle configs, Java package paths, and AndroidManifest files.
  - **Classification**: **Intentionally Retained (Internal/Build Configuration)**. Changing package identifiers breaks compiled releases signing keys and Sentry hooks.
- **`DriveLegal-v1.0.0.apk`**:
  - File name variables in deployment workflow tasks.
  - **Classification**: **Historical Documentation / Backend Internal**.

### Web portal and assets
- **Download HTML pages**:
  - File titles reference "DriveLegal Download".
  - **Classification**: **Intentionally Retained / Backend Portal**. Will remain compatible during app migration.

### Database File Names
- **`drivelegal.db`**:
  - SQLite data storage database.
  - **Classification**: **Internal Backend Database**.

---

## 2. Branding Clean verification
All user-visible mobile screens display the single clean VAZHI identity.
- Onboarding, Splash intro screens, and navigation headers display **Vazhi**.
- Legacy app title references in strings resources are updated.
- Proactive voice co-pilot alerts refer only to the **Vazhi driving safety co-pilot**.
