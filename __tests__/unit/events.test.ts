import { EventEngine } from '../../frontend/src/modules/events/EventEngine';
import { EventNormalizer } from '../../frontend/src/modules/events/EventNormalizer';
import { SeverityEngine } from '../../frontend/src/modules/events/SeverityEngine';
import { UrgencyEngine } from '../../frontend/src/modules/events/UrgencyEngine';
import { AlertPolicy } from '../../frontend/src/modules/events/AlertPolicy';

describe('Real-Time Event & Alert Engine (P1.5)', () => {
  let engine: EventEngine;

  beforeEach(() => {
    engine = new EventEngine();
  });

  test('1. Event normalization converts input attributes', () => {
    const raw = {
      type: 'SPEED_LIMIT_CHANGED' as const,
      source: 'P1.2_PERCEPTION' as const,
      confidence: 0.92,
      context: { value: 60 },
    };

    const normalized = EventNormalizer.normalize(raw);
    expect(normalized.category).toBe('SAFETY');
    expect(normalized.confidence).toBe(0.92);
  });

  test('2. Event validation rejects invalid speed inputs', () => {
    expect(() => {
      EventNormalizer.normalize({
        type: 'SPEEDING_DETECTED' as const,
        context: { speed: -10 },
      });
    }).toThrow('Speed cannot be negative');
  });

  test('3. Severity engine maps deterministic speeding tiers', () => {
    // Over limit: speed 62 vs limit 60 = LOW
    const lowSev = SeverityEngine.calculate('SPEEDING_DETECTED', { speed: 62, speedLimit: 60 });
    expect(lowSev).toBe('LOW');

    // Over limit: speed 95 vs limit 60 = HIGH
    const highSev = SeverityEngine.calculate('SPEEDING_DETECTED', { speed: 95, speedLimit: 60 });
    expect(highSev).toBe('HIGH');

    // Over limit: speed 130 vs limit 60 = CRITICAL
    const critSev = SeverityEngine.calculate('SPEEDING_DETECTED', { speed: 130, speedLimit: 60 });
    expect(critSev).toBe('CRITICAL');
  });

  test('4. Urgency engine calculates time to event threshold boundaries', () => {
    // 500m at 100km/h (27.7 m/s) -> 18 seconds -> NORMAL
    const normUrg = UrgencyEngine.calculate('TOLL_APPROACHING', { speedKmH: 100, distanceMeters: 500 });
    expect(normUrg).toBe('NORMAL');

    // 50m at 100km/h -> 1.8 seconds -> IMMEDIATE
    const immUrg = UrgencyEngine.calculate('TOLL_APPROACHING', { speedKmH: 100, distanceMeters: 50 });
    expect(immUrg).toBe('IMMEDIATE');
  });

  test('5. Delivery alert policies conform to attention workload states', () => {
    // High workload suppresses everything non-critical
    const normalModes = AlertPolicy.getDeliveryModes('HIGH', 'DRIVING');
    expect(normalModes).toContain('VOICE');
    expect(normalModes).toContain('DISPLAY');

    const highWorkloadModes = AlertPolicy.getDeliveryModes('HIGH', 'HIGH_WORKLOAD');
    expect(highWorkloadModes.length).toBe(0); // Suppressed

    const highWorkloadCritical = AlertPolicy.getDeliveryModes('CRITICAL', 'HIGH_WORKLOAD');
    expect(highWorkloadCritical.length).toBeGreaterThan(0); // CRITICAL passes through workload filters
  });

  test('6. Suppression Manager deduplicates repeat events', () => {
    engine.processEvent({
      type: 'SPEEDING_DETECTED',
      source: 'P0.4_LEGAL',
      context: { speed: 70, speedLimit: 60, segmentId: 'seg_1' },
    });

    let suppressedEvent = false;
    engine.subscribeEvent('alert_suppressed', (e) => {
      if (e.reason === 'COOLDOWN') {
        suppressedEvent = true;
      }
    });

    // Re-submit identical event type immediately
    engine.processEvent({
      type: 'SPEEDING_DETECTED',
      source: 'P0.4_LEGAL',
      context: { speed: 71, speedLimit: 60, segmentId: 'seg_1' },
    });

    expect(suppressedEvent).toBe(true);
  });

  test('7. Escalation manager controls stages severity increments', () => {
    const esc = engine.getEscalationManager();
    
    // First evaluation: low warning
    const s1 = esc.evaluateEscalation('speeding_alert', true);
    expect(s1).toBe('LOW');

    // Persists -> High
    const s2 = esc.evaluateEscalation('speeding_alert', true);
    expect(s2).toBe('HIGH');

    // Persists -> Critical
    const s3 = esc.evaluateEscalation('speeding_alert', true);
    expect(s3).toBe('CRITICAL');
  });

  test('8. Expiration sweeps filtered TTL entries', async () => {
    engine.processEvent({
      type: 'SPEEDING_DETECTED',
      source: 'P0.4_LEGAL',
      timestamp: Date.now(),
      expiresAt: Date.now() + 50, // expires in 50ms
    });

    expect(engine.getActiveAlerts().length).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 60));
    engine.clearExpired();

    expect(engine.getActiveAlerts().length).toBe(0);
  });

  // Integration scenarios
  test('Integration Scenario 1: Multi-sensor cluster correlates into unified collision hazard incident', () => {
    // 1. Perception hazard
    engine.processEvent({
      id: 'evt_perception_1',
      type: 'ROAD_HAZARD',
      source: 'P1.2_PERCEPTION',
      timestamp: Date.now(),
    });

    // 2. Telemetry harsh brake
    engine.processEvent({
      id: 'evt_vehicle_1',
      type: 'HARSH_BRAKING',
      source: 'P1.3_VEHICLE',
      timestamp: Date.now() + 100, // within 5 seconds correlation window
    });

    const incidents = engine.getRecentIncidents();
    expect(incidents.length).toBe(1);
    expect(incidents[0].primaryType).toBe('COLLISION_RISK'); // correlated!
    expect(incidents[0].events.length).toBe(2);
  });

  test('Integration Scenario 2: Active incident de-escalates and resolves on recovery', () => {
    engine.processEvent({
      id: 'evt_1',
      type: 'SPEEDING_DETECTED',
      source: 'P0.4_LEGAL',
    });

    expect(engine.getActiveAlerts().length).toBe(1);

    // Driver returns to legal speed -> resolveEvent
    engine.resolveEvent('SPEEDING_DETECTED');
    expect(engine.getActiveAlerts().length).toBe(0);
    expect(engine.getRecentIncidents().length).toBe(0);
  });

  test('Performance test: processes 100+ events/sec without degradation', () => {
    const start = Date.now();
    const count = 150;

    for (let i = 0; i < count; i++) {
      engine.processEvent({
        id: `evt_perf_${i}`,
        type: 'TURN_APPROACHING',
        source: 'P1.4_NAVIGATION',
        confidence: 0.9,
      });
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // must process all within 100ms
  });
});
