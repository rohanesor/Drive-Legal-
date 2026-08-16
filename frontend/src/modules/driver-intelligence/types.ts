export interface DriverPreferences {
  alertPreference: 'MINIMAL' | 'STANDARD' | 'DETAILED';
  alertTiming: 'EARLY' | 'STANDARD' | 'LATE';
  alertFrequency: 'LOW' | 'NORMAL' | 'HIGH';
  preferredLanguage: string;
  preferredRouteType: string;
  preferredRiskTolerance: string;
}

export interface DriverMetrics {
  speedCompliance: number;
  speedExcess: number;
  hardBraking: number;
  acceleration: number;
  routeDeviation: number;
  warningResponse: number;
  riskExposure: number;
  legalEvents: number;
  dataQuality: number;
}

export interface DriveScore {
  overall: number;
  speed: number;
  braking: number;
  acceleration: number;
  legal: number;
  risk: number;
  consistency: number;
  confidence: number;
  sampleSize: number;
  timestamp: number;
  version: string;
}

export interface DriverProfile {
  driverId: string;
  createdAt: number;
  updatedAt: number;
  preferences: DriverPreferences;
  baselineState: 'INSUFFICIENT_DATA' | 'INITIALIZING' | 'ESTABLISHED';
  metrics: DriverMetrics;
  trends: Record<string, string>;
  privacySettings: {
    localOnly: boolean;
  };
  profileVersion: string;
}

export interface DrivingEvent {
  eventId: string;
  type:
    | 'SPEED_LIMIT_EXCEEDED'
    | 'HARD_BRAKING'
    | 'RAPID_ACCELERATION'
    | 'ROUTE_DEVIATION'
    | 'RISK_ESCALATION'
    | 'RISK_RECOVERY'
    | 'LEGAL_WARNING'
    | 'HAZARD_WARNING'
    | 'ROUTE_CHANGE'
    | 'SAFE_DRIVING_PERIOD';
  timestamp: number;
  confidence: number;
  source: string;
  metadata: any;
}

export interface TripSummary {
  tripId: string;
  distance: number;
  duration: number;
  route: string;
  legalEvents: number;
  riskEvents: number;
  speedCompliance: number;
  hardBraking: number;
  rapidAcceleration: number;
  deviations: number;
  recommendations: string[];
  dataQuality: number;
}
