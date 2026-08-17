# Vazhi App Icon & Branding System

This directory contains the master single source of truth branding assets for **Vazhi**.

---

## Master Branding Assets

- **`vazhi-icon.svg`**: Master 512x512 vector icon representing direction, road geometry, and intelligent navigation.

---

## Icon Generation Workflow

All platform icons (Android launcher, iOS AppIcon, Web Favicon, PWA icons) are generated from `vazhi-icon.svg`.

### Re-generating Platform Icons
To regenerate icons across all platforms:
```bash
node scripts/generate-icons.js
```

### Output Directories
- **Android Launcher Icons**: `frontend/android/app/src/main/res/mipmap-*` (`ic_launcher.png`, `ic_launcher_round.png`)
- **iOS AppIcon Assets**: `frontend/ios/Vazhi/Images.xcassets/AppIcon.appiconset`
- **Web Download Center Assets**: `backend/src/static/favicon.ico`, `backend/src/static/vazhi-icon-512.png`, `backend/src/static/og-image.png`
