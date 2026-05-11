import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

export interface LocationData {
  lat: number;
  lng: number;
  state: string;
  accuracy: number;
}

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

export const detectState = (lat: number, lng: number): string => {
  for (const [code, boundary] of Object.entries(STATE_BOUNDARIES)) {
    if (boundary.check(lat, lng)) {
      return code;
    }
  }
  return 'UNKNOWN';
};

export const getStateName = (stateCode: string): string => {
  return STATE_BOUNDARIES[stateCode]?.name || 'Unknown State';
};

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

export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const state = detectState(latitude, longitude);
          resolve({
            lat: latitude,
            lng: longitude,
            state,
            accuracy: accuracy || 0,
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
        accuracy: accuracy || 0,
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
