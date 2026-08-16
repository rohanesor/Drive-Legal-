export type TripState =
  | 'IDLE'
  | 'PREPARING'
  | 'STARTING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'ARRIVING'
  | 'COMPLETING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ERROR';

export type MotionState =
  | 'UNKNOWN'
  | 'PARKED'
  | 'MOVING'
  | 'STOPPED'
  | 'SLOW_MOVING';

export type NavigationState =
  | 'NO_ROUTE'
  | 'ROUTE_PLANNED'
  | 'NAVIGATING'
  | 'OFF_ROUTE'
  | 'REROUTING'
  | 'ARRIVED'
  | 'NAVIGATION_ERROR';

export type SafetyState =
  | 'UNKNOWN'
  | 'NORMAL'
  | 'ELEVATED'
  | 'HIGH'
  | 'CRITICAL';

export type AlertState =
  | 'NONE'
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'RESOLVED';

export type ConnectivityState =
  | 'ONLINE'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'RECOVERING';

export type PerceptionState =
  | 'INITIALIZING'
  | 'READY'
  | 'DEGRADED'
  | 'UNAVAILABLE';

export type VehicleState =
  | 'UNKNOWN'
  | 'AVAILABLE'
  | 'DEGRADED'
  | 'DISCONNECTED';

export interface DriveLegalStateSnapshot {
  timestamp: number;
  trip: TripState;
  motion: MotionState;
  navigation: NavigationState;
  safety: SafetyState;
  alerts: AlertState;
  connectivity: ConnectivityState;
  perception: PerceptionState;
  vehicle: VehicleState;
  highestPriorityAlert?: string;
  contextVersion: string;
  stateVersion: string;
}

export interface StateTransition {
  transitionId: string;
  domain: 'trip' | 'motion' | 'navigation' | 'safety' | 'alerts' | 'connectivity' | 'perception' | 'vehicle';
  previousState: string;
  nextState: string;
  event: string;
  timestamp: number;
  reason: string;
  confidence: number;
  correlationId?: string;
}
