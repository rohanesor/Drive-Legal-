export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AlertCategory = 'SAFETY' | 'LEGAL' | 'NAVIGATION' | 'BEHAVIOR' | 'GENERAL';
export type AlertLifecycle = 'CREATED' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXPIRED';
export type DriverAction = 
  | 'NAVIGATE_ALTERNATIVE_ROUTE' 
  | 'DISMISS_ALERT' 
  | 'VIEW_REASON' 
  | 'REDUCE_SPEED' 
  | 'ACKNOWLEDGE' 
  | 'CALL_EMERGENCY' 
  | 'NONE';

export interface DriverAlert {
  id: string;
  title: string;
  message: string;
  priority: AlertPriority;
  category: AlertCategory;
  status: AlertLifecycle;
  action: DriverAction;
  createdAt: number;
  expiresAt: number;
  fingerprint: string;
}

export interface AssistantMessage {
  text: string;
  priority: AlertPriority;
  category: AlertCategory;
  interruptible: boolean;
  expiresAt: number;
}

export interface AssistantContext {
  timestamp: number;
  vehicleState: {
    currentSpeed: number;
    heading: number;
    vehicleType: 'car' | 'motorcycle' | 'heavy';
    isEmergencyVehicle?: boolean;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  routeContext?: {
    safetyScore?: number;
    isNoEntry?: boolean;
    isOneWay?: boolean;
    warningProximityMeters?: number;
    restrictedVehicleTypes?: string[];
    timeRestrictions?: { startHour: number; endHour: number }[];
    isSaferRouteAvailable?: boolean;
    saferRouteDiffMinutes?: number;
  };
  driverRisk?: {
    score: number;
    signals: { type: string; severity: number; explanation: string }[];
  };
  legalCompliance?: {
    overallStatus: string;
    violations: { type: string; severity: string; status: string; explanation: string; confidence: number }[];
    warnings: { type: string; severity: string; message: string; ruleId: string }[];
  };
  driveScore?: {
    score: number;
    grade: string;
    trend: string;
    confidence: number;
  };
  userPreferences?: {
    voiceEnabled: boolean;
    alertFrequency: 'high' | 'medium' | 'low';
    navigationAlerts: boolean;
    legalAlerts: boolean;
    safetyAlerts: boolean;
  };
}

export interface AssistantEvent {
  type: string;
  timestamp: number;
  severity: AlertPriority;
  source: 'P0.2' | 'P0.3' | 'P0.4' | 'P0.5' | 'EMERGENCY';
  context: any;
}

export interface EmergencyEvent {
  type: 'ACCIDENT' | 'CRASH' | 'MEDICAL_EMERGENCY' | 'VEHICLE_BREAKDOWN' | 'DRIVER_DISTRESS';
  confidence: number;
  location: { latitude: number; longitude: number };
  timestamp: number;
  evidence: string;
}

export interface AssistantDecision {
  action: DriverAction;
  priority: AlertPriority;
  message: string;
  category: AlertCategory;
  source: 'P0.2' | 'P0.3' | 'P0.4' | 'P0.5' | 'EMERGENCY' | 'NONE';
  reason: string;
  alert?: DriverAlert;
  confidence: number;
}

export interface AssistantPreferences {
  voiceEnabled: boolean;
  alertFrequency: 'high' | 'medium' | 'low';
  navigationAlerts: boolean;
  legalAlerts: boolean;
  safetyAlerts: boolean;
}
