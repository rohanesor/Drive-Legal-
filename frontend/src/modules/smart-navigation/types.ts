export interface VehicleProfile {
  vehicleType?: string;
  vehicleDimensions?: { height: number; width: number; length: number };
  vehicleWeight?: number;
  fuelType?: string;
  emissionClass?: string;
  EV?: boolean;
  commercialVehicle?: boolean;
}

export type RoutePreferences = 'FASTEST' | 'SHORTEST' | 'SAFEST' | 'LEGAL_FIRST' | 'BALANCED';

export interface RouteRequest {
  origin: string;
  destination: string;
  vehicleProfile?: VehicleProfile;
  preferences: RoutePreferences;
  constraints?: {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidRestrictedRoads?: boolean;
    avoidUnpavedRoads?: boolean;
    avoidConstruction?: boolean;
    avoidHighRiskSegments?: boolean;
  };
  avoidances?: string[];
  mode?: 'SOFTWARE_ONLY' | 'MINIMAL_MODE' | 'HARDWARE_ENHANCED';
}

export interface RouteScore {
  total: number;
  travelCost: number;
  riskCost: number;
  legalCost: number;
  restrictionCost: number;
  preferenceCost: number;
}

export interface RouteSegment {
  segmentId: string;
  roadId: string;
  roadName: string;
  roadClass: string;
  distanceMeters: number;
  estimatedDuration: number;
  speedLimit?: number;
  restrictions: string[];
  zones: string[];
  hazards: string[];
  risk: number;
  legalStatus: 'LEGAL' | 'RESTRICTED' | 'UNKNOWN' | 'ILLEGAL';
  confidence: number;
}

export interface RouteLeg {
  legId: string;
  start: { latitude: number; longitude: number };
  end: { latitude: number; longitude: number };
  segments: RouteSegment[];
  distanceMeters: number;
  durationSeconds: number;
}

export interface Route {
  routeId: string;
  origin: string;
  destination: string;
  distanceMeters: number;
  durationSeconds: number;
  segments: RouteSegment[];
  legs: RouteLeg[];
  legalStatus: 'VALID' | 'PARTIALLY_VALID' | 'RESTRICTED' | 'ILLEGAL' | 'UNKNOWN' | 'STALE';
  riskAssessment: {
    riskScore: number;
  };
  score: RouteScore;
  confidence: number;
  mapVersion: string;
  routeEngineVersion: string;
  createdAt: number;
}

export interface TurnInstruction {
  type: 'LEFT' | 'RIGHT' | 'UTURN' | 'ROUNDABOUT' | 'MERGE' | 'EXIT' | 'KEEP_LEFT' | 'KEEP_RIGHT' | 'DESTINATION';
  distance: number;
  street: string;
  confidence: number;
}

export interface CriticalRouteSegment {
  segmentId: string;
  risk: number;
  reason: string;
  distanceFromCurrent: number;
  estimatedTime: number;
}
