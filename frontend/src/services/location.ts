import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface LocationData {
  lat: number;
  lng: number;
  state: string;
  city: string;
  district: string;
  accuracy: number;
}

interface StateBoundary {
  name: string;
  check: (lat: number, lng: number) => boolean;
}

const STATE_BOUNDARIES: Record<string, StateBoundary> = {
  TN: { name: 'Tamil Nadu', check: (lat, lng) => lat >= 8.4 && lat <= 13.6 && lng >= 76.2 && lng <= 80.5 },
  KN: { name: 'Karnataka', check: (lat, lng) => lat >= 11.5 && lat <= 18.2 && lng >= 74.0 && lng <= 78.6 },
  AP: { name: 'Andhra Pradesh', check: (lat, lng) => lat >= 13.5 && lat <= 19.1 && lng >= 77.0 && lng <= 84.8 },
  KL: { name: 'Kerala', check: (lat, lng) => lat >= 8.5 && lat <= 12.8 && lng >= 74.9 && lng <= 77.4 },
  MH: { name: 'Maharashtra', check: (lat, lng) => lat >= 15.6 && lat <= 21.2 && lng >= 72.5 && lng <= 80.9 },
  DL: { name: 'Delhi', check: (lat, lng) => lat >= 28.4 && lat <= 28.9 && lng >= 76.8 && lng <= 77.4 },
  GJ: { name: 'Gujarat', check: (lat, lng) => lat >= 20.1 && lat <= 24.7 && lng >= 68.1 && lng <= 74.5 },
  RJ: { name: 'Rajasthan', check: (lat, lng) => lat >= 23.3 && lat <= 30.2 && lng >= 69.5 && lng <= 78.3 },
  UP: { name: 'Uttar Pradesh', check: (lat, lng) => lat >= 23.9 && lat <= 30.5 && lng >= 77.0 && lng <= 84.6 },
  WB: { name: 'West Bengal', check: (lat, lng) => lat >= 21.5 && lat <= 27.2 && lng >= 85.8 && lng <= 89.6 },
  TS: { name: 'Telangana', check: (lat, lng) => lat >= 15.8 && lat <= 19.9 && lng >= 77.1 && lng <= 81.4 },
  BR: { name: 'Bihar', check: (lat, lng) => lat >= 24.4 && lat <= 27.5 && lng >= 83.3 && lng <= 88.2 },
  HR: { name: 'Haryana', check: (lat, lng) => lat >= 27.6 && lat <= 30.9 && lng >= 74.4 && lng <= 77.7 },
  PB: { name: 'Punjab', check: (lat, lng) => lat >= 29.5 && lat <= 32.5 && lng >= 73.8 && lng <= 76.9 },
  OR: { name: 'Odisha', check: (lat, lng) => lat >= 17.8 && lat <= 22.5 && lng >= 81.4 && lng <= 87.5 },
  MP: { name: 'Madhya Pradesh', check: (lat, lng) => lat >= 21.2 && lat <= 26.9 && lng >= 74.0 && lng <= 82.8 },
};

export const detectState = (lat: number, lng: number): string => {
  for (const [code, boundary] of Object.entries(STATE_BOUNDARIES)) {
    if (boundary.check(lat, lng)) return code;
  }
  return 'UNKNOWN';
};

export const getStateName = (stateCode: string): string => {
  return STATE_BOUNDARIES[stateCode]?.name || 'Unknown State';
};

/**
 * Reverse geocode lat/lng to city, district, state using Nominatim OSM API.
 * Free, no API key required. Rate-limited to 1 req/sec.
 */
export const reverseGeocode = async (
  lat: number,
  lng: number,
): Promise<{ city: string; district: string; stateName: string; stateCode: string }> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DriveLegalApp/1.0' },
    });
    if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
    const data = await response.json();
    const addr = data.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.suburb ||
      addr.hamlet ||
      '';
    const district =
      addr.county ||
      addr.state_district ||
      addr.district ||
      '';
    const stateName = addr.state || '';

    // Try to map the returned state name to our state code
    let stateCode = 'UNKNOWN';
    for (const [code, boundary] of Object.entries(STATE_BOUNDARIES)) {
      if (boundary.name.toLowerCase() === stateName.toLowerCase()) {
        stateCode = code;
        break;
      }
    }
    // Fallback to bounding box detection
    if (stateCode === 'UNKNOWN') {
      stateCode = detectState(lat, lng);
    }

    return { city, district, stateName, stateCode };
  } catch (error) {
    console.warn('Reverse geocode failed, falling back to bounding box:', error);
    const stateCode = detectState(lat, lng);
    return {
      city: '',
      district: '',
      stateName: getStateName(stateCode),
      stateCode,
    };
  }
};

const STATE_CAPITALS: Record<string, { lat: number; lng: number }> = {
  TN: { lat: 13.0827, lng: 80.2707 },
  KN: { lat: 12.9716, lng: 77.5946 },
  AP: { lat: 16.5062, lng: 80.6480 },
  KL: { lat: 8.5241, lng: 76.9366 },
  MH: { lat: 19.0760, lng: 72.8777 },
  DL: { lat: 28.7041, lng: 77.1025 },
  GJ: { lat: 23.0225, lng: 72.5714 },
  RJ: { lat: 26.9124, lng: 75.7873 },
  UP: { lat: 26.8467, lng: 80.9462 },
  WB: { lat: 22.5726, lng: 88.3639 },
  TS: { lat: 17.3850, lng: 78.4867 },
  BR: { lat: 25.5941, lng: 85.1376 },
  HR: { lat: 30.7333, lng: 76.7794 },
  PB: { lat: 30.7333, lng: 76.7794 },
  OR: { lat: 20.2961, lng: 85.8245 },
  MP: { lat: 23.2599, lng: 77.4126 },
};

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
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
    } catch {
      return false;
    }
  }
  return false;
};

export const getCurrentLocation = async (defaultState?: string): Promise<LocationData | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      const state = defaultState || 'TN';
      const capital = STATE_CAPITALS[state] || STATE_CAPITALS.TN;
      return { ...capital, state, city: '', district: '', accuracy: 0 };
    }

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          // Reverse geocode for precise city/district
          const geo = await reverseGeocode(latitude, longitude);
          resolve({
            lat: latitude,
            lng: longitude,
            state: geo.stateCode,
            city: geo.city,
            district: geo.district,
            accuracy: accuracy ?? 0,
          });
        },
        () => {
          const state = defaultState || 'TN';
          const capital = STATE_CAPITALS[state] || STATE_CAPITALS.TN;
          resolve({ ...capital, state, city: '', district: '', accuracy: 0 });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  } catch {
    const state = defaultState || 'TN';
    const capital = STATE_CAPITALS[state] || STATE_CAPITALS.TN;
    return { ...capital, state, city: '', district: '', accuracy: 0 };
  }
};

export const watchLocation = (
  callback: (location: LocationData) => void,
  onError?: (error: any) => void
): number => {
  const watchId = Geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const geo = await reverseGeocode(latitude, longitude);
      callback({
        lat: latitude,
        lng: longitude,
        state: geo.stateCode,
        city: geo.city,
        district: geo.district,
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

export const clearLocationWatch = (watchId: number): void => {
  Geolocation.clearWatch(watchId);
};
