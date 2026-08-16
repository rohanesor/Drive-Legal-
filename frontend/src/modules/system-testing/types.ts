export interface Scenario {
  scenarioId: string;
  description: string;
  initialState: any;
  inputs: any[];
  expectedOutputs: any;
  expectedEvents: string[];
  faults: string[];
  performanceBudget: number;
}

export type ScenarioLifecycle = 'LOAD' | 'VALIDATE' | 'INITIALIZE' | 'EXECUTE' | 'ASSERT' | 'REPORT' | 'CLEANUP';

export interface GoldenResult {
  input: any;
  expectedLegal: string;
  expectedRisk: number;
  expectedRoute: string;
  expectedPolicy: string;
  expectedAlerts: string[];
}

export interface ValidationReport {
  build: string;
  unit: string;
  integration: string;
  system: string;
  endToEnd: string;
  offline: string;
  security: string;
  performance: string;
  reliability: string;
  regression: string;
  coverage: number;
  failures: string[];
  warnings: string[];
}

export type ReleaseGateStatus = 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL';
