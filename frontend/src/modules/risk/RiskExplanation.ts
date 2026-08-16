import { RiskScore, RiskSignal, Recommendation } from './types';

export class RiskExplanation {
  /**
   * Generates actionable driver recommendations based on active risk signals and severity levels.
   */
  static generateRecommendations(
    score: number,
    level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
    signals: RiskSignal[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (level === 'CRITICAL') {
      recommendations.push({
        id: 'critical_emergency',
        message: '🚨 CRITICAL WARNING: Dangerous driving patterns detected in high-risk zones. Slow down immediately!',
        priority: 'CRITICAL',
      });
    }

    // Check individual signals
    const speeding = signals.find((s) => s.type === 'SPEEDING');
    if (speeding) {
      recommendations.push({
        id: 'rec_speeding',
        message: speeding.severity > 0.6 
          ? 'Reduce speed immediately. You are significantly exceeding the legal speed limit.' 
          : 'Check speedometer and align speed with the current road speed limit.',
        priority: speeding.severity > 0.6 ? 'HIGH' : 'MEDIUM',
      });
    }

    const schoolZone = signals.find((s) => s.type === 'SCHOOL_ZONE');
    if (schoolZone) {
      recommendations.push({
        id: 'rec_school_zone',
        message: 'Entering active school zone. Reduce speed and keep a sharp lookout for children crossing.',
        priority: 'HIGH',
      });
    }

    const pedestrianZone = signals.find((s) => s.type === 'PEDESTRIAN_ZONE');
    if (pedestrianZone) {
      recommendations.push({
        id: 'rec_pedestrian',
        message: 'Pedestrian-heavy area ahead. Maintain low speeds and yield right-of-way.',
        priority: 'HIGH',
      });
    }

    const harshBraking = signals.find((s) => s.type === 'HARSH_BRAKING');
    if (harshBraking) {
      recommendations.push({
        id: 'rec_braking',
        message: 'Harsh braking detected. Maintain a greater safety buffer distance with leading vehicles.',
        priority: 'MEDIUM',
      });
    }

    const rapidAcc = signals.find((s) => s.type === 'RAPID_ACCELERATION');
    if (rapidAcc) {
      recommendations.push({
        id: 'rec_acceleration',
        message: 'Avoid rapid acceleration to conserve fuel and prevent losing control on curves.',
        priority: 'LOW',
      });
    }

    const visibility = signals.find((s) => s.type === 'LOW_VISIBILITY');
    const weather = signals.find((s) => s.type === 'WEATHER_RISK');
    if (visibility || weather) {
      recommendations.push({
        id: 'rec_env',
        message: 'Visibility or road traction is impaired. Turn on hazard/fog lights and reduce speed.',
        priority: 'MEDIUM',
      });
    }

    const repeated = signals.find((s) => s.type === 'REPEATED_RISK_BEHAVIOR');
    if (repeated) {
      recommendations.push({
        id: 'rec_habit',
        message: 'Risky driving pattern detected. Aggressive maneuvers negatively impact safety scores.',
        priority: 'HIGH',
      });
    }

    // Default recommendation if no active signals
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec_safe',
        message: 'Keep up the good driving! Maintain safe speeds and follow traffic signals.',
        priority: 'LOW',
      });
    }

    return recommendations;
  }
}
