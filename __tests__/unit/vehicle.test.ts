import { VehicleManager } from '../../frontend/src/modules/vehicle/VehicleManager';
import { TelemetryNormalizer } from '../../frontend/src/modules/vehicle/TelemetryNormalizer';
import { TelemetryQualityEngine } from '../../frontend/src/modules/vehicle/TelemetryQuality';
import { EVRangeEstimator } from '../../frontend/src/modules/vehicle/RangeEstimator';
import { RiskEngine } from '../../frontend/src/modules/risk/RiskEngine';

describe('Vehicle & Connected-Car Integration Layer (P1.3)', () => {
  let manager: VehicleManager;

  beforeEach(() => {
    manager = new VehicleManager();
  });

  test('1. Provider connection and lifecycle connection status updates', async () => {
    const conn = manager.getConnectionManager();
    expect(conn.getStatus()).toBe('DISCONNECTED');

    await conn.connectSource('API');
    expect(conn.getStatus()).toBe('CONNECTED');
    expect(conn.getActiveSource()).toBe('API');
  });

  test('2. Provider disconnection triggers auto fallback chain', async () => {
    const conn = manager.getConnectionManager();
    await conn.connectSource('API');
    
    // API disconnects -> degrades to OBD
    await conn.disconnectActive();
    expect(conn.getStatus()).toBe('DEGRADED');
    expect(conn.getActiveSource()).toBe('OBD');

    // OBD disconnects -> degrades to MOBILE
    await conn.disconnectActive();
    expect(conn.getStatus()).toBe('DEGRADED');
    expect(conn.getActiveSource()).toBe('MOBILE');
  });

  test('3. Capability detection checks matched features', async () => {
    const conn = manager.getConnectionManager();
    await conn.connectSource('OBD');
    
    const caps = manager.getCapabilities();
    expect(caps.rpm).toBe(true);
    expect(caps.battery).toBe(false); // OBD does not support battery level
  });

  test('4. Telemetry normalization filters invalid values and spikes', () => {
    const normalized = TelemetryNormalizer.normalize({
      timestamp: Date.now(),
      speed: 450, // invalid speed
      engineRpm: -100, // invalid RPM
      acceleration: 25, // impossible spike (>20)
      batteryLevel: 120, // invalid battery
      source: 'OBD',
    });

    expect(normalized.speed).toBeUndefined();
    expect(normalized.engineRpm).toBeUndefined();
    expect(normalized.acceleration).toBeUndefined();
    expect(normalized.batteryLevel).toBeUndefined();
    expect(normalized.confidence).toBeCloseTo(0.1, 1); // heavily degraded confidence
  });

  test('5. Telemetry quality assess stale latency logs', () => {
    const staleData = {
      timestamp: Date.now() - 15000, // 15 seconds ago
      speed: 50,
      source: 'OBD' as const,
      confidence: 0.9,
    };

    const quality = TelemetryQualityEngine.evaluate(staleData);
    expect(quality.status).toBe('STALE');
    expect(quality.confidence).toBeCloseTo(0.27, 2); // 0.9 * 0.3
  });

  test('6. EV range estimator checks marginal range warning thresholds', () => {
    const estimator = new EVRangeEstimator();
    
    // 80% battery at 180 Wh/km efficiency
    const res = estimator.estimateRange(80, 180);
    expect(res.estimatedRangeKm).toBe(333); // (75000 * 0.8) / 180 = 333
    expect(res.confidence).toBe(0.9);

    // Marginal range check
    const marginalRes = estimator.estimateRange(80, 180, 400); // route distance 400km
    expect(marginalRes.confidence).toBe(0.8); // degraded confidence due to marginal range
  });

  test('7. Telemetry conflict events are raised on coordinate speed mismatch', async () => {
    let conflictEvent: any = null;
    manager.subscribeEvent('telemetry_conflict', (e) => {
      conflictEvent = e;
    });

    // 1. Emulate GPS speed
    const conn = manager.getConnectionManager();
    await conn.connectSource('MOBILE');
    conn.getMobileAdapter().simulateTelemetry({
      timestamp: Date.now(),
      speed: 45,
    });

    // 2. Emulate OBD disagreeing speed
    await conn.connectSource('OBD');
    conn.getOBDAdapter().simulateTelemetry({
      timestamp: Date.now(),
      speed: 70, // 70 km/h vs 45 km/h (>15 diff)
    });

    expect(conflictEvent).toBeDefined();
    expect(conflictEvent.signal).toBe('speed');
    expect(conflictEvent.sources).toContain('OBD');
    expect(conflictEvent.sources).toContain('MOBILE');
  });

  // Integration scenarios
  test('Integration Scenario 1: OBD connected -> Telemetry updates P0.3 RiskEngine', async () => {
    const conn = manager.getConnectionManager();
    await conn.connectSource('OBD');

    let processedTelemetry: any = null;
    conn.subscribeTelemetry((data) => {
      processedTelemetry = data;
    });

    conn.getOBDAdapter().simulateTelemetry({
      timestamp: Date.now(),
      speed: 120, // Speeding!
      acceleration: 4.5,
      brakeState: false,
    });

    expect(processedTelemetry).toBeDefined();
    expect(processedTelemetry.speed).toBe(120);

    // Feed to RiskEngine
    const riskEngine = new RiskEngine();
    const risk = riskEngine.evaluate({
      vehicleState: {
        currentSpeed: processedTelemetry.speed,
        acceleration: processedTelemetry.acceleration,
        brakingIntensity: 0,
        heading: 90,
        vehicleType: 'car',
      },
      roadContext: {
        currentSpeedLimit: 80,
        roadClassification: 'highway',
        isNearIntersection: false,
        isSchoolZone: false,
        isPedestrianHeavy: false,
        isSharpCurve: false,
        isRestrictedRoad: false,
      },
      driverBehavior: {
        repeatedSpeedingCount: 0,
        harshBrakingCount: 0,
        rapidAccelerationCount: 0,
        headingChangeRate: 0,
        unsafePatternPersistenceScore: 0,
      },
    });

    expect(risk.score).toBeGreaterThan(30); // elevated risk due to high speeding
  });

  test('Integration Scenario 2: OBD disconnects -> falling back to Mobile GPS telemetry continues', async () => {
    const conn = manager.getConnectionManager();
    await conn.connectSource('OBD');

    // Disconnect -> auto falls back to MOBILE
    await conn.disconnectActive();
    expect(conn.getActiveSource()).toBe('MOBILE');

    conn.getMobileAdapter().simulateTelemetry({
      timestamp: Date.now(),
      speed: 55,
    });

    expect(manager.getLatestTelemetry()?.speed).toBe(55);
    expect(manager.getLatestTelemetry()?.source).toBe('MOBILE');
  });

  test('Integration Scenario 4: Low EV battery triggers marginal range charging alarm', async () => {
    const conn = manager.getConnectionManager();
    await conn.connectSource('API');

    conn.getAPIAdapter().simulateTelemetry({
      timestamp: Date.now(),
      speed: 60,
      batteryLevel: 15, // 15% battery level
      chargingState: 'not_charging',
    });

    // Check charging required for a destination 100km away
    const chargingCtx = manager.getChargingContext(100);
    expect(chargingCtx).toBeDefined();
    expect(chargingCtx?.chargingRequired).toBe(true);
    expect(chargingCtx?.estimatedRangeKm).toBeLessThan(100);
  });
});
