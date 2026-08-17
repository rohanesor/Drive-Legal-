# VAZHI — Component Audit & Design System Inventory

---

## 1. Component Audit Summary

### Reusable Production Components
- **`LocationMap.tsx`**: Core 3D MapLibre map component with camera pitch control and vector polyline rendering.
- **`VoiceInput.tsx`**: Audio recording trigger with speech state feedback.
- **`AlertBanner.tsx`**: Top alert banner for high-priority road hazard notifications.
- **`SpeedBreakerAlert.tsx`**: Driver-safe visual alert card for upcoming speed breakers.
- **`ZoneAlert.tsx`**: School zone, accident black spot, and restricted zone notifications.
- **`AskVazhiSheet.tsx`**: Floating AI co-pilot bottom sheet with explicit driver confirmation action buttons.

### Design System Inventory (`frontend/src/design-system/tokens.ts`)
- **Primary Color Palette**: `#0A0F1D` (Slate Dark Background), `#131C31` (Card Elevation), `#00FFC2` (Mint Accent), `#00E5FF` (Cyan 3D Projection).
- **Typography Scale**: Standardized across screens (`xs: 12`, `sm: 14`, `md: 16`, `lg: 18`, `xl: 22`, `xxl: 28`, `hero: 34`).
- **High-Contrast Driving UI**: All primary controls meet Web Content Accessibility Guidelines (WCAG 2.1 AAA) contrast ratios for vehicular glanceability.
