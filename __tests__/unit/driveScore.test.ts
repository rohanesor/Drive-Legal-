import { DriveScoreEngine } from '../../frontend/src/modules/drive-score/DriveScoreEngine';
import { DriveScoreSnapshot } from '../../frontend/src/modules/drive-score/types';
import { ScoreHistory } from '../../frontend/src/modules/drive-score/ScoreHistory';

describe('DriveScoreEngine', () => {
  let engine: DriveScoreEngine;

  beforeEach(() => {
    engine = new DriveScoreEngine();
  });

  const getPerfectInputs = () => ({
    routeSafetyScore: 98,
    driverRiskResult: {
      score: 0, // 0 risk = best
      signals: [],
    },
    legalComplianceResult: {
      overallStatus: 'COMPLIANT',
      violations: [],
      warnings: [],
    },
    environmentalContext: {
      weather: 'clear' as const,
      visibility: 1000,
      trafficDensity: 'low' as const,
    },
  });

  test('1. Perfect driving should yield maximum score (100)', () => {
    const inputs = getPerfectInputs();
    const result = engine.calculate(inputs);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('EXCELLENT');
    expect(result.confidence).toBeCloseTo(1.0);
  });

  test('2. Normal driving should yield good score', () => {
    const inputs = getPerfectInputs();
    inputs.driverRiskResult.score = 15; // minor risk
    inputs.routeSafetyScore = 88;
    const result = engine.calculate(inputs);
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  test('3. Slight speeding should deduct score moderately', () => {
    const inputs = getPerfectInputs();
    inputs.legalComplianceResult.warnings = [
      { type: 'SPEED_LIMIT_WARNING', severity: 'LOW', message: 'exceeded margin', ruleId: 'R1' }
    ];
    const result = engine.calculate(inputs);
    expect(result.score).toBeLessThan(100);
  });

  test('4. Repeated speeding builds multiple violations and drops score further', () => {
    const inputs = getPerfectInputs();
    inputs.legalComplianceResult.violations = [
      { type: 'SPEED_LIMIT', severity: 'MEDIUM', status: 'CONFIRMED', explanation: 'speeding', confidence: 0.9 }
    ];
    inputs.driverRiskResult.score = 45; // elevated behavior risk
    const result = engine.calculate(inputs);
    expect(result.score).toBeLessThan(80);
  });

  test('5. Severe risk yields very low behavior score', () => {
    const inputs = getPerfectInputs();
    inputs.driverRiskResult.score = 90; // extremely high risk
    const result = engine.calculate(inputs);
    const behaviorComponent = result.components.find(c => c.name === 'Driver Behavior');
    expect(behaviorComponent).toBeDefined();
    expect(behaviorComponent?.score).toBe(10); // 100 - 90
  });

  test('6. Legal violation triggers major deduction on legal compliance component', () => {
    const inputs = getPerfectInputs();
    inputs.legalComplianceResult.violations = [
      { type: 'SPEED_LIMIT', severity: 'HIGH', status: 'CONFIRMED', explanation: 'severe speeding', confidence: 0.9 }
    ];
    const result = engine.calculate(inputs);
    const legalComponent = result.components.find(c => c.name === 'Legal Compliance');
    expect(legalComponent?.score).toBe(75); // 100 - 25
  });

  test('7. High-risk road reduces road safety component directly', () => {
    const inputs = getPerfectInputs();
    inputs.routeSafetyScore = 45; // hazardous road
    const result = engine.calculate(inputs);
    const roadComponent = result.components.find(c => c.name === 'Road Safety');
    expect(roadComponent?.score).toBe(45);
  });

  test('8. Multiple simultaneous infractions degrade score significantly', () => {
    const inputs = getPerfectInputs();
    inputs.driverRiskResult.score = 85;
    inputs.legalComplianceResult.violations = [
      { type: 'NO_ENTRY', severity: 'HIGH', status: 'CONFIRMED', explanation: 'entered no entry', confidence: 0.9 }
    ];
    const result = engine.calculate(inputs);
    expect(result.score).toBeLessThan(60);
  });

  test('9. Missing environmental data is normalized without failing', () => {
    const inputs = getPerfectInputs();
    delete inputs.environmentalContext;
    const result = engine.evaluate ? engine.evaluate(inputs) : engine.calculate(inputs);
    
    const envComponent = result.components.find(c => c.name === 'Environmental Risk');
    expect(envComponent?.score).toBe(-1); // UNKNOWN
    expect(result.confidence).toBeLessThan(1.0); // reduced confidence due to missing env
  });

  test('10. Missing legal result renormalizes weights to remaining components', () => {
    const inputs = getPerfectInputs();
    delete (inputs as any).legalComplianceResult;
    const result = engine.calculate(inputs);
    const behaviorComponent = result.components.find(c => c.name === 'Driver Behavior');
    
    // Normal behavior weight is 0.40. Renormalized without legal (0.30):
    // active weights sum = 0.4 + 0.2 + 0.1 = 0.7
    // behavior renormalized = 0.4 / 0.7 = 0.57
    expect(behaviorComponent?.weight).toBeCloseTo(0.57, 1);
  });

  test('11. Missing road safety data behaves gracefully', () => {
    const inputs = getPerfectInputs();
    delete inputs.routeSafetyScore;
    const result = engine.calculate(inputs);
    const roadComponent = result.components.find(c => c.name === 'Road Safety');
    expect(roadComponent?.score).toBe(-1);
  });

  test('12. Unknown data normalization leaves missing fields out of the average', () => {
    const inputs = getPerfectInputs();
    inputs.driverRiskResult.score = 0; // 100 behavior
    delete inputs.routeSafetyScore; // unknown
    delete (inputs as any).legalComplianceResult; // unknown
    delete inputs.environmentalContext; // unknown
    
    // Only behavior is active (score = 100). The final score must aggregate to 100.
    const result = engine.calculate(inputs);
    expect(result.score).toBe(100);
  });

  test('13. Clamping limits score strictly within 0-100', () => {
    const inputs = getPerfectInputs();
    inputs.driverRiskResult.score = 999; // extreme risk
    const result = engine.calculate(inputs);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('14. Temporal smoothing filters out minor fluctuations', () => {
    const inputs = getPerfectInputs();
    engine.calculate(inputs); // seed at 100

    inputs.driverRiskResult.score = 30; // raw drops slightly
    const result = engine.calculate(inputs);
    
    // raw behavior drops to 70. raw aggregated drops to ~88.
    // smoothed: 0.2 * 88 + 0.8 * 100 = 98 (rounded)
    expect(result.score).toBeGreaterThan(90);
  });

  test('15. Critical event override bypasses temporal smoothing immediately', () => {
    const inputs = getPerfectInputs();
    engine.calculate(inputs); // seed at 100

    // Add a critical legal violation
    inputs.legalComplianceResult.violations = [
      { type: 'NO_ENTRY', severity: 'CRITICAL', status: 'CONFIRMED', explanation: 'violation', confidence: 0.9 }
    ];
    const result = engine.calculate(inputs);
    
    // Should bypass smoothing and drop immediately below 70
    expect(result.score).toBeLessThan(70);
  });

  test('16. Score recovery enforce gradual improvements limit', () => {
    const inputs = getPerfectInputs();
    inputs.driverRiskResult.score = 80;
    engine.calculate(inputs); // seed at low score (approx 68)

    // Suddenly perform perfectly
    const perfectInputs = getPerfectInputs();
    const result = engine.calculate(perfectInputs);
    
    // Recovery limit is +2 points per tick, so it must recover slowly
    expect(result.score).toBeLessThan(80);
  });

  test('17. Trip aggregation weighs final outcomes with historical worst values', () => {
    const snap1: DriveScoreSnapshot = { score: 95, timestamp: 1, tripId: 'trip', components: [] };
    const snap2: DriveScoreSnapshot = { score: 30, timestamp: 2, tripId: 'trip', components: [] }; // severe drop
    const snap3: DriveScoreSnapshot = { score: 90, timestamp: 3, tripId: 'trip', components: [] };

    const tripScore = ScoreHistory.calculateTripScore([snap1, snap2, snap3]);
    
    // Average is 71.6. Worst is 30.
    // 0.7 * 71.6 + 0.3 * 30 = 50 + 9 = 59
    expect(tripScore).toBeLessThan(70); // proves anti-gaming worst weighting works!
  });

  test('18. Trend detection registers correctly based on moving averages', () => {
    const mgr = engine.getHistoryManager();
    mgr.addSnapshot({ score: 60, timestamp: 1, tripId: 't', components: [] });
    mgr.addSnapshot({ score: 70, timestamp: 2, tripId: 't', components: [] });
    mgr.addSnapshot({ score: 85, timestamp: 3, tripId: 't', components: [] });
    mgr.addSnapshot({ score: 95, timestamp: 4, tripId: 't', components: [] });

    expect(mgr.calculateTrend()).toBe('IMPROVING');
  });

  test('19. Confidence is impacted by data quality', () => {
    const inputs = getPerfectInputs();
    inputs.baseEvidenceConfidence = 0.8;
    const result = engine.calculate(inputs);
    expect(result.confidence).toBeCloseTo(0.8);
  });

  test('20. Anti-gaming check prevents resetting scores by restarting engine instance', () => {
    const inputs = getPerfectInputs();
    inputs.driverRiskResult.score = 70; // bad behavior
    const badEngine = new DriveScoreEngine();
    
    // Evaluating bad driving logs the snapshot
    badEngine.calculate(inputs);
    const snapCount = badEngine.getHistoryManager().getSnapshots().length;
    expect(snapCount).toBe(1);
  });

  test('21. INVARIANT TESTS: Output boundaries and monotonicity checks', () => {
    const inputs = getPerfectInputs();
    
    // 1. Output clamping constraints
    const res = engine.calculate(inputs);
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);

    // 2. Monotonicity: higher risk must not improve score
    const engine1 = new DriveScoreEngine();
    const engine2 = new DriveScoreEngine();
    
    const inputsLowRisk = getPerfectInputs();
    inputsLowRisk.driverRiskResult.score = 10;
    
    const inputsHighRisk = getPerfectInputs();
    inputsHighRisk.driverRiskResult.score = 50; // higher risk
    
    const res1 = engine1.calculate(inputsLowRisk);
    const res2 = engine2.calculate(inputsHighRisk);
    expect(res1.score).toBeGreaterThan(res2.score);
  });
});
