import { Platform } from 'react-native';
import * as Location from 'expo-location';
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
    console.log(`[Location Audit] Initiating reverse geocode fetch URL: ${url}`);
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DriveLegal/1.2' },
    });
    const data = await response.json();
    const addr = data.address || {};
    const stateName = addr.state || '';
    const stateCode = mapStateToCode(stateName);

    const district = addr.state_district || addr.county || '';
    const city = (addr.state_district && addr.county)
      ? addr.county
      : (addr.city || addr.town || addr.village || addr.suburb || '');

    const result: GeoInfo = {
      city: city,
      district: district,
      state: stateName,
      stateCode: stateCode,
      country: addr.country || 'India',
      postalCode: addr.postcode || '',
      confidence: (city || district) ? 'high' : 'medium',
      source: 'nominatim',
    };
    
    console.log('[Location Audit] reverse geocode result:', result);
    return result;
  } catch (error) {
    console.error('[Location Audit] reverse geocode query failed:', error);
    throw error;
  }
};

// --- Exported Functions ---

export const requestLocationPermissions = async (): Promise<boolean> => {
  console.log('[Location Audit] Verifying permissions natively');
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log('[Location Audit] permission status:', status);
    return status === 'granted';
  } catch (e) {
    console.warn('[Location Audit] requestForegroundPermissionsAsync failed', e);
    return false;
  }
};

export const hasServicesEnabled = async (): Promise<boolean> => {
  console.log('[Location Audit] Verifying active hardware GPS sensors natively');
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    console.log('[Location Audit] GPS enabled status:', enabled);
    return enabled;
  } catch (e) {
    console.warn('[Location Audit] hasServicesEnabledAsync failed', e);
    return false;
  }
};

export const getCurrentPosition = async (timeoutMs = 10000): Promise<GPSCoords> => {
  console.log('[Location Audit] Initiating location coordinate fetch via expo-location');
  
  return new Promise<GPSCoords>(async (resolve, reject) => {
    let completed = false;
    
    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        console.warn(`[Location Audit] GPS timed out after ${timeoutMs / 1000}s`);
        reject(new Error('Location Timeout'));
      }
    }, timeoutMs);

    try {
      // Fetch with balanced accuracy to avoid heavy battery load and speed up lock
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      if (!completed) {
        completed = true;
        clearTimeout(timer);
        console.log('[Location Audit] coordinate fetch result:', position.coords);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          timestamp: position.timestamp,
          speed: position.coords.speed,
          heading: position.coords.heading,
        });
      }
    } catch (e: any) {
      if (!completed) {
        completed = true;
        clearTimeout(timer);
        console.error('[Location Audit] coordinate fetch failed:', e);
        reject(e);
      }
    }
  });
};

export const reverseGeocode = async (lat: number, lng: number): Promise<GeoInfo> => {
  return await reverseGeocodeNominatim(lat, lng);
};

export const saveLastLocation = async (coords: GPSCoords, geo: GeoInfo) => {
  try {
    const data: CachedLocation = { coords, geo, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    console.log('[Location Audit] Cached current coordinates and geocode details');
  } catch (e) {
    console.warn('[Location Audit] Failed to save location cache', e);
  }
};

export const getLastLocation = async (): Promise<CachedLocation | null> => {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('[Location Audit] Failed to read location cache', e);
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
