import { DriverContextEngine } from '../../frontend/src/modules/driver-context/DriverContextEngine';
import { DrivingStateResolver } from '../../frontend/src/modules/driver-context/DrivingStateResolver';
import { PreferenceResolver } from '../../frontend/src/modules/driver-context/PreferenceResolver';
import { BehaviorAnalyzer } from '../../frontend/src/modules/driver-context/BehaviorAnalyzer';

describe('Driver Context & Personalization Engine (P1.7)', () => {
  let engine: DriverContextEngine;

  beforeEach(() => {
    engine = new DriverContextEngine();
  });

  test('1. Driving state resolver resolves correct status tiers', () => {
    // Speed 0, navigation inactive -> PARKED
    expect(DrivingStateResolver.resolve(0, false)).toBe('PARKED');

    // Speed 60, navigation active -> DRIVING
    expect(DrivingStateResolver.resolve(60, true, 1000)).toBe('DRIVING');

    // Speed 0, navigation active -> STOPPED (e.g. at red light)
    expect(DrivingStateResolver.resolve(0, true, 500)).toBe('STOPPED');

    // Speed 8, navigation active, near destination (<200m) -> ARRIVING
    expect(DrivingStateResolver.resolve(8, true, 150)).toBe('ARRIVING');
  });

  test('2. Context construction aggregates transient contexts', () => {
    engine.updateTelemetry(45, 0.95);
    engine.updateNavigation(true, 1500, 120);
    engine.updateLocation('seg_1', 60, ['NO_ENTRY']);

    const ctx = engine.buildContext();
    expect(ctx.drivingState).toBe('DRIVING');
    expect(ctx.locationContext.speedLimit).toBe(60);
    expect(ctx.locationContext.nearbyRestrictions).toContain('NO_ENTRY');
    expect(ctx.vehicleContext.currentSpeed).toBe(45);
    expect(ctx.confidence).toBe(0.95);
  });

  test('3. Preference hierarchy resolves safely (SAFETY > LEGAL > EXPLICIT > LEARNED)', () => {
    // User explicitly prefers FASTEST route option
    const userPref = {
      value: 'fastest' as const,
      confidence: 1.0,
      evidenceCount: 1,
      lastObserved: Date.now(),
      source: 'EXPLICIT' as const,
    };

    // But legal constraints override to SAFEST
    const resolved = PreferenceResolver.resolvePreference(
      userPref,
      'balanced' as const,
      undefined,
      'safest' as const // legal override
    );

    expect(resolved).toBe('safest');
  });

  test('4. Record learned preference updates counts and confidence levels', () => {
    engine.recordLearnedPreference('preferSaferRoutes', true);
    let ctx = engine.buildContext();
    expect(ctx.preferences.preferSaferRoutes?.value).toBe(true);
    expect(ctx.preferences.preferSaferRoutes?.evidenceCount).toBe(1);
    expect(ctx.preferences.preferSaferRoutes?.confidence).toBe(0.2); // initial confidence

    // Re-record identical signal -> confidence increases
    engine.recordLearnedPreference('preferSaferRoutes', true);
    ctx = engine.buildContext();
    expect(ctx.preferences.preferSaferRoutes?.evidenceCount).toBe(2);
    expect(ctx.preferences.preferSaferRoutes?.confidence).toBeCloseTo(0.3, 1);
  });

  test('5. Preference decay decreases confidence score over time', () => {
    const startPref = {
      value: true,
      confidence: 0.8,
      evidenceCount: 5,
      lastObserved: Date.now() - 3600000 * 5, // 5 hours ago
      source: 'LEARNED' as const,
    };

    // Signal recorded with elapsed time -> decay applied
    const updated = BehaviorAnalyzer.recordSignal(startPref, true);
    expect(updated.confidence).toBeLessThan(0.9); // (0.8 * decay) + 0.1 < 0.9
  });

  test('6. Conflicting preferences switch values after persistent updates', () => {
    let pref = {
      value: 'fastest' as const,
      confidence: 0.5,
      evidenceCount: 3,
      lastObserved: Date.now(),
      source: 'LEARNED' as const,
    };

    // User chosen a conflicting option 'safest'
    pref = BehaviorAnalyzer.recordSignal(pref, 'safest');
    expect(pref.value).toBe('fastest'); // doesn't switch immediately
    expect(pref.confidence).toBeLessThan(0.5);

    // Repeated conflict choose -> switches preference value
    pref = BehaviorAnalyzer.recordSignal(pref, 'safest');
    pref = BehaviorAnalyzer.recordSignal(pref, 'safest');
    expect(pref.value).toBe('safest'); // switched!
  });

  test('7. Disable personalization stops affecting context preferences', () => {
    engine.recordLearnedPreference('preferSaferRoutes', true);
    engine.setPersonalizationEnabled(false);

    const ctx = engine.buildContext();
    expect(ctx.preferences.preferSaferRoutes).toBeUndefined(); // disabled
  });

  test('8. Reset personalization clears all configured preferences', () => {
    engine.recordLearnedPreference('preferSaferRoutes', true);
    engine.resetPersonalization();

    const ctx = engine.buildContext();
    expect(ctx.preferences.preferSaferRoutes).toBeUndefined();
  });
});
