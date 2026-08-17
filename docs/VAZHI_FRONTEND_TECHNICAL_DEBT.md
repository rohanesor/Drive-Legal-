# VAZHI — Frontend Technical Debt Audit

---

## 1. Technical Debt Inventory

| Category | Description | Impact | Priority | Status |
|----------|-------------|--------|----------|--------|
| **Legacy Branding & Comments** | Resolved: All Chaquopy, Convex, and legacy UI references removed from source files. | LOW | P3 | CLEARED |
| **Location Service Dual Imports** | Preserved backwards compatibility in `locationService.ts` for standalone export functions (`reverseGeocode`, `getCurrentPosition`). | LOW | P3 | MANAGED |
| **CarPlay Entitlement Signing** | `CarPlayDelegate.swift` bridge implemented; requires Apple Developer Enterprise Program Navigation Entitlement (`com.apple.developer.carplay-navigation`) for physical hardware release. | MEDIUM | P1 | PENDING SIGNING |
| **WebGL Fallback Handling** | 3D MapLibre vector tiles fall back to 2D Leaflet map view on low-tier mobile devices to preserve frame rates. | LOW | P2 | FUNCTIONAL |
