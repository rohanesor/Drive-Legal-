import { DriverIntelligenceEngine } from '../../frontend/src/modules/driver-intelligence/DriverIntelligenceEngine';
import { DriverMetricsEngine } from '../../frontend/src/modules/driver-intelligence/DriverMetricsEngine';
import { DriverTrendEngine } from '../../frontend/src/modules/driver-intelligence/DriverTrendEngine';
import { DriverRecommendationEngine } from '../../frontend/src/modules/driver-intelligence/DriverRecommendationEngine';
import { DrivingEvent } from '../../frontend/src/modules/driver-intelligence/types';

describe('Driver Intelligence & Personalization Engine (P2.12)', () => {
  let engine: DriverIntelligenceEngine;
  let speedingEvent: DrivingEvent;

  beforeEach(() => {
    engine = new DriverIntelligenceEngine();
    speedingEvent = {
      eventId: 'evt_speeding',
      type: 'SPEED_LIMIT_EXCEEDED',
      timestamp: Date.now(),
      confidence: 0.95,
      source: 'gps-adapter',
      metadata: { excess: 12 },
    };
  });

  test('1. DriverProfile initializes with insufficient data and scales state upon events', () => {
    const profile1 = engine.getProfile();
    expect(profile1.baselineState).toBe('INSUFFICIENT_DATA');
    expect(engine.getDriveScore().confidence).toBe(0.4);

    // Push 5 events to establish baseline
    for (let i = 0; i < 5; i++) {
      engine.recordEvent({
        ...speedingEvent,
        eventId: `evt_speeding_${i}`,
      });
    }

    const profile2 = engine.getProfile();
    expect(profile2.baselineState).toBe('ESTABLISHED');
    expect(engine.getDriveScore().confidence).toBe(0.9);
  });

  test('2. DriverMetricsEngine compiles compliance rate and handles hard braking metrics', () => {
    const events: DrivingEvent[] = [
      speedingEvent,
      {
        eventId: 'evt_braking',
        type: 'HARD_BRAKING',
        timestamp: Date.now(),
        confidence: 0.9,
        source: 'accelerometer',
        metadata: {},
      },
    ];

    const metrics = DriverMetricsEngine.calculateMetrics(events);
    expect(metrics.speedCompliance).toBe(0.9); // 1 speeding event reduces compliance
    expect(metrics.hardBraking).toBe(1);
    expect(metrics.dataQuality).toBeCloseTo(0.1); // small sample size
  });

  test('3. DriverTrendEngine filters single occurrences and smooths trends', () => {
    const historical = DriverMetricsEngine.calculateMetrics([]);
    const recent = DriverMetricsEngine.calculateMetrics([speedingEvent]);

    // Single speeding event compliance drop is small -> stable trend
    const trend = DriverTrendEngine.evaluateTrend(recent, historical);
    expect(trend).toBe('STABLE');
  });

  test('4. DriverRecommendationEngine maps non-judgmental advices', () => {
    const metrics = DriverMetricsEngine.calculateMetrics([
      speedingEvent,
      speedingEvent, // 2 speeding events reduce compliance below 0.9
    ]);

    const recs = DriverRecommendationEngine.generateRecommendations(metrics);
    expect(recs[0]).toContain('frequent speed-limit exceedances');
  });

  test('5. DriverIntelligenceEngine ensures critical alerts override low-frequency preferences', () => {
    engine.updatePreferences({ alertFrequency: 'LOW' });

    // Critical risk alerts must NEVER be suppressed
    expect(engine.shouldSuppressAlert('CRITICAL_RISK')).toBe(false);

    // Temporary info notifications are suppressed under LOW preference
    expect(engine.shouldSuppressAlert('TEMPORARY_INFO')).toBe(true);
  });

  test('6. Profile resets and deletions remove personalization metrics', () => {
    engine.recordEvent(speedingEvent);
    expect(engine.getProfile().metrics.speedCompliance).toBeLessThan(1.0);

    engine.deleteProfile();
    expect(engine.getProfile().metrics.speedCompliance).toBe(1.0);
    expect(engine.getProfile().baselineState).toBe('INSUFFICIENT_DATA');
  });
});
