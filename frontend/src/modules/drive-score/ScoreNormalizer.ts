import { DriveScoreConfig } from './types';

export class ScoreNormalizer {
  /**
   * Transforms P0.3 RiskScore into a normalized 0-100 Behavior Score.
   * 100 = best behavior, 0 = worst (highest risk).
   */
  static normalizeBehaviorScore(riskScore: number): number {
    return Math.max(0, Math.min(100, 100 - riskScore));
  }

  /**
   * Transforms P0.4 LegalComplianceResult into a normalized 0-100 Compliance Score.
   */
  static normalizeLegalScore(
    result: {
      violations: { severity: string; status: string }[];
      warnings: any[];
    },
    config: DriveScoreConfig
  ): number {
    let score = 100;
    const { legalDeductions } = config;

    // Apply violation deductions
    result.violations.forEach((violation) => {
      if (violation.severity === 'CRITICAL') {
        score -= legalDeductions.CRITICAL_VIOLATION;
      } else if (violation.status === 'CONFIRMED') {
        score -= legalDeductions.CONFIRMED_VIOLATION;
      } else {
        score -= legalDeductions.POTENTIAL_VIOLATION;
      }
    });

    // Apply warning deductions
    result.warnings.forEach(() => {
      score -= legalDeductions.WARNING;
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Normalizes P0.2 route safety score (already 0-100 safe rating).
   */
  static normalizeRoadSafetyScore(routeSafetyScore?: number): number {
    if (routeSafetyScore === undefined || routeSafetyScore === null) {
      return -1; // UNKNOWN indicator
    }
    return Math.max(0, Math.min(100, routeSafetyScore));
  }

  /**
   * Normalizes environmental telemetry parameters if available.
   */
  static normalizeEnvironmentalScore(envContext?: {
    weather?: 'clear' | 'rain' | 'fog' | 'storm';
    visibility?: number;
    trafficDensity?: 'low' | 'moderate' | 'heavy';
  }): number {
    if (!envContext) return -1; // UNKNOWN

    let score = 100;
    const { weather, visibility, trafficDensity } = envContext;

    if (weather === 'rain') score -= 15;
    if (weather === 'fog') score -= 25;
    if (weather === 'storm') score -= 35;

    if (visibility !== undefined && visibility < 200) {
      score -= Math.round((200 - visibility) / 5);
    }

    if (trafficDensity === 'heavy') score -= 10;
    if (trafficDensity === 'moderate') score -= 5;

    return Math.max(0, Math.min(100, score));
  }
}
export default ScoreNormalizer;
