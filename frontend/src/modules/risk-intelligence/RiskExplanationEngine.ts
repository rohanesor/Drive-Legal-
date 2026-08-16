import { RiskFactor, RiskLevel } from './types';

export class RiskExplanationEngine {
  static generateExplanation(factors: RiskFactor[], level: RiskLevel): string {
    if (factors.length === 0 || level === 'SAFE') {
      return 'Driving conditions are normal and safe.';
    }

    const elevated = factors.filter((f) => f.score > 0.4);
    if (elevated.length === 0) {
      return 'No significant risk factors detected.';
    }

    const reasons = elevated.map((f) => f.explanation.toLowerCase());
    return `Risk is classified as ${level} because of: ${reasons.join(', ')}.`;
  }
}
export default RiskExplanationEngine;
