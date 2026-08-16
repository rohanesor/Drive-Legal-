import { AlertState } from './types';

export interface ActiveAlert {
  id: string;
  type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: number;
}

export class AlertStateMachine {
  private state: AlertState = 'NONE';
  private activeAlerts: Map<string, ActiveAlert> = new Map();

  getState(): AlertState {
    return this.state;
  }

  addAlert(alert: ActiveAlert): boolean {
    this.activeAlerts.set(alert.id, alert);
    const prev = this.state;
    this.state = 'ACTIVE';
    return this.state !== prev;
  }

  resolveAlert(alertId: string): boolean {
    if (this.activeAlerts.has(alertId)) {
      this.activeAlerts.delete(alertId);
      const prev = this.state;
      if (this.activeAlerts.size === 0) {
        this.state = 'RESOLVED';
      }
      return this.state !== prev;
    }
    return false;
  }

  acknowledgeAlert(): boolean {
    const prev = this.state;
    if (this.state === 'ACTIVE') {
      this.state = 'ACKNOWLEDGED';
    }
    return this.state !== prev;
  }

  getHighestPriorityAlert(): string | undefined {
    const priorities: Record<string, number> = {
      INFO: 1,
      LOW: 2,
      MEDIUM: 3,
      HIGH: 4,
      CRITICAL: 5,
    };

    let highest: ActiveAlert | null = null;
    for (const alert of this.activeAlerts.values()) {
      if (!highest || priorities[alert.severity] > priorities[highest.severity]) {
        highest = alert;
      }
    }
    return highest?.message;
  }

  getActiveAlertsCount(): number {
    return this.activeAlerts.size;
  }

  reset(): void {
    this.state = 'NONE';
    this.activeAlerts.clear();
  }
}
export default AlertStateMachine;
