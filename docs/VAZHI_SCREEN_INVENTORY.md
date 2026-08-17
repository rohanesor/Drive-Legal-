# VAZHI — Screen-by-Screen Inventory & Status

---

## Screen Inventory Table

| Screen Name | File Path | Current Purpose | Entry Point | Active? | User Accessible? | Status | Vazhi Action |
|-------------|-----------|-----------------|-------------|---------|------------------|--------|--------------|
| **SplashScreen** | `frontend/src/screens/SplashScreen.tsx` | Startup splash animation & health check | `App.tsx` Stack | Yes | Yes | ACTIVE | **KEEP** |
| **NavigationScreen** | `frontend/src/screens/NavigationScreen.tsx` | MapLibre 3D Vector Map & Main Navigation | `MobileNavigator.tsx` (Initial) | Yes | Yes | ACTIVE | **KEEP** |
| **ChatScreen** | `frontend/src/screens/ChatScreen.tsx` | Vazhi AI Conversational Assistant | `MobileNavigator.tsx` | Yes | Yes | ACTIVE | **KEEP** |
| **ChallanCalculatorScreen** | `frontend/src/screens/ChallanCalculatorScreen.tsx` | Traffic Fine & MV Act Law Search | `MobileNavigator.tsx` | Yes | Yes | ACTIVE | **KEEP** |
| **EmergencyScreen** | `frontend/src/screens/EmergencyScreen.tsx` | SOS Hospital, Police & Mechanic Lookup | `MobileNavigator.tsx` | Yes | Yes | ACTIVE | **KEEP** |
| **SettingsScreen** | `frontend/src/screens/SettingsScreen.tsx` | Language, Units, & Voice Preferences | `MobileNavigator.tsx` | Yes | Yes | ACTIVE | **KEEP** |
| **LocationScreen** | `frontend/src/screens/LocationScreen.tsx` | Manual Jurisdiction Selection | `MobileNavigator.tsx` | Yes | Yes | ACTIVE | **KEEP** |
| **VoiceAssistantScreen** | `frontend/src/screens/VoiceAssistantScreen.tsx` | Dedicated Driver Hands-free Voice HUD | `MobileNavigator.tsx` | Yes | Yes | ACTIVE | **KEEP** |
| **TripPlannerScreen** | `frontend/src/screens/TripPlannerScreen.tsx` | Time-Aware Multi-stop Itinerary Planner | `MobileNavigator.tsx` | Yes | Yes | ACTIVE | **KEEP** |
| **CarDashboardScreen** | `frontend/src/screens/car/CarDashboardScreen.tsx` | Vehicle Mode High-Contrast Cockpit HUD | `CarNavigator.tsx` | Yes | Yes | ACTIVE | **KEEP** |
| **CarVoiceScreen** | `frontend/src/screens/car/CarVoiceScreen.tsx` | Vehicle Mode Voice HUD Overlay | `CarNavigator.tsx` | Yes | Yes | ACTIVE | **KEEP** |
| **CarAlertScreen** | `frontend/src/screens/car/CarAlertScreen.tsx` | Vehicle Mode Priority Alert Card | `CarNavigator.tsx` | Yes | Yes | ACTIVE | **KEEP** |
| **CarEmergencyScreen** | `frontend/src/screens/car/CarEmergencyScreen.tsx` | Vehicle Mode SOS Action Interface | `CarNavigator.tsx` | Yes | Yes | ACTIVE | **KEEP** |
