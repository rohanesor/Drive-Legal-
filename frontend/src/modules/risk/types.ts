export interface DriverRiskContext {
  vehicleState: {
    currentSpeed: number; // km/h
    acceleration: number; // m/s^2
    brakingIntensity: number; // m/s^2
    heading: number; // degrees (0-360)
    vehicleType: 'car' | 'motorcycle' | 'heavy';
    isEV?: boolean;
  };
  roadContext: {
    currentSpeedLimit: number; // km/h
    roadClassification: 'highway' | 'urban' | 'residential' | 'rural';
    isNearIntersection: boolean;
    isSchoolZone: boolean;
    isPedestrianHeavy: boolean;
    isSharpCurve: boolean;
    isRestrictedRoad: boolean;
    routeSafetyScore?: number; // 0-100 from P0.2
  };
  driverBehavior: {
    repeatedSpeedingCount: number;
    harshBrakingCount: number;
    rapidAccelerationCount: number;
    headingChangeRate: number; // degrees/sec (for sudden lane/heading changes)
    unsafePatternPersistenceScore: number; // 0-100 (persistence metric)
  };
  environmentalContext?: {
    timeOfDay: 'day' | 'night' | 'dawn_dusk';
    weather?: 'clear' | 'rain' | 'fog' | 'storm';
    visibility?: number; // visibility in meters
    trafficDensity?: 'low' | 'moderate' | 'heavy';
  };
  legalContext?: {
    hasActiveRestriction: boolean;
    vehicleRestrictionApplies: boolean;
    zoneRestrictionApplies: boolean;
  };
}

export interface RiskSignal {
  type: string;
  severity: number; // 0 to 1
  contribution: number; // 0 to 100
  explanation: string;
}

export interface Recommendation {
  id: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RiskScore {
  score: number; // 0-100
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  signals: RiskSignal[];
  recommendations: Recommendation[];
  confidence: number;
}
