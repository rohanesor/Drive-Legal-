# VAZHI — Requirements vs Existing State Matrix

---

## Requirements vs Implementation Status

| Feature Requirement | Current Implementation State | Empirical Evidence | Status | Priority | Recommended Action |
|---------------------|------------------------------|--------------------|--------|----------|--------------------|
| **Navigation-First Map** | MapLibre 3D Vector Map set as primary route | `NavigationScreen.tsx` (initial route) | COMPLETE | P0 | Maintain as core entry experience |
| **Shared Navigation Session** | Single state manager for Mobile & Head Units | `NavigationSession.ts` | COMPLETE | P0 | Consume across all presentation layers |
| **Search Experience** | Address, POI, Coordinate & Natural Language | `searchService.ts` & `/navigation/geocode` | COMPLETE | P0 | Preserve normal search first |
| **Route Preview & AI Rationale** | Trade-off comparison matrix & LLM explanation | `RoutePreviewScreen.tsx` & `/navigation/explain` | COMPLETE | P0 | Keep backend-grounded rationale |
| **Active Navigation HUD** | Maneuver card, ETA, speed limit, hazard layer | `ActiveNavigationScreen.tsx` | COMPLETE | P0 | Ensure glanceability & high contrast |
| **3D Perspective Camera** | GPU pitch up to 68° above 70 km/h | `LocationMap.tsx` camera flight lock | COMPLETE | P1 | Auto-fallback to 2D on low-tier devices |
| **Proactive Safety Alerts** | 8-language template TTS for critical road events | `VoicePriorityEngine.ts` | COMPLETE | P1 | Zero-latency execution without LLM dependency |
| **State Border Event** | Real-time `STATE_BORDER_CROSSED` voice & UI | `GeoContextEngine.py` & `locationService.ts` | COMPLETE | P1 | Throttle GPS jitter duplicate triggers |
| **Contextual AI Copilot** | Floating sheet with explicit action cards | `AskVazhiSheet.tsx` | COMPLETE | P1 | Enforce driver tap confirmation for route changes |
| **Time-Aware Trip Planner** | Multi-stop itinerary timeline based on ETA | `TripPlannerScreen.tsx` | COMPLETE | P1 | Maintain manual editing controls |
| **Emergency SOS** | One-tap hospital/police/fire discovery & call/nav | `EmergencyScreen.tsx` & `emergencyService.ts` | COMPLETE | P1 | Keep driver-safe explicit activation |
| **Legal / Challan Calculator**| 1,400 RTO district codes & MV Act fine search | `ChallanCalculatorScreen.tsx` & SQLite | COMPLETE | P2 | Retain offline legal cache |
| **Android Auto Integration** | Native `androidx.car.app` Navigation Service | `VazhiCarAppService.java` & `VazhiCarScreen.java` | COMPLETE | P0 | Verified clean release APK build |
| **Apple CarPlay Integration**| Native `CarPlayDelegate.swift` map bridge | `CarPlayDelegate.swift` | PARTIAL | P1 | Ready for Apple Developer entitlement signing |
| **Offline Fallback** | On-device BRouter client & local HMM map match | `brouterOfflineService.ts` | COMPLETE | P1 | Graceful UI degradation when offline |
