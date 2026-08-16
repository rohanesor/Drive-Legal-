export type MapProviderMode = 'ONLINE' | 'OFFLINE' | 'HYBRID';

export type RoadRestrictionStatus = 'SUPPORTED' | 'UNKNOWN' | 'UNAVAILABLE';

export type RoadRestrictionType =
  | 'NO_ENTRY'
  | 'ONE_WAY'
  | 'NO_LEFT_TURN'
  | 'NO_RIGHT_TURN'
  | 'NO_U_TURN'
  | 'VEHICLE_RESTRICTION'
  | 'HEIGHT_RESTRICTION'
  | 'WEIGHT_RESTRICTION'
  | 'TIME_RESTRICTION'
  | 'ROAD_CLOSED'
  | 'TOLL';

export interface RoadRestriction {
  type: RoadRestrictionType;
  status: RoadRestrictionStatus;
  details?: string;
}

export interface SpeedLimitContext {
  value: number; // km/h
  source: 'VERIFIED_DATA' | 'PERCEPTION' | 'SYSTEM' | 'UNKNOWN';
  confidence: number;
  validFrom?: number;
  validUntil?: number;
}

export interface RoadSegment {
  id: string;
  geometry: { latitude: number; longitude: number }[];
  roadName: string;
  roadClass: 'highway' | 'urban' | 'residential' | 'rural';
  direction: 'both' | 'forward' | 'backward';
  lanes: number;
  speedLimit: number;
  speedLimitSource: 'map' | 'perception' | 'default';
  oneWay: boolean;
  restrictions: RoadRestriction[];
  surface?: string;
  access?: string[];
  bridge?: boolean;
  tunnel?: boolean;
  schoolZone?: boolean;
  tollRoad?: boolean;
  confidence: number;
}

export interface MapMatchResult {
  segmentId: string;
  confidence: number;
  alternatives: string[];
  timestamp: number;
}

export interface Route {
  id: string;
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  segments: RoadSegment[];
  distance: number; // meters
  duration: number; // seconds
  eta: number; // timestamp
  tollCost: number;
  safetyScore: number;
  legalScore: number;
  riskScore: number;
  confidence: number;
  provider: string;
}

export interface EVRouteContext {
  batteryAtStart: number;
  estimatedBatteryAtDestination: number;
  requiredCharging: boolean;
  chargingStops: number;
  confidence: number;
}

export type ManeuverType =
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'U_TURN'
  | 'KEEP_LEFT'
  | 'KEEP_RIGHT'
  | 'ROUNDABOUT'
  | 'MERGE'
  | 'ARRIVE'
  | 'CONTINUE';

export interface NavigationInstruction {
  type: ManeuverType;
  roadName: string;
  distance: number; // meters
  direction: string;
  exitNumber?: number;
  laneInformation?: string;
  confidence: number;
}

export type NavigationState =
  | 'IDLE'
  | 'ROUTE_SELECTED'
  | 'NAVIGATING'
  | 'APPROACHING_MANEUVER'
  | 'MANEUVER_ACTIVE'
  | 'DEVIATED'
  | 'REROUTING'
  | 'ARRIVED'
  | 'PAUSED';
