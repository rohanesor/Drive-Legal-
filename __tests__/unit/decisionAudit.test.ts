import { DecisionAuditStore } from '../../frontend/src/modules/decision-audit/DecisionAuditStore';
import { DecisionGraphEngine } from '../../frontend/src/modules/decision-audit/DecisionGraphEngine';
import { WhyAPI } from '../../frontend/src/modules/decision-audit/WhyAPI';
import { SafetyEvaluationEngine } from '../../frontend/src/modules/decision-audit/SafetyEvaluationEngine';
import { GoldenDecisionRegistry } from '../../frontend/src/modules/decision-audit/GoldenDecisionRegistry';
import { DecisionRecord } from '../../frontend/src/modules/decision-audit/types';
import { ScenarioReport } from '../../frontend/src/modules/scenario-engine/types';

describe('Safety Evaluation & Decision Audit Layer (P2.4)', () => {
  let store: DecisionAuditStore;
  let sampleRecord: Omit<DecisionRecord, 'hash' | 'parentHash'>;

  beforeEach(() => {
    store = new DecisionAuditStore();

    sampleRecord = {
      decisionId: 'dec_123',
      timestamp: Date.now(),
      tripId: 'trip_123',
      correlationId: 'corr_123',
      triggeringEventId: 'evt_123',
      decisionType: 'SAFETY_ALERT',
      inputs: {
        location: { latitude: 11.0168, longitude: 76.9558 },
        speed: 72,
        speedLimit: 50,
        connectivity: 'online',
      },
      observations: [
        {
          observationId: 'obs_1',
          eventId: 'evt_123',
          source: 'gps',
          type: 'speeding',
          value: 72,
          confidence: 0.95,
          observedAt: Date.now(),
          freshness: 1,
        },
      ],
      riskAssessment: {
        riskLevel: 'HIGH',
        riskScore: 72,
        riskFactors: ['speeding'],
        confidence: 0.95,
        riskEngineVersion: '1.0.0',
        evaluatedAt: Date.now(),
      },
      legalAssessment: {
        applicableRules: ['speed-limit-rule'],
        restriction: '50 km/h max',
        jurisdiction: 'urban',
        source: 'gps',
        confidence: 1.0,
        legalEngineVersion: '1.0.0',
        evaluatedAt: Date.now(),
      },
      contextSnapshot: {
        contextVersion: '1.0',
      },
      policyDecision: {
        decision: 'ALLOW',
        policyVersion: '1.0',
        rulesEvaluated: ['policy-speed-limit'],
        reasonCodes: ['SPEED_LIMIT_EXCEEDED'],
      },
      selectedAction: {
        actionId: 'act_1',
        actionType: 'ALERT_DRIVER',
        actor: 'alert-engine',
        startedAt: Date.now(),
        completedAt: Date.now(),
        result: 'success',
      },
      rejectedActions: [],
      outcome: {
        status: 'SUCCESS',
        observedEffect: 'Driver slowed down',
        resolved: true,
        followUpRequired: false,
        measuredAt: Date.now(),
      },
      confidence: {
        observation: 0.95,
        risk: 0.95,
        legal: 1.0,
        agent: 1.0,
        finalDecision: 0.95,
      },
      timing: {
        triggeredAt: Date.now() - 500,
        decisionStartedAt: Date.now() - 400,
        decisionCompletedAt: Date.now() - 200,
        actionStartedAt: Date.now() - 100,
        actionCompletedAt: Date.now(),
        outcomeObservedAt: Date.now() + 1000,
        detectionLatency: 100,
        decisionLatency: 200,
        actionLatency: 100,
        totalInterventionLatency: 500,
      },
      provenance: {
        eventChain: ['gps.update', 'speeding.detected'],
      },
      systemVersions: {
        runtimeVersion: '1.0.0',
        riskEngineVersion: '1.0.0',
        legalEngineVersion: '1.0.0',
        navigationVersion: '1.0.0',
        policyVersion: '1.0.0',
        agentVersion: '1.0.0',
        schemaVersion: '1.0.0',
      },
    };
  });

  test('1. DecisionAuditStore appends records, redacts inputs, and chains hashes', () => {
    store.appendRecord(sampleRecord);
    const records = store.getRecords();
    expect(records.length).toBe(1);
    expect(records[0].hash).toBeDefined();

    // Verification of location coordinate rounding (PII redaction check)
    expect(records[0].inputs.location?.latitude).toBe(11.02); // 11.0168 rounded to 2 decimals
    expect(store.verifyIntegrity()).toBe(true);
  });

  test('2. DecisionAuditStore detects tampering when hash chain is broken', () => {
    store.appendRecord(sampleRecord);
    // Append a second record
    store.appendRecord({ ...sampleRecord, decisionId: 'dec_124' });

    expect(store.verifyIntegrity()).toBe(true);

    // Tamper with second record hash
    const records = store.getRecords();
    records[1].hash = 'tampered-hash-value';

    expect(store.verifyIntegrity()).toBe(false);
  });

  test('3. DecisionGraphEngine parses traces and WhyAPI formats safe messages', () => {
    store.appendRecord(sampleRecord);
    const record = store.getRecords()[0];

    const trace = DecisionGraphEngine.getDecisionTrace(record);
    expect(trace).toContain('Risk Level: HIGH');
    expect(trace).toContain('Executed Action: ALERT_DRIVER');

    const explanation = WhyAPI.explainDecision(record);
    expect(explanation.userFacingExplanation).toContain('speed limit exceeded');
    expect(explanation.userFacingExplanation).toContain('alert driver');
  });

  test('4. SafetyEvaluationEngine rates timing budget failures and assertion reports', () => {
    const mockReport: ScenarioReport = {
      scenarioId: 'test-scenario',
      runId: 'run-1',
      status: 'FAILED',
      startedAt: Date.now(),
      completedAt: Date.now(),
      duration: 100,
      stepsExecuted: 5,
      eventsGenerated: 5,
      eventsObserved: 5,
      assertionsPassed: 4,
      assertionsFailed: 1,
      faultsInjected: [],
      finalState: {},
      errors: [],
      performance: { durationMs: 100 },
    };

    const evalReport = SafetyEvaluationEngine.evaluateReport(mockReport, 1, 1);
    expect(evalReport.regressionStatus).toBe('FAILED');
    expect(evalReport.safetyScore).toBe(70);
    expect(evalReport.latencyScore).toBe(60);
  });

  test('5. GoldenDecisionRegistry resolves golden baseline expectations and regression status', () => {
    store.appendRecord(sampleRecord);
    const record = store.getRecords()[0];

    GoldenDecisionRegistry.registerGolden('speeding-scenario', {
      decision: 'ALLOW',
      action: 'ALERT_DRIVER',
    });

    const isMatch = GoldenDecisionRegistry.evaluateRegression('speeding-scenario', record);
    expect(isMatch).toBe(true);

    const isMismatch = GoldenDecisionRegistry.evaluateRegression('speeding-scenario', {
      ...record,
      policyDecision: { ...record.policyDecision, decision: 'DENY' },
    });
    expect(isMismatch).toBe(false);
  });
});
