import { DriveLegalRuntime } from '../../frontend/src/modules/runtime/DriveLegalRuntime';
import { DemoRuntime } from '../../frontend/src/modules/runtime/DemoRuntime';
import { ScenarioRunner } from '../../frontend/src/modules/runtime/ScenarioRunner';

describe('End-to-End DriveLegal Runtime Integration (P2.0)', () => {
  let runtime: DriveLegalRuntime;

  beforeEach(() => {
    runtime = new DriveLegalRuntime();
  });

  afterEach(async () => {
    await runtime.shutdown();
  });

  test('1. Startup & shutdown lifecycles function sequentially', async () => {
    expect(runtime.getState().status).toBe('CREATED');

    await runtime.initialize();
    expect(runtime.getState().status).toBe('READY');

    runtime.start();
    expect(runtime.getState().status).toBe('RUNNING');

    await runtime.shutdown();
    expect(runtime.getState().status).toBe('STOPPED');
  });

  test('2. Event validation rejects malformed events', async () => {
    await runtime.initialize();
    const eventBus = runtime.getEventBus();

    // Malformed event (missing type/id) -> throws immediately
    const malformed: any = {
      timestamp: Date.now(),
      source: 'test',
    };

    await expect(eventBus.publish(malformed)).rejects.toThrow('Malformed Event');
  });

  test('3. Event deduplication rejects duplicate messages', async () => {
    await runtime.initialize();
    const eventBus = runtime.getEventBus();

    let counter = 0;
    eventBus.subscribe('TEST_EVENT', () => {
      counter++;
    });

    const event = {
      id: 'unique_id_1',
      type: 'TEST_EVENT',
      timestamp: Date.now(),
      source: 'test',
      correlationId: 'c1',
      tripId: 't1',
      payload: {},
      schemaVersion: '1.0',
    };

    await eventBus.publish(event);
    await eventBus.publish(event); // duplicate

    expect(counter).toBe(1); // executed exactly once
  });

  test('4. Trip lifecycle endTrip updates memory context', async () => {
    await runtime.initialize();
    runtime.start();

    await runtime.startTrip('trip_999', 'Avinashi Road Corner');
    await runtime.endTrip();

    const state = runtime.getState();
    expect(state.currentTrip).toBeUndefined(); // reset after completion
  });

  test('5. Health monitor flags subsystem health failures', async () => {
    await runtime.initialize();
    const monitor = runtime.getHealthMonitor();

    expect(monitor.evaluateRuntimeStatus()).toBe('HEALTHY');

    // Fail an OPTIONAL subsystem (voice) -> status becomes HEALTHY (still functions)
    monitor.setSubsystemHealth('voice', 'UNAVAILABLE');
    expect(monitor.evaluateRuntimeStatus()).toBe('HEALTHY');

    // Fail an IMPORTANT subsystem (navigation) -> status becomes DEGRADED
    monitor.setSubsystemHealth('navigation', 'UNAVAILABLE');
    expect(monitor.evaluateRuntimeStatus()).toBe('DEGRADED');

    // Fail a CRITICAL subsystem (safety) -> status becomes FAILED
    monitor.setSubsystemHealth('safety', 'UNAVAILABLE');
    expect(monitor.evaluateRuntimeStatus()).toBe('FAILED');
  });

  test('6. Dynamic network Online/Offline transitions change orchestrator mode', async () => {
    await runtime.initialize();
    expect(runtime.getState().mode).toBe('ONLINE');

    runtime.transitionToOffline();
    expect(runtime.getState().mode).toBe('OFFLINE');

    runtime.transitionToOnline();
    expect(runtime.getState().mode).toBe('ONLINE');
  });

  test('7. E2E Scenario: Urban Speeding alerts correctly', async () => {
    const demo = new DemoRuntime();
    await demo.initialize();
    demo.start();

    const res = await ScenarioRunner.runUrbanSpeeding(demo);
    expect(res.alertCount).toBe(0); // speed 72 is normalized but no hazard is detected

    await demo.shutdown();
  });

  test('8. E2E Scenario: Unexpected Camera Hazard triggers critical alert bypass', async () => {
    const demo = new DemoRuntime();
    await demo.initialize();
    demo.start();

    const res = await ScenarioRunner.runUnexpectedHazard(demo);
    expect(res.alertCreated).toBe(true);

    await demo.shutdown();
  });
});
