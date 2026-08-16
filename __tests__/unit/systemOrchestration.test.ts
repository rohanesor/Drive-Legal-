import { DriveLegalRuntime } from '../../frontend/src/modules/system-orchestration/DriveLegalRuntime';
import { AlertManager } from '../../frontend/src/modules/system-orchestration/AlertManager';
import { RecoveryManager } from '../../frontend/src/modules/system-orchestration/RecoveryManager';

describe('System Integration & Orchestration (P2.16)', () => {
  let runtime: DriveLegalRuntime;

  beforeEach(() => {
    runtime = new DriveLegalRuntime();
  });

  test('1. Boot sequence initializes engines according to dependency graph order', async () => {
    expect(runtime.getRuntimeState()).toBe('STOPPED');

    await runtime.boot();

    expect(runtime.getRuntimeState()).toBe('READY');
    const logs = runtime.getStartupLogs();

    // Verify ordering: security -> datasets -> context -> legal -> risk -> navigation -> driver -> voice -> policy
    expect(logs.indexOf('init_security')).toBeLessThan(logs.indexOf('init_datasets'));
    expect(logs.indexOf('init_datasets')).toBeLessThan(logs.indexOf('init_context'));
    expect(logs.indexOf('init_context')).toBeLessThan(logs.indexOf('init_legal'));
    expect(logs.indexOf('init_legal')).toBeLessThan(logs.indexOf('init_policy'));
  });

  test('2. EventBus publishes strongly typed events sequentially', (done) => {
    const bus = runtime.getEventBus();

    bus.subscribe('GPS_SIGNAL', (event) => {
      expect(event.source).toBe('gps-receiver');
      expect(event.priority).toBe('HIGH');
      expect(event.payload.latitude).toBe(13.0);
      done();
    });

    bus.publish('GPS_SIGNAL', 'gps-receiver', 'corr_1', 'HIGH', { latitude: 13.0, longitude: 80.0 });
  });

  test('3. AlertManager suppresses duplicate alerts with identical fingerprints', () => {
    const am = runtime.getAlertManager();
    const payload = { warning: 'School zone' };

    const alert1 = am.createAlert('school_zone_seg_1', 'HIGH', 5000, payload);
    expect(alert1).not.toBeNull();

    // Secondary attempt with identical fingerprint is deduplicated/suppressed
    const alert2 = am.createAlert('school_zone_seg_1', 'HIGH', 5000, payload);
    expect(alert2).toBeNull();
  });

  test('4. RecoveryManager retries actions with backoff and logs transaction steps', async () => {
    const rm = runtime.getRecoveryManager();
    let callCount = 0;

    const action = async () => {
      callCount++;
      if (callCount < 2) {
        throw new Error('Transient error');
      }
      return 'SUCCESS';
    };

    rm.recordJournal('step_1');
    const result = await rm.retryAction(action, 3, 2);

    expect(result).toBe('SUCCESS');
    expect(callCount).toBe(2);
    expect(rm.getJournal()).toContain('step_1');
  });

  test('5. DriveLegalRuntime prevents race conditions by rejecting stale evaluation outputs', () => {
    // Process Context V1
    runtime.processGPSUpdate(13.0, 80.0, 40);
    // Process Context V2
    runtime.processGPSUpdate(13.01, 80.01, 45);

    // Accept V2 results first
    expect(runtime.acceptEvaluationResult(2, { risk: 0.1 })).toBe(true);

    // Reject V1 results returning after V2 committed
    expect(runtime.acceptEvaluationResult(1, { risk: 0.2 })).toBe(false);
  });
});
