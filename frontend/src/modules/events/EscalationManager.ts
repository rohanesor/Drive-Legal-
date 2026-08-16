import { EventSeverity } from './types';

export class EscalationManager {
  private alertStages: Map<string, number> = new Map();

  /**
   * Evaluates and updates an alert's severity stage based on persistence history.
   */
  evaluateEscalation(alertId: string, isPersisting: boolean): EventSeverity {
    if (!isPersisting) {
      this.alertStages.delete(alertId);
      return 'LOW';
    }

    const currentStage = this.alertStages.get(alertId) || 0;
    const nextStage = Math.min(3, currentStage + 1);
    this.alertStages.set(alertId, nextStage);

    switch (nextStage) {
      case 3:
        return 'CRITICAL';
      case 2:
        return 'HIGH';
      default:
        return 'LOW';
    }
  }

  clear(): void {
    this.alertStages.clear();
  }
}
export default EscalationManager;
