import { EventUrgency, DrivingEventType } from './types';

export class UrgencyEngine {
  /**
   * Deterministically calculates urgency levels based on approximate time-to-event metrics.
   */
  static calculate(
    type: DrivingEventType,
    context: {
      speedKmH?: number;
      distanceMeters?: number;
    } = {}
  ): EventUrgency {
    if (type === 'COLLISION_RISK') {
      return 'IMMEDIATE';
    }

    if (context.speedKmH !== undefined && context.distanceMeters !== undefined) {
      const speedMS = context.speedKmH / 3.6;
      if (speedMS > 0) {
        const timeToEventSeconds = context.distanceMeters / speedMS;
        
        if (timeToEventSeconds <= 3) return 'IMMEDIATE';
        if (timeToEventSeconds <= 8) return 'HIGH';
        if (timeToEventSeconds <= 20) return 'NORMAL';
      }
    }

    return 'LOW';
  }
}
export default UrgencyEngine;
