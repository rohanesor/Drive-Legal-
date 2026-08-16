import { EventSeverity, DrivingEventType } from './types';

export class SeverityEngine {
  /**
   * Deterministically calculates severity levels for driving events.
   */
  static calculate(
    type: DrivingEventType,
    context: {
      speed?: number;
      speedLimit?: number;
      riskScore?: number;
      distanceMeters?: number;
    } = {}
  ): EventSeverity {
    if (type === 'SPEEDING_DETECTED') {
      const speed = context.speed ?? 0;
      const limit = context.speedLimit ?? 50;
      const over = speed - limit;

      if (over >= 40) return 'CRITICAL';
      if (over >= 20) return 'HIGH';
      if (over > 0) return 'LOW';
    }

    if (type === 'COLLISION_RISK') {
      return 'CRITICAL';
    }

    if (type === 'ROAD_HAZARD' || type === 'NO_ENTRY' || type === 'ROUTE_DEVIATION') {
      return 'HIGH';
    }

    if (type === 'HARSH_BRAKING' || type === 'RAPID_ACCELERATION' || type === 'LOW_BATTERY') {
      return 'MEDIUM';
    }

    return 'INFO';
  }
}
export default SeverityEngine;
