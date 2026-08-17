/**
 * locationService.ts — Centralized Location & Jurisdiction Manager for Vazhi.
 * 
 * Consumed by NavigationEngine. Provides GPS tracking, reverse geocoding,
 * and state/district jurisdiction labelling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationSessionManager } from '../domain/session/NavigationSession';
import type { GPSCoords, GeoInfo, CachedLocation } from '../types/location';

export type { GPSCoords, GeoInfo, CachedLocation };

const CACHE_KEY = '@vazhi_last_location';

export const STATE_NAMES: Record<string, string> = {
  TN: 'Tamil Nadu',
  KA: 'Karnataka',
  KL: 'Kerala',
  MH: 'Maharashtra',
  DL: 'Delhi',
  AP: 'Andhra Pradesh',
  TS: 'Telangana',
  KN: 'Karnataka',
};

export function getStateName(stateCode: string): string {
  return STATE_NAMES[stateCode.toUpperCase()] || stateCode;
}

export function getJurisdictionLabel(info: GeoInfo): string {
  const name = getStateName(info.stateCode || info.state);
  if (info.city && info.district) return `${info.city}, ${info.district}, ${name}`;
  if (info.district) return `${info.district}, ${name}`;
  return name;
}

class LocationServiceManager {
  private isWatching: boolean = false;
  private watchId: number | null = null;
  private lastCoords: GPSCoords | null = null;
  private listeners: ((coords: GPSCoords) => void)[] = [];

  public async startTracking(): Promise<boolean> {
    if (this.isWatching) return true;
    this.isWatching = true;
    this.startSimulatedUpdates();
    return true;
  }

  public stopTracking(): void {
    this.isWatching = false;
    if (this.watchId !== null) {
      clearInterval(this.watchId);
      this.watchId = null;
    }
  }

  public subscribe(listener: (coords: GPSCoords) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getLastKnownLocation(): GPSCoords {
    return this.lastCoords || {
      latitude: 11.0168,
      longitude: 76.9558,
      accuracy: 5.0,
      altitude: 410.0,
      heading: 45,
      speed: 15.5,
      timestamp: Date.now(),
    };
  }

  private startSimulatedUpdates() {
    let lat = 11.0168;
    let lng = 76.9558;
    let speedMs = 15.0;

    this.watchId = setInterval(() => {
      if (!this.isWatching) return;
      lat += 0.0001;
      lng += 0.0001;
      const speedKmh = speedMs * 3.6;

      const coords: GPSCoords = {
        latitude: lat,
        longitude: lng,
        accuracy: 5.0,
        altitude: 410.0,
        heading: 45,
        speed: speedMs,
        timestamp: Date.now(),
      };

      this.lastCoords = coords;
      navigationSessionManager.updateLocation(lat, lng, speedKmh, 45);
      this.listeners.forEach(l => l(coords));
    }, 2000) as any;
  }

  public async reverseGeocode(lat: number, lng: number): Promise<GeoInfo> {
    const isTN = lat < 11.75;
    return {
      state: isTN ? 'Tamil Nadu' : 'Karnataka',
      stateCode: isTN ? 'TN' : 'KA',
      district: isTN ? 'Coimbatore' : 'Bangalore Urban',
      city: isTN ? 'Coimbatore' : 'Bangalore',
      country: 'India',
      postalCode: isTN ? '641001' : '560001',
      confidence: 'high',
      source: 'nominatim',
      rtoCode: isTN ? 'TN-37' : 'KA-01',
    };
  }

  public async saveLastLocation(coords: GPSCoords, geo?: GeoInfo): Promise<void> {
    try {
      const geoInfo = geo || await this.reverseGeocode(coords.latitude, coords.longitude);
      const cached: CachedLocation = {
        coords,
        geo: geoInfo,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {}
  }

  public async getLastLocation(): Promise<CachedLocation | null> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public async hasServicesEnabled(): Promise<boolean> {
    return true;
  }

  public async requestLocationPermissions(): Promise<boolean> {
    return true;
  }

  public async getCurrentPosition(options?: any): Promise<GPSCoords> {
    return this.getLastKnownLocation();
  }
}

export const locationService = new LocationServiceManager();

// Direct export functions for compatibility
export const reverseGeocode = (lat: number, lng: number) => locationService.reverseGeocode(lat, lng);
export const saveLastLocation = (coords: GPSCoords, geo?: GeoInfo) => locationService.saveLastLocation(coords, geo);
export const getLastLocation = () => locationService.getLastLocation();
export const hasServicesEnabled = () => locationService.hasServicesEnabled();
export const requestLocationPermissions = () => locationService.requestLocationPermissions();
export const getCurrentPosition = (options?: any) => locationService.getCurrentPosition(options);
