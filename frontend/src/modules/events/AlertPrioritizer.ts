import { DriverAlert } from './types';

export class AlertPrioritizer {
  private static priorityMap: Record<string, number> = {
    COLLISION_RISK: 10,
    ROAD_HAZARD: 9,
    NO_ENTRY: 8,
    SPEEDING_DETECTED: 7,
    ROUTE_DEVIATION: 6,
    TURN_APPROACHING: 5,
    LOW_BATTERY: 4,
    SCHOOL_ZONE: 3,
    TOLL_APPROACHING: 2,
  };

  /**
   * Sorts active alerts in descending priority order.
   */
  static prioritize(alerts: DriverAlert[], alertTypes: Record<string, string>): DriverAlert[] {
    return [...alerts].sort((a, b) => {
      const typeA = alertTypes[a.id] || '';
      const typeB = alertTypes[b.id] || '';
      
      const pA = this.priorityMap[typeA] || 0;
      const pB = this.priorityMap[typeB] || 0;

      if (pA !== pB) return pB - pA;
      
      const sevWeights = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      return sevWeights[b.severity] - sevWeights[a.severity];
    });
  }
}
export default AlertPrioritizer;
