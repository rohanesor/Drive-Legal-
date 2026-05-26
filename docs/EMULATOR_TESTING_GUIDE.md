# Location Testing Guide for DriveLegal

This guide explains how to test the production-grade location intelligence system in the DriveLegal app using an Android Emulator.

## 1. Testing GPS Coordination

The DriveLegal app uses `expo-location` with high accuracy. You can manually inject coordinates into the emulator to test different jurisdictions.

### How to set location in Emulator:
1. Open the **Emulator Extended Controls** (the three dots `...` on the side menu).
2. Go to the **Location** tab.
3. Enter the Latitude and Longitude.
4. Click **Set Location**.

### Example Coordinates for Testing:
- **Chennai (Tamil Nadu):** `13.0827, 80.2707`
- **Bangalore (Karnataka):** `12.9716, 77.5946`
- **Mumbai (Maharashtra):** `19.0760, 72.8777`
- **Delhi:** `28.7041, 77.1025`

## 2. Verifying Reverse Geocoding

When you set a new location in the emulator:
1. Go to the **Jurisdiction** screen in the app.
2. Click **Detect My Location**.
3. Verify that the "Active Jurisdiction" card updates with the correct City and State code (e.g., "Chennai, TN").

## 3. Testing Offline Fallback

To test how the app behaves without GPS:
1. Disable Location in the Android System settings within the emulator.
2. Re-open the app.
3. The app should display a **warning** indicator on the location badge.
4. It will fall back to the **last known cached location** (stored in `AsyncStorage`).
5. If no cache exists, it will allow you to select a state manually from the list.

## 4. Confidence Badge Meanings

- **Cyan Dot/Badge:** High Confidence. GPS is active and reverse geocoding was successful via Native/Nominatim.
- **Amber Dot/Badge:** Mocked/Manual Location. The user has manually selected a state or GPS is unavailable.

## 5. Troubleshooting

- **"Mountain View" showing up:** This happens if the emulator default location (Google HQ) is active. Set a custom location using the steps in Section 1.
- **Permission Denied:** If you deny permissions, the app will show a friendly prompt explaining why location is needed for legal accuracy. You can reset permissions in `Settings > Apps > DriveLegal > Permissions`.
