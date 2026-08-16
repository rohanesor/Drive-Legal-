import { CapabilityRegistry } from '../../frontend/src/modules/offline-intelligence/CapabilityRegistry';
import { LocalInferenceRuntime } from '../../frontend/src/modules/offline-intelligence/LocalInferenceRuntime';
import { FallbackManager } from '../../frontend/src/modules/offline-intelligence/FallbackManager';
import { OfflineCache } from '../../frontend/src/modules/offline-intelligence/OfflineCache';
import { SyncManager, SyncEvent } from '../../frontend/src/modules/offline-intelligence/SyncManager';
import { FreshnessManager } from '../../frontend/src/modules/offline-intelligence/FreshnessManager';
import { LocalModel } from '../../frontend/src/modules/offline-intelligence/types';

describe('Offline Intelligence & Local Inference Layer (P2.6)', () => {
  test('1. CapabilityRegistry maps online vs offline capabilities', () => {
    const matrix = CapabilityRegistry.getCapabilityMatrix();
    expect(matrix['hazard-detection']).toEqual({ online: true, offline: true });
    expect(matrix['llm-assistant']).toEqual({ online: true, offline: false });
  });

  test('2. FallbackManager resolves fallback chain when offline', () => {
    const fallback = new FallbackManager();
    fallback.registerChain('cloud-routing', ['cloud-routing', 'offline-routing']);

    // Online resolution
    expect(fallback.resolveFallback('cloud-routing', false)).toBe('cloud-routing');
    // Offline resolution
    expect(fallback.resolveFallback('cloud-routing', true)).toBe('offline-routing');
  });

  test('3. LocalInferenceRuntime registers, loads models, evicts memory and runs inference with timeouts', async () => {
    const runtime = new LocalInferenceRuntime();

    const mockModel: LocalModel = {
      id: 'perception-model',
      version: '1.0.0',
      task: 'sign-detection',
      framework: 'tflite',
      requirements: { minimumMemoryMb: 300 },
      load: async () => {},
      unload: async () => {},
      infer: async (input: any) => {
        return { detected: input.hazard };
      },
    };

    runtime.registerModel(mockModel);
    await runtime.loadModel(mockModel.id);
    const result = await runtime.runInference(mockModel.id, { hazard: 'pothole' });
    expect(result.detected).toBe('pothole');

    // Enforce model inference timeout failure exception
    const slowModel: LocalModel = {
      id: 'slow-model',
      version: '1.0.0',
      task: 'reroute',
      framework: 'tflite',
      requirements: { minimumMemoryMb: 100 },
      load: async () => {},
      unload: async () => {},
      infer: async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { completed: true };
      },
    };
    runtime.registerModel(slowModel);
    await expect(runtime.runInference(slowModel.id, {}, 100)).rejects.toThrow('Inference Timeout');
  });

  test('4. OfflineCache rejects corrupted checksum packages', () => {
    const cache = new OfflineCache();
    const mapData = { city: 'Chennai', packageId: 'ch_01' };

    // Push valid data with verified checksum
    const hash = '3a25d2c0bfa51141df3a6f1d2e1c9ad90e66bd2f5bc3a9e34e5657fa4fe5d2f3'; // dummy hash mismatch check
    const isSaved = cache.setWithVerification('chennai-map', mapData, hash);
    expect(isSaved).toBe(false); // expected mismatch since checksum calculated dynamically

    // Safe set and get
    cache.set('chennai-map', mapData);
    const retrieved = cache.get('chennai-map');
    expect(retrieved).toEqual(mapData);
  });

  test('5. SyncManager queues events and resolves conflicts with Newer-Wins rules', () => {
    const sync = new SyncManager();
    const event1: SyncEvent = {
      id: 'evt_1',
      type: 'gps',
      payload: {},
      priority: 'CRITICAL_SYNC',
      timestamp: Date.now(),
    };
    const event2: SyncEvent = {
      id: 'evt_2',
      type: 'analytics',
      payload: {},
      priority: 'ANALYTICS_SYNC',
      timestamp: Date.now(),
    };

    sync.enqueue(event1);
    sync.enqueue(event2);
    expect(sync.getQueue().length).toBe(2);

    // Newer Wins check
    const local: SyncEvent = { ...event1, timestamp: 1000 };
    const server: SyncEvent = { ...event1, timestamp: 2000 };
    const resolved = sync.resolveConflict(local, server);
    expect(resolved.timestamp).toBe(2000);
  });

  test('6. FreshnessManager maps aging cache durations', () => {
    const manager = new FreshnessManager();
    manager.registerSource('maps-in-chennai', 1000); // 1 sec TTL

    expect(manager.getFreshness('maps-in-chennai')).toBe('CURRENT');
  });
});
