/**
 * Location Service - GPS detection and state boundary checking
 * 
 * RESPONSIBILITIES:
 * 1. Get user's current GPS coordinates
 * 2. Detect which Indian state the user is in (using boundary boxes)
 * 3. Watch for location changes (for background monitoring)
 * 4. Request location permissions from the user
 * 
 * STATE DETECTION:
 * Uses simple latitude/longitude boundary boxes for each state.
 * This is an approximation - for production, use GeoJSON polygon boundaries.
 */
import { Platform, PermissionsAndroid } from 'react-native';

// Use the community geolocation package (more reliable than built-in)
import Geolocation from '@react-native-community/geolocation';

export interface LocationData {
  lat: number;
  lng: number;
  state: string;      // State code (TN, KN, AP, etc.)
  accuracy: number;   // GPS accuracy in meters
}

/**
 * State boundary boxes (approximate lat/lng ranges)
 * Each state is defined as a rectangular region.
 * If coordinates fall within the rectangle, that state is detected.
 */
const STATE_BOUNDARIES: Record<string, { name: string; check: (lat: number, lng: number) => boolean }> = {
  TN: {
    name: 'Tamil Nadu',
    check: (lat: number, lng: number) =>
      lat >= 8.4 && lat <= 13.6 && lng >= 76.2 && lng <= 80.5,
  },
  KN: {
    name: 'Karnataka',
    check: (lat: number, lng: number) =>
      lat >= 11.5 && lat <= 18.2 && lng >= 74.0 && lng <= 78.6,
  },
  AP: {
    name: 'Andhra Pradesh',
    check: (lat: number, lng: number) =>
      lat >= 13.5 && lat <= 19.1 && lng >= 77.0 && lng <= 84.8,
  },
  KL: {
    name: 'Kerala',
    check: (lat: number, lng: number) =>
      lat >= 8.5 && lat <= 12.8 && lng >= 74.9 && lng <= 77.4,
  },
  MH: {
    name: 'Maharashtra',
    check: (lat: number, lng: number) =>
      lat >= 15.6 && lat <= 21.2 && lng >= 72.5 && lng <= 80.9,
  },
  DL: {
    name: 'Delhi',
    check: (lat: number, lng: number) =>
      lat >= 28.4 && lat <= 28.9 && lng >= 76.8 && lng <= 77.4,
  },
};

/**
 * Detect which state the user is in based on GPS coordinates
 * Returns the state code (e.g., "TN") or "UNKNOWN" if not in any defined boundary
 */
export const detectState = (lat: number, lng: number): string => {
  for (const [code, boundary] of Object.entries(STATE_BOUNDARIES)) {
    if (boundary.check(lat, lng)) {
      return code;
    }
  }
  return 'UNKNOWN';
};

/**
 * Get the full state name from a state code
 */
export const getStateName = (stateCode: string): string => {
  return STATE_BOUNDARIES[stateCode]?.name || 'Unknown State';
};

/**
 * Request location permission from the user (Android)
 * Shows a system dialog asking for GPS access
 */
const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'DriveLegal Location Permission',
        message: 'DriveLegal needs access to your location to provide accurate traffic law information.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return false;
};

/**
 * Get the user's current GPS location and detect their state
 * Returns null if permission is denied or GPS is unavailable
 */
export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    // Get GPS position
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          // Detect which state these coordinates are in
          const state = detectState(latitude, longitude);
          resolve({
            lat: latitude,
            lng: longitude,
            state,
            accuracy: accuracy ?? 0,
          });
        },
        (error) => {
          console.error('Location error:', error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
      );
    });
  } catch (error) {
    console.error('getCurrentLocation error:', error);
    return null;
  }
};

/**
 * Watch for continuous location changes
 * Used by the background monitoring feature
 * Calls the callback whenever location changes by > 100 meters
 */
export const watchLocation = (
  callback: (location: LocationData) => void,
  onError?: (error: any) => void
): number => {
  const watchId = Geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const state = detectState(latitude, longitude);
      callback({
        lat: latitude,
        lng: longitude,
        state,
        accuracy: accuracy ?? 0,
      });
    },
    (error) => {
      if (onError) onError(error);
    },
    { enableHighAccuracy: true, distanceFilter: 100, interval: 30000 }
  );
  return watchId;
};

/**
 * Stop watching for location changes
 * Call this to save battery when monitoring is no longer needed
 */
export const clearLocationWatch = (watchId: number): void => {
  Geolocation.clearWatch(watchId);
};
