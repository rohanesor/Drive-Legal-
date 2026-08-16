export interface Confidence {
  score: number; // 0 to 1
  level: 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH';
  factors: string[];
  confidenceSource: 'sensor' | 'model' | 'rule' | 'fusion' | 'external-data';
}

export interface Provenance {
  source: string;
  method: string;
  capturedAt: number;
  derivedFrom: string[];
}

export interface DriveLegalEvent<T = any> {
  // BaseEvent compatibility
  id: string;
  type: string;
  timestamp: number;

  // Canonical envelope
  eventId: string;
  eventType: string;
  eventVersion: string;
  schemaVersion: string;
  occurredAt: number;
  publishedAt: number;
  sequence: number;
  source: string;
  sourceVersion: string;
  correlationId: string;
  causationId?: string;
  requestId?: string;
  tripId: string;
  payload: T;
  metadata: {
    deviceId?: string;
    environment?: string;
    runtimeMode?: string;
    sourceType?: string;
  };
  provenance: Provenance;
  confidence: Confidence;
  trustLevel: 'TRUSTED' | 'VALIDATED' | 'UNTRUSTED';
}

export interface LocationUpdatedPayload {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  source: string;
  observedAt: number;
}

export interface VehicleUpdatedPayload {
  speed?: number;
  rpm?: number;
  fuelLevel?: number;
  batteryLevel?: number;
  ignition?: boolean;
  gear?: string;
  telemetryHealth: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  observedAt: number;
}

export interface HazardDetectedPayload {
  hazardType: 'pedestrian' | 'obstacle' | 'pothole' | 'collision-risk' | 'roadwork' | 'debris';
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: { latitude: number; longitude: number };
  confidence: number;
  detectedAt: number;
  source: string;
}

export interface RiskChangedPayload {
  previousLevel: 'UNKNOWN' | 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  currentLevel: 'UNKNOWN' | 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  score: number;
  factors: string[];
  confidence: number;
  evaluatedAt: number;
}

export interface LegalContextChangedPayload {
  restrictionType: string;
  restriction: string;
  applicability: string;
  source: string;
  confidence: number;
  effectiveFrom: number;
  effectiveUntil?: number;
}

export interface NavigationUpdatedPayload {
  routeId: string;
  destination: string;
  distanceRemaining: number;
  durationRemaining: number;
  navigationState: string;
  routeConfidence: number;
  updatedAt: number;
}

export interface AlertCreatedPayload {
  alertId: string;
  category: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  source: string;
  expiresAt?: number;
  requiresAcknowledgement: boolean;
}

export interface AgentProposalPayload {
  proposalId: string;
  agentId: string;
  intent: string;
  action: string;
  arguments: any;
  confidence: number;
  rationaleSummary?: string;
}

export interface PolicyDecisionPayload {
  decision: 'ALLOW' | 'DENY' | 'REQUIRE_CONFIRMATION' | 'DEFER' | 'SAFE_FALLBACK';
  action: string;
  policyVersion: string;
  policiesEvaluated: string[];
  reason: string;
  riskLevel: string;
}

export interface ActionExecutedPayload {
  actionId: string;
  actionType: string;
  actor: string;
  result: string;
  executedAt: number;
}
