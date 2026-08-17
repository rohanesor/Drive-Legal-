# VAZHI — Frontend & Platform Test Matrix

Comprehensive test matrix verifying Mobile UI (Android & iOS), Android Auto, and Apple CarPlay presentation layers.

---

## 1. Platform Matrix

| Category | Test Case | Android | iOS | Android Auto | Apple CarPlay |
|----------|-----------|---------|-----|--------------|---------------|
| **Core** | App Launch & Initialization | ✅ Pass | ✅ Pass | ✅ Pass | ⚠️ Entitlement Req. |
| **Core** | NavigationSession Shared State | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass |
| **Navigation** | Destination Search & Geocoding | ✅ Pass | ✅ Pass | ✅ Pass (ListTemplate) | ⚠️ Entitlement Req. |
| **Navigation** | Route Preview & Alternatives | ✅ Pass | ✅ Pass | ✅ Pass | ⚠️ Entitlement Req. |
| **Navigation** | Active 2D/3D Navigation Mode | ✅ Pass | ✅ Pass | ✅ Native Car Map | ⚠️ Entitlement Req. |
| **Navigation** | Speed Horizon Flight Lock (>70km/h) | ✅ Pass | ✅ Pass | N/A | N/A |
| **Safety** | Zero-Latency Proactive Alerts | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass |
| **Safety** | State Border Crossed Event | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass |
| **AI Co-Pilot** | Natural Language Route Reasoning | ✅ Pass | ✅ Pass | ✅ Driver Summarized | ⚠️ Entitlement Req. |
| **Trip** | Time-Aware Itinerary Planning | ✅ Pass | ✅ Pass | N/A | N/A |
| **Emergency** | SOS Hospital & Police Lookup | ✅ Pass | ✅ Pass | ✅ One-tap Action | ⚠️ Entitlement Req. |
| **Legal** | Jurisdiction Traffic Fine Lookup | ✅ Pass | ✅ Pass | N/A | N/A |
| **Offline** | BRouter On-Device Fallback Routing | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass |

---

## 2. Platform Specific Notes

### 🤖 Android Auto (`androidx.car.app`)
- **Integration**: Native `VazhiCarAppService` and `VazhiCarScreen` declared in `AndroidManifest.xml` with `androidx.car.app.category.NAVIGATION`.
- **Driver Safety**: Renders `ListTemplate` and `NavigationTemplate` to minimize driver distraction.

### 🍎 Apple CarPlay
- **Integration**: Native `CarPlayDelegate.swift` bridge implemented utilizing `CPTemplateApplicationSceneDelegate` and `CPMapTemplate`.
- **Platform Blocker Note**: Deploying CarPlay to production hardware requires Apple Developer Enterprise Program **CarPlay Navigation App Entitlement** (`com.apple.developer.carplay-navigation`). Architecture is fully implemented and ready for entitlement signing.
