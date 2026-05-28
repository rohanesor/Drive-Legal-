import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---
export interface GPSCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  timestamp: number;
  speed?: number | null;
  heading?: number | null;
}

export interface GeoInfo {
  city: string;
  district: string;
  state: string;
  stateCode: string;
  country: string;
  postalCode: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'expo' | 'nominatim' | 'cache' | 'fallback';
}

export interface CachedLocation {
  coords: GPSCoords;
  geo: GeoInfo;
  timestamp: number;
}

// --- Constants ---
const CACHE_KEY = '@drivelegal_last_location';
const STATE_MAP: Record<string, string> = {
  'Tamil Nadu': 'TN',
  'Karnataka': 'KN',
  'Andhra Pradesh': 'AP',
  'Kerala': 'KL',
  'Maharashtra': 'MH',
  'Delhi': 'DL',
  'Gujarat': 'GJ',
  'Rajasthan': 'RJ',
  'Uttar Pradesh': 'UP',
  'West Bengal': 'WB',
  'Telangana': 'TS',
  'Bihar': 'BR',
  'Haryana': 'HR',
  'Punjab': 'PB',
  'Odisha': 'OR',
  'Madhya Pradesh': 'MP',
};

// --- Internal Helpers ---
const mapStateToCode = (stateName: string): string => {
  const normalized = stateName.trim();
  if (STATE_MAP[normalized]) return STATE_MAP[normalized];
  for (const [name, code] of Object.entries(STATE_MAP)) {
    if (normalized.toLowerCase().includes(name.toLowerCase())) return code;
  }
  return 'UNKNOWN';
};

const reverseGeocodeNominatim = async (lat: number, lng: number): Promise<GeoInfo> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DriveLegal/1.2' },
    });
    const data = await response.json();
    const addr = data.address || {};
    const stateName = addr.state || '';
    const stateCode = mapStateToCode(stateName);

    // In India: state_district is the District (e.g. Coimbatore), county is the Taluk (e.g. Anaimalai)
    const district = addr.state_district || addr.county || '';
    const city = (addr.state_district && addr.county)
      ? addr.county
      : (addr.city || addr.town || addr.village || addr.suburb || '');

    return {
      city: city,
      district: district,
      state: stateName,
      stateCode: stateCode,
      country: addr.country || 'India',
      postalCode: addr.postcode || '',
      confidence: (city || district) ? 'high' : 'medium',
      source: 'nominatim',
    };
  } catch (error) {
    console.error('Nominatim Geocoding failed:', error);
    throw error;
  }
};

// --- Exported Functions (Simpler approach for Metro) ---

export const requestLocationPermissions = async (): Promise<boolean> => {
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
    } catch (e) {
      console.warn('Permission request failed', e);
      return false;
    }
  }
  return true;
};

export const getCurrentPosition = async (retries = 2): Promise<GPSCoords> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          timestamp: position.timestamp,
        });
      },
      async (error) => {
        if (retries > 0) {
          try {
            const nextCoords = await getCurrentPosition(retries - 1);
            resolve(nextCoords);
          } catch (retryErr) {
            reject(retryErr);
          }
        } else {
          reject(error);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
};

export const reverseGeocode = async (lat: number, lng: number): Promise<GeoInfo> => {
  return await reverseGeocodeNominatim(lat, lng);
};

export const saveLastLocation = async (coords: GPSCoords, geo: GeoInfo) => {
  try {
    const data: CachedLocation = { coords, geo, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save location to cache', e);
  }
};

export const getLastLocation = async (): Promise<CachedLocation | null> => {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Failed to load location from cache', e);
    return null;
  }
};

export const getJurisdictionLabel = (info: GeoInfo): string => {
  const parts = [];
  if (info.city) parts.push(info.city);
  if (info.district && info.district !== info.city) parts.push(info.district);
  if (info.stateCode && info.stateCode !== 'UNKNOWN') parts.push(info.stateCode);

  if (parts.length > 0) return parts.join(', ');
  return 'India (General)';
};

// Legacy compatibility
export const getStateName = (code: string) => code;
export const getCurrentLocation = async (defaultState?: string) => {
  try {
    const coords = await getCurrentPosition();
    const geo = await reverseGeocode(coords.latitude, coords.longitude);
    return {
      lat: coords.latitude,
      lng: coords.longitude,
      state: geo.stateCode || defaultState || 'TN',
      city: geo.city,
      district: geo.district,
      accuracy: coords.accuracy || 0
    };
  } catch (e) {
    return null;
  }
};
