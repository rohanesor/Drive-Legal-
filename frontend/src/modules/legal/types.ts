import type { MapLocation } from '../../types';

export interface TrafficRule {
  id: string;
  version: number;
  category: 
    | 'SPEED_LIMIT' 
    | 'NO_ENTRY' 
    | 'ONE_WAY' 
    | 'NO_PARKING' 
    | 'NO_STOPPING' 
    | 'VEHICLE_RESTRICTION' 
    | 'SCHOOL_ZONE' 
    | 'BUS_ZONE' 
    | 'WEIGHT_RESTRICTION' 
    | 'HEIGHT_RESTRICTION' 
    | 'TIME_RESTRICTION' 
    | 'TURN_RESTRICTION' 
    | 'ROAD_CLASS_RESTRICTION';
  jurisdiction: string; // e.g. "IN.TN.Coimbatore"
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date
  enabled: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  explanation: string;
}

export interface LegalContext {
  jurisdiction: {
    country: string; // e.g. "IN"
    state: string; // e.g. "TN"
    city?: string; // e.g. "Coimbatore"
    roadId?: string; // e.g. "Avinashi Road"
  };
  currentLocation?: MapLocation;
  vehicleContext: {
    currentSpeed: number; // km/h
    vehicleType: 'car' | 'motorcycle' | 'heavy';
    heading: number; // degrees (0-360)
    weightKg?: number;
    heightMeters?: number;
    isEV?: boolean;
    isEmergencyVehicle?: boolean;
  };
  roadContext: {
    applicableSpeedLimit: number; // km/h (0 if unknown)
    roadType: 'highway' | 'urban' | 'residential' | 'rural';
    isNoEntry: boolean;
    isOneWay: boolean;
    isSchoolZone: boolean;
    isBusZone: boolean;
    restrictedVehicleTypes?: ('car' | 'motorcycle' | 'heavy')[];
    heightLimitMeters?: number;
    weightLimitKg?: number;
    timeRestrictions?: { startHour: number; endHour: number }[]; // hours when segment is restricted
    turnRestriction?: 'no_left' | 'no_right' | 'no_u_turn' | 'none';
    warningProximityMeters?: number; // distance warning triggered (e.g. 150m)
  };
  driverBehavior: {
    speedingPersistenceSeconds: number; // tolerance check
    parkingDurationSeconds?: number;
    parkingStatus?: 'parked' | 'moving';
  };
  environmentalContext?: {
    timeOfDay: 'day' | 'night' | 'dawn_dusk';
    currentHour: number; // 0 to 23
  };
  signDetectionContext?: {
    detectedSignId?: string; // e.g. "no_parking", "no_entry"
    detectionConfidence?: number; // 0.0 to 1.0
  };
  evidenceConfidence?: number; // overall sensor reliability
}

export interface Violation {
  id: string;
  ruleId: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'POTENTIAL' | 'CONFIRMED' | 'RESOLVED' | 'UNKNOWN';
  jurisdiction: string;
  detectedAt: number;
  location?: MapLocation;
  evidence: string;
  explanation: string;
  confidence: number;
}

export interface LegalWarning {
  type: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  distanceMeters?: number;
  ruleId: string;
}

export interface LegalComplianceResult {
  overallStatus: 'COMPLIANT' | 'WARNING' | 'VIOLATION' | 'UNKNOWN';
  violations: Violation[];
  warnings: LegalWarning[];
  compliantRules: string[];
  unknownRules: string[];
  confidence: number;
}
