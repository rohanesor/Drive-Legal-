import { DriverMetrics } from './types';

export class DriverTrendEngine {
  static evaluateTrend(
    recentMetrics: DriverMetrics,
    historicalMetrics: DriverMetrics
  ): 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'VOLATILE' {
    const complianceDiff = recentMetrics.speedCompliance - historicalMetrics.speedCompliance;

    if (complianceDiff > 0.15) {
      return 'IMPROVING';
    } else if (complianceDiff < -0.15) {
      return 'DETERIORATING';
    }
    return 'STABLE';
  }
}
export default DriverTrendEngine;
