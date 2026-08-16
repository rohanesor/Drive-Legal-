export interface ObservationRecord {
  observationId: string;
  eventId: string;
  source: string;
  type: string;
  value: any;
  confidence: number;
  observedAt: number;
  freshness: number;
}

export interface DecisionRecord {
  decisionId: string;
  timestamp: number;
  tripId: string;
  correlationId: string;
  triggeringEventId: string;
  decisionType: string;
  inputs: {
    location?: { latitude: number; longitude: number };
    speed?: number;
    speedLimit?: number;
    road?: string;
    route?: string;
    vehicle?: string;
    risk?: number;
    legal?: string;
    driverContext?: string;
    connectivity?: string;
    perceptionHealth?: string;
  };
  observations: ObservationRecord[];
  riskAssessment: {
    riskLevel: 'UNKNOWN' | 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
    riskScore: number;
    riskFactors: string[];
    confidence: number;
    riskEngineVersion: string;
    evaluatedAt: number;
  };
  legalAssessment: {
    applicableRules: string[];
    restriction: string;
    jurisdiction: string;
    source: string;
    confidence: number;
    legalEngineVersion: string;
    evaluatedAt: number;
  };
  contextSnapshot: {
    contextVersion: string;
  };
  agentProposal?: {
    agentId: string;
    agentVersion: string;
    proposalId: string;
    intent: string;
    action: string;
    arguments: any;
    confidence: number;
    reasonSummary: string;
  };
  policyDecision: {
    decision: 'ALLOW' | 'DENY' | 'REQUIRE_CONFIRMATION' | 'DEFER' | 'SAFE_FALLBACK';
    policyVersion: string;
    rulesEvaluated: string[];
    reasonCodes: string[];
  };
  selectedAction: {
    actionId: string;
    actionType: string;
    actor: string;
    startedAt: number;
    completedAt: number;
    result: string;
  };
  rejectedActions: any[];
  outcome: {
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'NOT_OBSERVED' | 'UNKNOWN';
    observedEffect: string;
    resolved: boolean;
    followUpRequired: boolean;
    measuredAt: number;
  };
  confidence: {
    observation: number;
    risk: number;
    legal: number;
    agent: number;
    finalDecision: number;
  };
  timing: {
    triggeredAt: number;
    decisionStartedAt: number;
    decisionCompletedAt: number;
    actionStartedAt: number;
    actionCompletedAt: number;
    outcomeObservedAt: number;
    detectionLatency: number;
    decisionLatency: number;
    actionLatency: number;
    totalInterventionLatency: number;
    timingViolation?: boolean;
  };
  provenance: {
    eventChain: string[];
  };
  systemVersions: {
    runtimeVersion: string;
    riskEngineVersion: string;
    legalEngineVersion: string;
    navigationVersion: string;
    policyVersion: string;
    agentVersion: string;
    schemaVersion: string;
  };
  parentHash: string;
  hash: string;
}

export interface AuditCorrection {
  correctionId: string;
  decisionId: string;
  reason: string;
  correctedFields: Record<string, any>;
  timestamp: number;
  actor: string;
}

export interface SafetyEvaluationReport {
  scenarioId: string;
  runId: string;
  safetyScore: number;
  legalScore: number;
  reliabilityScore: number;
  latencyScore: number;
  criticalFailures: string[];
  warnings: string[];
  observations: string[];
  decisionsEvaluated: number;
  alertsEvaluated: number;
  regressionStatus: 'PASSED' | 'FAILED';
}
