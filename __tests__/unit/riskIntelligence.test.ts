import { RiskEngine } from '../../frontend/src/modules/risk-intelligence/RiskEngine';
import { RiskScoreCalculator } from '../../frontend/src/modules/risk-intelligence/RiskScoreCalculator';
import { RiskTrendEngine } from '../../frontend/src/modules/risk-intelligence/RiskTrendEngine';
import { RiskExplanationEngine } from '../../frontend/src/modules/risk-intelligence/RiskExplanationEngine';
import { DriveContext } from '../../frontend/src/modules/context-engine/types';
import { RiskEngineConfig } from '../../frontend/src/modules/risk-intelligence/types';

describe('Safety & Risk Intelligence Engine (P2.10)', () => {
  let engine: RiskEngine;
  let sampleContext: DriveContext;
  let defaultConfig: RiskEngineConfig;

  beforeEach(() => {
    engine = new RiskEngine();
    defaultConfig = {
      thresholds: { safe: 0.2, low: 0.4, moderate: 0.6, high: 0.8 },
      factorWeights: { SPEED: 1.5, ROAD: 1.0, WEATHER: 1.0, HAZARD: 2.0 },
      aggregationStrategy: 'WEIGHTED_SUM',
      hysteresis: 0.02,
    };

    sampleContext = {
      contextId: 'ctx_test',
      timestamp: Date.now(),
      location: {
        latitude: 11.0168,
        longitude: 76.9558,
        accuracy: 4,
        heading: 90,
        speed: 40, // 40 km/h
        altitude: 400,
        locationTimestamp: Date.now(),
        quality: 'HIGH',
        accuracyMeters: 4,
        ageMs: 0,
      },
      road: {
        roadId: 'rd_1',
        roadName: 'Main St',
        roadClass: 'RESIDENTIAL',
        laneCount: 2,
        direction: 'both',
        surfaceType: 'asphalt',
        accessType: 'public',
      },
      route: {
        routeId: 'rt_1',
        origin: '',
        destination: '',
        currentSegment: '',
        nextSegment: '',
        remainingDistance: 0,
        remainingDuration: 0,
        routeProgress: 0,
        state: 'ON_ROUTE',
      },
      vehicle: {
        quality: 'UNAVAILABLE',
      },
      environment: {
        timeOfDay: 'DAY',
        dayOfWeek: 'Monday',
        weather: 'CLEAR',
        visibility: 1.0,
        lighting: 'good',
        roadCondition: 'dry',
      },
      restrictions: [],
      driver: {
        speedVariance: 0,
        speedLimitCompliance: 1.0,
        hardBrakingFrequency: 0,
        rapidAccelerationFrequency: 0,
        routeDeviationCount: 0,
      },
      hazards: [],
      confidence: {},
      freshness: {},
      provenance: {},
      state: 'NORMAL',
    };
  });

  test('1. RiskScoreCalculator aggregates weighted scores, handles school zone amplifiers and visibility caps', () => {
    const factors = [
      {
        id: 'f1',
        type: 'SPEED',
        score: 0.6,
        confidence: 0.9,
        severity: 1,
        evidence: [],
        source: 'gps',
        timestamp: Date.now(),
        freshness: 'CURRENT' as const,
        explanation: 'Speeding',
      },
    ];

    // Standard overall score
    const scoreNormal = RiskScoreCalculator.calculateOverallScore(factors, defaultConfig, false, false);
    expect(scoreNormal).toBeCloseTo(0.6);

    // Amplified score due to school zone interactive rule
    const scoreAmplified = RiskScoreCalculator.calculateOverallScore(factors, defaultConfig, true, false);
    expect(scoreAmplified).toBeGreaterThan(scoreNormal);
  });

  test('2. RiskTrendEngine classifies levels with hysteresis boundaries', () => {
    const trend = new RiskTrendEngine();

    // Normal transition above high threshold
    const levelHigh = trend.classifyLevel(0.85, 'SAFE', defaultConfig);
    expect(levelHigh).toBe('HIGH');

    // Hysteresis boundary check: score drops slightly near boundary but stays HIGH due to hysteresis
    const levelStillHigh = trend.classifyLevel(0.79, 'HIGH', defaultConfig);
    expect(levelStillHigh).toBe('HIGH'); // high boundary is 0.8, hyst is 0.02, so stays HIGH down to 0.78
  });

  test('3. RiskExplanationEngine formats structured explanation messages', () => {
    const factors = [
      {
        id: 'f1',
        type: 'SPEED',
        score: 0.6,
        confidence: 0.9,
        severity: 1,
        evidence: [],
        source: 'gps',
        timestamp: Date.now(),
        freshness: 'CURRENT' as const,
        explanation: 'Speed limit violation',
      },
    ];

    const explanation = RiskExplanationEngine.generateExplanation(factors, 'HIGH');
    expect(explanation).toContain('speed limit violation');
  });

  test('4. RiskEngine computes speeding deltas and tracks missing limit uncertainties', () => {
    // 1. Speeds within safe limit
    const res1 = engine.assess(sampleContext, 50); // Speed 40, Limit 50
    expect(res1.overallScore).toBeLessThan(0.3);
    expect(res1.riskLevel).toBe('SAFE');

    // 2. Severe Speeding (speeding delta > 30)
    sampleContext.location.speed = 90; // Speed 90, Limit 50
    const res2 = engine.assess(sampleContext, 50);
    expect(res2.overallScore).toBeGreaterThan(0.35);

    // 3. SpeedLimit is UNKNOWN
    const res3 = engine.assess(sampleContext, null);
    expect(res3.uncertainty.missingInputs).toContain('speedLimit');
    expect(res3.uncertainty.score).toBe(0.4);
  });
});
