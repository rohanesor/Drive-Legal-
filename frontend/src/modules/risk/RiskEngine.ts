import { DriverRiskContext, RiskScore, RiskSignal } from './types';
import { RiskSignalProcessor } from './RiskSignalProcessor';
import { RiskScorer } from './RiskScorer';
import { RiskExplanation } from './RiskExplanation';
import { 
  DEFAULT_SMOOTHING_ALPHA, 
  REACTIVE_SMOOTHING_ALPHA, 
  RISK_DECAY_RATE,
  DEFAULT_RISK_WEIGHTS 
} from './constants';

export class RiskEngine {
  private scorer: RiskScorer;
  private previousScore: number = 0;
  private previousLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';

  constructor(customWeights?: Partial<typeof DEFAULT_RISK_WEIGHTS>) {
    this.scorer = new RiskScorer(customWeights);
  }

  /**
   * Resets the temporal state (for clean test runs or session transitions).
   */
  resetState(): void {
    this.previousScore = 0;
    this.previousLevel = 'LOW';
  }

  /**
   * Evaluates the driver risk context and returns a smoothed RiskScore.
   */
  evaluate(context: DriverRiskContext): RiskScore {
    console.log('[RiskEngine] risk_evaluation_started');

    // 1. Process signals
    const signals = RiskSignalProcessor.processSignals(context);
    console.log(`[RiskEngine] risk_signals_detected count=${signals.length}`);

    // 2. Score raw metrics
    const rawResult = this.scorer.calculateScore(signals);
    const rawScore = rawResult.score;
    console.log(`[RiskEngine] risk_score_calculated rawScore=${rawScore}`);

    // 3. Temporal Smoothing & Decay
    let smoothedScore = rawScore;

    if (signals.length === 0) {
      // No active danger: apply decay
      smoothedScore = Math.max(0, this.previousScore - RISK_DECAY_RATE);
    } else if (rawResult.level === 'CRITICAL' || rawResult.level === 'HIGH') {
      // Critical/High risk: bypass smoothing to respond instantly to genuine hazards
      smoothedScore = rawScore;
    } else {
      // Danger active: apply adaptive EMA smoothing
      const diff = rawScore - this.previousScore;
      const alpha = diff > 30 ? REACTIVE_SMOOTHING_ALPHA : DEFAULT_SMOOTHING_ALPHA;
      smoothedScore = Math.round((alpha * rawScore) + ((1 - alpha) * this.previousScore));
    }

    // Clip to absolute bounds
    smoothedScore = Math.max(0, Math.min(100, smoothedScore));
    
    // Recalculate level based on smoothed score
    let smoothedLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (rawResult.level === 'CRITICAL' && rawScore >= 90) {
      smoothedLevel = 'CRITICAL';
    } else if (smoothedScore >= 90) {
      smoothedLevel = 'CRITICAL';
    } else if (smoothedScore >= 70) {
      smoothedLevel = 'HIGH';
    } else if (smoothedScore >= 40) {
      smoothedLevel = 'MODERATE';
    }

    // Trigger structured logging if level changes or critical threshold is crossed
    if (smoothedLevel !== this.previousLevel) {
      console.log(`[RiskEngine] risk_level_changed from=${this.previousLevel} to=${smoothedLevel}`);
    }

    if (smoothedLevel === 'CRITICAL' || smoothedLevel === 'HIGH') {
      console.log(`[RiskEngine] risk_alert_triggered level=${smoothedLevel} score=${smoothedScore}`);
    }

    // Update historical states
    this.previousScore = smoothedScore;
    this.previousLevel = smoothedLevel;

    // 4. Generate recommendations / explainable output
    const recommendations = RiskExplanation.generateRecommendations(
      smoothedScore,
      smoothedLevel,
      rawResult.signals
    );

    return {
      score: smoothedScore,
      level: smoothedLevel,
      signals: rawResult.signals,
      recommendations,
      confidence: rawResult.confidence,
    };
  }
}
export default RiskEngine;
