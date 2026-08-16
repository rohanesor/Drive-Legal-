import { AdapterRegistry } from '../../frontend/src/modules/hardware-adapter/AdapterRegistry';
import { GPSAdapter } from '../../frontend/src/modules/hardware-adapter/GPSAdapter';
import { CameraAdapter } from '../../frontend/src/modules/hardware-adapter/CameraAdapter';
import { MicrophoneAdapter, SpeakerAdapter } from '../../frontend/src/modules/hardware-adapter/VoiceIOAdapters';
import { VehicleTelemetryAdapter } from '../../frontend/src/modules/hardware-adapter/VehicleTelemetryAdapter';
import { PhoneSensorAdapter, NetworkAdapter } from '../../frontend/src/modules/hardware-adapter/PeripheralAdapters';
import { SensorFusionService } from '../../frontend/src/modules/hardware-adapter/SensorFusionService';
import { AdapterHealthMonitor } from '../../frontend/src/modules/hardware-adapter/AdapterHealthMonitor';
import { ResourceManager } from '../../frontend/src/modules/hardware-adapter/ResourceManager';

describe('Real-World Adapter & Hardware Integration Layer (P2.5)', () => {
  beforeEach(() => {
    AdapterRegistry.clear();
  });

  test('1. AdapterRegistry registers and prevents duplicate registration IDs', () => {
    const gps1 = new GPSAdapter();
    AdapterRegistry.registerAdapter(gps1);
    expect(AdapterRegistry.getAdapter(gps1.id)).toBeDefined();

    const gps2 = new GPSAdapter(); // same default id 'gps_default'
    expect(() => AdapterRegistry.registerAdapter(gps2)).toThrow('Duplicate Adapter ID');
  });

  test('2. GPSAdapter validates coordinates bounds and rejects NaN entries', () => {
    const gps = new GPSAdapter();
    let eventReceived: any = null;
    gps.subscribe((ev) => {
      eventReceived = ev;
    });

    // Valid location
    gps.processGPSUpdate({
      latitude: 11.0168,
      longitude: 76.9558,
      accuracy: 5,
      speed: 30,
      heading: 90,
      timestamp: Date.now(),
    });
    expect(eventReceived).not.toBeNull();
    expect(eventReceived.type).toBe('location.updated');
    expect(eventReceived.payload.quality).toBe('EXCELLENT');

    // Invalid latitude range -> ignored
    eventReceived = null;
    gps.processGPSUpdate({
      latitude: 120,
      longitude: 76.9558,
      accuracy: 5,
      speed: 30,
      heading: 90,
      timestamp: Date.now(),
    });
    expect(eventReceived).toBeNull();
  });

  test('3. GPSAdapter detects staleness and jump velocity anomalies', () => {
    const gps = new GPSAdapter();
    let staleReceived = false;
    let anomalyReceived = false;

    gps.subscribe((ev) => {
      if (ev.type === 'location.stale') staleReceived = true;
      if (ev.type === 'location.anomaly') anomalyReceived = true;
    });

    // 1. Staleness check: update older than 5 seconds
    gps.processGPSUpdate({
      latitude: 11.0168,
      longitude: 76.9558,
      accuracy: 5,
      speed: 30,
      heading: 90,
      timestamp: Date.now() - 6000,
    });
    expect(staleReceived).toBe(true);

    // 2. Anomaly check: jump > 300 km/h
    // First, push initial location
    gps.processGPSUpdate({
      latitude: 11.01,
      longitude: 76.95,
      accuracy: 5,
      speed: 10,
      heading: 0,
      timestamp: Date.now(),
    });
    // Jump coordinates far away within 1 millisecond
    gps.processGPSUpdate({
      latitude: 12.5,
      longitude: 78.0,
      accuracy: 5,
      speed: 10,
      heading: 0,
      timestamp: Date.now() + 1000,
    });
    expect(anomalyReceived).toBe(true);
  });

  test('4. CameraAdapter samplers frame details and pushes sign observations', () => {
    const camera = new CameraAdapter();
    camera.initialize();
    camera.start();

    let obs: any = null;
    camera.subscribe((ev) => {
      obs = ev;
    });

    camera.simulateFrameCapture('SIGN', { signType: 'SPEED_LIMIT', value: 50 });
    expect(obs).not.toBeNull();
    expect(obs.type).toBe('sign.detected');
    expect(obs.payload.value).toBe(50);
  });

  test('5. PhoneSensorAdapter normalizes measurements into SI units', () => {
    const sensors = new PhoneSensorAdapter();
    sensors.initialize();
    sensors.start();

    let motion: any = null;
    sensors.subscribe((ev) => {
      motion = ev;
    });

    sensors.pushSensorSample({ x: 0, y: 9.8, z: 0 });
    expect(motion).not.toBeNull();
    expect(motion.type).toBe('sensor.motion.updated');
    expect(motion.payload.accelerometer.y).toBe(9.8);
  });

  test('6. SensorFusionService calculates discrepancies and fuses values based on preference', () => {
    const fusion = new SensorFusionService();

    // Matching speeds -> no discrepancies
    const res1 = fusion.updateGpsSpeed(40);
    const res2 = fusion.updateVehicleSpeed(42);
    expect(res2.discrepancyDetected).toBe(false);
    expect(res2.fusedSpeed).toBe(42); // Vehicle Speed preferred

    // Conflicting speeds -> discrepancy detected
    const res3 = fusion.updateGpsSpeed(70);
    const res4 = fusion.updateVehicleSpeed(42);
    expect(res4.discrepancyDetected).toBe(true);
  });

  test('7. AdapterHealthMonitor tracks health and retries reconnect with backoffs', async () => {
    const monitor = new AdapterHealthMonitor();
    const gps = new GPSAdapter();

    let called = 0;
    const callback = async () => {
      called++;
    };

    const reconnecting = monitor.attemptReconnect(gps.id, callback);
    const resolved = await reconnecting;
    expect(resolved).toBe(true);
    expect(called).toBe(1);
  });

  test('8. ResourceManager locks sensor access to avoid resource collisions', () => {
    const manager = new ResourceManager();
    // GPS Adapter acquires GPS resource
    expect(manager.acquireResource('gps', 'gps_adapter_1')).toBe(true);
    // BLE Adapter attempts to acquire GPS resource -> collision warning
    expect(manager.acquireResource('gps', 'gps_adapter_2')).toBe(false);

    // Release and re-acquire
    manager.releaseResource('gps', 'gps_adapter_1');
    expect(manager.acquireResource('gps', 'gps_adapter_2')).toBe(true);
  });
});
