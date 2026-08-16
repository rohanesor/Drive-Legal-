import { ProductionConfig } from '../../frontend/src/modules/production-ready/ProductionConfig';
import { DemoEnvironment } from '../../frontend/src/modules/production-ready/DemoEnvironment';
import { ReleaseGate } from '../../frontend/src/modules/production-ready/ReleaseGate';
import { ReleaseReadinessReport } from '../../frontend/src/modules/production-ready/types';

describe('Production Hardening, Release Engineering & Deployment (P2.20)', () => {
  test('1. ProductionConfig separates environments and validates configuration boundaries', () => {
    const devConfig = new ProductionConfig('DEV');
    expect(devConfig.getActiveConfig().enableDebugEndpoints).toBe(true);

    const prodConfig = new ProductionConfig('PRODUCTION');
    expect(prodConfig.getActiveConfig().enableDebugEndpoints).toBe(false);
    expect(prodConfig.getActiveConfig().loggingLevel).toBe('INFO');
    expect(prodConfig.validateStartupConfig()).toBe(true);
  });

  test('2. ProductionConfig startup validation fails if debug endpoints are enabled in Production', () => {
    const invalidConfig = new ProductionConfig('PRODUCTION');
    (invalidConfig.getActiveConfig() as any).enableDebugEndpoints = true;

    expect(invalidConfig.validateStartupConfig()).toBe(false);
  });

  test('3. DemoEnvironment replays script playback steps and records telemetry history', () => {
    const demo = new DemoEnvironment();

    // Step 1: START
    const t1 = demo.nextStep();
    expect(t1.stepName).toBe('START');
    expect(t1.engineState).toBe('INITIALIZING');

    // Step 2: GPS_ACQUIRED
    const t2 = demo.nextStep();
    expect(t2.stepName).toBe('GPS_ACQUIRED');

    // Step 3: SPEED_LIMIT_EXCEEDED (SPEED_LIMIT_WARNING)
    const t3 = demo.nextStep();
    expect(t3.activeAlerts).toContain('SPEED_LIMIT_WARNING');

    // Reset demo state
    demo.reset();
    expect(demo.getTelemetryHistory().length).toBe(0);
  });

  test('4. ReleaseGate transitions state to RC on passing reports and NOT_READY on failure', () => {
    const gate = new ReleaseGate();

    const passingReport: ReleaseReadinessReport = {
      build: 'PASS',
      tests: 'PASS',
      security: 'PASS',
      offline: 'PASS',
      performance: 'PASS',
      reliability: 'PASS',
      datasets: 'PASS',
      database: 'PASS',
      documentation: 'PASS',
      status: 'PASS',
    };

    expect(gate.evaluateReleaseGate(passingReport)).toBe('RELEASE_CANDIDATE');

    const failingReport: ReleaseReadinessReport = {
      ...passingReport,
      security: 'FAIL',
    };

    expect(gate.evaluateReleaseGate(failingReport)).toBe('NOT_READY');
  });

  test('5. Privacy scanner audits mock log streams for personal identifiers or credentials leakages', () => {
    const verifyPrivacySafe = (logs: string[]) => {
      const sensitivePattern = /API_KEY|SECRET|PASSWORD|PRIVATE_KEY|lat:[0-9]/i;
      for (const log of logs) {
        if (sensitivePattern.test(log)) {
          return false;
        }
      }
      return true;
    };

    const safeLogs = [
      '[Info] Starting system engines.',
      '[Info] GPS normalizer updated status to AGING.',
    ];
    expect(verifyPrivacySafe(safeLogs)).toBe(true);

    const leakyLogs = [
      '[Info] Starting system engines.',
      '[Debug] Found API_KEY=abc_123_xyz',
    ];
    expect(verifyPrivacySafe(leakyLogs)).toBe(false);
  });
});
