import { LegalComplianceEngine } from '../../frontend/src/modules/legal/LegalComplianceEngine';
import { LegalContext, TrafficRule } from '../../frontend/src/modules/legal/types';
import { DEFAULT_TRAFFIC_RULES } from '../../frontend/src/modules/legal/constants';

describe('LegalComplianceEngine', () => {
  let engine: LegalComplianceEngine;

  beforeEach(() => {
    engine = new LegalComplianceEngine();
  });

  const getBaseContext = (): LegalContext => ({
    jurisdiction: {
      country: 'IN',
      state: 'TN',
      city: 'Coimbatore',
    },
    vehicleContext: {
      currentSpeed: 45,
      vehicleType: 'car',
      heading: 90,
    },
    roadContext: {
      applicableSpeedLimit: 50,
      roadType: 'urban',
      isNoEntry: false,
      isOneWay: false,
      isSchoolZone: false,
      isBusZone: false,
    },
    driverBehavior: {
      speedingPersistenceSeconds: 0,
      parkingStatus: 'moving',
    },
  });

  test('1. Normal driving under speed limit should be compliant', () => {
    const ctx = getBaseContext();
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('COMPLIANT');
    expect(result.violations.length).toBe(0);
    expect(result.warnings.length).toBe(0);
    expect(result.compliantRules.length).toBeGreaterThan(0);
  });

  test('2. Slight speeding within noise persistence limits should trigger warning', () => {
    const ctx = getBaseContext();
    ctx.vehicleContext.currentSpeed = 55; // exceeding limit by 5 km/h
    ctx.driverBehavior.speedingPersistenceSeconds = 1.5; // below 3s tolerance
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('WARNING');
    expect(result.warnings.some((w) => w.type === 'SPEED_LIMIT_WARNING')).toBe(true);
  });

  test('3. Persistent speeding exceeding tolerance bounds triggers confirmed violation', () => {
    const ctx = getBaseContext();
    ctx.vehicleContext.currentSpeed = 56;
    ctx.driverBehavior.speedingPersistenceSeconds = 4.0; // above 3s tolerance
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('VIOLATION');
    const speedingViolation = result.violations.find((v) => v.type === 'SPEED_LIMIT');
    expect(speedingViolation).toBeDefined();
    expect(speedingViolation?.status).toBe('CONFIRMED');
  });

  test('4. Severe speeding yields high severity violation instantly', () => {
    const ctx = getBaseContext();
    ctx.vehicleContext.currentSpeed = 85; // extreme delta
    ctx.driverBehavior.speedingPersistenceSeconds = 5.0;
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('VIOLATION');
    expect(result.violations.some((v) => v.type === 'SPEED_LIMIT' && v.severity === 'HIGH')).toBe(true);
  });

  test('5. Speed limit unavailable falls back to UNKNOWN state', () => {
    const ctx = getBaseContext();
    ctx.roadContext.applicableSpeedLimit = 0; // unknown
    const result = engine.evaluate(ctx);
    expect(result.unknownRules.length).toBeGreaterThan(0);
  });

  test('6. Restricted vehicle type on permitted roads is compliant', () => {
    const ctx = getBaseContext();
    ctx.vehicleContext.vehicleType = 'car';
    ctx.roadContext.restrictedVehicleTypes = ['heavy']; // car is safe
    const result = engine.evaluate(ctx);
    expect(result.violations.length).toBe(0);
  });

  test('7. Restricted vehicle category on prohibited road is violation', () => {
    const ctx = getBaseContext();
    ctx.vehicleContext.vehicleType = 'heavy';
    ctx.roadContext.restrictedVehicleTypes = ['heavy'];
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('VIOLATION');
    expect(result.violations.some((v) => v.type === 'VEHICLE_RESTRICTION')).toBe(true);
  });

  test('8. Driving past No-Entry barrier triggers critical violation', () => {
    const ctx = getBaseContext();
    ctx.roadContext.isNoEntry = true;
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('VIOLATION');
    expect(result.violations.some((v) => v.type === 'NO_ENTRY' && v.severity === 'CRITICAL')).toBe(true);
  });

  test('9. Driving opposing one-way traffic registers directional violation', () => {
    const ctx = getBaseContext();
    ctx.roadContext.isOneWay = true;
    ctx.vehicleContext.heading = 220; // opposite direction
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('VIOLATION');
    expect(result.violations.some((v) => v.type === 'ONE_WAY')).toBe(true);
  });

  test('10. Parking in standard open zone is legal/compliant', () => {
    const ctx = getBaseContext();
    ctx.driverBehavior.parkingStatus = 'parked';
    const result = engine.evaluate(ctx);
    expect(result.violations.length).toBe(0);
  });

  test('11. Parking in designated No Parking area triggers violation', () => {
    const ctx = getBaseContext();
    ctx.driverBehavior.parkingStatus = 'parked';
    ctx.signDetectionContext = {
      detectedSignId: 'no_parking',
      detectionConfidence: 0.90,
    };
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('VIOLATION');
    expect(result.violations.some((v) => v.type === 'NO_PARKING')).toBe(true);
  });

  test('12. Driving in restricted hours violates time rules', () => {
    const ctx = getBaseContext();
    ctx.roadContext.timeRestrictions = [{ startHour: 18, endHour: 22 }];
    ctx.environmentalContext = {
      timeOfDay: 'night',
      currentHour: 20, // inside restriction window
    };
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('VIOLATION');
    expect(result.violations.some((v) => v.type === 'TIME_RESTRICTION')).toBe(true);
  });

  test('13. Unknown jurisdiction returns empty rules', () => {
    const ctx = getBaseContext();
    ctx.jurisdiction = { country: 'US', state: 'CA' }; // not in default rules
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('UNKNOWN');
    expect(result.violations.length).toBe(0);
  });

  test('14. Missing sensor confidence scales down overall evaluation confidence', () => {
    const ctx = getBaseContext();
    ctx.evidenceConfidence = 0.5; // weak GPS lock
    const result = engine.evaluate(ctx);
    expect(result.confidence).toBeLessThan(0.7);
  });

  test('15. Low-confidence sign detection raises potential warning instead of confirmed violation', () => {
    const ctx = getBaseContext();
    ctx.driverBehavior.parkingStatus = 'parked';
    ctx.signDetectionContext = {
      detectedSignId: 'no_parking',
      detectionConfidence: 0.50, // low confidence
    };
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('WARNING');
    expect(result.warnings.some((w) => w.ruleId === 'RULE_NO_PARKING_STANDARD')).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  test('16. Warning triggered before entering restricted zone (proximity check)', () => {
    const ctx = getBaseContext();
    ctx.roadContext.isNoEntry = true;
    ctx.roadContext.warningProximityMeters = 150; // warning zone ahead
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('WARNING');
    expect(result.warnings.some((w) => w.type === 'NO_ENTRY_WARNING')).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  test('17. Proximity warning turns to violation when boundary crossed (0 meters)', () => {
    const ctx = getBaseContext();
    ctx.roadContext.isNoEntry = true;
    ctx.roadContext.warningProximityMeters = undefined; // crossed
    const result = engine.evaluate(ctx);
    expect(result.overallStatus).toBe('VIOLATION');
    expect(result.violations.some((v) => v.type === 'NO_ENTRY')).toBe(true);
  });

  test('18. Multiple concurrent infractions are compiled correctly', () => {
    const ctx = getBaseContext();
    ctx.vehicleContext.currentSpeed = 75; // speeding
    ctx.driverBehavior.speedingPersistenceSeconds = 5.0;
    ctx.roadContext.isNoEntry = true; // entry violation
    const result = engine.evaluate(ctx);
    expect(result.violations.length).toBe(2);
  });

  test('19. Rule version increments are resolved correctly', () => {
    const ruleV2: TrafficRule = {
      id: 'RULE_SPEED_LIMIT_STANDARD',
      version: 2, // increment version
      category: 'SPEED_LIMIT',
      jurisdiction: 'IN.TN',
      effectiveFrom: '2026-01-01T00:00:00Z',
      enabled: true,
      severity: 'CRITICAL', // escalated severity in v2
      source: 'Updated Act',
      explanation: 'Updated speed rules.',
    };

    const engineV2 = new LegalComplianceEngine([ruleV2]);
    const ctx = getBaseContext();
    ctx.vehicleContext.currentSpeed = 65;
    ctx.driverBehavior.speedingPersistenceSeconds = 5.0;
    
    const result = engineV2.evaluate(ctx);
    expect(result.violations[0].severity).toBe('CRITICAL');
  });

  test('20. Future expired rule falls out of resolve loop', () => {
    const expiredRule: TrafficRule = {
      id: 'EXPIRED_RULE',
      version: 1,
      category: 'SPEED_LIMIT',
      jurisdiction: 'IN.TN',
      effectiveFrom: '2020-01-01T00:00:00Z',
      effectiveTo: '2025-12-31T23:59:59Z', // expired
      enabled: true,
      severity: 'LOW',
      source: 'Old act',
      explanation: 'Old rule.',
    };

    const engineExpired = new LegalComplianceEngine([expiredRule]);
    const ctx = getBaseContext();
    const result = engineExpired.evaluate(ctx);
    expect(result.overallStatus).toBe('UNKNOWN'); // no rules active
  });
});
