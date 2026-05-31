import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as LocationService from '../services/locationService';
import { GPSCoords, GeoInfo } from '../services/locationService';

export type LocationStatus =
  | 'Requesting Permission'
  | 'Acquiring GPS'
  | 'GPS Acquired'
  | 'Determining Jurisdiction'
  | 'Ready'
  | 'Permission Denied'
  | 'GPS Disabled'
  | 'Location Timeout'
  | 'Reverse Geocode Failed';

interface LocationContextType {
  location: GPSCoords | null;
  geoInfo: GeoInfo | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  refreshLocation: (showPrompt?: boolean) => Promise<void>;
  setManualLocation: (stateCode: string) => void;
  isMocked: boolean;
  status: LocationStatus;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<GPSCoords | null>(null);
  const [geoInfo, setGeoInfo] = useState<GeoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isMocked, setIsMocked] = useState(false);
  const [status, setStatus] = useState<LocationStatus>('Ready');

  const updateLocationState = useCallback(async (coords: GPSCoords) => {
    try {
      setStatus('Determining Jurisdiction');
      console.log('[Location Context] reverse geocode starting for coords:', coords);
      const geo = await LocationService.reverseGeocode(coords.latitude, coords.longitude);
      setGeoInfo(geo);
      setLocation(coords);
      await LocationService.saveLastLocation(coords, geo);
      setStatus('Ready');
    } catch (err) {
      console.warn('[Location Context] Geocoding failed during update, using fallback coords overlay:', err);
      // Gating geocoding failures: display coordinates anyway (Task 6)
      const fallbackGeo: GeoInfo = {
        city: `Lat: ${coords.latitude.toFixed(4)}`,
        district: `Lng: ${coords.longitude.toFixed(4)}`,
        state: 'Tamil Nadu',
        stateCode: 'TN',
        country: 'India',
        postalCode: '',
        confidence: 'low',
        source: 'fallback',
      };
      setGeoInfo(fallbackGeo);
      setLocation(coords);
      await LocationService.saveLastLocation(coords, fallbackGeo);
      setStatus('Reverse Geocode Failed');
    }
  }, []);

  const refreshLocation = useCallback(async (showPrompt = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Verify system GPS services enabled (Task 3)
      setStatus('Requesting Permission');
      const gpsEnabled = await LocationService.hasServicesEnabled();
      if (!gpsEnabled) {
        setStatus('GPS Disabled');
        throw new Error('GPS Disabled');
      }

      // 2. Request foreground permission natively (Task 2)
      const hasPermission = await LocationService.requestLocationPermissions();
      setPermissionStatus(hasPermission ? 'granted' : 'denied');

      if (!hasPermission) {
        setStatus('Permission Denied');
        throw new Error('Permission Denied');
      }

      // 3. Acquire GPS (Task 9 & Task 5 timeout handling)
      setStatus('Acquiring GPS');
      const coords = await LocationService.getCurrentPosition(10000); // 10s timeout
      
      setStatus('GPS Acquired');

      // 4. Geocode mapping
      await updateLocationState(coords);
      setIsMocked(false);
    } catch (err: any) {
      console.warn('[Location Context] Refresh location failed:', err.message);
      
      let errorType: LocationStatus = 'Location Timeout';
      let displayError = err.message || 'Location fetch failed';

      if (err.message === 'Permission Denied') {
        errorType = 'Permission Denied';
      } else if (err.message === 'GPS Disabled') {
        errorType = 'GPS Disabled';
      } else if (err.message === 'Location Timeout' || err.message.includes('timeout')) {
        errorType = 'Location Timeout';
        displayError = 'Unable to acquire GPS signal.';
      }

      setError(displayError);
      setStatus(errorType);

      if (showPrompt) {
        let alertMessage = 'Smart Jurisdiction Engine requires location permissions and active GPS sensors. Please ensure Location is enabled in system settings.';
        if (errorType === 'Location Timeout') {
          alertMessage = 'Unable to acquire GPS signal. Please ensure you have clear sky visibility and active sensors.';
        } else if (errorType === 'GPS Disabled') {
          alertMessage = 'System GPS sensors are disabled. Please enable Location in your quick settings panel.';
        } else if (errorType === 'Permission Denied') {
          alertMessage = 'Location permission was denied. Please grant permission in your system settings.';
        }
        
        Alert.alert(
          'Location Access Required',
          alertMessage,
          [
            { text: 'Use Offline Manual Mode', style: 'cancel' },
            { text: 'Enable / Retry', onPress: () => refreshLocation(true) }
          ]
        );
      }

      // Fallback: Use last known location from cache (Task 8)
      try {
        const cached = await LocationService.getLastLocation();
        if (cached) {
          console.info('[Location Context] GPS failed, loading cached fallback coordinates');
          setLocation(cached.coords);
          setGeoInfo(cached.geo);
          setStatus('Ready'); // Successful load from cache!
        } else {
          setManualLocation('TN');
        }
      } catch (cacheErr) {
        console.warn('[Location Context] Cache load failed, defaulting to manual state', cacheErr);
        setManualLocation('TN');
      }
    } finally {
      setIsLoading(false);
    }
  }, [updateLocationState]);

  const setManualLocation = (stateCode: string) => {
    setGeoInfo({
      city: '',
      district: '',
      state: stateCode,
      stateCode: stateCode,
      country: 'India',
      postalCode: '',
      confidence: 'low',
      source: 'fallback',
    });
    setIsMocked(true);
    setStatus('Ready');
  };

  useEffect(() => {
    // Mount silently to avoid alerts on start
    refreshLocation(false);
  }, [refreshLocation]);

  return (
    <LocationContext.Provider
      value={{
        location,
        geoInfo,
        isLoading,
        error,
        permissionStatus,
        refreshLocation,
        setManualLocation,
        isMocked,
        status,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
