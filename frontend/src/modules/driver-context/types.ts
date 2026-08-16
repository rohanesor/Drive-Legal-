export type DrivingState =
  | 'PARKED'
  | 'STARTING_TRIP'
  | 'DRIVING'
  | 'STOPPED'
  | 'ARRIVING'
  | 'TRIP_COMPLETED';

export interface LocationContext {
  roadSegment?: string;
  roadType?: 'highway' | 'urban' | 'residential' | 'rural';
  areaType?: string;
  speedLimit?: number;
  nearbyHazards: string[];
  nearbyRestrictions: string[];
  confidence: number;
}

export interface NavigationContext {
  active: boolean;
  destination?: string;
  routeType?: string;
  distanceRemainingMeters?: number;
  timeRemainingSeconds?: number;
  currentInstruction?: string;
  deviationState?: string;
  routeRisk?: number;
  routeConfidence?: number;
}

export interface VehicleContext {
  vehicleType?: string;
  currentSpeed?: number;
  battery?: number;
  fuel?: number;
  chargingState?: string;
  telemetryQuality: number;
}

export interface SafetyContext {
  currentRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  activeIncidents: any[];
  recentIncidents: any[];
  currentRiskTrend: 'STABLE' | 'INCREASING' | 'DECREASING';
}

export interface LegalContext {
  currentRestrictions: string[];
  applicableSpeedLimit?: number;
  vehicleRestrictions: string[];
  confidence: number;
}

export type PreferenceSource = 'EXPLICIT' | 'LEARNED' | 'DEFAULT';

export interface PreferenceItem<T> {
  value: T;
  confidence: number;
  evidenceCount: number;
  lastObserved: number;
  source: PreferenceSource;
}

export interface DriverPreferences {
  routePreference?: PreferenceItem<'fastest' | 'safest' | 'balanced'>;
  alertVerbosity?: PreferenceItem<'MINIMAL' | 'STANDARD' | 'DETAILED'>;
  voicePreference?: PreferenceItem<boolean>;
  language?: PreferenceItem<'English' | 'Tamil' | 'Hindi'>;
  avoidTolls?: PreferenceItem<boolean>;
  avoidHighways?: PreferenceItem<boolean>;
  preferSaferRoutes?: PreferenceItem<boolean>;
  preferFastestRoutes?: PreferenceItem<boolean>;
  notificationPreference?: PreferenceItem<boolean>;
}

export interface BehaviorProfile {
  routeChoicePatterns: Record<string, number>;
  alertResponsePatterns: Record<string, number>;
  drivingPatterns: Record<string, number>;
  interactionPatterns: Record<string, number>;
  confidence: number;
}

export interface DriverContext {
  timestamp: number;
  drivingState: DrivingState;
  locationContext: LocationContext;
  navigationContext: NavigationContext;
  vehicleContext: VehicleContext;
  safetyContext: SafetyContext;
  legalContext: LegalContext;
  preferences: DriverPreferences;
  behaviorProfile: BehaviorProfile;
  confidence: number;
}

export interface TripContext {
  tripId: string;
  startedAt: number;
  duration: number;
  route?: any;
  destination?: string;
  incidents: any[];
  score: number;
  preferencesUsed: string[];
}

export interface TripSummary {
  durationSeconds: number;
  distanceMeters: number;
  DriveScore: number;
  safetyEventsCount: number;
  legalEventsCount: number;
  routeChangesCount: number;
  notableEvents: string[];
}

export interface DriverContextSnapshot {
  timestamp: number;
  context: DriverContext;
  sourceVersions: Record<string, string>;
}
