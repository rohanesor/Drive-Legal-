import { CheckpointManager } from '../../frontend/src/modules/offline-reliability/CheckpointManager';
import { RuntimeWatchdog } from '../../frontend/src/modules/offline-reliability/RuntimeWatchdog';
import { FallbackManager } from '../../frontend/src/modules/offline-reliability/FallbackManager';
import { ReliabilityManager } from '../../frontend/src/modules/offline-reliability/ReliabilityManager';
import { Checkpoint } from '../../frontend/src/modules/offline-reliability/types';

describe('Offline Reliability, Fault Tolerance & Recovery (P2.17)', () => {
  let reliability: ReliabilityManager;

  beforeEach(() => {
    reliability = new ReliabilityManager();
  });

  test('1. CheckpointManager loads valid checkpoints and rejects corrupted checksums', () => {
    const cm = new CheckpointManager();

    // 1st checkpoint (older)
    cm.saveCheckpoint('v1.0', { routeId: 'rt_1' });
    // 2nd checkpoint (newer)
    const chk2 = cm.saveCheckpoint('v1.1', { routeId: 'rt_2' });

    // Modify data block to corrupt checksum on newest checkpoint
    chk2.data = { routeId: 'rt_tampered' };

    // Loads older, valid checkpoint instead
    const active = cm.loadValidCheckpoint();
    expect(active).not.toBeNull();
    expect(active!.stateVersion).toBe('v1.0');
  });

  test('2. RuntimeWatchdog detects stalled subsystem heartbeats', () => {
    const wd = new RuntimeWatchdog();
    wd.registerSubsystem('legal_engine');

    // Subsystem feeds heartbeat
    wd.feedHeartbeat('legal_engine');
    expect(wd.checkSubsystemHealth().length).toBe(0);

    // Mock clock elapsed beyond timeout duration by shifting timestamps
    const checkSubsystemHealthMock = () => {
      // Simulate timeout by calling check on expired interval
      const now = Date.now();
      const stalled: string[] = [];
      const privateMap = (wd as any).monitoredSubsystems;
      const sub = privateMap.get('legal_engine');
      sub.lastHeartbeat = now - 6000; // shift heartbeat 6s ago

      return wd.checkSubsystemHealth();
    };

    const stalled = checkSubsystemHealthMock();
    expect(stalled).toContain('legal_engine');
  });

  test('3. FallbackManager maps subsystem dependencies and fallback rules', () => {
    const fm = new FallbackManager();

    expect(fm.getCriticality('LEGAL')).toBe('CORE');
    expect(fm.getCriticality('VOICE')).toBe('OPTIONAL');

    // Voice failure falls back to visual alert
    expect(fm.resolveFallback('VOICE', 'VOICE_CRASH')).toBe('FALLBACK_VISUAL_ALERT');
  });

  test('4. ReliabilityManager transitions GPS status to STALE and degrades legal location findings', () => {
    expect(reliability.getGPSState()).toBe('GPS_AVAILABLE');
    expect(reliability.evaluateLegalLocationRule('speed_limit_rule')).toBe('LEGAL');

    // GPS drop
    reliability.feedGPSUpdate(false);
    expect(reliability.getGPSState()).toBe('GPS_UNAVAILABLE');
    expect(reliability.getGPSStaleness()).toBe('STALE');

    // Location specific rules resolve to UNKNOWN
    expect(reliability.evaluateLegalLocationRule('speed_limit_rule')).toBe('UNKNOWN');
  });

  test('5. ReliabilityManager recovers corrupted caches by rebuilding from source', () => {
    expect(reliability.getCacheState('route')).toBe('route_cache_v1');

    reliability.recoverCorruptedCache('route');

    expect(reliability.getCacheState('route')).toBe('route_cache_recalculated');
  });

  test('6. ReliabilityManager releases volatile caches under system memory pressure', () => {
    expect(reliability.isMemoryHealthy()).toBe(true);

    reliability.handleMemoryPressure();

    expect(reliability.isMemoryHealthy()).toBe(false);
    expect(reliability.getCacheState('route')).toBeNull();
  });
});
