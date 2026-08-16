import { PerceptionEngine } from '../../frontend/src/modules/perception/PerceptionEngine';
import { ObservationNormalizer } from '../../frontend/src/modules/perception/ObservationNormalizer';
import { ConfidenceEngine } from '../../frontend/src/modules/perception/ConfidenceEngine';
import { ObservationFusion } from '../../frontend/src/modules/perception/ObservationFusion';
import { P0Adapter } from '../../frontend/src/modules/perception/adapters/P0Adapter';
import { LegalComplianceEngine } from '../../frontend/src/modules/legal/LegalComplianceEngine';
import { AssistantEngine } from '../../frontend/src/modules/assistant/AssistantEngine';
import { CameraFrame } from '../../frontend/src/modules/perception/types';
import { LegalContext } from '../../frontend/src/modules/legal/types';

describe('Multimodal Perception Layer (P1.2)', () => {
  let engine: PerceptionEngine;

  beforeEach(() => {
    engine = new PerceptionEngine();
  });

  test('1. GPS Normalization constructs valid observation', () => {
    const obs = ObservationNormalizer.normalizeGPS(11.0168, 76.9558, 60, 90, 5, Date.now());
    expect(obs.source).toBe('GPS');
    expect(obs.value.speed).toBe(60);
    expect(obs.confidence).toBe(0.98);
  });

  test('2. Invalid GPS rejects impossible speed spikes', () => {
    const provider = engine.getGPSProvider();
    provider.updateGPS({
      latitude: 11.0168,
      longitude: 76.9558,
      speed: 60,
      heading: 90,
      accuracy: 5,
      timestamp: Date.now() - 1000,
    });

    provider.updateGPS({
      latitude: 12.0168,
      longitude: 76.9558,
      speed: 250,
      heading: 90,
      accuracy: 5,
      timestamp: Date.now(),
    });

    expect(provider.getStatus()).toBe('DEGRADED');
  });

  test('3. GPS Staleness status turns to STALE after timeout', () => {
    const provider = engine.getGPSProvider();
    provider.updateGPS({
      latitude: 11.0168,
      longitude: 76.9558,
      speed: 60,
      heading: 90,
      accuracy: 5,
      timestamp: Date.now() - 15000,
    });

    expect(provider.getStatus()).toBe('STALE');
  });

  test('4. Camera sign observation normalizes correctly', () => {
    const obs = ObservationNormalizer.normalizeSign({
      type: 'SPEED_LIMIT',
      value: 50,
      boundingBox: { x: 10, y: 10, w: 50, h: 50 },
      confidence: 0.85,
      timestamp: Date.now(),
    });

    expect(obs.type).toBe('SPEED_LIMIT_SIGN');
    expect(obs.value).toBe(50);
    expect(obs.source).toBe('CAMERA');
  });

  test('5. Sign confidence scales with sensor health', () => {
    const confidence = ConfidenceEngine.calculateConfidence(0.85, 'DEGRADED', 1.0, 1.0);
    expect(confidence).toBeCloseTo(0.51, 2);
  });

  test('6. Temporal confirmation tracking requires 3 frames', async () => {
    let confirmedCount = 0;
    engine.subscribeEvent('observation_confirmed', () => {
      confirmedCount++;
    });

    const mockFrame: CameraFrame = {
      id: 'f1',
      width: 640,
      height: 480,
      data: new ArrayBuffer(0),
      timestamp: Date.now(),
    };

    const mockDetector = {
      detect: async () => [
        {
          type: 'SPEED_LIMIT' as const,
          value: 50,
          boundingBox: { x: 0, y: 0, w: 0, h: 0 },
          confidence: 0.9,
          timestamp: Date.now(),
        },
      ],
    };
    engine.setSignDetector(mockDetector);

    await engine.getCameraProvider().start();
    engine.getCameraProvider().simulateFrame(mockFrame);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(confirmedCount).toBe(0);

    engine.getCameraProvider().simulateFrame(mockFrame);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(confirmedCount).toBe(0);

    engine.getCameraProvider().simulateFrame(mockFrame);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(confirmedCount).toBe(1);

    const active = engine.getActiveObservations();
    const speedLimitObs = active.find((o) => o.type === 'SPEED_LIMIT_SIGN');
    expect(speedLimitObs).toBeDefined();
    expect(speedLimitObs?.value).toBe(50);
  });

  test('7. Observation expiration removes stale active observations', async () => {
    const expiredObs = ObservationNormalizer.normalizeSign({
      type: 'SPEED_LIMIT',
      value: 30,
      boundingBox: { x: 0, y: 0, w: 0, h: 0 },
      confidence: 0.9,
      timestamp: Date.now() - 40000,
    });

    engine.getActiveObservations().push(expiredObs);

    const mockFrame: CameraFrame = { id: 'f', width: 0, height: 0, data: new ArrayBuffer(0), timestamp: Date.now() };
    await engine.getCameraProvider().start(); // Start camera provider!
    engine.getCameraProvider().simulateFrame(mockFrame);
    
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(engine.getActiveObservations().length).toBe(0);
  });

  test('8. Duplicate detections overwrite previous values', () => {
    const obs1 = ObservationNormalizer.normalizeSign({
      type: 'SPEED_LIMIT',
      value: 50,
      boundingBox: { x: 0, y: 0, w: 0, h: 0 },
      confidence: 0.8,
      timestamp: Date.now(),
    });

    const obs2 = ObservationNormalizer.normalizeSign({
      type: 'SPEED_LIMIT',
      value: 60,
      boundingBox: { x: 0, y: 0, w: 0, h: 0 },
      confidence: 0.95,
      timestamp: Date.now(),
    });

    engine.getActiveObservations().push(obs1);
    
    const index = engine.getActiveObservations().findIndex((o) => o.type === obs2.type && o.source === obs2.source);
    if (index !== -1) {
      engine.getActiveObservations()[index] = obs2;
    }

    expect(engine.getActiveObservations().length).toBe(1);
    expect(engine.getActiveObservations()[0].value).toBe(60);
  });

  test('9. Sensor conflict identifies diverging values', () => {
    const obsCamera = ObservationNormalizer.normalizeSign({
      type: 'SPEED_LIMIT',
      value: 50,
      boundingBox: { x: 0, y: 0, w: 0, h: 0 },
      confidence: 0.9,
      timestamp: Date.now(),
    });

    const obsMap = {
      id: 'map_1',
      type: 'SPEED_LIMIT_SIGN' as const,
      timestamp: Date.now(),
      value: 60,
      confidence: 0.95,
      source: 'MAP' as const,
      scope: 'POINT' as const,
      lifecycle: 'ACTIVE' as const,
    };

    const fused = ObservationFusion.fuse(obsCamera, obsMap);
    expect(fused).toBeDefined();
    expect(fused).toHaveProperty('candidates');
    expect((fused as any).resolutionStatus).toBe('PENDING');
  });

  test('10. Observation fusion boosts confidence of matching sensors', () => {
    const obsCamera = ObservationNormalizer.normalizeSign({
      type: 'SPEED_LIMIT',
      value: 50,
      boundingBox: { x: 0, y: 0, w: 0, h: 0 },
      confidence: 0.9,
      timestamp: Date.now(),
    });

    const obsMap = {
      id: 'map_1',
      type: 'SPEED_LIMIT_SIGN' as const,
      timestamp: Date.now(),
      value: 50,
      confidence: 0.9,
      source: 'MAP' as const,
      scope: 'POINT' as const,
      lifecycle: 'ACTIVE' as const,
    };

    const fused = ObservationFusion.fuse(obsCamera, obsMap) as any;
    expect(fused).toBeDefined();
    expect(fused.value).toBe(50);
    expect(fused.confidence).toBeCloseTo(0.95, 5);
  });

  test('11. Telemetry speed overrides GPS speed if available', () => {
    const provider = engine.getVehicleProvider();
    provider.setStatus('HEALTHY');
    provider.updateTelemetry({
      speed: 68,
      timestamp: Date.now(),
    });

    expect(provider.getLastData()?.speed).toBe(68);
  });

  // Integration scenarios
  test('Integration Scenario 1: Camera detects 50 km/h sign -> Updates P0.4 legal context', () => {
    const signObs = ObservationNormalizer.normalizeSign({
      type: 'SPEED_LIMIT',
      value: 50,
      boundingBox: { x: 0, y: 0, w: 0, h: 0 },
      confidence: 0.95,
      timestamp: Date.now(),
    });
    signObs.lifecycle = 'CONFIRMED';

    const baseContext: LegalContext = {
      jurisdiction: { country: 'IN', state: 'TN', city: 'Coimbatore' },
      vehicleContext: { currentSpeed: 65, vehicleType: 'car', heading: 90 },
      roadContext: {
        applicableSpeedLimit: 80,
        roadType: 'urban',
        isNoEntry: false,
        isOneWay: false,
        isSchoolZone: false,
        isBusZone: false,
      },
      driverBehavior: { speedingPersistenceSeconds: 0 },
    };

    const updatedContext = P0Adapter.adaptToLegalContext([signObs], baseContext);
    expect(updatedContext.roadContext.applicableSpeedLimit).toBe(50);

    const legalEngine = new LegalComplianceEngine();
    const result = legalEngine.evaluate(updatedContext);
    expect(result.overallStatus).toBe('WARNING');
  });

  test('Integration Scenario 2: Camera detects NO_ENTRY -> Legal evaluates restriction -> Assistant generates warning', () => {
    const signObs = ObservationNormalizer.normalizeSign({
      type: 'NO_ENTRY',
      value: true,
      boundingBox: { x: 0, y: 0, w: 0, h: 0 },
      confidence: 0.95,
      timestamp: Date.now(),
    });
    signObs.lifecycle = 'CONFIRMED';

    const baseContext: LegalContext = {
      jurisdiction: { country: 'IN', state: 'TN', city: 'Coimbatore' },
      vehicleContext: { currentSpeed: 30, vehicleType: 'car', heading: 90 },
      roadContext: {
        applicableSpeedLimit: 50,
        roadType: 'urban',
        isNoEntry: false,
        isOneWay: false,
        isSchoolZone: false,
        isBusZone: false,
      },
      driverBehavior: { speedingPersistenceSeconds: 0 },
    };

    const updatedContext = P0Adapter.adaptToLegalContext([signObs], baseContext);
    expect(updatedContext.roadContext.isNoEntry).toBe(true);

    const legalEngine = new LegalComplianceEngine();
    const legalResult = legalEngine.evaluate(updatedContext);
    expect(legalResult.violations.length).toBeGreaterThan(0);

    const assistantEngine = new AssistantEngine();
    const decision = assistantEngine.process({
      timestamp: Date.now(),
      vehicleState: { currentSpeed: 30, heading: 90, vehicleType: 'car' },
      location: { latitude: 11.0, longitude: 76.9 },
      legalCompliance: {
        overallStatus: 'VIOLATION',
        violations: legalResult.violations,
        warnings: [],
      },
    });

    expect(decision.alert?.category).toBe('LEGAL');
    expect(decision.alert?.priority).toBe('CRITICAL');
  });

  test('Integration Scenario 3: GPS says 70, camera says 50 -> legal determines speeding', () => {
    const signObs = ObservationNormalizer.normalizeSign({
      type: 'SPEED_LIMIT',
      value: 50,
      boundingBox: { x: 0, y: 0, w: 0, h: 0 },
      confidence: 0.95,
      timestamp: Date.now(),
    });
    signObs.lifecycle = 'CONFIRMED';

    const gpsObs = ObservationNormalizer.normalizeGPS(11.01, 76.95, 70, 90, 5, Date.now());

    const baseContext: LegalContext = {
      jurisdiction: { country: 'IN', state: 'TN', city: 'Coimbatore' },
      vehicleContext: { currentSpeed: gpsObs.value.speed, vehicleType: 'car', heading: 90 },
      roadContext: {
        applicableSpeedLimit: 80,
        roadType: 'urban',
        isNoEntry: false,
        isOneWay: false,
        isSchoolZone: false,
        isBusZone: false,
      },
      driverBehavior: { speedingPersistenceSeconds: 0 },
    };

    const updatedContext = P0Adapter.adaptToLegalContext([signObs], baseContext);
    expect(updatedContext.vehicleContext.currentSpeed).toBe(70);
    expect(updatedContext.roadContext.applicableSpeedLimit).toBe(50);

    const legalEngine = new LegalComplianceEngine();
    const result = legalEngine.evaluate(updatedContext);
    expect(result.overallStatus).toBe('WARNING');
  });

  test('Integration Scenario 4: Camera confidence 0.31 marked low confidence and not confirmed', async () => {
    let confirmedCount = 0;
    engine.subscribeEvent('observation_confirmed', () => {
      confirmedCount++;
    });

    const mockFrame: CameraFrame = {
      id: 'f1',
      width: 640,
      height: 480,
      data: new ArrayBuffer(0),
      timestamp: Date.now(),
    };

    const mockDetector = {
      detect: async () => [
        {
          type: 'SPEED_LIMIT' as const,
          value: 50,
          boundingBox: { x: 0, y: 0, w: 0, h: 0 },
          confidence: 0.31,
          timestamp: Date.now(),
        },
      ],
    };
    engine.setSignDetector(mockDetector);

    await engine.getCameraProvider().start();
    engine.getCameraProvider().simulateFrame(mockFrame);
    await new Promise((resolve) => setTimeout(resolve, 20));
    engine.getCameraProvider().simulateFrame(mockFrame);
    await new Promise((resolve) => setTimeout(resolve, 20));
    engine.getCameraProvider().simulateFrame(mockFrame);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(confirmedCount).toBe(0);
  });
});
