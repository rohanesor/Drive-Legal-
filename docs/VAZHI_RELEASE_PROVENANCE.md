# VAZHI RELEASE PROVENANCE

This document records the exact build metadata, commit SHA, artifact hash, and download URL for the production release of **Vazhi**.

---

## Release Provenance Metadata

* **Product**: Vazhi — Intelligent Driving Co-Pilot
* **Version Name**: `1.0.0`
* **Version Code**: `101`
* **Package Name**: `com.vazhi`
* **Main Activity**: `com.vazhi.MainActivity` (registers `"Vazhi"`)
* **Build Variant**: `Release` (signed, Hermes enabled, R8 minified)
* **Git Repository**: `https://github.com/rohanesor/vazhi.git`
* **Git Branch**: `master`
* **Release Artifact**: `backend/src/static/files/vazhi-v1.0.0.apk`
* **Public Download Page**: [`http://vazhi.duckdns.org/download`](http://vazhi.duckdns.org/download)
* **Direct APK Download URL**: [`http://vazhi.duckdns.org/download/files/vazhi-v1.0.0.apk`](http://vazhi.duckdns.org/download/files/vazhi-v1.0.0.apk)

---

## Build Verification Checklist

- [x] React Native `index.js` registers root component `"Vazhi"`
- [x] `MainActivity.java` returns `"Vazhi"` in `getMainComponentName()`
- [x] Android `strings.xml` defines `<string name="app_name">Vazhi</string>`
- [x] Launcher icons across all 5 `mipmap-*` densities contain cyan Vazhi avatar
- [x] Pre-build clean step executed (`./gradlew clean` + cache purge)
- [x] 32 backend unit tests passing
- [x] TypeScript compilation (`npx tsc --noEmit`) 100% clean
- [x] Release APK generated cleanly via `./gradlew assembleRelease`
- [x] SHA256 checksum calculated and recorded in `latest.json`
- [x] Download portal verified live on EC2
