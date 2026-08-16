import { DrivingEvent, DrivingIncident, DrivingEventType } from './types';

export class EventCorrelator {
  /**
   * Correlates multiple driving events into unified incidents.
   */
  static correlate(events: DrivingEvent[]): DrivingIncident[] {
    const incidents: DrivingIncident[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < events.length; i++) {
      const e1 = events[i];
      if (processedIds.has(e1.id)) continue;

      const incidentEvents: DrivingEvent[] = [e1];
      processedIds.add(e1.id);

      for (let j = i + 1; j < events.length; j++) {
        const e2 = events[j];
        if (processedIds.has(e2.id)) continue;

        const timeDiff = Math.abs(e1.timestamp - e2.timestamp);
        if (timeDiff <= 5000) {
          incidentEvents.push(e2);
          processedIds.add(e2.id);
        }
      }

      let primaryType: DrivingEventType = e1.type;
      const types = incidentEvents.map(e => e.type);

      if (types.includes('ROAD_HAZARD') && types.includes('HARSH_BRAKING')) {
        primaryType = 'COLLISION_RISK';
      }

      const severityWeights = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      let maxSeverity = e1.severity;
      for (const ev of incidentEvents) {
        if (severityWeights[ev.severity] > severityWeights[maxSeverity]) {
          maxSeverity = ev.severity;
        }
      }

      const urgencyWeights = { LOW: 0, NORMAL: 1, HIGH: 2, IMMEDIATE: 3 };
      let maxUrgency = e1.urgency;
      for (const ev of incidentEvents) {
        if (urgencyWeights[ev.urgency] > urgencyWeights[maxUrgency]) {
          maxUrgency = ev.urgency;
        }
      }

      const avgConfidence = incidentEvents.reduce((acc, ev) => acc + ev.confidence, 0) / incidentEvents.length;

      incidents.push({
        id: `inc_${e1.id.replace('evt_', '')}`,
        events: incidentEvents,
        primaryType,
        severity: maxSeverity,
        urgency: maxUrgency,
        confidence: avgConfidence,
        location: e1.location,
        createdAt: Math.min(...incidentEvents.map(e => e.timestamp)),
        updatedAt: Math.max(...incidentEvents.map(e => e.timestamp)),
        status: 'ACTIVE',
      });
    }

    return incidents;
  }
}
export default EventCorrelator;
