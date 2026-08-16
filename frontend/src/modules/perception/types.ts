export type SensorStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'STALE';

export interface SensorHealth {
  source: string;
  status: SensorStatus;
  accuracy: number;
  lastUpdate: number;
  confidence: number;
}

export interface SensorProvider<T> {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): SensorStatus;
  subscribe(callback: (data: T) => void): void;
}

export type ObservationScope = 'POINT' | 'ROAD_SEGMENT' | 'ZONE' | 'ROUTE_SEGMENT';

export type ObservationLifecycle = 'DETECTED' | 'CONFIRMED' | 'ACTIVE' | 'EXPIRED';

export type ObservationType =
  | 'SPEED_LIMIT_SIGN'
  | 'NO_ENTRY_SIGN'
  | 'NO_PARKING_SIGN'
  | 'ONE_WAY_SIGN'
  | 'SCHOOL_ZONE_SIGN'
  | 'TRAFFIC_LIGHT'
  | 'LANE_MARKING'
  | 'ROAD_HAZARD'
  | 'PEDESTRIAN'
  | 'VEHICLE'
  | 'ROAD_RESTRICTION'
  | 'VISIBILITY'
  | 'WEATHER';

export interface Observation {
  id: string;
  type: ObservationType;
  timestamp: number;
  location?: { latitude: number; longitude: number };
  value: any;
  unit?: string;
  confidence: number; // 0 to 1
  source: 'CAMERA' | 'GPS' | 'MAP' | 'TELEMETRY' | 'VOICE';
  metadata?: Record<string, any>;
  scope: ObservationScope;
  lifecycle: ObservationLifecycle;
  expiresAt?: number;
}

export interface ConflictObservation {
  type: ObservationType;
  candidates: Observation[];
  confidence: number;
  resolutionStatus: 'PENDING' | 'RESOLVED';
}

export interface CameraFrame {
  id: string;
  width: number;
  height: number;
  data: ArrayBuffer; // simulated frame pixel buffer
  timestamp: number;
}

export interface VisionModel {
  load(): Promise<void>;
  unload(): Promise<void>;
  infer(frame: CameraFrame): Promise<any>;
  getMetadata(): Record<string, any>;
}

export interface GPSData {
  latitude: number;
  longitude: number;
  speed: number; // km/h
  heading: number; // degrees
  accuracy: number; // meters
  timestamp: number;
}

export interface VoiceData {
  transcript: string;
  confidence: number;
  timestamp: number;
}

export interface VehicleTelemetryData {
  speed?: number; // km/h
  rpm?: number;
  batteryLevel?: number;
  fuelLevel?: number;
  throttlePercentage?: number;
  brakeActive?: boolean;
  heading?: number;
  timestamp: number;
}
