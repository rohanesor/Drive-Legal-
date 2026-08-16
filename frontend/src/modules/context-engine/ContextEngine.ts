import { DriveContext, Zone, ContextConflict } from './types';
import { GeofenceEngine } from './GeofenceEngine';
import { MapMatcher } from './MapMatcher';

export class ContextEngine {
  private currentContext!: DriveContext;
  private geofenceEngine = new GeofenceEngine();
  private mapMatcher = new MapMatcher();
  private subscriptions: Set<(context: DriveContext) => void> = new Set();
  private conflicts: ContextConflict[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.geofenceEngine.reset();
    this.conflicts = [];
    this.currentContext = {
      contextId: 'ctx_init',
      timestamp: Date.now(),
      location: {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        heading: 0,
        speed: 0,
        altitude: 0,
        locationTimestamp: Date.now(),
        quality: 'UNAVAILABLE',
        accuracyMeters: 0,
        ageMs: 0,
      },
      road: {
        roadId: 'unknown',
        roadName: 'Unknown Road',
        roadClass: 'UNKNOWN',
        laneCount: 0,
        direction: 'unknown',
        surfaceType: 'unknown',
        accessType: 'unknown',
      },
      route: {
        routeId: 'route_unknown',
        origin: '',
        destination: '',
        currentSegment: '',
        nextSegment: '',
        remainingDistance: 0,
        remainingDuration: 0,
        routeProgress: 0,
        state: 'ROUTE_UNAVAILABLE',
      },
      vehicle: {
        quality: 'UNAVAILABLE',
      },
      environment: {
        timeOfDay: 'UNKNOWN',
        dayOfWeek: '',
        weather: 'UNKNOWN',
        visibility: 1.0,
        lighting: 'UNKNOWN',
        roadCondition: 'dry',
      },
      restrictions: [],
      driver: {
        speedVariance: 0,
        speedLimitCompliance: 1.0,
        hardBrakingFrequency: 0,
        rapidAccelerationFrequency: 0,
        routeDeviationCount: 0,
      },
      hazards: [],
      confidence: {},
      freshness: {},
      provenance: {},
      state: 'UNKNOWN',
    };
  }

  getCurrentContext(): DriveContext {
    return this.currentContext;
  }

  subscribe(callback: (context: DriveContext) => void): void {
    this.subscriptions.add(callback);
  }

  unsubscribe(callback: (context: DriveContext) => void): void {
    this.subscriptions.delete(callback);
  }

  updateLocation(update: {
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    accuracy: number;
    altitude: number;
    timestamp: number;
  }, zones: Zone[]): void {
    const matched = this.mapMatcher.matchRoad(
      update.latitude,
      update.longitude,
      update.heading,
      update.speed
    );

    const geoStatus = this.geofenceEngine.updatePosition(
      update.latitude,
      update.longitude,
      zones
    );

    const timeOfDay = this.deriveTimeOfDay(update.timestamp);

    this.currentContext = {
      ...this.currentContext,
      contextId: `ctx_${Date.now()}`,
      timestamp: Date.now(),
      location: {
        latitude: update.latitude,
        longitude: update.longitude,
        accuracy: update.accuracy,
        heading: update.heading,
        speed: update.speed,
        altitude: update.altitude,
        locationTimestamp: update.timestamp,
        quality: update.accuracy <= 5 ? 'HIGH' : 'MEDIUM',
        accuracyMeters: update.accuracy,
        ageMs: Date.now() - update.timestamp,
      },
      road: matched.road,
      environment: {
        ...this.currentContext.environment,
        timeOfDay,
        lighting: timeOfDay === 'NIGHT' ? 'poor' : 'good',
      },
      state: 'NORMAL',
    };

    this.currentContext.confidence['location'] = update.accuracy <= 5 ? 0.98 : 0.8;
    this.currentContext.confidence['roadMatch'] = matched.confidence;

    this.subscriptions.forEach((sub) => sub(this.currentContext));
  }

  handleConflict(conflict: ContextConflict): void {
    this.conflicts.push(conflict);
    console.warn(`[ContextEngine] Conflict registered on field: ${conflict.field}. Resolution applied: ${conflict.resolution}`);
  }

  getConflicts(): ContextConflict[] {
    return this.conflicts;
  }

  private deriveTimeOfDay(timestamp: number): 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'UNKNOWN' {
    const hour = new Date(timestamp).getHours();
    if (hour >= 6 && hour < 18) {
      return 'DAY';
    }
    return 'NIGHT';
  }
}
export default ContextEngine;
