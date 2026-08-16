import { DeliveryMode, DriverAttentionState, EventSeverity } from './types';

export class AlertPolicy {
  /**
   * Translates alert severity into delivery modes based on current driver attention workload.
   */
  static getDeliveryModes(
    severity: EventSeverity,
    attentionState: DriverAttentionState = 'DRIVING'
  ): DeliveryMode[] {
    if (attentionState === 'HIGH_WORKLOAD') {
      if (severity !== 'CRITICAL') {
        return [];
      }
    }

    switch (severity) {
      case 'CRITICAL':
        return ['VOICE', 'DISPLAY', 'HAPTIC'];
      case 'HIGH':
        return ['VOICE', 'DISPLAY'];
      case 'MEDIUM':
        return ['DISPLAY'];
      default:
        return ['NOTIFICATION'];
    }
  }
}
export default AlertPolicy;
