import { RiskFactor, RiskEngineConfig } from './types';

export class RiskScoreCalculator {
  static calculateOverallScore(
    factors: RiskFactor[],
    config: RiskEngineConfig,
    schoolZone = false,
    poorVisibility = false
  ): number {
    if (factors.length === 0) return 0.0;

    let score = 0;

    if (config.aggregationStrategy === 'MAX_FACTOR') {
      score = Math.max(...factors.map((f) => f.score));
    } else {
      let totalWeight = 0;
      factors.forEach((f) => {
        const weight = config.factorWeights[f.type] || 1.0;
        score += f.score * weight;
        totalWeight += weight;
      });
      if (totalWeight > 0) {
        score /= totalWeight;
      }
    }

    const speedFactor = factors.find((f) => f.type === 'SPEED');
    if (speedFactor && speedFactor.score > 0.5) {
      if (schoolZone) {
        score *= 1.3;
      }
      if (poorVisibility) {
        score *= 1.2;
      }
    }

    const speed = speedFactor ? speedFactor.score : 0;
    if (speed < 0.2 && !poorVisibility) {
      score *= 0.8;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }
}
export default RiskScoreCalculator;
