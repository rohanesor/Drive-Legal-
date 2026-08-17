# VAZHI — Prioritized Frontend UI/UX Roadmap

---

## 1. Roadmap Milestones

### 🔴 Phase P0 (Core Foundation — COMPLETED)
- [x] Navigation-first entry experience with MapLibre 3D Vector Map (`NavigationScreen.tsx`).
- [x] Shared `NavigationSession.ts` source of truth across Mobile, Android Auto, and CarPlay.
- [x] Native Android Auto integration using `androidx.car.app` (`VazhiCarAppService` & `VazhiCarScreen`).
- [x] Unified dark-mode cockpit design system tokens (`VAZHI_TOKENS`).
- [x] Address, POI, coordinate, and natural language destination search.
- [x] Route preview with trade-off metrics and grounded backend AI explanations ("Why Vazhi recommends this route").

### 🟡 Phase P1 (Core Differentiators — COMPLETED)
- [x] 3D Navigation with speed-adaptive camera horizon pitch lock (up to 68° above 70 km/h).
- [x] Glowing cyan 3D projection beams on bends >45° and semi-transparent red threat domes around accident black spots.
- [x] Proactive 8-language voice TTS alerts for speed breakers, sharp curves, and state border crossings.
- [x] Contextual floating `AskVazhiSheet` with driver action confirmation cards (`ADD STOP`, `VIEW`, `CANCEL`).
- [x] Time-aware trip planner timeline (Rest stops, Lunch, Charging, Hotels based on arrival times).
- [x] Native Apple CarPlay bridge delegate (`CarPlayDelegate.swift`).

### 🟢 Phase P2 (Enhancements — READY)
- [ ] On-device 3D vehicle avatar customization (SUV, Sedan, EV models).
- [ ] Expanded multilingual voice prompt customization.

### 🔵 Phase P3 (Future Extensions — FUTURE)
- [ ] Apple Developer Enterprise CarPlay entitlement signing for hardware store release.
