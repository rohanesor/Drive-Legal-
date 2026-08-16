export interface Provenance {
  source: string;
  sourceVersion: string;
  timestamp: number;
  confidence: number;
  freshness: 'CURRENT' | 'AGING' | 'STALE' | 'UNKNOWN';
}

export interface LocationContext {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number;
  speed: number;
  altitude: number;
  locationTimestamp: number;
  quality: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE';
  accuracyMeters: number;
  ageMs: number;
}

export type RoadClass =
  | 'HIGHWAY'
  | 'EXPRESSWAY'
  | 'ARTERIAL'
  | 'COLLECTOR'
  | 'RESIDENTIAL'
  | 'SERVICE_ROAD'
  | 'UNKNOWN';

export interface RoadContext {
  roadId: string;
  roadName: string;
  roadClass: RoadClass;
  laneCount: number;
  direction: string;
  surfaceType: string;
  accessType: string;
}

export interface RouteContext {
  routeId: string;
  origin: string;
  destination: string;
  currentSegment: string;
  nextSegment: string;
  remainingDistance: number;
  remainingDuration: number;
  routeProgress: number;
  state: 'ON_ROUTE' | 'OFF_ROUTE' | 'REROUTING' | 'ROUTE_UNAVAILABLE';
}

export interface VehicleContext {
  speed?: number;
  acceleration?: number;
  braking?: boolean;
  engineState?: string;
  fuel?: number;
  battery?: number;
  vehicleType?: string;
  quality: 'AVAILABLE' | 'PARTIAL' | 'STALE' | 'UNAVAILABLE';
}

export interface EnvironmentContext {
  timeOfDay: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'UNKNOWN';
  dayOfWeek: string;
  weather: 'CLEAR' | 'RAIN' | 'FOG' | 'STORM' | 'UNKNOWN';
  visibility: number;
  lighting: string;
  roadCondition: string;
}

export interface RestrictionContext {
  type: string;
  value: any;
  status: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN';
  provenance: Provenance;
}

export interface DriverContext {
  speedVariance: number;
  speedLimitCompliance: number;
  hardBrakingFrequency: number;
  rapidAccelerationFrequency: number;
  routeDeviationCount: number;
}

export interface UpcomingContextEvent {
  type: string;
  distance: number;
  estimatedTime: number;
  confidence: number;
  source: string;
}

export interface ContextConflict {
  field: string;
  sources: string[];
  values: any[];
  confidence: number[];
  resolution: string;
  reason: string;
}

export interface DriveContext {
  contextId: string;
  timestamp: number;
  location: LocationContext;
  road: RoadContext;
  route: RouteContext;
  vehicle: VehicleContext;
  environment: EnvironmentContext;
  restrictions: RestrictionContext[];
  driver: DriverContext;
  hazards: any[];
  confidence: Record<string, number>;
  freshness: Record<string, string>;
  provenance: Record<string, Provenance>;
  state: 'NORMAL' | 'PARTIAL' | 'DEGRADED' | 'UNKNOWN';
}

export interface Zone {
  id: string;
  type: 'school' | 'hospital' | 'construction' | 'residential' | 'low-emission' | 'parking' | 'restricted-access';
  geometry: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  restrictions: string[];
  activePeriod?: string;
  source: string;
  version: string;
}
