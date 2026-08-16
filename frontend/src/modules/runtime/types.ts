export type RuntimeStatus =
  | 'CREATED'
  | 'INITIALIZING'
  | 'READY'
  | 'RUNNING'
  | 'DEGRADED'
  | 'STOPPING'
  | 'STOPPED'
  | 'FAILED';

export type RuntimeMode = 'OFFLINE' | 'ONLINE' | 'DEGRADED' | 'DEMO';

export type SubsystemHealth = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';

export type DependencyCriticality = 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL';

export interface BaseEvent<T = any> {
  id: string;
  type: string;
  timestamp: number;
  source: string;
  correlationId: string;
  tripId: string;
  payload: T;
  schemaVersion: string;
}

export interface TripRuntimeState {
  tripId: string;
  startedAt: number;
  currentLocation?: { latitude: number; longitude: number };
  currentRoute?: any;
  distance: number;
  duration: number;
  risk: number;
  score: number;
  alerts: any[];
  events: BaseEvent[];
}

export interface RuntimeState {
  status: RuntimeStatus;
  startedAt: number;
  currentTrip?: TripRuntimeState;
  currentContext?: any;
  activeAlerts: any[];
  activeRoute?: any;
  subsystemHealth: Record<string, SubsystemHealth>;
  mode: RuntimeMode;
}
