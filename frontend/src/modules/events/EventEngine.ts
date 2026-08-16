import { DrivingEvent, DrivingIncident, DriverAlert, DriverAttentionState } from './types';
import { EventNormalizer } from './EventNormalizer';
import { EventCorrelator } from './EventCorrelator';
import { SeverityEngine } from './SeverityEngine';
import { UrgencyEngine } from './UrgencyEngine';
import { AlertPrioritizer } from './AlertPrioritizer';
import { AlertPolicy } from './AlertPolicy';
import { SuppressionManager } from './SuppressionManager';
import { EscalationManager } from './EscalationManager';

export class EventEngine {
  private activeEvents: DrivingEvent[] = [];
  private activeIncidents: DrivingIncident[] = [];
  private activeAlerts: DriverAlert[] = [];
  private alertTypes: Record<string, string> = {};

  private suppressionManager: SuppressionManager;
  private escalationManager: EscalationManager;
  private attentionState: DriverAttentionState = 'DRIVING';

  private listeners: Record<string, ((data: any) => void)[]> = {
    event_received: [],
    incident_created: [],
    alert_created: [],
    alert_suppressed: [],
  };

  constructor() {
    this.suppressionManager = new SuppressionManager();
    this.escalationManager = new EscalationManager();
  }

  subscribeEvent(name: string, cb: (data: any) => void): void {
    if (this.listeners[name]) {
      this.listeners[name].push(cb);
    }
  }

  private publish(name: string, data: any): void {
    if (this.listeners[name]) {
      this.listeners[name].forEach(cb => cb(data));
    }
  }

  setAttentionState(state: DriverAttentionState): void {
    this.attentionState = state;
  }

  processEvent(raw: Partial<DrivingEvent>): void {
    let normalized: DrivingEvent;
    try {
      normalized = EventNormalizer.normalize(raw);
    } catch (e) {
      console.warn(`[EventEngine] Event rejected: ${(e as Error).message}`);
      return;
    }

    normalized.severity = SeverityEngine.calculate(normalized.type, normalized.context);
    normalized.urgency = UrgencyEngine.calculate(normalized.type, normalized.context);

    this.publish('event_received', normalized);

    if (this.suppressionManager.shouldSuppress(normalized, normalized.context?.segmentId)) {
      this.publish('alert_suppressed', { eventId: normalized.id, reason: 'COOLDOWN' });
      return;
    }

    this.activeEvents.push(normalized);
    this.activeIncidents = EventCorrelator.correlate(this.activeEvents);
    this.publish('incident_created', this.activeIncidents);

    const delivery = AlertPolicy.getDeliveryModes(normalized.severity, this.attentionState);
    if (delivery.length > 0) {
      const alertId = `alert_${normalized.id.replace('evt_', '')}`;
      
      const alert: DriverAlert = {
        id: alertId,
        incidentId: `inc_${normalized.id.replace('evt_', '')}`,
        title: `ALERT_${normalized.type}`,
        message: normalized.context?.message || `Attention: ${normalized.type} detected.`,
        severity: normalized.severity,
        urgency: normalized.urgency,
        confidence: normalized.confidence,
        deliveryModes: delivery,
        createdAt: normalized.timestamp,
        expiresAt: normalized.expiresAt,
        requiresAcknowledgement: normalized.severity === 'CRITICAL',
      };

      this.alertTypes[alertId] = normalized.type;
      this.activeAlerts.push(alert);
      this.publish('alert_created', alert);
    }
  }

  getActiveAlerts(): DriverAlert[] {
    return AlertPrioritizer.prioritize(this.activeAlerts, this.alertTypes);
  }

  getRecentIncidents(): DrivingIncident[] {
    return this.activeIncidents;
  }

  getEscalationManager(): EscalationManager {
    return this.escalationManager;
  }

  explainAlert(alertId: string): string {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (!alert) return 'Alert not found or already expired.';

    const inc = this.activeIncidents.find(i => i.id === alert.incidentId);
    if (!inc) return 'Correlated incident details are missing.';

    return `Alert "${alert.title}" was raised with severity "${alert.severity}" and confidence ${(alert.confidence * 100).toFixed(0)}%. ` +
      `It correlates ${inc.events.length} sensor observations including inputs from sources: ${[...new Set(inc.events.map(e => e.source))].join(', ')}.`;
  }

  resolveEvent(type: string): void {
    this.activeEvents = this.activeEvents.filter(e => e.type !== type);
    this.activeAlerts = this.activeAlerts.filter(a => this.alertTypes[a.id] !== type);
    this.activeIncidents = EventCorrelator.correlate(this.activeEvents);
  }

  clearExpired(): void {
    const now = Date.now();
    this.activeEvents = this.activeEvents.filter(e => !e.expiresAt || e.expiresAt > now);
    this.activeAlerts = this.activeAlerts.filter(a => !a.expiresAt || a.expiresAt > now);
    this.activeIncidents = EventCorrelator.correlate(this.activeEvents);
  }
}
export default EventEngine;
