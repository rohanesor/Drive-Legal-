export type RuntimeState =
  | 'BOOTING'
  | 'INITIALIZING'
  | 'READY'
  | 'DRIVING'
  | 'PAUSED'
  | 'DEGRADED'
  | 'RECOVERING'
  | 'SHUTTING_DOWN'
  | 'STOPPED';

export type EngineState = 'STARTING' | 'READY' | 'DEGRADED' | 'FAILED' | 'STOPPING' | 'STOPPED';

export interface EngineHealth {
  engineId: string;
  state: EngineState;
  version: string;
  dependencies: string[];
  lastHeartbeat: number;
  lastError?: string;
}

export interface SystemHealth {
  runtime: RuntimeState;
  engines: EngineHealth[];
  datasets: string;
  security: string;
  storage: string;
  network: string;
  overallState: 'SECURE' | 'DEGRADED' | 'WARNING' | 'COMPROMISED' | 'UNKNOWN';
}

export interface EventEnvelope {
  eventId: string;
  eventType: string;
  timestamp: number;
  sequenceNumber: number;
  source: string;
  correlationId: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'BACKGROUND';
  payload: any;
}

export interface ContextSnapshot {
  contextVersion: number;
  location: { latitude: number; longitude: number };
  speed: number;
  road: string;
  route: any;
  legalContext: any;
  riskContext: any;
  navigationContext: any;
  driverContext: any;
  datasetVersions: Record<string, string>;
}

export type AlertState = 'CREATED' | 'QUEUED' | 'DELIVERED' | 'ACKNOWLEDGED' | 'EXPIRED' | 'CANCELLED';

export interface Alert {
  alertId: string;
  fingerprint: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  state: AlertState;
  createdAt: number;
  expiresAt: number;
  payload: any;
}

export interface SafetyBounds {
  minWarningDistanceMeters: number;
  maxAlertCooldownSeconds: number;
  maxRouteDeviationThresholdMeters: number;
}
