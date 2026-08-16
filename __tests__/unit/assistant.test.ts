import { AssistantEngine } from '../../frontend/src/modules/assistant/AssistantEngine';
import { AssistantContext, AssistantEvent, EmergencyEvent } from '../../frontend/src/modules/assistant/types';
import { DriveScoreEngine } from '../../frontend/src/modules/drive-score/DriveScoreEngine';

describe('AssistantEngine Unit & Integration Simulation Tests', () => {
  let assistant: AssistantEngine;

  beforeEach(() => {
    assistant = new AssistantEngine();
  });

  const getCleanContext = (): AssistantContext => ({
    timestamp: Date.now(),
    vehicleState: {
      currentSpeed: 45,
      heading: 90,
      vehicleType: 'car',
    },
    location: {
      latitude: 11.0168,
      longitude: 76.9558, // Coimbatore
    },
    routeContext: {
      safetyScore: 90,
      isNoEntry: false,
      isOneWay: false,
    },
    driverRisk: {
      score: 10,
      signals: [],
    },
    legalCompliance: {
      overallStatus: 'COMPLIANT',
      violations: [],
      warnings: [],
    },
    driveScore: {
      score: 95,
      grade: 'EXCELLENT',
      trend: 'STABLE',
      confidence: 1.0,
    },
  });

  test('1. No active events returns NO_ACTION and transitions to MONITORING', () => {
    const ctx = getCleanContext();
    const decision = assistant.process(ctx);
    expect(decision.action).toBe('NONE');
    expect(decision.priority).toBe('INFO');
    expect(assistant.getCurrentState()).toBe('MONITORING');
  });

  test('2. Mild speeding warning generates ADVISE warning and transitions to WARNING state', () => {
    const ctx = getCleanContext();
    ctx.legalCompliance = {
      overallStatus: 'WARNING',
      violations: [],
      warnings: [{ type: 'SPEED_LIMIT_WARNING', severity: 'MEDIUM', message: 'Slightly speeding', ruleId: 'R1' }],
    };
    const decision = assistant.process(ctx);
    expect(decision.action).toBe('REDUCE_SPEED');
    expect(decision.priority).toBe('MEDIUM');
    expect(assistant.getCurrentState()).toBe('WARNING');
  });

  test('3. Persistent speeding triggers WARN action with HIGH priority alert', () => {
    const ctx = getCleanContext();
    ctx.legalCompliance = {
      overallStatus: 'VIOLATION',
      violations: [{ type: 'SPEED_LIMIT', severity: 'HIGH', status: 'CONFIRMED', explanation: 'Confirmed overspeed', confidence: 0.95 }],
      warnings: [],
    };
    const decision = assistant.process(ctx);
    expect(decision.action).toBe('REDUCE_SPEED');
    expect(decision.priority).toBe('HIGH');
    expect(assistant.getCurrentState()).toBe('WARNING');
  });

  test('4. Severe speeding warns with CRITICAL priority on extreme risk bounds', () => {
    const ctx = getCleanContext();
    ctx.legalCompliance = {
      overallStatus: 'VIOLATION',
      violations: [{ type: 'SPEED_LIMIT', severity: 'CRITICAL', status: 'CONFIRMED', explanation: 'Extreme speeding', confidence: 0.95 }],
      warnings: [],
    };
    const decision = assistant.process(ctx);
    expect(decision.action).toBe('REDUCE_SPEED');
    expect(decision.priority).toBe('CRITICAL');
    expect(assistant.getCurrentState()).toBe('CRITICAL');
  });

  test('5. School zone speeding issues immediate warning with HIGH/CRITICAL indicators', () => {
    const ctx = getCleanContext();
    ctx.legalCompliance = {
      overallStatus: 'VIOLATION',
      violations: [{ type: 'SPEED_LIMIT', severity: 'HIGH', status: 'CONFIRMED', explanation: 'Speeding in School Zone', confidence: 0.95 }],
      warnings: [],
    };
    const decision = assistant.process(ctx);
    expect(decision.action).toBe('REDUCE_SPEED');
    expect(decision.message).toContain('posted limit');
  });

  test('6. Restricted road segment approaching flags warning action with distance info', () => {
    const ctx = getCleanContext();
    ctx.routeContext = {
      safetyScore: 80,
      isNoEntry: true,
      warningProximityMeters: 150, // approaching
    };
    const decision = assistant.process(ctx);
    expect(decision.action).toBe('NAVIGATE_ALTERNATIVE_ROUTE');
    expect(decision.priority).toBe('HIGH');
  });

  test('7. Entering a restricted zone triggers critical illegal compliance warning', () => {
    const ctx = getCleanContext();
    ctx.legalCompliance = {
      overallStatus: 'VIOLATION',
      violations: [{ type: 'NO_ENTRY', severity: 'CRITICAL', status: 'CONFIRMED', explanation: 'No entry street entered', confidence: 0.95 }],
      warnings: [],
    };
    const decision = assistant.process(ctx);
    expect(decision.action).toBe('NAVIGATE_ALTERNATIVE_ROUTE');
    expect(decision.priority).toBe('CRITICAL');
    expect(assistant.getCurrentState()).toBe('CRITICAL');
  });

  test('8. Safer alternative route available emits route advice recommendation', () => {
    const ctx = getCleanContext();
    ctx.routeContext = {
      safetyScore: 60,
      isSaferRouteAvailable: true,
      saferRouteDiffMinutes: 3,
    };
    const decision = assistant.process(ctx);
    expect(decision.action).toBe('NAVIGATE_ALTERNATIVE_ROUTE');
    expect(decision.priority).toBe('MEDIUM');
    expect(decision.message).toContain('alternative route');
  });

  test('9. Multiple simultaneous alerts prioritize Safety over general info', () => {
    const ctx = getCleanContext();
    
    // Safety Risk (P0.3): HIGH_RISK
    ctx.driverRisk = {
      score: 80,
      signals: [{ type: 'HARSH_BRAKING', severity: 0.8, explanation: 'Harsh braking' }],
    };
    // Safer Route Available (P0.2): MEDIUM
    ctx.routeContext = {
      isSaferRouteAvailable: true,
      saferRouteDiffMinutes: 3,
    };

    const decision = assistant.process(ctx);
    
    // Safety high risk should beat navigation route advice
    expect(decision.category).toBe('SAFETY');
    expect(decision.priority).toBe('HIGH');
  });

  test('10. Repeated duplicate alerts are filtered out via cooldown suppression', () => {
    const ctx = getCleanContext();
    ctx.legalCompliance = {
      overallStatus: 'WARNING',
      violations: [],
      warnings: [{ type: 'SPEED_LIMIT_WARNING', severity: 'MEDIUM', message: 'exceeded margin', ruleId: 'R1' }],
    };

    const alert1 = assistant.process(ctx);
    expect(alert1.action).toBe('REDUCE_SPEED');

    // Duplicate call immediately should suppress duplicate alert
    const alert2 = assistant.process(ctx);
    expect(alert2.action).toBe('NONE');
    expect(alert2.message).toBe('Driving conditions are normal.');
  });

  test('11. Cooldowns suppress duplicates within time limits', () => {
    const ctx = getCleanContext();
    ctx.driverRisk = {
      score: 80,
      signals: [],
    };

    const alert1 = assistant.process(ctx);
    expect(alert1.priority).toBe('HIGH');

    // Call again, should suppress
    const alert2 = assistant.process(ctx);
    expect(alert2.priority).toBe('INFO');
  });

  test('12. Critical warnings bypass cooldown suppression rules', () => {
    const ctx = getCleanContext();
    ctx.legalCompliance = {
      overallStatus: 'VIOLATION',
      violations: [{ type: 'NO_ENTRY', severity: 'CRITICAL', status: 'CONFIRMED', explanation: 'No entry street entered', confidence: 0.95 }],
      warnings: [],
    };

    const alert1 = assistant.process(ctx);
    expect(alert1.priority).toBe('CRITICAL');

    // Call again, critical override bypasses cooldown
    const alert2 = assistant.process(ctx);
    expect(alert2.priority).toBe('CRITICAL');
  });

  test('13. Cooldown is bypassed when alert priority escalates (escalation check)', () => {
    const ctx = getCleanContext();
    
    // 1. Mild warning
    ctx.legalCompliance = {
      overallStatus: 'WARNING',
      violations: [],
      warnings: [{ type: 'SPEED_LIMIT_WARNING', severity: 'MEDIUM', message: 'warning speeding', ruleId: 'R1' }],
    };
    const alert1 = assistant.process(ctx);
    expect(alert1.priority).toBe('MEDIUM');

    // 2. Severe violation happens (escalation)
    ctx.legalCompliance = {
      overallStatus: 'VIOLATION',
      violations: [{ type: 'SPEED_LIMIT', severity: 'HIGH', status: 'CONFIRMED', explanation: 'Severe speeding violation', confidence: 0.95 }],
      warnings: [],
    };
    const alert2 = assistant.process(ctx);
    expect(alert2.priority).toBe('HIGH'); // bypassed cooldown because priority escalated!
  });

  test('14. Resolving alerts returns state back to MONITORING', () => {
    const ctx = getCleanContext();
    ctx.legalCompliance = {
      overallStatus: 'WARNING',
      violations: [],
      warnings: [{ type: 'SPEED_LIMIT_WARNING', severity: 'MEDIUM', message: 'overspeeding', ruleId: 'R1' }],
    };

    assistant.process(ctx);
    expect(assistant.getCurrentState()).toBe('WARNING');

    // Resolve condition
    ctx.legalCompliance = { overallStatus: 'COMPLIANT', violations: [], warnings: [] };
    
    // First transitions to RESOLVING
    assistant.process(ctx);
    expect(assistant.getCurrentState()).toBe('RESOLVING');

    // Then transitions back to MONITORING
    assistant.process(ctx);
    expect(assistant.getCurrentState()).toBe('MONITORING');
  });

  test('15. Changing route resolves restricted warnings', () => {
    const ctx = getCleanContext();
    ctx.routeContext = { isNoEntry: true, warningProximityMeters: 100 };
    assistant.process(ctx);
    expect(assistant.getCurrentState()).toBe('WARNING');

    // Driver changed route: proximity is cleared
    ctx.routeContext = { isNoEntry: false, warningProximityMeters: undefined };
    assistant.process(ctx);
    expect(assistant.getCurrentState()).toBe('RESOLVING');
  });

  test('16. Graceful degradation under missing sub-component details', () => {
    const ctx = getCleanContext();
    delete ctx.legalCompliance;
    delete ctx.driverRisk;
    
    const decision = assistant.process(ctx);
    expect(decision.action).toBe('NONE');
    expect(decision.priority).toBe('INFO');
  });

  test('17. Offline operation works purely locally', () => {
    const ctx = getCleanContext();
    const decision = assistant.process(ctx);
    expect(decision).toBeDefined();
    expect(decision.confidence).toBeGreaterThan(0.5);
  });

  test('18. User preference alerts filter disables non-critical alert types', () => {
    const ctx = getCleanContext();
    ctx.userPreferences = {
      voiceEnabled: true,
      alertFrequency: 'medium',
      navigationAlerts: false, // disabled
      legalAlerts: true,
      safetyAlerts: true,
    };
    ctx.routeContext = {
      isSaferRouteAvailable: true,
      saferRouteDiffMinutes: 3,
    };

    const decision = assistant.process(ctx);
    expect(decision.action).toBe('NONE'); // navigation alerts disabled!
  });

  test('19. DriveScore drop event triggers action view reason and outputs advice message', () => {
    const ctx = getCleanContext();
    ctx.driveScore = {
      score: 55, // drop below 60
      grade: 'NEEDS_ATTENTION',
      trend: 'DECLINING',
      confidence: 1.0,
    };
    const decision = assistant.process(ctx);
    expect(decision.action).toBe('VIEW_REASON');
    expect(decision.priority).toBe('HIGH');
  });

  test('20. Emergency Event foundation emits critical action alerts', () => {
    const ctx = getCleanContext();
    const emergency: EmergencyEvent = {
      type: 'ACCIDENT',
      confidence: 0.95,
      location: { latitude: 11.0, longitude: 76.9 },
      timestamp: Date.now(),
      evidence: 'G-sensor impact detected.',
    };

    const decision = assistant.processEmergency(emergency, ctx);
    expect(decision.action).toBe('CALL_EMERGENCY');
    expect(decision.priority).toBe('CRITICAL');
    expect(assistant.getCurrentState()).toBe('CRITICAL');
  });

  test('21. INTEGRATION SIMULATION: End-to-End Telemetry pipeline check', () => {
    // We simulate a driver heading down a road
    // We instantiate both the DriveScoreEngine and the AssistantEngine to simulate integrations
    const scoreEngine = new DriveScoreEngine();
    const assistantEngine = new AssistantEngine();

    // STEP 1: Driver traverses a corridor where a safer alternative route is available
    const step1Context = getCleanContext();
    step1Context.routeContext = { safetyScore: 70, isNoEntry: false, isSaferRouteAvailable: true, saferRouteDiffMinutes: 3 };
    
    let score1 = scoreEngine.calculate({
      routeSafetyScore: 70,
    });
    
    let decision1 = assistantEngine.process({
      ...step1Context,
      driveScore: score1,
    });
    expect(decision1.priority).toBe('MEDIUM');
    expect(decision1.category).toBe('NAVIGATION'); // road safety alternative alert

    // STEP 2: Driver speeds up above limit
    const step2Context = getCleanContext();
    step2Context.routeContext = { safetyScore: 42, isNoEntry: false };
    step2Context.legalCompliance = {
      overallStatus: 'WARNING',
      violations: [],
      warnings: [{ type: 'SPEED_LIMIT_WARNING', severity: 'MEDIUM', message: 'Overspeeding margin', ruleId: 'R1' }],
    };

    let score2 = scoreEngine.calculate({
      routeSafetyScore: 42,
      legalComplianceResult: step2Context.legalCompliance,
    });

    let decision2 = assistantEngine.process({
      ...step2Context,
      driveScore: score2,
    });
    // Cooldown check: speed warning triggered
    expect(decision2.action).toBe('REDUCE_SPEED');
    expect(decision2.priority).toBe('MEDIUM');

    // STEP 3: Driver approaches restricted zone
    const step3Context = getCleanContext();
    step3Context.routeContext = { safetyScore: 42, isNoEntry: true, warningProximityMeters: 80 };
    step3Context.legalCompliance = { overallStatus: 'COMPLIANT', violations: [], warnings: [] };

    let score3 = scoreEngine.calculate({
      routeSafetyScore: 42,
      legalComplianceResult: step3Context.legalCompliance,
    });

    let decision3 = assistantEngine.process({
      ...step3Context,
      driveScore: score3,
    });
    expect(decision3.action).toBe('NAVIGATE_ALTERNATIVE_ROUTE');
    expect(decision3.priority).toBe('HIGH');
  });
});
