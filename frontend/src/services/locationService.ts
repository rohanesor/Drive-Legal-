import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---
export interface GPSCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  timestamp: number;
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

    return {
      city: addr.city || addr.town || addr.village || addr.suburb || '',
      district: addr.state_district || addr.county || '',
      state: stateName,
      stateCode: stateCode,
      country: addr.country || 'India',
      postalCode: addr.postcode || '',
      confidence: addr.city ? 'high' : 'medium',
      source: 'nominatim',
    };
  } catch (error) {
    console.error('Nominatim Geocoding failed:', error);
    throw error;
  }
};

// --- Exported Functions (Simpler approach for Metro) ---

export const requestLocationPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('Permission request failed', e);
    return false;
  }
};

export const getCurrentPosition = async (retries = 2): Promise<GPSCoords> => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      timestamp: location.timestamp,
    };
  } catch (error) {
    if (retries > 0) {
      return getCurrentPosition(retries - 1);
    }
    throw error;
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<GeoInfo> => {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (results && results.length > 0) {
      const best = results[0];
      if (best.region) {
        const stateCode = mapStateToCode(best.region || '');
        return {
          city: best.city || best.district || '',
          district: best.district || '',
          state: best.region || '',
          stateCode: stateCode,
          country: best.country || 'India',
          postalCode: best.postalCode || '',
          confidence: best.city ? 'high' : 'medium',
          source: 'expo',
        };
      }
    }
    return await reverseGeocodeNominatim(lat, lng);
  } catch (error) {
    console.warn('Expo Geocoding failed, trying Nominatim fallback:', error);
    return await reverseGeocodeNominatim(lat, lng);
  }
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
  if (info.city && info.stateCode !== 'UNKNOWN') {
    return `${info.city}, ${info.stateCode}`;
  }
  if (info.stateCode !== 'UNKNOWN') {
    return info.stateCode;
  }
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
