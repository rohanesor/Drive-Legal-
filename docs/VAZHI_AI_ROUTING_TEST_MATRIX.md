# VAZHI — AI Routing Test Matrix

This matrix defines the test suite validating the AI Routing Intelligence layer, conversational co-pilot, and deterministic fallback behavior.

---

## 1. Test Scenarios Matrix

| Target Feature | Test Case Name | Input Prompt | Expected Facts / Context | Expected AI Intent / Action |
| :--- | :--- | :--- | :--- | :--- |
| **Route Explanation** | `test_explain_route_bypass` | *"Why did we take this route?"* | Active route has accident blackspot bypass, adds 3km, saves 10 mins. | `EXPLAIN_ROUTE` / Grounded explanation detailing saved duration and safety risk avoidance. |
| **Route Comparison** | `test_compare_routes_safety` | *"Which route is safer?"* | Route A: 2 sharp curves, Route B: 0 sharp curves, +5 mins. | `COMPARE_ROUTES` / Recommends Route B due to safety score and curve avoidance. |
| **Semantic Restaurant** | `test_poi_restaurant_lunch` | *"Find me a vegetarian restaurant on the way."* | Current ETA at transit area is 13:00, lunch preference = True. | `FIND_RESTAURANT` / Returns active on-route stops matching opening hours. |
| **Time-Aware Hotel** | `test_poi_hotel_hours` | *"Find a hotel after 6 hours."* | Route duration 8 hours, expected check-in time 21:00. | `FIND_HOTEL` / Recommends hotels along route where ETA falls in open check-in hours. |
| **EV Vehicle-Aware** | `test_vehicle_ev_charge` | *"Find a charger before battery reaches 30%."* | Current SOC = 45%, EV range = 180km. | `FIND_CHARGER` / Identifies charging stations along route before 30% threshold. |
| **Legal Context** | `test_legal_helmet_fine` | *"What is the helmet fine here?"* | Location: Karnataka (KA), Vehicle: Car. | `LEGAL_QUERY` / Returns KA helmet fine or highlights that vehicle context (Car) makes it inapplicable. |
| **Safety Warning** | `test_proactive_sharp_curve` | *[None - Event triggered]* | SafetyEngine detects SHARP_CURVE in 180m, severity HIGH. | `TEMPLATE_WARNING` / Instant voice alert: *"Sharp curve ahead in 180 meters. Slow down."* |
| **Offline Fallback** | `test_offline_fallback` | *"Why did we take this route?"* | Network state: Offline / AI service down. | Returns: *"AI assistant temporarily unavailable. Navigation and safety guidance are active."* |

---

## 2. Assertion Checks
- **No Hallucination**: AI response must contain the specific numerical values of detours/durations provided by the engine.
- **Safety Interruption**: Verification that urgent hazard announcements flush the TTS queue immediately.
