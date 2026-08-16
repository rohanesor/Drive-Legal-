export type DriveGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_ATTENTION' | 'HIGH_RISK';
export type ScoreTrend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'UNKNOWN';

export interface ScoreComponent {
  name: 'Driver Behavior' | 'Legal Compliance' | 'Road Safety' | 'Environmental Risk';
  score: number; // 0 to 100, or -1 if UNKNOWN
  weight: number; // normalized weight (0 to 1)
  status: 'COMPLIANT' | 'WARNING' | 'VIOLATION' | 'UNKNOWN';
}

export interface ScoreIncident {
  type: string;
  severity: number;
  timestamp: number;
  scoreImpact: number; // negative value
  source: 'P0.2' | 'P0.3' | 'P0.4';
  explanation: string;
}

export interface Recommendation {
  id: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DriveScore {
  score: number; // 0 to 100
  grade: DriveGrade;
  trend: ScoreTrend;
  components: ScoreComponent[];
  incidents: ScoreIncident[];
  recommendations: Recommendation[];
  confidence: number;
  calculatedAt: number;
}

export interface DriveScoreSnapshot {
  score: number;
  timestamp: number;
  tripId: string;
  components: { name: string; score: number }[];
}

export interface DriveScoreConfig {
  weights: {
    driverBehavior: number;
    legalCompliance: number;
    roadSafety: number;
    environmentalRisk: number;
  };
  smoothingAlpha: number;
  recoveryRate: number; // points to recover per second of safe driving
  legalDeductions: {
    WARNING: number;
    POTENTIAL_VIOLATION: number;
    CONFIRMED_VIOLATION: number;
    CRITICAL_VIOLATION: number;
  };
}
