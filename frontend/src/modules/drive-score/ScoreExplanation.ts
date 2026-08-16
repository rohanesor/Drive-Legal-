import { ScoreComponent, ScoreIncident, Recommendation } from './types';

export class ScoreExplanation {
  /**
   * Generates driver-facing text explaining score values and trends based on component deficits.
   */
  static generateExplanation(components: ScoreComponent[], incidents: ScoreIncident[]): string {
    const deficits: string[] = [];

    // Check components
    const behavior = components.find((c) => c.name === 'Driver Behavior');
    if (behavior && behavior.score !== -1 && behavior.score < 80) {
      deficits.push('repeated aggressive driver behavior or high-risk inputs');
    }

    const legal = components.find((c) => c.name === 'Legal Compliance');
    if (legal && legal.score !== -1 && legal.score < 85) {
      deficits.push('legal traffic rule infractions');
    }

    const road = components.find((c) => c.name === 'Road Safety');
    if (road && road.score !== -1 && road.score < 75) {
      deficits.push('traversing high-risk or accident-prone corridors');
    }

    if (deficits.length === 0) {
      return 'Your score is high because of consistent safe driving and strict rule compliance.';
    }

    if (deficits.length === 1) {
      return `Your score decreased primarily because of ${deficits[0]}.`;
    }

    return `Your score decreased primarily because of ${deficits.slice(0, -1).join(', ')} and ${deficits[deficits.length - 1]}.`;
  }

  /**
   * Generates driver recommendations from actual telemetry/incidents signals.
   */
  static generateRecommendations(components: ScoreComponent[], incidents: ScoreIncident[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const behavior = components.find((c) => c.name === 'Driver Behavior');
    if (behavior && behavior.score !== -1 && behavior.score < 80) {
      recommendations.push({
        id: 'rec_behavior_smooth',
        message: 'Maintain smoother acceleration and avoid aggressive braking.',
        priority: behavior.score < 50 ? 'HIGH' : 'MEDIUM',
      });
    }

    const legal = components.find((c) => c.name === 'Legal Compliance');
    if (legal && legal.score !== -1 && legal.score < 85) {
      recommendations.push({
        id: 'rec_legal_limits',
        message: 'Watch speed limits and strictly align your speed with legal thresholds.',
        priority: legal.score < 60 ? 'HIGH' : 'MEDIUM',
      });
    }

    const road = components.find((c) => c.name === 'Road Safety');
    if (road && road.score !== -1 && road.score < 75) {
      recommendations.push({
        id: 'rec_road_alternatives',
        message: 'Consider choosing safer alternative routes suggested in navigation settings.',
        priority: 'MEDIUM',
      });
    }

    const env = components.find((c) => c.name === 'Environmental Risk');
    if (env && env.score !== -1 && env.score < 80) {
      recommendations.push({
        id: 'rec_env_care',
        message: 'Visibility or road traction is low. Drive with extra care under adverse conditions.',
        priority: 'LOW',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec_excellent_safe',
        message: 'Drive safely and keep following the active route recommendations.',
        priority: 'LOW',
      });
    }

    return recommendations;
  }
}
export default ScoreExplanation;
