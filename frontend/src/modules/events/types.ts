export type EventCategory = 'SAFETY' | 'LEGAL' | 'NAVIGATION' | 'VEHICLE' | 'ENVIRONMENT';

export type DrivingEventType =
  | 'SPEED_LIMIT_CHANGED'
  | 'SPEEDING_DETECTED'
  | 'ROAD_HAZARD'
  | 'COLLISION_RISK'
  | 'HARSH_BRAKING'
  | 'RAPID_ACCELERATION'
  | 'LANE_RISK'
  | 'LOW_VISIBILITY'
  | 'LEGAL_RESTRICTION'
  | 'NO_ENTRY'
  | 'NO_PARKING'
  | 'NO_STOPPING'
  | 'VEHICLE_RESTRICTION'
  | 'TURN_RESTRICTION'
  | 'ROUTE_DEVIATION'
  | 'REROUTE_REQUIRED'
  | 'TURN_APPROACHING'
  | 'DESTINATION_APPROACHING'
  | 'ROAD_CLOSURE'
  | 'LOW_BATTERY'
  | 'LOW_FUEL'
  | 'VEHICLE_DISCONNECTED'
  | 'TELEMETRY_DEGRADED'
  | 'SCHOOL_ZONE'
  | 'RAILWAY_CROSSING'
  | 'PEDESTRIAN_ZONE'
  | 'TOLL_APPROACHING';

export type EventSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EventUrgency = 'IMMEDIATE' | 'HIGH' | 'NORMAL' | 'LOW';

export type IncidentStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXPIRED';

export interface DrivingEvent {
  id: string;
  type: DrivingEventType;
  category: EventCategory;
  timestamp: number;
  location?: { latitude: number; longitude: number };
  source: 'P1.2_PERCEPTION' | 'P1.3_VEHICLE' | 'P1.4_NAVIGATION' | 'P0.3_RISK' | 'P0.4_LEGAL';
  confidence: number;
  severity: EventSeverity;
  urgency: EventUrgency;
  status: 'ACTIVE' | 'RESOLVED';
  context: any;
  expiresAt?: number;
}

export interface DrivingIncident {
  id: string;
  events: DrivingEvent[];
  primaryType: DrivingEventType;
  severity: EventSeverity;
  urgency: EventUrgency;
  confidence: number;
  location?: { latitude: number; longitude: number };
  createdAt: number;
  updatedAt: number;
  status: IncidentStatus;
}

export type DeliveryMode = 'VOICE' | 'DISPLAY' | 'HAPTIC' | 'NOTIFICATION';

export type DriverAttentionState = 'DRIVING' | 'STOPPED' | 'PARKED' | 'CALLING' | 'NAVIGATING' | 'HIGH_WORKLOAD';

export interface DriverAlert {
  id: string;
  incidentId: string;
  title: string;
  message: string;
  severity: EventSeverity;
  urgency: EventUrgency;
  confidence: number;
  deliveryModes: DeliveryMode[];
  createdAt: number;
  expiresAt?: number;
  requiresAcknowledgement: boolean;
}

export interface VoiceAlertPayload {
  text: string;
  urgency: EventUrgency;
  interrupt: boolean;
  repeatPolicy: string;
}

export interface AlertDisplayPayload {
  title: string;
  shortMessage: string;
  severity: EventSeverity;
  icon: string;
  colorToken: string;
  duration: number;
}
