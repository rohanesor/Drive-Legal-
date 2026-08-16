import { RiskSignal, RiskScore, Recommendation } from './types';
import { RiskWeights, DEFAULT_RISK_WEIGHTS, RISK_LEVEL_THRESHOLDS } from './constants';

export class RiskScorer {
  private weights: RiskWeights;

  constructor(customWeights?: Partial<RiskWeights>) {
    this.weights = {
      ...DEFAULT_RISK_WEIGHTS,
      ...customWeights,
    };
  }

  /**
   * Evaluates the list of active risk signals, applies weight coefficients,
   * calculates final scores, and executes risk escalation rules.
   */
  calculateScore(signals: RiskSignal[]): Omit<RiskScore, 'recommendations'> {
    let totalScore = 0;

    // Apply weights to calculate signal contribution and sum raw score
    const processedSignals = signals.map((signal) => {
      const weight = this.weights[signal.type as keyof RiskWeights] || 0.10;
      const contribution = Math.min(100, Math.round(signal.severity * weight * 100));
      totalScore += signal.severity * weight * 100;
      
      return {
        ...signal,
        contribution,
      };
    });

    // Boost score if individual signals are highly severe (extreme danger indicators)
    let booster = 0;
    const extremeSpeeding = processedSignals.find(s => s.type === 'SPEEDING' && s.severity >= 1.0);
    const extremeBraking = processedSignals.find(s => s.type === 'HARSH_BRAKING' && s.severity >= 0.7);

    if (extremeSpeeding) booster += 45;
    if (extremeBraking) booster += 35;

    let finalScore = Math.min(100, Math.round(totalScore + booster));

    // 1. Risk Escalation Rules
    const isSpeeding = processedSignals.find((s) => s.type === 'SPEEDING');
    const isHighRiskRoad = processedSignals.find((s) => s.type === 'HIGH_RISK_ROAD');
    const isSchoolZone = processedSignals.find((s) => s.type === 'SCHOOL_ZONE');
    const isPedestrianZone = processedSignals.find((s) => s.type === 'PEDESTRIAN_ZONE');

    let isEscalatedToCritical = false;

    // Excessive speeding (> 0.5 severity) + High-risk road (> 0.4 severity) + school/pedestrian zone
    if (
      isSpeeding && isSpeeding.severity > 0.5 &&
      isHighRiskRoad && isHighRiskRoad.severity > 0.4 &&
      (isSchoolZone || isPedestrianZone)
    ) {
      isEscalatedToCritical = true;
      finalScore = Math.max(finalScore, 92); // Escalate score to critical range
    }

    // Determine risk level based on thresholds
    let level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (isEscalatedToCritical || finalScore >= 90) {
      level = 'CRITICAL';
    } else if (finalScore >= RISK_LEVEL_THRESHOLDS.HIGH) {
      level = 'HIGH';
    } else if (finalScore >= RISK_LEVEL_THRESHOLDS.MODERATE) {
      level = 'MODERATE';
    }

    // Confidence scoring based on active signals presence and metadata quality
    const confidence = signals.length > 0 ? 0.95 : 1.0;

    return {
      score: finalScore,
      level,
      signals: processedSignals,
      confidence,
    };
  }
}
