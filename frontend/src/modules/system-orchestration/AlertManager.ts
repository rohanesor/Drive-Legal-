import { Alert, AlertState } from './types';

export class AlertManager {
  private activeAlerts: Map<string, Alert> = new Map();
  private deliveryHistory: Alert[] = [];

  createAlert(
    fingerprint: string,
    priority: Alert['priority'],
    lifetimeMs: number,
    payload: any
  ): Alert | null {
    const existing = this.activeAlerts.get(fingerprint);
    if (existing && existing.state !== 'EXPIRED' && existing.state !== 'CANCELLED') {
      console.log(`[AlertManager] Suppressed duplicate alert with fingerprint: ${fingerprint}`);
      return null;
    }

    const alert: Alert = {
      alertId: `al_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      fingerprint,
      priority,
      state: 'CREATED',
      createdAt: Date.now(),
      expiresAt: Date.now() + lifetimeMs,
      payload,
    };

    this.activeAlerts.set(fingerprint, alert);
    this.deliveryHistory.push(alert);
    return alert;
  }

  deliverAlert(alertId: string): void {
    for (const alert of this.activeAlerts.values()) {
      if (alert.alertId === alertId) {
        alert.state = 'DELIVERED';
      }
    }
  }

  expireAlerts(): void {
    const now = Date.now();
    for (const [fingerprint, alert] of this.activeAlerts.entries()) {
      if (now > alert.expiresAt && alert.state !== 'EXPIRED') {
        alert.state = 'EXPIRED';
        this.activeAlerts.delete(fingerprint);
      }
    }
  }

  getDeliveryHistory(): Alert[] {
    return this.deliveryHistory;
  }

  reset(): void {
    this.activeAlerts.clear();
    this.deliveryHistory = [];
  }
}
export default AlertManager;
