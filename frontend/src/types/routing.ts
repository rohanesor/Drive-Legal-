import type { MapLocation, MapZone } from './map';

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  startLocation: MapLocation;
  endLocation: MapLocation;
}

export interface SafetyAssessment {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  factors: {
    speedLimitStatus: 'known' | 'unknown';
    speedLimitCompatibility: 'compatible' | 'incompatible' | 'unknown';
    accidentZonesCount: number;
    schoolZonesCount: number;
    policeZonesCount: number;
    unknownCount: number;
  };
  dataSources: string[];
  status: 'KNOWN' | 'UNKNOWN' | 'STALE' | 'UNVERIFIED';
}

export interface Route {
  id: string;
  name: string;
  coords: MapLocation[];
  distance: number; // meters
  duration: number; // seconds
  safetyScore: number; // 0 to 100 (higher is safer)
  riskFactors: string[]; // reasons for score deductions (e.g. "Crosses 3 school zones", "High accident area")
  steps: RouteStep[];
  activeZones: MapZone[]; // zones that intersect this route
  safety?: SafetyAssessment;
}

export interface RouteSearchParams {
  origin: MapLocation;
  destination: MapLocation;
  vehicleType: 'car' | 'motorcycle' | 'heavy';
  avoidAccidentZones?: boolean;
  avoidSchoolZones?: boolean;
}
