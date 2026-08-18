# VAZHI RELEASE PACKAGING AUDIT

## Release Packaging Investigation

This document audits the complete build, bundling, and distribution pipeline for **Vazhi**.

---

## 1. Pipeline Audit Matrix

| Pipeline Layer | Component / File | Current State | Verification Status |
|---|---|---|---|
| **Source App Entry** | `frontend/app.json` | `"name": "Vazhi"`, `"displayName": "Vazhi"` | ✅ VERIFIED |
| **JS Entry Point** | `frontend/index.js` | `AppRegistry.registerComponent("Vazhi", () => App)` | ✅ VERIFIED |
| **React Native Root** | `frontend/src/App.tsx` | Renders `SplashScreen` → `MobileNavigator` / `CarNavigator` | ✅ VERIFIED |
| **Android Package Name** | `frontend/android/app/build.gradle` | `applicationId "com.vazhi"`, `namespace "com.vazhi"` | ✅ VERIFIED |
| **Android Activity** | `MainActivity.java` | `getMainComponentName() { return "Vazhi"; }` | ✅ VERIFIED |
| **Android Application Label** | `strings.xml` | `<string name="app_name">Vazhi</string>` | ✅ VERIFIED |
| **Android Launcher Icons** | `res/mipmap-*/ic_launcher.png` | Real cyan directional avatar rendered from `assets/branding/vazhi-icon.svg` | ✅ VERIFIED |
| **Build Variant** | `./gradlew assembleRelease` | `Release` variant with Hermes bytecode optimization & R8 minification | ✅ VERIFIED |
| **JS Bundling Task** | `:app:createBundleReleaseJsAndAssets` | React Native Metro bundles `index.js` into `index.android.bundle` | ✅ VERIFIED |
| **Stale Cache Prevention** | `./gradlew clean` + delete `android/app/build` | Pre-build clean step enforces fresh bundle generation | ✅ VERIFIED |
| **CI/CD Workflow** | `.github/workflows/deploy.yml` | `checkout` → `npm install` → `./gradlew clean assembleRelease` → upload `vazhi-v1.0.0.apk` | ✅ VERIFIED |
| **Download Portal** | `backend/src/static/download.html` | Served live at `http://vazhi.duckdns.org/download` | ✅ VERIFIED |

---

## 2. Root Cause of Stale Bundle Packaging

* **Issue**: If Gradle builds without clearing `frontend/android/app/build`, Metro can reuse a cached `index.android.bundle` generated from a previous build before component renames and branding updates.
* **Remediation**:
  1. Force-delete `frontend/android/app/build` and `frontend/android/build`.
  2. Execute `./gradlew clean` before running `./gradlew assembleRelease`.
  3. Re-generate `index.android.bundle` directly using React Native CLI to guarantee bundle freshness.
  4. Verify the generated APK contains the newly generated bundle with `"Vazhi"` component registration.
