import { DriverMetrics } from './types';

export class DriverRecommendationEngine {
  static generateRecommendations(metrics: DriverMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.speedCompliance < 0.9) {
      recommendations.push(
        'Your recent driving shows frequent speed-limit exceedances. Consider enabling earlier speed-limit alerts.'
      );
    }

    if (metrics.hardBraking > 3) {
      recommendations.push(
        'Frequent hard braking events detected. Consider increasing following distance to improve safety.'
      );
    }

    return recommendations;
  }
}
export default DriverRecommendationEngine;
