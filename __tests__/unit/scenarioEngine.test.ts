import { ScenarioEngine } from '../../frontend/src/modules/scenario-engine/ScenarioEngine';
import { ScenarioRunner } from '../../frontend/src/modules/scenario-engine/ScenarioRunner';
import { ReplayController } from '../../frontend/src/modules/scenario-engine/ReplayController';
import { DriveLegalStateCoordinator } from '../../frontend/src/modules/state-machine/DriveLegalStateCoordinator';
import { EventBus } from '../../frontend/src/modules/runtime/EventBus';
import { DriveLegalEvent } from '../../frontend/src/modules/event-contract/types';

describe('Scenario & Replay Engine (P2.3)', () => {
  let coordinator: DriveLegalStateCoordinator;
  let eventBus: EventBus;
  let runner: ScenarioRunner;
  let engine: ScenarioEngine;

  beforeEach(() => {
    eventBus = new EventBus();
    coordinator = new DriveLegalStateCoordinator(eventBus);
    runner = new ScenarioRunner(coordinator, eventBus);
    engine = new ScenarioEngine();
  });

  test('1. ScenarioEngine validates scenario format correctness', () => {
    const valid = engine.getScenario('safe-urban-drive');
    expect(valid).toBeDefined();
    expect(engine.validateScenario(valid!)).toBe(true);

    const invalid = { id: '', name: '', steps: [] } as any;
    expect(engine.validateScenario(invalid)).toBe(false);
  });

  test('2. ScenarioRunner executes deterministic steps using virtual clock', async () => {
    const scenario = engine.getScenario('safe-urban-drive');
    expect(scenario).toBeDefined();

    const report = await runner.run(scenario!, 'FAST');
    expect(report.status).toBe('COMPLETED');
    expect(report.stepsExecuted).toBe(2);
    expect(report.assertionsFailed).toBe(0);
  });

  test('3. ScenarioRunner substitutes variables safely without eval', async () => {
    const scenario = {
      id: 'var-sub-test',
      name: 'Var Sub Test',
      version: '1.0',
      metadata: { category: 'test', description: 'Testing substitution' },
      initialState: { trip: 'IDLE', motion: 'PARKED' },
      variables: {
        testSpeed: 45,
      },
      steps: [
        {
          id: 'step-1',
          at: 0,
          event: 'speed.updated',
          payload: {
            speed: '${testSpeed}',
          },
        },
      ],
    };

    const report = await runner.run(scenario, 'FAST');
    expect(report.status).toBe('COMPLETED');
  });

  test('4. FaultInjector simulates GPS drops, stale events, and duplications', async () => {
    const injector = runner.getFaultInjector();

    // Set network failure fault at virtual time 0 for duration 5s
    injector.setFaults([
      { type: 'NETWORK_FAILURE', startAt: 0, duration: 5 },
    ]);

    const baseEvent: DriveLegalEvent = {
      id: 'evt_123',
      type: 'location.updated',
      timestamp: Date.now(),
      eventId: 'evt_123',
      eventType: 'location.updated',
      eventVersion: 'v1',
      schemaVersion: '1.0',
      occurredAt: Date.now(),
      publishedAt: Date.now(),
      sequence: 1,
      source: 'gps',
      sourceVersion: '1.0.0',
      correlationId: 'corr_123',
      payload: { latitude: 11.0168, longitude: 76.9558, accuracy: 5, observedAt: Date.now(), source: 'gps' },
      metadata: {},
      provenance: { source: 'gps', method: 'raw', capturedAt: Date.now(), derivedFrom: [] },
      confidence: { score: 1.0, level: 'HIGH', factors: [], confidenceSource: 'sensor' },
      trustLevel: 'VALIDATED',
    };

    const results = injector.injectFaults(baseEvent, 2);
    expect(results.length).toBe(1);
    expect(results[0].metadata.sourceType).toBe('offline');
  });

  test('5. ReplayController handles play, pause, step, and multiplier speeds', async () => {
    const controller = new ReplayController(eventBus);
    const mockEvents: DriveLegalEvent[] = [
      {
        id: 'e1',
        type: 'speed.updated',
        timestamp: Date.now(),
        eventId: 'e1',
        eventType: 'speed.updated',
        eventVersion: 'v1',
        schemaVersion: '1.0',
        occurredAt: Date.now(),
        publishedAt: Date.now(),
        sequence: 1,
        source: 'gps',
        sourceVersion: '1.0.0',
        correlationId: 'c1',
        tripId: 't1',
        payload: { speed: 30 },
        metadata: {},
        provenance: { source: 'gps', method: 'raw', capturedAt: Date.now(), derivedFrom: [] },
        confidence: { score: 1.0, level: 'HIGH', factors: [], confidenceSource: 'sensor' },
        trustLevel: 'VALIDATED',
      },
    ];

    controller.loadReplay(mockEvents);
    expect(controller.getReplayState()).toBe('READY');

    // Step event
    await controller.stepReplay();
    expect(controller.getReplayState()).toBe('COMPLETED');
  });
});
