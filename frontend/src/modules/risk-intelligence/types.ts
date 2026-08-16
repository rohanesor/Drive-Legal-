export type RiskLevel = 'SAFE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

export interface RiskFactor {
  id: string;
  type: string;
  score: number;
  confidence: number;
  severity: number;
  evidence: string[];
  source: string;
  timestamp: number;
  freshness: 'CURRENT' | 'AGING' | 'STALE' | 'UNKNOWN';
  explanation: string;
}

export interface RiskUncertainty {
  score: number;
  missingInputs: string[];
  staleInputs: string[];
  conflictingInputs: string[];
  explanation: string;
}

export interface RiskConflict {
  field: string;
  sources: string[];
  values: any[];
  confidence: number[];
  resolution: string;
  reason: string;
}

export interface RiskAssessment {
  assessmentId: string;
  timestamp: number;
  contextVersion: string;
  overallScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  uncertainty: RiskUncertainty;
  trend: 'rising' | 'falling' | 'stable' | 'volatile';
  recommendedAction: 'INFO' | 'ADVISORY' | 'WARNING' | 'URGENT';
  explanation: string;
  confidence: number;
  freshness: string;
  modelVersion: string;
  configVersion: string;
}

export interface RiskEngineConfig {
  thresholds: {
    safe: number;
    low: number;
    moderate: number;
    high: number;
  };
  factorWeights: Record<string, number>;
  aggregationStrategy: 'WEIGHTED_SUM' | 'MAX_FACTOR' | 'THRESHOLD_RULE' | 'COMPOSITE';
  hysteresis: number;
}
