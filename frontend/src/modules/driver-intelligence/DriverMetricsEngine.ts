import { DrivingEvent, DriverMetrics } from './types';

export class DriverMetricsEngine {
  static calculateMetrics(events: DrivingEvent[]): DriverMetrics {
    const totalEvents = events.length;
    if (totalEvents === 0) {
      return {
        speedCompliance: 1.0,
        speedExcess: 0,
        hardBraking: 0,
        acceleration: 0,
        routeDeviation: 0,
        warningResponse: 1.0,
        riskExposure: 0,
        legalEvents: 0,
        dataQuality: 0.0,
      };
    }

    const speedingCount = events.filter((e) => e.type === 'SPEED_LIMIT_EXCEEDED').length;
    const brakingCount = events.filter((e) => e.type === 'HARD_BRAKING').length;
    const accelerationCount = events.filter((e) => e.type === 'RAPID_ACCELERATION').length;
    const deviationCount = events.filter((e) => e.type === 'ROUTE_DEVIATION').length;
    const legalCount = events.filter((e) => e.type === 'LEGAL_WARNING').length;

    const speedCompliance = Math.max(0.0, 1.0 - speedingCount / 10);
    const dataQuality = Math.min(1.0, totalEvents / 20);

    return {
      speedCompliance,
      speedExcess: speedingCount > 0 ? 10 : 0,
      hardBraking: brakingCount,
      acceleration: accelerationCount,
      routeDeviation: deviationCount,
      warningResponse: 1.0,
      riskExposure: events.filter((e) => e.type === 'RISK_ESCALATION').length,
      legalEvents: legalCount,
      dataQuality,
    };
  }
}
export default DriverMetricsEngine;
