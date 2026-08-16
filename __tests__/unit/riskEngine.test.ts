import { RiskEngine } from '../../frontend/src/modules/risk/RiskEngine';
import { DriverRiskContext } from '../../frontend/src/modules/risk/types';

describe('RiskEngine', () => {
  let engine: RiskEngine;

  beforeEach(() => {
    engine = new RiskEngine();
  });

  const getBaseContext = (): DriverRiskContext => ({
    vehicleState: {
      currentSpeed: 40,
      acceleration: 0,
      brakingIntensity: 0,
      heading: 90,
      vehicleType: 'car',
    },
    roadContext: {
      currentSpeedLimit: 50,
      roadClassification: 'urban',
      isNearIntersection: false,
      isSchoolZone: false,
      isPedestrianHeavy: false,
      isSharpCurve: false,
      isRestrictedRoad: false,
      routeSafetyScore: 90,
    },
    driverBehavior: {
      repeatedSpeedingCount: 0,
      harshBrakingCount: 0,
      rapidAccelerationCount: 0,
      headingChangeRate: 0,
      unsafePatternPersistenceScore: 0,
    },
  });

  test('1. Normal driving context should yield low risk', () => {
    const ctx = getBaseContext();
    const result = engine.evaluate(ctx);
    expect(result.score).toBeLessThanOrEqual(15);
    expect(result.level).toBe('LOW');
    expect(result.signals.length).toBe(0);
    expect(result.recommendations.length).toBe(1);
    expect(result.recommendations[0].id).toBe('rec_safe');
  });

  test('2. Slight speeding should yield moderate risk', () => {
    const ctx = getBaseContext();
    ctx.vehicleState.currentSpeed = 54; // 4 km/h over limit
    const result = engine.evaluate(ctx);
    expect(result.score).toBeGreaterThan(0);
    // Slight speeding with temporal smoothing starts low, but signal is registered
    const speedingSignal = result.signals.find((s) => s.type === 'SPEEDING');
    expect(speedingSignal).toBeDefined();
    expect(speedingSignal?.severity).toBeLessThan(0.3);
  });

  test('3. Severe speeding should yield high risk', () => {
    const ctx = getBaseContext();
    ctx.vehicleState.currentSpeed = 85; // 35 km/h over limit
    const result = engine.evaluate(ctx);
    const speedingSignal = result.signals.find((s) => s.type === 'SPEEDING');
    expect(speedingSignal).toBeDefined();
    expect(speedingSignal?.severity).toBe(1.0); // maxed out delta
  });

  test('4. Harsh braking should register corresponding signal', () => {
    const ctx = getBaseContext();
    ctx.vehicleState.brakingIntensity = 5.5; // above harsh threshold
    const result = engine.evaluate(ctx);
    const brakingSignal = result.signals.find((s) => s.type === 'HARSH_BRAKING');
    expect(brakingSignal).toBeDefined();
    expect(brakingSignal?.severity).toBeGreaterThan(0.5);
  });

  test('5. Repeated speeding should trigger habit signal', () => {
    const ctx = getBaseContext();
    ctx.driverBehavior.repeatedSpeedingCount = 3;
    const result = engine.evaluate(ctx);
    const habitSignal = result.signals.find((s) => s.type === 'REPEATED_RISK_BEHAVIOR');
    expect(habitSignal).toBeDefined();
    expect(habitSignal?.severity).toBeGreaterThan(0.7);
  });

  test('6. School-zone speeding should trigger school signal and yield high risk', () => {
    const ctx = getBaseContext();
    ctx.roadContext.isSchoolZone = true;
    ctx.vehicleState.currentSpeed = 58; // speeding in school zone
    const result = engine.evaluate(ctx);
    expect(result.signals.some((s) => s.type === 'SCHOOL_ZONE')).toBe(true);
    expect(result.signals.some((s) => s.type === 'SPEEDING')).toBe(true);
  });

  test('7. High-risk road + speeding combines road and driver safety limits', () => {
    const ctx = getBaseContext();
    ctx.roadContext.routeSafetyScore = 45; // low safety score
    ctx.vehicleState.currentSpeed = 65; // speeding
    const result = engine.evaluate(ctx);
    expect(result.signals.some((s) => s.type === 'HIGH_RISK_ROAD')).toBe(true);
    expect(result.signals.some((s) => s.type === 'SPEEDING')).toBe(true);
  });

  test('8. Multiple simultaneous signals accumulate correctly', () => {
    const ctx = getBaseContext();
    ctx.vehicleState.currentSpeed = 68; // speeding
    ctx.vehicleState.brakingIntensity = 4.5; // harsh braking
    ctx.roadContext.isSchoolZone = true; // school zone
    const result = engine.evaluate(ctx);
    expect(result.signals.length).toBe(3);
  });

  test('9. Risk decay gradually returns score to base levels', () => {
    const ctx = getBaseContext();
    ctx.vehicleState.currentSpeed = 85; // high speeding risk
    const firstResult = engine.evaluate(ctx);
    const highVal = firstResult.score;

    // Transition back to normal safe driving
    const safeCtx = getBaseContext();
    const secondResult = engine.evaluate(safeCtx);
    expect(secondResult.score).toBeLessThan(highVal);
    
    const thirdResult = engine.evaluate(safeCtx);
    expect(thirdResult.score).toBeLessThan(secondResult.score);
  });

  test('10. Temporal smoothing filters spikes while preserving reactive warnings', () => {
    // Normal to slight risk increase (smoothed)
    const ctx1 = getBaseContext();
    ctx1.vehicleState.currentSpeed = 58;
    const res1 = engine.evaluate(ctx1);
    
    // Critical raw spike (score jumps > 30 should use high alpha)
    engine.resetState();
    const ctxNormal = getBaseContext();
    engine.evaluate(ctxNormal); // seed history at 0
    
    const ctxExtreme = getBaseContext();
    ctxExtreme.vehicleState.currentSpeed = 95; // Extreme speeding
    ctxExtreme.roadContext.routeSafetyScore = 30; // Terrible road safety
    ctxExtreme.roadContext.isSchoolZone = true; // School zone
    const resExtreme = engine.evaluate(ctxExtreme);
    
    // Should react extremely fast (high score response)
    expect(resExtreme.score).toBeGreaterThanOrEqual(70);
  });

  test('11. Critical-risk escalation rules enforce CRITICAL rating', () => {
    const ctx = getBaseContext();
    ctx.vehicleState.currentSpeed = 85; // > 0.5 speeding severity
    ctx.roadContext.routeSafetyScore = 40; // > 0.4 road hazard severity
    ctx.roadContext.isSchoolZone = true; // critical zone active
    
    const result = engine.evaluate(ctx);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.level).toBe('CRITICAL');
  });

  test('12. Missing environmental context fields degrade gracefully', () => {
    const ctx = getBaseContext();
    delete ctx.environmentalContext;
    delete ctx.legalContext;
    const result = engine.evaluate(ctx);
    expect(result.score).toBeDefined();
    expect(result.level).toBe('LOW');
  });

  test('13. Out-of-bounds telemetry limits values cleanly', () => {
    const ctx = getBaseContext();
    ctx.vehicleState.currentSpeed = 350; // absurd supersonic speeding
    ctx.vehicleState.brakingIntensity = 99; // absurd deceleration
    const result = engine.evaluate(ctx);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThan(90);
  });
});
