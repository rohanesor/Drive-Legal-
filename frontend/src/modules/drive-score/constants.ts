import { DriveScoreConfig } from './types';

export const DEFAULT_DRIVE_SCORE_CONFIG: DriveScoreConfig = {
  weights: {
    driverBehavior: 0.40,
    legalCompliance: 0.30,
    roadSafety: 0.20,
    environmentalRisk: 0.10,
  },
  smoothingAlpha: 0.20, // default temporal smoothing alpha
  recoveryRate: 2, // points to recover per safe interval
  legalDeductions: {
    WARNING: 5,
    POTENTIAL_VIOLATION: 12,
    CONFIRMED_VIOLATION: 25,
    CRITICAL_VIOLATION: 45,
  },
};

export const GRADE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 60,
  NEEDS_ATTENTION: 40,
};
