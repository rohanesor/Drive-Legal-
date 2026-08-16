import { Scenario, ScenarioLifecycle } from './types';
import { TestEnvironment } from './TestEnvironment';

export class ScenarioRunner {
  private environment: TestEnvironment;
  private currentLifecycle: ScenarioLifecycle = 'LOAD';
  private logs: string[] = [];

  constructor(env: TestEnvironment) {
    this.environment = env;
  }

  async runScenario(scenario: Scenario): Promise<{ success: boolean; failures: string[] }> {
    const failures: string[] = [];

    this.currentLifecycle = 'LOAD';
    this.logs.push(`Loaded scenario: ${scenario.scenarioId}`);

    this.currentLifecycle = 'VALIDATE';
    if (!scenario.scenarioId || !scenario.inputs) {
      failures.push('Invalid scenario spec structure.');
      return { success: false, failures };
    }

    this.currentLifecycle = 'INITIALIZE';
    this.environment.reset();
    if (scenario.faults.includes('GPS_LOSS')) {
      this.environment.setGPSAvailable(false);
    }
    if (scenario.faults.includes('NETWORK_LOSS')) {
      this.environment.setNetworkState('OFFLINE');
    }

    this.currentLifecycle = 'EXECUTE';
    for (const input of scenario.inputs) {
      this.logs.push(`Processed input action: ${input.action}`);
    }

    this.currentLifecycle = 'ASSERT';
    if (scenario.expectedOutputs && scenario.expectedOutputs.gpsAvailable !== undefined) {
      const actualGPS = this.environment.isGPSAvailable();
      if (actualGPS !== scenario.expectedOutputs.gpsAvailable) {
        failures.push(`GPS status mismatch. Expected: ${scenario.expectedOutputs.gpsAvailable}, Actual: ${actualGPS}`);
      }
    }

    this.currentLifecycle = 'REPORT';
    this.logs.push(`Finished scenario execution.`);

    this.currentLifecycle = 'CLEANUP';
    this.environment.reset();

    return {
      success: failures.length === 0,
      failures,
    };
  }

  getLogs(): string[] {
    return this.logs;
  }

  clearLogs(): void {
    this.logs = [];
  }
}
export default ScenarioRunner;
