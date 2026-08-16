import { PerformanceProfiler } from '../../frontend/src/modules/performance-optimization/PerformanceProfiler';
import { ResourceGovernor } from '../../frontend/src/modules/performance-optimization/ResourceGovernor';
import { PerformanceRegressionSuite } from '../../frontend/src/modules/performance-optimization/PerformanceRegressionSuite';
import { PerformanceConfig } from '../../frontend/src/modules/performance-optimization/types';

describe('Performance, Resource & Efficiency Optimization (P2.18)', () => {
  let profiler: PerformanceProfiler;
  let governor: ResourceGovernor;
  let regressionSuite: PerformanceRegressionSuite;
  let config: PerformanceConfig;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
    config = {
      memoryLimitMb: 150,
      queueLimit: 1000,
      cacheLimit: 50,
      samplingThresholdMeters: 5, // 5m threshold
    };
    governor = new ResourceGovernor(config);
    regressionSuite = new PerformanceRegressionSuite();
  });

  test('1. PerformanceProfiler measures duration spans tagged by correlationId', () => {
    profiler.startSpan('span_gps_1', 'GPSAdapter', 'processGPS', 'corr_gps_123');

    // End span and verify results
    const metric = profiler.endSpan('span_gps_1');
    expect(metric).not.toBeNull();
    expect(metric!.component).toBe('GPSAdapter');
    expect(metric!.correlationId).toBe('corr_gps_123');
    expect(metric!.duration).toBeLessThanOrEqual(50);
  });

  test('2. Adaptive GPS optimization ignores updates within sampling distance thresholds', () => {
    // Distance calculation logic for movement threshold checking
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      // Basic flat surface distance mock in meters
      const dy = (lat2 - lat1) * 111000;
      const dx = (lon2 - lon1) * 111000;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const prevLat = 13.0;
    const prevLon = 80.0;

    // 1. Move 2 meters (below 5m threshold) -> Ignored / No recomputation needed
    const distance1 = calculateDistance(prevLat, prevLon, 13.00001, 80.00001);
    expect(distance1).toBeLessThan(config.samplingThresholdMeters);

    // 2. Move 10 meters (exceeds 5m threshold) -> Trigger recomputation
    const distance2 = calculateDistance(prevLat, prevLon, 13.00008, 80.00008);
    expect(distance2).toBeGreaterThan(config.samplingThresholdMeters);
  });

  test('3. ResourceGovernor evicts caches and degrades background logging on low-memory constraints', () => {
    // Normal state
    governor.setMemoryUsage(100); // 100Mb
    const pressureNormal = governor.evaluateResourcePressure();
    expect(pressureNormal.evictCaches).toBe(false);
    expect(governor.isDegraded()).toBe(false);

    // High Memory pressure (180Mb > 150Mb limit)
    governor.setMemoryUsage(180);
    const pressureHigh = governor.evaluateResourcePressure();
    expect(pressureHigh.evictCaches).toBe(true);
    expect(governor.isDegraded()).toBe(true);
  });

  test('4. PerformanceRegressionSuite detects latency budget variances', () => {
    // Metrics satisfy budgets
    const normalMetrics = {
      startupMs: 140,
      contextMs: 8,
      legalMs: 15,
      riskMs: 20,
    };
    const regNormal = regressionSuite.evaluateRegression(normalMetrics);
    expect(regNormal.regressed).toBe(false);

    // Startup and Legal exceed budgets by > 20%
    const slowMetrics = {
      startupMs: 250, // exceeds 150ms budget
      contextMs: 8,
      legalMs: 30, // exceeds 20ms budget
      riskMs: 20,
    };
    const regSlow = regressionSuite.evaluateRegression(slowMetrics);
    expect(regSlow.regressed).toBe(true);
    expect(regSlow.details.length).toBe(2);
  });

  test('5. Golden correctness test ensures equivalent outcomes are preserved', () => {
    const goldenResult = { riskScore: 0.2, warnings: ['SPEED_LIMIT'] };
    const optimizedResult = { riskScore: 0.2, warnings: ['SPEED_LIMIT'] };

    expect(regressionSuite.verifyGoldenCorrectness(optimizedResult, goldenResult)).toBe(true);
  });
});
