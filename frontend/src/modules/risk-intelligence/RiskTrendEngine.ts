import { RiskLevel, RiskEngineConfig } from './types';

export class RiskTrendEngine {
  private scoreHistory: number[] = [];
  private windowSize = 5;

  addScore(score: number): void {
    this.scoreHistory.push(score);
    if (this.scoreHistory.length > this.windowSize) {
      this.scoreHistory.shift();
    }
  }

  detectTrend(): 'rising' | 'falling' | 'stable' | 'volatile' {
    if (this.scoreHistory.length < 2) return 'stable';

    const diffs: number[] = [];
    for (let i = 1; i < this.scoreHistory.length; i++) {
      diffs.push(this.scoreHistory[i] - this.scoreHistory[i - 1]);
    }

    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

    if (avgDiff > 0.05) return 'rising';
    if (avgDiff < -0.05) return 'falling';
    return 'stable';
  }

  classifyLevel(
    score: number,
    previousLevel: RiskLevel,
    config: RiskEngineConfig
  ): RiskLevel {
    const thresholds = config.thresholds;
    const hyst = config.hysteresis || 0.02;

    if (previousLevel === 'HIGH') {
      if (score >= thresholds.high - hyst) return 'HIGH';
    } else {
      if (score >= thresholds.high) return 'HIGH';
    }

    if (previousLevel === 'MODERATE') {
      if (score >= thresholds.moderate - hyst) return 'MODERATE';
    } else {
      if (score >= thresholds.moderate) return 'MODERATE';
    }

    if (previousLevel === 'LOW') {
      if (score >= thresholds.low - hyst) return 'LOW';
    } else {
      if (score >= thresholds.low) return 'LOW';
    }

    return 'SAFE';
  }
}
export default RiskTrendEngine;
