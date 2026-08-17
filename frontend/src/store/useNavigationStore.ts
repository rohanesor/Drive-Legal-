/**
 * useNavigationStore.ts — Reactive Navigation & Telemetry State Manager for Vazhi.
 * 
 * Provides ultra-fast reactive state updates for high-frequency GPS position,
 * 3D camera pitch, active maneuver cards, speed limit badges, and route progress.
 */

import { NavigationSessionState, Maneuver, SafetyEvent, GeoPoint, navigationSessionManager } from '../domain/session/NavigationSession';

export interface NavigationStoreState extends NavigationSessionState {
  setNavigating: (isNavigating: boolean) => void;
  setDestination: (dest: GeoPoint | null) => void;
  updateLocation: (lat: number, lng: number, speedKmh?: number, heading?: number) => void;
  updateManeuver: (maneuver: Maneuver, distanceRemaining: number, durationRemaining: number) => void;
  set3DMode: (enabled: boolean) => void;
  addSafetyEvent: (event: SafetyEvent) => void;
  resetSession: () => void;
}

export function useNavigationStore(): NavigationStoreState {
  const currentState = navigationSessionManager.getState();

  return {
    ...currentState,
    setNavigating: (isNavigating: boolean) => {
      if (!isNavigating) navigationSessionManager.endSession();
    },
    setDestination: (dest: GeoPoint | null) => {
      if (dest) navigationSessionManager.startSession({ lat: 11.0168, lng: 76.9558 }, dest, 'route_1', 'Highway Route');
    },
    updateLocation: (lat: number, lng: number, speedKmh: number = 0, heading: number = 0) => {
      navigationSessionManager.updateLocation(lat, lng, speedKmh, heading);
    },
    updateManeuver: (maneuver: Maneuver, distanceRemaining: number, durationRemaining: number) => {
      navigationSessionManager.updateManeuver(maneuver, distanceRemaining, durationRemaining);
    },
    set3DMode: (enabled: boolean) => {
      navigationSessionManager.toggle3DMode(enabled);
    },
    addSafetyEvent: (event: SafetyEvent) => {
      navigationSessionManager.triggerSafetyEvent(event);
    },
    resetSession: () => {
      navigationSessionManager.endSession();
    },
  };
}
