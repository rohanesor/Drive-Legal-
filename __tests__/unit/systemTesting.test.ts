import { ValidationManager } from '../../frontend/src/modules/system-testing/ValidationManager';
import { ScenarioRunner } from '../../frontend/src/modules/system-testing/ScenarioRunner';
import { TestEnvironment } from '../../frontend/src/modules/system-testing/TestEnvironment';
import { Scenario } from '../../frontend/src/modules/system-testing/types';

describe('End-to-End Validation, Verification & System Testing (P2.19)', () => {
  let manager: ValidationManager;
  let runner: ScenarioRunner;
  let env: TestEnvironment;

  beforeEach(() => {
    manager = new ValidationManager();
    env = new TestEnvironment();
    runner = new ScenarioRunner(env);
  });

  test('1. ScenarioRunner executes Normal Drive scenario clean paths', async () => {
    const normalDrive: Scenario = {
      scenarioId: 'sc_normal_drive',
      description: 'Clean path driving simulation',
      initialState: {},
      inputs: [
        { action: 'acquire_gps', data: { lat: 13.0, lon: 80.0 } },
        { action: 'calculate_route', data: { dest: 'Endpoint B' } },
      ],
      expectedOutputs: { status: 'READY' },
      expectedEvents: ['ROUTE_STARTED', 'GPS_ACQUIRED'],
      faults: [],
      performanceBudget: 150,
    };

    const res = await runner.runScenario(normalDrive);
    expect(res.success).toBe(true);
    expect(runner.getLogs()).toContain('Loaded scenario: sc_normal_drive');
  });

  test('2. ScenarioRunner handles GPS Loss fault injection and degrades coordinates status', async () => {
    const gpsLossDrive: Scenario = {
      scenarioId: 'sc_gps_loss',
      description: 'GPS loss simulation',
      initialState: {},
      inputs: [
        { action: 'acquire_gps', data: { lat: 13.0, lon: 80.0 } },
        { action: 'gps_signal_drop', data: {} },
      ],
      expectedOutputs: { status: 'DEGRADED' },
      expectedEvents: ['POSITION_STALE'],
      faults: ['GPS_LOSS'],
      performanceBudget: 150,
    };

    const res = await runner.runScenario(gpsLossDrive);
    expect(res.success).toBe(true); // runner successfully validated GPS_LOSS expectation
  });

  test('3. ScenarioRunner handles Network Loss and validates offline operation continues', async () => {
    const networkLossDrive: Scenario = {
      scenarioId: 'sc_network_loss',
      description: 'Network loss simulation',
      initialState: {},
      inputs: [
        { action: 'sync_offline_maps', data: {} },
      ],
      expectedOutputs: { status: 'OFFLINE_READY' },
      expectedEvents: ['NETWORK_LOST'],
      faults: ['NETWORK_LOSS'],
      performanceBudget: 100,
    };

    const res = await runner.runScenario(networkLossDrive);
    expect(res.success).toBe(true);
  });

  test('4. ValidationManager maps failures and transitions ReleaseGate status to FAIL', async () => {
    const failedScenario: Scenario = {
      scenarioId: 'sc_broken_drive',
      description: 'Broken paths simulation',
      inputs: [],
      expectedOutputs: {},
      expectedEvents: [],
      faults: ['GPS_LOSS'], // GPS drops but no expectation matches in runner assert (simulates test assertion failure)
      performanceBudget: 100,
    };

    // Mock assertions: force expectation mismatch on GPS status to trigger test failures
    const mockRunner = new ScenarioRunner(env);
    const mockRes = await mockRunner.runScenario(failedScenario);

    // Assert that the scenario failed (GPS was set as available instead of expected GPS_LOSS state)
    const report = await manager.runAllScenarios([
      {
        ...failedScenario,
        expectedOutputs: { gpsAvailable: true },
        faults: ['GPS_LOSS'],
      },
    ]);

    expect(report.system).toBe('FAIL');
    expect(manager.evaluateReleaseGate(report)).toBe('FAIL');
  });
});
