import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as LocationService from '../services/locationService';
import { GPSCoords, GeoInfo } from '../services/locationService';

interface LocationContextType {
  location: GPSCoords | null;
  geoInfo: GeoInfo | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  refreshLocation: () => Promise<void>;
  setManualLocation: (stateCode: string) => void;
  isMocked: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<GPSCoords | null>(null);
  const [geoInfo, setGeoInfo] = useState<GeoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isMocked, setIsMocked] = useState(false);

  const updateLocationState = useCallback(async (coords: GPSCoords) => {
    try {
      const geo = await LocationService.reverseGeocode(coords.latitude, coords.longitude);
      setGeoInfo(geo);
      setLocation(coords);
      await LocationService.saveLastLocation(coords, geo);
    } catch (err) {
      console.warn('Geocoding failed during update:', err);
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const hasPermission = await LocationService.requestLocationPermissions();
      setPermissionStatus(hasPermission ? 'granted' : 'denied');

      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const coords = await LocationService.getCurrentPosition();
      await updateLocationState(coords);
      setIsMocked(false);
    } catch (err: any) {
      setError(err.message);

      // Fallback to cache if GPS fails
      try {
        const cached = await LocationService.getLastLocation();
        if (cached) {
          setLocation(cached.coords);
          setGeoInfo(cached.geo);
          console.info('Using cached location fallback');
        } else {
          setManualLocation('DL');
        }
      } catch (cacheErr) {
        console.warn('Cache access failed', cacheErr);
        setManualLocation('DL');
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
  };

  useEffect(() => {
    refreshLocation();
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
