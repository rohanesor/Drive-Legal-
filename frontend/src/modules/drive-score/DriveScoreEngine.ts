import { 
  DriveScore, 
  ScoreComponent, 
  ScoreIncident, 
  DriveGrade, 
  ScoreTrend, 
  DriveScoreConfig, 
  Recommendation 
} from './types';
import { ScoreNormalizer } from './ScoreNormalizer';
import { ScoreAggregator } from './ScoreAggregator';
import { ScoreExplanation } from './ScoreExplanation';
import { ScoreHistory } from './ScoreHistory';
import { DEFAULT_DRIVE_SCORE_CONFIG, GRADE_THRESHOLDS } from './constants';

export class DriveScoreEngine {
  private config: DriveScoreConfig;
  private previousScore: number = 100;
  private isFirstRun: boolean = true;
  private historyManager: ScoreHistory;

  constructor(customConfig?: Partial<DriveScoreConfig>) {
    this.config = {
      ...DEFAULT_DRIVE_SCORE_CONFIG,
      ...customConfig,
    };
    this.historyManager = new ScoreHistory();
  }

  /**
   * Resets the score and state (useful for starting new trips).
   */
  resetState(): void {
    this.previousScore = 100;
    this.isFirstRun = true;
    this.historyManager.clear();
  }

  /**
   * Main orchestrator computing the DriveScore based on P0.2, P0.3, and P0.4 outputs.
   */
  calculate(inputs: {
    routeSafetyScore?: number;
    driverRiskResult?: { score: number; signals: { type: string; severity: number; explanation: string }[] };
    legalComplianceResult?: { 
      overallStatus: string; 
      violations: { type: string; severity: string; status: string; explanation: string; confidence: number }[];
      warnings: { type: string; severity: string; message: string; ruleId: string }[];
    };
    environmentalContext?: { weather?: 'clear' | 'rain' | 'fog' | 'storm'; visibility?: number; trafficDensity?: 'low' | 'moderate' | 'heavy' };
    baseEvidenceConfidence?: number;
    tripId?: string;
  }): DriveScore {
    console.log('[DriveScoreEngine] drive_score_calculation_started');

    // 1. Normalize individual sub-scores
    const behaviorScore = inputs.driverRiskResult 
      ? ScoreNormalizer.normalizeBehaviorScore(inputs.driverRiskResult.score)
      : -1;

    const legalScore = inputs.legalComplianceResult
      ? ScoreNormalizer.normalizeLegalScore(inputs.legalComplianceResult, this.config)
      : -1;

    const roadScore = ScoreNormalizer.normalizeRoadSafetyScore(inputs.routeSafetyScore);
    const envScore = ScoreNormalizer.normalizeEnvironmentalScore(inputs.environmentalContext);

    // Setup initial status tags
    const behaviorStatus = behaviorScore === -1 ? 'UNKNOWN' : behaviorScore >= 75 ? 'COMPLIANT' : 'VIOLATION';
    const legalStatus = inputs.legalComplianceResult 
      ? (inputs.legalComplianceResult.overallStatus as any) 
      : 'UNKNOWN';
    const roadStatus = roadScore === -1 ? 'UNKNOWN' : roadScore >= 75 ? 'COMPLIANT' : 'WARNING';
    const envStatus = envScore === -1 ? 'UNKNOWN' : envScore >= 75 ? 'COMPLIANT' : 'WARNING';

    const inputComponents: Omit<ScoreComponent, 'weight'>[] = [
      { name: 'Driver Behavior', score: behaviorScore, status: behaviorStatus },
      { name: 'Legal Compliance', score: legalScore, status: legalStatus },
      { name: 'Road Safety', score: roadScore, status: roadStatus },
      { name: 'Environmental Risk', score: envScore, status: envStatus },
    ];

    // 2. Map incoming alerts into structured ScoreIncidents
    const incidents: ScoreIncident[] = [];
    const timestamp = Date.now();

    if (inputs.driverRiskResult) {
      inputs.driverRiskResult.signals.forEach((sig) => {
        incidents.push({
          type: sig.type,
          severity: sig.severity,
          timestamp,
          scoreImpact: -Math.round(sig.severity * 15),
          source: 'P0.3',
          explanation: sig.explanation,
        });
      });
    }

    if (inputs.legalComplianceResult) {
      inputs.legalComplianceResult.violations.forEach((v) => {
        incidents.push({
          type: v.type,
          severity: v.severity === 'CRITICAL' ? 1.0 : v.severity === 'HIGH' ? 0.8 : 0.5,
          timestamp,
          scoreImpact: v.severity === 'CRITICAL' ? -45 : v.status === 'CONFIRMED' ? -25 : -12,
          source: 'P0.4',
          explanation: v.explanation,
        });
      });

      inputs.legalComplianceResult.warnings.forEach((w) => {
        incidents.push({
          type: w.type,
          severity: 0.3,
          timestamp,
          scoreImpact: -5,
          source: 'P0.4',
          explanation: w.message,
        });
      });
    }

    // 3. Aggregate component scores applying weight normalization
    const baseEvidence = inputs.baseEvidenceConfidence ?? 1.0;
    const aggregation = ScoreAggregator.aggregate(inputComponents, this.config, baseEvidence);
    const rawScore = aggregation.score;
    console.log(`[DriveScoreEngine] component_score_calculated rawScore=${rawScore}`);

    // 4. Temporal Smoothing & Safe Recovery
    let finalScore = rawScore;
    const isCriticalActive = incidents.some((i) => i.severity >= 0.9 || i.scoreImpact <= -35);

    if (isCriticalActive) {
      // Critical override: bypass temporal smoothing and cap score
      finalScore = Math.min(rawScore, 60);
      this.isFirstRun = false;
      console.log('[DriveScoreEngine] critical_score_event triggered');
    } else if (this.isFirstRun) {
      finalScore = rawScore;
      this.isFirstRun = false;
    } else {
      // Apply standard smoothing
      const smoothed = (this.config.smoothingAlpha * rawScore) + ((1 - this.config.smoothingAlpha) * this.previousScore);
      
      if (rawScore > this.previousScore) {
        // Enforce recovery rate caps
        const maxRecovered = this.previousScore + this.config.recoveryRate;
        finalScore = Math.round(Math.min(smoothed, maxRecovered));
        console.log('[DriveScoreEngine] score_recovered');
      } else {
        finalScore = Math.round(smoothed);
        console.log('[DriveScoreEngine] score_decreased');
      }
    }

    // Clip score
    finalScore = Math.max(0, Math.min(100, finalScore));
    this.previousScore = finalScore;

    // Determine DriveGrade
    let grade: DriveGrade = 'HIGH_RISK';
    if (finalScore >= GRADE_THRESHOLDS.EXCELLENT) {
      grade = 'EXCELLENT';
    } else if (finalScore >= GRADE_THRESHOLDS.GOOD) {
      grade = 'GOOD';
    } else if (finalScore >= GRADE_THRESHOLDS.FAIR) {
      grade = 'FAIR';
    } else if (finalScore >= GRADE_THRESHOLDS.NEEDS_ATTENTION) {
      grade = 'NEEDS_ATTENTION';
    }

    // Add trip snap history
    const tripId = inputs.tripId || 'temp_trip';
    const componentsSnapshot = aggregation.aggregatedComponents.map((c) => ({
      name: c.name,
      score: c.score,
    }));
    this.historyManager.addSnapshot({
      score: finalScore,
      timestamp,
      tripId,
      components: componentsSnapshot,
    });

    const trend = this.historyManager.calculateTrend();
    console.log(`[DriveScoreEngine] drive_score_calculated score=${finalScore} grade=${grade} trend=${trend}`);

    // Generate explanations and advice
    const recommendations = ScoreExplanation.generateRecommendations(aggregation.aggregatedComponents, incidents);

    return {
      score: finalScore,
      grade,
      trend,
      components: aggregation.aggregatedComponents,
      incidents,
      recommendations,
      confidence: aggregation.confidence,
      calculatedAt: timestamp,
    };
  }

  getHistoryManager(): ScoreHistory {
    return this.historyManager;
  }
}
export default DriveScoreEngine;
