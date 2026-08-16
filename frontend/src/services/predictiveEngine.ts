/**
 * Predictive Engine
 *
 * Singleton that predicts upcoming traffic zones based on GPS heading and
 * current position. Triggers Redux alerts when the user is approaching a
 * zone (accident-prone areas, school zones, state borders, etc.).
 *
 * Dependencies:
 * - Redux store (for dispatching alerts)
 * - driveLegalService.zoneCheck (for zone geometry lookup)
 */
import { store } from '../store';
import { addAlert } from '../store/alertSlice';
import { driveLegalService } from './driveLegalService';
import { Alert, AppState } from 'react-native';
import { notificationService } from './notificationService';

class PredictiveEngine {
  private static instance: PredictiveEngine;
  private lastPosition: {
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null = null;
  private heading: number | null = null;

  private constructor() {}

  public static getInstance(): PredictiveEngine {
    if (!PredictiveEngine.instance) {
      PredictiveEngine.instance = new PredictiveEngine();
    }
    return PredictiveEngine.instance;
  }

  /**
   * Orchestrates the location check and applies adaptive heading calculation.
   */
  public async handleLocationUpdate(
    latitude: number,
    longitude: number,
    nativeSpeed?: number,
    nativeHeading?: number,
  ) {
    const now = Date.now();
    const state = store.getState();
    const currentStateCode = state.settings.state;
    const isCarMode = state.appMode.mode === 'car';

    // Calculate heading/bearing from previous location if native heading is not present
    let speed = nativeSpeed || 0;
    let heading = nativeHeading || null;

    if (this.lastPosition) {
      const timeDelta = (now - this.lastPosition.timestamp) / 1000; // seconds

      if (!heading) {
        heading = this.calculateBearing(
          this.lastPosition.latitude,
          this.lastPosition.longitude,
          latitude,
          longitude,
        );
      }

      if (speed <= 0 && timeDelta > 0) {
        // Fallback speed estimation: distance / time
        const dist = this.calculateDistance(
          this.lastPosition.latitude,
          this.lastPosition.longitude,
          latitude,
          longitude,
        );
        speed = dist / timeDelta; // m/s
      }
    }

    // Cache current state
    this.lastPosition = { latitude, longitude, timestamp: now };
    this.heading = heading;

    // Send check payload to DriveLegal service
    try {
      const result = await driveLegalService.zoneCheck(
        latitude,
        longitude,
        currentStateCode,
        heading,
        speed * 3.6,
      );

      if (result.status === 'zone_alert' && result.message) {
        const zoneAlert = {
          id: Date.now().toString(),
          zone_type: result.zone_type || 'custom',
          zone_name: result.zone_name || 'Unknown Zone',
          message: result.message,
          suggested_query: result.suggested_query || '',
          severity: (result.severity as 'low' | 'medium' | 'high') || 'medium',
          timestamp: Date.now(),
          dismissed: false,
        };

        // Dispatch alert to store
        store.dispatch(addAlert(zoneAlert));

        // If app is in background, trigger a local push notification
        if (AppState.currentState === 'background' || AppState.currentState === 'inactive') {
          notificationService.scheduleLocalNotification({
            channelId: 'zone_alerts',
            title: `Zone Alert: ${zoneAlert.zone_name}`,
            message: zoneAlert.message,
            data: { screen: 'CarAlert', alertId: zoneAlert.id }
          });
        }

        // In Car Mode: speak immediately using Built-in Native TTS, bypassing popups for zero distraction
        if (isCarMode) {
          const { NativeModules } = require('react-native');
          const { DriveLegalTTS } = NativeModules;
          if (DriveLegalTTS) {
            DriveLegalTTS.stop().then(() => {
              DriveLegalTTS.speak(
                `Warning: ${result.message}`,
                state.settings.language || 'en',
              );
            });
          }
        } else {
          // In Mobile Mode: show native dialog
          Alert.alert('DriveLegal Alert', result.message, [
            { text: 'Dismiss', style: 'cancel' },
            {
              text: 'Learn More',
              onPress: () => {
                const { addMessage } = require('../store/chatSlice');
                store.dispatch(
                  addMessage({
                    id: Date.now().toString(),
                    text: result.suggested_query || '',
                    sender: 'user',
                    timestamp: Date.now(),
                  }),
                );
              },
            },
          ]);
        }
      }
    } catch (e) {
      console.error('Predictive zone check failed:', e);
    }
  }

  /**
   * Helper: Calculates heading between two GPS coordinates in degrees (0 = North, etc.)
   */
  private calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  }

  /**
   * Helper: Calculates simple Haversine distance in meters
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Radius of the earth in m
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const predictiveEngine = PredictiveEngine.getInstance();
export default predictiveEngine;
