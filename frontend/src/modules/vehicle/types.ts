export type VehicleConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DEGRADED' | 'ERROR';

export type TelemetryStatus = 'HEALTHY' | 'DEGRADED' | 'STALE' | 'UNAVAILABLE';

export interface VehicleTelemetry {
  timestamp: number;
  speed?: number; // km/h
  engineRpm?: number;
  throttlePosition?: number; // % (0-100)
  brakeState?: boolean;
  acceleration?: number; // m/s^2
  longitudinalAcceleration?: number; // m/s^2
  lateralAcceleration?: number; // m/s^2
  steeringAngle?: number; // degrees
  batteryLevel?: number; // % (0-100)
  batteryTemperature?: number; // °C
  chargingState?: 'charging' | 'not_charging' | 'unknown';
  fuelLevel?: number; // %
  gear?: string;
  ignitionState?: 'on' | 'off' | 'accessory' | 'unknown';
  odometer?: number; // km
  vehicleState?: string;
  source: 'API' | 'OBD' | 'MOBILE' | 'GPS' | 'NONE';
  confidence: number; // 0 to 1
}

export interface VehicleCapabilities {
  speed: boolean;
  rpm: boolean;
  throttle: boolean;
  brake: boolean;
  acceleration: boolean;
  steering: boolean;
  battery: boolean;
  charging: boolean;
  fuel: boolean;
  gear: boolean;
  odometer: boolean;
}

export interface TelemetryQuality {
  source: string;
  timestamp: number;
  freshness: number; // latency in ms
  accuracy: number;
  confidence: number;
  status: TelemetryStatus;
}

export interface TelemetryConflict {
  signal: string;
  values: any[];
  sources: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolution: string;
}

export interface ChargingContext {
  charging: boolean;
  batteryPercent: number;
  estimatedRangeKm: number;
  destinationDistanceKm?: number;
  chargingRequired: boolean;
}

export interface DriverDisplayState {
  activeAlert?: { title: string; message: string; priority: string };
  currentSpeed: number;
  speedLimit: number;
  DriveScore: number;
  routeSummary?: string;
  nextAction?: string;
}

export interface VehicleProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): VehicleConnectionState;
  getCapabilities(): VehicleCapabilities;
  subscribe(callback: (data: VehicleTelemetry) => void): void;
}

export interface RangeEstimator {
  estimateRange(
    batteryLevel: number,
    efficiencyWhPerKm: number,
    routeDistanceKm?: number
  ): { estimatedRangeKm: number; confidence: number };
}
